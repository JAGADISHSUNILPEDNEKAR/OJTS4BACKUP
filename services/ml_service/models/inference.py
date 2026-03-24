import os
import logging
from typing import Dict, Any
import numpy as np
import joblib

logger = logging.getLogger(__name__)

class InferenceEngine:
    def __init__(self):
        self.ready = False
        self.model = None

    def load(self):
        logger.info("Loading origin-models artifacts...")
        model_path = os.path.join(os.path.dirname(__file__), "artifacts", "isolation_forest.pkl")
        if not os.path.exists(model_path):
            logger.warning("Model artifact not found! Run train_model.py first.")
            return
            
        self.model = joblib.load(model_path)
        self.ready = True
        logger.info("Models loaded.")

    def predict(self, features: Dict[str, Any]) -> float:
        if not self.ready or self.model is None:
            raise RuntimeError("Model not loaded yet")
        
        # Extract features expected by the model
        mean_temp = features.get("mean_temp", 0.0)
        mean_humidity = features.get("mean_humidity", 0.0)
        
        X = np.array([[mean_temp, mean_humidity]])
        
        # get anomaly score (score_samples returns negative scores, lower is more anomalous)
        # we convert this to a 0-1 risk score (1 = high risk)
        raw_score = self.model.score_samples(X)[0]
        # Invert and normalize the score to a 0..1 scale roughly
        # Typical scores from IsolationForest: normal ~ -0.4, anomaly ~ -0.8
        risk_score = min(max((abs(raw_score) - 0.3) / 0.5, 0.0), 1.0)
        
        return float(risk_score)

inference_engine = InferenceEngine()
