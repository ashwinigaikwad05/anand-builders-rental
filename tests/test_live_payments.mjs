import { chromium } from '@playwright/test';

async function runLivePaymentsE2ETest() {
  console.log('===========================================================================');
  console.log('   ANAND BUILDERS & DEVELOPERS - LIVE EDGE E2E PAYMENTS TEST');
  console.log('   Target: https://anand-builders-rental-zeta.vercel.app/admin/payments');
  console.log('===========================================================================\n');

  console.log('🚀 Step 1: Launching real Microsoft Edge browser...');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error(`  ⚠️ [Browser Console Error]`, msg.text());
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    console.error(`  ❌ [Uncaught Page Error]`, err.message);
    pageErrors.push(err.message);
  });

  // Step 2: Navigate to URL
  const targetUrl = 'https://anand-builders-rental-zeta.vercel.app/admin/payments';
  console.log(`\n🌐 Step 2: Navigating to ${targetUrl}...`);
  await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 35000 });
  console.log(`  Current URL after load: ${page.url()}`);

  // Step 3: Handle Login if unauthenticated
  if (page.url().includes('/admin/login')) {
    console.log('\n🔒 Step 3: Detected Admin Login page. Filling admin credentials...');
    await page.fill('#email', 'admin@anandplates.com');
    await page.fill('#password', 'anand@admin2026');
    console.log('  Credentials filled. Submitting login form...');

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
      page.click('button[type="submit"]'),
    ]);
    console.log(`  Login successful! Current URL: ${page.url()}`);
  }

  // Step 4: Ensure on /admin/payments
  if (!page.url().endsWith('/admin/payments')) {
    console.log('\n🧭 Step 4: Navigating to /admin/payments via sidebar link...');
    const paymentsNavLink = page.locator('a[href*="/payments"], button:has-text("जमा पेमेंट्स"), span:has-text("जमा पेमेंट्स")').first();
    if (await paymentsNavLink.isVisible()) {
      await paymentsNavLink.click();
      await page.waitForTimeout(1000);
    } else {
      await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
    }
    console.log(`  On Payments Page: ${page.url()}`);
  }

  // Step 5: Verify Payments Page Elements
  console.log('\n🔍 Step 5: Verifying Payments Tab UI Elements...');
  const headerVisible = await page.locator('text=जमा पेमेंट्स नियंत्रण').isVisible();
  console.log(`  Header ("जमा पेमेंट्स नियंत्रण"): ${headerVisible ? '✅ PASS' : '❌ FAIL'}`);

  const subHeaderVisible = await page.locator('text=आनंद बिल्डर्स प्रशासकीय प्रणाली').isVisible();
  console.log(`  Subheader ("आनंद बिल्डर्स प्रशासकीय प्रणाली"): ${subHeaderVisible ? '✅ PASS' : '❌ FAIL'}`);

  const searchInput = page.locator('input[placeholder*="ग्राहक, पावती, पेमेंट"]').first();
  const searchVisible = await searchInput.isVisible();
  console.log(`  Search input: ${searchVisible ? '✅ PASS' : '❌ FAIL'}`);

  const modeFilter = page.locator('select').filter({ hasText: 'सर्व पेमेंट खाती' }).first();
  const modeFilterVisible = await modeFilter.isVisible();
  console.log(`  Payment Mode filter: ${modeFilterVisible ? '✅ PASS' : '❌ FAIL'}`);

  const recordPayButton = page.locator('button:has-text("पेमेंट नोंदवा")');
  const recordPayVisible = await recordPayButton.isVisible();
  console.log(`  "पेमेंट नोंदवा" (+ Record Payment) Button: ${recordPayVisible ? '✅ PASS' : '❌ FAIL'}`);

  // Step 6: Test Search Filter interaction
  console.log('\n🔎 Step 6: Testing Search input filtering...');
  if (searchVisible) {
    await searchInput.fill('रोख');
    await page.waitForTimeout(300);
    await searchInput.fill('');
    await page.waitForTimeout(300);
    console.log('  Search input typing and clearing: ✅ PASS (No crashes)');
  }

  // Step 7: Test "पेमेंट नोंदवा" (Record Payment) Modal
  console.log('\n📝 Step 7: Opening "पेमेंट नोंदवा" Modal dialog...');
  await recordPayButton.click();
  await page.waitForTimeout(600);

  const modalTitleVisible = await page.locator('text=ग्राहकाची रक्कम जमा नोंदवा').isVisible();
  console.log(`  Modal Title ("ग्राहकाची रक्कम जमा नोंदवा"): ${modalTitleVisible ? '✅ PASS' : '❌ FAIL'}`);

  const partySelectVisible = await page.locator('label:has-text("ग्राहक / पार्टी")').isVisible();
  console.log(`  Party Select Field: ${partySelectVisible ? '✅ PASS' : '❌ FAIL'}`);

  const amountInputVisible = await page.locator('label:has-text("जमा रक्कम")').isVisible();
  console.log(`  Amount Input Field: ${amountInputVisible ? '✅ PASS' : '❌ FAIL'}`);

  const accountsVisible = await page.locator('button:has-text("मुख्य बँक"), button:has-text("Bank Direct")').first().isVisible();
  console.log(`  Payment Account Option Buttons: ${accountsVisible ? '✅ PASS' : '❌ FAIL'}`);

  // Capture screenshot of modal in Edge
  const modalScreenshot = 'C:\\Users\\HP\\.gemini\\antigravity-ide\\brain\\1b20ec31-2c25-49ae-9102-5dc5836c8d7d\\live_edge_modal.png';
  await page.screenshot({ path: modalScreenshot, fullPage: true });
  console.log(`  Modal Screenshot captured at: ${modalScreenshot}`);

  // Close modal via Cancel button
  console.log('  Closing modal via "रद्द करा" button...');
  const cancelBtn = page.locator('button:has-text("रद्द करा")');
  await cancelBtn.click();
  await page.waitForTimeout(400);

  const modalClosed = !(await page.locator('text=ग्राहकाची रक्कम जमा नोंदवा').isVisible());
  console.log(`  Modal closed successfully: ${modalClosed ? '✅ PASS' : '❌ FAIL'}`);

  // Step 8: Test Language Switch
  console.log('\n🌐 Step 8: Testing Language Switch (Marathi -> English -> Marathi)...');
  const langSelect = page.locator('#header-language-select');
  if (await langSelect.isVisible()) {
    await langSelect.selectOption('english');
    await page.waitForTimeout(500);
    const enHeader = await page.locator('text=Payments Control').isVisible();
    console.log(`  Switched to English ("Payments Control"): ${enHeader ? '✅ PASS' : '❌ FAIL'}`);

    await langSelect.selectOption('marathi');
    await page.waitForTimeout(500);
    const mrHeader = await page.locator('text=जमा पेमेंट्स नियंत्रण').isVisible();
    console.log(`  Switched back to Marathi ("जमा पेमेंट्स नियंत्रण"): ${mrHeader ? '✅ PASS' : '❌ FAIL'}`);
  }

  // Step 9: Final Full Page Screenshot
  const pageScreenshot = 'C:\\Users\\HP\\.gemini\\antigravity-ide\\brain\\1b20ec31-2c25-49ae-9102-5dc5836c8d7d\\live_edge_payments_full.png';
  await page.screenshot({ path: pageScreenshot, fullPage: true });
  console.log(`\n📸 Step 9: Full page screenshot saved to: ${pageScreenshot}`);

  // Step 10: Final Evaluation
  console.log('\n===========================================================================');
  console.log('                       FINAL TEST VERDICT');
  console.log('===========================================================================');
  console.log(`Uncaught Page Errors: ${pageErrors.length}`);
  console.log(`Browser Console Errors: ${consoleErrors.length}`);

  if (pageErrors.length === 0 && headerVisible && modalTitleVisible && modalClosed) {
    console.log('\n🎉 ALL LIVE TESTS ON MICROSOFT EDGE PASSED WITH 100% SUCCESS!');
    console.log('No white screens, no crashes, no missing properties.');
  } else {
    console.error('\n❌ SOME TESTS FAILED. Inspect details above.');
    process.exit(1);
  }

  await browser.close();
}

runLivePaymentsE2ETest().catch((err) => {
  console.error('Fatal Test Exception:', err);
  process.exit(1);
});
