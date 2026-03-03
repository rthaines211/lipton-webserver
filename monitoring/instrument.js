/**
 * Sentry Instrumentation
 *
 * MUST be imported before all other modules in server.js.
 * Initializes Sentry error tracking, performance monitoring,
 * and custom exhibit-collector context.
 *
 * @module monitoring/instrument
 */

const Sentry = require('@sentry/node');

const SENTRY_DSN = process.env.SENTRY_DSN;
const NODE_ENV = process.env.NODE_ENV || 'development';

if (SENTRY_DSN) {
    Sentry.init({
        dsn: SENTRY_DSN,
        environment: NODE_ENV,
        release: process.env.APP_VERSION || '1.0.0',

        // Performance: sample 100% in dev/staging, 20% in production
        tracesSampleRate: NODE_ENV === 'production' ? 0.2 : 1.0,

        // Send 100% of error events
        sampleRate: 1.0,

        // Attach server name for Cloud Run instance identification
        serverName: process.env.K_REVISION || undefined,

        integrations: [
            // Express request data enrichment is auto-detected in v10
        ],

        // Scrub sensitive headers
        beforeSend(event) {
            if (event.request && event.request.headers) {
                delete event.request.headers['authorization'];
                delete event.request.headers['cookie'];
            }
            return event;
        },

        // Filter noisy breadcrumbs
        beforeBreadcrumb(breadcrumb) {
            // Skip health check noise
            if (breadcrumb.category === 'http' && breadcrumb.data) {
                const url = breadcrumb.data.url || '';
                if (url.includes('/health') || url.includes('/metrics')) {
                    return null;
                }
            }
            return breadcrumb;
        },
    });

    console.log(`[sentry] Initialized (env=${NODE_ENV}, tracesSampleRate=${NODE_ENV === 'production' ? 0.2 : 1.0})`);
} else {
    console.log('[sentry] SENTRY_DSN not set — Sentry disabled');
}

module.exports = Sentry;
