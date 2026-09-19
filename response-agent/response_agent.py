import json
import os
from datetime import datetime

INCIDENT_LOG = "incident_log.json"


def handle_escalation(record_id, reason, protocol=None, src_bytes=None, tools_called=None, processed_by=None):
    incident = {
        "record_id": record_id,
        "reason": reason,
        "protocol": protocol,
        "src_bytes": src_bytes,
        "tools_called": tools_called or [],
        "processed_by": processed_by,
        "status": "OPEN",
        "timestamp": datetime.now().isoformat()
    }

    if os.path.exists(INCIDENT_LOG):
        with open(INCIDENT_LOG, "r") as f:
            incidents = json.load(f)
    else:
        incidents = []

    incidents.append(incident)

    with open(INCIDENT_LOG, "w") as f:
        json.dump(incidents, f, indent=2)

    return incident