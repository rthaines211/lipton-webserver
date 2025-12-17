/**
 * Simple Test to Debug Page Loading
 */

import { test, expect } from '@playwright/test';

const DOC_GEN_URL = 'http://localhost:3000/?token=29c0f5b6b92b1fdc4305dd844a0767a1d00de2a01334214a07bd3e30bb5ad3d8';

test.describe('Simple Page Load Test', () => {
  test('should load the page and verify title', async ({ page }) => {
    console.log('Navigating to:', DOC_GEN_URL);

    await page.goto(DOC_GEN_URL, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('Page loaded, waiting for body...');
    await page.waitForSelector('body', { timeout: 10000 });

    console.log('Body found, taking screenshot...');
    await page.screenshot({ path: 'test-screenshots/page-load.png', fullPage: false });

    console.log('Looking for Load from Intake button...');
    const button = page.locator('button:has-text("Load from Intake")');

    const buttonCount = await button.count();
    console.log('Button count:', buttonCount);

    if (buttonCount > 0) {
      console.log('Button found! Checking visibility...');
      const isVisible = await button.isVisible({ timeout: 5000 });
      console.log('Button visible:', isVisible);

      expect(isVisible).toBeTruthy();
    } else {
      console.log('Button not found in DOM');
      throw new Error('Load from Intake button not found');
    }
  });
});
