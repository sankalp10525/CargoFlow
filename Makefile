.PHONY: help up down build shell migrate seed logs test lint

help:
	@echo "CargoFlow — available make targets"
	@echo ""
	@echo "  up         Start all services (detached)"
	@echo "  down       Stop and remove containers"
	@echo "  build      Rebuild Docker images"
	@echo "  shell      Open a bash shell in the backend container"
	@echo "  migrate    Run Django migrations"
	@echo "  seed       Seed demo data"
	@echo "  logs       Follow all container logs"
	@echo "  test       Run backend pytest suite"
	@echo "  lint       Run ESLint on frontend"

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

shell:
	docker compose exec backend bash

migrate:
	docker compose exec backend python manage.py migrate

seed:
	docker compose exec backend python manage.py seed_demo_data

logs:
	docker compose logs -f

test:
	cd backend && python -m pytest

lint:
	cd frontend && npm run lint

# Local dev (without Docker)
.PHONY: dev-backend dev-frontend

dev-backend:
	cd backend && DJANGO_ENV=dev python manage.py runserver

dev-frontend:
	cd frontend && npm run dev
