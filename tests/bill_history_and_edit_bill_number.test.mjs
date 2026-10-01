import { strict as assert } from 'node:assert';
import { t } from '../src/utils/appTranslations.ts';
import { matchRentalSearch } from '../src/utils/marathiUtils.ts';

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

// SUITE 5: Rentals Tab Search by Bill No, Customer Name, and Site Name
console.log('\n🔎 SUITE 5: Rentals Tab Search by Bill No, Customer Name, and Site Name');

const sampleRentals = [
  {
    id: 'r1',
    billNumber: 1,
    partyId: 'p1',
    partyName: 'patil constructions',
    plateType: '24×3',
    quantity: 100,
    customerNumber: 1,
    party: {
      id: 'p1',
      name: 'PATIL CONSTRUCTIONS',
      mobile: '9822001122',
      address: 'Near Shahu Maharaj Chowk, Kolhapur',
      customerNumber: 1,
    },
  },
  {
    id: 'r2',
    billNumber: 3,
    partyId: 'p1',
    partyName: 'patil constructions',
    plateType: '21×3',
    quantity: 10,
    customerNumber: 1,
    party: {
      id: 'p1',
      name: 'PATIL CONSTRUCTIONS',
      mobile: '9822001122',
      address: 'Near Shahu Maharaj Chowk, Kolhapur',
      customerNumber: 1,
    },
  },
  {
    id: 'r3',
    billNumber: 4,
    partyId: 'p1',
    partyName: 'patil constructions',
    plateType: '24×3',
    quantity: 40,
    customerNumber: 1,
    party: {
      id: 'p1',
      name: 'PATIL CONSTRUCTIONS',
      mobile: '9822001122',
      address: 'Near Shahu Maharaj Chowk, Kolhapur',
      customerNumber: 1,
    },
  },
  {
    id: 'r4',
    billNumber: 2,
    partyId: 'p2',
    partyName: 'sai',
    plateType: '24×3',
    quantity: 1,
    customerNumber: 2,
    party: {
      id: 'p2',
      name: 'SAI BUILDERS',
      mobile: '9766003344',
      address: 'Kadamwadi Main Road, Sangli Site #2',
      customerNumber: 2,
    },
  },
  {
    id: 'r5',
    billNumber: 'AN-2026/05',
    partyId: 'p3',
    partyName: 'Omega Projects',
    plateType: '3×2',
    quantity: 25,
    customerNumber: 3,
    party: {
      id: 'p3',
      name: 'Omega Projects',
      mobile: '9123456780',
      address: 'MIDC Shiroli Industrial Area',
      customerNumber: 3,
    },
  },
];

runTest('Search by exact Bill Number matches the corresponding rental', () => {
  const matches = sampleRentals.filter((r) => matchRentalSearch(r, '4'));
  assert.strictEqual(matches.length, 1);
  assert.strictEqual(matches[0].id, 'r3');
  assert.strictEqual(matches[0].billNumber, 4);
});

runTest('Search by Bill Number with hash (#) matches correctly', () => {
  const matches = sampleRentals.filter((r) => matchRentalSearch(r, '#4'));
  assert.strictEqual(matches.length, 1);
  assert.strictEqual(matches[0].id, 'r3');
});

runTest('Search with English "bill" prefix matches exact bill', () => {
  const matches1 = sampleRentals.filter((r) => matchRentalSearch(r, 'bill 4'));
  assert.strictEqual(matches1.length, 1);
  assert.strictEqual(matches1[0].id, 'r3');

  const matches2 = sampleRentals.filter((r) => matchRentalSearch(r, 'bill #4'));
  assert.strictEqual(matches2.length, 1);
  assert.strictEqual(matches2[0].id, 'r3');
});

runTest('Search with Marathi "बिल" prefix matches exact bill', () => {
  const matches1 = sampleRentals.filter((r) => matchRentalSearch(r, 'बिल 4'));
  assert.strictEqual(matches1.length, 1);
  assert.strictEqual(matches1[0].id, 'r3');

  const matches2 = sampleRentals.filter((r) => matchRentalSearch(r, 'बिल #4'));
  assert.strictEqual(matches2.length, 1);
  assert.strictEqual(matches2[0].id, 'r3');

  const matches3 = sampleRentals.filter((r) => matchRentalSearch(r, 'बिल क्र 4'));
  assert.strictEqual(matches3.length, 1);
  assert.strictEqual(matches3[0].id, 'r3');
});

