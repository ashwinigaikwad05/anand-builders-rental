import assert from 'node:assert';
import {
  buildBillWhatsAppSummary,
  buildBillWhatsAppUrl,
  getAutoWhatsAppShareSetting,
  setAutoWhatsAppShareSetting,
} from '../src/utils/billPdfShareUtils.ts';
import { getCleanPhoneNumber } from '../src/utils/alertMessaging.ts';

// Mock localStorage for node environment
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, val) => {
      store[key] = String(val);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
globalThis.localStorage = localStorageMock;

console.log('===========================================================================');
console.log('       WHATSAPP BILL PDF SHARE & AUTO-SHARING TEST SUITE');
console.log('===========================================================================');

let testsPassed = 0;
let testsFailed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
    testsFailed++;
  }
}

// TEST 1: Phone number cleaning for WhatsApp wa.me link
runTest('getCleanPhoneNumber produces 91 prefix with 10 digits', () => {
  const p1 = getCleanPhoneNumber('7020914957');
  assert.strictEqual(p1.whatsappPhone, '917020914957');

  const p2 = getCleanPhoneNumber('+91 96993 53648');
  assert.strictEqual(p2.whatsappPhone, '919699353648');

  const p3 = getCleanPhoneNumber('09881985058');
  assert.strictEqual(p3.whatsappPhone, '919881985058');
});

// TEST 2: Marathi Bill WhatsApp Summary formatting
runTest('buildBillWhatsAppSummary generates pure Marathi message with full bill breakdown', () => {
  const msg = buildBillWhatsAppSummary({
    billNumber: 4,
    partyName: 'पाटील कन्स्ट्रक्शन',
    partyMobile: '9699353648',
    partyAddress: 'near rahane mala',
    cycleStartDate: '25/09/2026',
    cycleDays: 40,
    items: [
      { plateType: '24×3', quantity: 40, dailyRate: 1.5, days: 40, totalRent: 2400 },
    ],
    totalRent: 2400,
    paidAmount: 1000,
    pendingAmount: 1400,
    lang: 'marathi',
  });

  assert.ok(msg.includes('आनंद बिल्डर्स अँड डेव्हलपर्स'), 'Should include business header');
  assert.ok(msg.includes('भाडे पावती व साहित्य चालान #4'), 'Should include bill number');
  assert.ok(msg.includes('पाटील कन्स्ट्रक्शन'), 'Should include formatted Marathi party name');
  assert.ok(msg.includes('9699353648'), 'Should include mobile number');
  assert.ok(msg.includes('near rahane mala'), 'Should include site address');
  assert.ok(msg.includes('40 दिवस'), 'Should include duration');
  assert.ok(msg.includes('₹2,400'), 'Should include total rent');
  assert.ok(msg.includes('₹1,000'), 'Should include paid amount');
  assert.ok(msg.includes('₹1,400'), 'Should include pending balance');
  assert.ok(msg.includes('अधिकृत बिल PDF सोबत जोडली आहे'), 'Should mention PDF attachment');
});

// TEST 3: English Bill WhatsApp Summary formatting
runTest('buildBillWhatsAppSummary generates pure English message in english mode', () => {
  const msg = buildBillWhatsAppSummary({
    billNumber: 4,
    partyName: 'Patil Constructions',
    partyMobile: '9699353648',
    partyAddress: 'near rahane mala',
    cycleStartDate: '25/09/2026',
    cycleDays: 40,
    items: [
      { plateType: '24×3', quantity: 40, dailyRate: 1.5, days: 40, totalRent: 2400 },
    ],
    totalRent: 2400,
    paidAmount: 1000,
    pendingAmount: 1400,
    lang: 'english',
  });

  assert.ok(msg.includes('ANAND BUILDERS & DEVELOPERS'), 'Should include English header');
  assert.ok(msg.includes('Rental Bill & Challan #4'), 'Should include bill number');
  assert.ok(msg.includes('Patil Constructions'), 'Should include capitalized party name');
  assert.ok(msg.includes('Total Rent:'), 'Should include total rent in English');
  assert.ok(msg.includes('₹2,400'), 'Should include formatted rent amount');
  assert.ok(msg.includes('Official Bill PDF is attached'), 'Should mention PDF in English');
  assert.ok(!/[\u0900-\u097F]/.test(msg), 'English summary must have NO Devanagari characters');
});

// TEST 4: Auto WhatsApp Share storage persistence
runTest('getAutoWhatsAppShareSetting & setAutoWhatsAppShareSetting manage persistent preference', () => {
  assert.strictEqual(getAutoWhatsAppShareSetting(), false, 'Default should be false');
  setAutoWhatsAppShareSetting(true);
  assert.strictEqual(getAutoWhatsAppShareSetting(), true, 'Should update to true');
  setAutoWhatsAppShareSetting(false);
  assert.strictEqual(getAutoWhatsAppShareSetting(), false, 'Should update to false');
});

// TEST 5: Direct WhatsApp URL construction with wa.me link
runTest('buildBillWhatsAppUrl produces valid wa.me link with encoded text', () => {
  const url = buildBillWhatsAppUrl({
    billNumber: 1,
    partyName: 'राहुल शिंदे',
    partyMobile: '7020914957',
    totalRent: 3600,
    paidAmount: 2000,
    pendingAmount: 1600,
    lang: 'marathi',
  });

  assert.ok(url.startsWith('https://wa.me/917020914957?text='), 'Should target 917020914957');
  assert.ok(url.includes(encodeURIComponent('आनंद बिल्डर्स अँड डेव्हलपर्स')), 'URL text should be properly URI encoded');
  assert.ok(url.includes(encodeURIComponent('राहुल शिंदे')), 'URL text should contain party name');
});

console.log('===========================================================================');
if (testsFailed === 0) {
  console.log(`  🎉 ALL ${testsPassed} WHATSAPP BILL SHARE TESTS PASSED! (100% SUCCESS)`);
} else {
  console.error(`  ❌ ${testsFailed} TESTS FAILED!`);
  process.exit(1);
}
console.log('===========================================================================');
