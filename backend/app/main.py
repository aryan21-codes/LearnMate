import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routes import documents, progress, session, system, tutor, zoom

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

settings = get_settings()

app = FastAPI(
    title="LearnMate Live API",
    description="Adaptive AI Tutoring Platform with Zoom Video SDK & Document RAG",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(system.router)
app.include_router(session.router)
app.include_router(zoom.router)
app.include_router(tutor.router)
app.include_router(documents.router)
app.include_router(progress.router)
