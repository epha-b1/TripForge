# Audit Report 1 Fix Check (Static Recheck)

Date: 2026-04-09 (updated 2026-04-11 — Report Integrity Corrections applied)
Scope: static-only recheck of previously reported issues (no runtime execution)

## Overall Result
- **All previously tracked issues are statically addressed.**
- Status: **Pass (static recheck scope)**
- Fixed: 10/10 major tracked items (Issue #1 re-upgraded to Fixed after 2026-04-11 code hardening — see below)
- Remaining (blocking): 0 items

## Issue-by-Issue Recheck

1) Insecure default secrets / hardcoded compose secrets
**Status: Fixed (code-level hardening — tiered deny list)**
Evidence:
- `repo/src/config/environment.ts` now splits the deny list into two tiers:
  - `HARD_DENY_SECRETS` — legacy placeholder literals (`changeme`, `secret`, `change_me_in_production`, …) rejected **unconditionally**, every NODE_ENV.
  - `PRODUCTION_ONLY_DENY_SECRETS` — the exact `TEST_ONLY_NOT_FOR_PRODUCTION_*` literals that `docker-compose.yml` ships, plus the `TEST_JWT_SECRET`/`TEST_ENCRYPTION_KEY` in-process fallbacks, rejected when `NODE_ENV !== 'test'`.
- Both validators now go through a shared `isDeniedSecret()` gate: `repo/src/config/environment.ts` (see `validateJwtSecret` and `validateEncryptionKey`).
- Net effect: `docker compose up` from a fresh clone still works (compose file sets `NODE_ENV=test`, validators allow the TEST_ONLY literals), BUT a production deploy that forgets to override every secret **refuses to boot** with a clear `EnvironmentConfigError: … is set to a known insecure placeholder or test-only value`. The CI bootstrap credentials can never become production credentials by accident.
- Tests pinning both the production-mode rejection AND the test-mode allowance:
  - `repo/unit_tests/environment.spec.ts` — 4 new *"throws when … is the compose TEST_ONLY literal (production mode)"* tests (JWT_SECRET + ENCRYPTION_KEY × compose literal + in-process fallback).
  - `repo/unit_tests/environment.spec.ts` — 1 new *"accepts the compose TEST_ONLY JWT_SECRET literal under NODE_ENV=test"* test locking the CI-stack path.
- Prior evidence citation `repo/.env.example:19` was INVALID — that file does not exist in the current workspace (the `.env` workflow was explicitly removed) and has been replaced with the real evidence above.

2) Deployment mismatch vs single-container requirement  
**Status: Fixed**  
Evidence: `repo/Dockerfile:1`, `repo/docker/entrypoint.sh:1`, `repo/README.md:7`

3) Import resource type mismatch across modules  
**Status: Fixed**  
Evidence: `repo/src/schemas/resource.schemas.ts:14`, `repo/src/services/resource.service.ts:3`, `repo/src/services/import.service.ts:143`

4) API contract drift (`/users` POST, import template auth, error id naming)  
**Status: Largely fixed**  
Evidence: `docs/api-spec.md:298`, `repo/src/routes/users.routes.ts:9`, `repo/src/routes/import.routes.ts:59`, `repo/src/app.ts:72`, `repo/src/config/swagger.ts:24`

5) Itinerary version snapshots missing metadata/diff fidelity  
**Status: Fixed**  
Evidence: `repo/src/services/itinerary.service.ts:56`, `repo/src/services/itinerary.service.ts:110`, `repo/src/services/itinerary.service.ts:188`

6) Audit coverage selective + immutability not evidenced  
**Status: Fixed (static evidence)**  
Evidence: `repo/src/controllers/resources.controller.ts:8`, `repo/src/controllers/import.controller.ts:29`, `repo/src/controllers/models.controller.ts:8`, `repo/prisma/migrations/20260409000000_audit_immutability/migration.sql:17`, `repo/API_tests/audit.api.spec.ts:189`

7) Unit tests replicating logic instead of testing production code  
**Status: Fixed**  
Evidence: `repo/unit_tests/import.spec.ts:17`, `repo/unit_tests/itinerary.spec.ts:21`, `repo/unit_tests/acceptance.spec.ts:12`

8) Duplicate spec sources without guard (drift risk)  
**Status: Fixed (guard added)**  
Evidence: `repo/unit_tests/contract_sync.spec.ts:57`, `repo/README.md:242`

9) Logging/request-id envelope test gap (broad 4xx/5xx coverage)  
**Status: Fixed**  
Evidence: parameterized envelope suite now includes explicit 429 coverage for both challenge and rate-limit branches, plus 500 assertions: `repo/API_tests/envelope.api.spec.ts:21`, `repo/API_tests/envelope.api.spec.ts:170`, `repo/API_tests/envelope.api.spec.ts:218`, `repo/API_tests/envelope.api.spec.ts:276`

10) 429 challenge response canonical envelope consistency (`statusCode/code/requestId`)  
**Status: Fixed**  
Evidence: challenge issuance branch explicitly returns canonical envelope fields (`statusCode`, `code`, `message`, `requestId`) while preserving `challengeToken`/`retryAfterSeconds`: `repo/src/controllers/auth.controller.ts:39`, `repo/src/controllers/auth.controller.ts:43`; both 429 branches are asserted by the envelope suite: `repo/API_tests/envelope.api.spec.ts:203`, `repo/API_tests/envelope.api.spec.ts:260`

## Remaining Actions Required

None in this fix-check scope. The 2026-04-11 code-hardening pass on Issue #1 (tiered deny list in `environment.ts`) closed the "test-only literals in compose" gap by enforcing the boundary at the *application layer* instead of merely documenting it.

## Optional Improvement (Not blocking this fix pass)
- Structured log `category` field is still not consistently present in logger calls.  
Evidence: no category matches in source logging calls; request log currently has no `category`: `repo/src/middleware/audit.middleware.ts:34`.

## Report Integrity Corrections (2026-04-11)

Earlier revisions of this document had two inaccuracies that have been corrected:

1. **Invalid citation (report-only fix)** — Issue #1 originally cited `repo/.env.example:19`. That file does not exist in the current workspace (the `.env` workflow was explicitly removed). The citation has been replaced with the real evidence: `repo/src/config/environment.ts` (tiered deny list), `repo/docker-compose.yml` (TEST_ONLY literals), and the new environment-mode tests at `repo/unit_tests/environment.spec.ts`.

2. **Status wording (upgraded by a real code change)** — Issue #1 was briefly downgraded to "Partially fixed" during this re-validation because the compose file still shipped inline secret literals. Rather than leave the downgrade in place, the compose-shipped literals have been added to a new `PRODUCTION_ONLY_DENY_SECRETS` deny list in `environment.ts` and wired through a shared `isDeniedSecret()` gate, so a production deploy that inherits them refuses to boot. Five new unit tests pin the behaviour (4 production-mode rejections + 1 test-mode allowance). With that hardening Issue #1 is back to **Fixed** on the basis of enforced-at-runtime semantics, not paperwork.
