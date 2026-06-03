from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Optional
import json
import io
from app.database.connection import get_db
from app.models.models import User, Document, ChatSession, Message
from app.auth.dependencies import get_current_user

router = APIRouter()

class ExportRequest(BaseModel):
    session_id: str
    format: str = "txt"  # txt, json


@router.post("/chat")
async def export_chat(
    request: ExportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == request.session_id, ChatSession.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    result = await db.execute(
        select(Message).where(Message.session_id == request.session_id).order_by(Message.created_at)
    )
    messages = result.scalars().all()

    if request.format == "json":
        data = json.dumps([
            {
                "role": m.role,
                "content": m.content,
                "sources": json.loads(m.sources) if m.sources else [],
                "timestamp": m.created_at.isoformat()
            }
            for m in messages
        ], indent=2)
        return StreamingResponse(
            io.BytesIO(data.encode()),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=chat_{request.session_id[:8]}.json"}
        )
    else:
        lines = [f"DocuMind AI - Chat Export\n{'='*50}\n"]
        for m in messages:
            role = "You" if m.role == "user" else "DocuMind AI"
            lines.append(f"\n{role}:\n{m.content}")
            if m.sources and m.role == "assistant":
                sources = json.loads(m.sources)
                if sources:
                    pages = [f"Page {s['page']}" for s in sources]
                    lines.append(f"\nSources: {', '.join(pages)}")
            lines.append(f"\n{'-'*30}")

        content = "\n".join(lines)
        return StreamingResponse(
            io.BytesIO(content.encode()),
            media_type="text/plain",
            headers={"Content-Disposition": f"attachment; filename=chat_{request.session_id[:8]}.txt"}
        )
