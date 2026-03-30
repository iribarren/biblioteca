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
- Data management, and persistance must always happen in the backend
- Security is an MVP requirement, not a stretch goal
## Mandatory Workflow

### New Feature Workflow
When the user requests a new feature or enhancement, ALWAYS follow this sequence:

1. **Specification first**: Delegate to the `project-manager-docs` agent to define the feature. The spec is saved in `docs/specs/YYYY-MM-DD-feature-name.md`. Must include: Overview, User Stories, Acceptance Criteria, Out of Scope, Dependencies.
2. **User approval**: Present the spec. Do NOT proceed until the user explicitly approves.
3. **Create feature branch**: `feature/<short-name>` from `master` in the appropriate repo.
4. **Implement**: Use the appropriate agent(s).
5. **Test**: Use `test-writer` to create/update tests.
6. **Commit on the feature branch**: Never directly on `master`.

### Bug Fix Workflow
When the user reports a bug:

1. **Diagnose**: Understand the bug.
2. **Create bugfix branch**: `bugfix/<short-name>` from `master`.
3. **Fix and test**.
4. **Commit on the bugfix branch**.

### Branch Rules
- NEVER commit directly to `master`.
- Branch naming: `feature/<name>` or `bugfix/<name>`, lowercase, hyphen-separated.
- If already on a feature/bugfix branch, continue on it.