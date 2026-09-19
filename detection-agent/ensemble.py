def ensemble_predict(model_rf, model_if, X):
    pred_rf = model_rf.predict(X)

    raw_pred_if = model_if.predict(X)
    pred_if = [1 if p == -1 else 0 for p in raw_pred_if]

    final_pred = []
    for rf_result, if_result in zip(pred_rf, pred_if):
        final_pred.append(1 if (rf_result == 1 or if_result == 1) else 0)

    return final_pred