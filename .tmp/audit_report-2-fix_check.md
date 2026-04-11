# Fix Check (Static Re-Review)

Date: 2026-04-10 (updated 2026-04-11 — Report Integrity Corrections applied)

Scope: static-only recheck of previously open items. No runtime execution, no Docker, no tests run.

## Result

- Previously open items rechecked: 3
- Fully fixed: 3
- Still open: 0
- **Report Integrity Corrections applied:** 1 (see bottom of file). Item #3's wording has been corrected; the underlying behaviour is still fixed.

## Item-by-item status

1. **ONNX process-mode partial gap** — **Fixed (with explicit Option B boundary)**
   - OnnxAdapter now translates missing `onnxruntime` runtime into a deterministic canonical 503 error instead of opaque failure:
     - `repo/src/services/model.service.ts:234`
     - `repo/src/services/model.service.ts:237`
     - `repo/src/services/model.service.ts:241`
   - Stable error code added:
     - `repo/src/utils/errors.ts:30`
   - Docs now explicitly describe the operator-provided ONNX runtime boundary and remediation:
     - `repo/README.md:273` — "ONNX runtime — operator-provided boundary (intentional)"
     - `repo/README.md:288` — canonical envelope with `code: "MODEL_RUNTIME_UNAVAILABLE"` (reproduced verbatim in the README)
     - `repo/README.md:296` — remediation list (pip install / derived image / `MODEL_ADAPTER_MODE=mock`)
   - Unit security tests now pin this behavior contract:
     - `repo/unit_tests/model_security.spec.ts:153`
     - `repo/unit_tests/model_security.spec.ts:191`
     - `repo/unit_tests/model_security.spec.ts:199`

2. **Canonical envelope gap in import format validation** — **Fixed**
   - Ad-hoc response replaced with `AppError` path in import template download handler:
     - `repo/src/controllers/import.controller.ts:24`
   - API test now verifies canonical envelope fields for invalid format:
     - `repo/API_tests/import.api.spec.ts:87`
     - `repo/API_tests/import.api.spec.ts:94`
     - `repo/API_tests/import.api.spec.ts:97`

3. **README/test-runner consistency after compose split** — **Fixed**
   - After iterating on the compose split, the repo ultimately collapsed back to the w2t50-style single-entry pattern: one `docker-compose.yml`, one `./run_tests.sh` entry point, no override file, no `.env`. The README now declares `./run_tests.sh` as the canonical (and only recommended) test invocation:
     - `repo/README.md:97` — "The official test command is `./run_tests.sh`."
     - `repo/README.md:104` — usage snippet: `./run_tests.sh`
     - `repo/run_tests.sh:5` — script self-doc: "the only thing a reviewer needs"
   - Manual per-step commands are still documented as a fallback for iterating on a single test file inside the running container: `repo/README.md:107`.
   - Correction (2026-04-11): earlier revisions of this report incorrectly described the README as marking `run_tests.sh` as *legacy/non-canonical*. That wording was based on a mid-iteration README state that no longer exists in the repo. The current README — and this corrected report entry — both declare `./run_tests.sh` as the canonical entry point. See *Report Integrity Corrections* below.

## Final

- Remaining open issues: **0** (behavioural)
- Static note: runtime behavior (actual container/package execution) remains manual verification territory by audit boundary.

## Report Integrity Corrections (2026-04-11)

During a static re-validation pass, one statement in this file was found to contradict the actual repo state:

1. **Item #3 wording was wrong.** The original text said *"README now declares canonical test invocation using both compose files and explicitly marks `run_tests.sh` as legacy/non-canonical"*. That described a mid-iteration README state (before the w2t50-style collapse back to the single-entry pattern). The current README at `repo/README.md:97` unambiguously declares `./run_tests.sh` as **the** official test command, and `repo/run_tests.sh:5` calls itself "the only thing a reviewer needs". The report entry has been rewritten to match.

No behavioural regression — all three original items are still resolved. The correction is cosmetic: it only adjusts the evidence trail of Item #3 to match the file system the reviewer will actually see.
