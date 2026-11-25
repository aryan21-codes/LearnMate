import math
import re
from pathlib import Path
from typing import Any, Optional

import fitz  # PyMuPDF
import numpy as np
from openai import OpenAI

from app.config import get_settings
from app.services.database import db


_WORD_RE = re.compile(r"[a-zA-Z0-9]{2,}")


def _clean_text(text: str) -> str:
    text = text.replace("\x00", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _chunk_text(text: str, chunk_size: int = 850, overlap: int = 140) -> list[str]:
    if not text:
        return []
    if len(text) <= chunk_size:
        return [text]

    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = min(len(text), start + chunk_size)
        if end < len(text):
            # Prefer breaking on sentence/newline boundary
            split_pos = max(text.rfind("\n", start, end), text.rfind(". ", start, end))
            if split_pos > start + chunk_size // 2:
                end = split_pos + 1
        piece = text[start:end].strip()
        if piece:
            chunks.append(piece)
        if end >= len(text):
            break
        start = max(end - overlap, start + 1)
    return chunks


def _generate_embeddings(texts: list[str]) -> Optional[list[list[float]]]:
    settings = get_settings()
    if not settings.openai_configured or not texts:
        return None
    try:
        client = OpenAI(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url,
            timeout=25.0,
        )
        # Batch in groups of 50
        all_embeddings: list[list[float]] = []
        for i in range(0, len(texts), 50):
            batch = texts[i : i + 50]
            resp = client.embeddings.create(
                model=settings.openai_embedding_model,
                input=batch,
            )
            all_embeddings.extend([item.embedding for item in resp.data])
        return all_embeddings
    except Exception:
        return None


def process_pdf_document(document_id: str) -> dict[str, Any]:
    doc = db.get_document(document_id)
    if not doc:
        raise ValueError(f"Document {document_id} not found")

    db.update_document_status(document_id, "processing")
    file_path = Path(doc["storage_path"])
    if not file_path.exists():
        db.update_document_status(document_id, "failed", error_message="PDF file not found on disk")
        raise FileNotFoundError(f"PDF file missing: {file_path}")

    try:
        pdf = fitz.open(str(file_path))
        page_count = len(pdf)
        extracted_chunks: list[dict[str, Any]] = []
        chunk_idx = 0

        for page_num in range(page_count):
            page = pdf[page_num]
            raw_text = page.get_text("text")
            cleaned = _clean_text(raw_text)
            if not cleaned:
                continue
            for piece in _chunk_text(cleaned):
                extracted_chunks.append(
                    {
                        "content": piece,
                        "page_number": page_num + 1,
                        "chunk_index": chunk_idx,
                    }
                )
                chunk_idx += 1

        pdf.close()

        if not extracted_chunks:
            db.update_document_status(
                document_id,
                "failed",
                page_count=page_count,
                error_message="No extractable text found in PDF (it may be scanned images without OCR).",
            )
            return db.get_document(document_id)  # type: ignore[return-value]

        embeddings = _generate_embeddings([c["content"] for c in extracted_chunks])
        if embeddings and len(embeddings) == len(extracted_chunks):
            for c, emb in zip(extracted_chunks, embeddings):
                c["embedding"] = emb

        db.replace_document_chunks(document_id, extracted_chunks)
        db.update_document_status(document_id, "ready", page_count=page_count)
        return db.get_document(document_id)  # type: ignore[return-value]
    except Exception as exc:
        db.update_document_status(document_id, "failed", error_message=str(exc))
        raise


def _lexical_score(query_tokens: list[str], chunk_text: str) -> float:
    if not query_tokens:
        return 0.0
    chunk_tokens = set(_WORD_RE.findall(chunk_text.lower()))
    if not chunk_tokens:
        return 0.0
    overlap = sum(1 for t in query_tokens if t in chunk_tokens)
    return overlap / math.sqrt(len(set(query_tokens)) * len(chunk_tokens) + 1.0)


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    va = np.asarray(a, dtype=np.float32)
    vb = np.asarray(b, dtype=np.float32)
    denom = float(np.linalg.norm(va) * np.linalg.norm(vb))
    if denom == 0.0:
        return 0.0
    return float(np.dot(va, vb) / denom)


def retrieve_relevant_chunks(
    query: str,
    document_ids: list[str],
    user_id: Optional[str] = None,
    top_k: int = 4,
) -> list[dict[str, Any]]:
    chunks = db.get_chunks_for_documents(document_ids=document_ids, user_id=user_id)
    if not chunks:
        return []

    query_tokens = _WORD_RE.findall(query.lower())
    has_embeddings = any(c.get("embedding") is not None for c in chunks)
    query_emb: Optional[list[float]] = None

    if has_embeddings:
        embs = _generate_embeddings([query])
        if embs:
            query_emb = embs[0]

    scored: list[tuple[float, dict[str, Any]]] = []
    for c in chunks:
        lex = _lexical_score(query_tokens, c["content"])
        if query_emb is not None and c.get("embedding") is not None:
            sem = max(0.0, _cosine_similarity(query_emb, c["embedding"]))
            score = 0.72 * sem + 0.28 * lex
        else:
            score = lex
        scored.append((score, c))

    scored.sort(key=lambda pair: pair[0], reverse=True)
    results: list[dict[str, Any]] = []
    for score, c in scored[:top_k]:
        # Keep top matches (or top 2 even with low lexical score if user attached docs)
        if score > 0.04 or len(results) < 2:
            results.append(
                {
                    "document_id": c["document_id"],
                    "document_name": c.get("file_name", "Study Document"),
                    "page_number": c["page_number"],
                    "snippet": c["content"][:280].replace("\n", " "),
                    "full_content": c["content"],
                    "score": round(float(score), 4),
                }
            )
    return results
