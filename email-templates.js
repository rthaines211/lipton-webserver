/**
 * Email Templates Module
 *
 * Provides professional HTML email templates for document completion notifications.
 * All templates are mobile-responsive and follow email best practices.
 *
 * Features:
 * - Professional HTML templates with Lipton Legal branding
 * - Mobile-responsive design
 * - Plain text fallback for email clients that don't support HTML
 * - Two template variants: with and without Dropbox links
 * - Graceful handling of missing data
 *
 * Color Palette:
 * - Primary Blue: #00AEEF (Lipton Legal brand color)
 * - Dark Text: #333333
 * - Light Gray: #f8f9fa
 * - Border Gray: #e0e0e0
 *
 * @module email-templates
 */

/**
 * Format date for email display
 * @private
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string (e.g., "January 24, 2025 at 10:30 AM")
 */
function formatDate(date = new Date()) {
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    };
    return date.toLocaleString('en-US', options);
}

/**
 * Escape HTML special characters to prevent XSS
 * @private
 * @param {string} text - Text to escape
 * @returns {string} Escaped text safe for HTML
 */
function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Get completion email template WITH Dropbox link
 *
 * Use this template when documents are uploaded to Dropbox and a shared link is available.
 *
 * @param {Object} options - Template options
 * @param {string} options.name - Recipient name (e.g., "John Doe")
 * @param {string} options.streetAddress - Property address (e.g., "123 Main Street")
 * @param {number} options.documentCount - Number of documents generated
 * @param {string} options.dropboxLink - Dropbox shared link URL
 * @returns {{subject: string, html: string, text: string}} Email template object
 */
function getCompletionEmailTemplate(options) {
    const { name, streetAddress, documentCount, dropboxLink } = options;

    // Escape user-provided data to prevent XSS
    const safeAddress = escapeHtml(streetAddress || 'your property');
    const safeDocCount = parseInt(documentCount, 10) || 32;
    const safeDropboxLink = escapeHtml(dropboxLink);

    // Format current date/time
    const completionDate = formatDate();

    // Subject line format: "{streetAddress} - Discover Forms Generated"
    const subject = `${streetAddress} - Discover Forms Generated`;

    // HTML email template
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documents Ready - Lipton Legal</title>
    <!--[if mso]>
    <style type="text/css">
        body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
    </style>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 20px 10px;">
                <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

                    <!-- Header -->
                    <tr>
                        <td style="padding: 0;">
                            <table role="presentation" style="width: 100%; background: linear-gradient(135deg, #1F2A44 0%, #2A3B5A 100%);">
                                <tr>
                                    <td style="padding: 30px; text-align: center;">
                                        <h1 style="margin: 0 0 8px; font-size: 28px; font-weight: bold; color: #FFFFFF;">
                                            Lipton Legal
                                        </h1>
                                        <p style="margin: 0; font-size: 15px; color: rgba(255, 255, 255, 0.9);">
                                            Discovery Document Generation
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px 30px;">

                            <!-- Main Message -->
                            <p style="margin: 0 0 25px; font-size: 18px; line-height: 1.6; color: #333333; font-weight: 500;">
                                Your legal documents for <strong>${safeAddress}</strong> have been successfully generated and are ready for review.
                            </p>

                            <!-- Details Box -->
                            <table role="presentation" style="width: 100%; border-left: 4px solid #1F2A44; background-color: #f8f9fa; margin: 20px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 18px;">
                                        <p style="margin: 8px 0; font-size: 15px; color: #333333;">
                                            📄 <strong>Documents Generated:</strong> ${safeDocCount}
                                        </p>
                                        <p style="margin: 8px 0; font-size: 15px; color: #333333;">
                                            📍 <strong>Property Address:</strong> ${safeAddress}
                                        </p>
                                        <p style="margin: 8px 0; font-size: 15px; color: #333333;">
                                            📅 <strong>Completed:</strong> ${completionDate}
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA Button -->
                            <table role="presentation" style="width: 100%; margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="${safeDropboxLink}" style="display: inline-block; padding: 14px 30px; background-color: #00AEEF; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                                            Access Your Documents
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Alternative Link -->
                            <p style="margin: 15px 0; font-size: 14px; color: #666666; text-align: center;">
                                Or copy and paste this link into your browser:
                            </p>
                            <p style="margin: 0 0 20px; font-size: 14px; color: #00AEEF; word-break: break-all; text-align: center;">
                                <a href="${safeDropboxLink}" style="color: #00AEEF; text-decoration: underline;">
                                    ${safeDropboxLink}
                                </a>
                            </p>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 20px 30px 30px; border-top: 1px solid #e0e0e0;">
                            <p style="margin: 0 0 10px; font-size: 15px; color: #333333;">
                                <strong>Best regards,</strong><br>
                                The Lipton Legal Team
                            </p>
                            <p style="margin: 15px 0 0; font-size: 12px; color: #999999; line-height: 1.5;">
                                This is an automated notification. This email was sent because you requested to be notified when your documents were ready. Your documents are available via the link above.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();

    // Plain text version (fallback for clients that don't support HTML)
    const text = `
LIPTON LEGAL - Discovery Document Generation

Your legal documents for ${streetAddress} have been successfully generated and are ready for review.

DETAILS:
- Documents Generated: ${safeDocCount}
- Property Address: ${safeAddress}
- Completed: ${completionDate}

ACCESS YOUR DOCUMENTS:
${dropboxLink}

---
This is an automated notification sent because you requested to be notified when your documents were ready.
    `.trim();

    return { subject, html, text };
}

