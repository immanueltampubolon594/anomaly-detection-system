import json

def load_detection_results(path="../detection-agent/detection_results.json"):
    with open(path, "r") as f:
        return json.load(f)