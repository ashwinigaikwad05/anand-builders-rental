import { chromium } from '@playwright/test';
import path from 'node:path';

async function testMainVercelUrl() {
  console.log('🚀 Testing user_real_backup.json on https://anand-builders-rental.vercel.app ...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  page.on('console', (msg) => console.log('[CONSOLE ' + msg.type() + ']', msg.text()));
  page.on('pageerror', (err) => console.error('❌ [PAGE ERROR]', err.stack || err.message));

  await page.addInitScript(() => {
    localStorage.setItem('anand_admin_authenticated', 'true');
  });

  await page.goto('https://anand-builders-rental.vercel.app/admin/settings', { waitUntil: 'networkidle' });
  console.log('Settings opened on main URL. Uploading user_real_backup.json...');

  const fileInput = page.locator('input[type="file"][accept*=".json"]');
  await fileInput.setInputFiles(path.resolve('tests/user_real_backup.json'));

  console.log('Waiting 5s...');
  await page.waitForTimeout(5000);

  console.log('Testing /admin/payments on main Vercel URL...');
  await page.goto('https://anand-builders-rental.vercel.app/admin/payments', { waitUntil: 'networkidle' });

  const bodyLength = (await page.innerText('body')).length;
  console.log('Payments page body length on main Vercel URL:', bodyLength);

  await browser.close();
}
testMainVercelUrl().catch(console.error);
