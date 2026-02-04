#!/bin/sh
set -e

echo "Waiting for database to be ready..."
# Wait for PostgreSQL to be ready using a simple connection test
RETRIES=30
until nc -z "$DATABASE_HOST" "${DATABASE_PORT:-5432}" 2>/dev/null || [ $RETRIES -eq 0 ]; do
  echo "Waiting for database... ($RETRIES retries remaining)"
  RETRIES=$((RETRIES-1))
  sleep 2
done

if [ $RETRIES -eq 0 ]; then
  echo "Database connection failed!"
  exit 1
fi

echo "Database is ready!"

# Run Prisma migrations
# Prisma Client is already generated during build, no need to regenerate
# DATABASE_URL is already available as environment variable from docker-compose
echo "Running database migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma || npx prisma db push --schema=./prisma/schema.prisma

echo "Starting application..."
exec "$@"

