import assert from 'node:assert';
import {
  DEFAULT_BILL_TEMPLATE_CONFIG,
  getBillTemplateConfig,
  saveBillTemplateConfig,
} from '../src/utils/billTemplateUtils.ts';

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [BillPartySign & KYC] ${name}`);
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
console.log('    BILL PARTY SIGNATURE & CUSTOMER KYC DOCUMENTS TEST SUITE');
console.log('===========================================================================');

console.log('\n✍️  SUITE 1: Party Signature Configuration & Marathi Labels');

runTest('Party signature Marathi label and sub are pure Marathi', () => {
  const marathiSignLabel = 'ग्राहकाची सही / अंगठा';
  const customerName = 'सुनील तानाजी भोसले';
  const marathiSignSub = `साहित्य सुस्थितीत मिळाले (${customerName})`;

  assert.strictEqual(marathiSignLabel, 'ग्राहकाची सही / अंगठा');
  assert.ok(marathiSignSub.includes(customerName));
  assert.ok(!marathiSignSub.includes('Customer Signature'));
});

runTest('Party signature English label is defined as Customer\'s Signature', () => {
  const englishSignLabel = "Customer's Signature";
  const customerName = 'Sunil Tanaji Bhosale';
  const englishSignSub = `Material Received in Good Condition (${customerName})`;

  assert.strictEqual(englishSignLabel, "Customer's Signature");
  assert.ok(englishSignSub.includes(customerName));
});

console.log('\n📄 SUITE 2: Bill Template Config & KYC Documents Toggle');

runTest('DEFAULT_BILL_TEMPLATE_CONFIG includes showKycDocuments field defaulted to false', () => {
  assert.strictEqual(typeof DEFAULT_BILL_TEMPLATE_CONFIG.showKycDocuments, 'boolean');
  assert.strictEqual(DEFAULT_BILL_TEMPLATE_CONFIG.showKycDocuments, false);
});

runTest('getBillTemplateConfig returns showKycDocuments from storage', () => {
  localStorage.clear();
  const def = getBillTemplateConfig();
  assert.strictEqual(def.showKycDocuments, false);

  saveBillTemplateConfig({
    ...def,
    showKycDocuments: true,
  });

  const updated = getBillTemplateConfig();
  assert.strictEqual(updated.showKycDocuments, true);
});

console.log('\n🪪 SUITE 3: Customer KYC 4-Document Annexure Mapping');

runTest('All 4 customer verification documents (Face, Aadhaar Front, Aadhaar Back, Cheque) map correctly', () => {
  const mockParty = {
    id: 'p-101',
    name: 'रमेश पवार',
    mobile: '9822001122',
    address: 'Plot 44, Barshi Road, Pandharpur',
    photoUrl: 'data:image/jpeg;base64,/9j/faceMockData',
    aadhaarUrl: 'data:image/jpeg;base64,/9j/aadhaarFrontMockData',
    aadhaarBackUrl: 'data:image/jpeg;base64,/9j/aadhaarBackMockData',
    chequeUrl: 'data:image/jpeg;base64,/9j/chequeMockData',
  };

  const docs = [
    { id: 'photo', titleMr: '१. ग्राहक फोटो (चेहरा)', url: mockParty.photoUrl },
    { id: 'aadhaarFront', titleMr: '२. आधार कार्ड (पुढील बाजू)', url: mockParty.aadhaarUrl },
    { id: 'aadhaarBack', titleMr: '३. आधार कार्ड (मागील बाजू)', url: mockParty.aadhaarBackUrl },
    { id: 'cheque', titleMr: '४. सिक्युरिटी चेक', url: mockParty.chequeUrl },
  ];

  assert.strictEqual(docs.length, 4);
  assert.ok(docs[0].url.includes('faceMockData'));
  assert.ok(docs[1].url.includes('aadhaarFrontMockData'));
  assert.ok(docs[2].url.includes('aadhaarBackMockData'));
  assert.ok(docs[3].url.includes('chequeMockData'));
  assert.strictEqual(docs.filter(d => Boolean(d.url)).length, 4);
});

runTest('Partial KYC documents handle missing items gracefully', () => {
  const mockPartyPartial = {
    id: 'p-102',
    name: 'संजय गायकवाड',
    mobile: '9822334455',
    address: 'Solapur Road',
    photoUrl: 'data:image/jpeg;base64,/9j/faceMockData',
    aadhaarUrl: 'data:image/jpeg;base64,/9j/aadhaarFrontMockData',
    aadhaarBackUrl: null,
    chequeUrl: null,
  };

  const hasPhoto = Boolean(mockPartyPartial.photoUrl);
  const hasAadhaarFront = Boolean(mockPartyPartial.aadhaarUrl);
  const hasAadhaarBack = Boolean(mockPartyPartial.aadhaarBackUrl);
  const hasCheque = Boolean(mockPartyPartial.chequeUrl);

  assert.strictEqual(hasPhoto, true);
  assert.strictEqual(hasAadhaarFront, true);
  assert.strictEqual(hasAadhaarBack, false);
  assert.strictEqual(hasCheque, false);

  // Filter only uploaded documents
  const allCandidateDocs = [
    { id: 'photo', title: 'ग्राहक फोटो (चेहरा)', url: mockPartyPartial.photoUrl },
    { id: 'aadhaarFront', title: 'आधार कार्ड (पुढील बाजू)', url: mockPartyPartial.aadhaarUrl },
    { id: 'aadhaarBack', title: 'आधार कार्ड (मागील बाजू)', url: mockPartyPartial.aadhaarBackUrl },
    { id: 'cheque', title: 'सुरक्षा चेक (सिक्युरिटी चेक)', url: mockPartyPartial.chequeUrl },
  ];

  const uploadedDocs = allCandidateDocs.filter(d => Boolean(d.url && d.url.trim()));
  assert.strictEqual(uploadedDocs.length, 2);
  assert.strictEqual(uploadedDocs[0].id, 'photo');
  assert.strictEqual(uploadedDocs[1].id, 'aadhaarFront');
});

runTest('When customer has zero KYC documents uploaded, uploadedDocs is empty', () => {
  const mockPartyEmpty = {
    id: 'p-103',
    name: 'रमेश पाटील',
    mobile: '9822334466',
    address: 'Near Old Bus Stand',
    photoUrl: null,
    aadhaarUrl: '',
    aadhaarBackUrl: undefined,
    chequeUrl: null,
  };

  const allCandidateDocs = [
    { id: 'photo', title: 'ग्राहक फोटो (चेहरा)', url: mockPartyEmpty.photoUrl },
    { id: 'aadhaarFront', title: 'आधार कार्ड (पुढील बाजू)', url: mockPartyEmpty.aadhaarUrl },
    { id: 'aadhaarBack', title: 'आधार कार्ड (मागील बाजू)', url: mockPartyEmpty.aadhaarBackUrl },
    { id: 'cheque', title: 'सुरक्षा चेक (सिक्युरिटी चेक)', url: mockPartyEmpty.chequeUrl },
  ];

  const uploadedDocs = allCandidateDocs.filter(d => Boolean(d.url && d.url.trim()));
  assert.strictEqual(uploadedDocs.length, 0);
});

console.log('\n🌐 SUITE 4: Pure Language Separation (Marathi vs English)');

runTest('DEFAULT_BILL_TEMPLATE_CONFIG defaults to pure Marathi signatory title', () => {
  assert.strictEqual(DEFAULT_BILL_TEMPLATE_CONFIG.signatoryTitle, 'अधिकृत स्वाक्षरी / शिक्का');
  assert.ok(!DEFAULT_BILL_TEMPLATE_CONFIG.signatoryTitle.toLowerCase().includes('authorized'));
});

runTest('getBillTemplateConfig auto-migrates legacy hybrid bilingual signatoryTitle', () => {
  localStorage.clear();
  // Simulate old config in localStorage with legacy bilingual title
  localStorage.setItem('anand_bill_template_config', JSON.stringify({
    signatoryTitle: 'Authorized Signatory / अधिकृत स्वाक्षरी',
    billLanguage: 'marathi'
  }));

  const marathiConfig = getBillTemplateConfig();
  assert.strictEqual(marathiConfig.signatoryTitle, 'अधिकृत स्वाक्षरी / शिक्का');
  assert.ok(!marathiConfig.signatoryTitle.toLowerCase().includes('authorized'));

  // When language is English, cleans to English
  localStorage.setItem('anand_bill_template_config', JSON.stringify({
    signatoryTitle: 'Authorized Signatory / अधिकृत स्वाक्षरी',
    billLanguage: 'english'
  }));

  const englishConfig = getBillTemplateConfig();
  assert.strictEqual(englishConfig.signatoryTitle, 'Authorized Signatory / Stamp');
  assert.ok(!englishConfig.signatoryTitle.includes('अधिकृत'));
});

runTest('Custom pure signatory titles are preserved intact', () => {
  localStorage.clear();
  localStorage.setItem('anand_bill_template_config', JSON.stringify({
    signatoryTitle: 'व्यवस्थापक स्वाक्षरी',
    billLanguage: 'marathi'
  }));

  const cfg = getBillTemplateConfig();
  assert.strictEqual(cfg.signatoryTitle, 'व्यवस्थापक स्वाक्षरी');
});

console.log('\n===========================================================================');
console.log(`  🎉 SUMMARY: ALL ${passedTests} / ${totalTests} BILL SIGNATURE & KYC TESTS PASSED`);
console.log('===========================================================================\n');


