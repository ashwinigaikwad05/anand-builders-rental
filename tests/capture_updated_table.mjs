import { chromium } from 'playwright';

async function captureUpdatedTableScreenshot() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  await page.addInitScript(() => {
    localStorage.setItem('anand_admin_authenticated', 'true');
    const mockParties = [
      {
        id: 'p-1',
        name: 'pawase vaibhav',
        mobile: '7666084107',
        address: 'Kolhapur',
        notes: '',
        status: 'active',
        photo_url: null,
        aadhaar_url: null,
        aadhaar_back_url: null,
        cheque_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'p-2',
        name: 'sai',
        mobile: '098765423',
        address: 'Kolhapur',
        notes: '',
        status: 'active',
        photo_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="%23f97316"/></svg>',
        aadhaar_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="%232563eb"/></svg>',
        aadhaar_back_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="%234f46e5"/></svg>',
        cheque_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    localStorage.setItem('anand_parties', JSON.stringify(mockParties));
  });

  console.log('Navigating to live production site...');
  await page.goto('https://anand-builders-rental-zeta.vercel.app/admin/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const customersTab = await page.$('button:has-text("पार्टी / ग्राहक"), button:has-text("ग्राहक"), button:has-text("Parties")');
  if (customersTab) {
    console.log('Opening Customers tab...');
    await customersTab.click();
    await page.waitForTimeout(1500);
  }

  await page.screenshot({ path: 'tests/updated_table_ui.png', fullPage: false });
  console.log('Saved screenshot of updated table to tests/updated_table_ui.png');

  await browser.close();
}

captureUpdatedTableScreenshot().catch(console.error);
