from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.database.connection import get_db
from app.models.models import User, Document
from app.auth.dependencies import get_current_user
from app.rag.processor import pdf_processor

router = APIRouter()

class SearchRequest(BaseModel):
    document_id: str
    query: str
    top_k: int = 5


@router.post("/")
async def semantic_search(
    request: SearchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document).where(
            Document.id == request.document_id,
            Document.user_id == current_user.id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.status != "ready":
        raise HTTPException(status_code=400, detail="Document is still processing")

    vectorstore = pdf_processor.load_vector_store(doc.collection_name)
    results = vectorstore.similarity_search_with_score(request.query, k=request.top_k)

    hits = []
    seen_pages: set = set()
    for chunk, score in results:
        page = chunk.metadata.get("page", 0) + 1
        if page not in seen_pages:
            seen_pages.add(page)
        hits.append(
            {
                "page": page,
                "snippet": chunk.page_content[:300].strip(),
                "relevance_score": round(float(1 - score), 3),
            }
        )

    hits.sort(key=lambda x: x["relevance_score"], reverse=True)
    return {"query": request.query, "results": hits, "total": len(hits)}
