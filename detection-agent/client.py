import requests

def send_to_decision_agent(is_anomaly, anomaly_score, protocol=None, src_bytes=None, record_id=None, url="http://127.0.0.1:5000/decide"):
    payload = {
        "is_anomaly": is_anomaly,
        "anomaly_score": anomaly_score,
        "protocol": protocol,
        "src_bytes": src_bytes,
        "record_id": record_id
    }
    response = requests.post(url, json=payload)
    return response.json()


if __name__ == "__main__":
    hasil = send_to_decision_agent(is_anomaly=True, anomaly_score=0.9, protocol="tcp", src_bytes=0, record_id=1)
    print("Balasan dari Agent 2:", hasil)