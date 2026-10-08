import assert from 'node:assert';
import {
  DEFAULT_BILL_TEMPLATE_CONFIG,
  getBillTemplateConfig,
  saveBillTemplateConfig,
  updatePaperFormatConfig,
  PAPER_SIZE_OPTIONS,
  PAPER_ORIENTATION_OPTIONS,
  PAPER_MARGIN_OPTIONS,
  BILL_COPY_TYPE_OPTIONS,
} from '../src/utils/billTemplateUtils.ts';

// Mock localStorage for node environment
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = String(value);
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
globalThis.window = {
  dispatchEvent: () => true,
};

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✅ [PaperFormatSettings] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [PaperFormatSettings] ${name}`);
    console.error(err);
  }
}

console.log('===========================================================================');
console.log('       BILL PAPER FORMAT & PRINT SETTINGS TEST SUITE');
console.log('===========================================================================');

console.log('\n📄 SUITE 1: Default Paper Format Configuration');

runTest('DEFAULT_BILL_TEMPLATE_CONFIG contains default paper format fields', () => {
  assert.strictEqual(DEFAULT_BILL_TEMPLATE_CONFIG.paperSize, 'a4');
  assert.strictEqual(DEFAULT_BILL_TEMPLATE_CONFIG.paperOrientation, 'portrait');
  assert.strictEqual(DEFAULT_BILL_TEMPLATE_CONFIG.paperMargin, 'normal');
  assert.strictEqual(DEFAULT_BILL_TEMPLATE_CONFIG.fitToSinglePage, true);
  assert.strictEqual(DEFAULT_BILL_TEMPLATE_CONFIG.billCopyType, 'none');
});

runTest('PAPER_SIZE_OPTIONS defines all 5 standard paper formats with dimensions', () => {
  assert.strictEqual(PAPER_SIZE_OPTIONS.length, 5);
  const ids = PAPER_SIZE_OPTIONS.map((o) => o.id);
  assert.ok(ids.includes('a4'));
  assert.ok(ids.includes('a5'));
  assert.ok(ids.includes('thermal_80'));
  assert.ok(ids.includes('thermal_58'));
  assert.ok(ids.includes('letter'));

  const a4Opt = PAPER_SIZE_OPTIONS.find((o) => o.id === 'a4');
  assert.strictEqual(a4Opt.dimensions, '210 × 297 mm');
  assert.ok(a4Opt.labelMr.includes('A4'));

  const a5Opt = PAPER_SIZE_OPTIONS.find((o) => o.id === 'a5');
  assert.strictEqual(a5Opt.dimensions, '148 × 210 mm');
  assert.ok(a5Opt.descriptionMr.includes('कागदाची बचत'));

  const t80Opt = PAPER_SIZE_OPTIONS.find((o) => o.id === 'thermal_80');
  assert.strictEqual(t80Opt.dimensions, '80 mm Roll');

  const t58Opt = PAPER_SIZE_OPTIONS.find((o) => o.id === 'thermal_58');
  assert.strictEqual(t58Opt.dimensions, '58 mm Roll');
});

runTest('PAPER_ORIENTATION_OPTIONS supports portrait and landscape', () => {
  assert.strictEqual(PAPER_ORIENTATION_OPTIONS.length, 2);
  const ids = PAPER_ORIENTATION_OPTIONS.map((o) => o.id);
  assert.deepStrictEqual(ids, ['portrait', 'landscape']);
});

runTest('PAPER_MARGIN_OPTIONS supports compact, normal, wide margins', () => {
  assert.strictEqual(PAPER_MARGIN_OPTIONS.length, 3);
  const ids = PAPER_MARGIN_OPTIONS.map((o) => o.id);
  assert.deepStrictEqual(ids, ['compact', 'normal', 'wide']);
});

runTest('BILL_COPY_TYPE_OPTIONS contains none, original, duplicate, office, triplicate', () => {
  assert.strictEqual(BILL_COPY_TYPE_OPTIONS.length, 5);
  const ids = BILL_COPY_TYPE_OPTIONS.map((o) => o.id);
  assert.ok(ids.includes('none'));
  assert.ok(ids.includes('original'));
  assert.ok(ids.includes('duplicate'));
  assert.ok(ids.includes('office'));
  assert.ok(ids.includes('triplicate'));
});

console.log('\n💾 SUITE 2: Paper Format Persistence & Storage Retrieval');

runTest('getBillTemplateConfig returns defaults when storage is empty', () => {
  localStorageMock.clear();
  const cfg = getBillTemplateConfig();
  assert.strictEqual(cfg.paperSize, 'a4');
  assert.strictEqual(cfg.paperOrientation, 'portrait');
  assert.strictEqual(cfg.paperMargin, 'normal');
  assert.strictEqual(cfg.fitToSinglePage, true);
  assert.strictEqual(cfg.billCopyType, 'none');
});

runTest('saveBillTemplateConfig persists custom paper format options', () => {
  localStorageMock.clear();
  const customConfig = {
    ...DEFAULT_BILL_TEMPLATE_CONFIG,
    paperSize: 'a5',
    paperOrientation: 'landscape',
    paperMargin: 'compact',
    fitToSinglePage: true,
    billCopyType: 'original',
  };
  saveBillTemplateConfig(customConfig);

  const retrieved = getBillTemplateConfig();
  assert.strictEqual(retrieved.paperSize, 'a5');
  assert.strictEqual(retrieved.paperOrientation, 'landscape');
  assert.strictEqual(retrieved.paperMargin, 'compact');
  assert.strictEqual(retrieved.fitToSinglePage, true);
  assert.strictEqual(retrieved.billCopyType, 'original');
});

runTest('updatePaperFormatConfig partially updates paper format settings', () => {
  localStorageMock.clear();
  updatePaperFormatConfig({
    paperSize: 'thermal_80',
    billCopyType: 'office',
  });

  const retrieved = getBillTemplateConfig();
  assert.strictEqual(retrieved.paperSize, 'thermal_80');
  assert.strictEqual(retrieved.billCopyType, 'office');
  // other defaults remain preserved
  assert.strictEqual(retrieved.paperOrientation, 'portrait');
  assert.strictEqual(retrieved.paperMargin, 'normal');
});

runTest('getBillTemplateConfig handles legacy or unknown paper formats gracefully', () => {
  localStorageMock.clear();
  localStorageMock.setItem(
    'anand_bill_template_config',
    JSON.stringify({
      paperSize: 'unknown_size',
      paperOrientation: 'diagonal',
      paperMargin: 'huge',
      billCopyType: 'invalid_copy',
    })
  );

  const retrieved = getBillTemplateConfig();
  assert.strictEqual(retrieved.paperSize, 'a4');
  assert.strictEqual(retrieved.paperOrientation, 'portrait');
  assert.strictEqual(retrieved.paperMargin, 'normal');
  assert.strictEqual(retrieved.billCopyType, 'none');
});

console.log('===========================================================================');
console.log(`  🎉 SUMMARY: ALL ${passed} / ${total} BILL PAPER FORMAT TESTS PASSED`);
console.log('===========================================================================');

if (passed !== total) {
  process.exit(1);
}
