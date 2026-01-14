# Contingency Agreement Form - Quick Start Guide

## 🎯 Project Overview

Create a new contingency agreement intake form at `agreement.liptonlegal.com` while keeping the existing document generation form at `docs.liptonlegal.com`.

---

## 📋 What's Different from Docs Form?

### Simplified Data Collection
- ✅ Property address only (no filing location)
- ✅ Plaintiff: name, address, unit, email, phone, is_minor, guardian
- ✅ Defendant: first name, last name only
- ❌ No head of household tracking
- ❌ No issue categories (vermin, mold, etc.)

### Single Document Output
- ✅ One contingency agreement per plaintiff (DOCX)
- ❌ No multiple document types (SROGs, PODs, etc.)

### Password Protected
- ✅ Both forms get password protection
- ✅ Separate passwords for docs vs agreement forms

---

## 🗂️ Directory Structure

```
/forms/
  /docs/                    # Existing form (move here)
    index.html
    /js/
      form-submission.js
  /agreement/              # New contingency form
    index.html
    /js/
      form-submission.js
  /shared/                 # Shared resources
    /js/
      sse-client.js
    /css/
      common.css
```

---

## 🚀 Implementation Phases (3-4 Weeks)

### Week 1: Backend & Structure
1. Create feature branch
2. Restructure directories
3. Create database schema
4. Build API endpoints
5. Implement password auth

### Week 2: Frontend
1. Build agreement form HTML
2. Implement form submission JS
3. Add validation
4. Test frontend locally

### Week 3: Integration & Deployment
1. Integrate document generation
2. Configure Cloud Run
3. Set up domain mappings
4. Deploy to production

### Week 4: Testing & Polish
1. User acceptance testing
2. Documentation
3. Final handoff

---

## 📦 Key Technologies

### Document Generation: docxtemplater
```bash
npm install docxtemplater pizzip
```

**Why?**
- ✅ Simple placeholder replacement
- ✅ Fast (~50-100ms per document)
- ✅ Native Node.js
- ✅ No external dependencies

### Password Auth: express-session
```bash
npm install express-session
```

**Why?**
- ✅ Simple session-based auth
- ✅ Separate passwords per form
- ✅ Easy to implement

---

## 🗄️ Database Schema

### New Tables
1. **contingency_agreements** - Main case table
2. **contingency_plaintiffs** - Plaintiff details
3. **contingency_defendants** - Defendant details

### Key Fields
- Case ID, property address
- Document generation status
- Notification settings

---

## 🌐 Domain Setup

### Two Subdomains
- `docs.liptonlegal.com` → Document generation form
- `agreement.liptonlegal.com` → Contingency agreement form

### DNS Configuration
```
Type: CNAME
Name: docs
Value: ghs.googlehosted.com

Type: CNAME
Name: agreement
Value: ghs.googlehosted.com
```

---

## 📄 Document Generation Flow

### Template
- **File**: `LLG Contingency Fee Agreement - Template.docx`
- **Location**: `templates/contingency-agreement-template.docx`

### Placeholders
```
<Plaintiff Full Name>        → "John Doe"
<Plaintiff Full Address>     → "123 Main St, Unit 4"
<Plaintiff Email Address>    → "john@example.com"
<Plaintiff Phone Number>     → "(555) 123-4567"
```

### Output
For a case with 3 plaintiffs:
```
output/contingency-agreements/CA-1234567890/
  ├── CA-1234567890-contingency-agreement-john-doe.docx
  ├── CA-1234567890-contingency-agreement-jane-smith.docx
  └── CA-1234567890-contingency-agreement-bob-johnson.docx
```

---

## 🔐 Security

### Password Protection
Both forms protected by simple login page:
- Session-based authentication
- 24-hour session duration
- Separate passwords per form

### Environment Variables
```bash
DOCS_FORM_PASSWORD=your-secure-docs-password
AGREEMENT_FORM_PASSWORD=your-secure-agreement-password
SESSION_SECRET=your-session-secret-key
```

---

## 🧪 Testing Checklist

### Local Testing
- [ ] Password auth works
- [ ] Form submission saves correctly
- [ ] Guardian selection for minors
- [ ] Document generation triggers
- [ ] Multiple agreements generated (one per plaintiff)
- [ ] Email notifications send

### Production Testing
- [ ] DNS resolution works
- [ ] SSL certificates active
- [ ] Both domains accessible
- [ ] Forms password protected
- [ ] Database saves working
- [ ] Documents uploading to Dropbox

---

## 📚 Documentation Files

1. **CONTINGENCY_AGREEMENT_IMPLEMENTATION_PLAN.md** - Full implementation plan (9 phases)
2. **CONTINGENCY_AGREEMENT_SUMMARY.md** - Executive summary of changes
3. **MULTIPLE_PLAINTIFF_DECISION.md** - Multiple plaintiff strategy details
4. **CONTINGENCY_QUICK_START.md** - This file (quick reference)

---

## 🚦 Getting Started

### Step 1: Review the Plan
```bash
cat docs/CONTINGENCY_AGREEMENT_IMPLEMENTATION_PLAN.md
```

### Step 2: Create Feature Branch
```bash
git checkout -b feature/contingency-agreement-form
```

### Step 3: Install Dependencies
```bash
npm install docxtemplater pizzip express-session
```

### Step 4: Begin Phase 1
Follow the implementation plan starting with directory restructuring.

---

## 🤝 Need Help?

Review these docs in order:
1. **CONTINGENCY_QUICK_START.md** (this file) - Overview
2. **CONTINGENCY_AGREEMENT_SUMMARY.md** - Key decisions
3. **CONTINGENCY_AGREEMENT_IMPLEMENTATION_PLAN.md** - Full details
4. **MULTIPLE_PLAINTIFF_DECISION.md** - Document generation strategy

---

**Ready to build?** Start with Phase 1 of the implementation plan! 🚀
