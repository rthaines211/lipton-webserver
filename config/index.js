/**
 * Application Configuration Module
 *
 * Centralized configuration management with environment variable validation,
 * default values, and type coercion.
 *
 * Features:
 * - Single source of truth for all configuration
 * - Environment-specific defaults
 * - Type safety and validation
 * - Sensitive data protection
 *
 * @module config
 */

/**
 * Parse boolean environment variable
 * @param {string} value - Environment variable value
 * @param {boolean} defaultValue - Default value if not set
 * @returns {boolean}
 */
function parseBool(value, defaultValue = false) {
    if (value === undefined || value === null || value === '') {
        return defaultValue;
    }
    return value === 'true' || value === '1' || value === 'yes';
}

/**
 * Parse integer environment variable
 * @param {string} value - Environment variable value
 * @param {number} defaultValue - Default value if not set
 * @returns {number}
 */
function parseInt$(value, defaultValue = 0) {
    if (value === undefined || value === null || value === '') {
        return defaultValue;
    }
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Get string environment variable with default
 * @param {string} value - Environment variable value
 * @param {string} defaultValue - Default value if not set
 * @returns {string}
 */
function getString(value, defaultValue = '') {
    return value || defaultValue;
}

// Determine environment
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
const IS_DEVELOPMENT = NODE_ENV === 'development';
const IS_STAGING = NODE_ENV === 'staging';

// Application Configuration
const config = {
    // Environment
    env: {
        NODE_ENV,
        IS_PRODUCTION,
        IS_DEVELOPMENT,
        IS_STAGING
    },

    // Server Configuration
    server: {
        port: parseInt$(process.env.PORT, 3000),
        host: getString(process.env.HOST, 'localhost'),
        nodeEnv: NODE_ENV
    },

    // Database Configuration
    database: {
        user: getString(process.env.DB_USER, 'ryanhaines'),
        host: getString(process.env.DB_HOST, 'localhost'),
        database: getString(process.env.DB_NAME, 'legal_forms_db'),
        password: getString(process.env.DB_PASSWORD, ''),
        port: parseInt$(process.env.DB_PORT, 5432),
        max: parseInt$(process.env.DB_POOL_MAX, 20),
        idleTimeoutMillis: parseInt$(process.env.DB_IDLE_TIMEOUT, 30000),
        connectionTimeoutMillis: parseInt$(process.env.DB_CONNECTION_TIMEOUT, 2000),
        maxUses: parseInt$(process.env.DB_MAX_USES, 7500),
        allowExitOnIdle: parseBool(process.env.DB_ALLOW_EXIT_ON_IDLE, true)
    },

    // Authentication Configuration
    auth: {
        accessToken: getString(process.env.ACCESS_TOKEN, ''),
        requireAuth: IS_PRODUCTION,
        tokenHeader: 'authorization',
        tokenPrefix: 'Bearer '
    },

    // Cloud Storage Configuration
    storage: {
        useCloudStorage: IS_PRODUCTION,
        bucketName: getString(
            process.env.GCS_BUCKET_NAME,
            `${process.env.GCLOUD_PROJECT || 'docmosis-tornado'}-form-submissions`
        ),
        projectId: getString(process.env.GCLOUD_PROJECT, 'docmosis-tornado'),
        localDataDir: getString(process.env.LOCAL_DATA_DIR, 'data')
    },

    // Python Pipeline Configuration
    pipeline: {
        apiUrl: getString(process.env.PIPELINE_API_URL, 'http://localhost:8000'),
        enabled: parseBool(process.env.PIPELINE_API_ENABLED, true),
        timeout: parseInt$(process.env.PIPELINE_API_TIMEOUT, 300000), // 5 minutes
        apiKey: getString(process.env.PIPELINE_API_KEY, ''),
        executeOnSubmit: parseBool(process.env.EXECUTE_PIPELINE_ON_SUBMIT, true),
        continueOnFailure: parseBool(process.env.CONTINUE_ON_PIPELINE_FAILURE, true)
    },

    // Dropbox Configuration
    dropbox: {
        enabled: parseBool(process.env.DROPBOX_ENABLED, false),
        accessToken: getString(process.env.DROPBOX_ACCESS_TOKEN, ''),
        basePath: getString(process.env.DROPBOX_BASE_PATH, '/Current Clients'),
        localOutputPath: getString(process.env.LOCAL_OUTPUT_PATH, 'webhook_documents'),
        continueOnFailure: parseBool(process.env.CONTINUE_ON_DROPBOX_FAILURE, true),
        // OAuth Configuration
        appKey: getString(process.env.DROPBOX_APP_KEY, ''),
        appSecret: getString(process.env.DROPBOX_APP_SECRET, ''),
        refreshToken: getString(process.env.DROPBOX_REFRESH_TOKEN, '')
    },

    // Email Configuration (SendGrid)
    email: {
        enabled: parseBool(process.env.EMAIL_ENABLED, false),
        provider: getString(process.env.EMAIL_PROVIDER, 'sendgrid'),
        apiKey: getString(process.env.SENDGRID_API_KEY, ''),
        fromAddress: getString(process.env.EMAIL_FROM_ADDRESS, 'notifications@liptonlegal.com'),
        fromName: getString(process.env.EMAIL_FROM_NAME, 'Lipton Legal'),
        maxRetries: parseInt$(process.env.EMAIL_MAX_RETRIES, 3),
        retryDelay: parseInt$(process.env.EMAIL_RETRY_DELAY_MS, 1000)
    },

    // Docmosis Configuration
    docmosis: {
        enabled: parseBool(process.env.DOCMOSIS_ENABLED, true),
        accessKey: getString(process.env.DOCMOSIS_ACCESS_KEY, ''),
        endpoint: getString(process.env.DOCMOSIS_ENDPOINT, 'https://us1.dws4.docmosis.com/api/render')
    },

    // Performance Configuration
    performance: {
        compressionLevel: parseInt$(process.env.COMPRESSION_LEVEL, 6),
        compressionThreshold: parseInt$(process.env.COMPRESSION_THRESHOLD, 1024),
        maxRequestSize: getString(process.env.MAX_REQUEST_SIZE, '10mb'),
        staticCacheMaxAge: parseInt$(process.env.STATIC_CACHE_MAX_AGE, 31536000), // 1 year
        htmlCacheMaxAge: parseInt$(process.env.HTML_CACHE_MAX_AGE, 300) // 5 minutes
    },

    // Monitoring Configuration
    monitoring: {
        metricsEnabled: parseBool(process.env.METRICS_ENABLED, true),
        logLevel: getString(process.env.LOG_LEVEL, IS_PRODUCTION ? 'info' : 'debug'),
        logFormat: getString(process.env.LOG_FORMAT, IS_PRODUCTION ? 'json' : 'simple')
    },

    // CORS Configuration
    cors: {
        enabled: parseBool(process.env.CORS_ENABLED, true),
        origin: getString(process.env.CORS_ORIGIN, '*'),
        credentials: parseBool(process.env.CORS_CREDENTIALS, true)
    }
};

/**
 * Validate required configuration
 * Throws error if required values are missing
 */
function validate() {
    const errors = [];

    // Database validation
    if (!config.database.user) {
        errors.push('DB_USER is required');
    }
    if (!config.database.database) {
        errors.push('DB_NAME is required');
    }

    // Production-specific validation
    if (IS_PRODUCTION) {
        if (!config.auth.accessToken) {
            errors.push('ACCESS_TOKEN is required in production');
        }
        if (!config.storage.bucketName) {
            errors.push('GCS_BUCKET_NAME is required in production');
        }
    }

    // Pipeline validation (if enabled)
    if (config.pipeline.enabled && !config.pipeline.apiUrl) {
        errors.push('PIPELINE_API_URL is required when pipeline is enabled');
    }

    // Dropbox validation (if enabled)
    if (config.dropbox.enabled) {
        const hasOAuth = config.dropbox.appKey && config.dropbox.appSecret && config.dropbox.refreshToken;
        const hasAccessToken = config.dropbox.accessToken;

        if (!hasOAuth && !hasAccessToken) {
            errors.push('DROPBOX_ACCESS_TOKEN or OAuth credentials (APP_KEY, APP_SECRET, REFRESH_TOKEN) required when Dropbox is enabled');
        }
    }

    // Email validation (if enabled)
    if (config.email.enabled && !config.email.apiKey) {
        errors.push('SENDGRID_API_KEY is required when email is enabled');
    }

    // Docmosis validation (if enabled)
    if (config.docmosis.enabled && !config.docmosis.accessKey) {
        errors.push('DOCMOSIS_ACCESS_KEY is required when Docmosis is enabled');
    }

    if (errors.length > 0) {
        throw new Error(`Configuration validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`);
    }
}

/**
 * Get sanitized configuration for logging
 * Removes sensitive data
 */
function getSanitized() {
    return {
        env: config.env,
        server: config.server,
        database: {
            ...config.database,
            password: config.database.password ? '***' : ''
        },
        auth: {
            ...config.auth,
            accessToken: config.auth.accessToken ? '***' : ''
        },
        storage: config.storage,
        pipeline: {
            ...config.pipeline,
            apiKey: config.pipeline.apiKey ? '***' : ''
        },
        dropbox: {
            ...config.dropbox,
            accessToken: config.dropbox.accessToken ? '***' : '',
            appKey: config.dropbox.appKey ? '***' : '',
            appSecret: config.dropbox.appSecret ? '***' : '',
            refreshToken: config.dropbox.refreshToken ? '***' : ''
        },
        email: {
            ...config.email,
            apiKey: config.email.apiKey ? '***' : ''
        },
        docmosis: {
            ...config.docmosis,
            accessKey: config.docmosis.accessKey ? '***' : ''
        },
        performance: config.performance,
        monitoring: config.monitoring,
        cors: config.cors
    };
}

module.exports = {
    ...config,
    validate,
    getSanitized
};
