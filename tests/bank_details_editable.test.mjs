import assert from 'node:assert';
import {
  DEFAULT_BILL_TEMPLATE_CONFIG,
  getBillTemplateConfig,
  saveBillTemplateConfig,
  updateBankDetailsConfig,
} from '../src/utils/billTemplateUtils.ts';

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [BankDetailsEditable] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(err);
    process.exit(1);
  }
}

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
console.log('       BANK DETAILS EDITABLE & PERSISTENCE TEST SUITE');
console.log('===========================================================================');

console.log('\n🏦 SUITE 1: Default Bank Details Configuration');

runTest('DEFAULT_BILL_TEMPLATE_CONFIG contains default bank details', () => {
  assert.strictEqual(DEFAULT_BILL_TEMPLATE_CONFIG.showBankDetails, true);
  assert.strictEqual(DEFAULT_BILL_TEMPLATE_CONFIG.bankName, 'State Bank of India');
  assert.strictEqual(DEFAULT_BILL_TEMPLATE_CONFIG.accountNumber, '39482910482');
  assert.strictEqual(DEFAULT_BILL_TEMPLATE_CONFIG.ifscCode, 'SBIN0001234');
  assert.strictEqual(DEFAULT_BILL_TEMPLATE_CONFIG.upiId, 'anandbuilders@upi');
});

console.log('\n💾 SUITE 2: Bank Details Persistence & Retrieval');

runTest('getBillTemplateConfig returns default bank details when storage is empty', () => {
  localStorage.clear();
  const cfg = getBillTemplateConfig();
  assert.strictEqual(cfg.showBankDetails, true);
  assert.strictEqual(cfg.bankName, 'State Bank of India');
  assert.strictEqual(cfg.accountNumber, '39482910482');
  assert.strictEqual(cfg.ifscCode, 'SBIN0001234');
  assert.strictEqual(cfg.upiId, 'anandbuilders@upi');
});

runTest('saveBillTemplateConfig saves updated bank details to localStorage', () => {
  localStorage.clear();
  const custom = {
    ...DEFAULT_BILL_TEMPLATE_CONFIG,
    bankName: 'Bank of Maharashtra',
    accountNumber: '60123456789',
    ifscCode: 'MAHB0000123',
    upiId: 'anandplates@okaxis',
    showBankDetails: true,
  };

  saveBillTemplateConfig(custom);
  const loaded = getBillTemplateConfig();

  assert.strictEqual(loaded.bankName, 'Bank of Maharashtra');
  assert.strictEqual(loaded.accountNumber, '60123456789');
  assert.strictEqual(loaded.ifscCode, 'MAHB0000123');
  assert.strictEqual(loaded.upiId, 'anandplates@okaxis');
  assert.strictEqual(loaded.showBankDetails, true);
});

runTest('updateBankDetailsConfig partially updates bank details', () => {
  localStorage.clear();
  const updated = updateBankDetailsConfig({
    bankName: 'HDFC Bank',
    accountNumber: '50100234567890',
    ifscCode: 'HDFC0001234',
  });

  assert.strictEqual(updated.bankName, 'HDFC Bank');
  assert.strictEqual(updated.accountNumber, '50100234567890');
  assert.strictEqual(updated.ifscCode, 'HDFC0001234');
  assert.strictEqual(updated.upiId, 'anandbuilders@upi');

  const reloaded = getBillTemplateConfig();
  assert.strictEqual(reloaded.bankName, 'HDFC Bank');
  assert.strictEqual(reloaded.accountNumber, '50100234567890');
});

console.log('\n🔘 SUITE 3: Toggle Show Bank Details on Bills');

runTest('Toggling showBankDetails to false is persisted', () => {
  localStorage.clear();
  updateBankDetailsConfig({ showBankDetails: false });

  const cfg = getBillTemplateConfig();
  assert.strictEqual(cfg.showBankDetails, false);
});

runTest('Toggling showBankDetails back to true is persisted', () => {
  updateBankDetailsConfig({ showBankDetails: true });

  const cfg = getBillTemplateConfig();
  assert.strictEqual(cfg.showBankDetails, true);
});

console.log('\n===========================================================================');
console.log(`  🎉 SUMMARY: ALL ${passedTests} / ${totalTests} BANK DETAILS EDITABLE TESTS PASSED`);
console.log('===========================================================================');
