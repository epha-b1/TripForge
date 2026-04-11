# Audit Report 1 Fix Check (Static Recheck)

Date: 2026-04-09  
Scope: static-only recheck of previously reported issues (no runtime execution)

## Overall Result
- **All previously tracked issues are now statically addressed**.
- Status: **Pass (static recheck scope)**
- Fixed: 10/10 major tracked items
- Remaining: 0 items

## Issue-by-Issue Recheck

1) Insecure default secrets / hardcoded compose secrets  
**Status: Fixed**  
Evidence: `repo/src/config/environment.ts:57`, `repo/src/config/environment.ts:83`, `repo/docker-compose.yml:9`, `repo/.env.example:19`

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

None in this fix-check scope.

## Optional Improvement (Not blocking this fix pass)
- Structured log `category` field is still not consistently present in logger calls.  
Evidence: no category matches in source logging calls; request log currently has no `category`: `repo/src/middleware/audit.middleware.ts:34`.
