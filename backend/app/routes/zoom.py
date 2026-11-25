from fastapi import APIRouter, HTTPException

from app.schemas.models import ZoomSignatureRequest, ZoomSignatureResponse
from app.services.database import db
from app.services.zoom_service import (
    ZoomConfigError,
    ZoomValidationError,
    generate_zoom_sdk_jwt,
)

router = APIRouter(prefix="/api/zoom", tags=["zoom"])


@router.post("/signature", response_model=ZoomSignatureResponse)
def create_zoom_signature(payload: ZoomSignatureRequest):
    if payload.session_id:
        session = db.get_session(payload.session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Referenced tutoring session not found")

    try:
        token, ttl = generate_zoom_sdk_jwt(
            session_topic=payload.session_topic,
            role_type=payload.role_type,
            user_identity=payload.user_identity,
        )
    except ZoomConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except ZoomValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return ZoomSignatureResponse(
        signature=token,
        session_topic=payload.session_topic.strip(),
        role_type=payload.role_type,
        expires_in_seconds=ttl,
    )