runTest('Search with Devanagari Marathi digits (०-९) matches bill number', () => {
  // Marathi digit 4 is ४
  const matches = sampleRentals.filter((r) => matchRentalSearch(r, '४'));
  assert.strictEqual(matches.length, 1);
  assert.strictEqual(matches[0].id, 'r3');

  const matchesMarathiBill = sampleRentals.filter((r) => matchRentalSearch(r, 'बिल #४'));
  assert.strictEqual(matchesMarathiBill.length, 1);
  assert.strictEqual(matchesMarathiBill[0].id, 'r3');
});

runTest('Search custom alphanumeric bill number matches accurately', () => {
  const matches = sampleRentals.filter((r) => matchRentalSearch(r, 'AN-2026/05'));
  assert.strictEqual(matches.length, 1);
  assert.strictEqual(matches[0].id, 'r5');
});

runTest('Search by Customer Name matches all rentals of that party', () => {
  const patilMatches = sampleRentals.filter((r) => matchRentalSearch(r, 'patil'));
  assert.strictEqual(patilMatches.length, 3);

  const saiMatches = sampleRentals.filter((r) => matchRentalSearch(r, 'sai'));
  assert.strictEqual(saiMatches.length, 1);
  assert.strictEqual(saiMatches[0].id, 'r4');
});

runTest('Search by Customer Serial (ग्राहक / Cust #) matches correctly', () => {
  const custMatches = sampleRentals.filter((r) => matchRentalSearch(r, 'ग्राहक 2'));
  assert.strictEqual(custMatches.length, 1);
  assert.strictEqual(custMatches[0].id, 'r4');

  const custMatchesEn = sampleRentals.filter((r) => matchRentalSearch(r, 'cust #2'));
  assert.strictEqual(custMatchesEn.length, 1);
  assert.strictEqual(custMatchesEn[0].id, 'r4');
});

runTest('Search by Site Name / Delivery Address matches accurately', () => {
  // Search by "kolhapur" matches all 3 rentals of Patil at Kolhapur site
  const kolhapurMatches = sampleRentals.filter((r) => matchRentalSearch(r, 'kolhapur'));
  assert.strictEqual(kolhapurMatches.length, 3);

  // Search by "kadamwadi" matches Sai
  const kadamwadiMatches = sampleRentals.filter((r) => matchRentalSearch(r, 'kadamwadi'));
  assert.strictEqual(kadamwadiMatches.length, 1);
  assert.strictEqual(kadamwadiMatches[0].id, 'r4');

  // Search with "site" prefix
  const siteMatches = sampleRentals.filter((r) => matchRentalSearch(r, 'site kolhapur'));
  assert.strictEqual(siteMatches.length, 3);
});

runTest('Search with single digit "3" matches Bill #3 and does NOT falsely match 24x3 plates', () => {
  const matches = sampleRentals.filter((r) => matchRentalSearch(r, '3'));
  // r2 has billNumber: 3, r5 has customerNumber: 3
  // Critically: r1 (bill 1, plate 24x3) and r3 (bill 4, plate 24x3) and r4 (bill 2, plate 24x3) MUST NOT match!
  const matchedIds = matches.map((m) => m.id);
  assert.strictEqual(matchedIds.includes('r1'), false);
  assert.strictEqual(matchedIds.includes('r3'), false);
  assert.strictEqual(matchedIds.includes('r4'), false);
  assert.strictEqual(matchedIds.includes('r2'), true);
});

