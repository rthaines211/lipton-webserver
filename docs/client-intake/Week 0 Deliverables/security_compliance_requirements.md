# Security & Compliance Requirements
## Client Intake System - Lipton Legal Group

**Project**: Client Intake Implementation  
**Document Date**: November 17, 2025  
**Author**: Ryan Haines  
**Version**: 1.0

---

## Executive Summary

This document outlines the security and compliance requirements for the Client Intake System at Lipton Legal Group. The system will handle sensitive client information including personal details, legal matters, and potentially privileged communications. As a legal services provider, Lipton Legal Group must implement robust security controls to protect client data, maintain attorney-client privilege, and comply with applicable data protection regulations.

**Key Security Objectives**:
1. Protect client confidentiality and attorney-client privilege
2. Ensure data integrity throughout the intake process
3. Implement proper access controls for attorneys vs. clients
4. Maintain audit trails for compliance and accountability
5. Secure data at rest and in transit
6. Comply with legal industry data handling standards

---

## 1. Data Classification

### 1.1 Sensitive Data Categories

The client intake system will handle the following types of sensitive information:

#### **Personally Identifiable Information (PII)**
- Full name
- Date of birth
- Social Security Number (if collected)
- Driver's license numbers
- Contact information (email, phone, address)
- Employment information

#### **Legally Privileged Information**
- Description of legal matters
- Communications with attorneys
- Case details and circumstances
- Financial information related to legal matters
- Documents uploaded by clients

#### **Attorney Work Product**
- Attorney notes on submissions
- Case assignments
- Internal status updates
- Review comments

### 1.2 Data Classification Levels

| Classification | Examples | Security Requirements |
|----------------|----------|----------------------|
| **Confidential** | Client legal matters, SSN, financial data | Encryption, access logs, RBAC |
| **Internal** | Attorney assignments, status updates | Access controls, audit trails |
| **Public** | Firm contact info, general intake form structure | Standard web security |

---

## 2. Authentication & Authorization

### 2.1 Client Authentication

**Public Access (No Authentication Required)**
- Clients accessing the intake form do NOT need to create accounts
- Anonymous form submission with email verification
- Resume tokens sent via email for saved sessions (time-limited, single-use recommended)

**Security Controls**:
- Rate limiting on form submissions (prevent spam/abuse)
- CAPTCHA or similar bot protection on form start
- Email verification for resume links
- Token-based access with expiration (30 days recommended)
- CSRF protection on all form submissions

### 2.2 Attorney Authentication

**Required Authentication**
- Attorneys MUST authenticate to access the portal
- Multi-factor authentication (MFA) RECOMMENDED
- Session-based or JWT token authentication

**Authentication Methods** (Choose One):
1. **JWT (JSON Web Tokens)** - Recommended
   - Stateless authentication
   - Token stored in httpOnly cookies (prevent XSS)
   - Short expiration (1-4 hours) with refresh tokens
   - Secret stored in Secret Manager

2. **Session-Based**
   - Server-side sessions stored in database
   - Session IDs in httpOnly cookies
   - Automatic timeout after inactivity (30 minutes)

3. **OAuth 2.0 / OIDC** (Future Enhancement)
   - Integration with Google Workspace (if firm uses G Suite)
   - Single Sign-On (SSO) capability

**Password Requirements**:
- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, special characters
- Password hashing using bcrypt (cost factor 12+) or Argon2
- No password reuse (check against previous 5 passwords)
- Password reset flow with email verification

**Account Lockout**:
- Lock account after 5 failed login attempts
- 15-minute lockout duration
- Alert admin/security team of repeated failures

### 2.3 Role-Based Access Control (RBAC)

**Roles**:

| Role | Access Level | Permissions |
|------|-------------|-------------|
| **Client (Public)** | Form submission only | Submit intake, save/resume, upload docs |
| **Attorney** | Read/review submissions | View all submissions, search, add notes, change status |
| **Admin Attorney** | Full access | All attorney permissions + user management, system settings |
| **System Admin** | Infrastructure | Database access, logs, configuration (IT staff) |

**Access Control Rules**:
- Clients can ONLY access their own submission via resume token
- Attorneys can access ALL submissions in the system
- Admin attorneys can manage other attorney accounts
- System admins have full infrastructure access (separate from attorney portal)

