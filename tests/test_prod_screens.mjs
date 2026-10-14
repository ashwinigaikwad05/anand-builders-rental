import { chromium } from '@playwright/test';
import path from 'node:path';

async function checkProdScreen() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  page.on('pageerror', (err) => console.error('❌ [PROD PAGE ERROR]', err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('[PROD CONSOLE ERROR]', msg.text());
  });

  await page.addInitScript(() => {
    localStorage.setItem('anand_admin_authenticated', 'true');
  });

  console.log('Navigating to https://anand-builders-rental.vercel.app/admin/settings ...');
  await page.goto('https://anand-builders-rental.vercel.app/admin/settings', { waitUntil: 'networkidle' });

  console.log('\n--- Settings Initial Text ---');
  console.log((await page.innerText('body')).slice(0, 400));
  await page.screenshot({ path: 'C:\\Users\\HP\\.gemini\\antigravity-ide\\brain\\1b20ec31-2c25-49ae-9102-5dc5836c8d7d\\prod_settings_initial.png' });

  // Upload user real backup
  console.log('\nUploading tests/user_real_backup.json ...');
  const fileInput = page.locator('input[type="file"][accept*=".json"]');
  await fileInput.setInputFiles(path.resolve('tests/user_real_backup.json'));
  await page.waitForTimeout(6000);

  console.log('\n--- Settings Post-Upload Text ---');
  const postUploadText = await page.innerText('body');
  console.log('Post-upload body length:', postUploadText.length);
  console.log(postUploadText.slice(0, 400));
  await page.screenshot({ path: 'C:\\Users\\HP\\.gemini\\antigravity-ide\\brain\\1b20ec31-2c25-49ae-9102-5dc5836c8d7d\\prod_settings_after_upload.png' });

  // Check /admin/payments
  console.log('\nNavigating to /admin/payments on production URL...');
  await page.goto('https://anand-builders-rental.vercel.app/admin/payments', { waitUntil: 'networkidle' });
  const paymentsText = await page.innerText('body');
  console.log('Payments page body length:', paymentsText.length);
  console.log('Payments page text preview:');
  console.log(paymentsText.slice(0, 500));
  await page.screenshot({ path: 'C:\\Users\\HP\\.gemini\\antigravity-ide\\brain\\1b20ec31-2c25-49ae-9102-5dc5836c8d7d\\prod_payments_after_upload.png' });

  // Check /admin/parties
  console.log('\nNavigating to /admin/parties on production URL...');
  await page.goto('https://anand-builders-rental.vercel.app/admin/parties', { waitUntil: 'networkidle' });
  const partiesText = await page.innerText('body');
  console.log('Parties page body length:', partiesText.length);
  console.log(partiesText.slice(0, 500));
  await page.screenshot({ path: 'C:\\Users\\HP\\.gemini\\antigravity-ide\\brain\\1b20ec31-2c25-49ae-9102-5dc5836c8d7d\\prod_parties_after_upload.png' });

  // Check /admin/rentals
  console.log('\nNavigating to /admin/rentals on production URL...');
  await page.goto('https://anand-builders-rental.vercel.app/admin/rentals', { waitUntil: 'networkidle' });
  const rentalsText = await page.innerText('body');
  console.log('Rentals page body length:', rentalsText.length);
  console.log(rentalsText.slice(0, 500));
  await page.screenshot({ path: 'C:\\Users\\HP\\.gemini\\antigravity-ide\\brain\\1b20ec31-2c25-49ae-9102-5dc5836c8d7d\\prod_rentals_after_upload.png' });

  await browser.close();
  console.log('\n✅ All checks complete!');
}

checkProdScreen().catch(console.error);
