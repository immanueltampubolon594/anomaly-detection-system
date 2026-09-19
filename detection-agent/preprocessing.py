import numpy as np
from sklearn.preprocessing import LabelEncoder

CATEGORICAL_COLS = ["protocol_type", "service", "flag"]

def fit_encoders(df):
    encoders = {}
    for col in CATEGORICAL_COLS:
        le = LabelEncoder()
        le.fit(df[col])
        encoders[col] = le
    return encoders

def apply_encoders(df, encoders):
    df = df.copy()
    for col in CATEGORICAL_COLS:
        le = encoders[col]
        known_classes = set(le.classes_)
        df[col] = df[col].apply(lambda x: x if x in known_classes else "unknown")

        if "unknown" not in le.classes_:
            le.classes_ = np.array(list(le.classes_) + ["unknown"])

        df[col] = le.transform(df[col])
    return df

def encode_features(df, encoders=None):
    if encoders is None:
        encoders = fit_encoders(df)
    df = apply_encoders(df, encoders)
    df["is_anomaly"] = df["label"].apply(lambda x: 0 if x == "normal" else 1)
    return df, encoders