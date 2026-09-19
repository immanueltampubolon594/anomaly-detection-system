from sklearn.metrics import classification_report

from data_loader import load_data, load_test_data
from preprocessing import encode_features
from model import train_model
from model_v2 import train_supervised_model

# Data latih: dari train.csv (khusus buat belajar)
df_train = load_data()
df_train, encoders = encode_features(df_train)

df_test = load_test_data()
df_test, _ = encode_features(df_test, encoders=encoders)

feature_cols = [c for c in df_train.columns if c not in ("label", "is_anomaly")]

X_train = df_train[feature_cols]
y_train = df_train["is_anomaly"]

X_test = df_test[feature_cols]
y_test = df_test["is_anomaly"]

print("Data latih:", X_train.shape)
print("Data uji (terpisah, jujur):", X_test.shape)

print("\n=== Model Lama (Isolation Forest, unsupervised) ===")
model_old = train_model(X_train, y_train)
raw_pred_old = model_old.predict(X_test)
y_pred_old = [1 if p == -1 else 0 for p in raw_pred_old]
print(classification_report(y_test, y_pred_old, target_names=["normal", "anomaly"]))

print("\n=== Model Baru (Random Forest, supervised) ===")
model_new = train_supervised_model(X_train, y_train)
y_pred_new = model_new.predict(X_test)
print(classification_report(y_test, y_pred_new, target_names=["normal", "anomaly"]))

print("\n=== Model Gabungan (Ensemble: RF ATAU Isolation Forest) ===")

# Ambil tebakan dari Random Forest (sudah dalam format 0/1)
pred_rf = model_new.predict(X_test)

# Ambil tebakan dari Isolation Forest (masih format 1/-1, ubah dulu ke 0/1)
raw_pred_if = model_old.predict(X_test)
pred_if = [1 if p == -1 else 0 for p in raw_pred_if]

# Gabungkan: anomali kalau SALAH SATU bilang anomali
pred_ensemble = []
for rf_result, if_result in zip(pred_rf, pred_if):
    if rf_result == 1 or if_result == 1:
        pred_ensemble.append(1)
    else:
        pred_ensemble.append(0)

print(classification_report(y_test, pred_ensemble, target_names=["normal", "anomaly"]))