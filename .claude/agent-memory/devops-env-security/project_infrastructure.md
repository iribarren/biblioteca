---
name: La Biblioteca — Infrastructure Overview
description: Core infrastructure setup for the biblioteca project: services, ports, secrets management, and dev conventions
type: project
---

Symfony 7.2 backend + static HTML frontend, orchestrated via Docker Compose. MySQL 8 as the database.

**Services and ports:**
- `backend-nginx` (nginx:alpine): port 8080 → proxies to backend-php:9000
- `backend-php` (php:8.3-fpm, built from backend/Dockerfile): PHP-FPM, no exposed port
- `frontend` (nginx:alpine, built from frontend/Dockerfile): port 3000 → static HTML
- `mysql` (mysql:8.0): port 3306, named volume `mysql_data`

**Key directories:**
- `backend/` — Symfony 7.2 webapp skeleton (composer-managed)
- `frontend/public/` — static HTML/CSS/JS
- `docker/nginx/backend.conf` — nginx config for Symfony front controller
- `docker/php/conf.d/xdebug.ini` — XDebug config (mounted at runtime, not baked into image)
- `app/biblioteca.php` — legacy PHP game logic, DO NOT DELETE (migrating in Phase 2)

**Secrets management pattern:**
- Root `.env` is committed and contains only dev defaults
- Real secrets go in `.env.local` (git-ignored)
- `MYSQL_ROOT_PASSWORD` and `MYSQL_PASSWORD` are the two secrets to rotate
- `APP_SECRET` must be a real random value before any shared deployment

**XDebug / PhpStorm integration:**
- Server name `biblioteca` must be configured in PhpStorm under Settings > PHP > Servers
- `PHP_IDE_CONFIG=serverName=biblioteca` is set in compose.yaml and root .env
- XDebug connects back to `host.docker.internal` (Windows host) on port 9003
- `extra_hosts: host.docker.internal:host-gateway` added to backend-php service

**CORS:**
- Restricted to `http://localhost:3000` only (exact match, not regex)
- Configured in `backend/config/packages/nelmio_cors.yaml` via `CORS_ALLOW_ORIGIN` env var
- Only `/api/` routes receive CORS headers

**Production overlay:**

- `compose.prod.yaml` layers on top of `compose.yaml` (docker compose -f compose.yaml -f compose.prod.yaml up -d)
- `backend/Dockerfile.prod` — multi-stage: build stage (php:8.3-cli + composer --no-dev) → production stage (php:8.3-fpm, opcache, no XDebug)
- `docker/nginx/backend.prod.conf` — adds gzip, FastCGI microcache (1s), rate limiting, HSTS, Permissions-Policy
- `.env.prod.example` — template for required prod secrets; real `.env.prod` is git-ignored
- In production: port 3306 and 3000 are not exposed; APP_SECRET, MYSQL_PASSWORD, MYSQL_ROOT_PASSWORD, CORS_ALLOW_ORIGIN are all required with no defaults (:? syntax)

**Why:** Initial Phase 1 infrastructure setup. Phase 2 will migrate app/biblioteca.php game logic into Symfony entities/services.
**How to apply:** When suggesting new services or endpoints, respect the port assignments above and the CORS restriction. Always inject secrets via environment variables, never hardcode.
