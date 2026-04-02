---
name: Nelmio API Doc routing and test env fix
description: Two infrastructure fixes required to test /api/doc.json in the test environment
type: project
---

Two fixes were needed to make NelmioApiDocBundle work in the test environment:

1. **Wrong controller name in route** — `config/routes/nelmio_api_doc.yaml` had `_controller: nelmio_api_doc.controller.documentation` (old name). The installed bundle version registers the service as `nelmio_api_doc.controller.swagger_json`. Fixed by updating the route default.

2. **Missing DEFAULT_URI in .env.test** — `config/packages/routing.yaml` uses `default_uri: '%env(DEFAULT_URI)%'`. This variable is defined in `.env` but not `.env.test`, so the test kernel couldn't boot when Nelmio tried to generate server URLs. Fixed by adding `DEFAULT_URI=http://localhost` to `.env.test`.

**Why:** These were silent misconfigurations that only surfaced when the doc endpoint was first tested.

**How to apply:** If the doc endpoint returns 500 in tests, check these two things first before investigating Nelmio config.
