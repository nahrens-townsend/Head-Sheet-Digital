# Head Sheet Digital

> The digital head sheet that works like the physical one — but saves itself.

A purpose-built SaaS tool for hair stylists and barbers. Replace paper head sheets with a fast, clean digital experience: annotate fade lines, clipper guard numbers, and blend zones directly on a mannequin template. Access any client's head sheet from any device in under 5 seconds.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite |
| UI | Chakra UI v3 |
| Drawing | Konva.js / react-konva |
| State | Zustand (local) + TanStack Query (server) |
| Backend | ASP.NET Core 10 (Clean Architecture) |
| ORM | Entity Framework Core + PostgreSQL |
| Auth | JWT (access token in memory, refresh token HttpOnly cookie) |

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- [Node.js 22+](https://nodejs.org/)
- Git

## Quick Start

```bash
# 1. Start PostgreSQL
docker compose -f docker/docker-compose.yml up -d

# 2. Backend (new terminal)
cd backend
dotnet restore
dotnet ef database update --project HeadSheet.Infrastructure --startup-project HeadSheet.Api
dotnet run --project HeadSheet.Api

# 3. Frontend (new terminal)
cd frontend
npm install
cp .env.example .env.local   # edit VITE_API_URL if needed
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)  
API runs at [http://localhost:5000](http://localhost:5000)  
API docs at [http://localhost:5000/openapi/v1.json](http://localhost:5000/openapi/v1.json)

## Makefile shortcuts

```bash
make up        # Start Docker services
make down      # Stop Docker services
make api       # Run backend
make web       # Run frontend dev server
make migrate   # Apply EF Core migrations
```

## Environment Variables

**Backend** — `backend/HeadSheet.Api/appsettings.Development.json` (git-ignored):
```json
{
  "ConnectionStrings": { "Default": "Host=localhost;Port=5432;Database=headsheet_dev;Username=postgres;Password=postgres" },
  "Jwt": { "Secret": "your-dev-secret-min-32-chars", "AccessTokenExpiryMinutes": 15, "RefreshTokenExpiryDays": 30 },
  "Cors": { "AllowedOrigins": ["http://localhost:5173"] }
}
```

**Frontend** — `frontend/.env.local` (git-ignored):
```env
VITE_API_URL=http://localhost:5000/api
```

## Project Structure

```
head-sheet-digital/
├── .github/workflows/    # CI — backend-ci.yml, frontend-ci.yml
├── backend/              # ASP.NET Core (Clean Architecture)
│   ├── HeadSheet.Api/
│   ├── HeadSheet.Application/
│   ├── HeadSheet.Domain/
│   ├── HeadSheet.Infrastructure/
│   └── HeadSheet.Tests/
├── frontend/             # React + Vite SPA
│   └── src/
│       ├── api/          # HTTP layer
│       ├── canvas/       # Konva drawing logic
│       ├── components/   # Shared UI
│       ├── features/     # auth/, headSheets/
│       ├── stores/       # Zustand stores
│       └── types/        # TypeScript interfaces
├── docker/               # docker-compose files
└── docs/                 # ADRs, planning
```

## Development Phases

| Phase | Goal | Status |
|-------|------|--------|
| 0 — Setup | Local dev environment, CI | ✅ Done |
| 1 — Auth | Register, login, JWT refresh | 🔜 Next |
| 2 — CRUD | Head sheet list/create/delete | 🔜 Planned |
| 3 — Canvas | Drawing, undo/redo, auto-save | 🔜 Planned |
| 4 — Polish | Tablet layout, error states, deploy | 🔜 Planned |

## Contributing

Branch off `main`, squash-merge via PR. Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/).

```
feat(auth): add refresh token rotation
fix(canvas): resolve undo stack not clearing on new sheet
```