---

## 3. Data Encryption

### 3.1 Encryption at Rest

**Database Encryption**:
- ✅ **Already Implemented**: Cloud SQL uses Google-managed encryption at rest
- All data in PostgreSQL is encrypted by default
- Encryption keys managed by Google Cloud KMS
- No additional configuration required

**Cloud Storage Encryption**:
- ✅ **Already Implemented**: GCS buckets use default Google-managed encryption
- All uploaded documents encrypted automatically
- Consider customer-managed encryption keys (CMEK) if higher control needed

**Application-Level Encryption** (Optional Enhancement):
- Encrypt sensitive fields (SSN, financial data) before storing in database
- Use envelope encryption pattern
- Decryption only when data is displayed to authorized users
- **Priority**: Medium (current encryption sufficient for most cases)

### 3.2 Encryption in Transit

**HTTPS/TLS**:
- ✅ **Already Implemented**: All Cloud Run services use HTTPS by default
- TLS 1.2+ required (TLS 1.3 preferred)
- Strong cipher suites only
- HTTP Strict Transport Security (HSTS) headers enabled

**Internal Communication**:
- ✅ Cloud SQL connections via Unix socket (encrypted by Cloud SQL Proxy)
- Service-to-service calls use HTTPS
- No plaintext credentials in environment variables (use Secret Manager)

**Client Browser**:
- Force HTTPS redirection (no HTTP allowed)
- Set Secure flag on all cookies
- Use httpOnly flag to prevent XSS attacks
- SameSite=Strict on authentication cookies (CSRF protection)

---

## 4. Input Validation & Sanitization

### 4.1 Server-Side Validation

**All Form Inputs MUST Be Validated**:
- Email format validation
- Phone number format validation
- Date range validation (e.g., DOB must be in past)
- String length limits (prevent overflow attacks)
- File upload validation (type, size, content)

**Validation Rules**:
```javascript
// Example validation rules
{
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[\d\s\-\(\)]+$/,
  maxLength: {
    name: 255,
    textField: 1000,
    textArea: 5000
  },
  fileUpload: {
    maxSize: 10 * 1024 * 1024, // 10 MB
    allowedTypes: ['pdf', 'jpg', 'png', 'doc', 'docx'],
    maxFiles: 10
  }
}
```

**SQL Injection Prevention**:
- ✅ Use parameterized queries ONLY (never string concatenation)
- ✅ Use ORM (Sequelize, TypeORM, etc.) with prepared statements
- Validate all database inputs

**XSS Prevention**:
- Sanitize all user inputs before rendering in HTML
- Use Content Security Policy (CSP) headers
- Encode output based on context (HTML, JavaScript, URL)
- Never use `innerHTML` with user content

**CSRF Prevention**:
- Use CSRF tokens on all state-changing requests
- Validate tokens on server side
- SameSite=Strict cookies
- Double-submit cookie pattern (optional backup)

### 4.2 File Upload Security

**Validation**:
- Check file extension against allowlist
- Verify MIME type (not just extension)
- Scan file content (magic bytes) to prevent extension spoofing
- Limit file size (10 MB max recommended)
- Limit total uploads per submission (10 files max)

**Storage**:
- Store files in Cloud Storage (NOT database)
- Generate random filenames (prevent path traversal)
- Store original filename separately in database
- Set appropriate Content-Disposition headers (force download, not execute)

**Virus Scanning** (Optional Enhancement):
- Integrate with Cloud Security Scanner or ClamAV
- Scan all uploads before storing
- Reject infected files
- **Priority**: Medium (low risk for legal documents)

---

## 5. Audit Logging & Monitoring

### 5.1 Audit Log Requirements

**Events to Log**:

| Event Type | Data to Log | Retention |
|------------|-------------|-----------|
| Authentication | Login/logout, failed attempts, MFA, IP address | 1 year |
| Authorization | Access denied events, role changes | 1 year |
| Data Access | Who viewed which submission, when | 1 year |
| Data Modification | Status changes, notes added, edits | 1 year |
| Admin Actions | User creation, role changes, config changes | 2 years |
| Security Events | Suspicious activity, rate limit hits, CSRF failures | 1 year |

