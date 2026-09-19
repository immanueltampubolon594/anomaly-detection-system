import os
import json
import time
import requests
from dotenv import load_dotenv
from groq import Groq

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

RESPONSE_AGENT_URL = "http://127.0.0.1:6001"
DETECTION_AGENT_URL = "http://127.0.0.1:5001"

# --- FIX 1: threshold -- skor di bawah ini gak usah tanya LLM sama sekali,
# karena parse_llm_response() toh bakal maksa LOG_ONLY untuk skor < 0.7.
LLM_SCORE_THRESHOLD = 0.5

# --- FIX 2: circuit breaker -- begitu kena rate limit, stop nyoba manggil
# LLM sampai waktu tunggu (dari pesan error Groq) lewat. Dipakai proses ini.
_llm_blocked_until = 0.0

# --- STATS: dipakai dashboard buat panel status LLM & tool usage.
# Semua counter reset tiap server di-restart (in-memory, sesuai kebutuhan
# dashboard "sekarang lagi ngapain", bukan histori permanen).
_stats = {
    "total_decisions": 0,
    "llm_called": 0,
    "llm_success": 0,
    "llm_rate_limited": 0,
    "skipped_threshold": 0,
    "skipped_cooldown": 0,
    "tool_usage": {
        "check_incident_history": 0,
        "check_active_incident_count": 0,
        "check_traffic_baseline": 0,
    },
    "response_times_ms": [],  # rolling window, dipotong tiap ambil rata-rata
}
_MAX_RESPONSE_TIME_SAMPLES = 200


def get_llm_stats():
    """Dipanggil dari server.py buat endpoint /llm-status."""
    times = _stats["response_times_ms"]
    avg_response_ms = sum(times) / len(times) if times else 0
    remaining_cooldown = max(0.0, _llm_blocked_until - time.time())

    return {
        "total_decisions": _stats["total_decisions"],
        "llm_called": _stats["llm_called"],
        "llm_success": _stats["llm_success"],
        "llm_rate_limited": _stats["llm_rate_limited"],
        "skipped_threshold": _stats["skipped_threshold"],
        "skipped_cooldown": _stats["skipped_cooldown"],
        "tool_usage": dict(_stats["tool_usage"]),
        "avg_response_time_ms": round(avg_response_ms, 1),
        "is_in_cooldown": remaining_cooldown > 0,
        "cooldown_remaining_s": round(remaining_cooldown, 1),
        "llm_success_rate": round(
            (_stats["llm_success"] / _stats["llm_called"] * 100) if _stats["llm_called"] else 0, 1
        ),
    }


def _record_response_time(elapsed_ms):
    times = _stats["response_times_ms"]
    times.append(elapsed_ms)
    if len(times) > _MAX_RESPONSE_TIME_SAMPLES:
        del times[: len(times) - _MAX_RESPONSE_TIME_SAMPLES]

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "check_incident_history",
            "description": "Cek riwayat insiden sebelumnya dengan protokol yang sama, untuk melihat apakah pola ini pernah terjadi.",
            "parameters": {
                "type": "object",
                "properties": {
                    "protocol": {"type": "string", "description": "Protokol traffic, contoh: tcp, udp"}
                },
                "required": ["protocol"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "check_active_incident_count",
            "description": "Cek berapa banyak insiden yang statusnya masih OPEN saat ini di seluruh sistem. Berguna untuk menilai apakah sistem sedang dalam kondisi under attack (banyak insiden aktif bersamaan), yang bisa jadi alasan untuk lebih waspada / lebih cepat eskalasi.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "check_traffic_baseline",
            "description": "Bandingkan traffic saat ini dengan rata-rata historis (baseline) untuk protokol yang sama -- rata-rata src_bytes dan tingkat anomali historis. Berguna untuk menilai apakah src_bytes traffic ini jauh dari kebiasaan normal protokol tersebut (anomali statistik), bukan hanya berdasarkan skor model ML.",
            "parameters": {
                "type": "object",
                "properties": {
                    "protocol": {"type": "string", "description": "Protokol traffic, contoh: tcp, udp"}
                },
                "required": ["protocol"]
            }
        }
    }
]


def check_incident_history(protocol):
    try:
        res = requests.get(f"{RESPONSE_AGENT_URL}/incidents/search", params={"protocol": protocol}, timeout=3)
        return res.json()
    except Exception as e:
        return {"error": str(e)}


def check_active_incident_count():
    try:
        res = requests.get(f"{RESPONSE_AGENT_URL}/incidents/active-count", timeout=3)
        return res.json()
    except Exception as e:
        return {"error": str(e)}


def check_traffic_baseline(protocol):
    try:
        res = requests.get(f"{DETECTION_AGENT_URL}/traffic/baseline", params={"protocol": protocol}, timeout=3)
        return res.json()
    except Exception as e:
        return {"error": str(e)}


