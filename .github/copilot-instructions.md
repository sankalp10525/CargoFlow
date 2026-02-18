# Copilot Instructions — Django + React Monorepo

This repo is a production-style monorepo for CargoFlow:

- Backend: Django + Django REST Framework in `/backend`
- Frontend: React (Vite + TypeScript recommended) in `/frontend`
- Infra: Docker and deployment-related config in `/infra`

## High-level rules

- Don't invent features—stick to what's requested.
- Prefer readable code over clever code.
- Follow existing patterns and conventions in the codebase.
- Use type hints in Python; use TypeScript for frontend.
- Keep files small and focused.
- Write tests for business logic.

## Backend conventions (Django/DRF)

- Django project config lives in: `backend/config/`
- Settings are split: `backend/config/settings/{base,dev,prod,test}.py`
- Each domain module is a Django app under: `backend/apps/<domain>/`
- Put:
  - Models in `models.py`
  - Business logic in `services.py`
  - Query/read logic in `selectors.py`
  - DRF serializers in `serializers.py`
  - DRF views/viewsets in `views.py`
  - App urls in `urls.py`
  - Unit tests in `tests/`

### API routing

- API is versioned under `backend/api/v1/`
- New endpoints should be mounted under `/api/v1/`

### Code style

- Use type hints where reasonable.
- Keep functions small and testable.
- Use `select_related/prefetch_related` for performance on list endpoints.
- Return consistent error responses; raise DRF exceptions for validation/permission errors.

## Frontend conventions (React)

- Use feature-based modules under `frontend/src/features/`
- Put API client code in `frontend/src/api/`
- Reusable UI components in `frontend/src/components/`
- Keep components presentational; business logic goes into hooks or feature modules.

## Naming

- Branch naming: `feature/<name>`, `bugfix/<name>`, `hotfix/<name>`
- Commit messages:
  - feat: ...
  - fix: ...
  - refactor: ...
  - chore: ...
  - docs: ...

## When generating code

- Always include minimal tests for core logic.
- Keep code consistent with existing structure.
- Prefer clarity over cleverness.
