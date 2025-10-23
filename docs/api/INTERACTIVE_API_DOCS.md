# Interactive API Documentation Setup

## Overview

Transform your OpenAPI specification into beautiful, interactive API documentation that lets developers explore, test, and integrate with your API directly from their browser.

This guide covers three popular solutions:
1. **Swagger UI** - Industry standard, feature-rich
2. **ReDoc** - Beautiful, responsive documentation
3. **RapiDoc** - Modern, customizable interface

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Option 1: Swagger UI](#option-1-swagger-ui)
3. [Option 2: ReDoc](#option-2-redoc)
4. [Option 3: RapiDoc](#option-3-rapidoc)
5. [Deployment](#deployment)
6. [Customization](#customization)
7. [Authentication Setup](#authentication-setup)

---

## Quick Start

### Prerequisites

- OpenAPI specification file ([docs/api/openapi.yaml](openapi.yaml))
- Node.js server ([server.js](../../server.js))
- Basic web server knowledge

### 5-Minute Setup (Swagger UI)

```bash
# Install dependencies
npm install --save swagger-ui-dist swagger-ui-express

# Add to server.js (after other requires)
```

```javascript
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

// Load OpenAPI spec
const swaggerDocument = YAML.load('./docs/api/openapi.yaml');

// Serve Swagger UI at /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: "Legal Form API Docs"
}));
```

**Access at:** `http://localhost:3000/api-docs`

---

## Option 1: Swagger UI

### Features

✅ **Try it out** - Execute API calls directly from browser
✅ **Authentication** - Test with Bearer tokens
✅ **Request/Response examples** - See real payloads
✅ **Schema validation** - Validate against OpenAPI spec
✅ **Code generation** - Generate client code in multiple languages

### Full Setup

#### 1. Install Dependencies

```bash
npm install --save swagger-ui-dist swagger-ui-express yamljs
```

#### 2. Create Swagger Route

Create `docs/api/swagger-setup.js`:

```javascript
/**
 * @fileoverview Swagger UI setup for interactive API documentation
 * @module api/swagger-setup
 */

const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

/**
 * Load OpenAPI specification
 * @type {Object}
 */
const swaggerDocument = YAML.load(path.join(__dirname, 'openapi.yaml'));

/**
 * Swagger UI configuration options
 * @type {Object}
 */
const swaggerOptions = {
    // Customize appearance
    customCss: `
        .swagger-ui .topbar {
            display: none;
        }
        .swagger-ui .info .title {
            color: #2c3e50;
        }
    `,
    customSiteTitle: "Legal Form Application - API Documentation",
    customfavIcon: "/logo.png",

    // Swagger UI options
    swaggerOptions: {
        persistAuthorization: true,  // Remember auth token between page refreshes
        displayRequestDuration: true, // Show request timing
        filter: true,                 // Enable search/filter
        tryItOutEnabled: true,        // Enable "Try it out" by default
        docExpansion: 'list',         // How much to expand operations by default
        defaultModelsExpandDepth: 2,  // How much to expand models
        tagsSorter: 'alpha',          // Sort endpoints alphabetically
        operationsSorter: 'alpha',    // Sort operations alphabetically

        // Pre-fill authentication
        onComplete: () => {
            // Auto-fill bearer token if available
            if (window.location.search.includes('token=')) {
                const token = new URLSearchParams(window.location.search).get('token');
                window.ui.preauthorizeApiKey('bearerAuth', token);
            }
        }
    }
};

/**
 * Setup Swagger UI middleware
 * @param {Express} app - Express application
 * @returns {void}
 */
function setupSwagger(app) {
    // Serve Swagger UI at /api-docs
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerOptions));

    // Serve raw OpenAPI spec at /api-docs/openapi.yaml
    app.get('/api-docs/openapi.yaml', (req, res) => {
        res.setHeader('Content-Type', 'application/x-yaml');
        res.sendFile(path.join(__dirname, 'openapi.yaml'));
    });

    // Serve raw OpenAPI spec as JSON at /api-docs/openapi.json
    app.get('/api-docs/openapi.json', (req, res) => {
        res.json(swaggerDocument);
    });

    console.log('📚 Swagger UI available at /api-docs');
}

module.exports = { setupSwagger };
```

#### 3. Add to server.js

```javascript
// Add near top of server.js
const { setupSwagger } = require('./docs/api/swagger-setup');

// Add after middleware setup (before routes)
setupSwagger(app);
```

#### 4. Test It

```bash
# Start server
npm start

# Visit in browser
open http://localhost:3000/api-docs
```

### Advanced Configuration

#### Custom Theme

```javascript
const swaggerOptions = {
    customCss: `
        .swagger-ui .topbar { display: none; }
        .swagger-ui .info .title {
            font-size: 36px;
            color: #2c3e50;
        }
        .swagger-ui .info .description {
            font-size: 16px;
            line-height: 1.6;
        }
        .swagger-ui .opblock-tag {
            font-size: 24px;
            border-bottom: 2px solid #3498db;
        }
        .swagger-ui .opblock {
            border: 1px solid #ecf0f1;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .swagger-ui .btn.authorize {
            background-color: #27ae60;
            border-color: #27ae60;
        }
        .swagger-ui .btn.execute {
            background-color: #3498db;
            border-color: #3498db;
        }
    `,
    customJs: '/swagger-custom.js', // Optional: add custom JavaScript
    customCssUrl: '/swagger-custom.css' // Optional: external stylesheet
};
```

#### Pre-fill Base URL

```javascript
// In openapi.yaml, use server variables
servers:
  - url: https://{environment}.example.com
    variables:
      environment:
        default: api
        enum:
          - api
          - staging
          - dev
```

---

## Option 2: ReDoc

### Features

✅ **Responsive design** - Mobile-friendly
✅ **Clean UI** - Professional, minimalist appearance
✅ **Three-panel layout** - Navigation, content, code samples
✅ **Deep linking** - Direct links to specific operations
✅ **Search** - Full-text search across documentation

### Setup

#### 1. Install ReDoc

```bash
npm install --save redoc-express
```

#### 2. Add to server.js

```javascript
const redoc = require('redoc-express');
const path = require('path');

// Serve ReDoc at /docs
app.use('/docs', redoc({
    title: 'Legal Form API Documentation',
    specUrl: '/api-docs/openapi.yaml',
    redocOptions: {
        theme: {
            colors: {
                primary: {
                    main: '#3498db'
                }
            },
            typography: {
                fontSize: '16px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }
        },
        hideDownloadButton: false,
        disableSearch: false,
        expandResponses: '200,201',
        jsonSampleExpandLevel: 2,
        hideSingleRequestSampleTab: true,
        menuToggle: true,
        nativeScrollbars: false,
        pathInMiddlePanel: true,
        requiredPropsFirst: true,
        sortPropsAlphabetically: true
    }
}));

console.log('📖 ReDoc available at /docs');
```

#### 3. Standalone HTML (No Server Required)

Create `docs/api/redoc.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Legal Form API Documentation</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
    <style>
        body {
            margin: 0;
            padding: 0;
        }
    </style>
</head>
<body>
    <redoc spec-url='./openapi.yaml'></redoc>
    <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
</body>
</html>
```

Access at: `http://localhost:3000/docs/api/redoc.html`

---

## Option 3: RapiDoc

### Features

✅ **Modern UI** - Sleek, customizable design
✅ **Multiple themes** - Dark mode, light mode, custom
✅ **Try it** - Interactive API testing
✅ **Focused mode** - Reader-friendly documentation
✅ **No dependencies** - Single HTML file

### Setup

Create `docs/api/rapidoc.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Legal Form API - RapiDoc</title>
    <script type="module" src="https://unpkg.com/rapidoc/dist/rapidoc-min.js"></script>
</head>
<body>
    <rapi-doc
        spec-url="./openapi.yaml"
        theme="dark"
        bg-color="#1f1f1f"
        text-color="#f0f0f0"
        header-color="#0066cc"
        primary-color="#0066cc"
        nav-bg-color="#2c2c2c"
        nav-text-color="#ffffff"
        nav-hover-bg-color="#3d3d3d"
        nav-hover-text-color="#ffffff"
        nav-accent-color="#0066cc"
        font-size="large"
        render-style="read"
        schema-style="table"
        schema-expand-level="1"
        schema-description-expanded="true"
        default-schema-tab="schema"
        response-area-height="400px"
        allow-try="true"
        allow-authentication="true"
        allow-spec-url-load="false"
        allow-spec-file-load="false"
        allow-server-selection="true"
        show-header="true"
        show-info="true"
        show-components="true"
        show-curl-before-try="true"
        layout="row"
        sort-tags="true"
        sort-endpoints-by="path"
        heading-text="Legal Form Application API"
    >
        <!-- Custom logo -->
        <img slot="logo" src="/logo.png" style="width:40px; margin-right:10px;"/>

        <!-- Custom description -->
        <div slot="overview">
            <h2>Welcome to the Legal Form API</h2>
            <p>
                This API provides comprehensive access to legal form submissions,
                case management, and document processing functionality.
            </p>
            <ul>
                <li>📝 Submit and manage legal forms</li>
                <li>🔄 Track document processing pipeline</li>
                <li>💾 Query case data and party information</li>
                <li>📊 Monitor system health and metrics</li>
            </ul>
        </div>

        <!-- Authentication instructions -->
        <div slot="auth">
            <h3>Authentication</h3>
            <p>
                All endpoints (except health checks) require authentication via Bearer token.
            </p>
            <ol>
                <li>Click the "Auth" button in the top right</li>
                <li>Enter your access token</li>
                <li>Click "Set"</li>
            </ol>
        </div>
    </rapi-doc>
</body>
</html>
```

Access at: `http://localhost:3000/docs/api/rapidoc.html`

---

## Deployment

### Static Hosting (GitHub Pages, Netlify, Vercel)

#### Generate Static HTML

**Option A: Using Redoc CLI**

```bash
# Install redoc-cli
npm install -g redoc-cli

# Generate static HTML
redoc-cli build docs/api/openapi.yaml -o docs/generated/api-docs.html

# Customize with theme
redoc-cli build docs/api/openapi.yaml \
    -o docs/generated/api-docs.html \
    --title "Legal Form API" \
    --theme.colors.primary.main="#3498db"
```

**Option B: Using Swagger UI**

```bash
# Copy swagger-ui-dist files
cp -r node_modules/swagger-ui-dist/* docs/generated/swagger/

# Create index.html
cat > docs/generated/swagger/index.html <<'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Legal Form API</title>
    <link rel="stylesheet" type="text/css" href="./swagger-ui.css">
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="./swagger-ui-bundle.js"></script>
    <script>
        window.onload = function() {
            window.ui = SwaggerUIBundle({
                url: "../../api/openapi.yaml",
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [SwaggerUIBundle.presets.apis],
                layout: "BaseLayout"
            });
        }
    </script>
</body>
</html>
EOF
```

#### GitHub Pages Deployment

```yaml
# .github/workflows/deploy-docs.yml
name: Deploy API Docs

on:
  push:
    branches: [main]
    paths:
      - 'docs/api/openapi.yaml'

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node
      uses: actions/setup-node@v3
      with:
        node-version: '18'

    - name: Generate ReDoc
      run: |
        npm install -g redoc-cli
        redoc-cli build docs/api/openapi.yaml -o docs/generated/index.html

    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./docs/generated
```

---

## Customization

### Custom Code Examples

Add to `openapi.yaml`:

```yaml
paths:
  /api/form-entries:
    post:
      summary: Submit a new form entry
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/FormEntry'
            examples:
              basic:
                summary: Basic form submission
                value:
                  caseNumber: "CASE-001"
                  caseTitle: "Smith v. Jones"
                  plaintiffName: "John Smith"
                  streetAddress: "123 Main St"
              complete:
                summary: Complete form with all fields
                value:
                  caseNumber: "CASE-002"
                  caseTitle: "Doe v. Company LLC"
                  plaintiffName: "Jane Doe"
                  plaintiffType: "Individual"
                  streetAddress: "456 Oak Avenue"
                  city: "Los Angeles"
                  state: "CA"
                  zipCode: "90001"
      x-codeSamples:
        - lang: 'cURL'
          source: |
            curl -X POST https://api.example.com/api/form-entries \
              -H "Authorization: Bearer YOUR_TOKEN" \
              -H "Content-Type: application/json" \
              -d '{
                "caseNumber": "CASE-001",
                "caseTitle": "Smith v. Jones",
                "plaintiffName": "John Smith",
                "streetAddress": "123 Main St"
              }'
        - lang: 'JavaScript'
          source: |
            const response = await fetch('https://api.example.com/api/form-entries', {
              method: 'POST',
              headers: {
                'Authorization': 'Bearer YOUR_TOKEN',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                caseNumber: 'CASE-001',
                caseTitle: 'Smith v. Jones',
                plaintiffName: 'John Smith',
                streetAddress: '123 Main St'
              })
            });
            const data = await response.json();
            console.log(data);
        - lang: 'Python'
          source: |
            import requests

            url = 'https://api.example.com/api/form-entries'
            headers = {
                'Authorization': 'Bearer YOUR_TOKEN',
                'Content-Type': 'application/json'
            }
            data = {
                'caseNumber': 'CASE-001',
                'caseTitle': 'Smith v. Jones',
                'plaintiffName': 'John Smith',
                'streetAddress': '123 Main St'
            }

            response = requests.post(url, json=data, headers=headers)
            print(response.json())
```

### Environment Selector

```javascript
// In swagger-setup.js
const swaggerOptions = {
    swaggerOptions: {
        urls: [
            {
                url: '/api-docs/openapi.yaml',
                name: 'Production'
            },
            {
                url: '/api-docs/openapi-staging.yaml',
                name: 'Staging'
            },
            {
                url: '/api-docs/openapi-dev.yaml',
                name: 'Development'
            }
        ]
    }
};
```

---

## Authentication Setup

### Bearer Token Authentication

#### Configure in Swagger UI

```javascript
const swaggerOptions = {
    swaggerOptions: {
        // Enable auth persist
        persistAuthorization: true,

        // Pre-authorize programmatically
        onComplete: function() {
            // Get token from URL or localStorage
            const token = new URLSearchParams(window.location.search).get('token')
                       || localStorage.getItem('api_token');

            if (token) {
                window.ui.preauthorizeApiKey('bearerAuth', token);
            }
        }
    }
};
```

#### Update openapi.yaml

```yaml
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: |
        Enter your access token in the format: `YOUR_TOKEN_HERE`

        **How to get a token:**
        1. Contact your administrator
        2. You will receive an access token
        3. Click "Authorize" and enter the token

security:
  - bearerAuth: []
```

### Token Input UI

Add custom authentication UI in Swagger:

```javascript
// swagger-custom.js
window.addEventListener('load', function() {
    // Add token input to navbar
    const topbar = document.querySelector('.topbar');
    if (topbar) {
        const tokenInput = document.createElement('div');
        tokenInput.innerHTML = `
            <div style="padding: 10px;">
                <input
                    type="text"
                    id="quick-token-input"
                    placeholder="Enter API token"
                    style="padding: 8px; width: 300px; border: 1px solid #ccc; border-radius: 4px;"
                />
                <button
                    id="quick-token-btn"
                    style="padding: 8px 16px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 8px;"
                >
                    Authorize
                </button>
            </div>
        `;
        topbar.appendChild(tokenInput);

        // Handle quick auth
        document.getElementById('quick-token-btn').addEventListener('click', function() {
            const token = document.getElementById('quick-token-input').value;
            if (token) {
                window.ui.preauthorizeApiKey('bearerAuth', token);
                localStorage.setItem('api_token', token);
                alert('Token saved! You can now test API endpoints.');
            }
        });
    }
});
```

---

## Testing the Setup

### Verification Checklist

```bash
# 1. Check OpenAPI spec is valid
npm install -g @apidevtools/swagger-cli
swagger-cli validate docs/api/openapi.yaml

# 2. Start server
npm start

# 3. Test endpoints
# Swagger UI
curl http://localhost:3000/api-docs

# ReDoc
curl http://localhost:3000/docs

# Raw spec (JSON)
curl http://localhost:3000/api-docs/openapi.json

# Raw spec (YAML)
curl http://localhost:3000/api-docs/openapi.yaml
```

### Browser Testing

1. **Open Swagger UI:** `http://localhost:3000/api-docs`
2. **Click "Authorize"**
3. **Enter token** from `.env` file
4. **Try an endpoint:**
   - Expand `GET /api/form-entries`
   - Click "Try it out"
   - Click "Execute"
   - Verify response

---

## Troubleshooting

### Common Issues

#### "Cannot GET /api-docs"

**Problem:** Route not registered
**Solution:**
```javascript
// Ensure setupSwagger() is called in server.js
const { setupSwagger } = require('./docs/api/swagger-setup');
setupSwagger(app);
```

#### "Failed to load API definition"

**Problem:** OpenAPI spec has errors
**Solution:**
```bash
# Validate spec
swagger-cli validate docs/api/openapi.yaml

# Check for common issues:
# - Missing required fields
# - Invalid schema references
# - Incorrect indentation (YAML)
```

#### CORS Errors in Browser

**Problem:** CORS not configured
**Solution:**
```javascript
// In server.js
const cors = require('cors');
app.use(cors({
    origin: true,
    credentials: true
}));
```

---

## Best Practices

### Documentation Maintenance

1. **Keep spec in sync with code** - Update `openapi.yaml` when changing routes
2. **Add examples** - Include realistic request/response examples
3. **Document errors** - Describe all possible error responses
4. **Version your API** - Use semantic versioning (v1, v2, etc.)
5. **Test regularly** - Validate spec on every commit

### Performance Optimization

```javascript
// Cache compiled spec
let cachedSpec = null;

function getSpec() {
    if (!cachedSpec) {
        cachedSpec = YAML.load('./docs/api/openapi.yaml');
    }
    return cachedSpec;
}

// Invalidate cache on file change (development only)
if (process.env.NODE_ENV !== 'production') {
    const fs = require('fs');
    fs.watch('./docs/api/openapi.yaml', () => {
        cachedSpec = null;
        console.log('OpenAPI spec reloaded');
    });
}
```

---

## Next Steps

1. **Add code examples** to openapi.yaml for all endpoints
2. **Setup CI/CD** to auto-deploy docs on spec changes
3. **Create tutorials** linking to specific operations
4. **Monitor usage** with analytics on documentation page
5. **Collect feedback** from API consumers

---

## Resources

- [Swagger UI Documentation](https://swagger.io/tools/swagger-ui/)
- [ReDoc Documentation](https://redocly.com/docs/redoc/)
- [RapiDoc Documentation](https://rapidocweb.com/api.html)
- [OpenAPI Specification](https://spec.openapis.org/oas/latest.html)
- [Swagger Editor](https://editor.swagger.io/) - Online spec editor

---

**Document Version:** 1.0
**Last Updated:** October 23, 2025
