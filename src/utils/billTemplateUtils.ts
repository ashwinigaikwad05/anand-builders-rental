export type BillTemplateStyle = 'simple' | 'standard' | 'tax_invoice' | 'compact';
export type BillLanguage = 'marathi' | 'english';

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
    const defaultSignatory = billLang === 'english' ? 'Authorized Signatory' : 'अधिकृत स्वाक्षरी';
    const rawSignatory = parsed.signatoryTitle || '';
    const isBilingualSignatory =
      rawSignatory.includes('/') ||
      rawSignatory === 'Authorized Signatory / अधिकृत स्वाक्षरी' ||
      rawSignatory === 'Authorized Signatory / Stamp' ||
      rawSignatory === 'अधिकृत स्वाक्षरी / शिक्का';
    const signatoryTitle = (!isBilingualSignatory && rawSignatory.trim()) ? rawSignatory : defaultSignatory;
    return {
      ...DEFAULT_BILL_TEMPLATE_CONFIG,
      ...parsed,
      printTermsAndConditions,
      showKycDocuments,
      signatoryTitle,
      billLanguage: billLang,
      termsAndConditions: Array.isArray(parsed.termsAndConditions)
        ? parsed.termsAndConditions
        : (billLang === 'english' ? ENGLISH_TERMS : MARATHI_TERMS),
    };
  } catch {
    return DEFAULT_BILL_TEMPLATE_CONFIG;
  }
}

export function saveBillTemplateConfig(config: BillTemplateConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save bill template config:', err);
  }
}
