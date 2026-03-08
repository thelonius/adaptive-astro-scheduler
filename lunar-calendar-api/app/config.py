from pydantic_settings import BaseSettings
from typing import List
import os

# Configure Skyfield cache to use a writable directory
os.environ['SKYFIELD_DATA'] = '/tmp/skyfield-data'
os.makedirs('/tmp/skyfield-data', exist_ok=True)


class Settings(BaseSettings):
    """Application configuration settings."""

    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    API_RELOAD: bool = True

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
        "moz-extension://*",  # Firefox extension support
        "chrome-extension://*",  # Chrome extension support
    ]

    # API Configuration
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "Lunar Calendar API"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = "Modern API for lunar calendar information and recommendations"

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Ignore extra environment variables


settings = Settings()
