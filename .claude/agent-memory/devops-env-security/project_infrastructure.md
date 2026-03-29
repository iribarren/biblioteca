---
name: La Biblioteca — Infrastructure Overview
description: Core infrastructure setup for the biblioteca project: services, ports, secrets management, dev conventions, and known security findings
type: project
---

Symfony 7.2 backend + static HTML frontend, orchestrated via Docker Compose. MySQL 8 as the database.

**Repo structure (3 independent git repos as of 2026-03-29):**
- Root workspace: `biblioteca/` → `git@github.com:iribarren/biblioteca.git` (already pushed to GitHub)
- Backend: `biblioteca/oracles-api/` → `git@github.com:iribarren/oracles-api.git` (no commits yet)
- Frontend: `biblioteca/thelibrary/` → initial commit exists, not yet pushed

**Services and ports:**
- `backend-nginx` (nginx:alpine): port 8080 → proxies to backend-php:9000
- `backend-php` (php:8.3-fpm, built from oracles-api/Dockerfile): PHP-FPM, no exposed port
- `frontend` (nginx:alpine, built from thelibrary/Dockerfile): port 3000 → static HTML
- `mysql` (mysql:8.0): port 3306, named volume `mysql_data`

**Key directories:**
- `oracles-api/` — Symfony 7.2 backend (own git repo), container workdir: `/var/www/backend`
- `thelibrary/` — static HTML/CSS/JS frontend (own git repo)
- `docker/nginx/backend.conf` — nginx config for Symfony front controller
- `docker/php/conf.d/xdebug.ini` — XDebug config (mounted at runtime, not baked into image)

**Secrets management pattern:**
- Root `.env` is committed and contains only dev defaults (committed to GitHub)
- Real secrets go in `.env.local` (git-ignored) or `.env.prod` (git-ignored)
- `MYSQL_ROOT_PASSWORD` and `MYSQL_PASSWORD` are the two DB secrets to rotate before any shared deployment
- `APP_SECRET` must be a real random value before any shared deployment
- `.env.prod.example` serves as the template; real `.env.prod` is git-ignored

**Known security findings (from 2026-03-29 audit):**

1. `oracles-api/.env.dev` contains a REAL APP_SECRET (`bf2276b4d07e8d8bd6893a4cdf18301f`) — this file will be committed to the oracles-api repo. Must be moved to `.env.local` and the value rotated.

2. `oracles-api/.env.test` contains a hardcoded plain-text DB password (`biblioteca_pass_dev`) in the DATABASE_URL. This is a dev/test credential but will be committed. Consider using a separate test DB URL that uses env var interpolation.

3. Root repo git history (already pushed to GitHub) contains `frontend/public/js/admin.js` with `const ADMIN_PASSWORD = 'biblioteca2026'` (commit 19ed3d3). The file is deleted in working tree but the commit is public. This password is superseded by proper EasyAdmin server-side auth.

4. `admin@biblioteca.local` / `admin123` appears in README.md files and AdminUserFixtures.php — acceptable since it is clearly labeled as a dev fixture credential, hashed via Symfony's password hasher, and the WARNING comment in the fixture says not to run in production.

5. Root `.env` is committed and public on GitHub with `MYSQL_ROOT_PASSWORD=root_secret_dev` and `MYSQL_PASSWORD=biblioteca_pass_dev` — acceptable as these are clearly labeled dev defaults, but the compose.yaml healthcheck embeds the default `root_secret` (without `_dev`) as fallback.

**XDebug / PhpStorm integration:**
- Server name `biblioteca` must be configured in PhpStorm under Settings > PHP > Servers
- `PHP_IDE_CONFIG=serverName=biblioteca` is set in compose.yaml and root .env
- XDebug connects back to `host.docker.internal` (Windows host) on port 9003
- `extra_hosts: host.docker.internal:host-gateway` added to backend-php service

**CORS:**
- Restricted to `http://localhost:3000` only (exact match, not regex)
- Configured in `oracles-api/config/packages/nelmio_cors.yaml` via `CORS_ALLOW_ORIGIN` env var
- Only `/api/` routes receive CORS headers

**Production overlay:**
- `compose.prod.yaml` layers on top of `compose.yaml` (docker compose -f compose.yaml -f compose.prod.yaml up -d)
- `oracles-api/Dockerfile.prod` — multi-stage: build stage (php:8.3-cli + composer --no-dev) → production stage (php:8.3-fpm, opcache, no XDebug)
- `docker/nginx/backend.prod.conf` — adds gzip, FastCGI microcache (1s), rate limiting, HSTS, Permissions-Policy
- `.env.prod.example` — template for required prod secrets; real `.env.prod` is git-ignored
- In production: port 3306 and 3000 are not exposed; APP_SECRET, MYSQL_PASSWORD, MYSQL_ROOT_PASSWORD, CORS_ALLOW_ORIGIN are all required with no defaults (:? syntax)

**Why:** Initial Phase 1–11 infrastructure setup. Backend and frontend now have independent git repos to allow separate publishing to GitHub.
**How to apply:** When suggesting new services or endpoints, respect the port assignments above and the CORS restriction. Always inject secrets via environment variables, never hardcode. Before suggesting commits to oracles-api, flag that .env.dev needs remediation.
