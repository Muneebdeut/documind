import os
import uuid
import json
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from app.database.connection import get_db
from app.models.models import User, Document
from app.auth.dependencies import get_current_user
from app.rag.processor import pdf_processor
from app.config import settings

router = APIRouter()

MAX_SIZE = settings.MAX_FILE_SIZE_MB * 1024 * 1024

async def process_document_bg(doc_id: str, file_path: str, db_url: str):
    """Background task to process PDF."""
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from app.config import settings
    
    engine = create_async_engine(db_url.replace("postgresql://", "postgresql+asyncpg://"))
    Session = async_sessionmaker(engine, expire_on_commit=False)
    
    async with Session() as db:
        result = await db.execute(select(Document).where(Document.id == doc_id))
        doc = result.scalar_one_or_none()
        if not doc:
            return
        try:
            data = pdf_processor.process_pdf(file_path, doc_id)
            doc.status = "ready"
            doc.collection_name = data["collection_name"]
            doc.total_pages = data["total_pages"]
            doc.total_words = data["total_words"]
            doc.reading_time_minutes = data["reading_time_minutes"]
            doc.keywords = json.dumps(data["keywords"])
            await db.commit()
        except Exception as e:
            doc.status = "error"
            await db.commit()
    await engine.dispose()


@router.post("/upload")
async def upload_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Validate file type
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    # Read and validate size
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail=f"File size exceeds {settings.MAX_FILE_SIZE_MB}MB limit")

    # Save file
    doc_id = str(uuid.uuid4())
    safe_name = f"{doc_id}.pdf"
    user_dir = os.path.join(settings.UPLOAD_DIR, current_user.id)
    os.makedirs(user_dir, exist_ok=True)
    file_path = os.path.join(user_dir, safe_name)

    with open(file_path, "wb") as f:
        f.write(content)

    # Create DB record
    doc = Document(
        id=doc_id,
        user_id=current_user.id,
        filename=safe_name,
        original_name=file.filename,
        file_size=len(content),
        file_path=file_path,
        status="processing"
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    # Process in background
    background_tasks.add_task(
        process_document_bg, doc_id, file_path, settings.DATABASE_URL
    )

    return {
        "id": doc.id,
        "original_name": doc.original_name,
        "file_size": doc.file_size,
        "status": doc.status,
        "created_at": doc.created_at
    }


@router.get("/list")
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Document)
        .where(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc())
    )
    docs = result.scalars().all()
    return [
        {
            "id": d.id,
            "original_name": d.original_name,
            "file_size": d.file_size,
            "total_pages": d.total_pages,
            "total_words": d.total_words,
            "reading_time_minutes": d.reading_time_minutes,
            "status": d.status,
            "keywords": json.loads(d.keywords) if d.keywords else [],
            "created_at": d.created_at
        }
        for d in docs
    ]


@router.get("/{doc_id}")
async def get_document(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.user_id == current_user.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {
        "id": doc.id,
        "original_name": doc.original_name,
        "file_size": doc.file_size,
        "total_pages": doc.total_pages,
        "total_words": doc.total_words,
        "reading_time_minutes": doc.reading_time_minutes,
        "status": doc.status,
        "keywords": json.loads(doc.keywords) if doc.keywords else [],
        "created_at": doc.created_at
    }


@router.delete("/{doc_id}")
async def delete_document(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.user_id == current_user.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete file
    if os.path.exists(doc.file_path):
        os.remove(doc.file_path)

    # Delete vector store
    if doc.collection_name:
        pdf_processor.delete_collection(doc.collection_name)

    await db.delete(doc)
    await db.commit()
    return {"message": "Document deleted successfully"}
