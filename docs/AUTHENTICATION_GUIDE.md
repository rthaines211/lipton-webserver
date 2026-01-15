# Authentication Architecture Guide

**Last Updated**: January 15, 2026

## Overview

The application uses a dual authentication system:
1. **Session-based password authentication** for form access
2. **Token-based authentication** for admin/API access (optional)

## Authentication Flow

### Form Access (Session-Based)
```
User → Form URL (docs/agreement.liptonlegal.com)
  ↓
Password prompt (if not authenticated)
  ↓
Session cookie stored
  ↓
Access granted to form and API endpoints
```

### Admin Access (Token-Based)
```
Admin → Any protected endpoint
  ↓
Check for token in query (?token=xxx) or header (Bearer xxx)
  ↓
Validate against ACCESS_TOKEN env var
  ↓
Access granted or 401 Unauthorized
```

## Middleware Chain

**File**: `server.js`

```javascript
// 1. Token authentication (optional, can be disabled)
app.use(requireAuth);

// 2. Domain restriction (prevents cross-form access)
app.use(restrictFormAccess);

// 3. Session middleware
app.use(session({...}));

// 4. Form-specific password authentication
app.use('/forms/docs/', createPasswordAuth('docs', PASSWORD_DOCS));
app.use('/forms/agreement/', createPasswordAuth('agreement', PASSWORD_AGREEMENT));
```

## Authentication Exemptions

**File**: `middleware/auth.js`

The following paths are **exempt from token authentication**:

### Always Exempt
```javascript
// Health checks and monitoring
/health
/health/ready
/health/detailed
/metrics

// Root redirect
/

// Form pages (have their own password auth)
/forms/*

// Static assets
*.js, *.css, *.png, *.jpg, *.svg, etc.
```

### Form API Endpoints (Exempt)
```javascript
// Document generation form APIs
/api/form-entries
/api/form-entries/:id

// Contingency agreement form APIs
/api/contingency-entries
/api/contingency-entries/:caseId
/api/contingency-entries/:caseId/download

// PDF generation APIs
/api/pdf/generate
/api/pdf/status/:jobId
/api/pdf/download/:jobId
/api/pdf/retry/:jobId
/api/pdf/events/:jobId

// Pipeline integration (DOCX generation)
/api/pipeline-*
/api/jobs/*
/api/regenerate-documents/*
```

## Configuration

### Environment Variables

```bash
# Token Authentication (Optional)
REQUIRE_AUTH=false                    # Set to 'false' to disable token auth
ACCESS_TOKEN=your-secret-token        # Admin access token

# Session Authentication (Required for forms)
SESSION_SECRET=your-session-secret    # Session encryption key

# Form Passwords
PASSWORD_DOCS=lipton-discovery-2026
PASSWORD_AGREEMENT=lipton-discovery-2026
```

### Session Configuration

**Cloud Run Compatible Settings**:
```javascript
session({
    secret: process.env.SESSION_SECRET,
    resave: true,                      // Force save on each request
    saveUninitialized: true,           // Save empty sessions
    proxy: true,                       // Trust proxy headers
    cookie: {
        secure: NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,   // 24 hours
        sameSite: 'lax'
    }
})
```

## Domain-Specific Access

**File**: `middleware/domain-restriction.js`

Each form is restricted to its own domain:

| Domain | Allowed Form | Blocked Form |
|--------|-------------|--------------|
| `docs.liptonlegal.com` | `/forms/docs/` | `/forms/agreement/` (403) |
| `agreement.liptonlegal.com` | `/forms/agreement/` | `/forms/docs/` (403) |

## Common Authentication Issues

### Issue 1: 401 Unauthorized on Form Submission

**Symptoms**: Form submission fails with "Unauthorized" error

**Causes**:
1. Token authentication not disabled for form API endpoints
2. SESSION_SECRET not set or mismatched
3. Session cookie not being sent (CORS issue)

**Solution**:
```javascript
// Ensure API endpoints are exempt in middleware/auth.js
if (req.path.startsWith('/api/form-entries') ||
    req.path.startsWith('/api/contingency-entries')) {
    return next();
}
```

### Issue 2: SSE Stream Disconnecting

**Symptoms**: Real-time progress updates not working, 401 errors in console

**Causes**:
1. SSE endpoints require long-lived connections
2. Token auth blocking streaming endpoints

