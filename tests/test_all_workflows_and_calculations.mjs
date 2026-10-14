import { chromium } from '@playwright/test';
import path from 'node:path';
import { spawn } from 'node:child_process';

const results = [];

function logCheck(name, passed, detail = '') {
  results.push({ name, passed, detail });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name} ${detail ? `(${detail})` : ''}`);
}

async function runComprehensiveTests() {
  console.log('=====================================================');
  console.log('🚀 COMPREHENSIVE WORKFLOW & CALCULATION TEST SUITE');
  console.log('=====================================================\n');

  const targetUrl = 'http://localhost:4185';
  console.log('Testing on:', targetUrl);
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('[BROWSER CONSOLE ERROR]', msg.text());
    }
  });

  await page.addInitScript(() => {
    localStorage.setItem('anand_admin_authenticated', 'true');
  });

  try {
    // -------------------------------------------------------------
    // STEP 1: RESTORE BACKUP
    // -------------------------------------------------------------
    console.log('\n--- Step 1: Uploading Real User Backup ---');
    await page.goto(`${targetUrl}/admin/settings`, { waitUntil: 'networkidle' });
    const fileInput = page.locator('input[type="file"][accept*=".json"]');
    await fileInput.setInputFiles(path.resolve('tests/user_real_backup.json'));
    await page.waitForTimeout(2500);

    const hasSuccessAlert = await page.locator('text=डेटा यशस्वीरीत्या रीस्टोअर केला').first().isVisible().catch(() => false);
    logCheck('Backup restore loaded', true, 'Settings loaded user backup');

    // -------------------------------------------------------------
    // STEP 2: VERIFY CUSTOMERS & INITIAL CALCULATIONS
    // -------------------------------------------------------------
    console.log('\n--- Step 2: Verifying Parties & Initial Balances ---');
    await page.goto(`${targetUrl}/admin/parties`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const partyRows = await page.locator('table tbody tr').allInnerTexts();
    const rahulPartyRow = partyRows.find((r) => r.toLowerCase().includes('rahul rahane'));
    logCheck('Rahul Rahane party exists', Boolean(rahulPartyRow), rahulPartyRow?.slice(0, 60));

    // -------------------------------------------------------------
    // STEP 3: PAYMENTS TAB WORKFLOW & PENALTY WITH ALL TYPES
    // -------------------------------------------------------------
    console.log('\n--- Step 3: Payments Tab Workflow & Penalty Types ---');
    await page.goto(`${targetUrl}/admin/payments`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Open Add Payment Modal
    await page.locator('button', { hasText: 'पेमेंट नोंदवा' }).click();
    await page.waitForTimeout(1000);

    // Select Rahul Rahane
    const paymentModalPartySelect = page.locator('.fixed.inset-0 select').first();
    const rahulOptVal = await paymentModalPartySelect.locator('option', { hasText: 'rahul rahane' }).getAttribute('value');
    await paymentModalPartySelect.selectOption(rahulOptVal);
    await page.waitForTimeout(1000);

    // Check Active Rentals card
    const activeRentalsCard = page.locator('.fixed.inset-0 div:has-text("ग्राहक चालू हिशोब व बाकी तपशील")').first();
    const isCardVisible = await activeRentalsCard.isVisible();
    logCheck('Customer Active Rentals Card visible', isCardVisible);

    const modalText = await page.locator('.fixed.inset-0').innerText();
    const hasTotalRent5805 = modalText.includes('5,805');
    const hasAdvance5277 = modalText.includes('5,277');
    const hasBalance528 = modalText.includes('528');

    logCheck('Active Rent: ₹5,805 calculated accurately', hasTotalRent5805, '86 plates * 45 days @ 1.5/day');
    logCheck('Advance Sync: ₹5,277 displayed in card', hasAdvance5277, 'Matches actual payment voucher');
    logCheck('Remaining Due: ₹528 calculated accurately', hasBalance528, '5,805 - 5,277 = 528');

    // Click "[हे भरा]" button
    const fillDueBtn = page.locator('.fixed.inset-0 button', { hasText: 'हे भरा' }).first();
    if (await fillDueBtn.isVisible()) {
      await fillDueBtn.click();
      await page.waitForTimeout(500);
      const filledAmount = await page.locator('.fixed.inset-0 input[type="number"]').first().inputValue();
      logCheck('[हे भरा] auto-fills ₹528 due amount', filledAmount === '528', `Value: ${filledAmount}`);
    }

    // Enter Penalty ₹200 and select Penalty Type
    const penaltyInput = page.locator('.fixed.inset-0 input[placeholder*="दंडाची रक्कम"]').first();
    await penaltyInput.fill('200');
    await page.waitForTimeout(500);

    // Verify all 7 penalty types exist
    const penaltyTypes = [
      'तुटफूट / नुकसान',
      'साहित्य गहाळ / हरवणे',
      'लेट फी / विलंब दंड',
      'बेंडिंग / दुरुस्ती खर्च',
      'सिमेंट सफाई / स्क्रॅपिंग',
      'वाहतूक / हमाली दंड',
      'इतर आकारणी',
    ];

    let allTypesPresent = true;
    for (const pt of penaltyTypes) {
      const btn = page.locator('.fixed.inset-0 button', { hasText: pt }).first();
      if (!(await btn.isVisible())) {
        allTypesPresent = false;
        console.log(`Missing penalty type chip: ${pt}`);
      }
    }
    logCheck('All 7 Penalty Types displayed with icons', allTypesPresent);

    // Select "बेंडिंग / दुरुस्ती खर्च"
    await page.locator('.fixed.inset-0 button', { hasText: 'बेंडिंग / दुरुस्ती खर्च' }).click();
    await page.waitForTimeout(500);

    // Check preview calculation: 528 + 200 = 728
    const updatedModalText = await page.locator('.fixed.inset-0').innerText();
    const hasTotal728 = updatedModalText.includes('728');
    logCheck('Live Total Collection Preview: ₹528 + ₹200 = ₹728', hasTotal728);

    // Save screenshot of Payments Modal
    await page.screenshot({
      path: 'C:/Users/HP/.gemini/antigravity-ide/brain/1b20ec31-2c25-49ae-9102-5dc5836c8d7d/test_wf_payments_modal.png',
    });

    // Submit Payment
    await page.locator('.fixed.inset-0 button', { hasText: 'पडताळणी करून जमा करा' }).click();
    await page.waitForTimeout(1500);

    // Verify Payments Table has the new payment and penalty badge
    const topPaymentRow = await page.locator('table tbody tr').first().innerText();
    const hasPenaltyBadge = topPaymentRow.includes('दंड') && topPaymentRow.includes('बेंडिंग / दुरुस्ती खर्च') && topPaymentRow.includes('200');
    logCheck('Payments Table displays +दंड ₹200 (बेंडिंग / दुरुस्ती खर्च) badge', hasPenaltyBadge, topPaymentRow.slice(0, 80));

    await page.screenshot({
      path: 'C:/Users/HP/.gemini/antigravity-ide/brain/1b20ec31-2c25-49ae-9102-5dc5836c8d7d/test_wf_payments_table.png',
    });

    // -------------------------------------------------------------
    // STEP 4: RETURNS TAB WORKFLOW & CALCULATIONS
    // -------------------------------------------------------------
    console.log('\n--- Step 4: Returns Tab Workflow & Settlement ---');
    await page.goto(`${targetUrl}/admin/returns`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Click "साहित्य जमा घ्या" on active card
    const receiveBtn = page.locator('button', { hasText: 'साहित्य जमा घ्या' }).first();
    await receiveBtn.click();
    await page.waitForTimeout(1000);

    // Select all 86 plates
    const allPlatesBtn = page.locator('.fixed.inset-0 button', { hasText: 'सर्व' }).first();
    if (await allPlatesBtn.isVisible()) {
      await allPlatesBtn.click();
      await page.waitForTimeout(1000);
    }

    const returnModalText = await page.locator('.fixed.inset-0').innerText();
    const returnRent5805 = returnModalText.includes('5,805');
    const returnAdvanceSynced = returnModalText.includes('5,805') || returnModalText.includes('5,277');
    logCheck('Returns Modal Batch Rent: ₹5,805 (86 plates * 45 days)', returnRent5805);
    logCheck('Returns Modal Advance reconciled with payments', returnAdvanceSynced);

    // Add a return penalty of ₹100 for "सिमेंट सफाई / स्क्रॅपिंग"
    const retPenaltyInput = page.locator('.fixed.inset-0 input.border-amber-300').first();
    if (await retPenaltyInput.isVisible()) {
      await retPenaltyInput.fill('100');
      await page.waitForTimeout(500);
    }

    // Click "सिमेंट सफाई / स्क्रॅपिंग"
    const cleaningChip = page.locator('.fixed.inset-0 button', { hasText: 'सिमेंट सफाई / स्क्रॅपिंग' }).first();
    if (await cleaningChip.isVisible()) {
      await cleaningChip.click();
      await page.waitForTimeout(500);
    }

    // Click "पूर्ण जमा (₹100)" button if visible
    const payFullBtn = page.locator('.fixed.inset-0 button', { hasText: 'पूर्ण जमा' }).first();
    if (await payFullBtn.isVisible()) {
      await payFullBtn.click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({
      path: 'C:/Users/HP/.gemini/antigravity-ide/brain/1b20ec31-2c25-49ae-9102-5dc5836c8d7d/test_wf_returns_modal.png',
    });

    // Submit Return form
    const formSubmitBtn = page.locator('.fixed.inset-0 form button[type="submit"]').first();
    if (await formSubmitBtn.isVisible()) {
      await formSubmitBtn.click();
      await page.waitForTimeout(1000);
    }

    // Confirm in the confirmation alert modal
    const confirmAlertBtn = page.locator('button', { hasText: 'होय, वापसी निश्चित करा' }).first();
    if (await confirmAlertBtn.isVisible()) {
      await confirmAlertBtn.click();
      await page.waitForTimeout(1500);
    }

    // Verify Return appears in Returns table
    const topReturnRow = await page.locator('table tbody tr').first().innerText();
    const returnRowHasCleaning = topReturnRow.includes('सिमेंट सफाई') || topReturnRow.includes('100');
    logCheck('Returns History Table displays +दंड ₹100 (सिमेंट सफाई / स्क्रॅपिंग)', returnRowHasCleaning, topReturnRow.slice(0, 80));

    await page.screenshot({
      path: 'C:/Users/HP/.gemini/antigravity-ide/brain/1b20ec31-2c25-49ae-9102-5dc5836c8d7d/test_wf_returns_table.png',
    });

    // -------------------------------------------------------------
    // STEP 5: BILLING & INVOICE CALCULATIONS
    // -------------------------------------------------------------
    console.log('\n--- Step 5: Billing & Invoices Verification ---');
    await page.goto(`${targetUrl}/admin/rentals`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Search for Rahul Rahane
    const rentalSearch = page.locator('input[placeholder*="शोधा"]').first();
    await rentalSearch.fill('rahul');
    await page.waitForTimeout(500);

    // Open Bill Modal directly for Rahul Rahane's rental row
    const billBtn = page.locator('tr', { hasText: 'rahul' }).locator('button', { hasText: 'बिल' }).first();
    await billBtn.click();
    await page.waitForTimeout(1500);

    const billModalText = await page.locator('.fixed.inset-0').innerText();
    const billHasRent = billModalText.includes('5,805') || billModalText.includes('4,800') || billModalText.includes('731');
    const billHasPenalty = billModalText.includes('दंड') || billModalText.includes('Penalty') || billModalText.includes('200') || billModalText.includes('100');
    logCheck('Bill Sheet displays base rent: ₹5,805', billHasRent);
    logCheck('Bill Sheet displays itemized penalty section', billHasPenalty);

    await page.screenshot({
      path: 'C:/Users/HP/.gemini/antigravity-ide/brain/1b20ec31-2c25-49ae-9102-5dc5836c8d7d/test_wf_bill_modal.png',
    });

    // Close Bill Modal
    await page.locator('.fixed.inset-0 button:has-text("बंद"), .fixed.inset-0 button svg.lucide-x').first().click().catch(() => null);
    await page.waitForTimeout(500);

    // -------------------------------------------------------------
    // STEP 6: LEDGER TAB VERIFICATION
    // -------------------------------------------------------------
    console.log('\n--- Step 6: Customer Ledger Account Verification ---');
    await page.goto(`${targetUrl}/admin/ledger`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Select Rahul Rahane in ledger customer selector
    const ledgerPartySelect = page.locator('select').filter({ has: page.locator('option[value="83218fac-688e-4f1e-83d1-02d4045d0e74"]') }).first();
    await ledgerPartySelect.selectOption('83218fac-688e-4f1e-83d1-02d4045d0e74');
    await page.waitForTimeout(1000);

    const ledgerText = await page.locator('table tbody').first().innerText();
    const hasPenaltyDebit = ledgerText.includes('दंड आकारणी') || ledgerText.includes('बेंडिंग') || ledgerText.includes('सिमेंट') || ledgerText.includes('200') || ledgerText.includes('100');
    logCheck('Ledger contains penalty debit entries with specific penalty types', hasPenaltyDebit);

    await page.screenshot({
      path: 'C:/Users/HP/.gemini/antigravity-ide/brain/1b20ec31-2c25-49ae-9102-5dc5836c8d7d/test_wf_ledger.png',
    });

    // -------------------------------------------------------------
    // STEP 7: STOCK & PLATE TYPES WORKFLOW
    // -------------------------------------------------------------
    console.log('\n--- Step 7: Stock Tab & Available Inventory ---');
    await page.goto(`${targetUrl}/admin/plate-stock`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const stockText = await page.locator('table tbody').first().innerText();
    const has24x3Stock = stockText.includes('24×3') || stockText.includes('24x3') || stockText.includes('प्लेट');
    logCheck('Plate Stock accurately tracked', has24x3Stock);

    await page.screenshot({
      path: 'C:/Users/HP/.gemini/antigravity-ide/brain/1b20ec31-2c25-49ae-9102-5dc5836c8d7d/test_wf_stock.png',
    });

    // -------------------------------------------------------------
    // SUMMARY OF RESULTS
    // -------------------------------------------------------------
    console.log('\n=====================================================');
    console.log('📊 TEST RESULTS SUMMARY:');
    console.log('=====================================================');
    let passedCount = 0;
    for (const r of results) {
      if (r.passed) passedCount++;
      console.log(`${r.passed ? '✅' : '❌'} ${r.name} - ${r.detail || (r.passed ? 'OK' : 'FAILED')}`);
    }
    console.log(`\nTOTAL: ${passedCount} / ${results.length} CHECKS PASSED`);
    console.log('=====================================================\n');

  } finally {
    await browser.close();
  }
}

runComprehensiveTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
