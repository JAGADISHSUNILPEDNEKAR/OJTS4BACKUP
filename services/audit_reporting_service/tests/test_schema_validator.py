import pytest
from consumer import SchemaValidator
from core.config import settings

def test_schema_validator_disabled():
    # If SCHEMA_REGISTRY_URL is None, it should always return True
    settings.SCHEMA_REGISTRY_URL = None
    validator = SchemaValidator()
    assert validator.validate("any.topic", {"some": "data"}) is True

def test_schema_validator_enabled_valid():
    settings.SCHEMA_REGISTRY_URL = "http://localhost:8081"
    validator = SchemaValidator()
    
    # Valid payload for shipment.created
    payload = {"shipment_id": "123", "farmer_id": "456"}
    assert validator.validate("shipment.created", payload) is True

def test_schema_validator_enabled_invalid():
    settings.SCHEMA_REGISTRY_URL = "http://localhost:8081"
    validator = SchemaValidator()
    
    # Invalid payload (missing farmer_id)
    payload = {"shipment_id": "123"}
    assert validator.validate("shipment.created", payload) is False

def test_schema_validator_unknown_topic():
    settings.SCHEMA_REGISTRY_URL = "http://localhost:8081"
    validator = SchemaValidator()
    
    # Should pass through unknown topics
    assert validator.validate("unknown.topic", {"any": "data"}) is True
