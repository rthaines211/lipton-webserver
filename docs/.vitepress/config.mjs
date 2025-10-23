/**
 * VitePress Configuration
 *
 * This configures the documentation website for the Legal Form Application.
 * Automatically generates navigation, search, and styling from your existing Markdown files.
 *
 * @see https://vitepress.dev/reference/site-config
 */

import { defineConfig } from 'vitepress'

export default defineConfig({
  // ============================================
  // Site Metadata
  // ============================================
  title: 'Legal Form Application',
  description: 'Comprehensive legal form submission system with dual storage, GCP Cloud Run deployment, and real-time processing.',
  lang: 'en-US',

  // ============================================
  // Build Configuration
  // ============================================
  outDir: '../dist/docs',
  cleanUrls: true,

  // For GitHub Pages deployment (uncomment and adjust if needed)
  // base: '/legal-form-app/',

  // ============================================
  // Theme Configuration
  // ============================================
  themeConfig: {
    // Site logo
    logo: '/logo.png',
    siteTitle: 'Legal Form Docs',

    // ============================================
    // Top Navigation Bar
    // ============================================
    nav: [
      {
        text: 'Home',
        link: '/'
      },
      {
        text: '🚀 Quick Start',
        link: '/QUICK_START'
      },
      {
        text: 'Guides',
        items: [
          { text: '👤 User Guide', link: '/USER_GUIDE' },
          { text: '💻 Developer Guide', link: '/DEVELOPER_GUIDE' },
          { text: '🔌 API Reference', link: '/API_REFERENCE' },
          { text: '🏗️ Architecture', link: '/ARCHITECTURE' }
        ]
      },
      {
        text: 'Operations',
        items: [
          { text: '📦 Deployment Guide', link: '/deployment/DEPLOYMENT_GUIDE' },
          { text: '⚙️ Operations Guide', link: '/operations/OPERATIONS_GUIDE' },
          { text: '🌐 Nginx Gateway', link: '/infrastructure/NGINX_GATEWAY' },
          { text: '🔍 Troubleshooting', link: '/operations/OPERATIONS_GUIDE#common-issues--solutions' }
        ]
      },
      {
        text: 'Resources',
        items: [
          { text: '📚 All Documentation', link: '/README' },
          { text: '🏛️ ADR Index', link: '/adr/README' },
          { text: '📝 JSDoc Standards', link: '/development/JSDOC_STANDARDS' },
          { text: '🔧 Interactive API', link: '/api/INTERACTIVE_API_DOCS' }
        ]
      }
    ],

    // ============================================
    // Sidebar Navigation
    // ============================================
    sidebar: {
      '/': [
        {
          text: '🚀 Getting Started',
          collapsed: false,
          items: [
            { text: 'Documentation Home', link: '/README' },
            { text: 'Quick Start (5-10 min)', link: '/QUICK_START' },
            { text: 'User Guide', link: '/USER_GUIDE' }
          ]
        },
        {
          text: '💻 Development',
          collapsed: false,
          items: [
            { text: 'Developer Guide', link: '/DEVELOPER_GUIDE' },
            { text: 'JSDoc Standards', link: '/development/JSDOC_STANDARDS' },
            { text: 'Code Style Guide', link: '/reference/styleguide' },
            { text: 'TDD Implementation', link: '/TDD_IMPLEMENTATION' }
          ]
        },
        {
          text: '🔌 API Documentation',
          collapsed: false,
          items: [
            { text: 'API Reference', link: '/API_REFERENCE' },
            { text: 'Interactive API Setup', link: '/api/INTERACTIVE_API_DOCS' },
            { text: 'OpenAPI Specification', link: 'https://node-server-zyiwmzwenq-uc.a.run.app/api-docs' }
          ]
        },
        {
          text: '📦 Deployment & Operations',
          collapsed: false,
          items: [
            { text: 'Deployment Guide', link: '/deployment/DEPLOYMENT_GUIDE' },
            { text: 'Operations Guide', link: '/operations/OPERATIONS_GUIDE' },
            { text: 'GCP Deployment', link: '/setup/GCP_DEPLOYMENT' }
          ]
        },
        {
          text: '🌐 Infrastructure',
          collapsed: false,
          items: [
            { text: 'Nginx Gateway Guide', link: '/infrastructure/NGINX_GATEWAY' },
            { text: 'Hybrid Cloud Setup', link: '/ARCHITECTURE#deployment-architecture-gcp---hybrid-cloud' }
          ]
        },
        {
          text: '🏗️ Architecture',
          collapsed: true,
          items: [
            { text: 'System Architecture', link: '/ARCHITECTURE' },
            { text: 'Data Model', link: '/reference/data_model' },
            { text: 'ADR Index', link: '/adr/README' },
            { text: 'ADR-001: Dual Storage', link: '/adr/ADR-001-dual-storage-system' },
            { text: 'ADR-002: Cloud Run', link: '/adr/ADR-002-gcp-cloud-run-deployment' },
            { text: 'ADR-003: Hybrid Cloud', link: '/adr/ADR-003-nginx-hybrid-cloud-architecture' }
          ]
        },
        {
          text: '🔧 Features',
          collapsed: true,
          items: [
            { text: 'Goal Output Spec', link: '/features/goalOutput' },
            { text: 'Form Design', link: '/features/formdesign' },
            { text: 'Review Workflow', link: '/features/REVIEW_WORKFLOW' },
            { text: 'Transformation', link: '/features/Transformationinstructions' }
          ]
        },
        {
          text: '🔌 Integrations',
          collapsed: true,
          items: [
            { text: 'Dropbox Setup', link: '/setup/DROPBOX_SETUP' },
            { text: 'Dropbox Implementation', link: '/implementation/integrations/DROPBOX_IMPLEMENTATION_SUMMARY' },
            { text: 'Pipeline Integration', link: '/implementation/integrations/PIPELINE_INTEGRATION_PLAN' },
            { text: 'Email Notifications', link: '/implementation/integrations/EMAIL_NOTIFICATION_PLAN' }
          ]
        },
        {
          text: '📊 Monitoring',
          collapsed: true,
          items: [
            { text: 'Monitoring Setup', link: '/implementation/monitoring/MONITORING_SETUP_PLAN' },
            { text: 'Phase 1: Metrics', link: '/implementation/monitoring/PHASE1_COMPLETE' },
            { text: 'Phase 2: Logging', link: '/implementation/monitoring/MONITORING_PHASE2_LOGGING_COMPLETE' },
            { text: 'Phase 3: Health Checks', link: '/implementation/monitoring/MONITORING_PHASE3_HEALTH_CHECKS_COMPLETE' }
          ]
        }
      ],

      // Deployment section sidebar
      '/deployment/': [
        {
          text: '📦 Deployment',
          items: [
            { text: 'Back to Home', link: '/' },
            { text: 'Deployment Guide', link: '/deployment/DEPLOYMENT_GUIDE' },
            { text: 'Quick Start', link: '/QUICK_START' }
          ]
        }
      ],

      // Operations section sidebar
      '/operations/': [
        {
          text: '⚙️ Operations',
          items: [
            { text: 'Back to Home', link: '/' },
            { text: 'Operations Guide', link: '/operations/OPERATIONS_GUIDE' },
            { text: 'Deployment Guide', link: '/deployment/DEPLOYMENT_GUIDE' }
          ]
        }
      ],

      // ADR section sidebar
      '/adr/': [
        {
          text: '🏛️ Architecture Decisions',
          items: [
            { text: 'Back to Home', link: '/' },
            { text: 'ADR Index', link: '/adr/README' },
            { text: 'ADR Template', link: '/adr/ADR-TEMPLATE' },
            { text: 'ADR-001: Dual Storage', link: '/adr/ADR-001-dual-storage-system' },
            { text: 'ADR-002: Cloud Run', link: '/adr/ADR-002-gcp-cloud-run-deployment' },
            { text: 'ADR-003: Hybrid Cloud', link: '/adr/ADR-003-nginx-hybrid-cloud-architecture' }
          ]
        }
      ],

      // Infrastructure section sidebar
      '/infrastructure/': [
        {
          text: '🌐 Infrastructure',
          items: [
            { text: 'Back to Home', link: '/' },
            { text: 'Nginx Gateway Guide', link: '/infrastructure/NGINX_GATEWAY' },
            { text: 'System Architecture', link: '/ARCHITECTURE' },
            { text: 'Operations Guide', link: '/operations/OPERATIONS_GUIDE' }
          ]
        }
      ]
    },

    // ============================================
    // Social Links
    // ============================================
    socialLinks: [
      { icon: 'github', link: 'https://github.com/your-org/legal-form-app' }
    ],

    // ============================================
    // Footer
    // ============================================
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025 Legal Form Application Team'
    },

    // ============================================
    // Search Configuration
    // ============================================
    search: {
      provider: 'local',
      options: {
        detailedView: true,
        miniSearch: {
          searchOptions: {
            fuzzy: 0.2,
            prefix: true,
            boost: {
              title: 4,
              heading: 2,
              text: 1
            }
          }
        }
      }
    },

    // ============================================
    // Edit Link (Customize with your repo)
    // ============================================
    editLink: {
      pattern: 'https://github.com/your-org/legal-form-app/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    },

    // ============================================
    // Last Updated Timestamp
    // ============================================
    lastUpdated: {
      text: 'Last updated',
      formatOptions: {
        dateStyle: 'medium',
        timeStyle: 'short'
      }
    },

    // ============================================
    // Outline (Table of Contents)
    // ============================================
    outline: {
      level: [2, 3],
      label: 'On this page'
    },

    // ============================================
    // Doc Footer (Prev/Next Navigation)
    // ============================================
    docFooter: {
      prev: 'Previous page',
      next: 'Next page'
    }
  },

  // ============================================
  // Markdown Configuration
  // ============================================
  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    },
    lineNumbers: true,

    // Enable code block copy button
    config: (md) => {
      // You can add custom markdown-it plugins here
    }
  },

  // ============================================
  // Head Tags (SEO, Analytics, etc.)
  // ============================================
  head: [
    ['link', { rel: 'icon', href: '/logo.png' }],
    ['meta', { name: 'theme-color', content: '#3498db' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:locale', content: 'en' }],
    ['meta', { name: 'og:site_name', content: 'Legal Form Application' }],
    ['meta', { name: 'og:image', content: '/logo.png' }]
  ],

  // ============================================
  // Build Hooks (Optional)
  // ============================================
  buildEnd: async () => {
    // You can run custom build steps here
    // e.g., generate API docs, sitemap, etc.
  }
})
