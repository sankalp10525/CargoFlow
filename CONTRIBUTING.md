# Contributing to CargoFlow

Thank you for your interest in contributing to CargoFlow! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Code Review](#code-review)

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (recommended)

### Setup Development Environment

1. **Fork the repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/<your-username>/CargoFlow.git
   cd CargoFlow
   ```

2. **Set up upstream remote**
   ```bash
   git remote add upstream https://github.com/sankalp10525/CargoFlow.git
   ```

3. **Run with Docker (Recommended)**
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   docker compose up --build
   ```

4. **Or run locally without Docker**
   
   Backend:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements/dev.txt
   python manage.py migrate
   python manage.py runserver
   ```
   
   Frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Development Workflow

### 1. Create a Branch

Follow our branching strategy (see [GIT_WORKFLOW.md](./GIT_WORKFLOW.md)):

```bash
# Update your local development branch
git checkout development
git pull upstream development

# Create feature branch
git checkout -b feature/your-feature-name

# Or bugfix branch
git checkout -b bugfix/your-bugfix-name
```

### 2. Make Changes

- Write clean, readable code
- Follow existing code style
- Add tests for new functionality
- Update documentation as needed

### 3. Test Your Changes

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test

# Linting
cd backend
ruff check .
black --check .

cd frontend
npm run lint
```

### 4. Commit Your Changes

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git add .
git commit -m "feat: add new shipping calculation feature"
```

See [Commit Guidelines](#commit-guidelines) for more details.

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub from your fork to the main repository's `development` branch.

## Coding Standards

### Python (Backend)

**Style Guide**: PEP 8

**Tools**:
- `ruff` for linting
- `black` for formatting
- Type hints for function signatures

**Best Practices**:
```python
# ✅ Good
def calculate_shipping_cost(
    weight: float,
    distance: float,
    *,
    is_express: bool = False
) -> Decimal:
    """
    Calculate shipping cost based on weight and distance.
    
    Args:
        weight: Package weight in kg
        distance: Shipping distance in km
        is_express: Whether express shipping is requested
        
    Returns:
        Total shipping cost in currency units
    """
    base_cost = weight * distance * BASE_RATE
    if is_express:
        base_cost *= EXPRESS_MULTIPLIER
    return Decimal(base_cost).quantize(Decimal("0.01"))

# ❌ Bad
def calc(w, d, e=False):
    return w * d * 0.5 * (2 if e else 1)
```

**Service Layer Pattern**:
```python
# services.py - Write operations
@transaction.atomic
def shipment_create(*, title: str, origin: str, destination: str, owner: User) -> Shipment:
    """Create a new shipment."""
    shipment = Shipment.objects.create(
        title=title,
        origin=origin,
        destination=destination,
        owner=owner,
    )
    return shipment

# selectors.py - Read operations
def shipment_list(*, owner: User) -> QuerySet[Shipment]:
    """Get all shipments for a user."""
    return Shipment.objects.filter(owner=owner).select_related("owner")
```

### TypeScript/React (Frontend)

**Style Guide**: Airbnb React/TypeScript Style Guide

**Tools**:
- ESLint for linting
- Prettier for formatting
- TypeScript strict mode

**Best Practices**:
```typescript
// ✅ Good
interface ShipmentProps {
  id: number
  title: string
  status: 'pending' | 'in_transit' | 'delivered'
  onUpdate: (id: number) => void
}

export function ShipmentCard({ id, title, status, onUpdate }: ShipmentProps) {
  const handleClick = () => {
    onUpdate(id)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <Badge variant={getStatusVariant(status)}>{status}</Badge>
      </CardHeader>
      <Button onClick={handleClick}>Update</Button>
    </Card>
  )
}

// ❌ Bad
export function ShipmentCard(props: any) {
  return <div>{props.title}</div>
}
```

**Component Organization**:
```
frontend/src/
├── components/      # Reusable UI components
├── pages/           # Page components
├── features/        # Feature-specific modules
├── api/             # API client and types
├── hooks/           # Custom React hooks
├── lib/             # Utilities
└── store/           # State management
```

### Database

**Migrations**:
```bash
# Create migration
python manage.py makemigrations

# Review migration file before committing
# Run migrations
python manage.py migrate
```

**Model Guidelines**:
```python
# ✅ Good
class Shipment(models.Model):
    """Shipment tracking model."""
    
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        IN_TRANSIT = "in_transit", "In Transit"
        DELIVERED = "delivered", "Delivered"
    
    title = models.CharField(max_length=200)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = "shipments"
        ordering = ["-created_at"]
        
    def __str__(self):
        return f"{self.title} ({self.status})"
```

## Testing Guidelines

### Backend Tests

**Location**: `backend/apps/<app>/tests/`

**Structure**:
```python
# tests/test_services.py
import pytest
from apps.shipments.services import shipment_create

@pytest.mark.django_db
class TestShipmentCreate:
    def test_creates_shipment_with_valid_data(self, user):
        shipment = shipment_create(
            title="Test Shipment",
            origin="NYC",
            destination="LA",
            owner=user
        )
        
        assert shipment.id is not None
        assert shipment.title == "Test Shipment"
        assert shipment.owner == user
    
    def test_raises_error_with_invalid_data(self):
        with pytest.raises(ValidationError):
            shipment_create(title="", origin="NYC", destination="LA", owner=None)
```

**Run Tests**:
```bash
# All tests
pytest

# Specific test file
pytest apps/shipments/tests/test_services.py

# With coverage
pytest --cov=apps --cov-report=html
```

### Frontend Tests

**Location**: `frontend/src/__tests__/` or colocated with components

**Structure**:
```typescript
// ShipmentCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { ShipmentCard } from './ShipmentCard'

describe('ShipmentCard', () => {
  it('renders shipment information', () => {
    render(
      <ShipmentCard
        id={1}
        title="Test Shipment"
        status="pending"
        onUpdate={jest.fn()}
      />
    )
    
    expect(screen.getByText('Test Shipment')).toBeInTheDocument()
    expect(screen.getByText('pending')).toBeInTheDocument()
  })
  
  it('calls onUpdate when button clicked', () => {
    const handleUpdate = jest.fn()
    render(
      <ShipmentCard
        id={1}
        title="Test Shipment"
        status="pending"
        onUpdate={handleUpdate}
      />
    )
    
    fireEvent.click(screen.getByText('Update'))
    expect(handleUpdate).toHaveBeenCalledWith(1)
  })
})
```

**Run Tests**:
```bash
npm test
npm run test:coverage
```

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation only changes
- **style**: Code style changes (formatting, missing semicolons, etc.)
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **perf**: Performance improvement
- **test**: Adding missing tests or correcting existing tests
- **build**: Changes to build system or dependencies
- **ci**: Changes to CI configuration files
- **chore**: Other changes that don't modify src or test files

### Examples

```bash
feat: add shipment tracking feature
feat(api): implement real-time tracking endpoint
fix: resolve database connection timeout
fix(auth): handle token expiration correctly
docs: update README with deployment instructions
style: format code with black
refactor: simplify shipment creation logic
test: add unit tests for tracking service
chore: update dependencies
```

### Best Practices

- Use present tense ("add feature" not "added feature")
- Use imperative mood ("move cursor to..." not "moves cursor to...")
- First line should not exceed 72 characters
- Reference issues in footer: `Closes #123`

## Pull Request Process

### Before Submitting

- [ ] Code follows style guidelines
- [ ] Self-reviewed your code
- [ ] Commented hard-to-understand areas
- [ ] Updated documentation
- [ ] Added/updated tests
- [ ] All tests pass locally
- [ ] No linting errors
- [ ] Rebased with target branch

### PR Description

Use the PR template to provide:
- Clear description of changes
- Type of change (feature, bugfix, etc.)
- Related issues
- Testing done
- Screenshots (for UI changes)
- Deployment notes

### After Submitting

1. **Wait for CI checks** - Ensure all automated tests pass
2. **Request reviews** - Tag relevant team members
3. **Address feedback** - Respond to comments and make requested changes
4. **Keep PR updated** - Rebase if conflicts arise
5. **Squash commits** - If requested by reviewers

### Review Timeline

- Routine PRs: 2-3 business days
- Urgent/hotfix PRs: Same day
- Large feature PRs: Up to 1 week

## Code Review

### As a Reviewer

**What to Check**:
- Correctness of logic
- Code quality and readability
- Test coverage
- Performance implications
- Security concerns
- Documentation

**How to Review**:
- Be respectful and constructive
- Explain the "why" behind suggestions
- Distinguish between "must fix" and "nice to have"
- Approve when satisfied
- Request changes if issues found

**Review Comments**:
```markdown
# ✅ Good
Suggestion: Consider using `select_related()` here to reduce database queries.
This will improve performance when loading related objects.

# ❌ Bad
This is wrong. Fix it.
```

### As an Author

**Responding to Feedback**:
- Thank reviewers for their time
- Ask for clarification if needed
- Explain your reasoning if you disagree
- Make requested changes promptly
- Mark conversations as resolved when addressed

## Questions?

- Check existing documentation
- Search for similar issues
- Ask in project discussions
- Contact maintainers

## License

By contributing, you agree that your contributions will be licensed under the project's license.

---

Thank you for contributing to CargoFlow! 🚢