TOOL_FUNCTIONS = {
    "check_incident_history": check_incident_history,
    "check_active_incident_count": check_active_incident_count,
    "check_traffic_baseline": check_traffic_baseline,
}


def _dispatch_tool_call(call):
    """Jalankan satu tool call, robust terhadap format argumen yang
    kadang dibungkus dobel oleh model kecil seperti gpt-oss-20b."""
    fn_name = call.function.name
    fn = TOOL_FUNCTIONS.get(fn_name)
    if fn is None:
        return {"error": f"unknown tool: {fn_name}"}

    raw_args = call.function.arguments
    args = {}
    try:
        if raw_args:
            parsed = json.loads(raw_args)
            if isinstance(parsed, dict):
                if "arguments" in parsed and isinstance(parsed["arguments"], dict):
                    args = parsed["arguments"]
                else:
                    args = parsed
    except Exception as parse_err:
        print(f"Gagal parse argumen tool '{fn_name}':", parse_err)

    try:
        if fn_name == "check_active_incident_count":
            return fn()
        else:
            return fn(args.get("protocol"))
    except Exception as e:
        return {"error": str(e)}


def _plain_prompt(is_anomaly, anomaly_score, protocol, src_bytes):
    # SENGAJA tidak menyebut kata "tool" -- lihat catatan di agentic_decide.
    return f"""Kamu adalah agent keamanan jaringan yang menganalisis traffic mencurigakan.
Selalu jawab dalam Bahasa Indonesia.

Data traffic:
- Terdeteksi anomali oleh model ML: {is_anomaly}
- Skor anomali (0-1): {anomaly_score:.2f}
- Protokol: {protocol}
- Ukuran data (src_bytes): {src_bytes}

Berdasarkan data di atas, jawab dalam format persis:
ACTION: <IGNORE / LOG_ONLY / ESCALATE>
REASON: <alasan singkat>
"""


def _local_fallback_text(is_anomaly, anomaly_score, reason_prefix="LLM tidak dapat dihubungi"):
    if is_anomaly is False:
        return f"ACTION: IGNORE\nREASON: {reason_prefix}, traffic tidak ditandai anomali oleh model ML."
    elif anomaly_score is not None and anomaly_score >= 0.7:
        return f"ACTION: ESCALATE\nREASON: {reason_prefix}, skor anomali {anomaly_score:.2f} melewati ambang batas sehingga dieskalasi sebagai tindakan aman."
    else:
        return f"ACTION: LOG_ONLY\nREASON: {reason_prefix}, dicatat untuk ditinjau berdasarkan skor anomali."


def _is_rate_limit_error(e):
    # Groq SDK (mirip OpenAI SDK) biasanya expose status_code di exception.
    status = getattr(e, "status_code", None)
    if status == 429:
        return True
    return "429" in str(e) or "rate_limit_exceeded" in str(e)


def _extract_retry_seconds(e, default=180):
    # Coba ambil "Please try again in Xm Ys" dari pesan error Groq.
    import re
    match = re.search(r"try again in (?:(\d+)m)?([\d.]+)s", str(e))
    if match:
        minutes = int(match.group(1)) if match.group(1) else 0
        seconds = float(match.group(2))
        return minutes * 60 + seconds
    return default


