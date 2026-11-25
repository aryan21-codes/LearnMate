from fastapi import APIRouter

from app.config import get_settings
from app.schemas.models import UserCreateRequest, UserResponse
from app.services.database import db

router = APIRouter(prefix="/api", tags=["system"])


@router.get("/health")
def health_check():
    settings = get_settings()
    return {
        "status": "ok",
        "integrations": {
            "openai_configured": settings.openai_configured,
            "zoom_configured": settings.zoom_configured,
            "supabase_configured": settings.supabase_configured,
            "storage_backend": "supabase" if settings.supabase_configured else "sqlite_local",
            "model": settings.openai_model,
        },
    }


@router.post("/users", response_model=UserResponse)
def upsert_user(payload: UserCreateRequest):
    user = db.upsert_user(name=payload.name, email=payload.email, user_id=payload.id)
    return user
