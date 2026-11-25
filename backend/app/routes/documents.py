from pathlib import Path
from typing import Optional
import uuid

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile

from app.config import get_settings
from app.schemas.models import DocumentProcessRequest, DocumentResponse
from app.services.database import db
from app.services.document_service import process_pdf_document

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    auto_process: bool = Form(True),
):
    settings = get_settings()
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    content_bytes = await file.read()
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    if len(content_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded PDF file is empty.")
    if len(content_bytes) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds {settings.max_upload_size_mb} MB limit.",
        )

    # Validate PDF magic header
    if not content_bytes.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="Invalid PDF file header.")

    doc_id = str(uuid.uuid4())
    safe_name = Path(file.filename).name
    storage_key = f"{user_id}/{doc_id}_{safe_name}"
    local_path = db.upload_file_to_storage(storage_key, content_bytes)

    doc = db.create_document(
        user_id=user_id,
        file_name=safe_name,
        storage_path=local_path,
        file_size_bytes=len(content_bytes),
        doc_id=doc_id,
    )

    if auto_process:
        try:
            doc = process_pdf_document(doc["id"])
        except Exception as exc:
            raise HTTPException(status_code=422, detail=f"PDF processing failed: {exc}")

    return doc


@router.post("/process", response_model=DocumentResponse)
def process_document(payload: DocumentProcessRequest):
    try:
        return process_pdf_document(payload.document_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"PDF processing failed: {exc}")


@router.get("", response_model=list[DocumentResponse])
def list_documents(user_id: Optional[str] = Query(default=None)):
    return db.list_documents(user_id=user_id)