**Log Format**:
```json
{
  "timestamp": "2025-11-17T10:30:00Z",
  "event_type": "data_access",
  "user_id": "attorney-uuid",
  "user_email": "attorney@liptonlegal.com",
  "action": "view_submission",
  "resource_id": "submission-uuid",
  "resource_type": "intake_submission",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "success": true,
  "details": {
    "search_query": "client name",
    "results_count": 5
  }
}
```

**Log Storage**:
- ✅ Use Google Cloud Logging (Stackdriver)
- Centralized logging for all Cloud Run services
- Long-term storage in Cloud Storage (if needed beyond default retention)
- Access logs protected by IAM (read-only for attorneys, full access for admins)

### 5.2 Monitoring & Alerting

**Security Alerts**:
- Multiple failed login attempts (5+ in 10 minutes)
- Unusual access patterns (attorney accessing 100+ submissions in 1 minute)
- File upload anomalies (large files, suspicious types)
- Rate limit violations
- Authorization failures (repeated access denied)

**Operational Monitoring**:
- Service uptime and availability
- Database connection pool exhaustion
- High error rates (4xx, 5xx responses)
- Slow query performance (> 1 second)

**Alert Channels**:
- Email to IT/security team
- Slack/Teams integration (optional)
- PagerDuty for critical incidents (optional)

---

## 6. Rate Limiting & DDoS Protection

### 6.1 Application-Level Rate Limiting

**Client Intake Form**:
- Max 5 form submissions per IP per hour (prevent spam)
- Max 10 save/resume requests per session per hour
- Max 50 page navigation events per session (prevent abuse)

**Attorney Portal**:
- Max 100 search queries per attorney per minute
- Max 500 submission views per attorney per hour
- No strict limit on legitimate usage (attorneys need flexibility)

**Implementation**:
- Use Redis or in-memory cache for rate limit counters
- Return HTTP 429 (Too Many Requests) when exceeded
- Provide Retry-After header

### 6.2 DDoS Protection (Optional)

**Google Cloud Armor** (Recommended for Production):
- Layer 7 (application) DDoS protection
- IP allowlist/blocklist
- Geo-blocking if needed
- Rate limiting at edge
- **Cost**: ~$5-10/month
- **Priority**: Medium (implement before launch)

**Alternative**: Cloudflare Free Tier
- Place Cloudflare in front of Cloud Run
- Free DDoS protection
- Free SSL/TLS
- Caching for static assets

---

## 7. Session Management

### 7.1 Attorney Sessions

**Session Configuration**:
- Session timeout: 30 minutes of inactivity
- Absolute timeout: 8 hours (require re-login)
- Secure session cookies: httpOnly, Secure, SameSite=Strict
- Session invalidation on logout

**Session Storage**:
- Option 1: JWT tokens (stateless)
  - Store in httpOnly cookie
  - Include user ID, role, expiration
  - Sign with secret from Secret Manager
  
- Option 2: Database sessions (stateful)
  - Store session data in `attorney_sessions` table
  - Clean up expired sessions daily (cron job)

**Concurrent Sessions**:
- Allow multiple sessions per attorney (different devices)
- Track session IDs in database
- Allow attorney to revoke sessions from profile

### 7.2 Client Resume Sessions

**Token-Based Access**:
- Generate unique UUID token for each save
- Store in `saved_sessions` table with expiration
- Token expires after 30 days
- Single-use token recommended (invalidate after use)
- Email token link to client

**Security**:
- Token must be 128+ bits of entropy (UUID v4)
- No predictable patterns
- HTTPS only for token links
- Token cannot be guessed or enumerated

---

## 8. Data Retention & Deletion

### 8.1 Retention Policies

**Client Intake Submissions**:
- ⚠️ **Current**: 30-day auto-delete in Cloud Storage (form-submissions bucket)
- **Recommendation**: Review with legal team - may be too short
- **Consider**: 7 years (common legal retention period in US)
- Database records: No automatic deletion (keep indefinitely unless specified)

**Attorney Audit Logs**:
- **Minimum**: 1 year retention
- **Recommended**: 3 years for compliance/investigation purposes

**Saved Sessions (Resume Links)**:
- **Current**: 30-day expiration (good)
- Clean up expired sessions automatically (daily cron job)

### 8.2 Right to Deletion

