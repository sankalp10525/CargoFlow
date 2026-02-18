You are GitHub Copilot acting as a senior full-stack engineer. Generate a complete, production-grade Logistics / Delivery Management System called CargoFlow using Django 5 + DRF for backend and React (Vite) for frontend. make sure the UI and UX desgin is upto industry standards and smooth.

This project MUST:
- Run locally using Docker Compose (default path)
- ALSO run without Docker for development
- Be stable end-to-end: create orders → assign driver → route → status updates → POD upload → customer tracking → ops exceptions
- Implement clean domain modeling, strict permissions, and async workflows (Celery + Outbox/events)
- Include verification for every phase (tests, curl commands, UI checks)

CRITICAL:
- Prefer clean, minimal architecture with clear separation: domain models, services, APIs, frontend modules
- Every business rule must be enforced at backend (never rely on frontend)
- Provide seed data scripts for local demo
- Provide OpenAPI docs and usable admin
- Do NOT skip verification steps

==================================================
TECH STACK (MANDATORY)
==================================================
Backend:
- Python 3.11
- Django 5.x
- Django REST Framework
- PostgreSQL 15+
- Redis 7+
- Celery (worker + beat)
- django-filter
- drf-spectacular (OpenAPI)
- simplejwt (JWT)
- django-cors-headers
- django-storages (local by default, allow S3 later)
- Channels (WebSockets) for optional live tracking

Frontend:
- React + Vite + TypeScript
- TanStack Query
- React Router
- React Hook Form + Zod
- Optional map integration (Leaflet or MapLibre)

==================================================
REPOSITORY STRUCTURE
==================================================
/backend
/frontend
/docker-compose.yml
/README.md
/docs/

==================================================
DOMAIN OVERVIEW (CargoFlow)
==================================================
Actors:
- Ops User (Dispatcher / Admin)
- Driver User (Mobile-first workflow)
- Customer (tracking link only, no login)

Core Entities:
- Tenant (multi-tenant logistics client)
- Order (shipment)
- Stop (pickup/drop)
- Route (daily driver route)
- Driver
- Vehicle
- POD (Proof of Delivery)
- StatusHistory (immutable)
- Exception
- Event
- OutboxMessage

Key capabilities:
- Create orders with pickup/drop details
- Assign drivers and create daily routes
- Live status updates (picked up, in transit, delivered)
- Proof of delivery (photo + signature)
- Customer tracking link
- Ops dashboard with delays/exceptions
- Background jobs (route optimization, reminders)
- Webhooks/events
- Scoped tokens (driver app vs ops app)
- Optional realtime tracking via WebSockets
- Offline-ready driver UI (bonus)

==================================================
PHASE 0 — PROJECT SCAFFOLD (MUST PASS)
==================================================
1) Create monorepo structure:
   /backend
   /frontend

2) Docker compose services:
- backend
- frontend
- postgres
- redis
- celery-worker
- celery-beat

3) Requirements:
- healthchecks for postgres + redis
- backend waits for DB
- migrations auto-run in entrypoint
- hot reload volumes for backend/frontend
- .env.example (backend)
- .env.frontend.example (frontend)

Verification:
- docker compose up --build works
- /api/health/ endpoint
- /api/schema/
- /api/docs/
- frontend loads without CORS issues

==================================================
PHASE 1 — AUTH, TENANCY, TOKENS (MUST PASS)
==================================================
Auth:
- JWT auth endpoints:
  - /api/auth/register
  - /api/auth/login
  - /api/auth/me
  - /api/auth/refresh

Roles:
- OPS_ADMIN
- OPS_DISPATCHER
- DRIVER

Tenancy:
- Tenant model
- Every domain object belongs to tenant
- Enforce tenant filtering in querysets

Scoped tokens:
- Ops token → full ops APIs
- Driver token → only assigned routes/orders
- Customer uses public tracking_token

Rate limits:
- tracking endpoint throttled
- driver status endpoints throttled

Verification:
- tenant isolation tests
- role permission tests

==================================================
PHASE 2 — CORE MODELS + STATUS MACHINE (MUST PASS)
==================================================
Models:

Tenant:
- name
- slug
- is_active

Driver:
- tenant FK
- optional user FK
- name
- phone
- is_active

Vehicle:
- tenant FK
- plate_number
- type
- capacity_kg
- is_active

Order:
- tenant FK
- reference_code (unique per tenant)
- customer_name
- customer_phone
- status
- tracking_token (public)
- pickup_window_start/end
- drop_window_start/end
- assigned_route FK nullable
- created_at / updated_at

Stop:
- order FK
- sequence_index
- type (PICKUP/DROP)
- address fields
- lat/lng optional
- scheduled_eta
- actual_arrival_time
- status

Route:
- tenant FK
- route_date
- driver FK
- vehicle FK
- status
- start_time / end_time

POD:
- order FK
- photo
- signature
- receiver_name
- delivered_at
- notes

