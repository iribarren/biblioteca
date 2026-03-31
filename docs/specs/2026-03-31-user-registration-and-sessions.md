# User Registration, Authentication, and Game Session Persistence

**Date:** 2026-03-31
**Status:** Draft — awaiting approval
**Affects:** `oracles-api/` (backend), `thelibrary/` (frontend)

---

## Overview

Currently, The Library operates as a fully anonymous single-player experience: anyone can create a game session without identifying themselves, and the API endpoints under `/api/*` require no authentication. This feature introduces **player accounts** so that registered users can persist their game progress across devices and review their history of completed game sessions.

The feature adds:

1. A public registration and login flow accessible from the frontend home screen.
2. A new Symfony security role (`ROLE_PLAYER`) that grants API access but **not** admin panel access.
3. JWT-based stateless authentication for API requests.
4. An ownership relationship between `User` and `GameSession`, enabling automatic progress saving and session history retrieval.
5. Preservation of the existing anonymous (guest) play mode -- registration is encouraged but not mandatory.

---

## Goals

- **Player retention:** Let returning players pick up where they left off and review past game sessions.
- **Data ownership:** Each registered player owns their game sessions; no player can access another's data.
- **Security boundary:** Players must never reach the EasyAdmin panel (`/admin`). The `ROLE_PLAYER` role is explicitly excluded from admin access.
- **Backward compatibility:** Anonymous gameplay remains fully functional. Existing API consumers (guest users) are unaffected.

---

## User Stories

### US-1: Player Registration

> As a **new player**, I want to **create an account with my email and a password**, so that **my game progress is saved and I can return later**.

**Acceptance Criteria:**

- [ ] A registration form is accessible from the frontend home screen.
- [ ] The form collects: email and password (with confirmation).
- [ ] The backend validates: email format, email uniqueness, password minimum length (8 characters).
- [ ] On success, the user is created with role `ROLE_PLAYER` and is automatically logged in (JWT returned).
- [ ] On validation failure, the frontend displays specific, user-facing error messages.
- [ ] The registration endpoint is rate-limited to prevent abuse.

### US-2: Player Login

> As a **returning player**, I want to **log in from the home screen**, so that **I can access my saved game sessions**.

**Acceptance Criteria:**

- [ ] A login form is accessible from the frontend home screen alongside the registration option.
- [ ] The form collects: email and password.
- [ ] On success, a JWT is returned and stored client-side (memory + localStorage for session recovery).
- [ ] On invalid credentials, a generic error message is shown (no email enumeration).
- [ ] After login, the player is redirected to their session list or can start a new game.

### US-3: Player Logout

> As a **logged-in player**, I want to **log out**, so that **I can end my session or switch accounts**.

**Acceptance Criteria:**

- [ ] A logout action is visible when the player is authenticated.
- [ ] Logout clears the JWT from client-side storage.
- [ ] After logout, the player is returned to the home screen.

### US-4: Game Session Ownership

> As a **registered player**, I want **my game sessions to be linked to my account**, so that **only I can access them**.

**Acceptance Criteria:**

- [ ] When an authenticated player creates a new game session, the session is associated with their user account.
- [ ] Anonymous (guest) users can still create game sessions; these sessions have no owner (`user = null`).
- [ ] The `GET /api/game/{id}` endpoint returns a 403 if the session belongs to a different user.
- [ ] The `GET /api/game/{id}` endpoint allows access if the session has no owner (guest session) or belongs to the requesting user.

### US-5: Automatic Progress Saving on Phase Completion

> As a **registered player**, I want **my game progress to be saved automatically every time I complete a phase**, so that **I can resume later from where I left off**.

**Acceptance Criteria:**

- [ ] Phase transitions (already handled by `GameEngine`) continue to persist the `GameSession` entity to the database -- this is existing behavior.
- [ ] For authenticated players, the frontend sends the JWT with every API request so the backend can associate progress with the user.
- [ ] If the player closes the browser and returns later, they can resume any in-progress game session from the session list.
- [ ] Guest users retain the current behavior: localStorage-based session recovery only, no cross-device persistence.

