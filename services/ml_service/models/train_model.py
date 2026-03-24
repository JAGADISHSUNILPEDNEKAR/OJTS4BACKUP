import os
import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("train_model")

def train():
    logger.info("Generating synthetic training data for Isolation Forest...")
    # 5 features: mean_temp, mean_humidity, route_deviation, time_since_dispatch, sensor_anomaly_score
    np.random.seed(42)
    
    # Normal data (90%)
    normal_data = np.random.normal(
        loc=[5.0, 50.0, 0.5, 24.0, 0.1], 
        scale=[2.0, 5.0, 1.0, 12.0, 0.05], 
        size=(900, 5)
    )
    
    # Anomalous data (10%)
    anomalous_data = np.random.normal(
        loc=[25.0, 90.0, 50.0, 120.0, 0.9], 
        scale=[5.0, 10.0, 20.0, 48.0, 0.2], 
        size=(100, 5)
    )
    
    X_train = np.vstack([normal_data, anomalous_data])
    
    logger.info("Training Isolation Forest model on 5 features...")
    model = IsolationForest(n_estimators=100, contamination=0.1, random_state=42)
    model.fit(X_train)
    
    artifacts_dir = os.path.join(os.path.dirname(__file__), "artifacts")
    os.makedirs(artifacts_dir, exist_ok=True)
    
    model_path = os.path.join(artifacts_dir, "isolation_forest.pkl")
    joblib.dump(model, model_path)
    logger.info(f"Model successfully trained and saved to {model_path}")

if __name__ == "__main__":
    train()