/**
 * Get completion email template WITHOUT Dropbox link (fallback)
 *
 * Use this template when Dropbox is unavailable or disabled.
 * Provides a professional fallback message for document delivery.
 *
 * @param {Object} options - Template options
 * @param {string} options.name - Recipient name (e.g., "John Doe")
 * @param {string} options.streetAddress - Property address (e.g., "123 Main Street")
 * @param {number} options.documentCount - Number of documents generated
 * @returns {{subject: string, html: string, text: string}} Email template object
 */
function getCompletionEmailTemplateNoLink(options) {
    const { name, streetAddress, documentCount } = options;

    // Escape user-provided data to prevent XSS
    const safeAddress = escapeHtml(streetAddress || 'your property');
    const safeDocCount = parseInt(documentCount, 10) || 32;

    // Format current date/time
    const completionDate = formatDate();

    // Subject line format: "{streetAddress} - Discover Forms Generated"
    const subject = `${streetAddress} - Discover Forms Generated`;

    // HTML email template (without Dropbox link)
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documents Ready - Lipton Legal</title>
    <!--[if mso]>
    <style type="text/css">
        body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
    </style>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 20px 10px;">
                <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

                    <!-- Header -->
                    <tr>
                        <td style="padding: 0;">
                            <table role="presentation" style="width: 100%; background: linear-gradient(135deg, #1F2A44 0%, #2A3B5A 100%);">
                                <tr>
                                    <td style="padding: 30px; text-align: center;">
                                        <h1 style="margin: 0 0 8px; font-size: 28px; font-weight: bold; color: #FFFFFF;">
                                            Lipton Legal
                                        </h1>
                                        <p style="margin: 0; font-size: 15px; color: rgba(255, 255, 255, 0.9);">
                                            Discovery Document Generation
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px 30px;">

                            <!-- Main Message -->
                            <p style="margin: 0 0 25px; font-size: 18px; line-height: 1.6; color: #333333; font-weight: 500;">
                                Your legal documents for <strong>${safeAddress}</strong> have been successfully generated.
                            </p>

                            <!-- Details Box -->
                            <table role="presentation" style="width: 100%; border-left: 4px solid #1F2A44; background-color: #f8f9fa; margin: 20px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 18px;">
                                        <p style="margin: 8px 0; font-size: 15px; color: #333333;">
                                            📄 <strong>Documents Generated:</strong> ${safeDocCount}
                                        </p>
                                        <p style="margin: 8px 0; font-size: 15px; color: #333333;">
                                            📍 <strong>Property Address:</strong> ${safeAddress}
                                        </p>
                                        <p style="margin: 8px 0; font-size: 15px; color: #333333;">
                                            📅 <strong>Completed:</strong> ${completionDate}
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Fallback Message (No Dropbox Link) -->
                            <table role="presentation" style="width: 100%; background-color: #fff8e1; border-left: 4px solid #ffc107; margin: 20px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 15px;">
                                        <p style="margin: 0 0 10px; font-size: 16px; font-weight: 600; color: #333333;">
                                            📋 Document Access
                                        </p>
                                        <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #333333;">
                                            Your documents have been prepared and are ready for delivery.
                                            Please contact our office to arrange document pickup or delivery.
                                        </p>
                                    </td>
                                </tr>
                            </table>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 25px 30px 30px; border-top: 1px solid #e0e0e0;">
                            <p style="margin: 0; font-size: 12px; color: #999999; line-height: 1.5; text-align: center;">
                                This is an automated notification sent because you requested to be notified when your documents were ready.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();

    // Plain text version (fallback for clients that don't support HTML)
    const text = `
Hi ${name || 'User'},

Great news! Your legal documents for ${streetAddress} have been successfully generated.

DETAILS:
- Documents Generated: ${safeDocCount}
- Property Address: ${safeAddress}
- Completed: ${completionDate}

DOCUMENT ACCESS:
Your documents have been prepared and are ready for delivery. Please contact our office to arrange document pickup or delivery.

---
This is an automated notification sent because you requested to be notified when your documents were ready.
    `.trim();

    return { subject, html, text };
}

// Export template functions
module.exports = {
    getCompletionEmailTemplate,
    getCompletionEmailTemplateNoLink
};
