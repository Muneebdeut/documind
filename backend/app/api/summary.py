from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from app.database.connection import get_db
from app.models.models import User, Document
from app.auth.dependencies import get_current_user
from app.rag.chain import rag_chain

router = APIRouter()

class SummaryRequest(BaseModel):
    document_id: str
    summary_type: str = "detailed"  # short, detailed, executive, chapter

class KeyPointsRequest(BaseModel):
    document_id: str


@router.post("/")
async def summarize(
    request: SummaryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Document).where(Document.id == request.document_id, Document.user_id == current_user.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.status != "ready":
        raise HTTPException(status_code=400, detail="Document is still being processed")

    summary = rag_chain.summarize(doc.collection_name, request.summary_type)
    return {
        "document_id": doc.id,
        "document_name": doc.original_name,
        "summary_type": request.summary_type,
        "summary": summary
    }


@router.post("/key-points")
async def key_points(
    request: KeyPointsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Document).where(Document.id == request.document_id, Document.user_id == current_user.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.status != "ready":
        raise HTTPException(status_code=400, detail="Document is still processing")

    points = rag_chain.extract_key_points(doc.collection_name)
    return {
        "document_id": doc.id,
        "document_name": doc.original_name,
        **points
    }
