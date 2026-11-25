from pathlib import Path
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT_DIR = Path(__file__).resolve().parents[2]
BACKEND_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BACKEND_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"


def _is_placeholder(val: str) -> bool:
    v = (val or "").strip()
    if not v:
        return True
    lowered = v.lower()
    return (
        lowered.startswith("your_")
        or "placeholder" in lowered
        or lowered in {"changeme", "none", "null"}
    )


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=[str(ROOT_DIR / ".env"), str(BACKEND_DIR / ".env")],
        env_file_encoding="utf-8",
        extra="ignore",
    )

    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # OpenAI / Modular LLM
    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    openai_model: str = "gpt-4o-mini"
    openai_embedding_model: str = "text-embedding-3-small"
    openai_transcribe_model: str = "whisper-1"

    # Zoom Video SDK (Backend only)
    zoom_sdk_key: str = ""
    zoom_sdk_secret: str = ""

    # Supabase (Optional; local SQLite fallback used when omitted)
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_storage_bucket: str = "study-materials"

    # Upload limits
    max_upload_size_mb: int = 20

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def openai_configured(self) -> bool:
        return not _is_placeholder(self.openai_api_key)

    @property
    def zoom_configured(self) -> bool:
        return not _is_placeholder(self.zoom_sdk_key) and not _is_placeholder(
            self.zoom_sdk_secret
        )

    @property
    def supabase_configured(self) -> bool:
        return not _is_placeholder(self.supabase_url) and not _is_placeholder(
            self.supabase_service_role_key
        )


@lru_cache
def get_settings() -> Settings:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    return Settings()
