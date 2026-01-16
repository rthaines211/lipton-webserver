# Legal Form Application

This application provides comprehensive legal forms for document generation and contingency agreement management. The system serves multiple forms on separate domains with password-protected access and automated document generation.

## Active Forms

- **Document Generation Form**: `https://docs.liptonlegal.com` - Discovery document generation (SROGs, PODs, Admissions)
- **Contingency Agreement Form**: `https://agreement.liptonlegal.com` - Client contingency fee agreements with multi-party support

## Features

### Core Functionality
- **Multi-Form Support**: Multiple forms on separate domains with hostname-based routing
- **Password Authentication**: Session-based authentication for each form
- **Dynamic Form Sections**: Add/remove multiple plaintiffs and defendants
- **Minor Plaintiff Support**: Guardian selection for minors in contingency agreements
- **Custom Address Support**: Each plaintiff can use different address from property (✅ **NEW**)
- **Simplified Address Entry**: Combined City, State, Zip fields for faster data entry (✅ **NEW**)
- **Document Generation**: Automated DOCX generation from templates
- **ZIP Downloads**: Bundled document downloads for multi-party agreements
- **Dual Storage System**: JSON files and PostgreSQL database storage
- **REST API**: Full CRUD API for form management

### Document Generation Forms
- **Comprehensive Issue Tracking**: Detailed categories for housing, safety, and legal issues (docs form)
- **CM-110 PDF Generation**: Automated filling of California CM-110 court forms (docs form)
- **Contingency Agreements**: Multi-plaintiff/defendant fee agreements (agreement form)
- **Form Submitter Tracking**: Optional submitter name and email capture with notification opt-in
- **Review Before Submit**: Users can review their submission and make changes before finalizing
- **Structured Data Output**: Generates JSON output matching specifications

### Technical Features
- **Job Queue System**: Asynchronous PDF generation with pg-boss for reliable background processing
- **Dropbox Integration**: ✅ Automatic cloud backup with folder structure preservation - **ACTIVE IN PRODUCTION** (see [DROPBOX_SETUP_COMPLETE.md](DROPBOX_SETUP_COMPLETE.md))
- **Domain Restriction**: Prevents cross-form access between domains
- **Session-Based Authentication**: Password-protected forms with Cloud Run-compatible session management
- **SSE Progress Streaming**: Real-time document generation progress updates
- **Cloud Run Deployment**: Serverless deployment with auto-scaling
- **Health Monitoring**: Health check endpoints and Prometheus metrics
- **Automated Testing**: Playwright tests for form functionality

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm

### Installation

```bash
npm install
```

### Running the Application

1. Start the server:
```bash
npm start
```

2. Open your browser and navigate to:
```
http://localhost:3000
```

### Running Tests

The application includes comprehensive Playwright tests that verify form functionality and output structure.

#### Run all tests:
```bash
npm test
```

#### Run tests with browser visible:
```bash
npm run test:headed
```

#### Debug tests:
```bash
npm run test:debug
```

#### View test results:
```bash
npm run test:report
```

#### Run specific test files:
```bash
npx playwright test tests/simple-form-test.spec.js
```

## Configuration

### Environment Variables

The application uses environment variables for configuration. All variables are defined in the `config/` directory:

- **`config/production.env`** - Production Cloud Run configuration
- **`config/staging.env`** - Staging environment configuration
- **`config/development.env`** - Local development configuration

For local development, copy the development config:
```bash
cp config/development.env .env
```

### Configuration Management

- **Environment Variables Reference**: See [docs/ENVIRONMENT_VARIABLES.md](docs/ENVIRONMENT_VARIABLES.md) for complete documentation of all variables
- **Validation**: Run `npm run validate:env` to check your configuration
- **Secrets**: Sensitive values (passwords, API keys) are managed in GCP Secret Manager

**Key Variables:**
- `NODE_ENV` - Application mode (development/staging/production)
- `DB_*` - PostgreSQL database connection
- `EMAIL_*` - SendGrid email notification settings
- `DROPBOX_*` - Dropbox file upload configuration
- `PIPELINE_API_*` - Python normalization pipeline settings

