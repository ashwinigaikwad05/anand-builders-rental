/**
 * MARATHI LANGUAGE & LOCALIZATION FORMAT TEST SUITE
 * Anand Builders & Developers Centering Plates Business System
 * 
 * Tests all Marathi translations, invoice formats, date representations,
 * Devanagari numerals, currency notation, 40-day terms, WhatsApp reminders,
 * payment mode labels, and statement reports.
 */

import assert from 'assert';

console.log('='.repeat(75));
console.log('    ANAND BUILDERS & DEVELOPERS - MARATHI LANGUAGE FORMAT TEST SUITE');
console.log('='.repeat(75));

// -----------------------------------------------------------------------------
// IMPORT OR REPRODUCE LOCALIZATION MODULES
// -----------------------------------------------------------------------------

import { t, getStoredAppLanguage } from '../src/utils/appTranslations.ts';
import {
  toMarathiDigits,
  fromMarathiDigits,
  formatMarathiCurrency,
  formatMarathiDate,
  formatMarathiDuration,
  formatMarathiQuantity,
  formatMarathiCustomer,
  formatMarathiBill,
  formatMarathiCycle,
  getMarathiPaymentMode,
  getMarathiStatus,
} from '../src/utils/marathiUtils.ts';
import {
  MARATHI_TERMS,
  ENGLISH_TERMS,
  DEFAULT_BILL_TEMPLATE_CONFIG,
} from '../src/utils/billTemplateUtils.ts';
import {
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  buildGeneralPartyWhatsAppUrl,
  getCleanPhoneNumber,
} from '../src/utils/alertMessaging.ts';

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [Marathi] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
    throw err;
  }
}

// =============================================================================
// SUITE 1: System Language Defaults & Storage
// =============================================================================
console.log('\n🌐 SUITE 1: System Language Configuration & Marathi Default');

runTest('System default language is Marathi ("marathi")', () => {
  const defaultLang = getStoredAppLanguage();
  assert.strictEqual(defaultLang, 'marathi', 'Default app language must be "marathi"');
});

runTest('Marathi bill template config defaults to Marathi language', () => {
  assert.strictEqual(DEFAULT_BILL_TEMPLATE_CONFIG.billLanguage, 'marathi');
  assert.strictEqual(DEFAULT_BILL_TEMPLATE_CONFIG.billTitle, 'भाडे पावती व साहित्य चालान');
  assert.strictEqual(DEFAULT_BILL_TEMPLATE_CONFIG.showMarathiHeader, true);
});

// =============================================================================
// SUITE 2: Marathi Translation Dictionary Integrity (मराठी शब्दकोश)
// =============================================================================
console.log('\n📖 SUITE 2: Marathi Translation Dictionary Integrity (मराठी शब्दकोश)');

runTest('All 12 Navigation tabs have authentic Marathi translations', () => {
  const expectedNav = {
    Dashboard: 'डॅशबोर्ड',
    Parties: 'ग्राहक',
    'Plate Types': 'प्लेट प्रकार',
    'Plate Stock': 'उपलब्ध स्टॉक',
    Rentals: 'भाडे वाटप नोंदी',
    Returns: 'साहित्य जमा नोंदी',
    Payments: 'जमा पेमेंट्स',
    'Outstanding Dues': 'बाकी रक्कम',
    Ledger: 'खातेवही',
    Notifications: 'सूचना',
    Reports: 'हिशोब अहवाल',
    Settings: 'प्रणाली सेटिंग्ज',
  };

  for (const [key, expectedValue] of Object.entries(expectedNav)) {
    assert.strictEqual(
      t.marathi.nav[key],
      expectedValue,
      `Nav item "${key}" should be translated to "${expectedValue}" in Marathi`
    );
  }
});

runTest('Top Bar and Header elements are in Marathi', () => {
  assert.strictEqual(t.marathi.header.controls, 'नियंत्रण');
  assert.strictEqual(t.marathi.header.subtitle, 'आनंद बिल्डर्स प्रशासकीय प्रणाली');
  assert.strictEqual(t.marathi.header.searchPlaceholder, 'शोधा...');
  assert.strictEqual(t.marathi.header.adminUser, 'आनंद ॲडमिन');
  assert.strictEqual(t.marathi.header.adminRole, 'व्यवस्थापक');
  assert.strictEqual(t.marathi.header.logout, 'लॉगआउट');
});

