import os
import json
import threading
import time
import redis
from dotenv import load_dotenv
from response_agent import handle_escalation

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL")
STREAM_IN = "stream:decisions"
GROUP_NAME = "agent3-group"
CONSUMER_NAME = "agent3-consumer-1"


def get_redis_client():
    if not REDIS_URL:
        return None
    return redis.from_url(REDIS_URL, decode_responses=True)


def ensure_group(r):
    try:
        r.xgroup_create(STREAM_IN, GROUP_NAME, id="0", mkstream=True)
        print(f"[Agent3/stream] Consumer group '{GROUP_NAME}' dibuat di {STREAM_IN}")
    except redis.exceptions.ResponseError as e:
        if "BUSYGROUP" not in str(e):
            raise


def consume_loop():
    r = get_redis_client()
    if r is None:
        print("[Agent3/stream] REDIS_URL tidak diset, stream consumer tidak dijalankan.")
        return

    try:
        r.ping()
        print("[Agent3/stream] Terhubung ke Redis, mulai konsumsi stream keputusan...")
    except Exception as e:
        print(f"[Agent3/stream] Gagal konek ke Redis: {e}. Consumer tidak dijalankan.")
        return

    ensure_group(r)

    while True:
        try:
            resp = r.xreadgroup(GROUP_NAME, CONSUMER_NAME, {STREAM_IN: ">"}, count=1, block=5000)
        except Exception as e:
            print(f"[Agent3/stream] Error baca stream: {e}")
            time.sleep(3)
            continue

        if not resp:
            continue

        for stream_name, messages in resp:
            for message_id, fields in messages:
                try:
                    result = json.loads(fields.get("data", "{}"))
                    print(f"[Agent3/stream] Proses keputusan {message_id}: {result.get('action')}")

                    if result.get("action") == "ESCALATE":
                        handle_escalation(
                            record_id=result.get("record_id"),
                            reason=result.get("reason"),
                            protocol=result.get("protocol"),
                            src_bytes=result.get("src_bytes"),
                            tools_called=result.get("tools_called"),
                            processed_by=result.get("processed_by"),
                        )
                        print(f"[Agent3/stream] Insiden {result.get('record_id')} dicatat dari stream (oleh {result.get('processed_by')}).")

                    r.xack(STREAM_IN, GROUP_NAME, message_id)
                except Exception as e:
                    print(f"[Agent3/stream] Gagal proses pesan {message_id}: {e}")
                    r.xack(STREAM_IN, GROUP_NAME, message_id)


def start_consumer_thread():
    thread = threading.Thread(target=consume_loop, daemon=True)
    thread.start()
    return thread