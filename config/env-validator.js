/**
 * Environment Variable Validator
 *
 * Validates that all required environment variables are set before the application starts.
 * This prevents silent failures and provides clear error messages when configuration is missing.
 *
 * Usage:
 *   const validator = require('./config/env-validator');
 *   validator.validate(); // Exits process if critical vars missing
 *
 * Author: Claude Code
 * Date: October 27, 2025
 */

/**
 * Environment variable definitions with validation rules
 */
const ENV_VARS = {
    // Critical variables - application won't work without these
    critical: {
        'NODE_ENV': {
            description: 'Application environment (development/staging/production)',
            validValues: ['development', 'staging', 'production'],
            example: 'production'
        },
        'DB_USER': {
            description: 'PostgreSQL username',
            example: 'app-user'
        },
        'DB_HOST': {
            description: 'Database host (localhost or Cloud SQL socket path)',
            example: '/cloudsql/project:region:instance'
        },
        'DB_PASSWORD': {
            description: 'Database password',
            example: '[secret]',
            sensitive: true
        },
        'DB_NAME': {
            description: 'Database name',
            example: 'legal_forms_db'
        }
    },

    // Important variables - features won't work without these
    important: {
        'SENDGRID_API_KEY': {
            description: 'SendGrid API key for email notifications',
            example: 'SG.xxxxx',
            sensitive: true
        },
        'EMAIL_FROM_ADDRESS': {
            description: 'Email sender address',
            example: 'notifications@liptonlegal.com'
        },
        'ACCESS_TOKEN': {
            description: 'API authentication token',
            example: '[secret]',
            sensitive: true
        },
        'PIPELINE_API_URL': {
            description: 'Python normalization pipeline URL',
            example: 'https://python-pipeline-xxx.run.app'
        },
        'DROPBOX_ACCESS_TOKEN': {
            description: 'Dropbox API access token',
            example: '[secret]',
            sensitive: true
        }
    },

    // Optional variables - have sensible defaults
    optional: {
        'PORT': {
            description: 'Server port',
            example: '8080',
            default: '8080 (Cloud Run) or 3000 (local)'
        },
        'DB_PORT': {
            description: 'Database port',
            example: '5432',
            default: '5432'
        },
        'EMAIL_ENABLED': {
            description: 'Enable/disable email notifications',
            example: 'true',
            default: 'true'
        },
        'DROPBOX_ENABLED': {
            description: 'Enable/disable Dropbox uploads',
            example: 'true',
            default: 'false'
        },
        'PIPELINE_API_ENABLED': {
            description: 'Enable/disable pipeline integration',
            example: 'true',
            default: 'true'
        },
        'GCLOUD_PROJECT': {
            description: 'GCP project ID',
            example: 'docmosis-tornado',
            default: 'Auto-detected'
        }
    }
};

/**
 * Validate environment variables
 * @param {Object} options - Validation options
 * @param {boolean} options.exitOnError - Exit process if critical vars missing (default: true)
 * @param {boolean} options.verbose - Show detailed output (default: false)
 * @returns {Object} Validation result { valid: boolean, errors: [], warnings: [] }
 */