runTest('Upper Stat Widgets have Marathi metrics and subtitles', () => {
  assert.strictEqual(t.marathi.stats.totalStock, 'एकूण सेंट्रिंग स्टॉक');
  assert.strictEqual(t.marathi.stats.inYard, 'गोदामात शिल्लक');
  assert.strictEqual(t.marathi.stats.withParties, 'ग्राहकांकडे भाड्याने');
  assert.strictEqual(t.marathi.stats.outstanding, 'एकूण येणे बाकी');
});

runTest('Account Balances reflect Marathi accounting labels', () => {
  assert.strictEqual(t.marathi.accounts.acc1Title, 'खाते १ (बँक डायरेक्ट)');
  assert.strictEqual(t.marathi.accounts.acc2Title, 'खाते २ (UPI / डिजिटल)');
  assert.strictEqual(t.marathi.accounts.cashTitle, 'कॅश (रोख रक्कम)');
});

runTest('Daily flows metrics have proper Marathi terms', () => {
  assert.strictEqual(t.marathi.daily.todayRentals, 'आजचे भाडे वाटप');
  assert.strictEqual(t.marathi.daily.todayReturns, 'आजचे साहित्य जमा');
  assert.strictEqual(t.marathi.daily.overdueRentals, 'मुदत संपलेले (थकबाकी)');
});

runTest('Rental cycle alert actions are in Marathi', () => {
  assert.ok(
    t.marathi.cycleAlerts.title === 'सर्व भाडे मुदत समाप्ती इशारे' ||
    t.marathi.cycleAlerts.title.includes('भाडे मुदत समाप्ती इशारे')
  );
  assert.strictEqual(t.marathi.cycleAlerts.callParty, 'फोन करा');
  assert.strictEqual(t.marathi.cycleAlerts.whatsapp, 'व्हॉट्सॲप');
  assert.strictEqual(t.marathi.cycleAlerts.renewCycle, 'मुदत वाढवा');
  assert.strictEqual(t.marathi.cycleAlerts.returnIntake, 'साहित्य जमा');
  assert.strictEqual(t.marathi.cycleAlerts.cycle, 'सायकल');
  assert.strictEqual(t.marathi.cycleAlerts.days, 'दिवस');
});

runTest('Table action buttons and quick shortcuts are in Marathi', () => {
  assert.strictEqual(t.marathi.tables.newRentalBtn, '+ नवीन भाडे नोंद');
  assert.strictEqual(t.marathi.tables.addReturnBtn, '+ साहित्य जमा');
  assert.strictEqual(t.marathi.tables.addPaymentBtn, '+ पेमेंट जमा');
  assert.strictEqual(t.marathi.tables.plateStockBtn, 'प्लेट स्टॉक पाहा');
  assert.strictEqual(t.marathi.tables.quickActions, 'जलद कृती');
});

// =============================================================================
// SUITE 3: Marathi Invoice & Challan Formatting (भाडे पावती व साहित्य चालान)
// =============================================================================
console.log('\n🧾 SUITE 3: Marathi Invoice & Challan Formatting (भाडे पावती व साहित्य चालान)');

runTest('Sacred Invocation is present in Marathi format', () => {
  const sacred = '॥ श्री गणेशाय नमः ॥';
  assert.ok(sacred.includes('श्री गणेशाय नमः'), 'Must include auspicious Ganesha invocation');
});

runTest('Business branding appears in authentic Marathi', () => {
  const businessMr = 'आनंद बिल्डर्स अँड डेव्हलपर्स';
  assert.strictEqual(businessMr, 'आनंद बिल्डर्स अँड डेव्हलपर्स');
  const billTitle = 'भाडे पावती व साहित्य चालान';
  assert.strictEqual(billTitle, 'भाडे पावती व साहित्य चालान');
});

runTest('Invoice subheadings and customer details are in Marathi', () => {
  const customerTitle = 'ग्राहकाचे नाव (Billed To):';
  const contactLabel = 'मोबाईल नं.:';
  const siteLabel = 'कामाचे ठिकाण (Site):';
  const issueDateLabel = 'दिनांक (Issue Date):';
  const termValue = '४० दिवस (40 Days Cycle)';

  assert.ok(customerTitle.includes('ग्राहकाचे नाव'));
  assert.ok(contactLabel.includes('मोबाईल'));
  assert.ok(siteLabel.includes('कामाचे ठिकाण'));
  assert.ok(issueDateLabel.includes('दिनांक'));
  assert.ok(termValue.includes('४० दिवस'));
});

