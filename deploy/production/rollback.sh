#!/usr/bin/env sh
set -eu

DEPLOY_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_DIR=$(CDPATH= cd -- "$DEPLOY_DIR/../.." && pwd)
ENV_FILE=${ENV_FILE:-$DEPLOY_DIR/runtime.env}
COMPOSE_FILE=$DEPLOY_DIR/compose.yaml

if [ -z "${ROLLBACK_IMAGE:-}" ]; then
  echo "ROLLBACK_IMAGE is required and must be an immutable prior image tag" >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "runtime environment file not found: $ENV_FILE" >&2
  exit 1
fi

read_env() {
  awk -v wanted="$1" '
    $0 ~ "^" wanted "=" {
      value = substr($0, index($0, "=") + 1)
    }
    END { print value }
  ' "$ENV_FILE"
}

SEMBLIA_IMAGE=$ROLLBACK_IMAGE
APP_URL=${APP_URL:-$(read_env APP_URL)}
API_URL=${API_URL:-$(read_env API_URL)}
RUNTIME_ENV_FILE=$ENV_FILE
export SEMBLIA_IMAGE APP_URL API_URL RUNTIME_ENV_FILE

compose() {
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
}

echo "Rolling API and worker back to $ROLLBACK_IMAGE"
compose pull api worker
compose up -d --remove-orphans api worker

echo "Application image rolled back; database schema is not reversed."
node "$REPO_DIR/scripts/production/spine.mjs" \
  --app-url "$APP_URL" \
  --api-url "$API_URL" \
  --compose-file "$COMPOSE_FILE" \
  --env-file "$ENV_FILE"