## Deployment

### Automated Deployment (Recommended)

The application uses GitHub Actions for CI/CD with a **linear promotion model**:

| Branch | Environment | Service | Approval |
|--------|-------------|---------|----------|
| `develop` | Development | `node-server-dev` | Automatic |
| `main` | Staging | `node-server-staging` | Automatic |
| `main` | Production | `node-server` | **Manual (GitHub)** |

> **⚠️ Important:** Pushing to `main` deploys to **staging first**, then requires manual approval in GitHub Actions to promote to production.

### Manual Deployment

```bash
# Deploy to production (bypasses GitHub Actions)
./scripts/deploy.sh production

# Deploy to staging
./scripts/deploy.sh staging

# Fix production configuration
./scripts/fix-cloud-run-env-vars.sh
```

**Complete deployment guide:** [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

## Application Workflow

1. **Fill Out Form**: Users complete the legal form with property, plaintiff, and defendant information
2. **Email Notification Modal**: After clicking submit, users are presented with an optional notification opt-in
   - Enter submitter name and email to receive notifications when documents are processed
   - Click "Skip & Submit" to submit anonymously (submitter_name='Anonymous', submitter_email='')
3. **Data Storage**: Form data is saved to both:
   - JSON file in the `data/` directory
   - PostgreSQL database with relational structure
4. **Success Confirmation**: Upon successful submission, users see a confirmation with their entry ID

## API Endpoints

### Document Generation Form (docs.liptonlegal.com)
- `POST /api/form-entries` - Submit document generation form
- `GET /api/form-entries` - List all document generation entries
- `GET /api/form-entries/:id` - Get specific entry
- `PUT /api/form-entries/:id` - Update entry
- `DELETE /api/form-entries/:id` - Delete entry

### Contingency Agreement Form (agreement.liptonlegal.com)
- `POST /api/contingency-entries` - Submit contingency agreement
- `GET /api/contingency-entries` - List all agreements
- `GET /api/contingency-entries/:caseId` - Get specific agreement
- `PUT /api/contingency-entries/:caseId` - Update agreement
- `DELETE /api/contingency-entries/:caseId` - Delete agreement
- `GET /api/contingency-entries/:caseId/download` - Download all documents as ZIP

### PDF Generation
- `POST /api/pdf/generate` - Generate CM-110 PDF from form data
- `GET /api/pdf/status/:jobId` - Get PDF generation job status
- `GET /api/pdf/download/:jobId` - Download generated PDF
- `POST /api/pdf/retry/:jobId` - Retry failed PDF generation
- `GET /api/pdf/events/:jobId` - Server-Sent Events for real-time progress

### Authentication
- `GET /forms/docs/logout` - Logout from docs form
- `GET /forms/agreement/logout` - Logout from agreement form

### Health & Monitoring
- `GET /health` - Basic health check
- `GET /health/ready` - Readiness probe
- `GET /health/detailed` - Detailed health status with dependencies
- `GET /metrics` - Prometheus metrics

## Form Structure

The form collects:

1. **Property Information**: Address, city, state, ZIP code, filing details
2. **Plaintiff Details**: Name, type, age category, head of household status, comprehensive issue tracking
3. **Defendant Details**: Name, entity type, role (manager/owner)

## Output Format

The application transforms raw form data into a structured JSON format that includes:

- Form metadata
- Plaintiff details with comprehensive discovery information
- Defendant details
- Full address information
- Filing location details

### Example Output Structure

```json
{
  "Form": {
    "Id": "1",
    "InternalName": "AutoPopulationForm",
    "Name": "Auto-Population Form"
  },
  "PlaintiffDetails": [
    {
      "Id": "unique-id",
      "PlaintiffItemNumberName": {
        "First": "John",
        "Last": "Doe",
        "FirstAndLast": "John Doe"
      },
      "PlaintiffItemNumberType": "Individual",
      "PlaintiffItemNumberDiscovery": {
        "VerminIssue": false,
        "Vermin": [],
        "InsectIssues": false,
        "Insects": []
        // ... extensive issue tracking fields
      }
    }
  ],
  "DefendantDetails2": [
    {
      "Id": "unique-id",
      "DefendantItemNumberName": {
        "First": "Jane",
        "Last": "Smith",
        "FirstAndLast": "Jane Smith"
      },
      "DefendantItemNumberType": "LLC",
      "DefendantItemNumberManagerOwner": "Manager"
    }
  ],
  "Full_Address": {
    "Country": "United States",
    "CountryCode": "US"
    // ... complete address information
  }
}
```

## Data Storage

The application uses a dual storage system for comprehensive data management:

### JSON File Storage
- Form submissions are stored as JSON files in the `data/` directory
- Each submission gets a unique timestamp-based ID
- Files are named: `form-entry-{timestamp}-{random}.json`

### PostgreSQL Database Storage
The application stores data in the `legal_forms_db` PostgreSQL database with the following structure:

#### Cases Table
Stores case-level information including:
- Property address, city, state, zip code
- Filing location and county
- **submitter_name**: Name of person who submitted the form (defaults to 'Anonymous' if skipped)
- **submitter_email**: Email address for notifications (defaults to '' if skipped)
- Form metadata and raw payload

#### Parties Table
Stores plaintiff and defendant information:
- Full name, party type (plaintiff/defendant)
- Plaintiff-specific fields: type, age category, head of household
- Defendant-specific fields: entity type, role

#### Party Issue Selections Table
Tracks all issues selected by plaintiffs:
- Links parties to their selected issues (vermin, insects, environmental hazards, etc.)

### Viewing Database Data

To view submitter information from the database:
```bash
psql legal_forms_db -c "SELECT id, submitter_name, submitter_email, property_address, created_at FROM cases ORDER BY created_at DESC LIMIT 10;"
```

For complete form submission details, see the SQL queries section in the project documentation.

## Dropbox Integration ✅ **ACTIVE**

The application **automatically uploads all generated legal documents to Dropbox** for cloud backup and storage. This feature is **fully operational** in both development and production (GCP Cloud Run).

**Production Status:** ✅ **Working** - Documents are automatically uploaded with folder creation and shared link generation.

### Quick Setup

1. Create a Dropbox app at [Dropbox App Console](https://www.dropbox.com/developers/apps)
2. Generate an access token
3. Add to `.env` file:
   ```env
   DROPBOX_ACCESS_TOKEN=your_token_here
   DROPBOX_ENABLED=true
   DROPBOX_BASE_PATH=/Apps/LegalFormApp
   ```
4. Test the integration:
   ```bash
   node test-dropbox-upload.js
   ```

### Features (All Working in Production)

- ✅ Automatic upload after document generation
- ✅ Preserves folder structure: `/Current Clients/[Address]/[Name]/Discovery Propounded/`
- ✅ Automatic folder creation in Dropbox
- ✅ Shared link generation for each case
- ✅ Non-blocking (doesn't delay form submission)
- ✅ Error resilient (continues if upload fails)
- ✅ Comprehensive logging
- ✅ Long-lived access token (never expires)

**Documentation:**
- **Setup Guide:** [DROPBOX_QUICK_START.md](DROPBOX_QUICK_START.md)
- **Full Details:** [DROPBOX_SETUP_COMPLETE.md](DROPBOX_SETUP_COMPLETE.md)
- **Original Docs:** [docs/setup/DROPBOX_SETUP.md](docs/setup/DROPBOX_SETUP.md)

## Testing

The test suite includes:

1. **Form Loading Tests**: Verify all required form elements are present
2. **Form Submission Tests**: Test complete form workflow and data transformation
3. **Multi-Party Tests**: Verify adding multiple plaintiffs and defendants
4. **API Tests**: Validate backend endpoints and data structure
5. **Structure Validation**: Ensure output matches goalOutput.md specification

### Test Coverage

- Form element visibility and interaction
- Dynamic plaintiff/defendant addition
- Form validation and submission
- Data transformation accuracy
- API response validation
- Output structure compliance

## Development

### Project Structure

```
├── index.html          # Main form page with PDF generation UI
├── server.js           # Express server and data transformation
├── styles.css          # Form styling
├── js/                 # Frontend JavaScript modules
│   ├── form-submission.js      # Form handling & submission
│   ├── party-management.js     # Dynamic plaintiff/defendant sections
│   ├── sse-client.js          # Real-time progress updates
│   └── toast-notifications.js  # User feedback
├── server/             # Backend services (NEW)
│   ├── config/         # Configuration files
│   │   ├── cm110-field-mapping.json  # PDF field mappings
│   │   └── database.js               # Database connection
│   ├── models/         # Data models
│   │   └── pdf-generation-job.js     # Job queue model
│   ├── routes/         # API routes
│   │   └── pdf-routes.js             # PDF generation endpoints
│   ├── services/       # Business logic services
│   │   ├── pdf-service.js            # PDF generation & filling
│   │   ├── job-queue-service.js      # Async job management
│   │   ├── sse-service.js            # Server-Sent Events
│   │   └── storage-service.js        # File storage operations
│   └── utils/          # Utility functions
│       ├── pdf-templates.js          # PDF template loading
│       └── pdf-field-mapper.js       # Form-to-PDF field mapping
├── normalization work/
│   └── pdf_templates/  # CM-110 PDF templates
│       ├── cm110.pdf                 # Original encrypted template
│       └── cm110-decrypted.pdf       # Working template
├── tests/              # Playwright test files
├── data/               # Form submission storage
├── monitoring/         # Logging and metrics
├── config/             # Environment configurations
└── package.json        # Dependencies (pdf-lib, pg-boss added)
```

### Form Field Naming Convention

- Property fields: `property-address`, `city`, `state`, etc.
- Plaintiff fields: `plaintiff-{number}-{field}` (e.g., `plaintiff-1-first-name`)
- Defendant fields: `defendant-{number}-{field}` (e.g., `defendant-1-entity`)
- Issue checkboxes: `{category}-{item}-{plaintiff-number}` (e.g., `vermin-RatsMice-1`)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add/update tests as needed
5. Ensure all tests pass: `npm test`
6. Submit a pull request

## 📚 Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[📖 Documentation Index](docs/README.md)** - Start here for all documentation
- **[👤 User Guide](docs/USER_GUIDE.md)** - How to fill out and submit forms
- **[💻 Developer Guide](docs/DEVELOPER_GUIDE.md)** - Development setup and best practices
- **[🏗️ Architecture](docs/ARCHITECTURE.md)** - System design and technical architecture
- **[🔌 API Reference](docs/API_REFERENCE.md)** - Complete REST API documentation
- **[📋 OpenAPI Spec](docs/api/openapi.yaml)** - Machine-readable API specification

### Quick Links

**For Users:**
- [How to Submit a Form](docs/USER_GUIDE.md#filling-out-the-form)
- [Troubleshooting](docs/USER_GUIDE.md#troubleshooting)
- [FAQ](docs/USER_GUIDE.md#faq)

**For Developers:**
- [Development Setup](docs/DEVELOPER_GUIDE.md#development-setup)
- [Running Tests](docs/DEVELOPER_GUIDE.md#testing)
- [Contributing](docs/DEVELOPER_GUIDE.md#contributing)
- [API Examples](docs/API_REFERENCE.md#code-examples)

**For Architects:**
- [System Architecture](docs/ARCHITECTURE.md#system-architecture)
- [Data Flow](docs/ARCHITECTURE.md#data-flow)
- [Scalability](docs/ARCHITECTURE.md#scalability--performance)

## License

MIT License
Testing deployment at Mon Nov  3 08:24:36 EST 2025
