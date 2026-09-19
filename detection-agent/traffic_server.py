from flask import Flask, request, jsonify
import json
import os

app = Flask(__name__)

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response

@app.route("/traffic", methods=["GET"])
def get_traffic():
    if not os.path.exists("detection_results.json"):
        return jsonify([])
    with open("detection_results.json", "r") as f:
        data = json.load(f)
    return jsonify(data[:100])

@app.route("/model-stats", methods=["GET"])
def model_stats():
    if not os.path.exists("model_stats.json"):
        return jsonify({"accuracy": None})
    with open("model_stats.json", "r") as f:
        return jsonify(json.load(f))

@app.route("/traffic/baseline", methods=["GET"])
def traffic_baseline():
    protocol = request.args.get("protocol")
    if not os.path.exists("detection_results.json"):
        return jsonify({"protocol": protocol, "sample_size": 0, "avg_src_bytes": 0, "anomaly_rate": 0})

    with open("detection_results.json", "r") as f:
        data = json.load(f)

    matches = [d for d in data if d.get("protocol") == protocol]
    if not matches:
        return jsonify({"protocol": protocol, "sample_size": 0, "avg_src_bytes": 0, "anomaly_rate": 0})

    src_bytes_list = [d.get("src_bytes", 0) or 0 for d in matches]
    anomaly_count = sum(1 for d in matches if d.get("is_anomaly"))
    avg_src_bytes = sum(src_bytes_list) / len(src_bytes_list)
    anomaly_rate = anomaly_count / len(matches)

    return jsonify({
        "protocol": protocol,
        "sample_size": len(matches),
        "avg_src_bytes": round(avg_src_bytes, 2),
        "anomaly_rate": round(anomaly_rate, 2)
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)