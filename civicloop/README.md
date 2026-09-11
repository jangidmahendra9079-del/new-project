# 🚀 CivicLoop

> **AI-powered real-time civic operations and accountability platform**

CivicLoop converts multiple citizen complaints about the same physical problem into **one verified, prioritized civic work item**, then keeps citizens and authorities synchronized until the problem is actually fixed.

---

## Architecture

```
React + Vite (PWA)  ←→  FastAPI  ←→  PostgreSQL + PostGIS
                              ↕
                         Celery + Redis
                              ↕
                       Gemini Vision API
```

---

## Quick Start (Docker)

### 1. Clone & configure

```bash
cp .env.example .env
# Edit .env — set GEMINI_API_KEY, JWT_SECRET, etc.
```

### 2. Start all services

```bash
docker-compose up --build
```

Services:
| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| Celery Flower | http://localhost:5555 |

### 3. Run database migrations

```bash
docker-compose exec backend alembic upgrade head
```

### 4. Seed initial data (departments, categories, wards)

```bash
docker-compose exec backend python scripts/seed.py
```

---

## Local Development (without Docker)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements.txt

# Start PostgreSQL with PostGIS locally (or use Docker just for DB)
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=civicloop_secret postgis/postgis:15-3.3

# Run migrations
alembic upgrade head

# Start API
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Key Features

| Feature | Status |
|---------|--------|
| Citizen registration & JWT auth | ✅ |
| Role-based access (5 roles) | ✅ |
| Photo + GPS report submission | ✅ |
| Gemini Vision AI classification | ✅ |
| AI human override | ✅ |
| Duplicate detection (PostGIS + image hash) | ✅ |
| Master Issue model (CL-YYYY-NNNNNN) | ✅ |
| Priority engine (multi-factor scoring) | ✅ |
| Auto department routing | ✅ |
| Ward auto-detection (PostGIS polygon) | ✅ |
| SLA engine | ✅ |
| Field officer dashboard | ✅ |
| Resolution photo upload | ✅ |
| Citizen verification (YES/NO) | ✅ |
| Real-time WebSocket updates | ✅ |
| Admin panel | ✅ |
| Audit logs | ✅ |
| Public dashboard + Leaflet map | ✅ |
| Civic score system | ✅ |
| Predictive recurrence alerts | ✅ |
| PWA + offline mode | ✅ |
| Web Push notifications | ✅ |
| Celery background jobs | ✅ |

---

## User Roles

| Role | Login | Can Report | Admin Panel | Officer Panel |
|------|-------|-----------|-------------|---------------|
| Public | ❌ | ❌ | ❌ | ❌ |
| Citizen | ✅ | ✅ | ❌ | ❌ |
| Field Officer | ✅ | ❌ | ❌ | ✅ |
| Department Officer | ✅ | ❌ | Partial | ✅ |
| Super Admin | ✅ | ✅ | Full | ✅ |

---

## API Documentation

Interactive docs available at: http://localhost:8000/docs

Key endpoints:

```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/reports          (multipart — image + GPS)
GET  /api/v1/issues/nearby/me
POST /api/v1/issues/{id}/confirm
POST /api/v1/issues/{id}/verify-resolution
GET  /api/v1/public/map-issues
GET  /api/v1/admin/dashboard
WS   /api/v1/ws/{room}
```

---

## Environment Variables

See `.env.example` for all required variables.

**Required:**
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Random 64+ char secret
- `GEMINI_API_KEY` — Google AI Studio API key
- `REDIS_URL` — Redis connection

---

## Demo Scenario (Hackathon)

1. **Citizen** opens app → taps "Report Issue" → takes photo of pothole → GPS auto-captured
2. **Gemini AI** detects: `pothole | HIGH | 94% confidence`
3. System finds existing issue 32m away → citizen confirmation added
4. **Priority Engine** upgrades to CRITICAL
5. **Admin** sees it on live dashboard → assigns to Field Officer
6. **Officer** gets notification → accepts → starts work → uploads repair photo
7. **Citizen** sees `IN PROGRESS` update in real-time (no refresh needed)
8. Officer marks resolved → citizen gets verification prompt
9. Citizen confirms: **YES, FIXED** → issue CLOSED
10. **Public dashboard** updates live: Resolved +1, Resolution Rate updated
11. After 4+ occurrences at same location → **Recurring Issue Alert** sent to admin

---

## Tech Stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Zustand, React Query, Leaflet
- **Backend:** Python 3.11, FastAPI, SQLAlchemy 2.0 (async), Alembic
- **Database:** PostgreSQL 15 + PostGIS 3.3
- **AI:** Google Gemini Vision API (gemini-1.5-flash)
- **Queue:** Celery + Redis
- **Real-time:** FastAPI WebSockets
- **PWA:** Vite PWA Plugin, Service Worker, IndexedDB

---

*Built for Smart City Hackathon — PS #4: Smart City Citizen Reporting*