**Client Data Deletion Requests**:
- Provide mechanism for clients to request deletion
- Verify identity before deleting (email confirmation)
- Delete all related data:
  - Database records (intake_submissions, page_data)
  - Uploaded files (Cloud Storage)
  - Audit logs referencing the submission (anonymize if needed for compliance)
- Document deletion in compliance log

**Cascading Deletes**:
- Set up foreign key constraints with `ON DELETE CASCADE`
- Deleting `intake_submission` should delete all related `intake_page_X` records
- Uploaded files must be explicitly deleted from Cloud Storage (not automatic)

---

## 9. Access Controls & IAM

### 9.1 GCP IAM Roles

**Service Accounts**:

| Service Account | Purpose | Permissions |
|-----------------|---------|-------------|
| `node-server@...` | Cloud Run service identity | Cloud SQL Client, Secret Manager Accessor, Storage Object Admin |
| `github-actions@...` | CI/CD deployments | Cloud Run Admin, Artifact Registry Writer, Service Account User |
| Attorney accounts | N/A - application-level | No GCP IAM roles (portal users only) |

**Principle of Least Privilege**:
- Service accounts have ONLY the permissions they need
- No `Owner` or `Editor` roles on service accounts
- Separate staging and production service accounts (if possible)

### 9.2 Database Access Control

**Database Users**:

| User | Environment | Permissions | Purpose |
|------|-------------|-------------|---------|
| `app-user` | Production | SELECT, INSERT, UPDATE, DELETE on intake tables | Application access |
| `app-user-staging` | Staging | Same as prod | Staging application |
| `admin-user` | Both | Full DDL/DML permissions | Schema migrations, maintenance |
| `readonly-user` | Both (optional) | SELECT only | Reporting, analytics |

**Connection Security**:
- ✅ All connections via Cloud SQL Proxy (Unix socket)
- No public IP connections from application
- Database passwords stored in Secret Manager
- Rotate passwords quarterly (or after personnel changes)

### 9.3 Secret Manager Access

**Who Can Access Secrets**:
- Cloud Run service accounts: YES (runtime access)
- Developers: NO (use staging secrets for local dev)
- GitHub Actions: YES (deployment only)

**Secret Rotation**:
- Database passwords: Every 90 days
- API keys: Annually or when compromised
- JWT signing keys: Every 6 months
- Document rotation in security log

---

## 10. Backup & Disaster Recovery

### 10.1 Database Backups

**Current Configuration** (✅ Already Implemented):
- Automated daily backups at 03:00 UTC
- 7-day retention (7 backups stored)
- Transaction log retention: 7 days (point-in-time recovery)

**Enhancements Recommended**:
- **Long-term backups**: Monthly backups kept for 1 year (compliance)
- **Backup testing**: Restore backup to staging quarterly (verify integrity)
- **Cross-region backups**: Store backups in secondary region (disaster recovery)
  - **Cost**: Additional storage costs (~$0.20/GB/month)
  - **Priority**: Low (single-region acceptable for MVP)

### 10.2 Application Backup

**Cloud Storage Files**:
- ✅ Soft delete enabled (7-day retention on deleted files)
- ✅ Versioning available if needed
- Consider: Replicate critical files to second bucket

**Code & Configuration**:
- ✅ Source code in GitHub (version controlled)
- ✅ Container images in Artifact Registry (versioned)
- Infrastructure as Code: Consider Terraform for future (not critical for MVP)

### 10.3 Disaster Recovery Plan

**Recovery Time Objective (RTO)**: 4 hours
- Time to restore service after disaster

**Recovery Point Objective (RPO)**: 24 hours  
- Maximum acceptable data loss (daily backups)

**DR Procedures**:
1. Restore database from latest backup (automated)
2. Redeploy Cloud Run service from last known good image
3. Verify Secret Manager secrets accessible
4. Smoke test critical flows (form submission, attorney login)
5. Monitor logs for errors

**Runbook Location**: Store in GitHub repo (`docs/disaster-recovery.md`)

---

## 11. Compliance Requirements

### 11.1 Legal Industry Standards

**Attorney-Client Privilege**:
- All client communications treated as privileged
- Access restricted to authorized attorneys only
- No third-party access without client consent
- Audit trail of who accessed what