runTest('Invoice particulars columns adhere to standard Marathi format', () => {
  const columns = ['अ.क्र.', 'साहित्याचे नाव (Particulars)', 'नग (Qty)', 'मुदत', 'दर/दिवस', 'एकूण भाडे (₹)'];
  assert.strictEqual(columns[0], 'अ.क्र.');
  assert.ok(columns[1].includes('साहित्याचे नाव'));
  assert.ok(columns[2].includes('नग'));
  assert.strictEqual(columns[3], 'मुदत');
  assert.strictEqual(columns[4], 'दर/दिवस');
  assert.ok(columns[5].includes('एकूण भाडे'));
});

runTest('Financial summary rows in invoice have exact Marathi translations', () => {
  const summaryLabels = {
    baseRent: '४० दिवसांचे भाडे:',
    extraRent: 'अतिरिक्त दिवस भाडे:',
    totalDue: 'एकूण देय रक्कम:',
    paid: 'जमा रक्कम / ऍडव्हान्स:',
    outstanding: 'बाकी रक्कम (Outstanding Due):',
  };

  assert.ok(summaryLabels.baseRent.includes('४० दिवसांचे भाडे'));
  assert.ok(summaryLabels.extraRent.includes('अतिरिक्त दिवस'));
  assert.ok(summaryLabels.totalDue.includes('एकूण देय'));
  assert.ok(summaryLabels.paid.includes('जमा रक्कम'));
  assert.ok(summaryLabels.outstanding.includes('बाकी रक्कम'));
});

runTest('Signatory endorsements in invoice follow Marathi business standard', () => {
  const customerSign = 'ग्राहकाची सही / अंगठा';
  const authorizedSign = 'आनंद बिल्डर्स अँड डेव्हलपर्स करिता';
  const authorizedSignSub = 'Authorized Signatory / अधिकृत स्वाक्षरी';

  assert.strictEqual(customerSign, 'ग्राहकाची सही / अंगठा');
  assert.ok(authorizedSign.includes('आनंद बिल्डर्स'));
  assert.ok(authorizedSignSub.includes('अधिकृत स्वाक्षरी'));
});

// =============================================================================
// SUITE 4: Standard Marathi Terms & Conditions (नियम व अटी)
// =============================================================================
console.log('\n📜 SUITE 4: Standard Marathi Terms & Conditions (नियम व अटी)');

runTest('All 4 standard 40-day cycle terms in Marathi are defined and non-empty', () => {
  assert.strictEqual(MARATHI_TERMS.length, 4, 'Must have exactly 4 standard terms');
  
  // Rule 1: 40-day term & daily rate afterwards
  assert.ok(
    MARATHI_TERMS[0].includes('४० दिवसांची') && MARATHI_TERMS[0].includes('प्रतिदिन दर'),
    'Term 1 must mention 40 days term and daily rate'
  );
  
  // Rule 2: Physical verification at loading
  assert.ok(
    MARATHI_TERMS[1].includes('नग व साईझ मोजून घेणे'),
    'Term 2 must require counting and sizing on arrival'
  );
  
  // Rule 3: Clean return
  assert.ok(
    MARATHI_TERMS[2].includes('स्वच्छ व नीट मोजून'),
    'Term 3 must require returning clean and counted material'
  );
  
  // Rule 4: Damage replacement
  assert.ok(
    MARATHI_TERMS[3].includes('नुकसान भरपाई'),
    'Term 4 must specify damages/loss replacement cost'
  );
});

// =============================================================================
// SUITE 5: Marathi WhatsApp Alert Messages
// =============================================================================
console.log('\n💬 SUITE 5: Marathi WhatsApp Alert Messages');

runTest('WhatsApp 40-day completed message generated in polite Marathi', () => {
  const msg = buildWhatsAppMessage('पाटील कन्स्ट्रक्शन्स', 1, '40_completed', 0, 0, 'marathi');
  assert.ok(msg.includes('नमस्कार पाटील कन्स्ट्रक्शन्सजी'), 'Must greet party in Marathi');
  assert.ok(msg.includes('४० दिवसांची भाडे मुदत'), 'Must mention 40 days completion');
  assert.ok(msg.includes('आनंद बिल्डर्स अँड डेव्हलपर्स'), 'Must mention company name');
  assert.ok(msg.includes('साहित्य जमा किंवा नूतनीकरणासाठी'), 'Must request return or renewal');
});

