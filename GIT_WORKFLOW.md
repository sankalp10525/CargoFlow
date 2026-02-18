# Git Workflow - CargoFlow

## Branch Structure

This project follows a production-grade Git branching strategy similar to GitFlow, designed for continuous integration and deployment.

### Main Branches

#### `main`
- **Purpose**: Production-ready code
- **Protection**: Highly protected, no direct commits
- **Merges from**: `staging` (via Pull Request only)
- **Deployment**: Auto-deploys to production environment
- **Rules**:
  - Requires pull request reviews
  - Must pass all CI/CD checks
  - Version tags created here (e.g., `v1.0.0`, `v1.1.0`)

#### `staging`
- **Purpose**: Pre-production testing and QA
- **Protection**: Protected, no direct commits
- **Merges from**: `development` or `hotfix/*` branches
- **Deployment**: Auto-deploys to staging environment
- **Rules**:
  - Requires pull request reviews
  - Must pass all tests
  - Integration testing happens here

#### `development`
- **Purpose**: Integration branch for ongoing development
- **Protection**: Semi-protected
- **Merges from**: `feature/*`, `bugfix/*` branches
- **Deployment**: Auto-deploys to development environment
- **Rules**:
  - Requires pull request
  - Must pass basic CI checks
  - Default branch for new feature branches

---

## Working Branches

### Feature Branches: `feature/<feature-name>`

**When to use**: Developing new features or enhancements

**Naming convention**:
```bash
feature/user-authentication
feature/dashboard-redesign
feature/api-integration
feature/payment-gateway
```

**Workflow**:
```bash
# Create feature branch from development
git checkout development
git pull origin development
git checkout -b feature/my-new-feature

# Work on your feature...
git add .
git commit -m "feat: add user authentication module"

# Push to remote
git push origin feature/my-new-feature

# Create Pull Request to development
```

---

### Bugfix Branches: `bugfix/<bug-name>`

**When to use**: Fixing bugs found in development or staging

**Naming convention**:
```bash
bugfix/login-validation
bugfix/api-timeout
bugfix/broken-navigation
bugfix/memory-leak
```

**Workflow**:
```bash
# Create bugfix branch from development
git checkout development
git pull origin development
git checkout -b bugfix/fix-login-issue

# Fix the bug...
git add .
git commit -m "fix: resolve login validation error"

# Push and create PR to development
git push origin bugfix/fix-login-issue
```

---

### Hotfix Branches: `hotfix/<critical-fix>`

**When to use**: Critical bugs in production that need immediate fixes

**Naming convention**:
```bash
hotfix/security-patch
hotfix/critical-api-error
hotfix/payment-failure
```

**Workflow**:
```bash
# Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/security-patch

# Apply critical fix...
git add .
git commit -m "hotfix: patch security vulnerability"

# Push and create PRs to BOTH staging AND main
git push origin hotfix/security-patch

# After merge, tag the release
git tag -a v1.0.1 -m "Security hotfix"
git push origin v1.0.1
```

**Important**: Hotfixes must be merged back into both `main` AND `development` to keep branches in sync.

---

## Commit Message Convention

Following [Conventional Commits](https://www.conventionalcommits.org/):

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, missing semicolons, etc.)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks, dependency updates
- **perf**: Performance improvements
- **ci**: CI/CD configuration changes
- **build**: Build system changes

### Examples
```bash
feat: add user registration endpoint
feat(auth): implement JWT authentication
fix: resolve database connection timeout
fix(api): handle null pointer in user service
docs: update README with setup instructions
refactor: simplify query logic in project selector
test: add unit tests for workflow transitions
chore: update dependencies to latest versions
```

---

## Pull Request Workflow

### Creating a Pull Request

1. **Ensure your branch is up to date**:
   ```bash
   git checkout development
   git pull origin development
   git checkout feature/my-feature
   git rebase development
   ```

2. **Push your changes**:
   ```bash
   git push origin feature/my-feature
   ```

3. **Create PR on GitHub/GitLab**:
   - Base branch: `development` (or `staging` for releases)
   - Compare branch: your feature/bugfix branch
   - Fill in PR template with:
     - Description of changes
     - Related issues
     - Testing notes
     - Screenshots (if UI changes)

4. **Request reviews** from team members

5. **Address feedback**:
   ```bash
   # Make changes based on review
   git add .
   git commit -m "refactor: address PR feedback"
   git push origin feature/my-feature
   ```

### PR Review Checklist

- [ ] Code follows project style guidelines
- [ ] All tests pass
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] No merge conflicts
- [ ] Commit messages follow convention
- [ ] Changes are atomic and focused

---

## Release Workflow

### Creating a Release

1. **Merge development into staging**:
   ```bash
   # Create release PR
   git checkout staging
   git pull origin staging
   git merge development
   git push origin staging
   ```

2. **Test on staging environment**

3. **Merge staging into main**:
   ```bash
   git checkout main
   git pull origin main
   git merge staging
   git push origin main
   ```

