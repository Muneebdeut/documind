from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from app.api import auth, pdf, chat, summary, quiz, export, admin, search
from app.database.connection import create_tables
import uvicorn

app = FastAPI(
    title="DocuMind AI API",
    description="Intelligent PDF Chat & Analysis Platform",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:5176",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(pdf.router, prefix="/pdf", tags=["PDF Management"])
app.include_router(chat.router, prefix="/chat", tags=["AI Chat"])
app.include_router(summary.router, prefix="/summary", tags=["Summarization"])
app.include_router(quiz.router, prefix="/quiz", tags=["Quiz & Flashcards"])
app.include_router(export.router, prefix="/export", tags=["Export"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])
app.include_router(search.router, prefix="/search", tags=["Semantic Search"])

@app.on_event("startup")
async def startup():
    await create_tables()

@app.get("/")
async def root():
    return {"message": "DocuMind AI API", "status": "running", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
