# Android Native Client — La Biblioteca

**Spec Date:** 2026-04-11
**Status:** Draft — Pending Approval
**Author:** project-manager-docs
**Target Sub-project:** `android/` (new directory, own git repo)

---

## Overview

La Biblioteca is a solo TTRPG journal game currently available as a Vue 3 web SPA backed by a Symfony 7.2 REST API. This specification defines a **native Android client** that delivers the complete game experience on mobile devices, with feature parity to the web frontend plus mobile-first enhancements: **voice-driven journaling** via Android's native speech recognizer and **native Compose animations** for book reveals and dice rolls.

The Android app is a thin, stateless client. All game logic, persistence, and oracle resolution continue to live in the backend API — the client's responsibility is presentation, input, authentication, and the 10-phase game flow orchestration.

This is an **MVP build**: single-player flow, online-only, no Play Store deployment, Android only.

---

## Goals

1. Offer a first-class mobile experience for solo players who prefer journaling on a phone or tablet rather than a browser.
2. Remove friction from the journal-writing loop by letting players dictate entries via voice instead of typing.
3. Preserve the atmospheric, library-themed identity of the game on native surfaces (Material 3 dark theme with custom palette and typography).
4. Reuse the existing backend API unchanged — no backend modifications should be required to ship the Android client.
5. Establish a clean, testable architecture (MVVM + Repository) that a solo developer can extend after MVP (e.g., iOS later via Kotlin Multiplatform, or offline support).

### Success Metrics (MVP)
- A player can complete a full game (prologue through completed) end-to-end on an Android device.
- Journal entries can be created by voice or keyboard, with the voice-to-text output editable before submission.
- JWT tokens are stored securely (EncryptedSharedPreferences + Android Keystore) and auto-refresh on 401 without user disruption.
- Book reveal and dice roll animations run smoothly at 60 FPS on mid-range devices (target: Pixel 5 / Samsung A52 class).

---

## User Stories

### Epic 1 — Authentication

**US-1.1 — Register a new account**
> As a new player, I want to register an account from the Android app, so that I can start playing without using a browser.

**Acceptance Criteria:**
- Registration screen collects email, username, and password with client-side validation (email format, password length >= 8).
- On success, the app calls `POST /api/auth/register`, stores the returned JWT and refresh token in EncryptedSharedPreferences, and navigates to the home/game list screen.
- On failure (e.g., duplicate email), the app displays a clear error message returned by the API.
- Password input is masked by default with a visibility toggle.

**US-1.2 — Log in with existing credentials**
> As a returning player, I want to log in with my email and password, so that I can access my ongoing or past games.

**Acceptance Criteria:**
- Login screen accepts email and password.
- On success, the app calls `POST /api/auth/login`, stores tokens, and navigates to home.
- On failure, a non-blocking snackbar or inline error appears.
- A "Register" link routes to the registration screen.

**US-1.3 — Stay logged in across sessions**
> As a player, I want the app to remember me after closing it, so that I don't have to log in every time.

**Acceptance Criteria:**
- On app launch, if a valid JWT exists in encrypted storage, the app calls `GET /api/auth/me` to verify and skips the login screen.
- If the JWT is expired but a refresh token exists, the app transparently calls `POST /api/auth/refresh` and continues.
- If both tokens are invalid, the user is routed back to the login screen.

**US-1.4 — Auto-refresh expired tokens**
> As a player, I want my session to refresh automatically so that I am not interrupted mid-game.

**Acceptance Criteria:**
- An OkHttp `Authenticator` (or equivalent interceptor) catches 401 responses, calls `POST /api/auth/refresh`, updates stored tokens, and retries the original request.
- If refresh fails, the user is logged out and routed to the login screen with an explanatory message.
- Token refresh is thread-safe (only one refresh in flight at a time).

**US-1.5 — Log out**
> As a player, I want to log out explicitly, so that my tokens are cleared from the device.