4. **Tag the release**:
   ```bash
   git tag -a v1.2.0 -m "Release version 1.2.0"
   git push origin v1.2.0
   ```

5. **Create release notes** on GitHub/GitLab

### Version Numbering (Semantic Versioning)

```
MAJOR.MINOR.PATCH
```

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

Examples: `v1.0.0`, `v1.1.0`, `v1.1.1`

---

## Common Git Commands

### Syncing with Remote

```bash
# Update local branches
git fetch origin

# Pull latest changes
git pull origin <branch-name>

# Push changes
git push origin <branch-name>
```

### Branch Management

```bash
# List all branches
git branch -a

# Switch to branch
git checkout <branch-name>

# Create and switch to new branch
git checkout -b <branch-name>

# Delete local branch
git branch -d <branch-name>

# Delete remote branch
git push origin --delete <branch-name>
```

### Keeping Feature Branch Updated

```bash
# Option 1: Rebase (cleaner history)
git checkout feature/my-feature
git fetch origin
git rebase origin/development

# Option 2: Merge
git checkout feature/my-feature
git pull origin development
```

### Fixing Mistakes

```bash
# Undo last commit (keep changes)
git reset --soft HEAD~1

# Discard uncommitted changes
git checkout -- <file>
git restore <file>

# Stash changes temporarily
git stash
git stash pop
```

---

## Best Practices

### DO ✅

- Keep commits small and focused
- Write descriptive commit messages
- Pull latest changes before starting work
- Create PRs for code review
- Test locally before pushing
- Keep branches short-lived
- Delete branches after merge
- Use meaningful branch names
- Rebase feature branches regularly

### DON'T ❌

- Commit directly to `main` or `staging`
- Push broken code
- Mix unrelated changes in one commit
- Use generic commit messages ("fix", "update")
- Keep stale branches around
- Force push to shared branches
- Commit sensitive data (keys, passwords)
- Ignore merge conflicts

---

## Emergency Procedures

### Rollback Production

```bash
# Option 1: Revert specific commit
git checkout main
git revert <commit-hash>
git push origin main

# Option 2: Roll back to previous tag
git checkout main
git reset --hard v1.1.0
git push origin main --force  # Use with extreme caution!
```

### Fixing Broken Main Branch

```bash
# Create hotfix from last known good commit
git checkout <last-good-commit>
git checkout -b hotfix/emergency-fix

# Apply fix and create PR to main
```

---

## Branch Protection Rules (Recommended)

### For `main` branch:
- ✅ Require pull request reviews (min 2)
- ✅ Require status checks to pass
- ✅ Require branches to be up to date
- ✅ Restrict who can push
- ✅ Require signed commits
- ✅ No force pushes
- ✅ No deletions

### For `staging` branch:
- ✅ Require pull request reviews (min 1)
- ✅ Require status checks to pass
- ✅ No force pushes

### For `development` branch:
- ✅ Require pull request
- ✅ Require status checks to pass

---

## CI/CD Integration

Branches trigger different workflows:

- **`main`**: Production deployment + release tagging
- **`staging`**: Staging deployment + full test suite
- **`development`**: Dev deployment + integration tests
- **`feature/*`**: Unit tests + linting
- **`bugfix/*`**: Unit tests + linting
- **`hotfix/*`**: Full test suite + security scans

---

## Team Workflow Example

```bash
# Developer A: New Feature
git checkout development
git pull origin development
git checkout -b feature/add-shipping-module
# ... work on feature ...
git add .
git commit -m "feat: add shipping calculation module"
git push origin feature/add-shipping-module
# Create PR to development → Review → Merge

# Developer B: Bug Fix
git checkout development
git pull origin development
git checkout -b bugfix/fix-tracking-api
# ... fix bug ...
git commit -m "fix: resolve tracking API timeout"
git push origin bugfix/fix-tracking-api
# Create PR to development → Review → Merge

# Release Manager: Deploy to Staging
git checkout staging
git pull origin staging
git merge development
git push origin staging
# Test on staging environment

# Release Manager: Deploy to Production
git checkout main
git pull origin main
git merge staging
git push origin main
git tag -a v2.0.0 -m "Release v2.0.0 - Shipping Module"
git push origin v2.0.0
```

---

## Quick Reference

| Branch Type | Created From | Merged Into | Naming |
|-------------|-------------|-------------|--------|
| `feature/*` | `development` | `development` | `feature/feature-name` |
| `bugfix/*` | `development` | `development` | `bugfix/bug-name` |
| `hotfix/*` | `main` | `main` + `development` | `hotfix/critical-fix` |
| Release | `development` | `staging` → `main` | Version tag |

---

## Support

For questions about the Git workflow:
1. Check this document
2. Ask in team chat
3. Review commit history for examples
4. Consult with tech lead

---

**Remember**: Good Git hygiene keeps the codebase clean, deployments smooth, and team collaboration effective!
