import { chromium } from '@playwright/test';
import path from 'node:path';

async function testLiveProduction() {
  const targetUrl = 'https://anand-builders-rental-zeta.vercel.app';
  console.log('🚀 Running test on live production:', targetUrl);
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('[BROWSER ERROR]', msg.text());
  });

  await page.addInitScript(() => {
    localStorage.setItem('anand_admin_authenticated', 'true');
  });

  // 1. Upload user's real backup to live production instance
  console.log('Navigating to Settings...');
  await page.goto(`${targetUrl}/admin/settings`, { waitUntil: 'networkidle' });
  const fileInput = page.locator('input[type="file"][accept*=".json"]');
  await fileInput.setInputFiles(path.resolve('tests/user_real_backup.json'));
  await page.waitForTimeout(2500);

  // 2. Test Returns Modal
  console.log('Navigating to Returns Tab...');
  await page.goto(`${targetUrl}/admin/returns`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const receiveBtn = page.locator('button', { hasText: 'साहित्य जमा घ्या' }).first();
  await receiveBtn.click();
  await page.waitForTimeout(1500);

  // Take screenshot of Returns modal
  await page.screenshot({
    path: 'C:/Users/HP/.gemini/antigravity-ide/brain/1b20ec31-2c25-49ae-9102-5dc5836c8d7d/live_prod_return_modal_5277.png',
  });
  console.log('Saved live_prod_return_modal_5277.png');

  const modalText = await page.locator('.fixed.inset-0').innerText();
  console.log('\n--- Returns Modal Live Text Preview ---');
  console.log(modalText.slice(0, 1000));

  // 3. Test Payments Tab
  console.log('\nNavigating to Payments Tab...');
  await page.goto(`${targetUrl}/admin/payments`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Click "+ पेमेंट नोंदवा"
  await page.locator('button', { hasText: 'पेमेंट नोंदवा' }).click();
  await page.waitForTimeout(1000);

  // Select rahul rahane inside modal
  const partySelect = page.locator('.fixed.inset-0 select').first();
  const partyOptions = await partySelect.locator('option').allInnerTexts();
  console.log('Party options:', partyOptions);
  const rahulVal = await partySelect.locator('option', { hasText: 'rahul rahane' }).getAttribute('value');
  await partySelect.selectOption(rahulVal);
  await page.waitForTimeout(1000);

  // Click "+ दंड / अतिरिक्त आकारणी"
  const addPenaltyBtn = page.locator('button', { hasText: 'दंड / अतिरिक्त आकारणी' });
  if (await addPenaltyBtn.isVisible()) {
    await addPenaltyBtn.click();
    await page.waitForTimeout(500);
    // Fill 100 penalty
    const penaltyInput = page.locator('input[type="number"]').last();
    await penaltyInput.fill('100');
    await page.waitForTimeout(500);
  }

  // Take screenshot of Payments modal
  await page.screenshot({
    path: 'C:/Users/HP/.gemini/antigravity-ide/brain/1b20ec31-2c25-49ae-9102-5dc5836c8d7d/live_prod_payment_modal_remaining_and_penalty.png',
  });
  console.log('Saved live_prod_payment_modal_remaining_and_penalty.png');

  const payModalText = await page.locator('.fixed.inset-0').innerText();
  console.log('\n--- Payments Modal Live Text Preview ---');
  console.log(payModalText.slice(0, 1000));

  await browser.close();
  console.log('✅ Live production test complete!');
}

testLiveProduction().catch((err) => {
  console.error(err);
  process.exit(1);
});
