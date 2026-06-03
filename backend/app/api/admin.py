from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database.connection import get_db
from app.models.models import User, Document, ChatSession, Message
from app.auth.dependencies import get_admin_user

router = APIRouter()

@router.get("/stats")
async def admin_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    total_users = await db.scalar(select(func.count()).select_from(User))
    total_docs = await db.scalar(select(func.count()).select_from(Document))
    total_messages = await db.scalar(select(func.count()).select_from(Message))
    total_sessions = await db.scalar(select(func.count()).select_from(ChatSession))

    return {
        "total_users": total_users,
        "total_documents": total_docs,
        "total_messages": total_messages,
        "total_chat_sessions": total_sessions
    }

@router.get("/users")
async def admin_users(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return [
        {
            "id": u.id, "email": u.email, "username": u.username,
            "plan": u.plan, "is_active": u.is_active, "created_at": u.created_at
        }
        for u in users
    ]

@router.get("/documents")
async def admin_documents(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    result = await db.execute(select(Document).order_by(Document.created_at.desc()))
    docs = result.scalars().all()
    return [
        {
            "id": d.id, "original_name": d.original_name,
            "user_id": d.user_id, "status": d.status,
            "file_size": d.file_size, "created_at": d.created_at
        }
        for d in docs
    ]
