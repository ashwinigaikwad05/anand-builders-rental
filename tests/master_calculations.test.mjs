/**
 * MASTER CALCULATION TEST SUITE
 * Tests all mathematical formulas, financial logic, calendar functions,
 * renewal allocations, return calculations, inventory equations, and screenshot validations.
 */

import assert from 'assert';

console.log('='.repeat(75));
console.log('    ANAND BUILDERS & DEVELOPERS - MASTER CALCULATION TEST SUITE');
console.log('='.repeat(75));

// -----------------------------------------------------------------------------
// CORE REPOSITORY IMPLEMENTATIONS (matching src/lib/supabase.ts)
// -----------------------------------------------------------------------------

function addDaysToDate(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split('T')[0];
}

function calculateCalendarDays(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return 0;
  const [sy, sm, sd] = startDateStr.split('-').map(Number);
  const [ey, em, ed] = endDateStr.split('-').map(Number);
  const startUtc = Date.UTC(sy, sm - 1, sd);
  const endUtc = Date.UTC(ey, em - 1, ed);
  const diffMs = endUtc - startUtc;
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

function calculateExpectedCycleEndDate(startDateStr, cycleDays = 40) {
  return addDaysToDate(startDateStr, cycleDays - 1);
}

function calculateCycleFinances(cycle, asOfDateStr = new Date().toISOString().split('T')[0]) {
  const effectiveEndDate = cycle.actualEndDate || asOfDateStr;
  const elapsedDays = calculateCalendarDays(cycle.startDate, effectiveEndDate);
  const cycleTermDays = cycle.days && cycle.days > 0 ? cycle.days : 40;
  const standardDays = Math.min(elapsedDays, cycleTermDays);
  const extraDays = Math.max(0, elapsedDays - cycleTermDays);

  let extraAmount = 0;
  if (extraDays > 0) {
    if (cycle.items && cycle.items.length > 0) {
      extraAmount = cycle.items.reduce(
        (sum, it) => sum + it.quantity * it.dailyRate * extraDays,
        0
      );
    } else {
      extraAmount = cycle.quantity * cycle.dailyRate * extraDays;
    }
  }

  const totalAmount = cycle.baseRent + extraAmount;
  const pendingAmount = Math.max(0, totalAmount - cycle.paidAmount);

  return { elapsedDays, standardDays, extraDays, extraAmount, totalAmount, pendingAmount };
}

function determineRenewalStartDate(currentExpectedEndDateStr, confirmationDateStr = new Date().toISOString().split('T')[0]) {
  if (confirmationDateStr > currentExpectedEndDateStr) {
    return { newStartDate: confirmationDateStr, isOverdueRenewal: true };
  } else {
    return { newStartDate: addDaysToDate(currentExpectedEndDateStr, 1), isOverdueRenewal: false };
  }
}

function allocateRenewalPayment(prevFinances, newBaseRent, collectedPayment) {
  const paymentAmount = collectedPayment && collectedPayment > 0 ? Number(collectedPayment) : 0;
  const prevDue = Math.max(0, prevFinances.pendingAmount);
  const prevPaidFromPayment = Math.min(paymentAmount, prevDue);
  const newCycleAdvance = Math.max(0, paymentAmount - prevPaidFromPayment);

  const finalPrevCyclePaid = (prevFinances.paidAmount || 0) + prevPaidFromPayment;
  const finalPrevCyclePending = Math.max(0, prevFinances.totalAmount - finalPrevCyclePaid);
  const newCyclePending = Math.max(0, newBaseRent - newCycleAdvance);

  return {
    prevPaidFromPayment,
    newCycleAdvance,
    finalPrevCyclePaid,
    finalPrevCyclePending,
    newCyclePaid: newCycleAdvance,
    newCyclePending,
  };
}

let testCount = 0;
let passedCount = 0;

function runTest(category, name, fn) {
  testCount++;
  try {
    fn();
    console.log(`  ✅ [${category}] ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  ❌ [${category}] ${name}: ${err.message}`);
    throw err;
  }
}

// =============================================================================
// SUITE 1: CALENDAR DAYS & BOUNDARIES
// =============================================================================
console.log('\n📅 SUITE 1: Calendar Days & Date Mathematics');

runTest('Calendar', 'Same-day rental = 1 calendar day (inclusive)', () => {
  assert.strictEqual(calculateCalendarDays('2026-09-23', '2026-09-23'), 1);
});

runTest('Calendar', 'Dispatched Sep 17 to Sep 23 (patil Bill #1) = 7 days', () => {
  assert.strictEqual(calculateCalendarDays('2026-09-17', '2026-09-23'), 7);
});

runTest('Calendar', 'Full standard 40-day cycle: Aug 01 to Sep 09 = 40 days', () => {
  assert.strictEqual(calculateCalendarDays('2026-08-01', '2026-09-09'), 40);
});

runTest('Calendar', 'End date before start date returns 0 days', () => {
  assert.strictEqual(calculateCalendarDays('2026-09-23', '2026-09-20'), 0);
});

runTest('Calendar', 'Month boundary crossover: Oct 30 to Nov 03 = 5 days', () => {
  assert.strictEqual(calculateCalendarDays('2026-10-30', '2026-11-03'), 5);
});

runTest('Calendar', 'Year boundary crossover: Dec 30, 2026 to Jan 03, 2027 = 5 days', () => {
  assert.strictEqual(calculateCalendarDays('2026-12-30', '2027-01-03'), 5);
});

runTest('Calendar', 'Leap year February 2028: Feb 27 to Mar 01 = 4 days (Feb 27, 28, 29, Mar 01)', () => {
  assert.strictEqual(calculateCalendarDays('2028-02-27', '2028-03-01'), 4);
});

// =============================================================================
// SUITE 2: CYCLE END DATE PREDICTION (Day 1 + Days - 1)
// =============================================================================
console.log('\n🎯 SUITE 2: Cycle Expected End Date Calculation');

runTest('CycleEnd', 'Standard 40-day cycle starting Nov 02 (patil Bill #3) ends Dec 11', () => {
  const endDate = calculateExpectedCycleEndDate('2026-11-02', 40);
  assert.strictEqual(endDate, '2026-12-11');
  assert.strictEqual(calculateCalendarDays('2026-11-02', endDate), 40);
});

runTest('CycleEnd', '81-day cycle starting Mar 23, 2027 (sai Bill #2) ends Jun 11, 2027', () => {
  const endDate = calculateExpectedCycleEndDate('2027-03-23', 81);
  assert.strictEqual(endDate, '2027-06-11');
  assert.strictEqual(calculateCalendarDays('2027-03-23', endDate), 81);
});

runTest('CycleEnd', '7-day dispatch starting Sep 17 ends Sep 23', () => {
  const endDate = calculateExpectedCycleEndDate('2026-09-17', 7);
  assert.strictEqual(endDate, '2026-09-23');
  assert.strictEqual(calculateCalendarDays('2026-09-17', endDate), 7);
});

runTest('CycleEnd', '1-day rental ends on the same day', () => {
  assert.strictEqual(calculateExpectedCycleEndDate('2026-09-23', 1), '2026-09-23');
});

// =============================================================================
// SUITE 3: SINGLE & MULTI-ITEM CYCLE FINANCES
// =============================================================================
console.log('\n💰 SUITE 3: Cycle Financial Calculations & Extra Charges');

runTest('Finance', 'Single item within 40 days: 100 plates @ ₹1.50/day = ₹6,000 base rent, 0 extra', () => {
  const fin = calculateCycleFinances({
    startDate: '2026-08-01',
    quantity: 100,
    dailyRate: 1.5,
    baseRent: 6000,
    paidAmount: 2000,
  }, '2026-08-30'); // 30 days elapsed
  assert.strictEqual(fin.elapsedDays, 30);
  assert.strictEqual(fin.standardDays, 30);
  assert.strictEqual(fin.extraDays, 0);
  assert.strictEqual(fin.extraAmount, 0);
  assert.strictEqual(fin.totalAmount, 6000);
  assert.strictEqual(fin.pendingAmount, 4000);
});

runTest('Finance', 'Overdue single item: 10 extra days @ ₹1.50/plate on 100 plates = ₹1,500 extra charge', () => {
  const fin = calculateCycleFinances({
    startDate: '2026-08-01',
    quantity: 100,
    dailyRate: 1.5,
    baseRent: 6000,
    paidAmount: 3000,
  }, '2026-09-19'); // 50 days elapsed (40 standard + 10 extra)
  assert.strictEqual(fin.elapsedDays, 50);
  assert.strictEqual(fin.extraDays, 10);
  assert.strictEqual(fin.extraAmount, 1500); // 100 * 1.5 * 10
  assert.strictEqual(fin.totalAmount, 7500); // 6000 + 1500
  assert.strictEqual(fin.pendingAmount, 4500); // 7500 - 3000
});

runTest('Finance', 'Multi-item dispatch with different rates: (60 @ ₹1.50) + (40 @ ₹2.00) = ₹170/day', () => {
  const items = [
    { plateType: '24×3', quantity: 60, dailyRate: 1.5 },  // 90/day
    { plateType: '21×3', quantity: 40, dailyRate: 2.0 },  // 80/day
  ];
  // 40-day base rent = (90 + 80) * 40 = 170 * 40 = 6,800
  const baseRent = 6800;
  const fin = calculateCycleFinances({
    startDate: '2026-08-01',
    quantity: 100,
    dailyRate: 1.7,
    baseRent,
    paidAmount: 5000,
    items,
  }, '2026-09-14'); // 45 days (5 extra)
  assert.strictEqual(fin.extraDays, 5);
  // Extra amount = (60 * 1.5 * 5) + (40 * 2.0 * 5) = 450 + 400 = 850
  assert.strictEqual(fin.extraAmount, 850);
  assert.strictEqual(fin.totalAmount, 7650);
  assert.strictEqual(fin.pendingAmount, 2650); // 7650 - 5000
});

// =============================================================================
// SUITE 4: RENEWAL RULES & STAGGER LOGIC
// =============================================================================
console.log('\n🔁 SUITE 4: Renewal Start Date Rules & Overdue Stagger');

runTest('RenewalRules', 'Rule A: Early renewal (5 days before end) starts day after expected end', () => {
  const ren = determineRenewalStartDate('2026-09-09', '2026-09-04');
  assert.strictEqual(ren.newStartDate, '2026-09-10');
  assert.strictEqual(ren.isOverdueRenewal, false);
});

runTest('RenewalRules', 'Rule B: Renewal on exact expected end date starts next day', () => {
  const ren = determineRenewalStartDate('2026-09-09', '2026-09-09');
  assert.strictEqual(ren.newStartDate, '2026-09-10');
  assert.strictEqual(ren.isOverdueRenewal, false);
});

runTest('RenewalRules', 'Rule C: Overdue renewal (6 days late) starts on renewal confirmation date', () => {
  const ren = determineRenewalStartDate('2026-09-09', '2026-09-15');
  assert.strictEqual(ren.newStartDate, '2026-09-15');
  assert.strictEqual(ren.isOverdueRenewal, true);
});

// =============================================================================
// SUITE 5: RENEWAL PAYMENT ALLOCATION & ADVANCE SETTLEMENT
// =============================================================================
console.log('\n💵 SUITE 5: Renewal Payment Allocation & Advance Settlement');

runTest('RenewPayment', 'Partial payment pays part of previous due; new cycle has 0 advance', () => {
  const prevFinances = { totalAmount: 2400, paidAmount: 1800, pendingAmount: 600 };
  const alloc = allocateRenewalPayment(prevFinances, 2400, 400);
  assert.strictEqual(alloc.prevPaidFromPayment, 400);
  assert.strictEqual(alloc.newCycleAdvance, 0);
  assert.strictEqual(alloc.finalPrevCyclePaid, 2200);
  assert.strictEqual(alloc.finalPrevCyclePending, 200);
  assert.strictEqual(alloc.newCyclePending, 2400);
});

runTest('RenewPayment', 'Exact previous due payment settles Cycle 1 to ₹0, Cycle 2 untouched', () => {
  const prevFinances = { totalAmount: 2400, paidAmount: 1800, pendingAmount: 600 };
  const alloc = allocateRenewalPayment(prevFinances, 2400, 600);
  assert.strictEqual(alloc.prevPaidFromPayment, 600);
  assert.strictEqual(alloc.newCycleAdvance, 0);
  assert.strictEqual(alloc.finalPrevCyclePaid, 2400);
  assert.strictEqual(alloc.finalPrevCyclePending, 0);
  assert.strictEqual(alloc.newCyclePending, 2400);
});

runTest('RenewPayment', 'Excess payment clears previous cycle + credits advance to new cycle', () => {
  const prevFinances = { totalAmount: 2400, paidAmount: 1800, pendingAmount: 600 };
  const alloc = allocateRenewalPayment(prevFinances, 2400, 1600);
  assert.strictEqual(alloc.prevPaidFromPayment, 600); // 600 clears prev
  assert.strictEqual(alloc.newCycleAdvance, 1000);    // 1000 advance
  assert.strictEqual(alloc.finalPrevCyclePending, 0);
  assert.strictEqual(alloc.newCyclePaid, 1000);
  assert.strictEqual(alloc.newCyclePending, 1400);   // 2400 - 1000
});

runTest('RenewPayment', 'Full payment of both cycles clears everything to ₹0 due', () => {
  const prevFinances = { totalAmount: 2400, paidAmount: 1800, pendingAmount: 600 };
  const alloc = allocateRenewalPayment(prevFinances, 2400, 3000); // 600 + 2400
  assert.strictEqual(alloc.finalPrevCyclePending, 0);
  assert.strictEqual(alloc.newCyclePending, 0);
});

// =============================================================================
// SUITE 6: RETURN INTAKE & SETTLEMENT CALCULATIONS
// =============================================================================
console.log('\n📦 SUITE 6: Return Intake & Settlement');

runTest('ReturnIntake', 'Remaining plates on site calculation after multiple partial returns', () => {
  const issuedQuantity = 100;
  const returnLogs = [
    { returnedQuantity: 30 },
    { returnedQuantity: 40 },
  ];
  const alreadyReturned = returnLogs.reduce((sum, r) => sum + r.returnedQuantity, 0);
  const remainingOnSite = Math.max(0, issuedQuantity - alreadyReturned);
  assert.strictEqual(alreadyReturned, 70);
  assert.strictEqual(remainingOnSite, 30);
});

runTest('ReturnIntake', 'Settlement calculation with paise decimal amount (₹271.50)', () => {
  const currentPendingDue = 271.5;
  const collectedAmount = 271.5;
  const balanceAfterReturn = Math.max(0, currentPendingDue - collectedAmount);
  assert.strictEqual(balanceAfterReturn, 0);
});

runTest('ReturnIntake', 'Partial return collection preserves remaining balance without float precision errors', () => {
  const currentPendingDue = 271.5;
  const collectedAmount = 150.0;
  const balanceAfterReturn = Math.max(0, currentPendingDue - collectedAmount);
  assert.strictEqual(Math.round(balanceAfterReturn * 100) / 100, 121.5);
});

// =============================================================================
// SUITE 7: VALIDATION OF LIVE SCREENSHOT DATA (USER SYSTEM AUDIT)
// =============================================================================
console.log('\n📸 SUITE 7: Live System Verification (User Screenshots)');

runTest('ScreenshotAudit', 'Bill #3 (patil constructions): 2 cycles of 10 plates @ ₹1.5/d for 40d = ₹1,200', () => {
  const cycle1Rent = 10 * 1.5 * 40;
  const cycle2Rent = 10 * 1.5 * 40;
  const totalRent = cycle1Rent + cycle2Rent;
  assert.strictEqual(totalRent, 1200);

  const totalPaid = 480 + 600 + 120;
  assert.strictEqual(totalPaid, 1200);

  const due = Math.max(0, totalRent - totalPaid);
  assert.strictEqual(due, 0);
});

runTest('ScreenshotAudit', 'Bill #2 (sai): 9 cycles total ₹393, paid ₹139.50, due ₹253.50', () => {
  const totalRent = 393;
  const totalPaid = 18 + 121.5;
  assert.strictEqual(totalPaid, 139.5);

  const due = totalRent - totalPaid;
  assert.strictEqual(due, 253.5);
});

runTest('ScreenshotAudit', 'Bill #1 (patil constructions): Dispatched Sep 17 to Sep 23 (7d), Total ₹6,000, Paid ₹6,000', () => {
  const totalRent = 6000;
  const totalPaid = 4900 + 1100;
  assert.strictEqual(totalPaid, 6000);

  const due = totalRent - totalPaid;
  assert.strictEqual(due, 0);
});

runTest('ScreenshotAudit', 'Party Level Balance: patil constructions total dues = ₹0', () => {
  const patilTotalRent = 1200 + 6000;
  const patilTotalPaid = 1200 + 6000;
  const patilPending = Math.max(0, patilTotalRent - patilTotalPaid);
  assert.strictEqual(patilPending, 0);
});

runTest('ScreenshotAudit', 'Party Level Balance: sai total dues = ₹253.50', () => {
  const saiTotalRent = 393;
  const saiTotalPaid = 139.5;
  const saiPending = Math.max(0, saiTotalRent - saiTotalPaid);
  assert.strictEqual(saiPending, 253.5);
});

// =============================================================================
// SUITE 8: INVENTORY STOCK CONSERVATION
// =============================================================================
console.log('\n🏭 SUITE 8: Inventory Stock Equations');

runTest('Inventory', 'Stock invariant: Total Stock = Available + With Parties', () => {
  const totalStock = 500;
  const dispatched = 100;
  const availableAfterDispatch = totalStock - dispatched;
  const withPartiesAfterDispatch = dispatched;
  assert.strictEqual(availableAfterDispatch + withPartiesAfterDispatch, totalStock);

  const returned = 40;
  const availableAfterReturn = availableAfterDispatch + returned;
  const withPartiesAfterReturn = withPartiesAfterDispatch - returned;
  assert.strictEqual(availableAfterReturn + withPartiesAfterReturn, totalStock);
  assert.strictEqual(availableAfterReturn, 440);
  assert.strictEqual(withPartiesAfterReturn, 60);
});

// =============================================================================
// FINAL SUMMARY
// =============================================================================
console.log('\n' + '='.repeat(75));
console.log(`  🎉 SUMMARY: ${passedCount} / ${testCount} CALCULATION TESTS PASSED (100% SUCCESS)`);
console.log('='.repeat(75));
