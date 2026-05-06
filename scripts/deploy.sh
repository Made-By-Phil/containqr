#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/srv/containqr/app"
VENV_DIR="/srv/containqr/venv"
ENV_FILE="/srv/containqr/env/.env"
SERVICE_NAME="containqr"
TARGET_REF="${1:-main}"
FRONTEND_ARCHIVE="${2:-}"

if [[ ! -d "$APP_DIR/.git" ]]; then
  echo "App repo not found at $APP_DIR" >&2
  exit 1
fi

cd "$APP_DIR"

git fetch origin
if git rev-parse --verify "$TARGET_REF" >/dev/null 2>&1; then
  git reset --hard "$TARGET_REF"
else
  git reset --hard "origin/$TARGET_REF"
fi

python3 -m venv "$VENV_DIR" >/dev/null 2>&1 || true
source "$VENV_DIR/bin/activate"
pip install --upgrade pip
pip install -r requirements.txt

set -a
source "$ENV_FILE"
set +a

if [[ -n "$FRONTEND_ARCHIVE" ]]; then
  rm -rf "$APP_DIR/dist"
  mkdir -p "$APP_DIR/dist"
  tar -xzf "$FRONTEND_ARCHIVE" -C "$APP_DIR/dist"
fi

python manage.py migrate --noinput
python manage.py collectstatic --noinput

sudo systemctl restart "$SERVICE_NAME"
sudo systemctl reload nginx

for i in {1..30}; do
  if curl --fail --silent http://127.0.0.1:8001/api/health/ >/dev/null; then
    echo "ContainQR deploy completed successfully."
    exit 0
  fi
  sleep 1
done

echo "ContainQR failed health check after restart." >&2
exit 1
