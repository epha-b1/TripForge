# Fix Check (Static Re-Review)

Date: 2026-04-10

Scope: static-only recheck of previously open items. No runtime execution, no Docker, no tests run.

## Result

- Previously open items rechecked: 3
- Fully fixed: 3
- Still open: 0

## Item-by-item status

1. **ONNX process-mode partial gap** — **Fixed (with explicit Option B boundary)**
   - OnnxAdapter now translates missing `onnxruntime` runtime into a deterministic canonical 503 error instead of opaque failure:
     - `repo/src/services/model.service.ts:234`
     - `repo/src/services/model.service.ts:237`
     - `repo/src/services/model.service.ts:241`
   - Stable error code added:
     - `repo/src/utils/errors.ts:30`
   - Docs now explicitly describe the operator-provided ONNX runtime boundary and remediation:
     - `repo/README.md:286`
     - `repo/README.md:296`
     - `repo/README.md:309`
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
   - README now declares canonical test invocation using both compose files and explicitly marks `run_tests.sh` as legacy/non-canonical:
     - `repo/README.md:124`
     - `repo/README.md:132`
     - `repo/README.md:150`

## Final

- Remaining open issues: **0**
- Static note: runtime behavior (actual container/package execution) remains manual verification territory by audit boundary.
