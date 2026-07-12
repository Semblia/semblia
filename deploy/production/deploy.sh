#!/usr/bin/env sh
set -eu

DEPLOY_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_DIR=$(CDPATH= cd -- "$DEPLOY_DIR/../.." && pwd)
ENV_FILE=${ENV_FILE:-$DEPLOY_DIR/runtime.env}
COMPOSE_FILE=$DEPLOY_DIR/compose.yaml

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
    echo "required deployment key is empty: $1" >&2
    exit 1
  fi
  printf '%s' "$value"
}

SEMBLIA_IMAGE=${SEMBLIA_IMAGE:-$(require_value SEMBLIA_IMAGE)}
APP_URL=${APP_URL:-$(require_value APP_URL)}
API_URL=${API_URL:-$(require_value API_URL)}

if ! printf '%s' "$SEMBLIA_IMAGE" | grep -Eq '(@sha256:[0-9a-f]{64}|:[0-9a-f]{40})$'; then
  echo "SEMBLIA_IMAGE must use a full commit-SHA tag or sha256 digest" >&2
  exit 1
fi

RUNTIME_ENV_FILE=$ENV_FILE
export SEMBLIA_IMAGE APP_URL API_URL RUNTIME_ENV_FILE

compose() {
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
}

mkdir -p "$DEPLOY_DIR/backups"

echo "Pulling immutable runtime image"
compose pull api worker validate migrate

echo "Validating production environment"
compose run --rm validate

echo "Creating pre-deploy database backup"
compose run --rm backup

echo "Applying pending database migrations"
compose run --rm migrate

echo "Starting API and worker"
compose up -d --remove-orphans --wait --wait-timeout 120 api worker

echo "Verifying public endpoints and local service health"
node "$REPO_DIR/scripts/production/spine.mjs" \
  --app-url "$APP_URL" \
  --api-url "$API_URL" \
  --compose-file "$COMPOSE_FILE" \
  --env-file "$ENV_FILE"
