export type BillTemplateStyle = 'simple' | 'standard' | 'tax_invoice' | 'compact';
export type BillLanguage = 'marathi' | 'english';
export type BillPaperSize = 'a4' | 'a5' | 'thermal_80' | 'thermal_58' | 'letter';
export type BillPaperOrientation = 'portrait' | 'landscape';
export type BillPaperMargin = 'compact' | 'normal' | 'wide';
export type BillCopyType = 'none' | 'original' | 'duplicate' | 'office' | 'triplicate';

export interface PaperSizeOption {
  id: BillPaperSize;
  labelMr: string;
  labelEn: string;
  descriptionMr: string;
  descriptionEn: string;
  dimensions: string;
}

export const PAPER_SIZE_OPTIONS: PaperSizeOption[] = [
  {
    id: 'a4',
    labelMr: 'A4 साईझ (मानक)',
    labelEn: 'A4 Size (Standard)',
    descriptionMr: 'पूर्ण पान, ऑफिशियल कर बीजक आणि विस्तृत चालानसाठी सर्वोत्तम',
    descriptionEn: 'Full sheet, best for formal tax invoices and detailed challans',
    dimensions: '210 × 297 mm',
  },
  {
    id: 'a5',
    labelMr: 'A5 साईझ (अर्धे पान)',
    labelEn: 'A5 Size (Half Page)',
    descriptionMr: '५०% कागदाची बचत. सुटसुटीत पावती व डिलिव्हरी चालानसाठी लोकप्रिय',
    descriptionEn: 'Saves 50% paper. Ideal for counter delivery receipts & compact challans',
    dimensions: '148 × 210 mm',
  },
  {
    id: 'thermal_80',
    labelMr: 'थर्मल ८० मिमी (३ इंच)',
    labelEn: 'Thermal 80mm (3-Inch)',
    descriptionMr: '३ इंच पीओएस प्रिंटर. यार्डावरील त्वरित पावती व गेटपाससाठी',
    descriptionEn: '3-inch POS printer roll. Ideal for rapid yard receipts & gate passes',
    dimensions: '80 mm Roll',
  },
  {
    id: 'thermal_58',
    labelMr: 'थर्मल ५८ मिमी (२ इंच)',
    labelEn: 'Thermal 58mm (2-Inch)',
    descriptionMr: '२ इंच मिनी ब्लूटूथ प्रिंटर. मोबाईलवरून साइटवर प्रिंटिंगसाठी',
    descriptionEn: '2-inch mini portable Bluetooth printer. On-site mobile printing',
    dimensions: '58 mm Roll',
  },
  {
    id: 'letter',
    labelMr: 'लेटर साईझ (Letter)',
    labelEn: 'Letter Size (8.5 × 11 in)',
    descriptionMr: 'मानक ऑफिस लेटर कागद साईझ',
    descriptionEn: 'Standard office letter paper size',
    dimensions: '216 × 279 mm',
  },
];

export const PAPER_ORIENTATION_OPTIONS = [
  { id: 'portrait' as const, labelMr: 'उभा (Portrait)', labelEn: 'Portrait (Vertical)' },
  { id: 'landscape' as const, labelMr: 'आडवा (Landscape)', labelEn: 'Landscape (Horizontal)' },
];

export const PAPER_MARGIN_OPTIONS = [
  { id: 'compact' as const, labelMr: 'कमी समास (३ मिमी)', labelEn: 'Compact (3mm)' },
  { id: 'normal' as const, labelMr: 'मध्यम समास (६ मिमी)', labelEn: 'Normal (6mm)' },
  { id: 'wide' as const, labelMr: 'मोठा समास (१२ मिमी)', labelEn: 'Wide (12mm)' },
];

export const BILL_COPY_TYPE_OPTIONS = [
  { id: 'none' as const, labelMr: 'काही नाही (नॉर्मल)', labelEn: 'None (Standard)' },
  { id: 'original' as const, labelMr: 'मूळ प्रत (Original Copy)', labelEn: 'Original Copy' },
  { id: 'duplicate' as const, labelMr: 'दुसरी प्रत (Duplicate Copy)', labelEn: 'Duplicate Copy' },
  { id: 'office' as const, labelMr: 'कार्यालयीन प्रत (Office Copy)', labelEn: 'Office Copy' },
  { id: 'triplicate' as const, labelMr: 'तिसरी प्रत (Triplicate Copy)', labelEn: 'Triplicate Copy' },
];