function validate(options = {}) {
    const { exitOnError = true, verbose = false } = options;
    const errors = [];
    const warnings = [];
    const info = [];

    // Check critical variables
    for (const [varName, config] of Object.entries(ENV_VARS.critical)) {
        const value = process.env[varName];

        // Special case: Allow empty DB_PASSWORD in development (local PostgreSQL peer auth)
        const isEmptyPasswordAllowed = varName === 'DB_PASSWORD' &&
                                       process.env.NODE_ENV === 'development' &&
                                       value === '';

        if (!value && !isEmptyPasswordAllowed) {
            errors.push({
                var: varName,
                message: `${varName} is not set`,
                description: config.description,
                example: config.example
            });
        } else {
            // Validate against valid values if specified
            if (config.validValues && !config.validValues.includes(value)) {
                errors.push({
                    var: varName,
                    message: `${varName} has invalid value: "${value}"`,
                    description: `Must be one of: ${config.validValues.join(', ')}`,
                    example: config.example
                });
            } else if (verbose) {
                info.push({
                    var: varName,
                    value: config.sensitive ? '[SET]' : value,
                    description: config.description
                });
            }
        }
    }

    // Check important variables
    for (const [varName, config] of Object.entries(ENV_VARS.important)) {
        const value = process.env[varName];

        if (!value) {
            warnings.push({
                var: varName,
                message: `${varName} is not set`,
                description: config.description,
                example: config.example,
                impact: 'Some features may not work'
            });
        } else if (verbose) {
            info.push({
                var: varName,
                value: config.sensitive ? '[SET]' : value,
                description: config.description
            });
        }
    }

    // Check optional variables (info only if verbose)
    if (verbose) {
        for (const [varName, config] of Object.entries(ENV_VARS.optional)) {
            const value = process.env[varName];
            info.push({
                var: varName,
                value: value || `[DEFAULT: ${config.default}]`,
                description: config.description
            });
        }
    }

    // Print results
    console.log('\n🔍 Environment Variable Validation\n');

    if (errors.length > 0) {
        console.error('❌ CRITICAL ERRORS - Application cannot start:\n');
        errors.forEach(err => {
            console.error(`   • ${err.message}`);
            console.error(`     Description: ${err.description}`);
            console.error(`     Example: ${err.example}`);
            console.error('');
        });
    }

    if (warnings.length > 0) {
        console.warn('⚠️  WARNINGS - Some features may not work:\n');
        warnings.forEach(warn => {
            console.warn(`   • ${warn.message}`);
            console.warn(`     Description: ${warn.description}`);
            console.warn(`     Impact: ${warn.impact}`);
            console.warn('');
        });
    }

    if (verbose && info.length > 0) {
        console.log('ℹ️  Configuration Summary:\n');
        info.forEach(item => {
            console.log(`   • ${item.var}: ${item.value}`);
            if (item.description) {
                console.log(`     ${item.description}`);
            }
        });
        console.log('');
    }

    const isValid = errors.length === 0;

    if (isValid && errors.length === 0 && warnings.length === 0) {
        console.log('✅ All required environment variables are set\n');
    } else if (isValid && warnings.length > 0) {
        console.log('⚠️  Required variables set, but some optional variables missing\n');
    }

    // Exit if critical errors and exitOnError is true
    if (!isValid && exitOnError) {
        console.error('❌ Cannot start application - missing critical environment variables');
        console.error('   Set these variables in Cloud Run or your .env file\n');
        process.exit(1);
    }

    return {
        valid: isValid,
        errors,
        warnings,
        info
    };
}

/**
 * Get list of all environment variables with their configurations
 * @returns {Object} Environment variable definitions
 */
function getVariableDefinitions() {
    return ENV_VARS;
}

/**
 * Generate documentation for environment variables
 * @returns {string} Markdown documentation
 */
function generateDocumentation() {
    let doc = '# Environment Variables Reference\n\n';

    doc += '## Critical Variables\n\n';
    doc += 'These variables are **required** for the application to function:\n\n';
    for (const [varName, config] of Object.entries(ENV_VARS.critical)) {
        doc += `### ${varName}\n`;
        doc += `- **Description:** ${config.description}\n`;
        doc += `- **Example:** \`${config.example}\`\n`;
        if (config.validValues) {
            doc += `- **Valid Values:** ${config.validValues.join(', ')}\n`;
        }
        if (config.sensitive) {
            doc += `- **⚠️ Sensitive:** Store in Secret Manager\n`;
        }
        doc += '\n';
    }

    doc += '## Important Variables\n\n';
    doc += 'These variables are needed for specific features:\n\n';
    for (const [varName, config] of Object.entries(ENV_VARS.important)) {
        doc += `### ${varName}\n`;
        doc += `- **Description:** ${config.description}\n`;
        doc += `- **Example:** \`${config.example}\`\n`;
        if (config.sensitive) {
            doc += `- **⚠️ Sensitive:** Store in Secret Manager\n`;
        }
        doc += '\n';
    }

    doc += '## Optional Variables\n\n';
    doc += 'These variables have sensible defaults:\n\n';
    for (const [varName, config] of Object.entries(ENV_VARS.optional)) {
        doc += `### ${varName}\n`;
        doc += `- **Description:** ${config.description}\n`;
        doc += `- **Example:** \`${config.example}\`\n`;
        doc += `- **Default:** ${config.default}\n`;
        doc += '\n';
    }

    return doc;
}

// If run directly from command line
if (require.main === module) {
    validate({ verbose: true });
}

module.exports = {
    validate,
    getVariableDefinitions,
    generateDocumentation
};
