from flask_cors import CORS
from flask import Flask, request, jsonify
from response_agent import handle_escalation, INCIDENT_LOG
from stream_consumer import start_consumer_thread
import json
import os

app = Flask(__name__)
CORS(app)

@app.route("/escalate", methods=["POST"])
def escalate():
    data = request.get_json()
    incident = handle_escalation(
        record_id=data.get("record_id"),
        reason=data.get("reason"),
        protocol=data.get("protocol"),
        src_bytes=data.get("src_bytes"),
        tools_called=data.get("tools_called"),
        processed_by=data.get("processed_by")
    )
    return jsonify(incident)

@app.route("/incidents", methods=["GET"])
def get_incidents():
    if not os.path.exists(INCIDENT_LOG):
        return jsonify([])
    with open(INCIDENT_LOG, "r") as f:
        return jsonify(json.load(f))

@app.route("/incidents/<int:record_id>/resolve", methods=["POST"])
def resolve_incident(record_id):
    if not os.path.exists(INCIDENT_LOG):
        return jsonify({"error": "no incidents"}), 404
    with open(INCIDENT_LOG, "r") as f:
        incidents = json.load(f)
    for incident in incidents:
        if incident["record_id"] == record_id:
            incident["status"] = "RESOLVED"
    with open(INCIDENT_LOG, "w") as f:
        json.dump(incidents, f, indent=2)
    return jsonify({"success": True})

@app.route("/incidents/search", methods=["GET"])
def search_incidents():
    protocol = request.args.get("protocol")
    if not os.path.exists(INCIDENT_LOG):
        return jsonify([])
    with open(INCIDENT_LOG, "r") as f:
        incidents = json.load(f)
    matches = [i for i in incidents if i.get("protocol") == protocol]
    return jsonify(matches[-5:])

@app.route("/incidents/active-count", methods=["GET"])
def active_incident_count():
    if not os.path.exists(INCIDENT_LOG):
        return jsonify({"active_count": 0})
    with open(INCIDENT_LOG, "r") as f:
        incidents = json.load(f)
    count = sum(1 for i in incidents if i.get("status") == "OPEN")
    return jsonify({"active_count": count})

if __name__ == "__main__":
    start_consumer_thread()
    app.run(host="0.0.0.0", port=6001)