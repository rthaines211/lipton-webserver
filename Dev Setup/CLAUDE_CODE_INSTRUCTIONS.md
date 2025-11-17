# Claude Code Setup Instructions
## Client Intake System Development

This guide will help you set up a complete development environment using Claude Code for the Lipton Legal Group client intake system.

---

## Phase 1: Setup Dev Environment (Run Once)

### Step 1: Download the Setup Script

You've been given a setup script: `setup_dev_environment.sh`

This script will create:
- ✅ Cloud SQL dev database
- ✅ Cloud Storage dev bucket  
- ✅ Secret Manager dev secrets
- ✅ GitHub Actions workflow for auto-deployment
- ✅ Database migration files
- ✅ Cloud Build configuration

### Step 2: Run the Setup Script

```bash
# Make the script executable
chmod +x setup_dev_environment.sh

# Run it (takes 5-10 minutes)
./setup_dev_environment.sh
```

**What happens:**
1. Creates Cloud SQL instance `legal-forms-db-dev`
2. Creates database and user
3. Creates storage bucket
4. Creates secrets in Secret Manager
5. Generates GitHub Actions workflow file
6. Creates initial database migration
7. Creates documentation

**Save the outputs!** The script will print:
- Database password (also in Secret Manager)
- Resources created
- Next steps

### Step 3: Run Database Migration

After the script completes, set up your database schema:

```bash
# Connect to dev database
gcloud sql connect legal-forms-db-dev --user=app-user-dev --database=legal_forms_db_dev

# When prompted, enter the password from the setup script output

# Run the migration
\i migrations/001_create_intake_tables.sql

# Verify tables were created
\dt

# Exit
\q
```

You should see 9 tables created:
- intake_submissions
- intake_page_1 through intake_page_5
- saved_sessions
- attorneys
- audit_logs

### Step 4: Commit Setup Files to Git

```bash
# Add the new files
git add cloudbuild-dev.yaml
git add .github/workflows/deploy-dev.yml
git add migrations/
git add DEV_ENVIRONMENT.md
git add setup_dev_environment.sh

# Commit
git commit -m "Add dev environment configuration and migrations"

# Push to your repo
git push origin main
```

---

## Phase 2: Start Development with Claude Code

### Step 1: Install Claude Code (if not already installed)

```bash
# macOS/Linux
npm install -g @anthropic-ai/claude-code

# Or via Homebrew (macOS)
brew install claude-code
```

### Step 2: Create Your Dev Branch

```bash
# Create a new development branch
git checkout -b dev/intake-system

# Push it to trigger first deployment
git push origin dev/intake-system
```

**This automatically:**
- Triggers GitHub Actions workflow
- Builds your code
- Deploys to `node-server-dev` Cloud Run service
- Takes ~3-5 minutes for first deployment

### Step 3: Get Your Dev Service URL

```bash
# Get the URL of your dev service
gcloud run services describe node-server-dev --region=us-central1 --format='value(status.url)'
```

Example: `https://node-server-dev-zyiwmzwenq-uc.a.run.app`

**Save this URL!** You'll use it for testing.

### Step 4: Initialize Claude Code in Your Repo

```bash
# Navigate to your project directory
cd /path/to/your/repo

# Initialize Claude Code
claude-code init
```

This creates a `.claude/` directory with project configuration.

### Step 5: Start Claude Code

```bash
# Start Claude Code in your repo
claude-code

# Or specify your project
claude-code --project=/path/to/your/repo
```

**Claude Code is now ready!** It can:
- Read/write files in your repo
- Run terminal commands
- Access your file structure
- Help you write code

---

## Phase 3: Development Workflow

### Your Development Loop

1. **Tell Claude Code what to build**
   ```
   You: "Create a route for client intake form submission that saves data to the database"
   ```

2. **Claude Code writes the code**
   - Creates/modifies files
   - Writes tests
   - Updates documentation

3. **Review the changes**
   ```bash
   git status
   git diff
   ```

4. **Commit and push**
   ```bash
   git add .
   git commit -m "Add intake form submission endpoint"
   git push origin dev/intake-system
   ```

5. **Auto-deploys to dev environment**
   - GitHub Actions runs automatically
   - Builds and deploys to `node-server-dev`
   - Check progress: https://github.com/your-org/your-repo/actions

6. **Test the changes**
   ```bash
   # Your dev URL
   curl https://node-server-dev-zyiwmzwenq-uc.a.run.app/health
   
   # Check logs
   gcloud run logs read node-server-dev --region=us-central1 --limit=20
   ```

