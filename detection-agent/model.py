from sklearn.ensemble import IsolationForest

def train_model(X_train, y_train):
    model = IsolationForest(
        n_estimators=150,
        contamination=y_train.mean(),
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train)
    return model