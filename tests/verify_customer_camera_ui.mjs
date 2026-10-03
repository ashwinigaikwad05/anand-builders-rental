import { chromium } from 'playwright';

async function testAddCustomerCameraAndAadhaar() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Set authentication in localStorage
  await page.addInitScript(() => {
    localStorage.setItem('anand_admin_authenticated', 'true');
  });

  console.log('Navigating to live production admin portal...');
  await page.goto('https://anand-builders-rental-zeta.vercel.app/admin/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Navigate to Customers / Parties Tab
  console.log('Locating and opening Customers (पार्टी / ग्राहक) tab...');
  const customersTab = await page.$('button:has-text("पार्टी / ग्राहक"), button:has-text("ग्राहक"), button:has-text("Parties")');
  if (customersTab) {
    await customersTab.click();
    await page.waitForTimeout(1000);
  }

  // Click Add Party button (+ नवीन ग्राहक / Add Party)
  console.log('Clicking Add Customer (+ नवीन ग्राहक) button...');
  const addPartyBtn = await page.$('button:has-text("नवीन ग्राहक"), button:has-text("Add Party")');
  if (addPartyBtn) {
    await addPartyBtn.click();
    await page.waitForTimeout(1000);
  }

  // Check for Aadhaar Front and Back cards and camera buttons
  const textContent = await page.content();
  const hasAadhaarFront = textContent.includes('आधार कार्ड (पुढील बाजू)') || textContent.includes('Aadhaar Card (Front)');
  const hasAadhaarBack = textContent.includes('आधार कार्ड (मागील बाजू)') || textContent.includes('Aadhaar Card (Back)');
  const hasFacePhoto = textContent.includes('चेहरा फोटो') || textContent.includes('Face Photo');
  const hasCheque = textContent.includes('चेक') || textContent.includes('Cheque');
  const hasCameraBtn = textContent.includes('कॅमेरा उघडा') || textContent.includes('Open Camera');

  console.log('Verification Results:');
  console.log('  - Aadhaar Front Card present:', hasAadhaarFront);
  console.log('  - Aadhaar Back Card present:', hasAadhaarBack);
  console.log('  - Face Photo Card present:', hasFacePhoto);
  console.log('  - Security Cheque Card present:', hasCheque);
  console.log('  - Open Camera Button present:', hasCameraBtn);

  // Take screenshot for verification artifact
  await page.screenshot({ path: 'tests/customer_modal_verification.png', fullPage: false });
  console.log('Screenshot saved to tests/customer_modal_verification.png');

  await browser.close();
  if (hasAadhaarFront && hasAadhaarBack && hasCameraBtn) {
    console.log('🎉 Verification PASSED successfully on live production site!');
  } else {
    console.error('❌ Verification FAILED');
    process.exit(1);
  }
}

testAddCustomerCameraAndAadhaar().catch((err) => {
  console.error('Error during test:', err);
  process.exit(1);
});
