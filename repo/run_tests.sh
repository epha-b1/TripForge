#!/bin/sh
#
# TripForge — compose-based test runner.
#
# Wraps the canonical two-file compose invocation in a single command:
#
#   docker compose -f docker-compose.yml -f docker-compose.test.yml ...
#
# The base `docker-compose.yml` is production-shaped and refuses to start
# without host-exported secrets. The `docker-compose.test.yml` override
# layers in throwaway TEST_ONLY_NOT_FOR_PRODUCTION credentials and switches
# `NODE_ENV=test`. There is intentionally NO `.env` file involved — every
# secret needed by the test stack is inlined in the override file.
#
# Strict fail-fast posture: if any compose step fails the script exits
# immediately with a clear error instead of continuing into a useless
# health-check loop or running the test suite against a half-started stack.

set -eu

# ──────────────────────────────────────────────
# Canonical compose command — used for EVERY docker compose call below.
# Printed for transparency so reviewers can copy/paste it manually if
# this script ever needs to be bypassed.
# ──────────────────────────────────────────────
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.test.yml"
echo "[run_tests] compose command: ${COMPOSE}"

# ──────────────────────────────────────────────
# Step 1 — Ensure containers are up
# ──────────────────────────────────────────────
echo ""
echo "=== Step 1: Ensuring containers are running ==="

api_running=$(${COMPOSE} ps --status running --format '{{.Service}}' 2>/dev/null | grep -c '^api$' || true)

if [ "$api_running" -eq 0 ]; then
  echo "API container is not running. Starting with build..."
  if ! ${COMPOSE} up -d --build; then
    echo ""
    echo "ERROR: '${COMPOSE} up -d --build' failed. Aborting." >&2
    echo "Last 30 lines of API logs (if any):" >&2
    ${COMPOSE} logs api --tail 30 >&2 || true
    exit 1
  fi
else
  # Container is running — verify it responds before trusting it
  if ! ${COMPOSE} exec -T api wget -qO- http://localhost:3000/health >/dev/null 2>&1; then
    echo "API container is running but not responding. Restarting..."
    if ! ${COMPOSE} restart api; then
      echo "ERROR: '${COMPOSE} restart api' failed. Aborting." >&2
      exit 1
    fi
  else
    echo "API container is running and responding."
  fi
fi

# ──────────────────────────────────────────────
# Step 2 — Wait for API health
# ──────────────────────────────────────────────
echo ""
echo "=== Step 2: Waiting for API to be healthy ==="

attempts=0
max_attempts=60

# `set -e` would normally abort the script on the first failed health-check
# command inside the loop, so we explicitly tolerate the wget failure here.
while [ "$attempts" -lt "$max_attempts" ]; do
  if ${COMPOSE} exec -T api wget -qO- http://localhost:3000/health >/dev/null 2>&1; then
    echo "API is healthy."
    break
  fi
  attempts=$((attempts + 1))
  printf "  waiting... (%d/%d)\n" "$attempts" "$max_attempts"
  sleep 1
done

if [ "$attempts" -ge "$max_attempts" ]; then
  echo "" >&2
  echo "ERROR: API did not become healthy within ${max_attempts}s." >&2
  echo "Last 30 lines of API logs:" >&2
  ${COMPOSE} logs api --tail 30 >&2 || true
  exit 1
fi

# ──────────────────────────────────────────────
# Step 3 — Unit tests
# ──────────────────────────────────────────────
echo ""
echo "=== Step 3: Running unit tests ==="

# Don't let `set -e` short-circuit the summary block — capture the exit
# code instead and decide at the end.
unit_exit=0
${COMPOSE} exec -T api npx jest --testPathPattern=unit_tests --verbose --no-cache || unit_exit=$?

# ──────────────────────────────────────────────
# Step 4 — API tests
# ──────────────────────────────────────────────
echo ""
echo "=== Step 4: Running API tests ==="

api_exit=0
${COMPOSE} exec -T api npx jest --testPathPattern=API_tests --verbose --no-cache --runInBand || api_exit=$?

# ──────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────
echo ""
echo "========================================"
echo "  TEST SUMMARY"
echo "========================================"

if [ "$unit_exit" -eq 0 ]; then
  echo "  Unit tests:  PASSED"
else
  echo "  Unit tests:  FAILED (exit $unit_exit)"
fi

if [ "$api_exit" -eq 0 ]; then
  echo "  API tests:   PASSED"
else
  echo "  API tests:   FAILED (exit $api_exit)"
fi

echo "========================================"

if [ "$unit_exit" -ne 0 ] || [ "$api_exit" -ne 0 ]; then
  exit 1
fi

exit 0
