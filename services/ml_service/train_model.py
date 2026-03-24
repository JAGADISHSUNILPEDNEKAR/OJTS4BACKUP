import os
import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def train_and_save():
    logger.info("Generating dummy historical data for training (mean_temp, mean_humidity)")
    # Generate normal data: temp around 4.0C, humidity around 60%
    normal_data = np.random.normal(loc=[4.0, 60.0], scale=[1.5, 5.0], size=(1000, 2))
    
    # Generate some anomalous data
    anomalous_data = np.random.normal(loc=[15.0, 90.0], scale=[3.0, 10.0], size=(50, 2))
    
    X_train = np.vstack([normal_data, anomalous_data])
    
    logger.info("Training IsolationForest model...")
    model = IsolationForest(contamination=0.05, random_state=42)
    model.fit(X_train)
    
    artifacts_dir = os.path.join(os.path.dirname(__file__), "models", "artifacts")
    os.makedirs(artifacts_dir, exist_ok=True)
    
    model_path = os.path.join(artifacts_dir, "isolation_forest.pkl")
    joblib.dump(model, model_path)
    logger.info(f"Model saved successfully to {model_path}")

if __name__ == "__main__":
    train_and_save()