**Acceptance Criteria:**
- A logout action is available from a profile/settings menu.
- Confirming logout clears both tokens from EncryptedSharedPreferences and navigates to the login screen.

---

### Epic 2 — Game Lifecycle

**US-2.1 — Start a new game**
> As a player, I want to start a new GameSession from the home screen, so that I can begin a fresh story.

**Acceptance Criteria:**
- Home screen displays a "New Game" button.
- Tapping it calls `POST /api/game`, navigates into the game at the `prologue` phase.
- A loading indicator is shown while the request is in flight.

**US-2.2 — Resume an existing game**
> As a player, I want to resume an in-progress game, so that I can continue where I left off.

**Acceptance Criteria:**
- Home screen lists the player's existing GameSessions (fetched via the game endpoint available to `/api/auth/me` or a list endpoint if one exists — see Dependencies).
- Tapping a game calls `GET /api/game/{id}` and routes to the screen corresponding to its current phase.
- Phase routing maps 1:1 to the 10-phase state machine: `prologue`, `chapter_1`, `chapter_2`, `chapter_3`, `epilogue_action_1`, `epilogue_action_2`, `epilogue_action_3`, `epilogue_final`, `completed`.

**US-2.3 — View completed games**
> As a player, I want to review a finished game, so that I can re-read my journal entries.

**Acceptance Criteria:**
- Completed games are shown in the game list with a visual marker (e.g., "Completed" badge).
- Tapping a completed game opens a read-only journal/summary screen.

---

### Epic 3 — Prologue Phase

**US-3.1 — Play through the prologue**
> As a player, I want to complete the prologue so that my character is established and I can begin chapter 1.

**Acceptance Criteria:**
- The prologue screen presents the prompts and inputs required by the backend's prologue endpoint.
- Submitting the prologue calls `POST /api/game/{id}/prologue`.
- On success, the app advances to `chapter_1`.

---

### Epic 4 — Chapter Phases (1, 2, 3)

**US-4.1 — Reveal a book for the chapter**
> As a player, I want to reveal a book at the start of each chapter, so that I receive my oracle input for the chapter.

**Acceptance Criteria:**
- The chapter screen presents a "Reveal Book" action.
- Tapping it calls `POST /api/game/{id}/chapter/book`.
- While the API responds, a **native Compose 3D card-flip animation** plays for approximately 4 seconds, ending with the book details visible.
- The animation is skippable (long-press or tap-to-skip) for returning players.

**US-4.2 — Roll dice for the chapter**
> As a player, I want to roll dice after receiving my book, so that I can determine the chapter's outcome.

**Acceptance Criteria:**
- The chapter screen presents a "Roll" action after the book has been revealed.
- Tapping it calls `POST /api/game/{id}/chapter/roll`.
- While the API responds, a **native Canvas-based dice-roll animation with a slot-machine easing effect** plays for approximately 3 seconds, ending with the rolled values displayed.
- Rolled values and their interpretation (Body/Mind/Social outcomes) are rendered after the animation finishes.

**US-4.3 — Choose a support title (if required)**
> As a player, I want to choose a support title when the chapter offers one, so that my story gains additional narrative beats.

**Acceptance Criteria:**
- If the backend indicates a support title is available, the app presents the options and calls `POST /api/game/{id}/chapter/support-title` on selection.
- The chosen title is reflected in the UI.

**US-4.4 — Write a journal entry for the chapter**
> As a player, I want to write or dictate a journal entry for the chapter, so that I capture what happened in my story.

**Acceptance Criteria:**
- See Epic 6 for journal input details.
- Journal submission calls `POST /api/game/{id}/journal` with the chapter phase context.

**US-4.5 — Advance to the next chapter**
> As a player, I want to advance to the next chapter once I've finished journaling, so that the story progresses.

**Acceptance Criteria:**
- An "Advance" action is visible once all required chapter steps are complete.
- Tapping it calls `POST /api/game/{id}/chapter/advance`.
- On success, the app routes to the next phase returned by the API.