7. **Iterate**
   - Tell Claude Code to fix issues
   - Repeat steps 2-6

### Example Commands for Claude Code

**Creating a new feature:**
```
"Create a POST endpoint at /api/intake/submit that:
1. Accepts form data from the client
2. Validates all required fields
3. Saves to intake_submissions table
4. Saves page data to intake_page_1 through intake_page_5 tables
5. Returns a confirmation number
6. Include error handling and logging"
```

**Refactoring:**
```
"Refactor the routes/index.js file to:
1. Separate routes into different files by domain
2. Create routes/intake.js for intake endpoints
3. Create routes/attorney.js for attorney endpoints
4. Use Express Router for each module"
```

**Adding tests:**
```
"Write Jest tests for the intake submission endpoint:
1. Test successful submission
2. Test validation errors
3. Test database connection failure
4. Mock the database calls"
```

**Creating middleware:**
```
"Create authentication middleware that:
1. Validates JWT tokens from cookies
2. Extracts attorney ID and role
3. Attaches user info to request object
4. Returns 401 if token is invalid
5. Include proper error handling"
```

---

## Phase 4: Testing Your Changes

### Manual Testing

```bash
# Health check
curl https://node-server-dev-zyiwmzwenq-uc.a.run.app/health

# Test intake form submission (POST)
curl -X POST https://node-server-dev-zyiwmzwenq-uc.a.run.app/api/intake/submit \
  -H "Content-Type: application/json" \
  -d '{"client_email":"test@example.com","page_1_data":{"name":"John Doe"}}'

# View response
```

### Check Logs

```bash
# Recent logs
gcloud run logs read node-server-dev --region=us-central1 --limit=50

# Follow logs (live)
gcloud run logs tail node-server-dev --region=us-central1

# Filter for errors
gcloud run logs read node-server-dev --region=us-central1 --limit=100 | grep ERROR
```

### Query the Database

```bash
# Connect to database
gcloud sql connect legal-forms-db-dev --user=app-user-dev --database=legal_forms_db_dev

# Check submissions
SELECT * FROM intake_submissions ORDER BY created_at DESC LIMIT 10;

# Exit
\q
```

---

## Phase 5: Moving to Staging

When your feature is ready and tested in dev:

```bash
# Merge dev branch to staging
git checkout staging
git merge dev/intake-system
git push origin staging

# This auto-deploys to node-server-staging
```

Test on staging, then merge to main (production) when ready.

---

## Common Claude Code Patterns

### Pattern 1: Building a Feature End-to-End

**You say:**
```
"Build the client intake form feature:
1. Create React component for the 5-page form
2. Create API endpoints for saving/submitting
3. Add auto-save with IndexedDB
4. Create database service layer
5. Add validation and error handling
6. Write tests"
```

**Claude Code will:**
- Create multiple files
- Write backend API
- Write frontend React components
- Add tests
- Update documentation

### Pattern 2: Debugging

**You say:**
```
"The form submission is returning a 500 error. 
Here are the logs: [paste logs]
Help me debug and fix it."
```

**Claude Code will:**
- Analyze the error
- Identify the problem
- Fix the code
- Add better error handling
- Add logging

### Pattern 3: Refactoring

**You say:**
```
"The routes/index.js file is too large (500 lines).
Refactor it into:
- routes/intake.js
- routes/attorney.js  
- routes/admin.js
Maintain all functionality."
```

**Claude Code will:**
- Create new files
- Move code appropriately
- Update imports
- Test that nothing broke

---

## Troubleshooting

### "GitHub Actions deployment failed"

1. Check the Actions tab in GitHub
2. Look at the error logs
3. Common issues:
   - Missing secrets in Secret Manager
   - Service account permissions
   - Syntax errors in code

**Fix:**
```bash
# Check if secrets exist
gcloud secrets list | grep DEV

# Re-run the deployment manually
gcloud run deploy node-server-dev --source=. --region=us-central1
```

### "Can't connect to database"

1. Check if Cloud SQL instance is running:
   ```bash
   gcloud sql instances describe legal-forms-db-dev
   ```

2. Verify credentials in Secret Manager:
   ```bash
   gcloud secrets versions access latest --secret=DB_PASSWORD_DEV
   ```

3. Check Cloud Run service has Cloud SQL connection configured:
   ```bash
   gcloud run services describe node-server-dev --region=us-central1 | grep cloudsql
   ```

### "Claude Code can't access my files"

Make sure you're running `claude-code` from your project root directory:
```bash
cd /path/to/your/repo
claude-code
```