export interface BillTemplateConfig {
  templateStyle: BillTemplateStyle;
  billLanguage: BillLanguage;
  billTitle: string;
  billPrefix: string;
  gstNumber: string;
  showBankDetails: boolean;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  termsAndConditions: string[];
  printTermsAndConditions: boolean;
  signatoryTitle: string;
  showMarathiHeader: boolean;
  showLastPayment: boolean;
  showKycDocuments?: boolean;
  // Paper Format & Printing Settings
  paperSize?: BillPaperSize;
  paperOrientation?: BillPaperOrientation;
  paperMargin?: BillPaperMargin;
  fitToSinglePage?: boolean;
  billCopyType?: BillCopyType;
}

export const MARATHI_TERMS = [
  'भाड्याची मुदत ४० दिवसांची राहील. ४० दिवसांनंतर प्रतिदिन दर लागू राहील.',
  'साहित्य पोहोचल्यावर नग व साईझ मोजून घेणे.',
  'साहित्य परत आणताना स्वच्छ व नीट मोजून द्यावे.',
  'साहित्य तुटल्यास, वाकल्यास अथवा हरवल्यास चालू बाजारभावाप्रमाणे नुकसान भरपाई आकारली जाईल.',
];

export const ENGLISH_TERMS = [
  'Standard rental billing is for 40 days per cycle. Daily rent continues after 40 days until material is returned.',
  'Customer must physically verify plate counts and dimensions at the time of delivery/loading.',
  'Material must be returned clean, concrete-free, and in good condition.',
  'Any damaged, bent, or missing shuttering plates will be charged at current replacement cost.',
];

export const DEFAULT_BILL_TEMPLATE_CONFIG: BillTemplateConfig = {
  templateStyle: 'simple',
  billLanguage: 'marathi',
  billTitle: 'भाडे पावती व साहित्य चालान',
  billPrefix: 'AB-BILL-',
  gstNumber: '',
  showBankDetails: true,
  bankName: 'State Bank of India',
  accountNumber: '39482910482',
  ifscCode: 'SBIN0001234',
  upiId: 'anandbuilders@upi',
  termsAndConditions: MARATHI_TERMS,
  printTermsAndConditions: true,
  signatoryTitle: 'अधिकृत स्वाक्षरी',
  showMarathiHeader: true,
  showLastPayment: true,
  showKycDocuments: false,
  paperSize: 'a4',
  paperOrientation: 'portrait',
  paperMargin: 'normal',
  fitToSinglePage: true,
  billCopyType: 'none',
};

const STORAGE_KEY = 'anand_bill_template_config';

