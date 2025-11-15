# [PROJECT NAME] Development Guidelines

Auto-generated from all feature plans. Last updated: [DATE]

**Constitution**: See [.specify/memory/constitution.md](../.specify/memory/constitution.md) for governance and principles.

## Active Technologies

[EXTRACTED FROM ALL PLAN.MD FILES]

## Multi-Environment Configuration

This project uses a three-tier environment strategy:

- **Development**: `config/development.env` - Experimental changes, rapid iteration
- **Staging**: `config/staging.env` - Production-like testing, pre-deployment validation
- **Production**: `config/production.env` - Live system, manual approval required

**IMPORTANT**: All changes must be validated in staging before production deployment.

## Project Structure

```text
[ACTUAL STRUCTURE FROM PLANS]
```

## Commands

[ONLY COMMANDS FOR ACTIVE TECHNOLOGIES]

### Environment-Specific Commands

```bash
# Local development
npm start

# Run tests
npm test

# Deploy to staging (via CI/CD)
git push origin main

# Deploy to production (requires manual approval in GitHub Actions)
# Approve deployment in: https://github.com/[org]/[repo]/actions
```

## Code Style

[LANGUAGE-SPECIFIC, ONLY FOR LANGUAGES IN USE]

## Recent Changes

[LAST 3 FEATURES AND WHAT THEY ADDED]

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
