import os
import json
import socket
import threading
import time
import redis
from dotenv import load_dotenv
from llm_reasoner import agentic_decide, parse_llm_response

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL")
STREAM_IN = "stream:anomalies"
STREAM_OUT = "stream:decisions"
STREAM_DLQ = "stream:dead-letter"
GROUP_NAME = "agent2-group"

CONSUMER_NAME = os.getenv("CONSUMER_NAME") or f"agent2-{socket.gethostname()}-{os.getpid()}"

MAX_RETRIES = 3
CLAIM_IDLE_MS = 30000
RETRY_HASH_KEY = "agent2:retry_counts"


def get_redis_client():
    if not REDIS_URL:
        return None
    return redis.from_url(
        REDIS_URL,
        decode_responses=True,
        socket_timeout=10,
        socket_connect_timeout=10,
        socket_keepalive=True,
        health_check_interval=30,
        retry_on_timeout=True,
    )


def ensure_group(r):
    try:
        r.xgroup_create(STREAM_IN, GROUP_NAME, id="0", mkstream=True)
        print(f"[{CONSUMER_NAME}] Consumer group '{GROUP_NAME}' dibuat di {STREAM_IN}")
    except redis.exceptions.ResponseError as e:
        if "BUSYGROUP" not in str(e):
            raise


def send_to_dead_letter(r, message_id, payload, error_msg, retry_count):
    dlq_record = {
        "original_message_id": message_id,
        "payload": payload,
        "error": error_msg,
        "retry_count": retry_count,
        "failed_by_consumer": CONSUMER_NAME,
        "failed_at": time.time(),
    }
    r.xadd(STREAM_DLQ, {"data": json.dumps(dlq_record)})
    print(f"[{CONSUMER_NAME}] Pesan {message_id} dipindah ke {STREAM_DLQ} setelah {retry_count} kali gagal.")


def process_message(r, message_id, fields, reclaimed=False):
    tag = "reclaimed" if reclaimed else "baru"
    try:
        payload = json.loads(fields.get("data", "{}"))
        print(f"[{CONSUMER_NAME}] Proses pesan {tag} {message_id}: {payload}")

        raw, tool_used, tools_called = agentic_decide(
            is_anomaly=payload.get("is_anomaly"),
            anomaly_score=payload.get("anomaly_score"),
            protocol=payload.get("protocol"),
            src_bytes=payload.get("src_bytes"),
        )
        result = parse_llm_response(
            raw,
            is_anomaly=payload.get("is_anomaly"),
            anomaly_score=payload.get("anomaly_score"),
        )
        result["record_id"] = payload.get("record_id")
        result["protocol"] = payload.get("protocol")
        result["src_bytes"] = payload.get("src_bytes")
        result["tool_used"] = tool_used
        result["tools_called"] = tools_called
        result["processed_by"] = CONSUMER_NAME

        r.xadd(STREAM_OUT, {"data": json.dumps(result)})
        print(f"[{CONSUMER_NAME}] Keputusan dikirim ke {STREAM_OUT}: {result['action']} (oleh {CONSUMER_NAME})")

        r.xack(STREAM_IN, GROUP_NAME, message_id)
        r.hdel(RETRY_HASH_KEY, message_id)
        r.hincrby("agent2:processed_counts", CONSUMER_NAME, 1)

    except Exception as e:
        print(f"[{CONSUMER_NAME}] Gagal proses pesan {message_id}: {e}")

        retry_count = r.hincrby(RETRY_HASH_KEY, message_id, 1)

        if retry_count >= MAX_RETRIES:
            try:
                payload = json.loads(fields.get("data", "{}"))
            except Exception:
                payload = {"raw": fields.get("data")}
            send_to_dead_letter(r, message_id, payload, str(e), retry_count)
            r.xack(STREAM_IN, GROUP_NAME, message_id)
            r.hdel(RETRY_HASH_KEY, message_id)
        else:
            print(f"[{CONSUMER_NAME}] Percobaan ke-{retry_count}/{MAX_RETRIES} untuk {message_id}, dibiarkan pending.")


def claim_stale_messages(r):
    response = r.xautoclaim(STREAM_IN, GROUP_NAME, CONSUMER_NAME, min_idle_time=CLAIM_IDLE_MS, start_id="0-0", count=5)

    if len(response) == 3:
        _, claimed, _ = response
    else:
        _, claimed = response

    if not claimed:
        return False

    for message_id, fields in claimed:
        process_message(r, message_id, fields, reclaimed=True)

    return True


def consume_loop():
    r = get_redis_client()
    if r is None:
        print("[Agent2/stream] REDIS_URL tidak diset, stream consumer tidak dijalankan.")
        return

    try:
        r.ping()
        print(f"[{CONSUMER_NAME}] Terhubung ke Redis, mulai konsumsi stream anomali...")
    except Exception as e:
        print(f"[{CONSUMER_NAME}] Gagal konek ke Redis: {e}. Consumer tidak dijalankan.")
        return

    ensure_group(r)
    consecutive_errors = 0

    while True:
        try:
            did_claim = claim_stale_messages(r)
            if did_claim:
                consecutive_errors = 0
                continue

            resp = r.xreadgroup(GROUP_NAME, CONSUMER_NAME, {STREAM_IN: ">"}, count=1, block=5000)
            consecutive_errors = 0

            if not resp:
                continue

            for stream_name, messages in resp:
                for message_id, fields in messages:
                    process_message(r, message_id, fields, reclaimed=False)

        except (redis.exceptions.TimeoutError, redis.exceptions.ConnectionError) as e:
            consecutive_errors += 1
            wait = min(consecutive_errors * 2, 15)
            print(f"[{CONSUMER_NAME}] Koneksi Redis terputus ({e}), reconnect dalam {wait}s... (percobaan {consecutive_errors})")
            time.sleep(wait)
            try:
                r = get_redis_client()
                r.ping()
                print(f"[{CONSUMER_NAME}] Reconnect berhasil.")
            except Exception as e2:
                print(f"[{CONSUMER_NAME}] Reconnect gagal: {e2}")

        except Exception as e:
            print(f"[{CONSUMER_NAME}] Error tak terduga: {e}")
            time.sleep(3)


def start_consumer_thread():
    thread = threading.Thread(target=consume_loop, daemon=True)
    thread.start()
    return thread


if __name__ == "__main__":
    consume_loop()