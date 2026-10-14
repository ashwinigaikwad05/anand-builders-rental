import { chromium } from '@playwright/test';
import path from 'node:path';

async function testAll() {
  console.log('🚀 Running comprehensive test on localhost:4173...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('[BROWSER ERROR]', msg.text());
  });

  await page.addInitScript(() => {
    localStorage.setItem('anand_admin_authenticated', 'true');
  });

  // 1. Upload backup
  console.log('Navigating to Settings...');
  await page.goto('http://localhost:4173/admin/settings', { waitUntil: 'networkidle' });
  const fileInput = page.locator('input[type="file"][accept*=".json"]');
  await fileInput.setInputFiles(path.resolve('tests/user_real_backup.json'));
  await page.waitForTimeout(2000);

  // 2. Test Returns Modal
  console.log('Navigating to Returns Tab...');
  await page.goto('http://localhost:4173/admin/returns', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Find Rahul Rahane in active dispatches and click "साहित्य जमा घ्या"
  const rahulRow = page.locator('div', { hasText: 'rahul rahane' }).filter({ hasText: '86' }).first();
  const receiveBtn = page.locator('button', { hasText: 'साहित्य जमा घ्या' }).first();
  await receiveBtn.click();
  await page.waitForTimeout(1000);

  // Take screenshot of Returns modal
  await page.screenshot({
    path: 'C:/Users/HP/.gemini/antigravity-ide/brain/1b20ec31-2c25-49ae-9102-5dc5836c8d7d/verified_return_modal_5277.png',
  });
  console.log('Saved verified_return_modal_5277.png');

  // Verify text in modal
  const modalText = await page.innerText('div[class*="animate-scaleUp"]');
  console.log('\n--- Returns Modal Text Preview ---');
  console.log(modalText);

  // 3. Test Payments Tab & "+ पेमेंट नोंदवा" Modal
  console.log('\nNavigating to Payments Tab...');
  await page.goto('http://localhost:4173/admin/payments', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Click "+ पेमेंट नोंदवा"
  await page.click('button:has-text("पेमेंट नोंदवा")');
  await page.waitForTimeout(500);

  // Select Rahul Rahane in party dropdown
  const partySelect = page.locator('form select').first();
  const options = await partySelect.locator('option').allInnerTexts();
  console.log('Party options:', options);
  const rahulOpt = options.find((opt) => opt.toLowerCase().includes('rahul'));
  if (rahulOpt) {
    await partySelect.selectOption({ label: rahulOpt });
    await page.waitForTimeout(500);
  }

  // Type 100 in penalty
  const penaltyInput = page.locator('input[placeholder*="नुकसान"]').first();
  if (await penaltyInput.count() > 0) {
    await penaltyInput.fill('100');
    await page.waitForTimeout(500);
  }

  // Take screenshot of Payments modal
  await page.screenshot({
    path: 'C:/Users/HP/.gemini/antigravity-ide/brain/1b20ec31-2c25-49ae-9102-5dc5836c8d7d/verified_payment_modal_remaining_and_penalty.png',
  });
  console.log('Saved verified_payment_modal_remaining_and_penalty.png');

  const payModalText = await page.innerText('div[class*="animate-scaleUp"]');
  console.log('\n--- Payments Modal Text Preview ---');
  console.log(payModalText);

  await browser.close();
  console.log('✅ Local test complete!');
}

testAll().catch(console.error);
