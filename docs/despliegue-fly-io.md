# Despliegue en producción — Fly.io + Cloudflare Pages

## Arquitectura en producción

```
Usuario
  │
  ├─▶ https://<frontend>.pages.dev  (o dominio custom)
  │     Cloudflare Pages
  │     Build: npm run build  →  dist/
  │     VITE_API_BASE_URL baked en el bundle en tiempo de build
  │     Cabeceras de seguridad via public/_headers
  │
  └─▶ https://biblioteca-api.fly.dev  (o dominio custom)
        Fly.io — app: biblioteca-api
        Contenedor único: Nginx (puerto 80) + PHP-FPM (localhost:9000)
        Gestionados por supervisord
        Fly Proxy termina TLS (HTTPS automático, Let's Encrypt)
        │
        └─▶ biblioteca-db.internal:3306  (red privada Fly, nunca expuesto)
              Fly.io — app: biblioteca-db
              MySQL 8.0 con volumen persistente de 1 GB
```

### Cómo se comunican frontend y backend en producción

1. **Build-time**: Vite sustituye `import.meta.env.VITE_API_BASE_URL` por la URL real del backend (`https://biblioteca-api.fly.dev`) en el bundle JS. El frontend no necesita ninguna variable de entorno en runtime.

2. **Runtime — petición normal**:
   - El navegador carga el SPA desde Cloudflare CDN (estático, sin servidor).
   - El JS llama a `https://biblioteca-api.fly.dev/api/...` con `Authorization: Bearer <token>` para endpoints autenticados, o sin cabecera para endpoints públicos.
   - Fly Proxy recibe la petición HTTPS, termina TLS y la reenvía al contenedor en HTTP interno.
   - Nginx valida la cabecera de seguridad, aplica rate-limit, y hace proxy a PHP-FPM vía FastCGI (localhost:9000).
   - PHP-FPM ejecuta Symfony, que consulta MySQL en la red privada de Fly y devuelve JSON.

3. **CORS**: el navegador envía `Origin: https://<frontend>.pages.dev`. Symfony lo valida contra `CORS_ALLOW_ORIGIN`. Si coincide, devuelve `Access-Control-Allow-Origin`. Si no coincide, el navegador bloquea la respuesta.

4. **Auth flow (JWT)**:
   - Login: `POST /api/auth/login` → devuelve `{token, refresh_token}`.
   - El frontend guarda `token` en memoria (variable JS) y `refresh_token` en `localStorage`.
   - Cada petición autenticada lleva `Authorization: Bearer <token>`.
   - Si el backend devuelve 401, el frontend intenta `POST /api/auth/refresh` con el `refresh_token`.
   - Si el refresh funciona, actualiza el token en memoria y reintenta la petición original.
   - Si el refresh falla (token expirado), limpia el estado de auth y redirige al inicio.

---

## Prerrequisitos

```bash
# 1. Instalar flyctl (Windows)
winget install flyctl

# 2. Autenticarse en Fly.io
fly auth login

# 3. Tener una cuenta Cloudflare (gratuita) con el repo conectado
```

---

## Paso 1 — Generar secretos

Ejecutar en local (no guardar los valores en ningún fichero del repo):

```bash
# APP_SECRET de Symfony (32 bytes en hex)
php -r "echo bin2hex(random_bytes(16));"

# JWT_PASSPHRASE (elige una frase fuerte)
# Ejemplo: openssl rand -base64 32

# Generar keypair JWT
cd oracles-api/
openssl genpkey -algorithm RSA -out config/jwt/private.pem \
  -pkeyopt rsa_keygen_bits:4096 \
  -aes256 -pass pass:"<JWT_PASSPHRASE>"

openssl rsa -pubout \
  -in  config/jwt/private.pem \
  -out config/jwt/public.pem \
  -passin pass:"<JWT_PASSPHRASE>"

# Codificar las claves en base64 (una línea, sin saltos)
# Linux/macOS:
base64 -w0 config/jwt/private.pem
base64 -w0 config/jwt/public.pem

# Windows (PowerShell):
[Convert]::ToBase64String([IO.File]::ReadAllBytes("config\jwt\private.pem"))
[Convert]::ToBase64String([IO.File]::ReadAllBytes("config\jwt\public.pem"))

# Guardar los valores. Los usarás en el Paso 3.
# NO commitear los ficheros .pem
```