---

### Epic 5 — Epilogue Phases

**US-5.1 — Reveal the epilogue book**
> As a player, I want to reveal the epilogue book, so that my closing acts have context.

**Acceptance Criteria:**
- At `epilogue_action_1`, the app presents a "Reveal Book" action tied to `POST /api/game/{id}/epilogue/book`.
- The same book reveal animation from Epic 4 plays.

**US-5.2 — Perform three epilogue actions**
> As a player, I want to perform three epilogue actions so that I bring my character's story to a close.

**Acceptance Criteria:**
- For each of `epilogue_action_1`, `epilogue_action_2`, `epilogue_action_3`, the app presents the relevant inputs and submits them via `POST /api/game/{id}/epilogue/action`.
- Journal entries can be attached to each action.
- After action 3, the app routes to `epilogue_final`.

**US-5.3 — Complete the final epilogue**
> As a player, I want to submit a final epilogue, so that the game is marked complete.

**Acceptance Criteria:**
- The final epilogue screen gathers the closing narrative and submits via `POST /api/game/{id}/epilogue/final`.
- On success, the game transitions to `completed` and the app routes to a completion screen summarizing the run.

---

### Epic 6 — Journal Input (Keyboard + Voice)

**US-6.1 — Write a journal entry via keyboard**
> As a player, I want to type my journal entry, so that I can write at my own pace.

**Acceptance Criteria:**
- A multi-line text field is always available on journal screens.
- Character/word count is optionally displayed.
- Submit is disabled for empty entries.

**US-6.2 — Dictate a journal entry via voice**
> As a player, I want to dictate my journal entry with voice, so that I can journal hands-free or faster.

**Acceptance Criteria:**
- A microphone button on the journal screen launches Android's native `SpeechRecognizer`.
- On first use, the app requests `RECORD_AUDIO` permission with a clear rationale.
- While listening, a visual indicator shows the recording state.
- When the user stops speaking (or taps stop), the recognized text is **appended** to the current content of the text field (not replacing it), so users can combine keyboard and voice input within a single entry.
- The user can edit the appended text freely before submitting.
- If permission is denied, the mic button is disabled and a tooltip explains how to enable it in system settings.
- If `SpeechRecognizer` is unavailable (e.g., no Google app on device), the mic button is hidden and the feature degrades gracefully.

**US-6.3 — Save a journal entry**
> As a player, I want to save my journal entry, so that it is persisted to the backend.

**Acceptance Criteria:**
- Tapping submit calls `POST /api/game/{id}/journal` with the entry content and the current phase.
- On success, the entry is reflected in the in-memory game state and any subsequent reads (`GET /api/game/{id}/journal`) include it.
- On failure, an error is shown and the draft is preserved in the text field.

**US-6.4 — View past journal entries**
> As a player, I want to see my previous journal entries in a game, so that I can review my story.

**Acceptance Criteria:**
- A journal history view (accessible from each phase screen and the completion screen) calls `GET /api/game/{id}/journal` and lists entries grouped by phase.

---

### Epic 7 — Theming and Presentation

**US-7.1 — Library-atmosphere dark theme**
> As a player, I want the app to feel like a cozy library, so that the atmosphere reinforces the game's tone.

**Acceptance Criteria:**
- Material 3 dark color scheme uses a custom palette: warm browns, muted golds, and cream accents.
- Typography uses a serif font family (e.g., Literata, EB Garamond, or a comparable Google Font available via `androidx.compose.ui.text.googlefonts`) for headers and body copy.
- Elevated surfaces use subtle gold highlights; destructive actions remain Material 3 error-colored for accessibility.
- All text has contrast ratios meeting WCAG AA on the chosen backgrounds.

**US-7.2 — Smooth native animations**
> As a player, I want book reveals and dice rolls to feel cinematic, so that key moments are memorable.

