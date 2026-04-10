# Análisis: Producción, Performance y Seguridad

Fecha: 2026-04-06

---

## 1. Estado de Preparación para Producción

### Lo que ya está bien hecho
- `compose.prod.yaml` con multi-stage builds y sin puertos expuestos en DB/frontend
- `Dockerfile.prod` con OPcache, preload Symfony, sin Xdebug, sin dev tools
- `backend.prod.conf` con gzip, micro-cache, rate limiting (10 req/s, burst 20), headers HSTS
- `compose.prod.yaml` usa `:?` en variables de entorno (falla explícitamente si faltan)
- JWT: access token en memoria (no persiste), refresh token en localStorage
- CORS con origen exacto (no regex), configurable por env var
- Contraseñas hasheadas con bcrypt (argon2id vía `auto`)
- Frontend: multi-stage build Node→Nginx, rutas SPA, caché de assets 1 año + immutable
- `.gitignore` correctamente excluye `.env.prod`, `.env.local` y JWT private keys

### Gaps críticos antes de producción

| # | Problema | Impacto |
|---|----------|---------|
| 1 | Sin HTTPS/TLS | Contraseñas y tokens viajan en claro |
| 2 | `APP_SECRET=change_me_before_production` en `.env` | Sesiones admin comprometidas |
| 3 | `JWT_PASSPHRASE=change_me` en `.env` | Clave privada JWT vulnerable |
| 4 | Admin credentials por defecto (`admin@biblioteca.local / admin123`) | Acceso total al panel admin |
| 5 | `CSP connect-src` del frontend apunta a `http://localhost:8080` | Bloqueará peticiones en producción |
| 6 | Sin reverse proxy (Traefik/Caddy) | Sin SSL termination, sin routing automático |
| 7 | Sin backup de base de datos | Pérdida total de datos si falla el volumen |
| 8 | Sin health checks en PHP/Nginx | Compose no sabe si el backend está realmente listo |

---

## 2. Análisis de Performance

### Causa probable de lentitud en Windows

El problema casi seguro es **el polling de ficheros de Vite** en el dev server de Windows+Docker.

En Windows+Docker, el filesystem de WSL2 usa polling para detectar cambios, lo que consume CPU y hace que el dev server sea notablemente más lento que en Linux. En producción esto desaparece porque el frontend se sirve como build estático desde Nginx.

### Bottlenecks en el backend

**Consultas DB por petición de juego (estimado):**

| Endpoint | Queries | Motivo |
|----------|---------|--------|
| POST /chapter/roll | 5-7 | Lazy-load: attributes, books, journal_entries, roll_results por separado |
| POST /journal | 4-5 | SELECT game + collections para serializar |
| GET /game/{id} | 4-5 | Igual, sin inserts |

El método `serializeGameState()` en [GameController.php](../oracles-api/src/Controller/GameController.php) llama `.toArray()` en cada colección lazy por separado. Con JOIN fetch esto bajaría a 1-2 queries.

**En frontend, flujo de capítulo hace 5+ llamadas secuenciales:**
1. Discover book → 1 llamada
2. Save pre-journal → 1 llamada
3. Roll → 1 llamada
4. Save support title (si weak_hit) → 1 llamada
5. Save post-journal → 1 llamada

Cada llamada espera a la anterior. El RTT total (especialmente en Docker/Windows) se multiplica.

### Mejoras de performance priorizadas

**Alto impacto, bajo coste:**
1. Eager loading en `serializeGameState()` → reduce 4 queries a 1 con DQL JOIN
2. Gzip en frontend Nginx (actualmente falta) → JS de 85KB → ~25KB en red
3. Build estático del frontend en dev → elimina el polling de Windows

**Medio impacto:**
4. `Promise.all()` en llamadas paralelas del frontend (las que sean independientes entre sí)
5. Micro-cache TTL de 1s en backend.prod.conf es conservador para game state — correcto, no cambiar
6. Cache de oracle tables: ya se cachean en Pinia store por sesión ✓

