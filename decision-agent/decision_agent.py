from data_reader import load_detection_results
from summary import print_summary

class DecisionAgent:
    def __init__(self, escalation_threshold=0.8):
        self.escalation_threshold = escalation_threshold

    def decide(self, is_anomaly, anomaly_score):
        if not is_anomaly:
            action = "IGNORE"
            reason = "Traffic dianggap normal."
        elif anomaly_score >= self.escalation_threshold:
            action = "ESCALATE"
            reason = f"Skor anomali tinggi ({anomaly_score:.2f}) - perlu tindakan segera."
        else:
            action = "LOG_ONLY"
            reason = f"Anomali terdeteksi, skor sedang ({anomaly_score:.2f}) - dicatat untuk review."

        return {"action": action, "reason": reason}


if __name__ == "__main__":
    agent = DecisionAgent(escalation_threshold=0.8)
    results = load_detection_results()

    decisions = []
    for item in results:
        decision = agent.decide(item["is_anomaly"], item["anomaly_score"])
        decisions.append(decision)

    print_summary(decisions)