**Acceptance Criteria:**
- Book reveal: 3D card flip implemented with Compose's `graphicsLayer` (rotationY + cameraDistance), ~4s total, with shadow and perspective.
- Dice roll: Compose `Canvas` with slot-machine easing (fast initial spin decelerating via custom easing), ~3s total.
- Both animations target 60 FPS on mid-range devices; no jank on a Pixel 5-class device.
- Animations are interruptible if the user backgrounds the app.

---

## Technical Notes

### Project Structure
```
android/
  app/
    src/main/java/com/biblioteca/android/
      data/
        api/          # Retrofit interfaces + DTOs
        repository/   # Repository implementations
        auth/         # Token storage, interceptors
      domain/
        model/        # Domain models (GameSession, JournalEntry, etc.)
        usecase/      # Optional use cases if complexity grows
      ui/
        auth/         # Login / Register screens
        home/         # Game list / New Game
        game/
          prologue/
          chapter/
          epilogue/
          journal/    # Shared journal composables
        theme/        # Material 3 theme, colors, typography
        components/
          animations/ # BookReveal, DiceRoll
      di/             # Hilt or Koin modules
      MainActivity.kt
    src/main/res/
  build.gradle.kts
  settings.gradle.kts
  .git/               # Own git repo
```

### Architecture
- **MVVM + Repository.** Screens are Composables observing `StateFlow` exposed by `ViewModel`s. ViewModels call Repositories. Repositories wrap Retrofit services and handle DTO-to-domain mapping.
- **Dependency Injection:** Hilt recommended (first-class Android support). Koin acceptable if the user prefers lighter setup.
- **Navigation:** Jetpack Navigation Compose with type-safe routes (Compose `navigation-compose` 2.8+).

### Networking
- **Retrofit 2 + OkHttp 4.**
- **Serialization:** kotlinx.serialization (preferred) or Moshi.
- **Interceptors:**
  - `AuthInterceptor` — attaches `Authorization: Bearer <jwt>` to all authenticated requests.
  - `TokenAuthenticator` — handles 401 by calling `/api/auth/refresh`, updating storage, and retrying. Must be thread-safe (single-flight refresh via mutex).
- **Base URL configuration:** `BuildConfig.API_BASE_URL` with separate values for `debug` (e.g., `http://10.0.2.2:8080` for emulator) and `release`.

### Secure Storage
- **EncryptedSharedPreferences** (androidx.security.crypto) with master key backed by Android Keystore (AES256_GCM).
- Stored keys: `jwt_access_token`, `jwt_refresh_token`, `token_expires_at` (optional, for proactive refresh).
- All reads/writes go through a single `TokenStorage` class injected via DI.

### Voice Input
- **Android `SpeechRecognizer`** (not the deprecated `RecognizerIntent` dialog flow — use `createSpeechRecognizer()` for an in-app experience).
- Permission: `android.permission.RECORD_AUDIO` requested at journal-screen entry or first mic tap.
- Result handling: take the top result from `onResults`, append to the current text field value, leave cursor at end.
- Handle edge cases: `ERROR_NO_MATCH`, `ERROR_SPEECH_TIMEOUT`, `ERROR_NETWORK` — all surface as non-blocking snackbars.

### Animations
- **Book reveal:** `Modifier.graphicsLayer { rotationY = ... ; cameraDistance = 12f * density }` driven by `animateFloatAsState` or a custom `Animatable` for full control; backface culling by checking rotation range.
- **Dice roll:** `Canvas` composable drawing dice faces; animated via a custom `Easing` curve (fast start, slow finish) over ~3s.
- Both composables accept an `onAnimationEnd` callback so ViewModels know when to reveal the final state.

### Theming
- Compose Material 3 (`androidx.compose.material3`).
- Define `BibliotecaColors`, `BibliotecaTypography`, `BibliotecaShapes` in `ui/theme/`.
- Provide only a dark scheme for MVP (no light mode).
- Fonts loaded via `androidx.compose.ui.text.googlefonts.GoogleFont` or bundled in `res/font/`.

