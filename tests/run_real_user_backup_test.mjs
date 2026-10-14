import { chromium } from '@playwright/test';
import path from 'node:path';

async function testRealUserBackup() {
  console.log('🚀 Testing user_real_backup.json on live Vercel site in Edge...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  page.on('console', (msg) => console.log('[CONSOLE ' + msg.type() + ']', msg.text()));
  page.on('pageerror', (err) => {
    console.error('❌ [PAGE ERROR STACK]', err.stack || err);
  });

  await page.addInitScript(() => {
    localStorage.setItem('anand_admin_authenticated', 'true');
  });

  await page.goto('https://anand-builders-rental-zeta.vercel.app/admin/settings', { waitUntil: 'networkidle' });
  console.log('Opened Settings. Now uploading tests/user_real_backup.json...');

  const fileInput = page.locator('input[type="file"][accept*=".json"]');
  await fileInput.setInputFiles(path.resolve('tests/user_real_backup.json'));

  console.log('Waiting 8 seconds after uploading real backup...');
  await page.waitForTimeout(8000);

  const isWhite = await page.evaluate(() => {
    const root = document.getElementById('root');
    return !root || root.innerHTML.trim() === '';
  });
  console.log('Is page white screen after upload?', isWhite);

  const text = await page.innerText('body');
  console.log('Body length:', text.length);
  console.log('First 400 chars of body:', text.slice(0, 400));

  await page.screenshot({ path: 'C:\\Users\\HP\\.gemini\\antigravity-ide\\brain\\1b20ec31-2c25-49ae-9102-5dc5836c8d7d\\real_user_backup_post_upload.png', fullPage: true });
  console.log('Screenshot saved.');

  // Also navigate to other tabs to see if they open!
  console.log('Testing navigation to /admin/parties with this backup...');
  await page.goto('https://anand-builders-rental-zeta.vercel.app/admin/parties', { waitUntil: 'networkidle' });
  console.log('Parties page body length:', (await page.innerText('body')).length);

  console.log('Testing navigation to /admin/rentals with this backup...');
  await page.goto('https://anand-builders-rental-zeta.vercel.app/admin/rentals', { waitUntil: 'networkidle' });
  console.log('Rentals page body length:', (await page.innerText('body')).length);

  console.log('Testing navigation to /admin/payments with this backup...');
  await page.goto('https://anand-builders-rental-zeta.vercel.app/admin/payments', { waitUntil: 'networkidle' });
  console.log('Payments page body length:', (await page.innerText('body')).length);

  await browser.close();
  console.log('Done.');
}

testRealUserBackup().catch(console.error);
