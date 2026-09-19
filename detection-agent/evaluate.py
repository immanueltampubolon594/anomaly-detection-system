from sklearn.metrics import classification_report, confusion_matrix

def evaluate(model, X_test, y_test):
    raw_pred = model.predict(X_test)
    y_pred = [1 if p == -1 else 0 for p in raw_pred]

    print("=== Hasil Deteksi ===")
    print(classification_report(y_test, y_pred, target_names=["normal", "anomaly"]))
    print("Confusion Matrix (baris=aktual, kolom=prediksi):")
    print(confusion_matrix(y_test, y_pred))