### Language
- All code (classes, variables, comments, string resource keys) MUST be in English, per project convention.
- Domain model names align with backend: `GameSession`, `Phase`, `Body`, `Mind`, `Social` (not `Partida`, `Fase`, `Cuerpo`, `Mente`).
- User-facing strings live in `res/values/strings.xml` and are currently English-only; localization to Spanish is out of scope for MVP but the structure should not block it.

### Testing
- **Unit tests:** ViewModels (using `kotlinx-coroutines-test` + Turbine), repositories, mappers.
- **Instrumentation tests:** Critical flows (login, start game, submit journal) via Compose UI testing.
- **Mock server:** MockWebServer for Retrofit tests.
- Coverage target for MVP: ViewModels and Repositories at minimum.

### Git Setup
- `android/` contains its own `.git/` directory (not a submodule of the workspace root).
- Initial branch: `master`.
- Feature branches follow workspace convention: `feature/<name>`.
- `.gitignore` based on the standard Android Studio template.

---

## Out of Scope

- **iOS support.** Kotlin Multiplatform may be considered post-MVP but is not part of this spec.
- **Offline mode / local persistence of game state.** The app is online-only; closing the app mid-phase without submitting loses only unsubmitted draft text (which should be preserved in-memory within the session but not across process death).
- **Push notifications.** No FCM integration.
- **Google Play Store deployment.** Build artifacts are APKs sideloaded to test devices. No signing config for Play, no release tracks, no Play Console work.
- **Localization.** English UI only. String resources must live in `strings.xml` to keep the door open, but no translation work happens in MVP.
- **Light theme.** Dark mode only.
- **Tablet-optimized layouts.** The app targets phones; tablets will get the same layout scaled up.
- **Account recovery (password reset).** Users who forget passwords handle it via the web frontend or a future release.
- **Admin panel access.** The EasyAdmin panel stays web-only.
- **Custom oracle tables / user-authored content.** Only the oracle tables served by `GET /api/oracle/tables` are consumed.
- **Analytics, crash reporting (Crashlytics), or telemetry.**
- **Biometric authentication (fingerprint / face unlock).** Potential post-MVP enhancement.

---

## Dependencies

### External / Backend
- **Backend API must be reachable from the device.** For local development against the emulator, the base URL is `http://10.0.2.2:8080`. For physical devices on the same LAN, the workspace Docker setup must expose the API on a LAN-reachable host, or a ngrok/cloudflared tunnel must be used.
- **CORS is irrelevant** (native clients do not enforce CORS), but the backend **must accept** JSON requests from an unrestricted `User-Agent` / `Origin` — verify no middleware rejects non-browser clients.
- **The backend endpoints listed in the feature description must exist and be stable.** Specifically verify before implementation:
  - `GET /api/game` (or equivalent) to list a user's games for the home screen. If no list endpoint exists today, one must be added OR the home screen must degrade to "new game only + resume via deep link."
  - The exact request/response shapes for each chapter and epilogue endpoint — the spec assumes they match what the Vue frontend uses.
- **JWT behavior:** 1-hour access TTL + refresh token flow is already implemented (per prior auth phase work). The Android `TokenAuthenticator` depends on the refresh endpoint returning a new access token (and ideally a rotated refresh token) on `POST /api/auth/refresh`.

### Tooling / Developer Environment
- **Android Studio Ladybug (2024.2) or newer.**
- **JDK 17** (required by Android Gradle Plugin 8.x).
- **Android SDK 34 (minimum target)**, `minSdk` 26 (Android 8.0) recommended to get modern `SpeechRecognizer` behavior and Material 3.
- **Gradle 8.7+** via wrapper.

### Libraries (confirmed)
- Jetpack Compose BOM (latest stable)
- Compose Material 3
- Retrofit 2 + OkHttp 4
- kotlinx.serialization (or Moshi)
- androidx.security:security-crypto (EncryptedSharedPreferences)
- Hilt (or Koin) for DI
- Jetpack Navigation Compose
- kotlinx-coroutines + Flow

