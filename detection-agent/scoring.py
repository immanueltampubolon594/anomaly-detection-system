def compute_anomaly_scores(model, X):
    raw_scores = model.decision_function(X)
    min_s, max_s = raw_scores.min(), raw_scores.max()
    anomaly_scores = 1 - (raw_scores - min_s) / (max_s - min_s)
    return anomaly_scores