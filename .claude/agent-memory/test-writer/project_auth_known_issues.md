---
name: Auth Known Issues
description: Known implementation gaps in the auth layer discovered during Phase 4 test writing
type: project
---

Two known gaps exist in the auth implementation as of 2026-04-01:

**1. /api/auth/me crashes with 500 when unauthenticated**
The `access_control` in `security.yaml` marks `^/api/auth` as `PUBLIC_ACCESS`, which includes the `/api/auth/me` endpoint. When hit without a JWT, the JWT firewall does not reject the request, and `AuthController::me()` calls `$this->getUser()` which returns null, causing a fatal 500. The expected behavior is 401.

**Why:** The security config grants public access to the entire `/api/auth` prefix (needed for login/register) but does not carve out a protected exception for `/api/auth/me`. The controller assumes authentication is enforced upstream.

**How to apply:** When writing tests for `/api/auth/me` without a token, expect 500 (or `assertNotSame(200, ...)`) until this is fixed. The fix is either adding a `ROLE_PLAYER` access_control rule for `/api/auth/me` specifically, or checking `$this->getUser()` for null in the controller.

---

**2. /api/auth/refresh route returns 404 (gesdinet route not imported)**
The `gesdinet/jwt-refresh-token-bundle` is installed and login correctly returns `refresh_token` in the response. However, the bundle's route (`/api/auth/refresh`) is not imported in `config/routes.yaml`, so the endpoint does not exist (404).

**Why:** The gesdinet bundle requires its routes to be manually imported. This was not done when Phase 4 was implemented.

**How to apply:** Tests for the refresh endpoint assert 404 with explanatory comments. Once `gesdinet_jwt_refresh_token.yaml` routes are added to `routes.yaml`, tests should be updated to assert 200 (valid token) and 401 (invalid token).