**ABA Model Rules of Professional Conduct**:
- Rule 1.6: Confidentiality of Information
  - Reasonable efforts to prevent unauthorized access
  - Encrypted storage and transmission
- Rule 1.1: Competence
  - Use technology competently (secure systems)

### 11.2 Data Protection Regulations

**GDPR (if serving EU clients)**:
- Right to access: Clients can request their data
- Right to deletion: Clients can request deletion
- Right to portability: Provide data in structured format (JSON/CSV)
- Data breach notification: Report breaches within 72 hours
- **Note**: Consult legal counsel if serving EU clients

**CCPA (California clients)**:
- Right to know what data is collected
- Right to delete personal information
- Right to opt-out of data sale (N/A - no data sale)
- **Note**: Applies if firm has CA clients

**HIPAA (if handling medical records)**:
- Likely NOT applicable unless representing medical clients with PHI
- If applicable: Business Associate Agreement (BAA) with Google Cloud
- **Action**: Determine if HIPAA applies

### 11.3 Record Keeping Requirements

**Document Retention**:
- Client files: As required by state bar rules (typically 5-7 years after case closure)
- Financial records: 7 years (IRS requirement)
- Engagement letters: Indefinitely (or 10+ years)

**Metadata Preservation**:
- Creation dates
- Last modified dates
- Author/modifier information
- Version history (if relevant)

---

## 12. Incident Response

### 12.1 Security Incident Categories

| Severity | Definition | Response Time | Examples |
|----------|-----------|---------------|----------|
| **Critical** | Active attack, data breach | Immediate (< 1 hour) | Database compromised, mass data exfiltration |
| **High** | Potential breach, vulnerability | 4 hours | Suspicious access patterns, vulnerability disclosed |
| **Medium** | Security concern | 24 hours | Failed login attempts, minor config issue |
| **Low** | General security observation | 1 week | Outdated dependency, non-critical alert |

### 12.2 Incident Response Plan

**Step 1: Detection & Triage**
- Monitor alerts from Cloud Logging
- Assess severity and impact
- Document initial findings

**Step 2: Containment**
- Isolate affected systems (disable service if needed)
- Revoke compromised credentials
- Block malicious IPs

**Step 3: Investigation**
- Review audit logs
- Identify scope of breach
- Determine root cause

**Step 4: Eradication**
- Remove malicious code/access
- Patch vulnerabilities
- Update configurations

**Step 5: Recovery**
- Restore from clean backups if needed
- Verify system integrity
- Re-enable services

**Step 6: Post-Incident**
- Document lessons learned
- Update security controls
- Notify affected parties if required
- File regulatory reports if required (e.g., data breach notification)

### 12.3 Data Breach Notification

**Notification Requirements**:
- Clients: Notify within 72 hours (GDPR) or as required by state law
- Regulators: File breach report if required
- State Bar: Report if client data compromised
- Law enforcement: If criminal activity suspected

**Breach Response Team**:
- IT/Security Lead: Ryan Haines (or designated)
- Attorney Partner: [Designated Partner]
- External Counsel: [Privacy attorney if needed]

---

## 13. Security Testing & Validation

### 13.1 Pre-Launch Security Checklist

**Before Production Deployment**:
- [ ] All secrets moved to Secret Manager (no hardcoded credentials)
- [ ] HTTPS enforced on all endpoints
- [ ] CSRF protection enabled
- [ ] Input validation on all forms
- [ ] SQL injection prevention verified (parameterized queries)
- [ ] XSS prevention verified (output encoding)
- [ ] Rate limiting implemented
- [ ] Authentication working (attorney login)
- [ ] Authorization working (RBAC enforced)
- [ ] Audit logging enabled
- [ ] Database backups verified
- [ ] Error messages don't leak sensitive info
- [ ] Security headers configured (CSP, HSTS, X-Frame-Options)

### 13.2 Ongoing Security Activities

**Regular Activities**:
- **Weekly**: Review security alerts and failed login attempts
- **Monthly**: Review audit logs for suspicious patterns
- **Quarterly**: 
  - Update dependencies (npm audit, pip check)
  - Password rotation for service accounts
  - Review and update rate limits
  - Test backup restoration
- **Annually**:
  - Security audit/penetration test (if budget allows)
  - Review and update security policies
  - Security awareness training for attorneys

### 13.3 Vulnerability Management

