from flask import Flask, request, jsonify
from llm_reasoner import agentic_decide, parse_llm_response, get_llm_stats
from stream_consumer import start_consumer_thread, get_redis_client, STREAM_DLQ
import requests
import time
import json

app = Flask(__name__)
response_times = []

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST"
    return response

@app.route("/decide", methods=["POST"])
def decide():
    start_time = time.time()
    data = request.get_json()
    raw, tool_used, tools_called = agentic_decide(
        is_anomaly=data["is_anomaly"],
        anomaly_score=data["anomaly_score"],
        protocol=data.get("protocol"),
        src_bytes=data.get("src_bytes")
    )
    result = parse_llm_response(raw, is_anomaly=data["is_anomaly"], anomaly_score=data["anomaly_score"])
    result["tool_used"] = tool_used
    result["tools_called"] = tools_called
    result["processed_by"] = "sync-live-demo"
    elapsed = time.time() - start_time
    response_times.append(elapsed)
    if result["action"] == "ESCALATE":
        try:
            requests.post("http://127.0.0.1:6001/escalate", json={
                "record_id": data.get("record_id"),
                "reason": result["reason"],
                "protocol": data.get("protocol"),
                "src_bytes": data.get("src_bytes"),
                "tools_called": tools_called,
                "processed_by": result["processed_by"]
            })
        except requests.exceptions.ConnectionError:
            print("Agent 3 tidak bisa dihubungi, insiden tidak tercatat.")
    return jsonify(result)

@app.route("/stats", methods=["GET"])
def stats():
    # --- llm_stats dihitung dari DALAM agentic_decide() sendiri, jadi kepake
    # baik yang lewat endpoint /decide (live-demo) maupun yang lewat
    # stream_consumer.py (alur data asli dari Redis stream anomali).
    llm_stats = get_llm_stats()

    avg_time_llm = llm_stats["avg_response_time_ms"] / 1000  # ms -> detik
    avg_time_decide = sum(response_times) / len(response_times) if response_times else 0

    # Prioritaskan data dari llm_stats (mencakup semua sumber) kalau ada,
    # fallback ke response_times lama kalau belum ada data sama sekali.
    avg_time = avg_time_llm if llm_stats["total_decisions"] > 0 else avg_time_decide

    return jsonify({
        "avg_response_time": round(avg_time, 2),
        "total_requests": len(response_times),
        # Statistik tambahan buat panel status LLM/kuota di dashboard.
        "llm": llm_stats,
    })


@app.route("/consumer-stats", methods=["GET"])
def consumer_stats():
    r = get_redis_client()
    if r is None:
        return jsonify([])
    try:
        counts = r.hgetall("agent2:processed_counts")
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    result = [
        {"consumer": name, "processed_count": int(count)}
        for name, count in counts.items()
    ]
    result.sort(key=lambda x: x["processed_count"], reverse=True)
    return jsonify(result)

@app.route("/dead-letter", methods=["GET"])
def dead_letter():
    r = get_redis_client()
    if r is None:
        return jsonify([])
    try:
        entries = r.xrange(STREAM_DLQ, count=100)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    result = []
    for message_id, fields in entries:
        try:
            record = json.loads(fields.get("data", "{}"))
        except Exception:
            record = {"raw": fields.get("data")}
        record["stream_message_id"] = message_id
        result.append(record)

    result.reverse()
    return jsonify(result)

if __name__ == "__main__":
    start_consumer_thread()
    app.run(host="0.0.0.0", port=5000)