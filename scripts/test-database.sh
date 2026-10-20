#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
container="staftify-test-db-$$"
cleanup() { docker rm -f "$container" >/dev/null; }
trap cleanup EXIT
docker run --detach --name "$container" --env POSTGRES_PASSWORD=local-disposable-test --env POSTGRES_DB=staftify_test postgres:17 >/dev/null
for attempt in {1..30}; do
  if docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec "$container" pg_isready -U postgres >/dev/null
for file in tests/db-bootstrap.sql supabase/migrations/202610200001_foundation.sql tests/database.sql; do
 docker exec -i "$container" psql -q -U postgres -d staftify_test -v ON_ERROR_STOP=1 < "$file"
done