**No urgente (solo si escala):**
7. Redis para doctrine result cache (actualmente filesystem)
8. HTTP/2 en Nginx (`listen 443 ssl http2`)
9. Connection pooling DB

---

## 3. Seguridad

### ¿Las contraseñas viajan de manera segura?

**En dev**: Las contraseñas viajan en HTTP plano. Esto es aceptable en local, pero no en producción.

**En prod (si se configura HTTPS)**: Sí, viajan cifradas sobre TLS. La implementación del backend es correcta: bcrypt hash, JWT stateless.

**JWT token storage:**
- Access token: memoria JS (correcto, no persiste ni es vulnerable a XSS)
- Refresh token: localStorage (riesgo XSS medio — si hay XSS, se puede robar el refresh token de 30 días)
- Alternativa más segura: refresh token en cookie HttpOnly + SameSite=Strict

### ¿Funciona HTTPS?

**No, actualmente no está configurado.** Lo que existe:
- Header `Strict-Transport-Security` en `backend.prod.conf` ✓ (correcto cuando haya HTTPS)
- Sin certificados, sin redirección HTTP→HTTPS, sin `listen 443 ssl`

Para activar HTTPS: reverse proxy Traefik + Let's Encrypt (automático) o Certbot manual.

### Vulnerabilidades identificadas

| Severidad | Vulnerabilidad | Detalle |
|-----------|---------------|---------|
| **Alta** | Sin HTTPS | Credenciales expuestas en red |
| **Alta** | Secrets de dev en `.env` sin cambiar | APP_SECRET y JWT_PASSPHRASE son placeholders |
| **Alta** | Admin credentials por defecto | Admin panel accesible con `admin123` |
| **Media** | Refresh token en localStorage | Vulnerable a XSS (30 días de sesión robable) |
| **Media** | Sin rate limiting específico en `/api/auth/login` | Brute force posible hasta 10 req/s |
| **Media** | CSP frontend apunta a `http://localhost:8080` | Bloqueará API en producción |
| **Baja** | HSTS sin `includeSubDomains` ni `preload` | Subdomains no protegidos |
| **Baja** | Panel admin sin rate limiting específico | Menos protección que el API |
| **Info** | JWT public key en repo | Correcto, es pública por diseño ✓ |
| **Info** | CSRF en API | No aplica (JWT stateless) ✓ |

### Lo que está bien en seguridad
- CORS con origen exacto, configurable por env ✓
- Bcrypt para contraseñas ✓
- JWT con private key encriptada ✓
- Roles y firewalls Symfony correctamente separados ✓
- Rate limiting a nivel Nginx ✓
- Email enumeration protection en registro ✓
- `.env.prod` en `.gitignore` ✓
- Validación de entrada (email format, password min 8) ✓

---

## 4. Estructura Docker: ¿Monorepo vs Despliegue Independiente?

### Recomendación

**Mantener el monorepo para desarrollo** (un `compose up` es cómodo).
**Separar el despliegue en producción**: el frontend como SPA estático en CDN y el backend en VPS/PaaS.

Esto es viable sin reestructurar código, solo cambiando cómo se hace el deploy:
- Frontend: `npm run build` → subir `dist/` a Cloudflare Pages / Netlify / GitHub Pages
- Backend: `docker compose -f compose.prod.yaml up` en el servidor

El único cambio de código necesario: **la URL del API en el frontend debe ser configurable** (actualmente hardcodeada a `http://localhost:8080` en [api/index.js](../thelibrary/src/api/index.js)).

---

## 5. Plataformas de Despliegue: Gratis o Bajo Coste

### Opción A: VPS único (recomendada para empezar)

| Plataforma | Precio | RAM | Notas |
|-----------|--------|-----|-------|
| **Hetzner Cloud** | ~4€/mes | 2 GB | Mejor relación calidad/precio en Europa |
| **DigitalOcean** | ~6$/mes | 1 GB | Buena DX, muchos tutoriales |
| **OVH VPS Starter** | ~3€/mes | 2 GB | Datacenter en España/Francia |

