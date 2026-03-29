---
name: Project stack and conventions
description: Tech stack, folder structure, naming conventions, and PHP/Doctrine patterns for La Biblioteca backend
type: project
---

**Stack**: Symfony 7.2, PHP 8.3, Doctrine ORM 3, MySQL 8, Docker (backend-php, backend-nginx, mysql, frontend containers).

**Autoload root**: `App\` → `backend/src/`

**Source layout**:
- `src/Controller/` — Symfony controllers (JSON API, no Twig)
- `src/Entity/` — Doctrine entities (attribute-based mapping)
- `src/Repository/` — extend `ServiceEntityRepository`
- `src/Enum/` — PHP 8.1+ backed enums
- `src/Oracle/` — oracle tables and book generation (OracleService, BookGenerator)
- `src/Service/` — business logic (DiceService, GameEngine)
- `migrations/` — Doctrine migration files

**Doctrine mapping**: attributes (`#[ORM\...]`), not annotations or XML. `doctrine.yaml` sets `naming_strategy: underscore_number_aware` and `type: attribute` mapping.

**UUID**: use `Symfony\Component\Uid\Uuid::v4()` for entity IDs; stored as `BINARY(16)` via `type: 'uuid'`.

**PHP conventions**:
- `declare(strict_types=1)` in every file
- `\sprintf`, `\in_array` etc. prefixed with `\` for global-namespace optimization (PHP6616 hint from IDE)
- Constructor property promotion for services; explicit setters for entities
- `readonly` on service constructor properties

**Migrations**: run inside Docker: `docker compose exec backend-php php bin/console doctrine:migrations:diff` then `migrate --no-interaction`.

**Why:** These are the patterns already in the codebase — deviating from them will cause inconsistency and IDE hints.
**How to apply:** Match these patterns exactly when adding new entities, services, or migrations.
