from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Origin Auth Service"
    API_V1_STR: str = "/api/v1"
    
    # Needs to be generated and stored securely in Vault for Production
    PRIVATE_KEY: str = """-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCfs7qbn+pg3stR
n2lm8/SCmQPN7RjfhxrL152fq1DjKbe6cVN0YXzNo6GzEXJLVBDNa7nQ4HVXhG1g
Ds/OX2L3xO9W/zOiIoxCoqmDt5Gvzdg0sYWrHTvjgjRRmmtKlvO7Q8Eg8v6cUJjI
fzsq1pGHdXeEh4LSiiEgLJjWHyIKRFR4+uMffG6n3DA9yT/XpKHKJ57NNIfT2c/o
ZDeaXV0CI3F/p9Z909id7L1X2ZcXHmNaF0CcO4GHCWFGjSGeUMQUeaJh0/oz73zM
Lau6ev49Uv/l9NoqY/SHwVksJiKPE2DpXapAvwDqo/f3LKOU00Ak24K+Mw5Qjn5q
q+nEUHK/AgMBAAECggEAMSAIrXl2D+FIuq1mL1CorImkFXKy/YNiN0T2jBiXM6Fw
Dk5w5PJeASWuBla+CTTtTDswd/OrtMWcHXnA65ME7wFpvCGZgOzOp2rA6S8NBf60
XJUk8Ht4IiY5sMZm7ZVcmQShAmEs9+mE7dvRV/6T2o7EOoSytc/em7aMNwVxo6Vf
J5r2B2bCccqQ36M07jSKV4+F8P0r54iWweIONOPrx/dybQsheddO4EvVWGMfiOiy
MIyHpWem4+6lQCj7Ts0iTZ/77ZnDd8RCyei08ZDEQBChe+O1FWs+25OVcbsw/dTP
hS9Sw2IMCizc1bNcPENizyMYPMggUiIxDrnigTt0PQKBgQDgC/P9JB7P9OIuQh9O
6YkQ2j659UIrD84Iya0Uyka7EGmMecrJJa8BeqvJc+KgNaUomOcDjzr+fS0QMlJa
GySxlcC00pZKLK+RL9sAxwkkAWAQollWNlviZCXgl0H9laDzx5EGmrnRHDj8ht9y
0Rqbg8zg0qg51yxNz9XsFkFtkwKBgQC2eoYzj2df3xxjMHHwWnqfM/BD+DTXcHNL
TSgxDh69EfV/WcUFAGlAhEtz50+sHdjCwuGEPz2giV46jc+FG24+dghlW7akYhmO
ihztuuhG3HmfgMzbUAK1Xux+t6o5A0C+kau5jRuWmYXIYFSU+zgxzPOXl1uaI6Xf
JL6sUvPBpQKBgQCo69o1zfn9SOEPh4MbeDCDqEkK48PTu8LYFVaOCkRx3dn2tA0U
w3jDYL4M0XbY3Bl+Fmp24JLWNYK4Z3h3v2dXDVWSAASYQEDO8onoeCiIIRFQ+Vbq
DWoRsvhr8R8sFpiXtKu/kwDujJzaqMXoR4gMIL9j8vArS/R3ZnAf5FfISQKBgATi
9RMOZQtJMz5ovrRcB+qZfnajf+7BASVkFI5zvVj80SEu6zq+DxN+N3MMH7MRPYvB
oj5jXygcZZyVzZfX6zTa/lCQiyyNv/d0NWAcYDn9j3g4/8Njuh7XQugFzRYnwyUX
S4z1fWakB9Qc2EcBDzkuLtvBXt+a0sdN+Zktw39NAoGAKBmYRetQgx4PBTtpfNqh
P4ywjJrTFzE5aKovtLp8HcBv8wp9ELDg0sWyY69cu1gLJnZvJ75IqDYSNXtZrOo5
OqsBP5wQY2fwAoXy+Nkk0XN75LczI71yEU2mGZ/infcjgamzVg2s3Fmu1O0oZjEO
810GnaiAyjS8RHijfTE5DYg=
-----END PRIVATE KEY-----"""
    PUBLIC_KEY: str = """-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAn7O6m5/qYN7LUZ9pZvP0
gpkDze0Y34cay9edn6tQ4ym3unFTdGF8zaOhsxFyS1QQzWu50OB1V4RtYA7Pzl9i
98TvVv8zoiKMQqKpg7eRr83YNLGFqx0744I0UZprSpbzu0PBIPL+nFCYyH87KtaR
h3V3hIeC0oohICyY1h8iCkRUePrjH3xup9wwPck/16ShyieezTSH09nP6GQ3ml1d
AiNxf6fWfdPYney9V9mXFx5jWhdAnDuBhwlhRo0hnlDEFHmiYdP6M+98zC2runr+
PVL/5fTaKmP0h8FZLCYijxNg6V2qQL8A6qP39yyjlNNAJNuCvjMOUI5+aqvpxFBy
vwIDAQAB
-----END PUBLIC KEY-----"""
    
    ALGORITHM: str = "RS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15  # 15 minutes max
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 days

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/origin"
    REDIS_URL: str = "redis://localhost:6379"

    # Account lockout
    MAX_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_DURATION_MINUTES: int = 15
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
