# Enable GitHub Actions for Staging Branch

## Current State
The staging branch doesn't trigger GitHub Actions deployments. Deployments must be done manually.

## To Enable Automatic Staging Deployments

### Option 1: Add staging to existing workflow

Edit `.github/workflows/ci-cd-main.yml`:

```yaml
on:
  push:
    branches:
      - main
      - develop
      - staging  # Add this line
```

Then in the deployment job, add conditional logic:

```yaml
- name: Deploy to Cloud Run
  run: |
    if [[ "${{ github.ref }}" == "refs/heads/staging" ]]; then
      SERVICE_NAME="node-server-staging"
    elif [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
      SERVICE_NAME="node-server"
    fi

    gcloud run deploy $SERVICE_NAME \
      --region=us-central1 \
      --source=.
```

### Option 2: Create separate staging workflow

Create `.github/workflows/deploy-staging.yml`:

```yaml
name: Deploy to Staging

on:
  push:
    branches:
      - staging
    paths-ignore:
      - 'docs/**'
      - '**.md'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Cloud SDK
        uses: google-github-actions/setup-gcloud@v1
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          project_id: docmosis-tornado

      - name: Deploy to Staging
        run: |
          gcloud run deploy node-server-staging \
            --region=us-central1 \
            --source=. \
            --quiet
```

## Benefits of GitHub Actions

1. **Automatic deployments** on push
2. **Consistent environment** (uses same build environment)
3. **Audit trail** in GitHub Actions tab
4. **No local gcloud CLI needed**

## Current Manual Process

Without GitHub Actions, deployments require:
1. Local gcloud CLI installed
2. Proper authentication
3. Manual command execution
4. More prone to human error

## Recommendation

Add staging to the existing workflow (Option 1) for simplicity and consistency.