**Solution**:
```javascript
// Exempt SSE and job endpoints
if (req.path.startsWith('/api/jobs/') ||
    req.path.startsWith('/api/pipeline-')) {
    return next();
}
```

### Issue 3: Session Not Persisting

**Symptoms**: Login prompt keeps reappearing, password not saving

**Causes**:
1. Cloud Run ephemeral storage
2. Session config not Cloud Run compatible
3. Multiple instances not sharing sessions

**Solution**:
```javascript
// Enable these for Cloud Run
resave: true,
saveUninitialized: true,
proxy: true
```

**Long-term**: Use PostgreSQL session store (`connect-pg-simple`)

### Issue 4: NGINX Not Passing Hostname

**Symptoms**: Wrong form showing, redirects to wrong domain

**Cause**: NGINX not passing X-Forwarded-Host header

**Solution**:
```nginx
location / {
    proxy_set_header X-Forwarded-Host $host;  # Required!
    proxy_pass https://$backend;
}
```

## Security Best Practices

### 1. Password Protection
- ✅ Use session-based auth for user-facing forms
- ✅ Separate passwords for different forms
- ✅ Logout functionality on each form
- ⚠️ Consider password rotation policy

### 2. Token Authentication
- ✅ Optional for admin access only
- ✅ Exempt all user-facing endpoints
- ✅ Use secrets for token storage
- ⚠️ Implement token rotation

### 3. Session Security
- ✅ `httpOnly: true` - Prevent XSS
- ✅ `secure: true` in production - HTTPS only
- ✅ `sameSite: 'lax'` - CSRF protection
- ✅ 24-hour expiration

### 4. Domain Restrictions
- ✅ Prevent cross-domain form access
- ✅ Return 403 (not 404) for blocked access
- ✅ Check both `x-forwarded-host` and `host` headers

## Debugging Authentication

### Check Session Status
```javascript
// Add to route handler
console.log('Session data:', req.session);
console.log('Authenticated:', req.session.authenticated);
console.log('Form:', req.session.formType);
```

### Check Headers
```javascript
console.log('Host:', req.headers.host);
console.log('X-Forwarded-Host:', req.headers['x-forwarded-host']);
console.log('Authorization:', req.headers.authorization);
```

### Cloud Run Logs
```bash
# Check auth failures
gcloud logging read "resource.labels.service_name=node-server AND severity>=ERROR" \
  --limit 50 --format json | jq -r '.[] | select(.jsonPayload.message | contains("Unauthorized"))'

# Check session issues
gcloud logging read "resource.labels.service_name=node-server" \
  --limit 100 --format json | jq -r '.[] | select(.jsonPayload.message | contains("session"))'
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Cloudflare                            │
│                    (SSL Termination)                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   NGINX (VM)         │
              │  - Route by domain   │
              │  - Pass X-Fwd-Host   │
              └──────────┬───────────┘
                         │
                         ▼
              ┌─────────────────────────────────┐
              │   Cloud Run (node-server)        │
              │                                  │
              │  1. requireAuth                  │
              │     ├─ Exempt: /forms/*         │
              │     ├─ Exempt: /api/form-*      │
              │     ├─ Exempt: /api/pipeline-*  │
              │     └─ Exempt: /api/jobs/*      │
              │                                  │
              │  2. restrictFormAccess           │
              │     ├─ docs → /forms/docs/      │
              │     └─ agreement → /forms/agr/  │
              │                                  │
              │  3. session middleware           │
              │     └─ Cloud Run compatible      │
              │                                  │
              │  4. createPasswordAuth           │
              │     ├─ /forms/docs/             │
              │     └─ /forms/agreement/        │
              │                                  │
              └─────────────────────────────────┘
```

## Related Documentation

- [CONTINGENCY_FORM_DEPLOYMENT_COMPLETE.md](../CONTINGENCY_FORM_DEPLOYMENT_COMPLETE.md) - Full deployment guide
- [middleware/auth.js](../middleware/auth.js) - Token authentication implementation
- [middleware/domain-restriction.js](../middleware/domain-restriction.js) - Domain restriction logic
- [middleware/password-auth.js](../middleware/password-auth.js) - Session-based password auth

---

**Note**: This authentication architecture was designed specifically for Cloud Run deployment with NGINX reverse proxy. Session persistence across instances is limited without a shared session store.
