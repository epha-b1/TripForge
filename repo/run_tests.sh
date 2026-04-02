#!/bin/sh

# ──────────────────────────────────────────────
# Step 1 — Ensure containers are up
# ──────────────────────────────────────────────
echo "=== Step 1: Ensuring containers are running ==="

api_running=$(docker compose ps --status running --format '{{.Service}}' 2>/dev/null | grep -c '^api$')

if [ "$api_running" -eq 0 ]; then
  echo "API container is not running. Starting with build..."
  docker compose up -d --build
else
  # Container is running — verify it responds
  if ! docker compose exec -T api wget -qO- http://localhost:3000/health >/dev/null 2>&1; then
    echo "API container is running but not responding. Restarting..."
    docker compose restart api
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

while [ "$attempts" -lt "$max_attempts" ]; do
  if docker compose exec -T api wget -qO- http://localhost:3000/health >/dev/null 2>&1; then
    echo "API is healthy."
    break
  fi
  attempts=$((attempts + 1))
  printf "  waiting... (%d/%d)\n" "$attempts" "$max_attempts"
  sleep 1
done

if [ "$attempts" -ge "$max_attempts" ]; then
  echo ""
  echo "ERROR: API did not become healthy within ${max_attempts}s."
  echo "Last 30 lines of API logs:"
  docker compose logs api --tail 30
  exit 1
fi

# ──────────────────────────────────────────────
# Step 3 — Unit tests
# ──────────────────────────────────────────────
echo ""
echo "=== Step 3: Running unit tests ==="

docker compose exec -T api npx jest --testPathPattern=unit_tests --verbose --no-cache
unit_exit=$?

# ──────────────────────────────────────────────
# Step 4 — API tests
# ──────────────────────────────────────────────
echo ""
echo "=== Step 4: Running API tests ==="

docker compose exec -T api npx jest --testPathPattern=API_tests --verbose --no-cache --runInBand
api_exit=$?

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
