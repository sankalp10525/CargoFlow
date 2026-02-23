#!/bin/sh
set -e

echo "⏳ Waiting for PostgreSQL..."
until python -c "
import psycopg2, os, sys
try:
    psycopg2.connect(
        host=os.environ.get('POSTGRES_HOST','db'),
        dbname=os.environ.get('POSTGRES_DB','cargoflow'),
        user=os.environ.get('POSTGRES_USER','cargoflow'),
        password=os.environ.get('POSTGRES_PASSWORD','cargoflow'),
        connect_timeout=3,
    )
    sys.exit(0)
except Exception:
    sys.exit(1)
" 2>/dev/null; do
  sleep 1
done
echo "✅ PostgreSQL is up."

echo "🔄 Running migrations..."
python manage.py migrate --noinput

echo "📦 Collecting static files..."
python manage.py collectstatic --noinput --clear

exec "$@"
