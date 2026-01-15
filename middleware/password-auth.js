/**
 * Password Authentication Middleware
 * Simple password-based authentication for form frontends
 * Uses session-based authentication with separate passwords per form
 *
 * @module PasswordAuth
 */

const logger = require('../monitoring/logger');

// Get passwords from environment
const DOCS_PASSWORD = process.env.DOCS_FORM_PASSWORD || 'lipton-discovery-2026';
const AGREEMENT_PASSWORD = process.env.AGREEMENT_FORM_PASSWORD || 'lipton-discovery-2026';

/**
 * Create password authentication middleware for a specific form
 * @param {string} formType - Form type ('docs' or 'agreement')
 * @returns {Function} Express middleware function
 */
function createPasswordAuth(formType) {
    const expectedPassword = formType === 'docs' ? DOCS_PASSWORD : AGREEMENT_PASSWORD;
    const formName = formType === 'docs' ? 'Document Generation Portal' : 'Contingency Agreement Portal';

    return (req, res, next) => {
        // Skip auth for static assets (JS, CSS, images)
        const staticFileExtensions = [
            '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
            '.woff', '.woff2', '.ttf', '.eot', '.otf', '.webp', '.map'
        ];
        const isStaticFile = staticFileExtensions.some(ext =>
            req.path.toLowerCase().endsWith(ext)
        );

        if (isStaticFile) {
            return next();
        }

        // Check if already authenticated for this form
        const sessionKey = `${formType}Authenticated`;
        if (req.session && req.session[sessionKey]) {
            logger.debug('User already authenticated for form', {
                formType,
                sessionId: req.sessionID
            });
            return next();
        }

        // Handle password submission (POST)
        if (req.method === 'POST' && req.body.password) {
            const providedPassword = req.body.password;

            if (providedPassword === expectedPassword) {
                // Set session flag for this form
                req.session[sessionKey] = true;

                // Build full redirect URL including base path
                const fullPath = req.baseUrl + req.path;

                logger.info('User authenticated successfully', {
                    formType,
                    ip: req.ip,
                    sessionId: req.sessionID,
                    redirectTo: fullPath,
                    debug: {
                        baseUrl: req.baseUrl,
                        path: req.path,
                        url: req.url,
                        originalUrl: req.originalUrl
                    }
                });

                // Redirect to the form page (GET request)
                // Use full path constructed from baseUrl + path
                return res.redirect(fullPath);
            } else {
                logger.warn('Failed login attempt', {
                    formType,
                    ip: req.ip
                });

                // Return login page with error
                return res.status(401).send(getLoginPage(formName, true));
            }
        }

        // Not authenticated - show login page
        logger.debug('Showing login page', {
            formType,
            path: req.path
        });

        res.status(401).send(getLoginPage(formName, false));
    };
}

/**
 * Generate HTML login page
 * @param {string} formName - Display name of the form
 * @param {boolean} showError - Whether to show error message
 * @returns {string} HTML content
 */
function getLoginPage(formName, showError = false) {
    const errorHtml = showError ? `
        <div style="
            background: #FEE2E2;
            border: 1px solid #EF4444;
            color: #991B1B;
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 20px;
            text-align: center;
        ">
            ⚠️ Incorrect password. Please try again.
        </div>
    ` : '';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${formName} - Login</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #1F2A44 0%, #2A3F5F 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
        }

        .login-container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            max-width: 400px;
            width: 100%;
            animation: fadeIn 0.3s ease-in;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(-20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .logo {
            text-align: center;
            margin-bottom: 30px;
        }

        .logo-text {
            font-size: 28px;
            font-weight: 700;
            color: #1F2A44;
            margin-bottom: 8px;
        }

        .logo-subtitle {
            font-size: 14px;
            color: #666;
        }

        h1 {
            color: #1F2A44;
            margin-bottom: 10px;
            text-align: center;
            font-size: 22px;
        }

        .subtitle {
            text-align: center;
            color: #666;
            margin-bottom: 30px;
            font-size: 14px;
        }

        label {
            display: block;
            margin-bottom: 8px;
            color: #333;
            font-weight: 500;
            font-size: 14px;
        }

        input[type="password"] {
            width: 100%;
            padding: 14px 16px;
            border: 2px solid #E5E7EB;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 16px;
            transition: border-color 0.2s;
        }

        input[type="password"]:focus {
            outline: none;
            border-color: #00AEEF;
        }

        button {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #00AEEF 0%, #0098D4 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.1s, box-shadow 0.2s;
        }

        button:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 174, 239, 0.3);
        }

        button:active {
            transform: translateY(0);
        }

        .footer {
            margin-top: 20px;
            text-align: center;
            color: #999;
            font-size: 12px;
        }

        .lock-icon {
            text-align: center;
            font-size: 48px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="logo">
            <div class="logo-text">🏛️ Lipton Legal</div>
            <div class="logo-subtitle">Professional Legal Services</div>
        </div>

        <div class="lock-icon">🔒</div>

        <h1>${formName}</h1>
        <p class="subtitle">Please enter your password to continue</p>

        ${errorHtml}

        <form method="POST">
            <label for="password">Password</label>
            <input
                type="password"
                id="password"
                name="password"
                placeholder="Enter password"
                required
                autofocus
                autocomplete="current-password"
            >
            <button type="submit">Access Form</button>
        </form>

        <div class="footer">
            Secured access • Lipton Legal Group
        </div>
    </div>
</body>
</html>
    `;
}

/**
 * Middleware to log out user (clear session)
 * @param {string} formType - Form type ('docs' or 'agreement')
 */
function createLogoutHandler(formType) {
    return (req, res) => {
        const sessionKey = `${formType}Authenticated`;

        if (req.session) {
            req.session[sessionKey] = false;

            logger.info('User logged out', {
                formType,
                sessionId: req.sessionID
            });
        }

        res.redirect(`/forms/${formType}/`);
    };
}

module.exports = {
    createPasswordAuth,
    createLogoutHandler
};
