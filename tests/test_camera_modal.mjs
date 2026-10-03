import { chromium } from 'playwright';

async function testCameraModal() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.addInitScript(() => {
    localStorage.setItem('anand_admin_authenticated', 'true');
  });

  await page.goto('https://anand-builders-rental-zeta.vercel.app/admin/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const customersTab = await page.$('button:has-text("पार्टी / ग्राहक"), button:has-text("ग्राहक")');
  if (customersTab) {
    await customersTab.click();
    await page.waitForTimeout(800);
  }

  const addPartyBtn = await page.$('button:has-text("नवीन ग्राहक")');
  if (addPartyBtn) {
    await addPartyBtn.click();
    await page.waitForTimeout(800);
  }

  // Click the camera button on Aadhaar Front
  const cameraBtns = await page.$$('button:has-text("कॅमेरा उघडा")');
  console.log(`Found ${cameraBtns.length} camera buttons.`);
  if (cameraBtns.length > 1) {
    console.log('Clicking Aadhaar Front camera button...');
    await cameraBtns[1].click(); // Index 1 is Aadhaar Front
    await page.waitForTimeout(1200);
  }

  await page.screenshot({ path: 'tests/camera_capture_modal_verification.png', fullPage: false });
  console.log('Saved screenshot of camera modal to tests/camera_capture_modal_verification.png');

  await browser.close();
}

testCameraModal().catch(console.error);
