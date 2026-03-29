---
name: Project Test Setup
description: Testing infrastructure details for La Biblioteca PHP/Symfony backend
type: project
---

Testing framework: PHPUnit 12.5.14, Symfony 7.2 WebTestCase.

Test command: `docker compose exec -e XDEBUG_MODE=off backend-php php bin/phpunit`

Unit tests: `tests/Unit/` — co-located by feature area (Service/, Oracle/, Enum/).
Integration tests: `tests/Integration/` — WebTestCase with real MySQL test database.

Test database: `biblioteca_test` (MySQL). Created with root credentials:
`docker compose exec mysql mysql -uroot -proot_secret_dev ...`
Schema created: `php bin/console doctrine:schema:create --env=test`

**Why:** The `when@test` dbname_suffix in doctrine.yaml handles the `_test` suffix automatically, so no separate DATABASE_URL config is needed beyond the base URL — but the password in `.env.test` must match the actual Docker MySQL password (`biblioteca_pass_dev`, NOT `biblioteca_pass`).

**Key fix — APP_ENV resolution:** The Docker container sets `$_ENV['APP_ENV'] = 'dev'` from the actual process environment, which takes precedence over `$_SERVER['APP_ENV']` set by phpunit's `<server>` tag. Solution: `phpunit.xml` (not the .dist file) adds `<env name="APP_ENV" value="test" force="true" />` alongside the server tag.

**Rate limiter in tests:** The `game_roll` rate limiter (30/min) trips during integration tests because all requests share the same IP. Solution: `config/packages/test/rate_limiter.yaml` sets `policy: no_limit` for the test environment.

**DataProvider methods** must be `public static` in PHPUnit 12.

**How to apply:** When adding new integration tests that hit rate-limited endpoints, they will work without extra setup. If new rate-limited routes are added, the test config already disables limiting globally.
