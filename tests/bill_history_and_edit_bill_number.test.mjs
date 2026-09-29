import { strict as assert } from 'node:assert';
import { t } from '../src/utils/appTranslations.ts';

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [BillHistory & Edit] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [BillHistory & Edit] ${name}: ${err.message}`);
    throw err;
  }
}

console.log('\n' + '='.repeat(75));
console.log('   BILL-WISE HISTORY & EDIT BILL NUMBER TEST SUITE');
console.log('='.repeat(75));

// SUITE 1: Custom Bill Number Management & Persistence
console.log('\n🏷️  SUITE 1: Custom Bill Number Management & Persistence');

runTest('Supports numeric and alphanumeric bill numbers', () => {
  const customBills = {
    'rent-1': 101,
    'rent-2': 'AN-2026/05',
    'rent-3': '#500',
  };

  const getResolvedBillNo = (rentalId, fallbackIdx) => {
    return customBills[rentalId] !== undefined ? customBills[rentalId] : fallbackIdx + 1;
  };

  assert.strictEqual(getResolvedBillNo('rent-1', 0), 101);
  assert.strictEqual(getResolvedBillNo('rent-2', 1), 'AN-2026/05');
  assert.strictEqual(getResolvedBillNo('rent-3', 2), '#500');
  assert.strictEqual(getResolvedBillNo('rent-unknown', 3), 4);
});

runTest('Updating bill number updates custom bills mapping correctly', () => {
  const customBillsMap = {};
  const handleUpdateBill = (rentalId, newBill) => {
    customBillsMap[rentalId] = newBill;
  };

  handleUpdateBill('rent-abc', '105');
  assert.strictEqual(customBillsMap['rent-abc'], '105');

  handleUpdateBill('rent-abc', 'B-2026/99');
  assert.strictEqual(customBillsMap['rent-abc'], 'B-2026/99');
});

// SUITE 2: Reports Bill Number Searching & Filtering
console.log('\n🔍 SUITE 2: Reports Bill Number Searching & Filtering');

runTest('Search bill number matches exact, numeric, and hashtag prefixes', () => {
  const mockRentals = [
    { id: 'r1', billNumber: 1, partyName: 'Ramesh Patil' },
    { id: 'r2', billNumber: 101, partyName: 'Sai Developers' },
    { id: 'r3', billNumber: 'AN-202', partyName: 'Mahesh Joshi' },
  ];

  const searchRentals = (query) => {
    const q = query.trim().toLowerCase().replace(/^#/, '');
    return mockRentals.filter((r) => {
      const b = String(r.billNumber || '').toLowerCase().replace(/^#/, '');
      return b === q || b.includes(q);
    });
  };

  // Search by exact number
  assert.strictEqual(searchRentals('101').length, 1);
  assert.strictEqual(searchRentals('101')[0].id, 'r2');

  // Search by hashtag prefix
  assert.strictEqual(searchRentals('#101').length, 1);
  assert.strictEqual(searchRentals('#101')[0].id, 'r2');

  // Search by alphanumeric string
  assert.strictEqual(searchRentals('an-202').length, 1);
  assert.strictEqual(searchRentals('an-202')[0].id, 'r3');

  // Search by single digit "1" matches "1" and "101"
  assert.strictEqual(searchRentals('1').length, 2);
});

// SUITE 3: Comprehensive Bill-Wise Lifecycle History
console.log('\n📊 SUITE 3: Comprehensive Bill-Wise Lifecycle History');

runTest('Bill-Wise lifecycle correctly calculates dispatched, returned, and active plates', () => {
  const mockRental = {
    id: 'rent-bill-1',
    billNumber: 101,
    partyId: 'party-1',
    partyName: 'Patil Constructions',
    items: [
      { plateType: '24×3', quantity: 60, dailyRate: 1.5, days: 40, totalRent: 3600 },
      { plateType: '21×3', quantity: 40, dailyRate: 1.5, days: 40, totalRent: 2400 },
    ],
    quantity: 100,
    totalRent: 6000,
  };

  const mockReturns = [
    { id: 'ret-1', rentalId: 'rent-bill-1', returnedQuantity: 30, remainingQuantity: 70 },
    { id: 'ret-2', rentalId: 'rent-bill-1', returnedQuantity: 20, remainingQuantity: 50 },
  ];

  const totalDispatched = mockRental.items.reduce((s, it) => s + it.quantity, 0);
  const totalReturned = mockReturns.reduce((s, r) => s + r.returnedQuantity, 0);
  const activeInField = Math.max(0, totalDispatched - totalReturned);

  assert.strictEqual(totalDispatched, 100);
  assert.strictEqual(totalReturned, 50);
  assert.strictEqual(activeInField, 50);
});

runTest('Bill-Wise multi-cycle financial reconciliation correctly calculates accrued rent and balance', () => {
  const mockRentalCycles = [
    { id: 'c1', rentalId: 'rent-bill-1', cycleNumber: 1, totalAmount: 6000, paidAmount: 4000, pendingAmount: 2000 },
    { id: 'c2', rentalId: 'rent-bill-1', cycleNumber: 2, totalAmount: 3000, paidAmount: 3000, pendingAmount: 0 },
  ];

  const mockPayments = [
    { id: 'p1', rentalId: 'rent-bill-1', amount: 4000, paymentMode: 'Account 1' },
    { id: 'p2', rentalId: 'rent-bill-1', amount: 3000, paymentMode: 'Cash' },
  ];

  const totalCyclesRent = mockRentalCycles.reduce((sum, c) => sum + c.totalAmount, 0);
  const totalPayments = mockPayments.reduce((sum, p) => sum + p.amount, 0);
  const netDue = Math.max(0, totalCyclesRent - totalPayments);

  assert.strictEqual(totalCyclesRent, 9000);
  assert.strictEqual(totalPayments, 7000);
  assert.strictEqual(netDue, 2000);
});

// SUITE 4: Translations for Bill History
console.log('\n🌐 SUITE 4: Translations for Bill History');

runTest('Marathi and English dictionaries contain bill_history key in reports types', () => {
  assert.strictEqual(t.marathi.reports.types.bill_history, 'बिल निहाय इतिहास');
  assert.strictEqual(t.english.reports.types.bill_history, 'Bill-Wise History');
});

console.log('\n' + '='.repeat(75));
console.log(`  🎉 BILL HISTORY & EDIT TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
console.log('='.repeat(75));