---

## Paso 2 — Desplegar MySQL

```bash
# 2.1 Crear el app de base de datos
fly apps create biblioteca-db

# 2.2 Crear el volumen persistente (1 GB, región Madrid)
fly volumes create mysql_data --size 1 --region mad -a biblioteca-db

# 2.3 Setear los secrets
fly secrets set \
  MYSQL_ROOT_PASSWORD="<contraseña-root-fuerte>" \
  MYSQL_PASSWORD="<contraseña-usuario-fuerte>" \
  -a biblioteca-db

# 2.4 Desplegar
fly deploy --config docker/fly/mysql.toml -a biblioteca-db

# 2.5 Verificar que arranca
fly logs -a biblioteca-db
# Debe aparecer: "ready for connections"
```

---

## Paso 3 — Desplegar el backend

```bash
cd oracles-api/

# 3.1 Crear el app
fly apps create biblioteca-api

# 3.2 Setear todos los secrets de una vez
fly secrets set \
  APP_SECRET="<valor-del-paso-1>" \
  JWT_PASSPHRASE="<valor-del-paso-1>" \
  JWT_PRIVATE_KEY_BASE64="<base64-private-pem-del-paso-1>" \
  JWT_PUBLIC_KEY_BASE64="<base64-public-pem-del-paso-1>" \
  DATABASE_URL="mysql://biblioteca_user:<MYSQL_PASSWORD>@biblioteca-db.internal:3306/biblioteca?serverVersion=8.0&charset=utf8mb4" \
  CORS_ALLOW_ORIGIN="https://<tu-frontend>.pages.dev" \
  -a biblioteca-api

# 3.3 Desplegar (construye la imagen con Dockerfile.fly)
fly deploy -a biblioteca-api

# 3.4 Verificar health check
curl https://biblioteca-api.fly.dev/api/health
# → {"status":"healthy","database":"ok",...}
```

---

## Paso 4 — Migraciones y datos iniciales

```bash
# 4.1 Ejecutar migraciones
fly ssh console -a biblioteca-api -C \
  "php bin/console doctrine:migrations:migrate --no-interaction"

# 4.2 Cargar fixtures (oracle tables + usuario admin inicial)
fly ssh console -a biblioteca-api -C \
  "php bin/console doctrine:fixtures:load --no-interaction"

# 4.3 Cambiar la contraseña del admin (OBLIGATORIO)
# Opción A — vía consola Symfony:
fly ssh console -a biblioteca-api -C \
  "php bin/console app:change-admin-password admin@biblioteca.local"

# Opción B — acceder al admin panel en producción:
# https://biblioteca-api.fly.dev/admin
# Cambiar contraseña desde la interfaz de usuario admin.
```

---

## Paso 5 — Desplegar el frontend (Cloudflare Pages)

### Primera vez (configuración en el dashboard)

1. Ir a **Cloudflare Dashboard → Workers & Pages → Create application → Pages**.
2. Conectar el repositorio `iribarren/thelibrary` de GitHub.
3. Configurar el build:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (raíz del repo)
4. En **Environment variables** añadir:
   - `VITE_API_BASE_URL` = `https://biblioteca-api.fly.dev`
5. Hacer clic en **Save and Deploy**.

Cloudflare Pages clonará el repo, ejecutará `npm run build` con la variable de entorno configurada, y servirá el contenido de `dist/` desde su CDN global.

### Actualizaciones posteriores del frontend

Cada `git push` a la rama `master` de `thelibrary` lanza un nuevo build automáticamente en Cloudflare Pages. No hay acción manual.

### Dominio custom (opcional)

En **Cloudflare Pages → tu proyecto → Custom domains** → añadir dominio.
Después actualizar `CORS_ALLOW_ORIGIN` en los secrets de Fly.io:

```bash
fly secrets set CORS_ALLOW_ORIGIN="https://tudominio.com" -a biblioteca-api
```

Y actualizar `connect-src` en `thelibrary/public/_headers` (fichero de cabeceras de seguridad de Cloudflare Pages, en la raíz del repo de thelibrary):

```
connect-src 'self' https://api.tudominio.com;
```

---

## Paso 6 — Checklist de verificación post-deploy