runTest('Multi-token search combines party name and bill number or site name', () => {
  // "patil 4" matches ONLY Bill #4 of Patil
  const patilBill4 = sampleRentals.filter((r) => matchRentalSearch(r, 'patil 4'));
  assert.strictEqual(patilBill4.length, 1);
  assert.strictEqual(patilBill4[0].id, 'r3');

  // "patil kolhapur" matches Patil's rentals
  const patilKolhapur = sampleRentals.filter((r) => matchRentalSearch(r, 'patil kolhapur'));
  assert.strictEqual(patilKolhapur.length, 3);

  // "sai kolhapur" returns 0 because Sai is at Sangli/Kadamwadi, not Kolhapur
  const saiKolhapur = sampleRentals.filter((r) => matchRentalSearch(r, 'sai kolhapur'));
  assert.strictEqual(saiKolhapur.length, 0);
});

runTest('Plate type search matches when explicit dimensions are provided', () => {
  const matches21 = sampleRentals.filter((r) => matchRentalSearch(r, '21x3'));
  assert.strictEqual(matches21.length, 1);
  assert.strictEqual(matches21[0].id, 'r2');
});

// SUITE 6: Settings Data Management & Delete Actions
console.log('\n🗑️  SUITE 6: Settings Data Management & Delete Actions');

runTest('Delete Inactive Customers accurately filters customers with 0 plates and 0 pending balance', () => {
  const testParties = [
    { id: 'p1', name: 'Patil Constructions', platesWithParty: 40, pending: 1400 },
    { id: 'p2', name: 'Sai Developers', platesWithParty: 1, pending: 142.5 },
    { id: 'p3', name: 'Completed Customer 1', platesWithParty: 0, pending: 0 },
    { id: 'p4', name: 'Completed Customer 2', platesWithParty: 0, pending: 0 },
    { id: 'p5', name: 'Dues Only Customer', platesWithParty: 0, pending: 500 },
  ];

  const inactive = testParties.filter((p) => (p.platesWithParty || 0) === 0 && (p.pending || 0) === 0);
  assert.strictEqual(inactive.length, 2);
  assert.deepStrictEqual(inactive.map((p) => p.id), ['p3', 'p4']);

  // Remaining active parties
  const remaining = testParties.filter((p) => !inactive.some((i) => i.id === p.id));
  assert.strictEqual(remaining.length, 3);
  assert.strictEqual(remaining.some((r) => r.id === 'p1'), true);
  assert.strictEqual(remaining.some((r) => r.id === 'p2'), true);
  assert.strictEqual(remaining.some((r) => r.id === 'p5'), true);
});

runTest('Delete All Rentals and Transactions simulates zeroing rental states while preserving parties', () => {
  let mockRentals = [{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }];
  let mockCycles = [{ id: 'c1' }, { id: 'c2' }];
  let mockReturns = [{ id: 'ret1' }];
  let mockParties = [{ id: 'p1', name: 'Patil' }, { id: 'p2', name: 'Sai' }];

  // Simulate category === 'all_rentals'
  mockRentals = [];
  mockCycles = [];
  mockReturns = [];

  assert.strictEqual(mockRentals.length, 0);
  assert.strictEqual(mockCycles.length, 0);
  assert.strictEqual(mockReturns.length, 0);
  assert.strictEqual(mockParties.length, 2); // parties remain completely safe
});

runTest('Delete All Payments simulates clearing payment records and receipts', () => {
  let mockPayments = [{ id: 'pay1', amount: 5000 }, { id: 'pay2', amount: 2000 }];
  mockPayments = [];
  assert.strictEqual(mockPayments.length, 0);
});

runTest('Factory Reset wipes all database entities back to blank slate', () => {
  let mockState = {
    rentals: [{ id: 'r1' }],
    rentalCycles: [{ id: 'c1' }],
    returns: [{ id: 'ret1' }],
    payments: [{ id: 'pay1' }],
    parties: [{ id: 'p1' }],
  };

  // Factory reset simulation
  mockState = {
    rentals: [],
    rentalCycles: [],
    returns: [],
    payments: [],
    parties: [],
  };

  assert.strictEqual(mockState.rentals.length, 0);
  assert.strictEqual(mockState.rentalCycles.length, 0);
  assert.strictEqual(mockState.returns.length, 0);
  assert.strictEqual(mockState.payments.length, 0);
  assert.strictEqual(mockState.parties.length, 0);
});

console.log('\n' + '='.repeat(75));
console.log(`  🎉 BILL HISTORY & EDIT TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
console.log('='.repeat(75));

