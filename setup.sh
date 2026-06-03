#!/usr/bin/env bash
# DocuMind AI — Quick Setup Script
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "  ____             __  __ _           _ "
echo " |  _ \  ___   ___|  \/  (_)_ __   __| |"
echo " | | | |/ _ \ / __| |\/| | | '_ \ / _\` |"
echo " | |_| | (_) | (__| |  | | | | | | (_| |"
echo " |____/ \___/ \___|_|  |_|_|_| |_|\__,_|"
echo -e "${NC}"
echo -e "${GREEN}DocuMind AI — Setup${NC}"
echo "========================================"

# ── Backend ──────────────────────────────────────────────────────────────────
echo -e "\n${YELLOW}[1/4] Setting up Python backend...${NC}"
cd backend

if [ ! -d "venv" ]; then
  python3 -m venv venv
fi
source venv/bin/activate

pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo -e "${YELLOW}  ⚠  Created backend/.env — please add your API key before running!${NC}"
else
  echo "  ✓  .env already exists"
fi

mkdir -p uploads chroma_db

# ── Frontend ──────────────────────────────────────────────────────────────────
echo -e "\n${YELLOW}[2/4] Setting up frontend...${NC}"
cd ../frontend
npm install --silent
echo "  ✓  npm packages installed"

# ── Database ──────────────────────────────────────────────────────────────────
echo -e "\n${YELLOW}[3/4] Database migrations...${NC}"
cd ../backend
source venv/bin/activate

if command -v psql &>/dev/null; then
  # Try to create DB if it doesn't exist
  psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'documind'" | grep -q 1 \
    || psql -U postgres -c "CREATE DATABASE documind" 2>/dev/null || true
  alembic upgrade head && echo "  ✓  Migrations applied" || echo "  ⚠  Migration skipped (check DATABASE_URL in .env)"
else
  echo "  ⚠  PostgreSQL not found — run 'alembic upgrade head' manually after starting Postgres"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo -e "\n${YELLOW}[4/4] Setup complete!${NC}"
echo ""
echo -e "${GREEN}To start the app:${NC}"
echo ""
echo "  Terminal 1 (backend):"
echo "    cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
echo ""
echo "  Terminal 2 (frontend):"
echo "    cd frontend && npm run dev"
echo ""
echo -e "${GREEN}Or use Docker:${NC}"
echo "    docker compose up --build"
echo ""
echo "  App     → http://localhost:5173"
echo "  API     → http://localhost:8000"
echo "  API Docs→ http://localhost:8000/api/docs"
echo ""
