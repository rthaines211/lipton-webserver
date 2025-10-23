# JSDoc Documentation Standards

## Overview

This document defines JSDoc standards for the Legal Form Application codebase. Following these standards ensures consistent, high-quality inline documentation that enables IDE autocomplete, type checking, and automated documentation generation.

---

## Table of Contents

1. [Why JSDoc?](#why-jsdoc)
2. [Basic JSDoc Syntax](#basic-jsdoc-syntax)
3. [Function Documentation](#function-documentation)
4. [TypeScript-Style Type Annotations](#typescript-style-type-annotations)
5. [Class Documentation](#class-documentation)
6. [Module Documentation](#module-documentation)
7. [Examples by Use Case](#examples-by-use-case)
8. [Automated Documentation Generation](#automated-documentation-generation)

---

## Why JSDoc?

### Benefits

1. **IDE Support** - Autocomplete, type hints, and inline documentation in VS Code, WebStorm, etc.
2. **Type Safety** - Catch type errors before runtime
3. **Self-Documenting Code** - Documentation lives with the code
4. **Automated Docs** - Generate HTML documentation automatically
5. **Onboarding** - New developers understand code faster

### When to Use JSDoc

✅ **Always document:**
- Public API functions and methods
- Complex algorithms or business logic
- Callback functions and event handlers
- Functions with multiple parameters
- Functions returning complex objects

❌ **Optional for:**
- Self-explanatory one-liners (e.g., `getFullName()`)
- Private helper functions (but still recommended)
- Trivial getters/setters

---

## Basic JSDoc Syntax

### Minimal Function Documentation

```javascript
/**
 * Calculates the sum of two numbers.
 *
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} Sum of a and b
 */
function add(a, b) {
    return a + b;
}
```

### With Examples

```javascript
/**
 * Formats a phone number to (XXX) XXX-XXXX format.
 *
 * @param {string} phoneNumber - Raw phone number (digits only)
 * @returns {string} Formatted phone number
 *
 * @example
 * formatPhoneNumber('1234567890')
 * // Returns: "(123) 456-7890"
 *
 * @example
 * formatPhoneNumber('555-1234')
 * // Returns: "(555) 123-4000"
 */
function formatPhoneNumber(phoneNumber) {
    // Implementation...
}
```

---

## Function Documentation

### Standard Function Template

```javascript
/**
 * Brief one-line description of what the function does.
 *
 * Detailed explanation with multiple lines if needed. Describe:
 * - What the function does
 * - When to use it
 * - Side effects or important behaviors
 * - Algorithm complexity if relevant
 *
 * @param {Type} paramName - Description of parameter
 * @param {Type} [optionalParam] - Optional parameter (note brackets)
 * @param {Type} [paramWithDefault=defaultValue] - Parameter with default
 * @returns {Type} Description of return value
 * @throws {ErrorType} When this error is thrown
 *
 * @example
 * // Usage example 1
 * functionName(arg1, arg2);
 *
 * @example
 * // Usage example 2
 * const result = functionName(differentArg);
 *
 * @see {@link relatedFunction} - Link to related function
 * @since 1.2.0
 * @deprecated Use newFunction() instead
 */
function functionName(paramName, optionalParam, paramWithDefault = 'default') {
    // Implementation
}
```

### Async Functions

```javascript
/**
 * Fetches user data from the API.
 *
 * @async
 * @param {string} userId - User ID to fetch
 * @returns {Promise<User>} Promise resolving to user object
 * @throws {Error} If user not found or network error
 *
 * @example
 * try {
 *     const user = await fetchUser('123');
 *     console.log(user.name);
 * } catch (error) {
 *     console.error('Failed to fetch user:', error);
 * }
 */
async function fetchUser(userId) {
    const response = await fetch(`/api/users/${userId}`);
    if (!response.ok) throw new Error('User not found');
    return await response.json();
}
```

### Callback Functions

```javascript
/**
 * Processes items in array with callback.
 *
 * @param {Array<*>} items - Items to process
 * @param {ProcessCallback} callback - Function called for each item
 * @returns {Array<*>} Processed items
 *
 * @callback ProcessCallback
 * @param {*} item - Current item being processed
 * @param {number} index - Index of current item
 * @param {Array} array - The full array
 * @returns {*} Processed item
 *
 * @example
 * const numbers = [1, 2, 3];
 * const doubled = processItems(numbers, (num) => num * 2);
 * // Returns: [2, 4, 6]
 */
function processItems(items, callback) {
    return items.map(callback);
}
```

---

## TypeScript-Style Type Annotations

### Complex Object Types

```javascript
/**
 * @typedef {Object} User
 * @property {string} id - Unique user identifier
 * @property {string} email - User email address
 * @property {string} name - Full name
 * @property {number} age - User age
 * @property {boolean} isActive - Account status
 * @property {string[]} roles - User roles
 * @property {Address} [address] - Optional address object
 */

/**
 * @typedef {Object} Address
 * @property {string} street - Street address
 * @property {string} city - City name
 * @property {string} state - Two-letter state code
 * @property {string} zipCode - ZIP code
 */

/**
 * Creates a new user account.
 *
 * @param {User} userData - User data object
 * @returns {Promise<User>} Created user with generated ID
 */
async function createUser(userData) {
    // Implementation
}
```

### Union Types

```javascript
/**
 * Processes payment with multiple payment methods.
 *
 * @param {string|number} amount - Amount in dollars or cents
 * @param {'credit'|'debit'|'paypal'} method - Payment method
 * @returns {Promise<{success: boolean, transactionId: string}>} Payment result
 */
async function processPayment(amount, method) {
    // Implementation
}
```

### Generic Types

```javascript
/**
 * Generic function to filter array by predicate.
 *
 * @template T
 * @param {Array<T>} items - Array of items
 * @param {function(T): boolean} predicate - Filter predicate
 * @returns {Array<T>} Filtered array
 *
 * @example
 * const numbers = [1, 2, 3, 4, 5];
 * const evens = filterArray(numbers, n => n % 2 === 0);
 * // Returns: [2, 4]
 */
function filterArray(items, predicate) {
    return items.filter(predicate);
}
```

---

## Class Documentation

### Class with Constructor and Methods

```javascript
/**
 * Manages form submission state and validation.
 *
 * This class handles the complete lifecycle of form submissions including:
 * - Real-time validation
 * - Progress tracking
 * - Error handling
 * - Server communication
 *
 * @class
 * @example
 * const manager = new FormManager('#myForm', {
 *     validateOnChange: true,
 *     submitUrl: '/api/submit'
 * });
 * manager.initialize();
 */
class FormManager {
    /**
     * Create a FormManager instance.
     *
     * @constructor
     * @param {string} formSelector - CSS selector for form element
     * @param {FormOptions} [options={}] - Configuration options
     * @param {boolean} [options.validateOnChange=false] - Validate on input change
     * @param {string} [options.submitUrl='/api/form'] - Form submission endpoint
     * @param {number} [options.timeout=30000] - Request timeout in ms
     */
    constructor(formSelector, options = {}) {
        /** @private @type {HTMLFormElement} */
        this.form = document.querySelector(formSelector);

        /** @private @type {FormOptions} */
        this.options = {
            validateOnChange: false,
            submitUrl: '/api/form',
            timeout: 30000,
            ...options
        };

        /** @private @type {Map<string, string>} */
        this.errors = new Map();

        /** @private @type {boolean} */
        this.isSubmitting = false;
    }

    /**
     * Initialize form manager and attach event listeners.
     *
     * Must be called before form can accept submissions.
     *
     * @public
     * @returns {void}
     *
     * @example
     * const manager = new FormManager('#myForm');
     * manager.initialize();
     */
    initialize() {
        this.form.addEventListener('submit', this.handleSubmit.bind(this));

        if (this.options.validateOnChange) {
            this.attachValidationListeners();
        }
    }

    /**
     * Validate form fields.
     *
     * @private
     * @returns {boolean} True if all fields are valid
     */
    validate() {
        this.errors.clear();
        // Validation logic...
        return this.errors.size === 0;
    }

    /**
     * Handle form submission.
     *
     * @private
     * @param {Event} event - Submit event
     * @returns {Promise<void>}
     * @throws {Error} If submission fails
     */
    async handleSubmit(event) {
        event.preventDefault();

        if (!this.validate()) {
            this.displayErrors();
            return;
        }

        this.isSubmitting = true;

        try {
            const formData = new FormData(this.form);
            const response = await this.submitToServer(formData);
            this.onSuccess(response);
        } catch (error) {
            this.onError(error);
        } finally {
            this.isSubmitting = false;
        }
    }

    /**
     * Submit form data to server.
     *
     * @private
     * @param {FormData} formData - Form data to submit
     * @returns {Promise<Object>} Server response
     * @throws {Error} On network or server error
     */
    async submitToServer(formData) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.options.timeout);

        try {
            const response = await fetch(this.options.submitUrl, {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            return await response.json();
        } finally {
            clearTimeout(timeout);
        }
    }

    /**
     * Callback fired on successful submission.
     *
     * @protected
     * @param {Object} response - Server response
     * @returns {void}
     */
    onSuccess(response) {
        console.log('Form submitted successfully:', response);
    }

    /**
     * Callback fired on submission error.
     *
     * @protected
     * @param {Error} error - Error object
     * @returns {void}
     */
    onError(error) {
        console.error('Form submission failed:', error);
    }
}

/**
 * @typedef {Object} FormOptions
 * @property {boolean} [validateOnChange=false] - Validate on input change
 * @property {string} [submitUrl='/api/form'] - Form submission endpoint
 * @property {number} [timeout=30000] - Request timeout in milliseconds
 */
```

---

## Module Documentation

### ES6 Module

```javascript
/**
 * @fileoverview Form validation utilities for the legal form application.
 *
 * This module provides a comprehensive set of validation functions for:
 * - Email addresses
 * - Phone numbers
 * - ZIP codes
 * - Social Security Numbers
 * - Custom validators
 *
 * @module utils/validators
 * @author Legal Forms Team
 * @version 1.0.0
 * @since 2025-01-01
 *
 * @example
 * import { validateEmail, validatePhone } from './utils/validators.js';
 *
 * if (validateEmail('user@example.com')) {
 *     // Email is valid
 * }
 */

/**
 * Email validation regex pattern.
 * @constant {RegExp}
 * @private
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates an email address.
 *
 * @param {string} email - Email address to validate
 * @returns {boolean} True if email is valid
 *
 * @example
 * validateEmail('user@example.com'); // true
 * validateEmail('invalid-email'); // false
 */
export function validateEmail(email) {
    return EMAIL_REGEX.test(email);
}

/**
 * Validates a US phone number.
 *
 * Accepts formats:
 * - (123) 456-7890
 * - 123-456-7890
 * - 1234567890
 *
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if phone number is valid
 *
 * @example
 * validatePhone('(555) 123-4567'); // true
 * validatePhone('555-1234'); // false
 */
export function validatePhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 10;
}
```

---

## Examples by Use Case

### Event Handlers

```javascript
/**
 * Handles click event on submit button.
 *
 * Prevents default behavior, validates form, and submits if valid.
 *
 * @param {MouseEvent} event - Click event
 * @returns {Promise<void>}
 * @listens MouseEvent#click
 */
async function handleSubmitClick(event) {
    event.preventDefault();
    // Implementation
}

/**
 * Handles form input change for real-time validation.
 *
 * @param {InputEvent} event - Input change event
 * @returns {void}
 * @listens InputEvent#input
 */
function handleInputChange(event) {
    const { name, value } = event.target;
    validateField(name, value);
}
```

### API Calls

```javascript
/**
 * Fetches case data from the API.
 *
 * @async
 * @param {string} caseId - Case ID to fetch
 * @param {Object} [options={}] - Fetch options
 * @param {string} [options.token] - Authentication token
 * @param {number} [options.timeout=5000] - Request timeout
 * @returns {Promise<Case>} Case data
 * @throws {Error} If case not found or network error
 *
 * @example
 * try {
 *     const caseData = await fetchCase('CASE-123', {
 *         token: 'abc123'
 *     });
 *     console.log(caseData);
 * } catch (error) {
 *     if (error.message.includes('404')) {
 *         console.error('Case not found');
 *     }
 * }
 */
async function fetchCase(caseId, options = {}) {
    const {  token, timeout = 5000 } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(`/api/cases/${caseId}`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * @typedef {Object} Case
 * @property {string} id - Case ID
 * @property {string} title - Case title
 * @property {string} status - Case status
 * @property {Plaintiff[]} plaintiffs - Array of plaintiffs
 * @property {Defendant[]} defendants - Array of defendants
 * @property {Date} createdAt - Creation timestamp
 */
```

### DOM Manipulation

```javascript
/**
 * Creates and appends a new plaintiff fieldset to the form.
 *
 * @param {number} plaintiffNumber - Sequential plaintiff number
 * @returns {HTMLFieldSetElement} Created fieldset element
 *
 * @example
 * const fieldset = createPlaintiffFieldset(2);
 * document.querySelector('#plaintiffs-container').appendChild(fieldset);
 */
function createPlaintiffFieldset(plaintiffNumber) {
    const fieldset = document.createElement('fieldset');
    fieldset.id = `plaintiff-${plaintiffNumber}`;
    fieldset.className = 'plaintiff-fieldset';

    // Add fields...

    return fieldset;
}

/**
 * Shows or hides an element with animation.
 *
 * @param {HTMLElement|string} element - Element or selector
 * @param {boolean} show - True to show, false to hide
 * @param {number} [duration=300] - Animation duration in ms
 * @returns {Promise<void>} Resolves when animation completes
 *
 * @example
 * await toggleElement('#error-message', true, 500);
 * // Element fades in over 500ms
 */
async function toggleElement(element, show, duration = 300) {
    const el = typeof element === 'string'
        ? document.querySelector(element)
        : element;

    if (!el) return;

    if (show) {
        el.style.display = 'block';
        await animate(el, { opacity: [0, 1] }, duration);
    } else {
        await animate(el, { opacity: [1, 0] }, duration);
        el.style.display = 'none';
    }
}
```

### Error Handling

```javascript
/**
 * Custom error for API-related failures.
 *
 * @extends Error
 */
class APIError extends Error {
    /**
     * Create an APIError.
     *
     * @param {string} message - Error message
     * @param {number} statusCode - HTTP status code
     * @param {Object} [details={}] - Additional error details
     */
    constructor(message, statusCode, details = {}) {
        super(message);

        /** @type {string} */
        this.name = 'APIError';

        /** @type {number} */
        this.statusCode = statusCode;

        /** @type {Object} */
        this.details = details;

        /** @type {Date} */
        this.timestamp = new Date();
    }

    /**
     * Convert error to JSON for logging.
     *
     * @returns {Object} JSON representation
     */
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            statusCode: this.statusCode,
            details: this.details,
            timestamp: this.timestamp,
            stack: this.stack
        };
    }
}
```

---

## Automated Documentation Generation

### Setup JSDoc

```bash
# Install JSDoc
npm install --save-dev jsdoc

# Create jsdoc.json configuration
cat > jsdoc.json <<'EOF'
{
  "source": {
    "include": ["server.js", "js/", "monitoring/"],
    "includePattern": ".+\\.js(doc|x)?$",
    "excludePattern": "(node_modules/|docs/|dist/)"
  },
  "opts": {
    "destination": "./docs/generated/jsdoc",
    "recurse": true,
    "readme": "./README.md",
    "template": "node_modules/better-docs"
  },
  "plugins": ["plugins/markdown"],
  "templates": {
    "cleverLinks": true,
    "monospaceLinks": true,
    "default": {
      "outputSourceFiles": true
    }
  }
}
EOF

# Add npm script
npm pkg set scripts.docs="jsdoc -c jsdoc.json"

# Generate documentation
npm run docs
```

### Better Documentation with Themes

```bash
# Install better-docs theme
npm install --save-dev better-docs

# Update jsdoc.json template
{
  "opts": {
    "template": "node_modules/better-docs"
  }
}

# Or use docdash theme
npm install --save-dev docdash

{
  "opts": {
    "template": "node_modules/docdash"
  }
}
```

### GitHub Actions for Auto-Deployment

```yaml
# .github/workflows/jsdoc.yml
name: Generate JSDoc

on:
  push:
    branches: [main]
    paths:
      - '**.js'
      - 'jsdoc.json'

jobs:
  generate-docs:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'

    - name: Install dependencies
      run: npm ci

    - name: Generate JSDoc
      run: npm run docs

    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./docs/generated/jsdoc
```

---

## Best Practices

### ✅ DO

- **Be concise** - First line should be brief summary
- **Be specific** - Describe exact behavior, not vague generalities
- **Use examples** - Show real usage patterns
- **Document edge cases** - Note special behaviors or limitations
- **Keep types accurate** - Match actual implementation
- **Update with code** - JSDoc is code, keep it in sync

### ❌ DON'T

- **Don't repeat code** - If function name is `getUserById`, don't just say "Gets user by ID"
- **Don't document obvious** - Skip trivial getters/setters unless they have side effects
- **Don't use vague types** - Prefer `{string}` over `{*}`, define object shapes
- **Don't skip @returns** - Always document return values
- **Don't forget async** - Mark async functions with `@async`

### Example: Good vs. Bad

**❌ Bad:**
```javascript
/**
 * Gets data.
 * @param {*} id
 * @returns {*}
 */
function getData(id) {
    return fetch(`/api/data/${id}`).then(r => r.json());
}
```

**✅ Good:**
```javascript
/**
 * Fetches case data by ID from the API.
 *
 * Makes an authenticated request to retrieve full case details including
 * plaintiffs, defendants, and issue selections.
 *
 * @async
 * @param {string} id - Case ID (format: "CASE-XXXXXX")
 * @returns {Promise<Case>} Promise resolving to case object
 * @throws {Error} If case not found (404) or network error
 *
 * @example
 * const caseData = await getData('CASE-123456');
 * console.log(caseData.plaintiffs.length);
 */
async function getData(id) {
    const response = await fetch(`/api/data/${id}`);
    if (!response.ok) throw new Error(`Case ${id} not found`);
    return await response.json();
}
```

---

## IDE Integration

### VS Code Settings

Add to `.vscode/settings.json`:

```json
{
  "javascript.suggest.jsdoc.generateReturns": true,
  "javascript.suggest.completeJSDocs": true,
  "typescript.suggest.jsdoc.generateReturns": true,
  "editor.quickSuggestions": {
    "comments": "on"
  }
}
```

### Type Checking with JSDoc

Enable type checking in VS Code:

```javascript
// @ts-check

/**
 * @param {number} value
 * @returns {string}
 */
function toString(value) {
    return String(value); // ✅ Valid
    // return value; // ❌ Would show error: Type 'number' is not assignable to type 'string'
}
```

---

## Resources

- [JSDoc Official Documentation](https://jsdoc.app/)
- [TypeScript JSDoc Reference](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html)
- [Google JavaScript Style Guide](https://google.github.io/styleguide/jsguide.html#jsdoc)
- [Better Docs Theme](https://github.com/SoftwareBrothers/better-docs)

---

## Quick Reference

### Common Tags

| Tag | Purpose | Example |
|-----|---------|---------|
| `@param` | Function parameter | `@param {string} name` |
| `@returns` | Return value | `@returns {boolean}` |
| `@throws` | Thrown error | `@throws {Error}` |
| `@async` | Async function | `@async` |
| `@example` | Usage example | `@example const x = fn()` |
| `@typedef` | Type definition | `@typedef {Object} User` |
| `@property` | Object property | `@property {string} id` |
| `@callback` | Callback function | `@callback OnComplete` |
| `@template` | Generic type | `@template T` |
| `@deprecated` | Deprecated function | `@deprecated Use newFn()` |
| `@see` | Related reference | `@see {@link otherFn}` |
| `@since` | Version added | `@since 1.2.0` |
| `@private` | Private member | `@private` |
| `@protected` | Protected member | `@protected` |
| `@public` | Public member | `@public` |

### Common Types

| Type | Description |
|------|-------------|
| `{string}` | String value |
| `{number}` | Number value |
| `{boolean}` | Boolean value |
| `{Object}` | Object |
| `{Array}` | Array |
| `{Array<string>}` | Array of strings |
| `{Function}` | Function |
| `{Promise}` | Promise |
| `{Promise<T>}` | Promise of type T |
| `{*}` | Any type |
| `{?string}` | Nullable string |
| `{!string}` | Non-null string |
| `{string|number}` | Union type |

---

**Document Version:** 1.0
**Last Updated:** October 23, 2025
**Maintained By:** Development Team