```bash
# ✅ Backend responde y DB conecta
curl https://biblioteca-api.fly.dev/api/health
# → {"status":"healthy","database":"ok",...}

# ✅ HTTPS forzado (no HTTP)
curl -I http://biblioteca-api.fly.dev/api/health
# → 301 redirect a HTTPS

# ✅ CORS correcto (sustituir con tu dominio de Cloudflare Pages)
curl -sI \
  -H "Origin: https://<frontend>.pages.dev" \
  https://biblioteca-api.fly.dev/api/oracle/tables \
  | grep -i "access-control"
# → access-control-allow-origin: https://<frontend>.pages.dev

# ✅ Registro + login funcionan
curl -s -X POST https://biblioteca-api.fly.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test1234!","passwordConfirmation":"Test1234!"}'
# → {"token":"...","refresh_token":"...","user":{...}}

# ✅ Frontend carga y conecta
# Abrir https://<frontend>.pages.dev en el navegador.
# Crear una partida → debe llamar a biblioteca-api.fly.dev (ver Network tab).

# ✅ Admin panel accesible
curl -sI https://biblioteca-api.fly.dev/admin
# → 302 redirect a /admin/login (no 500 ni 404)
```

---

## Actualizaciones del backend

```bash
cd oracles-api/

# Rebuild + redeploy (Fly.io hace rolling deploy sin downtime)
fly deploy -a biblioteca-api

# Si hay migraciones nuevas:
fly ssh console -a biblioteca-api -C \
  "php bin/console doctrine:migrations:migrate --no-interaction"
```

---

## Rotación de secrets

### Rotar APP_SECRET

```bash
# Generar nuevo valor
NEW_SECRET=$(php -r "echo bin2hex(random_bytes(16));")
fly secrets set APP_SECRET="$NEW_SECRET" -a biblioteca-api
# Fly reinicia el contenedor automáticamente.
# Las sesiones admin existentes quedarán invalidadas (vuelven a login).
```

### Rotar JWT keypair (sin downtime)

```bash
# 1. Generar nuevo keypair
openssl genpkey -algorithm RSA -out new_private.pem \
  -pkeyopt rsa_keygen_bits:4096 \
  -aes256 -pass pass:"<NUEVA_PASSPHRASE>"
openssl rsa -pubout -in new_private.pem -out new_public.pem \
  -passin pass:"<NUEVA_PASSPHRASE>"

# 2. Actualizar secrets en Fly (Fly reinicia el contenedor al recibir nuevos secrets)
fly secrets set \
  JWT_PASSPHRASE="<NUEVA_PASSPHRASE>" \
  JWT_PRIVATE_KEY_BASE64="$(base64 -w0 new_private.pem)" \
  JWT_PUBLIC_KEY_BASE64="$(base64 -w0 new_public.pem)" \
  -a biblioteca-api

# Efecto: todos los tokens JWT existentes quedan invalidados.
# Los usuarios deberán hacer login de nuevo.
```

### Rotar contraseña de MySQL

```bash
# 1. Actualizar en MySQL
fly ssh console -a biblioteca-db -C \
  "mysql -u root -p'<ROOT_PASS>' -e \"ALTER USER 'biblioteca_user'@'%' IDENTIFIED BY '<NUEVA_PASS>';\""

# 2. Actualizar DATABASE_URL en el backend
fly secrets set \
  DATABASE_URL="mysql://biblioteca_user:<NUEVA_PASS>@biblioteca-db.internal:3306/biblioteca?serverVersion=8.0&charset=utf8mb4" \
  -a biblioteca-api
```

---

## Ficheros de configuración creados

| Fichero | Descripción |
|---------|-------------|
| `oracles-api/fly.toml` | Config principal del app backend en Fly.io |
| `oracles-api/Dockerfile.fly` | Imagen combinada PHP-FPM + Nginx + supervisord |
| `oracles-api/fly/entrypoint.sh` | Inyecta claves JWT desde secrets al arrancar |
| `oracles-api/fly/supervisord.conf` | Gestiona los procesos nginx y php-fpm |
| `oracles-api/fly/nginx.fly.conf` | Config Nginx para Fly (PHP-FPM en localhost) |
| `docker/fly/mysql.toml` | Config del app MySQL en Fly.io |
| `thelibrary/public/_headers` | Cabeceras de seguridad para Cloudflare Pages (CSP, HSTS, etc.) — actualizar `connect-src` si cambia la URL del backend |