### Decisions Required Before Implementation
1. **DI framework:** Hilt vs. Koin — recommend **Hilt** for standard Android tooling.
2. **JSON library:** kotlinx.serialization vs. Moshi — recommend **kotlinx.serialization** (cleaner Kotlin integration, better with Compose ecosystem).
3. **Serif font source:** Google Fonts (network-fetched at build time) vs. bundled TTF — recommend **bundled** for offline app launch.
4. **Game list endpoint availability:** confirm with backend or add endpoint as a prerequisite.

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Backend has no "list games for user" endpoint | Home screen can't show resumable games | Verify during Phase 0; add endpoint to `oracles-api/` as a sub-task if missing |
| `SpeechRecognizer` unavailable on AOSP / non-Google devices | Voice input silently broken for some users | Detect via `SpeechRecognizer.isRecognitionAvailable(context)` and hide mic button gracefully |
| OkHttp `Authenticator` race conditions on concurrent 401s | Multiple parallel refresh calls, possible token corruption | Implement single-flight refresh with a `Mutex` in `TokenAuthenticator` |
| Backend API response shapes drift from Vue frontend assumptions | Chapter / epilogue flows break silently | Before coding each epic, capture real API responses via `curl` and generate DTOs from observed shapes, not guesses |
| Native Compose animations jank on low-end devices | Poor first impression | Profile on a low-end reference device (e.g., Samsung A13) during Epic 4 implementation; simplify animations if frame drops exceed 10% |
| Encrypted storage reset on device backup restore | Users signed out silently after switching devices | Document the behavior; acceptable for MVP (users just log in again) |
| `10.0.2.2` only works on emulator; physical device testing needs extra config | Onboarding friction during development | Document LAN setup and ngrok fallback in `android/README.md` |
| Token refresh endpoint returns non-standard error shape | `TokenAuthenticator` fails to detect refresh failure | Verify refresh error responses early and write integration tests against MockWebServer |
| Android Keystore invalidation on biometric change or factory reset | EncryptedSharedPreferences throws on read | Catch `KeyPermanentlyInvalidatedException` / generic crypto errors, clear storage, route to login |

---

## Suggested Milestones

These are indicative; actual sprint planning is up to the user.

| Milestone | Scope |
|-----------|-------|
| **M0 — Bootstrap** | Android Studio project created in `android/`, own git repo, Hilt + Retrofit + Compose BOM wired, Material 3 theme scaffolded, CI-free local build green |
| **M1 — Auth** | US-1.1 through US-1.5; EncryptedSharedPreferences + TokenAuthenticator working end-to-end |
| **M2 — Game shell + Prologue** | US-2.1, US-2.2, US-3.1; navigation skeleton; home screen + prologue flow |
| **M3 — Chapters** | US-4.1 through US-4.5; book reveal and dice roll animations; chapter journal with keyboard input |
| **M4 — Voice journaling** | US-6.2; permission flow; append-to-field behavior; error handling |
| **M5 — Epilogue + completion** | US-5.1 through US-5.3; US-2.3; read-only completed game view |
| **M6 — Polish** | Theme refinement, animation profiling on low-end device, instrumentation tests for critical flows |

---

## Approval

This spec is **awaiting user review**. Please confirm:

1. Scope boundaries (especially Out of Scope items) match expectations.
2. The DI / JSON library recommendations (Hilt + kotlinx.serialization) are acceptable — or indicate preference otherwise.
3. Whether a game list endpoint currently exists in `oracles-api/` — this affects US-2.2 implementability.
4. Whether LAN / ngrok testing against the Docker backend is acceptable, or if a staging deployment should be prepared first.

Once approved, the next step is creating the `feature/android-client-bootstrap` branch (under a new `android/` git repo) and starting Milestone M0.
