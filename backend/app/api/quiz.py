from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.database.connection import get_db
from app.models.models import User, Document
from app.auth.dependencies import get_current_user
from app.rag.chain import rag_chain

router = APIRouter()

class QuizRequest(BaseModel):
    document_id: str
    quiz_type: str = "mcq"  # mcq, flashcard, short_answer, long_answer
    num_questions: int = 5


@router.post("/")
async def generate_quiz(
    request: QuizRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if request.num_questions > 20:
        raise HTTPException(status_code=400, detail="Max 20 questions per request")

    result = await db.execute(
        select(Document).where(Document.id == request.document_id, Document.user_id == current_user.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.status != "ready":
        raise HTTPException(status_code=400, detail="Document is still processing")

    questions = rag_chain.generate_quiz(
        collection_name=doc.collection_name,
        quiz_type=request.quiz_type,
        num_questions=request.num_questions
    )
    return {
        "document_id": doc.id,
        "document_name": doc.original_name,
        "quiz_type": request.quiz_type,
        "questions": questions,
        "total": len(questions)
    }