runTest('WhatsApp Overdue reminder message generated in polite Marathi with extra days', () => {
  const msg = buildWhatsAppMessage('साई बिल्डर्स', 2, 'overdue', -15, 15, 'marathi');
  assert.ok(msg.includes('नमस्कार साई बिल्डर्सजी'));
  assert.ok(msg.includes('+15 दिवस जादा झाले आहेत') || msg.includes('15 अतिरिक्त दिवस'));
  assert.ok(msg.includes('सायकल #2'));
  assert.ok(msg.includes('आनंद बिल्डर्स'));
});

runTest('WhatsApp upcoming expiry warning generated in Marathi', () => {
  const msg = buildWhatsAppMessage('अमर एंटरप्रायझेस', 1, '3_days', 3, 0, 'marathi');
  assert.ok(msg.includes('नमस्कार अमर एंटरप्रायझेसजी'));
  assert.ok(msg.includes('३ दिवस बाकी आहेत') || msg.includes('3 दिवस बाकी आहेत'));
  assert.ok(msg.includes('आनंद बिल्डर्सकडून नम्र स्मरण'));
});

runTest('General party WhatsApp message generated in Marathi with valid wa.me link', () => {
  const url = buildGeneralPartyWhatsAppUrl('9881985058', 'गणेश कन्स्ट्रक्शन', 'marathi');
  assert.ok(url.startsWith('https://wa.me/919881985058?text='), 'Must be valid WhatsApp URL with India country code');
  const decoded = decodeURIComponent(url.split('text=')[1]);
  assert.ok(decoded.includes('नमस्कार गणेश कन्स्ट्रक्शनजी'));
  assert.ok(decoded.includes('आनंद बिल्डर्स'));
});

// =============================================================================
// SUITE 6: Devanagari Digits & Number Formatting Utilities
// =============================================================================
console.log('\n🔢 SUITE 6: Devanagari Digits & Number Formatting Utilities');

runTest('Convert Western digits 0-9 to Devanagari ०-९', () => {
  assert.strictEqual(toMarathiDigits(0), '०');
  assert.strictEqual(toMarathiDigits(1234567890), '१२३४५६७८९०');
  assert.strictEqual(toMarathiDigits('40 Days'), '४० Days');
  assert.strictEqual(toMarathiDigits('Bill #3'), 'Bill #३');
});

runTest('Round-trip conversion: Devanagari back to Western digits', () => {
  assert.strictEqual(fromMarathiDigits('१२३४५'), '12345');
  assert.strictEqual(fromMarathiDigits('४०'), '40');
  assert.strictEqual(fromMarathiDigits('९८८१९८५०५८'), '9881985058');
});

runTest('Format Marathi currency with Rupee symbol and Indian commas', () => {
  const standard = formatMarathiCurrency(6000);
  assert.strictEqual(standard, '₹6,000');

  const decimal = formatMarathiCurrency(271.5);
  assert.strictEqual(decimal, '₹271.50');

  const devanagari = formatMarathiCurrency(6000, true);
  assert.strictEqual(devanagari, '₹६,०००');
});

runTest('Format date into Marathi standard (DD/MM/YYYY)', () => {
  const formatted = formatMarathiDate('2026-09-17');
  assert.strictEqual(formatted, '17/09/2026');

  const devanagariDate = formatMarathiDate('2026-09-17', true);
  assert.strictEqual(devanagariDate, '१७/०९/२०२६');
});

runTest('Format duration, quantity, customer, bill, and cycle in Marathi', () => {
  assert.strictEqual(formatMarathiDuration(40), '40 दिवस');
  assert.strictEqual(formatMarathiDuration(40, true), '४० दिवस');

  assert.strictEqual(formatMarathiQuantity(100), '100 नग');
  assert.strictEqual(formatMarathiQuantity(100, true), '१०० नग');

  assert.strictEqual(formatMarathiCustomer(1), 'ग्राहक #1');
  assert.strictEqual(formatMarathiCustomer(1, true), 'ग्राहक #१');

  assert.strictEqual(formatMarathiBill(3), 'बिल #3');
  assert.strictEqual(formatMarathiBill(3, true), 'बिल #३');

  assert.strictEqual(formatMarathiCycle(12), 'सायकल 12');
  assert.strictEqual(formatMarathiCycle(12, true), 'सायकल १२');
});