export function getBillTemplateConfig(): BillTemplateConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BILL_TEMPLATE_CONFIG;
    const parsed = JSON.parse(raw);
    const billLang: BillLanguage = parsed.billLanguage === 'english' ? 'english' : 'marathi';
    const printTermsAndConditions = parsed.printTermsAndConditions !== undefined
      ? Boolean(parsed.printTermsAndConditions)
      : true;
    const showKycDocuments = parsed.showKycDocuments !== undefined
      ? Boolean(parsed.showKycDocuments)
      : false;
    const defaultTitle = billLang === 'english' ? 'RENTAL BILL & CHALLAN' : 'भाडे पावती व साहित्य चालान';
    const rawTitle = parsed.billTitle || '';
    const isBilingualTitle =
      rawTitle.includes('/') ||
      (/[a-zA-Z]/.test(rawTitle) && /[\u0900-\u097F]/.test(rawTitle));
    const billTitle = (!isBilingualTitle && rawTitle.trim()) ? rawTitle : defaultTitle;

    const defaultSignatory = billLang === 'english' ? 'Authorized Signatory' : 'अधिकृत स्वाक्षरी';
    const rawSignatory = parsed.signatoryTitle || '';
    const isBilingualSignatory =
      rawSignatory.includes('/') ||
      rawSignatory === 'Authorized Signatory / अधिकृत स्वाक्षरी' ||
      rawSignatory === 'Authorized Signatory / Stamp' ||
      rawSignatory === 'अधिकृत स्वाक्षरी / शिक्का';
    const signatoryTitle = (!isBilingualSignatory && rawSignatory.trim()) ? rawSignatory : defaultSignatory;

    const rawTerms = Array.isArray(parsed.termsAndConditions)
      ? parsed.termsAndConditions.filter((t: any) => typeof t === 'string' && t.trim().length > 0)
      : [];
    const termsAndConditions = rawTerms.length > 0
      ? rawTerms
      : (billLang === 'english' ? ENGLISH_TERMS : MARATHI_TERMS);

    const showBankDetails = parsed.showBankDetails !== undefined
      ? Boolean(parsed.showBankDetails)
      : true;
    const bankName = parsed.bankName !== undefined && typeof parsed.bankName === 'string'
      ? parsed.bankName
      : DEFAULT_BILL_TEMPLATE_CONFIG.bankName;
    const accountNumber = parsed.accountNumber !== undefined && typeof parsed.accountNumber === 'string'
      ? parsed.accountNumber
      : DEFAULT_BILL_TEMPLATE_CONFIG.accountNumber;
    const ifscCode = parsed.ifscCode !== undefined && typeof parsed.ifscCode === 'string'
      ? parsed.ifscCode
      : DEFAULT_BILL_TEMPLATE_CONFIG.ifscCode;
    const upiId = parsed.upiId !== undefined && typeof parsed.upiId === 'string'
      ? parsed.upiId
      : DEFAULT_BILL_TEMPLATE_CONFIG.upiId;

    const paperSize: BillPaperSize = ['a4', 'a5', 'thermal_80', 'thermal_58', 'letter'].includes(parsed.paperSize)
      ? parsed.paperSize
      : 'a4';
    const paperOrientation: BillPaperOrientation = parsed.paperOrientation === 'landscape'
      ? 'landscape'
      : 'portrait';
    const paperMargin: BillPaperMargin = ['compact', 'normal', 'wide'].includes(parsed.paperMargin)
      ? parsed.paperMargin
      : 'normal';
    const fitToSinglePage = parsed.fitToSinglePage !== undefined
      ? Boolean(parsed.fitToSinglePage)
      : true;
    const billCopyType: BillCopyType = ['none', 'original', 'duplicate', 'office', 'triplicate'].includes(parsed.billCopyType)
      ? parsed.billCopyType
      : 'none';

    return {
      ...DEFAULT_BILL_TEMPLATE_CONFIG,
      ...parsed,
      printTermsAndConditions,
      showKycDocuments,
      showBankDetails,
      bankName,
      accountNumber,
      ifscCode,
      upiId,
      billTitle,
      signatoryTitle,
      billLanguage: billLang,
      termsAndConditions,
      paperSize,
      paperOrientation,
      paperMargin,
      fitToSinglePage,
      billCopyType,
    };
  } catch {
    return DEFAULT_BILL_TEMPLATE_CONFIG;
  }
}

export function saveBillTemplateConfig(config: BillTemplateConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    if (typeof window !== 'undefined') {
      if (config.bankName && config.bankName.trim()) {
        localStorage.setItem('anand_acc1_name', config.bankName.trim());
        window.dispatchEvent(new Event('anand_accounts_updated'));
      }
      window.dispatchEvent(new Event('anand_bill_config_updated'));
    }
  } catch (err) {
    console.error('Failed to save bill template config:', err);
  }
}

export function updateBankDetailsConfig(
  updates: Partial<Pick<BillTemplateConfig, 'bankName' | 'accountNumber' | 'ifscCode' | 'upiId' | 'showBankDetails'>>
): BillTemplateConfig {
  const current = getBillTemplateConfig();
  const updated: BillTemplateConfig = {
    ...current,
    ...updates,
  };
  saveBillTemplateConfig(updated);
  return updated;
}

export function updatePaperFormatConfig(
  updates: Partial<Pick<BillTemplateConfig, 'paperSize' | 'paperOrientation' | 'paperMargin' | 'fitToSinglePage' | 'billCopyType'>>
): BillTemplateConfig {
  const current = getBillTemplateConfig();
  const updated: BillTemplateConfig = {
    ...current,
    ...updates,
  };
  saveBillTemplateConfig(updated);
  return updated;
}