### "Changes aren't deploying"

1. Check if you're on a `dev/*` branch:
   ```bash
   git branch
   ```

2. Make sure you pushed to GitHub:
   ```bash
   git push origin dev/intake-system
   ```

3. Check GitHub Actions is running:
   - Go to your repo on GitHub
   - Click "Actions" tab
   - Look for running workflow

---

## Tips for Working with Claude Code

### Be Specific
❌ "Make the form better"  
✅ "Add client-side validation to the email field using regex, show error message in red below the input"

### Break Down Large Tasks
❌ "Build the entire intake system"  
✅ "First, create the database service layer for intake submissions with CRUD operations"

### Provide Context
❌ "Fix the bug"  
✅ "The form submission fails when the email field is empty. Here's the error log: [paste]. Add validation to check for empty email before submitting."

### Review Changes
Always review Claude Code's changes before committing:
```bash
git diff
```

### Iterate
Claude Code is great at iterating. If something isn't quite right:
```
"That's good, but can you also add error handling for network failures?"
```

---

## Cost Awareness

Your dev environment costs ~$10-13/month. To keep costs low:

1. **Don't over-scale**: Max 5 instances is plenty for dev
2. **Clean up old data**: Database has lifecycle policies
3. **Turn off when not using**: (optional, but you can stop the Cloud SQL instance)

```bash
# Stop Cloud SQL instance (saves money when not developing)
gcloud sql instances patch legal-forms-db-dev --activation-policy=NEVER

# Start it again when you need it
gcloud sql instances patch legal-forms-db-dev --activation-policy=ALWAYS
```

---

## Quick Reference Commands

### Deployment
```bash
# Manual deploy to dev
gcloud run deploy node-server-dev --source=. --region=us-central1

# Check deployment status
gcloud run services describe node-server-dev --region=us-central1

# Get dev URL
gcloud run services describe node-server-dev --region=us-central1 --format='value(status.url)'
```

### Logs
```bash
# Recent logs
gcloud run logs read node-server-dev --region=us-central1 --limit=50

# Follow logs
gcloud run logs tail node-server-dev --region=us-central1

# Filter errors
gcloud run logs read node-server-dev --region=us-central1 | grep ERROR
```

### Database
```bash
# Connect
gcloud sql connect legal-forms-db-dev --user=app-user-dev --database=legal_forms_db_dev

# Run migration
\i migrations/XXX_migration.sql

# List tables
\dt

# Describe table
\d intake_submissions
```

### Git
```bash
# Create dev branch
git checkout -b dev/feature-name

# Commit changes
git add .
git commit -m "Description"
git push origin dev/feature-name

# Merge to staging (when ready)
git checkout staging
git merge dev/feature-name
git push origin staging
```

---

## Next Steps

1. ✅ **Run setup script**: `./setup_dev_environment.sh`
2. ✅ **Run migration**: Connect to database and run `001_create_intake_tables.sql`
3. ✅ **Commit setup files**: Add new files to git
4. ✅ **Create dev branch**: `git checkout -b dev/intake-system`
5. ✅ **Start Claude Code**: `claude-code`
6. 🚀 **Start building!**

---

## What to Build First with Claude Code

I recommend building in this order:

### Week 1: Foundation
1. **Refactor existing routes** - Clean up the codebase
2. **Create service layer** - Separate business logic
3. **Add middleware** - Auth, logging, error handling
4. **Set up testing** - Jest/Mocha framework

### Week 2-3: Database & Core API
5. **Database service** - CRUD operations for intake tables
6. **Intake API endpoints** - POST /submit, POST /save, GET /resume
7. **Validation layer** - Input validation and sanitization
8. **Error handling** - Consistent error responses

### Week 4-5: Frontend
9. **Intake form React components** - 5-page form
10. **Auto-save with IndexedDB** - Save progress locally
11. **Form submission** - API integration
12. **Save & resume** - Token-based resume

### Week 6-7: Attorney Portal
13. **Attorney authentication** - JWT-based login
14. **Search/filter** - Attorney dashboard with search
15. **Submission details** - View full submission
16. **Status management** - Update submission status

### Week 8-9: Testing & Launch
17. **Comprehensive testing** - Unit, integration, E2E
18. **Security review** - Audit logging, rate limiting
19. **Documentation** - API docs, deployment guide
20. **Production deployment** - Staged rollout

---

**You're all set! Start with `./setup_dev_environment.sh` and then fire up Claude Code to begin building! 🚀**
