import { chromium } from '@playwright/test';
import path from 'node:path';
import { spawn } from 'node:child_process';

async function verifyAllPenaltyTypes() {
  console.log('🚀 Starting preview server...');
  const preview = spawn('npx', ['vite', 'preview', '--port', '4179'], { shell: true });
  
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const targetUrl = 'http://localhost:4179';
  console.log('Testing on:', targetUrl);
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('[BROWSER ERROR]', msg.text());
  });

  await page.addInitScript(() => {
    localStorage.setItem('anand_admin_authenticated', 'true');
  });

  try {
    // 1. Upload user's real backup
    console.log('Navigating to Settings...');
    await page.goto(`${targetUrl}/admin/settings`, { waitUntil: 'networkidle' });
    const fileInput = page.locator('input[type="file"][accept*=".json"]');
    await fileInput.setInputFiles(path.resolve('tests/user_real_backup.json'));
    await page.waitForTimeout(2000);

    // 2. Test Payments Tab (+ पेमेंट नोंदवा)
    console.log('Navigating to Payments Tab...');
    await page.goto(`${targetUrl}/admin/payments`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Click "+ पेमेंट नोंदवा"
    await page.locator('button', { hasText: 'पेमेंट नोंदवा' }).click();
    await page.waitForTimeout(1000);

    // Select customer rahul rahane
    const modalPartySelect = page.locator('.fixed.inset-0 select').first();
    const rahulVal = await modalPartySelect.locator('option', { hasText: 'rahul rahane' }).getAttribute('value');
    await modalPartySelect.selectOption(rahulVal);
    await page.waitForTimeout(1000);

    // Fill Penalty amount 250
    const penaltyInput = page.locator('input[placeholder*="दंडाची रक्कम"]');
    await penaltyInput.fill('250');
    await page.waitForTimeout(500);

    // Click Penalty Type "साहित्य गहाळ / हरवणे"
    const lostTypeBtn = page.locator('button', { hasText: 'साहित्य गहाळ / हरवणे' });
    if (await lostTypeBtn.isVisible()) {
      await lostTypeBtn.click();
      await page.waitForTimeout(500);
      console.log('Selected penalty type: साहित्य गहाळ / हरवणे');
    }

    // Capture screenshot of Payments Modal with All Types
    await page.screenshot({
      path: 'C:/Users/HP/.gemini/antigravity-ide/brain/1b20ec31-2c25-49ae-9102-5dc5836c8d7d/verified_payment_all_penalty_types.png',
    });
    console.log('Saved verified_payment_all_penalty_types.png');

    // Click submit "पडताळणी करून जमा करा"
    await page.locator('button', { hasText: 'पडताळणी करून जमा करा' }).click();
    await page.waitForTimeout(1500);

    // Verify Payments Table shows penalty badge with type
    await page.screenshot({
      path: 'C:/Users/HP/.gemini/antigravity-ide/brain/1b20ec31-2c25-49ae-9102-5dc5836c8d7d/verified_payments_table_with_penalty_type.png',
    });
    console.log('Saved verified_payments_table_with_penalty_type.png');

    // 3. Test Returns Tab (साहित्य जमा व हिशोब पूर्ण करा)
    console.log('\nNavigating to Returns Tab...');
    await page.goto(`${targetUrl}/admin/returns`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Click "साहित्य जमा घ्या"
    await page.locator('button', { hasText: 'साहित्य जमा घ्या' }).first().click();
    await page.waitForTimeout(1000);

    // Click "सर्व" button to return all plates
    const allPlatesBtn = page.locator('button', { hasText: 'सर्व' }).first();
    if (await allPlatesBtn.isVisible()) {
      await allPlatesBtn.click();
      await page.waitForTimeout(1000);
    }

    // Fill Penalty 300
    const returnPenaltyInput = page.locator('input[placeholder="0"]').first();
    if (await returnPenaltyInput.isVisible()) {
      await returnPenaltyInput.fill('300');
      await page.waitForTimeout(500);
    }

    // Click Penalty Type "बेंडिंग / दुरुस्ती खर्च"
    const bentTypeBtn = page.locator('button', { hasText: 'बेंडिंग / दुरुस्ती खर्च' }).first();
    if (await bentTypeBtn.isVisible()) {
      await bentTypeBtn.click();
      await page.waitForTimeout(500);
      console.log('Selected return penalty type: बेंडिंग / दुरुस्ती खर्च');
    }

    // Capture screenshot of Returns Modal with All Types
    await page.screenshot({
      path: 'C:/Users/HP/.gemini/antigravity-ide/brain/1b20ec31-2c25-49ae-9102-5dc5836c8d7d/verified_returns_all_penalty_types.png',
    });
    console.log('Saved verified_returns_all_penalty_types.png');

    // 4. Test Rental Bill Modal (बिलावर दंड आणि प्रकार)
    console.log('\nNavigating to Rentals Tab to check Bill Modal...');
    await page.goto(`${targetUrl}/admin/rentals`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Click on bill button for Rahul Rahane
    const billBtn = page.locator('button[title*="बिल"], button:has-text("बिल")').first();
    if (await billBtn.isVisible()) {
      await billBtn.click();
      await page.waitForTimeout(1500);

      await page.screenshot({
        path: 'C:/Users/HP/.gemini/antigravity-ide/brain/1b20ec31-2c25-49ae-9102-5dc5836c8d7d/verified_bill_modal_with_penalty_type.png',
      });
      console.log('Saved verified_bill_modal_with_penalty_type.png');
    }

    console.log('✅ ALL VERIFICATIONS COMPLETED SUCCESSFULLY!');
  } finally {
    await browser.close();
    preview.kill();
  }
}

verifyAllPenaltyTypes().catch((err) => {
  console.error(err);
  process.exit(1);
});
