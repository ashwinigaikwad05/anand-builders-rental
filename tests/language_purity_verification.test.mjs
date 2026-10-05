import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('===========================================================================');
console.log('       PURE LANGUAGE VERIFICATION TEST SUITE (ENGLISH vs MARATHI)');
console.log('===========================================================================');

let testsPassed = 0;
let testsFailed = 0;

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`  ✅ [PASS] ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
    testsFailed++;
  }
}

const devanagariRegex = /[\u0900-\u097F]/;
const latinRegex = /[a-zA-Z]/;

async function main() {
  // =============================================================================
  // TEST SUITE 1: marathiUtils.ts Purity (Payment Modes & Statuses)
  // =============================================================================
  console.log('\n🌐 SUITE 1: marathiUtils Language Modes');

  await runTest('getMarathiPaymentMode returns pure Marathi in marathi mode', async () => {
    const { getMarathiPaymentMode } = await import('../src/utils/marathiUtils.ts');
    const modes = ['Cash', 'Account 1', 'Account 2', 'Cheque', 'Outstanding', ''];
    modes.forEach(mode => {
      const res = getMarathiPaymentMode(mode, 'marathi');
      assert.ok(devanagariRegex.test(res), `Mode "${mode}" in Marathi must contain Devanagari text, got "${res}"`);
      assert.ok(!res.includes('(Cash)'), `Mode "${mode}" should not contain (Cash)`);
      assert.ok(!res.includes('(Bank Direct)'), `Mode "${mode}" should not contain (Bank Direct)`);
      assert.ok(!res.includes('(Outstanding)'), `Mode "${mode}" should not contain (Outstanding)`);
    });
  });

  await runTest('getMarathiPaymentMode returns pure English in english mode', async () => {
    const { getMarathiPaymentMode } = await import('../src/utils/marathiUtils.ts');
    const modes = ['Cash', 'Account 1', 'Account 2', 'Cheque', 'Outstanding'];
    modes.forEach(mode => {
      const res = getMarathiPaymentMode(mode, 'english');
      assert.ok(!devanagariRegex.test(res), `Mode "${mode}" in English must have NO Devanagari, got "${res}"`);
      assert.ok(latinRegex.test(res), `Mode "${mode}" in English must contain English text, got "${res}"`);
    });
  });

  await runTest('getMarathiStatus returns pure Marathi in marathi mode and pure English in english mode', async () => {
    const { getMarathiStatus } = await import('../src/utils/marathiUtils.ts');
    const statuses = ['active', 'overdue', 'returned'];

    // Marathi Mode
    statuses.forEach(s => {
      const mrRes = getMarathiStatus(s, 'marathi');
      assert.ok(devanagariRegex.test(mrRes.label), `Status "${s}" in Marathi must be Devanagari, got "${mrRes.label}"`);
      assert.ok(!latinRegex.test(mrRes.label), `Status "${s}" in Marathi must have NO English words, got "${mrRes.label}"`);
    });

    // English Mode
    statuses.forEach(s => {
      const enRes = getMarathiStatus(s, 'english');
      assert.ok(!devanagariRegex.test(enRes.label), `Status "${s}" in English must have NO Devanagari, got "${enRes.label}"`);
      assert.ok(latinRegex.test(enRes.label), `Status "${s}" in English must be English, got "${enRes.label}"`);
    });
  });

  // =============================================================================
  // TEST SUITE 2: appTranslations.ts Dictionary Language Segregation
  // =============================================================================
  console.log('\n📖 SUITE 2: appTranslations Dictionary Segregation');

  await runTest('English dictionary has ZERO Devanagari characters across all keys', async () => {
    const { t } = await import('../src/utils/appTranslations.ts');
    const enDict = t.english;

    function checkObject(obj, currentPath = '') {
      for (const [key, val] of Object.entries(obj)) {
        const fullPath = currentPath ? `${currentPath}.${key}` : key;
        if (typeof val === 'string') {
          assert.ok(
            !devanagariRegex.test(val),
            `English dictionary at "${fullPath}" must have NO Devanagari, found "${val}"`
          );
        } else if (typeof val === 'object' && val !== null) {
          checkObject(val, fullPath);
        }
      }
    }

    checkObject(enDict, 'english');
  });

  await runTest('Marathi dictionary has NO hybrid parenthetical English translations', async () => {
    const { t } = await import('../src/utils/appTranslations.ts');
    const mrDict = t.marathi;

    const forbiddenHybrids = [
      'Marathi',
      'Active',
      'Overdue',
      'Returned',
      'Cash',
      'Bank Direct',
      'Outstanding',
      'Serial',
    ];

    function checkObject(obj, currentPath = '') {
      for (const [key, val] of Object.entries(obj)) {
        const fullPath = currentPath ? `${currentPath}.${key}` : key;
        if (typeof val === 'string') {
          forbiddenHybrids.forEach(hybrid => {
            assert.ok(
              !val.includes(`(${hybrid})`),
              `Marathi dictionary at "${fullPath}" contains forbidden hybrid "(${hybrid})": "${val}"`
            );
          });
        } else if (typeof val === 'object' && val !== null) {
          checkObject(val, fullPath);
        }
      }
    }

    checkObject(mrDict, 'marathi');
  });

  // =============================================================================
  // TEST SUITE 3: billTemplateUtils.ts Language Separation
  // =============================================================================
  console.log('\n🧾 SUITE 3: billTemplateUtils Language Separation');

  await runTest('Marathi Bill Template defaults to pure Marathi without bilingual text', async () => {
    const { DEFAULT_BILL_TEMPLATE_CONFIG, MARATHI_TERMS } = await import('../src/utils/billTemplateUtils.ts');
    assert.strictEqual(DEFAULT_BILL_TEMPLATE_CONFIG.billLanguage, 'marathi');
    assert.ok(devanagariRegex.test(DEFAULT_BILL_TEMPLATE_CONFIG.billTitle));
    assert.ok(!DEFAULT_BILL_TEMPLATE_CONFIG.billTitle.includes('(Bilingual)'));
    assert.ok(!DEFAULT_BILL_TEMPLATE_CONFIG.signatoryTitle.includes('Authorized Signatory'));
    MARATHI_TERMS.forEach((term, idx) => {
      assert.ok(devanagariRegex.test(term), `Marathi term #${idx + 1} must be in Marathi`);
      assert.ok(!term.includes('(Days)'), `Marathi term #${idx + 1} must not contain (Days)`);
    });
  });

  await runTest('English Bill Terms have pure English without Devanagari text', async () => {
    const { ENGLISH_TERMS } = await import('../src/utils/billTemplateUtils.ts');
    ENGLISH_TERMS.forEach((term, idx) => {
      assert.ok(!devanagariRegex.test(term), `English term #${idx + 1} must have NO Devanagari: "${term}"`);
      assert.ok(latinRegex.test(term), `English term #${idx + 1} must contain English`);
    });
  });

  // =============================================================================
  // TEST SUITE 4: Source Code Scan for Forbidden Bilingual Hybrids
  // =============================================================================
  console.log('\n🔎 SUITE 4: Codebase Scan for Forbidden Bilingual Strings');

  const forbiddenStringPatterns = [
    /'मराठी \(Marathi\)'/,
    /"मराठी \(Marathi\)"/,
    /'सक्रिय \(Active\)'/,
    /"सक्रिय \(Active\)"/,
    /'मुदत संपली \(Overdue\)'/,
    /"मुदत संपली \(Overdue\)"/,
    /'साहित्य जमा \(Returned\)'/,
    /"साहित्य जमा \(Returned\)"/,
    /'Cash \(रोख\)'/,
    /"Cash \(रोख\)"/,
    /'Confirm Plate Return \/ साहित्य वापसी पुष्टी करा'/,
    /'Review \/ मागे जा'/,
    /'Penalty \/ दंड/,
    /'Plate Type Settings \(प्लेट प्रकार\)'/,
    /'\+ Add Plate Size \(नवीन साईझ जोडा\)'/,
    /'Simple Bill \(साधे बिल\)'/,
    /'उजेड \(Brightness\)'/,
    /'कॉन्ट्रास्ट \(Contrast\)'/,
    /'पुन्हा काढा \(Retake\)'/,
    /'अपलोड करा \(Save & Use\)'/,
    /Edit Bill Number \/ बिल नंबर बदला/,
    /बिल नंबर बदला \(Edit Bill Number\)/,
    /एकूण येणे बाकी तपशील \(Outstanding Dues\)/,
    /सर्व डेटा पूर्णपणे पुसून टाका \(Factory Reset\)/,
    /Google Drive बॅकअप \(Backup & Restore\)/,
    /सक्रिय \(ACTIVE\)/,
    /अक्रिय \(INACTIVE\)/,
    /बंद \(OFF\)/,
    /Drive चाचणी स्थिती \(Test Status\)/,
    /Google Drive खाते जोडा \(Connect\)/,
    /आता बॅकअप घ्या \(Back Up Now\)/,
    /कनेक्शन तपासा \(Test\)/,
    /खाते बदला \(Change\)/,
    /डिस्कनेक्ट \(Disconnect\)/,
    /सध्याचा डेटा ठेवा \(Keep current data\)/,
    /बॅकअप निवडा व रिस्टोअर करा \(Choose backup\)/,
    /Select Language \/ भाषा निवडा/,
  ];

  function walkDir(dir) {
    let files = [];
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const full = path.join(dir, entry);
      const st = fs.statSync(full);
      if (st.isDirectory()) {
        files = files.concat(walkDir(full));
      } else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) {
        files.push(full);
      }
    }
    return files;
  }

  const srcFiles = walkDir(path.join(rootDir, 'src/components/admin'));

  await runTest('Zero occurrences of forbidden hybrid bilingual strings in Admin components', () => {
    const violations = [];
    srcFiles.forEach(f => {
      const text = fs.readFileSync(f, 'utf8');
      forbiddenStringPatterns.forEach(pattern => {
        if (pattern.test(text)) {
          violations.push(`${path.basename(f)} matches forbidden pattern: ${pattern}`);
        }
      });
    });

    if (violations.length > 0) {
      throw new Error(`Found ${violations.length} hybrid bilingual strings:\n  ` + violations.join('\n  '));
    }
    assert.strictEqual(violations.length, 0);
  });

  // =============================================================================
  // SUMMARY
  // =============================================================================
  console.log('\n===========================================================================');
  if (testsFailed === 0) {
    console.log(`  🎉 ALL ${testsPassed} LANGUAGE PURITY TESTS PASSED! (100% SUCCESS)`);
  } else {
    console.log(`  ❌ ${testsFailed} TESTS FAILED, ${testsPassed} passed.`);
    process.exit(1);
  }
  console.log('===========================================================================\n');
}

main();
