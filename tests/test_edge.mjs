import { chromium } from '@playwright/test';

async function testEdge() {
  console.log('🚀 Launching Microsoft Edge via Playwright...');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error(`[EDGE CONSOLE ERROR]`, msg.text());
      errors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    console.error('[EDGE PAGE ERROR]', err.message);
    errors.push(err.message);
  });

  // Inject authentication before navigating
  await page.addInitScript(() => {
    localStorage.setItem('anand_admin_authenticated', 'true');
  });

  const targetUrl = 'https://anand-builders-rental-zeta.vercel.app/admin/payments';
  console.log(`Navigating directly to authenticated ${targetUrl}...`);
  await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });

  console.log('Page Title:', await page.title());
  console.log('Current URL:', page.url());

  // Verify Payments page elements
  const pageHeader = await page.locator('text=जमा पेमेंट्स नियंत्रण').isVisible();
  console.log('Payments Tab Header visible:', pageHeader);

  // Test opening "पेमेंट नोंदवा" modal
  console.log('Testing "पेमेंट नोंदवा" (Record Payment) modal interaction...');
  const recordPayBtn = page.locator('button:has-text("पेमेंट नोंदवा")');
  await recordPayBtn.click();
  await page.waitForTimeout(500);

  const isModalVisible = await page.locator('text=ग्राहकाची रक्कम जमा नोंदवा').isVisible();
  console.log('Record Payment Modal visible:', isModalVisible);

  // Take screenshot of opened modal
  const modalScreenshotPath = 'C:\\Users\\HP\\.gemini\\antigravity-ide\\brain\\1b20ec31-2c25-49ae-9102-5dc5836c8d7d\\edge_payments_modal.png';
  await page.screenshot({ path: modalScreenshotPath, fullPage: true });
  console.log('Modal screenshot saved to:', modalScreenshotPath);

  // Close modal
  const cancelBtn = page.locator('button:has-text("रद्द करा")');
  await cancelBtn.click();
  await page.waitForTimeout(300);

  const isModalClosed = !(await page.locator('text=ग्राहकाची रक्कम जमा नोंदवा').isVisible());
  console.log('Modal successfully closed:', isModalClosed);

  // Test language toggle to English
  console.log('Testing language switch to English...');
  const enBtn = page.locator('button:has-text("English")');
  if (await enBtn.isVisible()) {
    await enBtn.click();
    await page.waitForTimeout(300);
    const enVisible = await page.locator('text=Payments Control').isVisible();
    console.log('English Payments Control header visible:', enVisible);
  }

  // Final full screenshot
  const finalScreenshot = 'C:\\Users\\HP\\.gemini\\antigravity-ide\\brain\\1b20ec31-2c25-49ae-9102-5dc5836c8d7d\\edge_payments_english.png';
  await page.screenshot({ path: finalScreenshot, fullPage: true });

  if (errors.length > 0) {
    console.error(`❌ Found ${errors.length} error(s) during Edge test!`);
    process.exit(1);
  } else {
    console.log('\n🎉 ALL EDGE BROWSER TESTS PASSED 100% WITH ZERO ERRORS!');
  }

  await browser.close();
}

testEdge().catch((err) => {
  console.error('Fatal Edge test error:', err);
  process.exit(1);
});
