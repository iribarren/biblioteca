# Biblioteca — Workspace

## Overview
Workspace containing two independent projects for "The Library" (La Biblioteca), a solo TTRPG journal game.

## Sub-projects

| Directory | Project | Repository | Description |
|-----------|---------|------------|-------------|
| `oracles-api/` | Oracles API | `iribarren/oracles-api` | Symfony 7.2 REST API + EasyAdmin panel |
| `thelibrary/` | The Library | `iribarren/thelibrary` | Vanilla JS frontend SPA |

Each sub-project has its own git repo, `README.md`, and `CLAUDE.md`. Refer to those for project-specific instructions.

## Shared Infrastructure
- `compose.yaml` — Docker Compose for development (4 services: backend-nginx, backend-php, frontend, mysql)
- `compose.prod.yaml` — Production overrides
- `docker/` — Nginx and PHP configuration files
- `.env` — Root environment variables (dev defaults)

## Development

```bash
docker compose up -d
docker compose exec backend-php php bin/console doctrine:migrations:migrate --no-interaction
docker compose exec backend-php php bin/console doctrine:fixtures:load --no-interaction
```

| Service | URL |
|---------|-----|
| Frontend (game) | http://localhost:3000 |
| Backend API | http://localhost:8080/api/* |
| Admin panel | http://localhost:8080/admin |

## Key Conventions
- All code (variables, functions, comments, DB fields) MUST be in English
- Game-specific terms use these translations: Cuerpo=Body, Mente=Mind, Social=Social, Fase=Phase, Partida=GameSession
- Security is an MVP requirement, not a stretch goal
