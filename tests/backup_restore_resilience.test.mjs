import assert from 'node:assert';
import { test, describe } from 'node:test';

// Polyfill window, localStorage, and Event for node environment
const storageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, val) => {
      store[key] = String(val);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    _getStore: () => store,
  };
})();

globalThis.window = {
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {},
};
globalThis.localStorage = storageMock;
globalThis.Event = class Event {
  constructor(type) {
    this.type = type;
  }
};

const { restoreBackupData } = await import('../src/lib/supabase.ts');
const { getBillTemplateConfig, saveBillTemplateConfig } = await import('../src/utils/billTemplateUtils.ts');

describe('📦 BACKUP UPLOAD & RESTORE RESILIENCE SUITE', () => {

  test('1. Restores UI camelCase backup and normalizes records for database & storage', async () => {
    localStorage.clear();

    const uiBackup = {
      appName: 'आनंद बिल्डर्स अँड डेव्हलपर्स',
      exportTimestamp: '2026-10-14T11:00:00.000Z',
      parties: [
        {
          id: 'party-test-01',
          name: 'रवींद्र पाटील',
          mobile: '9881985058',
          address: 'सोलापूर रोड, कुर्डुवाडी',
          status: 'active',
          platesWithParty: 100, // UI-only field
          totalRent: 8000,      // UI-only field
          paid: 3000,           // UI-only field
          pending: 5000,        // UI-only field
          photoUrl: 'https://example.com/photo.jpg',
          aadhaarUrl: 'https://example.com/aadhaar.jpg',
        },
      ],
      rentals: [
        {
          id: 'rent-test-01',
          partyId: 'party-test-01',
          partyName: 'रवींद्र पाटील',
          plateType: '24×3',
          quantity: 100,
          dailyRate: 2,
          issueDate: '2026-03-01',
          days: 40,
          totalRent: 8000,
          paid: 3000,
          pending: 5000,
          paymentMode: 'Cash',
          status: 'active',
          billNumber: 1, // UI-only
        },
      ],
      rentalCycles: [
        {
          id: 'cyc-test-01',
          rentalId: 'rent-test-01',
          partyId: 'party-test-01',
          cycleNumber: 1,
          startDate: '2026-03-01',
          expectedEndDate: '2026-04-09',
          days: 40,
          extraDays: 0,
          dailyRate: 2,
          quantity: 100,
          baseRent: 8000,
          totalAmount: 8000,
          paidAmount: 3000,
          pendingAmount: 5000,
          status: 'active',
        },
      ],
      returns: [
        {
          id: 'ret-test-01',
          rentalId: 'rent-test-01',
          partyId: 'party-test-01',
          partyName: 'रवींद्र पाटील',
          plateType: '24×3',
          issuedQuantity: 100,
          returnedQuantity: 50,
          remainingQuantity: 50,
          returnDate: '2026-03-20',
        },
      ],
      payments: [
        {
          id: 'pay-test-01',
          partyId: 'party-test-01',
          partyName: 'रवींद्र पाटील',
          rentalId: 'rent-test-01',
          amount: 3000,
          date: '2026-03-01',
          paymentMode: 'Cash',
        },
      ],
      stockItems: [
        {
          id: 'stock-test-01',
          plateSize: '24×3',
          quantity: 200,
          receivedDate: '2026-01-01',
        },
      ],
      plateSettings: [
        {
          id: 'plate-test-01',
          plateSize: '24×3',
          dailyRate: 2,
          status: 'available',
        },
      ],
      billConfig: {
        billTitle: 'भाडे पावती व साहित्य चालान',
        bankName: 'State Bank of India',
        accountNumber: '39482910482',
        termsAndConditions: ['नियम १', 'नियम २'],
      },
    };

    const result = await restoreBackupData(uiBackup);
    assert.strictEqual(result.success, true);

    // Verify localStorage has normalized records
    const storedParties = JSON.parse(localStorage.getItem('anand_parties') || '[]');
    assert.strictEqual(storedParties.length, 1);
    assert.strictEqual(storedParties[0].name, 'रवींद्र पाटील');
    // Ensure UI-only fields were stripped
    assert.strictEqual(storedParties[0].platesWithParty, undefined);
    assert.strictEqual(storedParties[0].totalRent, undefined);
    // Ensure DB columns exist
    assert.strictEqual(storedParties[0].photo_url, 'https://example.com/photo.jpg');
    assert.strictEqual(storedParties[0].aadhaar_url, 'https://example.com/aadhaar.jpg');

    const storedRentals = JSON.parse(localStorage.getItem('anand_rentals') || '[]');
    assert.strictEqual(storedRentals.length, 1);
    assert.strictEqual(storedRentals[0].party_name, 'रवींद्र पाटील');
    assert.strictEqual(storedRentals[0].plate_type, '24×3');
    assert.strictEqual(storedRentals[0].total_rent, 8000);
    assert.strictEqual(storedRentals[0].paid_amount, 3000);
    assert.strictEqual(storedRentals[0].pending_amount, 5000);

    // Verify UUID mapping preserved relational integrity
    const mappedPartyId = storedParties[0].id;
    assert.strictEqual(storedRentals[0].party_id, mappedPartyId);

    const storedReturns = JSON.parse(localStorage.getItem('anand_returns') || '[]');
    assert.strictEqual(storedReturns.length, 1);
    assert.strictEqual(storedReturns[0].party_id, mappedPartyId);
    assert.strictEqual(storedReturns[0].rental_id, storedRentals[0].id);

    const storedPayments = JSON.parse(localStorage.getItem('anand_payments') || '[]');
    assert.strictEqual(storedPayments.length, 1);
    assert.strictEqual(storedPayments[0].party_id, mappedPartyId);
    assert.strictEqual(storedPayments[0].payment_date, '2026-03-01');

    // Verify billConfig was preserved
    const storedConfig = getBillTemplateConfig();
    assert.strictEqual(storedConfig.bankName, 'State Bank of India');
    assert.strictEqual(storedConfig.termsAndConditions.length, 2);
    assert.strictEqual(storedConfig.termsAndConditions[0], 'नियम १');
  });

  test('2. Handles nested backup payload ({ data: { ... } }) seamlessly', async () => {
    localStorage.clear();

    const nestedBackup = {
      version: 1,
      data: {
        parties: [{ id: 'p-nested-1', name: 'विकास मोरे', mobile: '9988776655' }],
        rentals: [{ id: 'r-nested-1', partyId: 'p-nested-1', partyName: 'विकास मोरे', plateType: '21×3', quantity: 50, days: 40 }],
      },
    };

    const res = await restoreBackupData(nestedBackup);
    assert.strictEqual(res.success, true);

    const storedParties = JSON.parse(localStorage.getItem('anand_parties') || '[]');
    assert.strictEqual(storedParties.length, 1);
    assert.strictEqual(storedParties[0].name, 'विकास मोरे');

    const storedRentals = JSON.parse(localStorage.getItem('anand_rentals') || '[]');
    assert.strictEqual(storedRentals.length, 1);
    assert.strictEqual(storedRentals[0].plate_type, '21×3');
  });

  test('3. Synthesizes missing party if a rental references unknown partyId', async () => {
    localStorage.clear();

    const orphanRentalBackup = {
      parties: [],
      rentals: [
        {
          id: 'r-orphan-1',
          partyId: 'unknown-party-99',
          partyName: 'अज्ञात ग्राहक',
          plateType: '18×3',
          quantity: 25,
          days: 40,
        },
      ],
    };

    const res = await restoreBackupData(orphanRentalBackup);
    assert.strictEqual(res.success, true);

    // Verify synthetic party was created to satisfy foreign key constraint
    const storedParties = JSON.parse(localStorage.getItem('anand_parties') || '[]');
    assert.strictEqual(storedParties.length, 1);
    assert.strictEqual(storedParties[0].name, 'अज्ञात ग्राहक');

    const storedRentals = JSON.parse(localStorage.getItem('anand_rentals') || '[]');
    assert.strictEqual(storedRentals[0].party_id, storedParties[0].id);
  });

  test('4. Recovers gracefully from double-stringified billConfig', async () => {
    localStorage.clear();

    const stringifiedBackup = {
      parties: [{ id: 'p1', name: 'सुरेश जाधव', mobile: '9123456789' }],
      billConfig: JSON.stringify({
        bankName: 'HDFC Bank',
        accountNumber: '50100234567890',
        termsAndConditions: ['नियम अ', 'नियम ब'],
      }),
    };

    const res = await restoreBackupData(stringifiedBackup);
    assert.strictEqual(res.success, true);

    const storedConfig = getBillTemplateConfig();
    assert.strictEqual(storedConfig.bankName, 'HDFC Bank');
    assert.strictEqual(storedConfig.termsAndConditions[0], 'नियम अ');
  });

  test('5. Rejects non-object backup format with clear error', async () => {
    await assert.rejects(
      async () => {
        await restoreBackupData('not-an-object');
      },
      {
        message: 'Invalid backup file format',
      }
    );
  });
});