### US-6: Game Session History

> As a **registered player**, I want to **view a list of all my past and current game sessions**, so that **I can resume an in-progress game or review a completed one**.

**Acceptance Criteria:**

- [ ] A new "My Sessions" screen is accessible from the frontend navigation when logged in.
- [ ] The screen lists sessions belonging to the authenticated user, showing: character name, current phase, genre, epoch, created date, last updated date.
- [ ] Sessions are sorted by last updated date (most recent first).
- [ ] The player can select a session to resume or review it.
- [ ] Completed sessions are visually distinguished from in-progress ones.

### US-7: Player Role Security Boundary

> As an **administrator**, I want **players to be unable to access the admin panel**, so that **game management remains restricted to authorized staff**.

**Acceptance Criteria:**

- [ ] Users with only `ROLE_PLAYER` (and the default `ROLE_USER`) cannot access any `/admin` routes.
- [ ] The existing `security.yaml` access control for `/admin` requires `ROLE_ADMIN`, which `ROLE_PLAYER` does not satisfy.
- [ ] The Symfony role hierarchy does NOT grant `ROLE_PLAYER` any admin privileges.
- [ ] If a player navigates to `/admin`, they receive a 403 Forbidden response.

---

## Technical Approach

### Authentication: JWT (Stateless)

Use the `lexik/jwt-authentication-bundle` for Symfony. This is the standard approach for SPAs consuming a Symfony API.

- **Token issuance:** On login/registration, the backend returns an access token (short-lived, e.g., 1 hour) and a refresh token (longer-lived, e.g., 30 days).
- **Token storage (frontend):** The access token is stored in memory (JS variable) for active use, and the refresh token in `localStorage` for session recovery across page reloads.
- **Token transmission:** The frontend sends the access token in the `Authorization: Bearer <token>` header on every API request.
- **Token refresh:** When the access token expires, the frontend uses the refresh token to obtain a new access token without requiring re-login.

### Symfony Security Configuration Changes

The `security.yaml` must be updated:

1. **Add an `api` firewall** (before `main`, after `admin`) with the JWT authenticator:
   ```yaml
   api:
       pattern: ^/api
       stateless: true
       provider: app_user_provider
       jwt: ~
   ```
2. **Access control** remains unchanged for `/admin` routes. API routes stay public (authentication is optional, not required), but the JWT authenticator extracts the user identity when a token is present.
3. **New role:** `ROLE_PLAYER` -- assigned at registration. No entry in role hierarchy needed; it is a leaf role.

### New API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/register` | Public | Create player account |
| `POST` | `/api/auth/login` | Public | Authenticate and receive JWT |
| `POST` | `/api/auth/refresh` | Public (refresh token) | Refresh expired access token |
| `GET` | `/api/auth/me` | Bearer | Return current user profile |
| `GET` | `/api/player/sessions` | Bearer | List authenticated player's game sessions |

### Entity Changes

**`User` entity** -- add:
- `displayName` (`string`, nullable) -- optional player display name.
- `gameSessions` -- `OneToMany` relationship to `GameSession`.

**`GameSession` entity** -- add:
- `owner` -- `ManyToOne` relationship to `User`, nullable (guest sessions have no owner).

A Doctrine migration will be generated for these schema changes.

### Backend Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `AuthController` | `src/Controller/AuthController.php` | Registration, login, refresh, profile endpoints |
| `PlayerController` | `src/Controller/PlayerController.php` | Player-specific endpoints (session list) |
| `RegistrationRequest` DTO | `src/Dto/RegistrationRequest.php` | Validated registration payload |
| Voter or listener | `src/Security/GameSessionVoter.php` | Enforce ownership on game session access |

### Frontend Changes

| File | Changes |
|------|---------|
| `api.js` | Add auth endpoints, inject `Authorization` header when token is available |
| `state.js` | Track authentication state (token, user info) alongside game state |
| `app.js` | Add login/register screens, "My Sessions" screen, conditional UI based on auth state |
| `components.css` | Styles for auth forms and session history list |

