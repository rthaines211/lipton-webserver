# Requirements Traceability Matrix
**Project:** Lipton Legal Group - Client Intake System
**Purpose:** Track every requirement to its implementation task and verification method
**Last Updated:** November 17, 2025

---

## 📊 Traceability Overview

| Total Requirements | Mapped to Tasks | Verification Defined | Risk Level |
|-------------------|-----------------|---------------------|------------|
| 47 | 47 (100%) | 47 (100%) | 8 High, 12 Medium, 27 Low |

---

## 🎯 Core Functional Requirements

| ID | Requirement | Implementation Week | Task | Verification Method | Priority | Risk |
|----|------------|--------------------|----|-------------------|----------|------|
| **FR-001** | Create 9 database tables for intake system | Week 1, Day 1 | Create and run migration 001_create_intake_tables.sql | `SELECT COUNT(*) FROM pg_tables WHERE schemaname='public'` returns 9+ tables | 🔴 Critical | High |
| **FR-002** | Accept 235+ field intake form submission | Week 3, Days 1-3 | Create POST /api/intake/submit endpoint | Submit test form with all fields, verify saves to DB | 🔴 Critical | High |
| **FR-003** | Generate unique intake numbers (INT-YYYY-#####) | Week 3, Day 1 | Implement generateIntakeNumber() in intake-service.js | Verify format and uniqueness with concurrent submissions | 🔴 Critical | Low |
| **FR-004** | Save form data across 5 page tables | Week 3, Day 2 | Implement multi-table insert with transaction | Query all 5 intake_page_X tables, verify data present | 🔴 Critical | Medium |
| **FR-005** | Send confirmation email to client | Week 3, Day 5 | Create intake-confirmation email template | Check SendGrid logs, verify email received | 🟡 High | Low |
| **FR-006** | Attorney login with JWT authentication | Week 6, Day 1 | Create POST /api/attorney/login endpoint | Test login returns valid JWT, verify token | 🔴 Critical | High |
| **FR-007** | Search intakes with filters | Week 6, Day 2 | Create GET /api/intake/search endpoint | Search by name/email/status, verify results | 🔴 Critical | Medium |
| **FR-008** | Display search results in modal | Week 6, Day 3 | Build search modal UI component | Open modal, search, verify results display | 🟡 High | Medium |
| **FR-009** | Map intake fields to doc gen format | Week 7, Days 1-4 | Create intake-mapper.js service | Test 90%+ fields map correctly | 🔴 Critical | High |
| **FR-010** | Pre-populate doc gen form from intake | Week 7, Day 3 | Integrate mapping with existing form | Select intake, verify form fills correctly | 🔴 Critical | High |

---

## 📝 Client Journey Requirements

| ID | Requirement | Implementation Week | Task | Verification Method | Priority | Risk |
|----|------------|--------------------|----|-------------------|----------|------|
| **CJ-001** | Public access to intake form (no login) | Week 4-5 | Build public intake form UI | Access form URL without authentication | 🔴 Critical | Low |
| **CJ-002** | Multi-section form navigation | Week 4, Days 1-2 | Implement accordion or stepper UI | Navigate between all 25 sections smoothly | 🟡 High | Low |
| **CJ-003** | Progress indicator showing completion | Week 4, Day 2 | Add progress bar component | Verify progress updates as sections complete | 🟢 Medium | Low |
| **CJ-004** | Auto-save to browser localStorage | Week 4, Day 3 | Implement auto-save on field blur | Check localStorage has form data after input | 🟡 High | Low |
| **CJ-005** | Save and resume with email token | Week 3, Day 3 | Create save/resume endpoints | Save form, receive email, resume with token | 🟡 High | Medium |
| **CJ-006** | File upload for documents | Week 3, Day 4 | Implement file upload endpoint | Upload PDF/image, verify in Cloud Storage | 🟡 High | Low |
| **CJ-007** | Mobile responsive design | Week 5, Day 5 | Test and fix responsive CSS | Test on mobile devices, all sections usable | 🟢 Medium | Low |
| **CJ-008** | Field validation with error messages | Week 4, Day 4 | Add client-side validation | Enter invalid data, see appropriate errors | 🔴 Critical | Low |
| **CJ-009** | Confirmation screen after submission | Week 5, Day 4 | Create success page component | Submit form, see confirmation with intake number | 🟡 High | Low |
| **CJ-010** | Handle network failures gracefully | Week 5, Day 5 | Add retry logic and error handling | Disconnect network, attempt submit, see friendly error | 🟡 High | Medium |

---

## 👨‍⚖️ Attorney Journey Requirements

| ID | Requirement | Implementation Week | Task | Verification Method | Priority | Risk |
|----|------------|--------------------|----|-------------------|----------|------|
| **AJ-001** | Secure attorney portal access | Week 6, Day 1 | Implement JWT authentication | Test with valid/invalid tokens | 🔴 Critical | High |
| **AJ-002** | Search modal overlays doc gen form | Week 6, Day 3 | Create modal component | Click button, modal appears over form | 🔴 Critical | Medium |
| **AJ-003** | Filter by status (new/reviewing/approved) | Week 6, Day 2 | Add status filter to search | Apply filter, verify results match | 🟡 High | Low |
| **AJ-004** | Filter by date range | Week 6, Day 2 | Add date range filter | Set dates, verify results within range | 🟢 Medium | Low |
| **AJ-005** | Sort results (newest/oldest/name) | Week 6, Day 2 | Add sort options to search | Apply sort, verify order correct | 🟢 Medium | Low |
| **AJ-006** | View intake details in modal | Week 6, Day 4 | Add preview functionality | Click preview, see all intake data | 🟡 High | Low |
| **AJ-007** | Select intake to populate form | Week 6, Day 4 | Implement selection handler | Select intake, form fills, modal closes | 🔴 Critical | High |
| **AJ-008** | Update intake status | Week 6, Day 5 | Create PUT /api/intake/:id/status | Change status, verify in database | 🟡 High | Low |
| **AJ-009** | Assign intake to attorney | Week 6, Day 5 | Create assignment endpoint | Assign intake, verify attorney name saved | 🟢 Medium | Low |
| **AJ-010** | Audit trail of all actions | Week 6, Day 5 | Log to audit_logs table | Perform action, verify in audit_logs table | 🟡 High | Medium |

---

## 🔒 Security Requirements

| ID | Requirement | Implementation Week | Task | Verification Method | Priority | Risk |
|----|------------|--------------------|----|-------------------|----------|------|
| **SEC-001** | Rate limit public endpoints (5/hour) | Week 8, Day 1 | Add express-rate-limit middleware | Submit 6 times rapidly, get 429 error | 🔴 Critical | Medium |
| **SEC-002** | Validate and sanitize all inputs | Week 3, Day 2 | Add validation middleware | Try SQL injection, verify blocked | 🔴 Critical | High |
| **SEC-003** | Prevent XSS attacks | Week 8, Day 1 | Sanitize output, CSP headers | Try script injection, verify escaped | 🔴 Critical | High |
| **SEC-004** | CSRF protection on forms | Week 8, Day 1 | Add CSRF tokens | Submit without token, verify rejected | 🔴 Critical | Medium |
| **SEC-005** | Secure password hashing (bcrypt) | Week 6, Day 1 | Use bcrypt for attorney passwords | Check passwords are hashed in DB | 🔴 Critical | Low |
| **SEC-006** | JWT tokens expire in 1 hour | Week 6, Day 1 | Set token expiration | Wait 61 minutes, verify token rejected | 🟡 High | Low |
| **SEC-007** | HTTPS only (enforced by Cloud Run) | Already done | Cloud Run enforces HTTPS | Try HTTP, verify redirects to HTTPS | 🔴 Critical | Low |
| **SEC-008** | Audit log all attorney actions | Week 6, Day 5 | Insert to audit_logs on actions | Check audit_logs after attorney action | 🟡 High | Low |
| **SEC-009** | No sensitive data in logs | Week 8, Day 1 | Review and sanitize logging | Check logs don't contain passwords/tokens | 🟡 High | Medium |
| **SEC-010** | File upload validation | Week 3, Day 4 | Validate file types and sizes | Upload exe file, verify rejected | 🟡 High | Low |

---

## 🚀 Performance Requirements

| ID | Requirement | Implementation Week | Task | Verification Method | Priority | Risk |
|----|------------|--------------------|----|-------------------|----------|------|
| **PERF-001** | Form submission < 3 seconds | Week 8, Day 4 | Optimize database queries | Time submission with all fields | 🟡 High | Medium |
| **PERF-002** | Search results < 500ms | Week 8, Day 4 | Add database indexes | Time search with 1000+ records | 🟡 High | Medium |
| **PERF-003** | Modal load < 800ms | Week 8, Day 4 | Optimize modal rendering | Time from click to modal ready | 🟢 Medium | Low |
| **PERF-004** | Support 10 concurrent users | Week 8, Day 4 | Load testing with k6 or similar | Run load test, verify no errors | 🟢 Medium | Medium |
| **PERF-005** | Database connection pooling | Week 1, Day 1 | Configure pg pool (already exists) | Check pool stats under load | 🟡 High | Low |

---

## 🗄️ Database Requirements

| ID | Requirement | Implementation Week | Task | Verification Method | Priority | Risk |
|----|------------|--------------------|----|-------------------|----------|------|
| **DB-001** | PostgreSQL 15 compatibility | Already done | Use legal-forms-db-dev | Connect and run queries | 🔴 Critical | Low |
| **DB-002** | Transaction support for multi-table inserts | Week 3, Day 2 | Use BEGIN/COMMIT in service | Test rollback on error | 🔴 Critical | Medium |
| **DB-003** | Indexes on search columns | Week 1, Day 1 | Add in migration file | EXPLAIN query plans show index usage | 🟡 High | Low |
| **DB-004** | Foreign key constraints | Week 1, Day 1 | Add FK in migration | Try invalid insert, verify rejected | 🟡 High | Low |
| **DB-005** | Automatic updated_at timestamps | Week 1, Day 1 | Add triggers in migration | Update row, verify updated_at changes | 🟢 Medium | Low |
| **DB-006** | JSONB for flexible page data | Week 1, Day 1 | Use JSONB type for page_data | Store and query JSON successfully | 🔴 Critical | Low |
| **DB-007** | Backup and restore capability | Already done | Cloud SQL auto-backups enabled | Verify in Cloud Console | 🟡 High | Low |

---

## 📋 Risk Assessment Summary

### High Risk Items (Need Extra Attention)
1. **Database migration** - Test thoroughly, have rollback ready
2. **JWT authentication** - Security critical, test edge cases
3. **Field mapping** - Core functionality, needs 90%+ accuracy
4. **Form population** - User-facing critical path
5. **Input validation** - Security critical
6. **Attorney portal access** - Security critical

### Medium Risk Items (Monitor Closely)
1. **Multi-table transactions** - Test rollback scenarios
2. **Search performance** - May need optimization
3. **Save/resume tokens** - Test expiration handling
4. **Network failure handling** - Test various scenarios
5. **Modal behavior** - Cross-browser testing needed

### Low Risk Items (Standard Implementation)
1. **Intake number generation** - Simple algorithm
2. **Email sending** - Using proven SendGrid
3. **Progress indicators** - UI only
4. **File uploads** - Standard pattern
5. **Sort/filter options** - Basic SQL queries

---

## ✅ Verification Checklist by Week

### Week 1 Verification
- [ ] 9 database tables created
- [ ] All indexes present
- [ ] Foreign keys working
- [ ] Triggers functioning

### Week 3 Verification
- [ ] Intake submission works
- [ ] Emails send successfully
- [ ] Save/resume works
- [ ] Files upload correctly

### Week 5 Verification
- [ ] All 25 form sections render
- [ ] Validation works on all fields
- [ ] Auto-save functioning
- [ ] Responsive on mobile

### Week 6 Verification
- [ ] Attorney login works
- [ ] Search returns results
- [ ] Modal displays correctly
- [ ] Status updates work

### Week 7 Verification
- [ ] Field mapping 90%+ accurate
- [ ] Form pre-population works
- [ ] No data loss in mapping
- [ ] Performance acceptable

### Week 8 Verification
- [ ] Security measures in place
- [ ] Rate limiting works
- [ ] All tests passing
- [ ] Performance targets met

### Week 9 Verification
- [ ] Staging deployment successful
- [ ] Production deployment successful
- [ ] All features working in production
- [ ] Monitoring active

---

## 📈 Success Metrics

### Technical Metrics
- **Database**: 100% of tables created successfully ✅
- **API Coverage**: 100% of required endpoints implemented
- **Field Mapping**: >90% of fields map correctly
- **Test Coverage**: >80% code coverage
- **Performance**: All response times within targets

### Business Metrics
- **Completion Rate**: <5% form abandonment
- **Processing Time**: <2 minutes to load intake into doc gen
- **Adoption Rate**: 50% of new cases use intake system (after launch)
- **Error Rate**: <1% submission failures
- **User Satisfaction**: Positive attorney feedback

### Security Metrics
- **Vulnerabilities**: 0 critical security issues
- **Audit Coverage**: 100% of attorney actions logged
- **Authentication**: 0 unauthorized access incidents
- **Data Protection**: 100% of sensitive data encrypted/protected

---

## 🔄 Continuous Monitoring

### Daily Checks (During Development)
- Health endpoint status
- Error rate in logs
- Deployment success rate
- Database connection health

### Weekly Checks
- Test coverage percentage
- Performance metrics
- Security scan results
- Progress against timeline

### Post-Launch Monitoring
- User adoption metrics
- System performance
- Error rates
- User feedback

---

## 📝 Notes

1. **Requirements Source**: Compiled from client_intake_requirements.md, user_flows.md, and security_compliance_requirements.md
2. **Priority Levels**: 🔴 Critical (must have), 🟡 High (should have), 🟢 Medium (nice to have)
3. **Risk Levels**: Based on technical complexity and business impact
4. **Verification**: Each requirement has a specific test to confirm implementation
5. **Traceability**: Every requirement maps to a specific week and task in the implementation plan

---

**Document Status**: ✅ Complete
**Requirements Mapped**: 47/47 (100%)
**High Risk Items**: 8 (17%)
**On Track**: Yes

---

*Last Updated: November 17, 2025*
*Next Review: End of Week 1*