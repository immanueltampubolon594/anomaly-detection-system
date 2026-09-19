import os
import json
import time
import redis
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL")
STREAM_OUT = "stream:anomalies"
RESULTS_FILE = "detection_results.json"


def main():
    if not REDIS_URL:
        print("REDIS_URL tidak ditemukan di .env")
        return

    r = redis.from_url(REDIS_URL, decode_responses=True)
    r.ping()
    print("Terhubung ke Redis.")

    if not os.path.exists(RESULTS_FILE):
        print(f"{RESULTS_FILE} tidak ditemukan. Jalankan detection_agent.py dulu.")
        return

    with open(RESULTS_FILE, "r") as f:
        data = json.load(f)

    anomalies = [d for d in data if d.get("is_anomaly")]
    print(f"Ditemukan {len(anomalies)} record anomali dari {len(data)} total record.")

    for idx, record in enumerate(anomalies):
        payload = {
            "record_id": record.get("record_id", idx),
            "is_anomaly": record.get("is_anomaly"),
            "anomaly_score": record.get("anomaly_score"),
            "protocol": record.get("protocol"),
            "src_bytes": record.get("src_bytes"),
        }
        r.xadd(STREAM_OUT, {"data": json.dumps(payload)})
        print(f"Published record #{payload['record_id']} ke {STREAM_OUT}")
        time.sleep(2)


if __name__ == "__main__":
    main()