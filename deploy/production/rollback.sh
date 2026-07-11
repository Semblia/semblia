#!/usr/bin/env sh
set -eu

DEPLOY_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_DIR=$(CDPATH= cd -- "$DEPLOY_DIR/../.." && pwd)
ENV_FILE=${ENV_FILE:-$DEPLOY_DIR/runtime.env}
COMPOSE_FILE=$DEPLOY_DIR/compose.yaml

if ! printf '%s' "${ROLLBACK_IMAGE:-}" | grep -Eq '(@sha256:[0-9a-f]{64}|:[0-9a-f]{40})$'; then
  echo "ROLLBACK_IMAGE is required and must use a full commit-SHA tag or sha256 digest" >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "runtime environment file not found: $ENV_FILE" >&2
  exit 1
fi

read_env() {
  node "$REPO_DIR/scripts/production/env-value.mjs" "$ENV_FILE" "$1"
}

require_value() {
  value=$(read_env "$1")
  if [ -z "$value" ]; then
    echo "required rollback key is empty: $1" >&2
    exit 1
  fi
  printf '%s' "$value"
}

SEMBLIA_IMAGE=$ROLLBACK_IMAGE
APP_URL=${APP_URL:-$(require_value APP_URL)}
API_URL=${API_URL:-$(require_value API_URL)}
RUNTIME_ENV_FILE=$ENV_FILE
export SEMBLIA_IMAGE APP_URL API_URL RUNTIME_ENV_FILE

compose() {
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
}

echo "Rolling API and worker back to $ROLLBACK_IMAGE"
compose pull api worker
compose up -d --remove-orphans --wait --wait-timeout 120 api worker

echo "Application image rolled back; database schema is not reversed."
node "$REPO_DIR/scripts/production/spine.mjs" \
  --app-url "$APP_URL" \
  --api-url "$API_URL" \
  --compose-file "$COMPOSE_FILE" \
  --env-file "$ENV_FILE"