StatusHistory:
- tenant FK
- order FK
- stop FK nullable
- actor_user FK
- actor_type (OPS/DRIVER/SYSTEM)
- from_status
- to_status
- metadata JSON
- created_at

Exception:
- tenant FK
- order FK
- type
- status
- notes
- created_at
- resolved_at

Event:
- tenant FK
- type
- payload JSON
- created_at

OutboxMessage:
- event FK
- status (pending/processed/failed)
- retries
- next_attempt_at

Order Status Machine:
CREATED -> ASSIGNED
ASSIGNED -> PICKED_UP
PICKED_UP -> IN_TRANSIT
IN_TRANSIT -> DELIVERED
IN_TRANSIT -> FAILED
Any -> CANCELLED (ops only)

Rules:
- transitions validated server-side
- every transition creates StatusHistory
- terminal states protected

Verification:
- tests for allowed/blocked transitions
- history creation test

==================================================
PHASE 3 — ROUTING + ASSIGNMENT FLOWS (MUST PASS)
==================================================
Ops workflows:
- create order with stops
- assign orders to route
- reorder stops
- route optimization heuristic (nearest-neighbor if lat/lng exists)
- ETA calculation hook service

Background jobs:
- route reminders
- delayed-order detection
- webhook dispatch

Verification:
- create route flow via API
- reorder stops works
- celery logs show task execution

==================================================
PHASE 4 — CUSTOMER TRACKING + WEBHOOKS (MUST PASS)
==================================================
Public tracking endpoint:
GET /api/tracking/{tracking_token}

Must return:
- order status
- stops summary
- last update
- optional live location
- POD summary when delivered

Must NOT include:
- internal notes
- driver phone
- tenant data

Webhooks:
- tenant config for webhook URL + secret
- status change -> Event -> Outbox -> Celery sends webhook
- signed payload (HMAC)

Verification:
- webhook retry logic
- signature test

==================================================
PHASE 5 — DRIVER APP + POD (MUST PASS)
==================================================
Driver flows:
- fetch today's route
- start route
- update order status
- upload POD (photo + signature)
- scan order code (optional)

Rules:
- driver can update only assigned orders
- POD required when delivering
- delivery timestamp server-generated

Verification:
- driver scope tests
- POD upload UI check

==================================================
PHASE 6 — REALTIME TRACKING (BONUS)
==================================================
WebSockets:
- driver sends location
- ops dashboard subscribes to route stream
- only latest location stored

Endpoints:
- WS /ws/driver/location
- WS /ws/ops/routes/{id}

==================================================
PHASE 7 — FRONTEND (MUST PASS)
==================================================
Ops UI:
- /login
- /ops/dashboard
- /ops/routes
- /ops/routes/:id
- /ops/orders/:id
- /ops/exceptions

Driver UI:
- mobile-first
- /driver/login
- /driver/today
- /driver/routes/:id
- /driver/orders/:id

Customer UI:
- /track/:tracking_token

Frontend requirements:
- centralized API client
- JWT handling
- TanStack Query hooks
- optimistic updates
- toast error handling

Verification:
- full flow works end-to-end

==================================================
PHASE 8 — ADMIN + QUALITY (MUST PASS)
==================================================
Django admin:
- list_display, filters, search
- route inline stops
- order inline history
- exception management

Add:
- seed_demo_data management command
- tests:
  - tenant isolation
  - transition validation
  - driver restrictions
  - tracking privacy

==================================================
DELIVERABLES
==================================================
1) README.md
- Docker setup
- non-docker setup
- migrations
- seed data
- celery commands

2) docs/FLOWS.md
3) docs/API.md
4) Verification checklist with curl examples

==================================================
API ENDPOINTS + PAYLOADS
==================================================

AUTH
POST /api/auth/register
{
  "tenant_name": "Acme Logistics",
  "tenant_slug": "acme",
  "email": "ops@acme.com",
  "password": "StrongPass123!",
  "full_name": "Ops Admin"
}

POST /api/auth/login
{
  "email": "ops@acme.com",
  "password": "StrongPass123!"
}

GET /api/auth/me

--------------------------------------------------
TENANT WEBHOOK CONFIG
PUT /api/ops/settings/webhook
{
  "enabled": true,
  "url": "https://example.com/webhook",
  "secret": "shared-secret",
  "events": ["order.status_changed", "pod.created"]
}

--------------------------------------------------
DRIVERS
POST /api/ops/drivers
{
  "name":"Ravi Kumar",
  "phone":"+919900001111",
  "email":"ravi@acme.com",
  "password":"DriverPass123!",
  "is_active": true
}

GET /api/ops/drivers

--------------------------------------------------
VEHICLES
POST /api/ops/vehicles
{
  "plate_number":"KA01AB1234",
  "type":"VAN",
  "capacity_kg":1200
}

GET /api/ops/vehicles

