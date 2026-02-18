# CargoFlow 🚚

Production-grade **Logistics & Delivery Management System** — Django 5 + DRF backend, React + Vite frontend.

## Features

- **Multi-tenancy** — every object scoped to a `Tenant`
- **Roles** — `OPS_ADMIN`, `OPS_DISPATCHER`, `DRIVER`
- **Order status machine** — CREATED → ASSIGNED → PICKED_UP → IN_TRANSIT → DELIVERED / FAILED / CANCELLED
- **Route management** — daily driver routes with nearest-neighbour stop optimisation
- **POD** — photo + signature proof-of-delivery
- **Exceptions** — DELAY, FAILED_ATTEMPT, WRONG_ADDRESS, CUSTOMER_UNAVAILABLE, DAMAGED, OTHER
- **Real-time** — Django Channels WebSockets for live ops + driver updates
- **Webhooks** — outbox pattern with exponential back-off retry
- **Customer tracking** — privacy-safe public tracking page
- **Celery** — outbox processor, delay detection, route reminders

## Tech Stack

| Layer | Stack |
|---|---|
| Backend | Python 3.11, Django 5, DRF 3.14, PostgreSQL 15, Redis 7 |
| Auth | simplejwt — JWT with role + tenant claims |
| Async | Celery 5, django-celery-beat, Django Channels 4 |
| Docs | drf-spectacular → `/api/docs/` Swagger, `/api/redoc/` |
| Frontend | React 18, Vite 5, TypeScript, TanStack Query v5, Tailwind CSS |

## Quick Start (Docker)

```bash
cp .env.example .env        # edit DB/Redis URLs if needed
make build && make up       # build images + start stack
make migrate                # run migrations
make seed                   # seed demo tenant + users
open http://localhost        # frontend
open http://localhost:8000/api/docs/   # Swagger
```

Demo credentials (password: **demo1234**):
- Admin: `admin@demo.demo`
- Dispatcher: `dispatcher@demo.demo`
- Driver 1: `driver1@demo.demo`

## Local Development

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements/dev.txt
DJANGO_ENV=dev python manage.py migrate
DJANGO_ENV=dev python manage.py seed_demo_data
DJANGO_ENV=dev python manage.py runserver

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

## Project Structure

```
cargoflow/
├── backend/
│   ├── apps/users/         # Tenant, User, auth endpoints
│   ├── apps/logistics/     # Orders, Routes, Drivers, Vehicles, POD, Exceptions
│   ├── apps/notifications/ # Push tokens, notification log
│   ├── api/v1/             # URL router
│   ├── common/             # Pagination, permissions, middleware
│   └── config/             # Django settings split, Celery, ASGI
├── frontend/src/
│   ├── api/                # Axios client + typed endpoint functions
│   ├── features/auth/      # Login, Register, AuthContext, RequireAuth
│   ├── features/ops/       # Ops dashboard, orders, routes, drivers, exceptions
│   ├── features/driver/    # Driver mobile UI (home + route detail)
│   └── features/tracking/  # Customer public tracking page
├── infra/docker/           # Dockerfiles + nginx config
├── docker-compose.yml
├── Makefile
└── .env.example
```

## API Reference

```
POST /api/v1/auth/register/          Register tenant + admin
POST /api/v1/auth/login/             Login → JWT
GET  /api/v1/auth/me/                Current user

GET/POST /api/v1/ops/orders/         List / create orders
GET      /api/v1/ops/orders/:id/     Order detail
POST     /api/v1/ops/orders/:id/cancel/
POST     /api/v1/ops/orders/:id/reassign/
GET/POST /api/v1/ops/routes/
POST     /api/v1/ops/routes/:id/reorder/
GET/POST /api/v1/ops/drivers/
GET/POST /api/v1/ops/vehicles/
GET      /api/v1/ops/exceptions/
POST     /api/v1/ops/exceptions/:id/ack/
POST     /api/v1/ops/exceptions/:id/resolve/

GET  /api/v1/driver/routes/today/
POST /api/v1/driver/routes/:id/start/
POST /api/v1/driver/orders/:id/status/
POST /api/v1/driver/orders/:id/pod/
POST /api/v1/driver/scan/

GET /api/v1/tracking/:token/         Public — no auth required
GET /api/v1/health/
```

## Tests

```bash
cd backend && pytest
```

## Branch Strategy

```
main ← staging ← development ← feature/<name>
```

See `GIT_WORKFLOW.md` and `CONTRIBUTING.md`.