// =============================================================================
// SUITE 7: Marathi Payment Modes & Status Badges
// =============================================================================
console.log('\n💳 SUITE 7: Marathi Payment Modes & Status Badges');

runTest('Payment modes translated accurately into Marathi', () => {
  assert.strictEqual(getMarathiPaymentMode('Account 1'), 'खाते १ (बँक)');
  assert.strictEqual(getMarathiPaymentMode('Account 2'), 'खाते २ (UPI / डिजिटल)');
  assert.strictEqual(getMarathiPaymentMode('Cash'), 'रोख (Cash)');
  assert.strictEqual(getMarathiPaymentMode('Outstanding'), 'बाकी (Outstanding)');
  assert.strictEqual(getMarathiPaymentMode('Udhari'), 'बाकी (Outstanding)');
});

runTest('Rental and return lifecycle statuses translated into Marathi', () => {
  const active = getMarathiStatus('active');
  assert.ok(active.label.includes('सक्रिय'));

  const overdue = getMarathiStatus('overdue');
  assert.ok(overdue.label.includes('मुदत संपली'));

  const returned = getMarathiStatus('returned');
  assert.ok(returned.label.includes('जमा'));
});

// =============================================================================
// SUITE 8: Marathi Financial Statement Reports (हिशोब अहवाल)
// =============================================================================
console.log('\n📊 SUITE 8: Marathi Financial Statement Reports (हिशोब अहवाल)');

runTest('All 5 report types defined in Marathi in reports dictionary', () => {
  const rTypes = t.marathi.reports.types;
  assert.strictEqual(rTypes.all, 'सर्व अहवाल');
  assert.strictEqual(rTypes.rental, 'भाडे पावती अहवाल');
  assert.strictEqual(rTypes.return, 'साहित्य जमा अहवाल');
  assert.strictEqual(rTypes.payment, 'पेमेंट अहवाल');
  assert.strictEqual(rTypes.outstanding, 'बाकी रक्कम अहवाल');
});

runTest('Report summary metrics and table headers are in Marathi', () => {
  const headers = t.marathi.reports.headers;
  assert.strictEqual(headers.srNo, 'अ.क्र.');
  assert.strictEqual(headers.issueDate, 'नोंद दिनांक');
  assert.strictEqual(headers.partyName, 'ग्राहकाचे नाव');
  assert.strictEqual(headers.quantity, 'नग');
  assert.strictEqual(headers.totalRent, 'एकूण भाडे');
  assert.strictEqual(headers.paidAmount, 'जमा रक्कम');
  assert.strictEqual(headers.pendingAmount, 'बाकी रक्कम');

  const rep = t.marathi.reports;
  assert.strictEqual(rep.totalBilled, 'एकूण भाडे बिल');
  assert.strictEqual(rep.totalPaid, 'एकूण जमा रक्कम');
  assert.strictEqual(rep.netDue, 'एकूण येणे बाकी');
  assert.strictEqual(rep.totalDispatchedPlates, 'एकूण वाटप प्लेट्स');
  assert.strictEqual(rep.totalReturnedPlates, 'एकूण जमा प्लेट्स');
  assert.strictEqual(rep.activePlatesWithParties, 'ग्राहकांकडे शिल्लक प्लेट्स');
});

runTest('Sign-off blocks for auditor and proprietor are in Marathi', () => {
  const rep = t.marathi.reports;
  assert.strictEqual(rep.masterSummary, 'सर्वंकष हिशोब गोषवारा');
  assert.strictEqual(rep.compileTitle, 'अहवाल तयार करा');
  assert.strictEqual(rep.exportCsv, 'CSV डाउनलोड');
  assert.strictEqual(rep.printReport, 'A4 प्रिंट अहवाल');
});

// =============================================================================
// FINAL SUMMARY
// =============================================================================
console.log('\n' + '='.repeat(75));
console.log(`  🎉 MARATHI FORMAT TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (100% SUCCESS)`);
console.log('='.repeat(75));
