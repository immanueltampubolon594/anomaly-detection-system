from data_loader import load_data, load_test_data
from preprocessing import encode_features
from model import train_model
from model_v2 import train_supervised_model
from ensemble import ensemble_predict
from scoring import compute_anomaly_scores
from evaluate import evaluate
from client import send_to_decision_agent
from collections import Counter
import json

# Data latih
df_train = load_data()
df_train, encoders = encode_features(df_train)

# Data uji (traffic yang mau "dipantau", belum pernah dilihat model)
df_test = load_test_data()
df_test, _ = encode_features(df_test, encoders=encoders)

feature_cols = [c for c in df_train.columns if c not in ("label", "is_anomaly")]
X_train = df_train[feature_cols]
y_train = df_train["is_anomaly"]
X_test = df_test[feature_cols]
y_test = df_test["is_anomaly"]

print("Data latih:", X_train.shape)
print("Data uji:", X_test.shape)

print("\nMelatih kedua model...")
model_if = train_model(X_train, y_train)
model_rf = train_supervised_model(X_train, y_train)

print("Menjalankan ensemble prediction...")
predictions = ensemble_predict(model_rf, model_if, X_test)
evaluate_labels = ["normal", "anomaly"]

from sklearn.metrics import classification_report, accuracy_score
print("\n=== Hasil Ensemble ===")
print(classification_report(y_test, predictions, target_names=evaluate_labels))

accuracy = accuracy_score(y_test, predictions)
with open("model_stats.json", "w") as f:
    json.dump({"accuracy": round(accuracy * 100, 1)}, f)

# Skor keyakinan (dari Isolation Forest) untuk dikirim ke Agent 2
# Skor keyakinan (dari Isolation Forest) untuk dikirim ke Agent 2
scores = compute_anomaly_scores(model_if, X_test)

print("\nMenyimpan detection_results.json untuk semua data uji (dengan protocol & src_bytes)...")
detection_results = []
for i in range(len(predictions)):
    detection_results.append({
        "record_id": int(i),
        "is_anomaly": bool(predictions[i] == 1),
        "anomaly_score": float(scores[i]),
        "protocol": str(X_test.iloc[i]["protocol_type"]),
        "src_bytes": int(X_test.iloc[i]["src_bytes"]),
    })

with open("detection_results.json", "w") as f:
    json.dump(detection_results, f)
print(f"Tersimpan {len(detection_results)} record ke detection_results.json")

print("\nMengirim data ke Agent 2 (hanya yang anomali)...")
action_counts = Counter()

anomaly_indices = [i for i in range(len(predictions)) if predictions[i] == 1]
print(f"Total anomali terdeteksi: {len(anomaly_indices)} dari {len(predictions)} data")

sample_indices = anomaly_indices[:30]

for i in sample_indices:
    is_anomaly = True
    score = float(scores[i])
    protocol = X_test.iloc[i]["protocol_type"]
    src_bytes = X_test.iloc[i]["src_bytes"]

    decision = send_to_decision_agent(is_anomaly, score, protocol=str(protocol), src_bytes=int(src_bytes), record_id=int(i))
    action_counts[decision["action"]] += 1

    print(f"Record {i}: is_anomaly={is_anomaly}, score={score:.2f} -> {decision['action']} | {decision['reason']}")

print("\n=== Ringkasan dari Agent 2 ===")
for action, total in action_counts.items():
    print(f"{action}: {total}")