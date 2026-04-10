# Production Environment Variables

**Date:** 2026-04-06

This document explains every environment variable required to run La Biblioteca in production, how to generate secrets, and how to inject them safely.

---

## Quick Reference

| Variable | Where used | Required | Type |
|----------|-----------|----------|------|
| `APP_SECRET` | backend-php | Yes | Runtime |
| `JWT_PASSPHRASE` | backend-php | Yes | Runtime |
| `MYSQL_PASSWORD` | backend-php, mysql | Yes | Runtime |
| `MYSQL_ROOT_PASSWORD` | mysql | Yes | Runtime |
| `CORS_ALLOW_ORIGIN` | backend-php | Yes | Runtime |
| `VITE_API_BASE_URL` | frontend (build) | Yes | Build-time |

---

## Variables

### `APP_SECRET`

Used by Symfony to sign sessions and CSRF tokens.

```bash
# Generate a new value:
php -r "echo bin2hex(random_bytes(16)) . PHP_EOL;"
# or:
openssl rand -hex 16
```

- Must be unique per environment (never share dev and prod values).
- Changing this invalidates all active admin sessions.

---

### `JWT_PASSPHRASE`

Passphrase used to encrypt the JWT private key (`oracles-api/config/jwt/private.pem`).

```bash
# Generate a strong passphrase:
openssl rand -base64 32
```

**How to generate the JWT key pair** (only needed once per environment):

```bash
openssl genrsa -aes256 -passout pass:"YOUR_PASSPHRASE" -out oracles-api/config/jwt/private.pem 4096
openssl rsa -pubout \
  -passin pass:"YOUR_PASSPHRASE" \
  -in oracles-api/config/jwt/private.pem \
  -out oracles-api/config/jwt/public.pem
```

- `private.pem` must be available inside the backend container (baked into the image or mounted as a secret).
- `public.pem` is committed to the repository (it is public by design).
- Regenerating the key pair invalidates all existing access and refresh tokens — all users will need to log in again.

---

### `MYSQL_PASSWORD`

Password for the `biblioteca_user` application database account.

```bash
openssl rand -base64 24
```

- Used by both the backend-php service (in `DATABASE_URL`) and the mysql service (at container init).
- Changing it requires recreating the MySQL container or updating the user password manually.

---

### `MYSQL_ROOT_PASSWORD`

Password for the MySQL `root` account.

```bash
openssl rand -base64 24
```

- Only used for health checks and manual administration.
- The application never connects as root.

---

### `CORS_ALLOW_ORIGIN`

Exact origin (scheme + host + optional port) that the browser sends in the `Origin` header.

```
CORS_ALLOW_ORIGIN=https://biblioteca.yourdomain.com
```

- **No trailing slash.**
- Must match exactly — wildcards are not accepted for security reasons.
- Changing this requires restarting the backend-php container (no rebuild needed).

---

### `VITE_API_BASE_URL`

Full URL of the Symfony backend API, without trailing slash.

```
VITE_API_BASE_URL=https://api.yourdomain.com
```

**This is a build-time variable.** Vite bakes it into the compiled JS bundle during `npm run build`. It cannot be changed without rebuilding the frontend image.

After changing this value:
1. Rebuild the frontend image (see [How to inject variables](#how-to-inject-variables) below).
2. Update the `Content-Security-Policy` `connect-src` directive in [thelibrary/nginx.conf](../thelibrary/nginx.conf) to include the new API origin.

---

## How to Inject Variables

### Option A: `.env.prod` file (recommended for VPS)

1. Copy the template:
   ```bash
   cp .env.prod.example .env.prod
   ```
2. Fill in all values in `.env.prod`. This file is git-ignored.
3. Source it and start the stack:
   ```bash
   set -a && source .env.prod && set +a
   docker compose -f compose.yaml -f compose.prod.yaml up -d
   ```

To build the frontend image with `VITE_API_BASE_URL`:
```bash
set -a && source .env.prod && set +a
docker compose -f compose.yaml -f compose.prod.yaml build frontend
```

### Option B: Cloud provider secrets manager

Export each variable from your provider into the environment before running `docker compose`:

```bash
# AWS SSM Parameter Store example:
export APP_SECRET=$(aws ssm get-parameter --name /biblioteca/app-secret --with-decryption --query Parameter.Value --output text)
export JWT_PASSPHRASE=$(aws ssm get-parameter --name /biblioteca/jwt-passphrase --with-decryption --query Parameter.Value --output text)
# ... repeat for each variable
docker compose -f compose.yaml -f compose.prod.yaml up -d
```

### Option C: Docker Swarm secrets

For Docker Swarm deployments, replace environment variables with `secrets:` blocks. See the [Docker Swarm secrets documentation](https://docs.docker.com/engine/swarm/secrets/).

---

## Security Rules

1. **Never commit secrets.** `.env.prod`, `.env.local`, and `oracles-api/config/jwt/private.pem` are all git-ignored. Verify with `git status` before every push.
2. **Rotate secrets on breach.** If any secret leaks, regenerate it immediately. For JWT keys, regenerate the entire key pair.
3. **Use different secrets per environment.** Dev, staging, and production must never share `APP_SECRET`, `JWT_PASSPHRASE`, or database passwords.
4. **Restrict file permissions on the server:**
   ```bash
   chmod 600 .env.prod
   chmod 600 oracles-api/config/jwt/private.pem
   ```
5. **Do not log secrets.** Verify Symfony's `monolog.yaml` does not log request bodies on auth endpoints.

---

## Pre-deployment Checklist

- [ ] `APP_SECRET` is a freshly generated random value (not `change_me_before_production`)
- [ ] `JWT_PASSPHRASE` is a freshly generated random value (not `change_me`)
- [ ] JWT key pair was generated with the correct passphrase and `private.pem` is available in the container
- [ ] `MYSQL_PASSWORD` and `MYSQL_ROOT_PASSWORD` are strong, unique values
- [ ] `CORS_ALLOW_ORIGIN` matches the exact frontend origin (including `https://`)
- [ ] `VITE_API_BASE_URL` is set and frontend image built with it
- [ ] `connect-src` in [thelibrary/nginx.conf](../thelibrary/nginx.conf) updated to match `VITE_API_BASE_URL`
- [ ] `.env.prod` is NOT committed (`git status` shows it as untracked/ignored)
- [ ] HTTPS is configured (Traefik + Let's Encrypt or manual certificate)