--------------------------------------------------
ORDERS
POST /api/ops/orders
{
  "reference_code":"CF-10021",
  "customer_name":"Ananya Sharma",
  "customer_phone":"+918888887777",
  "stops":[
    {
      "sequence_index":1,
      "type":"PICKUP",
      "address_line":"Warehouse",
      "city":"Bengaluru",
      "lat":12.9698,
      "lng":77.75
    },
    {
      "sequence_index":2,
      "type":"DROP",
      "address_line":"Customer Address",
      "city":"Bengaluru",
      "lat":12.9719,
      "lng":77.6412
    }
  ]
}

GET /api/ops/orders
GET /api/ops/orders/{id}

PATCH /api/ops/orders/{id}

POST /api/ops/orders/{id}/cancel
{
  "reason":"Customer cancelled"
}

--------------------------------------------------
ROUTES
POST /api/ops/routes
{
  "route_date":"2026-02-19",
  "driver_id":"uuid",
  "vehicle_id":"uuid",
  "order_ids":["uuid","uuid"],
  "optimize": true
}

GET /api/ops/routes
GET /api/ops/routes/{id}

POST /api/ops/routes/{id}/reorder
{
  "stop_order":["stop1","stop2","stop3"]
}

POST /api/ops/orders/{id}/reassign
{
  "target_route_id":"uuid",
  "note":"Driver reassigned"
}

--------------------------------------------------
EXCEPTIONS
GET /api/ops/exceptions

POST /api/ops/exceptions/{id}/ack
{
  "note":"Investigating"
}

POST /api/ops/exceptions/{id}/resolve
{
  "resolution":"Delivered after delay"
}

--------------------------------------------------
DRIVER APP
GET /api/driver/me
GET /api/driver/routes/today
GET /api/driver/routes/{id}

POST /api/driver/routes/{id}/start

POST /api/driver/orders/{id}/status
{
  "to_status":"PICKED_UP",
  "stop_id":"uuid",
  "metadata":{"notes":"Picked up boxes"}
}

POST /api/driver/orders/{id}/pod
multipart/form-data:
- receiver_name
- photo
- signature
- notes

POST /api/driver/scan
{
  "code":"CF-10021"
}

--------------------------------------------------
CUSTOMER TRACKING
GET /api/tracking/{tracking_token}

Response includes:
- status
- stops
- ETA
- last update
- optional live location
- POD summary

--------------------------------------------------
WEBSOCKETS (BONUS)
WS /ws/driver/location
{
  "route_id":"uuid",
  "lat":12.9712,
  "lng":77.6501
}

WS /ws/ops/routes/{id}

==================================================
STATUS ENUMS
==================================================
Order:
- CREATED
- ASSIGNED
- PICKED_UP
- IN_TRANSIT
- DELIVERED
- FAILED
- CANCELLED

Route:
- PLANNED
- IN_PROGRESS
- COMPLETED
- CANCELLED

Exception:
- DELAY
- FAILED_ATTEMPT
- WRONG_ADDRESS
- CUSTOMER_UNAVAILABLE
- DAMAGED
- OTHER

==================================================
BUSINESS WORKFLOWS (MANDATORY)
==================================================

END-TO-END FLOW

flowchart TD
A[Ops logs in] --> B[Create Order]
B --> C[Assign Driver + Route]
C --> D[Driver starts route]
D --> E[Pickup]
E --> F[In Transit]
F --> G[Deliver + POD]
G --> H[History + Event]
H --> I[Outbox]
I --> J[Celery sends webhook]
G --> K[Customer tracking update]
F --> L{Delay?}
L -->|Yes| M[Create Exception]
M --> N[Ops resolves or reassigns]

STATUS MACHINE

stateDiagram-v2
[*] --> CREATED
CREATED --> ASSIGNED
ASSIGNED --> PICKED_UP
PICKED_UP --> IN_TRANSIT
IN_TRANSIT --> DELIVERED
IN_TRANSIT --> FAILED
CREATED --> CANCELLED
ASSIGNED --> CANCELLED
PICKED_UP --> CANCELLED

EVENT OUTBOX FLOW

flowchart LR
A[User Action] --> B[API]
B --> C[Validate]
C --> D[DB Transaction]
D --> E[Update Domain]
E --> F[Event]
F --> G[Outbox Pending]
G --> H[Commit]
H --> I[Celery]
I --> J[Webhook/Notification]
I --> K[Mark Processed]

PERMISSION FLOW

flowchart TD
A[Request] --> B{Token Type}
B -->|Ops| C[Tenant-scoped access]
B -->|Driver| D{Order on route?}
D -->|No| X[403]
D -->|Yes| E[Allow]
B -->|Tracking Token| F[Read-only public]

==================================================
FINAL RULES
==================================================
- Do not proceed to next phase until current phase verification passes.
- All transitions validated in backend.
- Use transactions for state changes.
- Every status change must create StatusHistory.
- Always enforce tenant isolation.
- Tracking endpoint must never leak internal data.