The home screen will be updated to show:
- Login and Register options prominently.
- "Play as Guest" as an alternative.
- If authenticated: a "My Sessions" link in the navigation.

### Password Requirements

- Minimum 8 characters.
- Hashed using Symfony's `auto` hasher (currently bcrypt/argon2, per `security.yaml`).

---

## Out of Scope

- **Social login** (OAuth providers like Google, GitHub) -- email/password only for now.
- **Email verification** -- accounts are active immediately upon registration.
- **Password reset / forgot password flow** -- not included in this iteration.
- **Player profile editing** -- no UI for changing email, password, or display name after registration.
- **Linking guest sessions to a new account** -- if a guest registers mid-game, their current anonymous session is NOT retroactively claimed. This may be addressed in a future iteration.
- **Admin management of players** -- no EasyAdmin CRUD for player accounts in this iteration.
- **Multi-device session sync in real time** -- sessions are persisted server-side but there is no push/websocket mechanism.
- **Rate limiting on auth endpoints beyond basic protection** -- a simple rate limiter is applied, but advanced brute-force protection (account lockout, CAPTCHA) is deferred.

---

## Dependencies

- **`lexik/jwt-authentication-bundle`** must be installed and configured in `oracles-api/`. This requires generating RSA or EC keys for JWT signing.
- **`gesdinet/jwt-refresh-token-bundle`** (or equivalent) for refresh token support.
- **OpenSSL** available in the PHP container for key generation.
- **Doctrine migration** to add the `owner_id` column to `game_sessions` and (optionally) the `display_name` column to `users`.
- The existing `User` entity already implements `UserInterface` and `PasswordAuthenticatedUserInterface`, so no structural changes are needed for Symfony security integration.
- The existing `app_user_provider` (entity provider on `User.email`) is reused for both admin and player authentication.

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| JWT secret key leakage | Low | Critical | Store keys outside web root, use env vars for paths, never commit keys to Git |
| Token theft via XSS | Medium | High | Store access token in memory (not localStorage); store only the refresh token in localStorage; apply `HttpOnly` cookie for refresh if feasible in a future iteration |
| Breaking existing anonymous gameplay | Medium | High | All API endpoints remain accessible without auth. The JWT authenticator must be configured to allow anonymous access (no `required` flag). Thorough testing of guest flows. |
| Email enumeration via registration endpoint | Low | Medium | Return a generic success message even if the email is already taken (or use consistent response timing) |
| Migration on existing production data | Low | Medium | The `owner_id` column is nullable, so existing `game_sessions` rows remain valid with `owner = NULL`. No data migration needed. |
| Frontend complexity growth in `app.js` | High | Medium | Consider extracting auth-related screens into a separate module (`auth.js`) to keep `app.js` manageable. The file is already ~2000 lines. |

---

## Suggested Implementation Phases

### Phase 1: Backend Auth Infrastructure
- Install and configure `lexik/jwt-authentication-bundle`.
- Add `ROLE_PLAYER` to the security model.
- Create `AuthController` with register and login endpoints.
- Add the `owner` relationship to `GameSession`, generate migration.
- Write unit/integration tests for auth endpoints.

### Phase 2: Session Ownership and Access Control
- Modify `GameController` to associate sessions with the authenticated user when present.
- Add `GameSessionVoter` to enforce ownership.
- Create `PlayerController` with session list endpoint.
- Write tests for ownership enforcement.

### Phase 3: Frontend Auth Flow
- Add login and registration screens to `app.js` (or a new `auth.js` module).
- Update `api.js` to manage JWT storage and header injection.
- Update `state.js` to track auth state.
- Add "My Sessions" screen.
- Style new components.

### Phase 4: Integration Testing and Polish
- End-to-end testing of register -> login -> play -> resume flow.
- Verify guest flow remains unbroken.
- Verify admin panel is inaccessible to players.
- Token refresh flow testing.
