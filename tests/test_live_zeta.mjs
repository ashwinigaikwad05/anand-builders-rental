import { chromium } from 'playwright';

async function testLive() {
  console.log('Testing live zeta URL...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Navigate to payments
  await page.goto('https://anand-builders-rental-zeta.vercel.app/admin/payments', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Click "+ पेमेंट नोंदवा"
  const addPayBtn = page.getByRole('button', { name: /पेमेंट नोंदवा|Add Payment/i });
  if (await addPayBtn.isVisible()) {
    await addPayBtn.click();
    await page.waitForTimeout(1000);

    // Select Rahul Rahane
    const selectCustomer = page.locator('select').first();
    const options = await selectCustomer.locator('option').allInnerTexts();
    console.log('Customer options:', options);
    const rahulOpt = options.find(o => o.toLowerCase().includes('rahul rahane'));
    if (rahulOpt) {
      await selectCustomer.selectOption({ label: rahulOpt });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'C:/Users/HP/.gemini/antigravity-ide/brain/1b20ec31-2c25-49ae-9102-5dc5836c8d7d/live_zeta_payment_rahul.png', fullPage: true });
      console.log('Captured live_zeta_payment_rahul.png');
    }
  }

  // Navigate to returns
  await page.goto('https://anand-builders-rental-zeta.vercel.app/admin/returns', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Open return modal
  const addReturnBtn = page.getByRole('button', { name: /साहित्य जमा|Receive Plates/i }).first();
  if (await addReturnBtn.isVisible()) {
    await addReturnBtn.click();
    await page.waitForTimeout(1000);

    const customerSelect = page.locator('select').first();
    const returnOptions = await customerSelect.locator('option').allInnerTexts();
    console.log('Return options:', returnOptions);
    const rahulReturnOpt = returnOptions.find(o => o.toLowerCase().includes('rahul rahane'));
    if (rahulReturnOpt) {
      await customerSelect.selectOption({ label: rahulReturnOpt });
      await page.waitForTimeout(1000);

      const rentalSelect = page.locator('select').nth(1);
      const rentalOpts = await rentalSelect.locator('option').allInnerTexts();
      if (rentalOpts.length > 1) {
        await rentalSelect.selectOption({ index: 1 });
        await page.waitForTimeout(1500);
        await page.screenshot({ path: 'C:/Users/HP/.gemini/antigravity-ide/brain/1b20ec31-2c25-49ae-9102-5dc5836c8d7d/live_zeta_return_rahul.png', fullPage: true });
        console.log('Captured live_zeta_return_rahul.png');
      }
    }
  }

  await browser.close();
  console.log('Live test completed!');
}

testLive().catch(err => {
  console.error('Error running live test:', err);
  process.exit(1);
});
