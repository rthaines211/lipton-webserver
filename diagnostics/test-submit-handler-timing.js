/**
 * Submit Button Handler Attachment Timing Diagnostic
 *
 * Purpose: Identify why submitBtnHandlerAttached shows false in debug object
 *
 * What this tests:
 * 1. When is the submit button handler actually attached?
 * 2. When is the debug object captured?
 * 3. Is the handler attached to the correct element?
 * 4. Are there multiple handlers attached?
 *
 * Run this in browser console during page load
 */

(function() {
    console.log('🔬 Starting Submit Handler Timing Diagnostic');
    console.log('=============================================\n');

    const events = [];

    // Track DOM ready state
    events.push({
        timestamp: new Date().toISOString(),
        event: 'Script Loaded',
        readyState: document.readyState
    });

    console.log('📄 Document ready state:', document.readyState);

    // Monitor form element
    function checkFormAndButton() {
        const form = document.getElementById('main-form');
        const submitBtn = form ? form.querySelector('button[type="submit"]') : null;

        const check = {
            timestamp: new Date().toISOString(),
            event: 'Form Check',
            formExists: !!form,
            submitBtnExists: !!submitBtn,
            submitBtnId: submitBtn?.id || 'NO_ID',
            submitBtnHasClickListener: false,
            submitBtnHasSubmitListener: false
        };

        if (submitBtn) {
            // Check for event listeners (note: this may not detect all listeners)
            const clickListeners = getEventListeners ? getEventListeners(submitBtn).click : [];
            const submitListeners = form ? (getEventListeners ? getEventListeners(form).submit : []) : [];

            check.submitBtnHasClickListener = clickListeners.length > 0;
            check.submitBtnHasSubmitListener = submitListeners.length > 0;

            console.log('🔘 Submit button found:', {
                id: submitBtn.id,
                type: submitBtn.type,
                disabled: submitBtn.disabled,
                innerHTML: submitBtn.innerHTML.substring(0, 50),
                clickListeners: clickListeners.length,
                formSubmitListeners: submitListeners.length
            });
        } else {
            console.warn('⚠️ Submit button not found');
        }

        if (form) {
            console.log('📋 Form found:', {
                id: form.id,
                action: form.action,
                method: form.method
            });
        } else {
            console.warn('⚠️ Form not found');
        }

        events.push(check);
        return check;
    }

    // Initial check
    console.log('\n🔍 Initial check:');
    checkFormAndButton();

    // Monitor addEventListener calls on form and button
    const originalAddEventListener = EventTarget.prototype.addEventListener;

    EventTarget.prototype.addEventListener = function(type, listener, options) {
        // Only track form and button events
        if (this.id === 'main-form' || this.type === 'submit') {
            const event = {
                timestamp: new Date().toISOString(),
                event: 'addEventListener',
                elementId: this.id || 'NO_ID',
                elementType: this.tagName,
                eventType: type,
                hasListener: true
            };

            events.push(event);

            console.log('🎯 Event listener attached:', {
                element: `<${this.tagName}${this.id ? ` id="${this.id}"` : ''}>`,
                eventType: type,
                listenerType: typeof listener
            });
        }

        return originalAddEventListener.call(this, type, listener, options);
    };

    console.log('✅ addEventListener monitoring enabled\n');

    // Monitor form submission functions
    if (typeof window.showReviewScreen === 'function') {
        const originalShowReviewScreen = window.showReviewScreen;

        window.showReviewScreen = function(...args) {
            events.push({
                timestamp: new Date().toISOString(),
                event: 'showReviewScreen called'
            });

            console.log('📝 showReviewScreen() called');
            return originalShowReviewScreen.apply(this, args);
        };

        console.log('✅ showReviewScreen monitoring enabled');
    }

    // Check periodically
    let checkCount = 0;
    const checkInterval = setInterval(() => {
        checkCount++;
        console.log(`\n🔄 Periodic check #${checkCount}:`);
        checkFormAndButton();

        if (checkCount >= 5) {
            clearInterval(checkInterval);
            console.log('\n⏹️ Stopped periodic checks after 5 attempts');
        }
    }, 1000);

    // DOMContentLoaded listener
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            events.push({
                timestamp: new Date().toISOString(),
                event: 'DOMContentLoaded'
            });

            console.log('\n✅ DOMContentLoaded fired');
            console.log('🔍 Post-DOMContentLoaded check:');
            checkFormAndButton();
        });
    } else {
        console.log('ℹ️ DOMContentLoaded already fired');
    }

    // window.load listener
    if (document.readyState !== 'complete') {
        window.addEventListener('load', () => {
            events.push({
                timestamp: new Date().toISOString(),
                event: 'window.load'
            });

            console.log('\n✅ window.load fired');
            console.log('🔍 Post-load check:');
            checkFormAndButton();
        });
    } else {
        console.log('ℹ️ window.load already fired');
    }

    // Report function
    window.getSubmitHandlerReport = function() {
        console.log('\n📊 SUBMIT HANDLER TIMING REPORT');
        console.log('================================\n');

        console.log('📜 Event Timeline:');
        console.table(events);

        // Analyze timing
        const addListenerEvents = events.filter(e => e.event === 'addEventListener');
        const formChecks = events.filter(e => e.event === 'Form Check');

        console.log(`\n📈 Summary:`);
        console.log(`  Event listeners attached: ${addListenerEvents.length}`);
        console.log(`  Form checks performed: ${formChecks.length}`);

        // Check if handler is attached AFTER debug snapshot
        const lastCheck = formChecks[formChecks.length - 1];
        if (lastCheck) {
            console.log(`\n📊 Final State:`);
            console.log(`  Form exists: ${lastCheck.formExists}`);
            console.log(`  Submit button exists: ${lastCheck.submitBtnExists}`);
            console.log(`  Click listener attached: ${lastCheck.submitBtnHasClickListener}`);
            console.log(`  Submit listener attached: ${lastCheck.submitBtnHasSubmitListener}`);
        }

        // Diagnose the issue
        console.log(`\n🔍 Diagnosis:`);
        if (addListenerEvents.length === 0) {
            console.error('❌ PROBLEM: No event listeners were attached to form/button!');
            console.log('   → Check if form-submission.js is loaded');
            console.log('   → Check if showReviewScreen() is properly wired to submit button');
        } else if (!lastCheck?.submitBtnHasClickListener && !lastCheck?.submitBtnHasSubmitListener) {
            console.warn('⚠️ Event listeners attached, but not detected in final check');
            console.log('   → This may be a timing issue with getEventListeners()');
            console.log('   → Debug object may be captured before listener attachment');
        } else {
            console.log('✅ Event listeners appear to be properly attached');
        }

        console.log('\n📋 Recommendations:');
        console.log('  1. Ensure form-submission.js loads before debug snapshot');
        console.log('  2. Use DOMContentLoaded or defer to ensure proper timing');
        console.log('  3. Move debug snapshot to after all initialization');
        console.log('  4. Check if handler is attached via onclick attribute vs addEventListener');

        return { events };
    };

    console.log('\n📋 Test Instructions:');
    console.log('1. Reload the page with this script injected');
    console.log('2. Wait for all checks to complete');
    console.log('3. Try submitting the form');
    console.log('4. Run getSubmitHandlerReport() to see analysis\n');

    console.log('✅ Submit handler timing diagnostic ready.\n');

    // Provide manual check function
    window.manualCheckHandler = function() {
        console.log('\n🔧 Manual Handler Check:');
        return checkFormAndButton();
    };
})();