**Dependency Scanning**:
- Run `npm audit` or `pip check` weekly
- Update packages with known vulnerabilities
- Subscribe to security advisories (Node.js, PostgreSQL, etc.)

**Container Scanning**:
- ✅ Google Container Analysis scans images automatically
- Review vulnerability reports in GCP Console
- Rebuild images with patched base images

**Code Review**:
- Security-focused code reviews for sensitive features (auth, data access)
- Use linters with security rules (ESLint with security plugin)
- Consider static analysis tools (SonarQube, Snyk)

---

## 14. Security Configuration Checklist

### 14.1 Application Security Headers

**Required HTTP Headers**:
```javascript
// Express.js example
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // XSS protection (legacy, but still recommended)
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // HSTS (force HTTPS)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self'; " +
    "frame-ancestors 'none';"
  );
  
  // Permissions policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
});
```

### 14.2 Cookie Security

**Cookie Attributes**:
```javascript
// Session cookie configuration
{
  httpOnly: true,        // Prevent XSS access
  secure: true,          // HTTPS only
  sameSite: 'strict',    // CSRF protection
  maxAge: 1800000,       // 30 minutes
  path: '/',
  domain: '.liptonlegal.com' // Set to your domain
}
```

### 14.3 Database Connection Security

**Connection String (Already Configured)**:
```javascript
// Good: Using Unix socket via Cloud SQL Proxy
const pool = new Pool({
  host: '/cloudsql/docmosis-tornado:us-central1:legal-forms-db',
  database: 'legal_forms_db',
  user: 'app-user',
  password: process.env.DB_PASSWORD, // From Secret Manager
  port: 5432
});

// Use parameterized queries ONLY
const query = 'SELECT * FROM intake_submissions WHERE id = $1';
const result = await pool.query(query, [submissionId]);
```

---

## 15. Security Training & Awareness

### 15.1 Attorney Training

**Required Training Topics**:
- Importance of strong passwords (12+ characters)
- Multi-factor authentication setup
- Recognizing phishing attempts
- Secure handling of client data
- Reporting suspicious activity
- Logging out of shared computers

**Training Schedule**:
- Onboarding: All new attorneys
- Annual: Security refresher for all users
- Ad-hoc: After security incidents

### 15.2 Developer Security Practices