Setup: Docker + `compose.prod.yaml` + Traefik (HTTPS automático con Let's Encrypt).

### Opción B: Frontend gratis + Backend PaaS (recomendada por coste)

**Frontend (estático, gratis):**
- **Cloudflare Pages** — gratis ilimitado, CDN global, deploy automático desde git
- **Netlify** — gratis (100GB bandwidth/mes)
- **Vercel** — gratis, buena DX

**Backend Symfony (PaaS):**

| Plataforma | Free tier | Paid | Notas |
|-----------|-----------|------|-------|
| **Railway** | ~$5 crédito/mes | ~$5-10/mes | Soporta Docker, MySQL incluido, muy fácil |
| **Fly.io** | 3 VMs gratis | ~$2-5/mes | Excelente para Docker |
| **Render** | Duerme tras 15min | ~$7/mes | Free tier inaceptable para juego |

### Conclusión

Para producción real: **VPS Hetzner (~4€/mes)** + Traefik + `compose.prod.yaml` es la opción más completa y económica.

Para pruebas o demo: **Railway** (~5-10$/mes) tiene la mejor DX para Symfony+MySQL con Docker.

---

## 6. Checklist Pre-Despliegue

### Imprescindibles (bloquean producción)
- [ ] Generar `APP_SECRET` real: `php -r "echo bin2hex(random_bytes(16));"`
- [ ] Generar nuevo par de claves JWT: `openssl genrsa -out private.pem -aes256 4096`
- [ ] Cambiar `JWT_PASSPHRASE` por algo seguro
- [ ] Cambiar contraseña admin (fixture o panel EasyAdmin)
- [ ] Configurar `CORS_ALLOW_ORIGIN` con dominio real
- [ ] Actualizar CSP del frontend ([thelibrary/nginx.conf](../thelibrary/nginx.conf)) para dominio real
- [ ] Hacer URL de la API configurable en el frontend (env var en build time con Vite)
- [ ] Configurar HTTPS (Traefik + Let's Encrypt o certificado manual)

### Recomendadas antes de abrir al público
- [ ] Rate limiting más estricto en `/api/auth/login` (e.g. 5 req/min vía Symfony RateLimiter)
- [ ] Eager loading en `serializeGameState()` ([GameController.php](../oracles-api/src/Controller/GameController.php))
- [ ] Añadir gzip en [thelibrary/nginx.conf](../thelibrary/nginx.conf)
- [ ] Configurar backup automático de MySQL
- [ ] Health checks en los servicios PHP y Nginx en compose.prod.yaml

### Opcionales (mejoras post-lanzamiento)
- [ ] Refresh token en HttpOnly cookie (mejor protección XSS)
- [ ] Redis para doctrine cache
- [ ] HTTP/2 en Nginx
- [ ] Monitoring: UptimeRobot (gratis) + Sentry free tier

---

## Archivos Clave

| Archivo | Nota |
|---------|------|
| [compose.prod.yaml](../compose.prod.yaml) | Definición de producción |
| [docker/nginx/backend.prod.conf](../docker/nginx/backend.prod.conf) | Nginx backend prod |
| [thelibrary/nginx.conf](../thelibrary/nginx.conf) | Nginx frontend (falta gzip) |
| [thelibrary/src/api/index.js](../thelibrary/src/api/index.js) | URL hardcodeada a localhost |
| [oracles-api/src/Controller/GameController.php](../oracles-api/src/Controller/GameController.php) | serializeGameState() con lazy loading |
| [oracles-api/config/packages/security.yaml](../oracles-api/config/packages/security.yaml) | Firewalls y roles |
| [.env](./../.env) | Secrets de dev (nunca usar en producción sin cambiar) |
| [.env.prod.example](./../.env.prod.example) | Template para producción |
