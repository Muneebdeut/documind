import json
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
from app.database.connection import get_db
from app.models.models import User, Document, ChatSession, Message
from app.auth.dependencies import get_current_user
from app.rag.chain import rag_chain

router = APIRouter()

class ChatRequest(BaseModel):
    document_id: str
    question: str
    session_id: Optional[str] = None

class CompareRequest(BaseModel):
    document_ids: List[str]
    question: str


@router.post("/")
async def chat(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Get document
    result = await db.execute(
        select(Document).where(Document.id == request.document_id, Document.user_id == current_user.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.status != "ready":
        raise HTTPException(status_code=400, detail="Document is still being processed")

    # Get or create session
    session_id = request.session_id
    if not session_id:
        session = ChatSession(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            document_id=doc.id,
            title=request.question[:60]
        )
        db.add(session)
        await db.flush()
        session_id = session.id
    else:
        result = await db.execute(
            select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
        )
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Session not found")

    # Save user message
    user_msg = Message(
        id=str(uuid.uuid4()),
        session_id=session_id,
        role="user",
        content=request.question
    )
    db.add(user_msg)

    # Get AI answer
    try:
        response = rag_chain.answer_question(
            question=request.question,
            collection_name=doc.collection_name,
            session_id=session_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")

    # Save assistant message
    ai_msg = Message(
        id=str(uuid.uuid4()),
        session_id=session_id,
        role="assistant",
        content=response["answer"],
        sources=json.dumps(response["sources"]),
        confidence_score=response["confidence"]
    )
    db.add(ai_msg)
    await db.commit()

    return {
        "session_id": session_id,
        "answer": response["answer"],
        "sources": response["sources"],
        "confidence": response["confidence"]
    }


@router.get("/sessions/{document_id}")
async def get_sessions(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.document_id == document_id, ChatSession.user_id == current_user.id)
        .order_by(ChatSession.created_at.desc())
    )
    sessions = result.scalars().all()
    return [{"id": s.id, "title": s.title, "created_at": s.created_at} for s in sessions]


@router.get("/history/{session_id}")
async def get_history(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    result = await db.execute(
        select(Message).where(Message.session_id == session_id).order_by(Message.created_at)
    )
    messages = result.scalars().all()
    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "sources": json.loads(m.sources) if m.sources else [],
            "confidence": m.confidence_score,
            "created_at": m.created_at
        }
        for m in messages
    ]


@router.post("/compare")
async def compare_documents(
    request: CompareRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    collection_names = []
    for doc_id in request.document_ids:
        result = await db.execute(
            select(Document).where(Document.id == doc_id, Document.user_id == current_user.id)
        )
        doc = result.scalar_one_or_none()
        if doc and doc.status == "ready" and doc.collection_name:
            collection_names.append(doc.collection_name)

    if len(collection_names) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 ready documents to compare")

    answer = rag_chain.compare_documents(collection_names, request.question)
    return {"answer": answer, "documents_compared": len(collection_names)}