**Secure Coding Guidelines**:
- Never commit secrets to Git
- Always use parameterized queries
- Validate and sanitize all inputs
- Implement least privilege (RBAC)
- Log security events
- Handle errors gracefully (don't leak stack traces to users)

**Code Review Focus**:
- Authentication/authorization logic
- Input validation
- Database queries (SQL injection risk)
- File uploads
- Sensitive data handling

---

## 16. Summary & Action Items

### 16.1 Security Priorities

**Phase 1: MVP Launch (Critical)**
1. ✅ HTTPS enforced (already done)
2. ✅ Database encryption at rest (already done)
3. ⚠️ Attorney authentication (JWT or session-based)
4. ⚠️ RBAC implementation (attorneys vs. clients)
5. ⚠️ Input validation on all forms
6. ⚠️ CSRF protection
7. ⚠️ Rate limiting
8. ⚠️ Audit logging

**Phase 2: Post-Launch (Important)**
9. Multi-factor authentication (MFA) for attorneys
10. Cloud Armor DDoS protection
11. Comprehensive security testing
12. Security headers optimization
13. Backup testing and DR drills

**Phase 3: Ongoing (Continuous Improvement)**
14. Regular security audits
15. Dependency updates and vulnerability scanning
16. Security awareness training
17. Incident response drills

### 16.2 Compliance Checklist

- [ ] Consult with legal counsel on data retention requirements
- [ ] Determine if GDPR, CCPA, or HIPAA apply
- [ ] Document attorney-client privilege protections
- [ ] Create client privacy notice/terms of service
- [ ] Establish data breach notification procedures
- [ ] Implement client data deletion process (if required)

### 16.3 Cost Impact of Security Enhancements

| Enhancement | Cost/Month | Priority |
|-------------|-----------|----------|
| Core security (auth, logging, etc.) | Included | Critical |
| Cloud Armor (DDoS protection) | ~$5-10 | Medium |
| MFA service (e.g., Authy, Duo) | ~$3-10 | High |
| Security scanning tools | ~$0-50 | Low-Medium |
| Penetration testing | One-time: $2,000-5,000 | Medium |

**Estimated Security Cost**: ~$8-20/month ongoing + one-time testing costs

---

## 17. Conclusion

The Client Intake System handles sensitive legal information that requires robust security controls to protect client confidentiality and maintain the integrity of attorney-client privilege. By implementing the security measures outlined in this document, Lipton Legal Group can:

1. **Protect client data** with encryption, access controls, and audit logging
2. **Maintain compliance** with legal industry standards and data protection regulations  
3. **Prevent security incidents** through input validation, rate limiting, and monitoring
4. **Respond effectively** to security incidents with defined procedures
5. **Build client trust** through transparent, secure handling of sensitive information

**Key Takeaways**:
- Most infrastructure security is already in place (encryption, backups, secrets management)
- Focus MVP effort on: authentication, RBAC, input validation, and audit logging
- Budget ~$8-20/month for additional security services (MFA, DDoS protection)
- Regular security reviews and updates are essential for ongoing protection

**Next Steps**:
1. Review this document with legal counsel
2. Prioritize security requirements for MVP launch
3. Implement critical security controls during development (Weeks 1-6)
4. Schedule security testing before production launch (Week 8)
5. Establish ongoing security review cadence (quarterly)

---

## Appendix A: Security Resources

### Security Tools & Libraries

**Node.js Security**:
- `helmet` - Security headers middleware
- `express-rate-limit` - Rate limiting
- `csurf` - CSRF protection
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT authentication
- `validator` - Input validation
- `xss` - XSS sanitization

**Monitoring & Logging**:
- Google Cloud Logging SDK
- Winston or Bunyan (structured logging)
- Sentry (error tracking)

### Security References

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- ABA Cybersecurity Guidelines: https://www.americanbar.org/groups/law_practice/resources/technology/cybersecurity/
- Google Cloud Security Best Practices: https://cloud.google.com/security/best-practices
- NIST Cybersecurity Framework: https://www.nist.gov/cyberframework

---

## Appendix B: Sample Security Configurations

### Sample JWT Configuration
```javascript
const jwt = require('jsonwebtoken');

// Get secret from Secret Manager
const JWT_SECRET = process.env.JWT_SECRET;

// Generate token
function generateToken(attorneyId, email, role) {
  return jwt.sign(
    { 
      sub: attorneyId,
      email: email,
      role: role,
      type: 'access'
    },
    JWT_SECRET,
    { 
      expiresIn: '1h',
      issuer: 'lipton-legal-intake',
      audience: 'attorney-portal'
    }
  );
}

// Verify token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'lipton-legal-intake',
      audience: 'attorney-portal'
    });
  } catch (error) {
    return null; // Invalid or expired
  }
}
```

### Sample Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

// Form submission rate limit
const formSubmitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 submissions per hour
  message: 'Too many form submissions. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Attorney search rate limit
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 searches per minute
  message: 'Too many search requests. Please slow down.',
  skip: (req) => req.user.role === 'admin', // Admins exempt
});

// Apply to routes
app.post('/api/intake/submit', formSubmitLimiter, handleSubmit);
app.get('/api/attorney/search', searchLimiter, handleSearch);
```

### Sample Audit Logging
```javascript
function logSecurityEvent(eventType, userId, action, resource, success, details = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event_type: eventType,
    user_id: userId,
    action: action,
    resource_id: resource?.id,
    resource_type: resource?.type,
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
    success: success,
    details: details
  };
  
  // Send to Cloud Logging
  console.log(JSON.stringify(logEntry));
  
  // Also write to audit_logs table for long-term retention
  await db.query(
    'INSERT INTO audit_logs (event_data) VALUES ($1)',
    [logEntry]
  );
}

// Usage
logSecurityEvent(
  'authentication',
  attorneyId,
  'login',
  null,
  true,
  { method: 'password' }
);

logSecurityEvent(
  'data_access',
  attorneyId,
  'view_submission',
  { id: submissionId, type: 'intake_submission' },
  true,
  { search_query: 'client name' }
);
```

---

**Document Version**: 1.0  
**Last Updated**: November 17, 2025  
**Next Review**: Before MVP launch (Week 8)
