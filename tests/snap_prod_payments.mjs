import { chromium } from '@playwright/test';

async function snap() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.addInitScript(() => { localStorage.setItem('anand_admin_authenticated', 'true'); });
  await page.goto('https://anand-builders-rental.vercel.app/admin/settings', { waitUntil: 'networkidle' });
  await page.locator('input[type="file"][accept*=".json"]').setInputFiles('tests/user_real_backup.json');
  await page.waitForTimeout(3500);
  await page.goto('https://anand-builders-rental.vercel.app/admin/payments', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'C:/Users/HP/.gemini/antigravity-ide/brain/1b20ec31-2c25-49ae-9102-5dc5836c8d7d/prod_payments_live_restored.png', fullPage: true });
  await page.goto('https://anand-builders-rental.vercel.app/admin/parties', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'C:/Users/HP/.gemini/antigravity-ide/brain/1b20ec31-2c25-49ae-9102-5dc5836c8d7d/prod_parties_live_restored.png', fullPage: true });
  await browser.close();
  console.log('✅ Captured live screenshots!');
}

snap().catch(console.error);
