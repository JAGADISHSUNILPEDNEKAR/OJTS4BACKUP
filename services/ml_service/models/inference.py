import os
import logging
from typing import Dict, Any
import numpy as np
import joblib

logger = logging.getLogger(__name__)

class PrecheckModel:
    def __init__(self):
        # Top 10 High-Risk Countries from clean_dataset.csv analysis
        self.high_risk_countries = [
            "Niger", "Ecuador", "Somalia", "Bielorrusia", "Sudan", 
            "Barbados", "Trinidad y Tobago", "Afganistan", "Jamaica", "Dinamarca"
        ]
        # High-Risk Keywords based on category risk analysis
        self.high_risk_keywords = [
            "camera", "electronics", "jewelry", "weapon", "chemical",
            "medicine", "baseball", "softball", "golf", "sporting"
        ]

    def assess_risk(self, filename: str, destination: str) -> float:
        risk_score = 10.0  # Base risk
        
        # Check destination
        dest_lower = destination.lower()
        for country in self.high_risk_countries:
            if country.lower() in dest_lower:
                risk_score += 40.0
                break
        
        # Check filename for risk keywords
        file_lower = filename.lower()
        if any(ext in file_lower for ext in ['.exe', '.dll', '.sh', '.bat']):
            risk_score += 80.0
            
        for kw in self.high_risk_keywords:
            if kw in file_lower:
                risk_score += 25.0
                break
                
        # Add a bit of deterministic "noise" based on filename length
        noise = (len(filename) % 10) / 2.0
        risk_score += noise
        
        return min(100.0, risk_score)

class InferenceEngine:
    def __init__(self):
        self.ready = False
        self.model = None
        self.precheck_model = PrecheckModel()

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
        
        # Extract advanced features expected by the model
        mean_temp = float(features.get("mean_temp", 0.0))
        mean_humidity = float(features.get("mean_humidity", 0.0))
        route_deviation = float(features.get("route_deviation", 0.0))
        time_since_dispatch = float(features.get("time_since_dispatch", 0.0))
        sensor_anomaly_score = float(features.get("sensor_anomaly_score", 0.0))
        
        X = np.array([[mean_temp, mean_humidity, route_deviation, time_since_dispatch, sensor_anomaly_score]])
        
        # get anomaly score (score_samples returns negative scores, lower is more anomalous)
        # we convert this to a 0-1 risk score (1 = high risk)
        raw_score = self.model.score_samples(X)[0]
        # Invert and normalize the score to a 0..1 scale roughly
        risk_score = min(max((abs(raw_score) - 0.3) / 0.5, 0.0), 1.0)
        
        return float(risk_score)

    def predict_precheck(self, filename: str, destination: str) -> float:
        return self.precheck_model.assess_risk(filename, destination)

inference_engine = InferenceEngine()
