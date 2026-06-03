@echo off
echo ========================================
echo   DocuMind AI -- Quick Setup (Windows)
echo ========================================

echo.
echo [1/4] Setting up Python backend...
cd backend

if not exist venv (
    python -m venv venv
)
call venv\Scripts\activate.bat

pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt

if not exist .env (
    copy .env.example .env
    echo   WARNING: Created backend\.env -- add your API key before running!
) else (
    echo   .env already exists
)

if not exist uploads mkdir uploads
if not exist chroma_db mkdir chroma_db

echo.
echo [2/4] Setting up frontend...
cd ..\frontend
call npm install --silent
echo   npm packages installed

echo.
echo [3/4] Skipping auto-migration on Windows.
echo   Run manually: cd backend ^& alembic upgrade head

echo.
echo [4/4] Setup complete!
echo.
echo To start:
echo   Terminal 1 (backend):
echo     cd backend ^& venv\Scripts\activate ^& uvicorn app.main:app --reload
echo.
echo   Terminal 2 (frontend):
echo     cd frontend ^& npm run dev
echo.
echo App      -^> http://localhost:5173
echo API      -^> http://localhost:8000
echo API Docs -^> http://localhost:8000/api/docs
echo.
pause