def agentic_decide(is_anomaly, anomaly_score, protocol=None, src_bytes=None):
    global _llm_blocked_until

    tool_used = False
    tools_called = []
    MODEL = "openai/gpt-oss-20b"
    _start_time = time.time()
    _stats["total_decisions"] += 1

    # --- FIX 1: skip LLM sama sekali untuk anomali skor rendah -- keputusan
    # akhirnya toh dipaksa LOG_ONLY oleh parse_llm_response().
    if anomaly_score is not None and anomaly_score < LLM_SCORE_THRESHOLD:
        final_text = _local_fallback_text(
            is_anomaly, anomaly_score,
            reason_prefix=f"Skor anomali {anomaly_score:.2f} di bawah ambang batas review LLM"
        )
        print("=== LLM dilewati (skor di bawah threshold) ===")
        _stats["skipped_threshold"] += 1
        _record_response_time((time.time() - _start_time) * 1000)
        return final_text, False, []

    # --- FIX 2: kalau baru saja kena rate limit, jangan nyoba manggil API
    # lagi sampai waktu blokir lewat -- langsung fallback lokal.
    if time.time() < _llm_blocked_until:
        remaining = _llm_blocked_until - time.time()
        final_text = _local_fallback_text(
            is_anomaly, anomaly_score,
            reason_prefix=f"LLM sedang dalam cooldown rate limit ({remaining:.0f}s lagi)"
        )
        print(f"=== LLM di-skip (circuit breaker aktif, {remaining:.0f}s lagi) ===")
        _stats["skipped_cooldown"] += 1
        _record_response_time((time.time() - _start_time) * 1000)
        return final_text, False, []

    _stats["llm_called"] += 1

    messages = [
        {
            "role": "user",
            "content": f"""Kamu adalah agent keamanan jaringan yang menganalisis traffic mencurigakan.
Selalu jawab dalam Bahasa Indonesia.

Data traffic:
- Terdeteksi anomali oleh model ML: {is_anomaly}
- Skor anomali (0-1): {anomaly_score:.2f}
- Protokol: {protocol}
- Ukuran data (src_bytes): {src_bytes}

Kamu punya akses ke beberapa tools untuk membantu analisis:
1. check_incident_history -- cek riwayat insiden protokol ini
2. check_active_incident_count -- cek apakah sistem sedang banyak insiden aktif (indikasi under attack)
3. check_traffic_baseline -- bandingkan traffic ini dengan rata-rata historis protokol ini

Kamu boleh memanggil satu, beberapa, atau tidak sama sekali dari tools di atas, tergantung penilaianmu
sendiri apa yang benar-benar dibutuhkan untuk kasus ini. Rencanakan sendiri langkah analisismu.

Setelah analisis selesai, jawab dalam format persis:
ACTION: <IGNORE / LOG_ONLY / ESCALATE>
REASON: <alasan singkat, sebutkan tools apa saja yang kamu pertimbangkan jika ada>
"""
        }
    ]

    max_turns = 4
    final_text = ""

    for turn in range(max_turns):
        force_no_tool = (turn == max_turns - 1)

        try:
            if force_no_tool:
                response = client.chat.completions.create(model=MODEL, messages=messages)
            else:
                response = client.chat.completions.create(
                    model=MODEL, messages=messages, tools=TOOLS, tool_choice="auto"
                )
        except Exception as e:
            print("=== LLM error ===")
            print(str(e))

            if _is_rate_limit_error(e):
                # --- FIX 3: rate limit gak akan hilang dengan nyoba lagi
                # detik itu juga -- langsung set circuit breaker & fallback
                # lokal, TANPA nyoba fallback prompt bersih (itu bakal kena
                # limit yang sama juga dan cuma buang waktu/percobaan).
                retry_after = _extract_retry_seconds(e)
                _llm_blocked_until = time.time() + retry_after
                print(f"Rate limit terdeteksi, LLM di-cooldown selama {retry_after:.0f}s")
                _stats["llm_rate_limited"] += 1
                final_text = _local_fallback_text(is_anomaly, anomaly_score)
            else:
                # Error selain rate limit (mis. tool call parsing) -- masih
                # layak dicoba sekali lagi dengan prompt bersih tanpa tools.
                try:
                    fallback_response = client.chat.completions.create(
                        model=MODEL,
                        messages=[{
                            "role": "user",
                            "content": _plain_prompt(is_anomaly, anomaly_score, protocol, src_bytes)
                        }]
                    )
                    final_text = fallback_response.choices[0].message.content or ""
                    if not final_text.strip():
                        final_text = _local_fallback_text(is_anomaly, anomaly_score)
                except Exception as e2:
                    print("Fallback prompt bersih juga gagal, pakai jawaban lokal:", str(e2))
                    if _is_rate_limit_error(e2):
                        retry_after = _extract_retry_seconds(e2)
                        _llm_blocked_until = time.time() + retry_after
                    final_text = _local_fallback_text(is_anomaly, anomaly_score)
            break

        msg = response.choices[0].message

        if msg.tool_calls and not force_no_tool:
            tool_used = True
            messages.append({
                "role": "assistant",
                "content": msg.content or "",
                "tool_calls": [
                    {
                        "id": call.id,
                        "type": "function",
                        "function": {
                            "name": call.function.name,
                            "arguments": call.function.arguments
                        }
                    }
                    for call in msg.tool_calls
                ]
            })

            for call in msg.tool_calls:
                tools_called.append(call.function.name)
                if call.function.name in _stats["tool_usage"]:
                    _stats["tool_usage"][call.function.name] += 1
                result = _dispatch_tool_call(call)
                messages.append({
                    "role": "tool",
                    "tool_call_id": call.id,
                    "content": json.dumps(result)
                })

            continue

        final_text = msg.content or ""
        _stats["llm_success"] += 1
        break

    print("=== DEBUG raw LLM output ===")
    print(repr(final_text))
    print("tool_used:", tool_used, "| tools_called:", tools_called)
    print("=============================")
    _record_response_time((time.time() - _start_time) * 1000)
    return final_text, tool_used, tools_called


def parse_llm_response(text, is_anomaly=None, anomaly_score=None):
    action = "LOG_ONLY"
    reason = text.strip()

    for line in text.split("\n"):
        line = line.strip()
        if line.upper().startswith("ACTION:"):
            action = line.split(":", 1)[1].strip().upper()
        elif line.upper().startswith("REASON:"):
            reason = line.split(":", 1)[1].strip()

    if is_anomaly is False:
        action = "IGNORE"
    elif is_anomaly is True and anomaly_score is not None:
        action = "ESCALATE" if anomaly_score >= 0.7 else "LOG_ONLY"

    return {"action": action, "reason": reason}