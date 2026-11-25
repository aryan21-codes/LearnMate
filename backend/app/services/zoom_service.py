import re
import time
import jwt

from app.config import get_settings


# Allowed Zoom Video SDK tpc characters per official docs
_VALID_TPC_RE = re.compile(r"^[a-zA-Z0-9\s!#$%&()+\-:;<=>?@\[\]^_{}|~,\\.]+$")


class ZoomConfigError(RuntimeError):
    """Raised when Zoom Video SDK credentials are not configured."""


class ZoomValidationError(ValueError):
    """Raised when session parameters fail Zoom Video SDK validation."""


def generate_zoom_sdk_jwt(
    session_topic: str,
    role_type: int = 1,
    user_identity: str | None = None,
    ttl_seconds: int = 7200,
) -> tuple[str, int]:
    """Generate a short-lived Zoom Video SDK HS256 JWT server-side.

    Never exposes ZOOM_SDK_SECRET to the client.
    """
    settings = get_settings()
    if not settings.zoom_configured:
        raise ZoomConfigError(
            "Zoom Video SDK credentials (ZOOM_SDK_KEY / ZOOM_SDK_SECRET) are not configured on the backend."
        )

    topic = session_topic.strip()
    if len(topic) < 3 or len(topic) > 200 or not _VALID_TPC_RE.match(topic):
        raise ZoomValidationError(
            "Invalid Zoom session topic. Must be 3-200 characters using valid Zoom Video SDK topic characters."
        )

    if role_type not in (0, 1):
        raise ZoomValidationError("role_type must be 0 (participant) or 1 (host).")

    # Zoom requires exp >= 1800s after iat and <= 48 hours
    clamped_ttl = max(1800, min(ttl_seconds, 48 * 3600))
    iat = int(time.time()) - 30
    exp = iat + clamped_ttl

    payload: dict[str, object] = {
        "app_key": settings.zoom_sdk_key,
        "tpc": topic,
        "role_type": role_type,
        "version": 1,
        "iat": iat,
        "exp": exp,
    }
    if user_identity:
        payload["user_identity"] = user_identity[:120]

    token = jwt.encode(payload, settings.zoom_sdk_secret, algorithm="HS256")
    if isinstance(token, bytes):
        token = token.decode("utf-8")
    return token, clamped_ttl
