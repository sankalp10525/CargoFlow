#!/bin/sh
set -e

echo "⏳ Waiting for PostgreSQL..."
until pg_isready -h "${POSTGRES_HOST:-db}" -U "${POSTGRES_USER:-cargoflow}" -d "${POSTGRES_DB:-cargoflow}" -q; do
  sleep 1
done
echo "✅ PostgreSQL is up."

echo "🔄 Running migrations..."
python manage.py migrate --noinput

echo "📦 Collecting static files..."
python manage.py collectstatic --noinput --clear

exec "$@"
