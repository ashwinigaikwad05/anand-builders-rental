import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

async function testBackupUpload() {
  console.log('🚀 Launching Edge to test REAL backup upload on live Vercel site...');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  const errors = [];
  page.on('console', (msg) => {
    console.log(`[CONSOLE ${msg.type()}]`, msg.text());
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => {
    console.error('❌ [PAGE ERROR]', err);
    errors.push(err.message);
  });

  // Login
  await page.addInitScript(() => {
    localStorage.setItem('anand_admin_authenticated', 'true');
  });

  const targetUrl = 'https://anand-builders-rental-zeta.vercel.app/admin/settings';
  console.log(`Navigating to ${targetUrl}...`);
  await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 35000 });

  console.log('Current URL:', page.url());
  console.log('Page Title:', await page.title());

  // Check if Settings page rendered
  const settingsHeader = await page.locator('text=System & Bill Settings').isVisible().catch(() => false);
  const marathiSettingsHeader = await page.locator('text=प्रणाली व बिल सेटिंग्ज').isVisible().catch(() => false);
  console.log('Settings header visible:', settingsHeader || marathiSettingsHeader);

  // Prepare an extreme edge-case backup JSON file with missing names, null properties, etc.
  const testBackupPayload = {
    appName: 'आनंद बिल्डर्स अँड डेव्हलपर्स',
    exportTimestamp: new Date().toISOString(),
    parties: [
      {
        id: 'party-test-101',
        name: 'अमोल गायकवाड',
        mobile: '9881000000',
        address: 'कुर्डुवाडी',
        status: 'active',
        platesWithParty: 50,
        totalRent: 4000,
        paid: 2000,
        pending: 2000,
      },
      {
        id: 'party-empty-name',
        name: null, // Test null name!
        status: 'active',
      },
      {
        id: 'party-missing-name',
        // completely missing name!
      },
    ],
    rentals: [
      {
        id: 'rent-test-101',
        partyId: 'party-test-101',
        partyName: 'अमोल गायकवाड',
        plateType: '24×3',
        quantity: 50,
        dailyRate: 2,
        issueDate: '2026-03-01',
        days: 40,
        totalRent: 4000,
        paid: 2000,
        pending: 2000,
        paymentMode: 'Cash',
        status: 'active',
        billNumber: 1,
      },
      {
        id: 'rent-no-party',
        partyId: 'party-unknown-999',
        partyName: null,
      },
    ],
    rentalCycles: [],
    returns: [
      {
        id: 'ret-sample',
        rentalId: 'rent-test-101',
        partyId: 'party-test-101',
      },
    ],
    payments: [
      {
        id: 'pay-test-101',
        partyId: 'party-test-101',
        partyName: 'अमोल गायकवाड',
        rentalId: 'rent-test-101',
        amount: 2000,
        date: '2026-03-01',
        paymentMode: 'Cash',
      },
      {
        id: 'pay-null-party',
        partyId: null,
        partyName: null,
        amount: 500,
      },
    ],
    stockItems: [],
    plateSettings: [],
    billConfig: {
      bankName: 'State Bank of India',
      accountNumber: '1234567890',
      termsAndConditions: null, // Test null terms!
    },
  };

  const tempBackupPath = path.resolve('tests/temp_test_backup.json');
  fs.writeFileSync(tempBackupPath, JSON.stringify(testBackupPayload, null, 2), 'utf-8');
  console.log('Temporary backup file created at:', tempBackupPath);

  // Find file input and upload
  console.log('Uploading backup JSON via file input...');
  const fileInput = page.locator('input[type="file"][accept*=".json"]');
  await fileInput.setInputFiles(tempBackupPath);

  // Wait for restore process
  console.log('Waiting 5 seconds for restore and re-render...');
  await page.waitForTimeout(5000);

  // Check state after upload
  const postUploadUrl = page.url();
  console.log('Post-upload URL:', postUploadUrl);

  const isWhiteScreen = await page.evaluate(() => {
    const root = document.getElementById('root');
    return !root || root.innerHTML.trim() === '' || root.clientHeight === 0;
  });
  console.log('Is White Screen?', isWhiteScreen);

  const bodyText = await page.innerText('body');
  console.log('Post-upload Body text length:', bodyText.length);
  console.log('Body Text Snippet (first 400 chars):');
  console.log(bodyText.slice(0, 400));

  // Take screenshot
  const screenshotPath = 'C:\\Users\\HP\\.gemini\\antigravity-ide\\brain\\1b20ec31-2c25-49ae-9102-5dc5836c8d7d\\post_backup_upload.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('Screenshot saved to:', screenshotPath);

  // Cleanup temp file
  if (fs.existsSync(tempBackupPath)) fs.unlinkSync(tempBackupPath);

  if (errors.length > 0) {
    console.error('❌ Errors captured during backup upload:', errors);
  } else {
    console.log('✅ No page errors during backup upload!');
  }

  await browser.close();
}

testBackupUpload().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
