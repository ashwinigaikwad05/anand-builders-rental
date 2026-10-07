import React, { useState, useEffect } from 'react';
import {
  Save,
  Award,
  User,
  FileText,
  Eye,
  Plus,
  Trash2,
  Landmark,
  CheckCircle2,
  Languages,
  Database,
  Download,
  Upload,
  ShieldAlert,
  Users,
  ClipboardList,
  DollarSign,
  Bell,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import {
  getBillTemplateConfig,
  saveBillTemplateConfig,
  MARATHI_TERMS,
  ENGLISH_TERMS,
  type BillTemplateConfig,
  type BillTemplateStyle,
  type BillLanguage,
} from '../../../utils/billTemplateUtils';
import { RentalBillModal } from '../modals/RentalBillModal';
import { DeleteDataConfirmModal, type DeleteDataCategory } from '../modals/DeleteDataConfirmModal';
import { GoogleDriveBackupSection } from '../GoogleDriveBackupSection';
import { getStoredAppLanguage, type AppLanguage } from '../../../utils/appTranslations';
import { cleanAccountName } from '../../../utils/paymentAccountUtils';
import type { Rental, Party, RentalCycle, Payment, ReturnLog } from '../../../data/adminMockData';

interface SettingsTabProps {
  rentals?: Rental[];
  parties?: Party[];
  rentalCycles?: RentalCycle[];
  payments?: Payment[];
  returns?: ReturnLog[];
  stockItems?: any[];
  plateSettings?: any[];
  ledger?: any[];
  notifications?: any[];
  onDeduplicate?: () => Promise<any>;
  onDeleteData?: (category: DeleteDataCategory) => Promise<void>;
  onLoadSampleData?: () => Promise<void>;
  onRestoreBackup?: (backupData: any) => Promise<void>;
  appLanguage?: AppLanguage;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  rentals = [],
  parties = [],
  rentalCycles = [],
  payments = [],
  returns = [],
  stockItems = [],
  plateSettings = [],
  ledger = [],
  notifications = [],
  onDeduplicate,
  onDeleteData,
  onLoadSampleData: _unusedOnLoadSampleData,
  onRestoreBackup,
  appLanguage,
}) => {
  // Business branding & parameters
  const [businessName, setBusinessName] = useState(() => localStorage.getItem('anand_business_name') || 'ANAND BUILDERS & DEVELOPERS');
  const [businessNameMr, setBusinessNameMr] = useState(() => localStorage.getItem('anand_business_name_mr') || 'आनंद बिल्डिंग मटेरियल सप्लायर');
  const [address, setAddress] = useState(() => localStorage.getItem('anand_business_address') || 'Near Old Bus Stand, Solapur Road');
  const [phones, setPhones] = useState(() => localStorage.getItem('anand_business_phones') || '7020914957, 9881985058, 9021519582');

  const [account1Name, setAccount1Name] = useState(() => {
    const raw = localStorage.getItem('anand_acc1_name');
    if (!raw) return 'State Bank of India';
    return cleanAccountName(raw, 'State Bank of India');
  });
  const [account2Name, setAccount2Name] = useState(() => {
    const raw = localStorage.getItem('anand_acc2_name');
    if (!raw) return 'PhonePe / UPI';
    return cleanAccountName(raw, 'PhonePe / UPI');
  });
  const [cashAccountName, setCashAccountName] = useState(() => {
    const saved = localStorage.getItem('anand_cash_name');
    if (!saved || saved === 'Cash (Yard Drawer)' || saved === 'Yard Drawer Cash') {
      return 'Cash';
    }
    return saved;
  });

  // Bill Template configurations
  const [billConfig, setBillConfig] = useState<BillTemplateConfig>(() => getBillTemplateConfig());
  const [newTermText, setNewTermText] = useState('');
  const [selectedPreviewRentalId, setSelectedPreviewRentalId] = useState<string>('latest');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isBankSaved, setIsBankSaved] = useState(false);
  const [isTermsSaved, setIsTermsSaved] = useState(false);

  useEffect(() => {
    // Sanitize any legacy prefixes in localStorage on mount
    const raw1 = localStorage.getItem('anand_acc1_name');
    const raw2 = localStorage.getItem('anand_acc2_name');
    if (raw1) {
      const clean1 = cleanAccountName(raw1, raw1);
      if (clean1 !== raw1) {
        localStorage.setItem('anand_acc1_name', clean1);
        setAccount1Name(clean1);
      }
    }
    if (raw2) {
      const clean2 = cleanAccountName(raw2, raw2);
      if (clean2 !== raw2) {
        localStorage.setItem('anand_acc2_name', clean2);
        setAccount2Name(clean2);
      }
    }
  }, []);

  // Data deletion & maintenance states
  const isMarathi = appLanguage ? appLanguage === 'marathi' : getStoredAppLanguage() === 'marathi';
  const [selectedDeleteCategory, setSelectedDeleteCategory] = useState<DeleteDataCategory | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeduplicating, setIsDeduplicating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleOpenDeleteModal = (category: DeleteDataCategory) => {
    setSelectedDeleteCategory(category);
    setIsDeleteModalOpen(true);
  };

  const getCurrentData = () => ({
    appName: businessName,
    appNameMarathi: businessNameMr,
    exportTimestamp: new Date().toISOString(),
    exportDateFormatted: new Date().toLocaleString(),
    stats: {
      totalRentals: rentals.length,
      totalCycles: rentalCycles.length,
      totalReturns: returns.length,
      totalPayments: payments.length,
      totalParties: parties.length,
      totalStock: stockItems.length,
    },
    rentals,
    rentalCycles,
    returns,
    payments,
    parties,
    stockItems,
    plateSettings,
    plateTypes: plateSettings,
    ledgerEntries: ledger,
    notifications,
    billConfig,
  });

  const handleDownloadBackup = () => {
    const backupData = getCurrentData();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `anand_plates_data_backup_${new Date().toISOString().split('T')[0]}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsRestoring(true);
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (onRestoreBackup) {
        await onRestoreBackup(parsed);
      }
    } catch (err: any) {
      alert(
        isMarathi
          ? 'बॅकअप फाइल वाचताना त्रुटी आली: ' + (err?.message || 'अवैध फाइल स्वरूप')
          : 'Error reading backup file: ' + (err?.message || 'Invalid format')
      );
    } finally {
      setIsRestoring(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRunDeduplication = async () => {
    if (!onDeduplicate) return;
    try {
      setIsDeduplicating(true);
      await onDeduplicate();
    } catch {
      // handled in AdminLayout with toast
    } finally {
      setIsDeduplicating(false);
    }
  };

  const handleUpdateTemplateStyle = (style: BillTemplateStyle) => {
    setBillConfig((prev) => ({
      ...prev,
      templateStyle: style,
    }));
  };

  const handleUpdateLanguage = (lang: BillLanguage) => {
    setBillConfig((prev) => {
      const defaultTitle =
        lang === 'marathi'
          ? 'भाडे पावती व साहित्य चालान'
          : 'RENTAL BILL & DELIVERY CHALLAN';
      const defaultSignatory =
        lang === 'marathi'
          ? 'अधिकृत स्वाक्षरी'
          : 'Authorized Signatory';
      const terms =
        prev.termsAndConditions && prev.termsAndConditions.length > 0
          ? prev.termsAndConditions
          : (lang === 'marathi' ? MARATHI_TERMS : ENGLISH_TERMS);
      return {
        ...prev,
        billLanguage: lang,
        billTitle: prev.billTitle || defaultTitle,
        termsAndConditions: terms,
        signatoryTitle: prev.signatoryTitle || defaultSignatory,
      };
    });
  };

  const handleAddTerm = () => {
    if (!newTermText.trim()) return;
    const termToAdd = newTermText.trim();
    setBillConfig((prev) => {
      const updatedTerms = [...prev.termsAndConditions, termToAdd];
      const updated = {
        ...prev,
        termsAndConditions: updatedTerms,
        printTermsAndConditions: true,
      };
      saveBillTemplateConfig(updated);
      return updated;
    });
    setNewTermText('');
    setIsTermsSaved(true);
    setTimeout(() => setIsTermsSaved(false), 3000);
  };

  const handleRemoveTerm = (index: number) => {
    setBillConfig((prev) => {
      const updatedTerms = prev.termsAndConditions.filter((_, i) => i !== index);
      const updated = {
        ...prev,
        termsAndConditions: updatedTerms,
      };
      saveBillTemplateConfig(updated);
      return updated;
    });
    setIsTermsSaved(true);
    setTimeout(() => setIsTermsSaved(false), 3000);
  };

  const handleUpdateTerm = (index: number, text: string) => {
    setBillConfig((prev) => {
      const updated = [...prev.termsAndConditions];
      updated[index] = text;
      const updatedCfg = {
        ...prev,
        termsAndConditions: updated,
      };
      saveBillTemplateConfig(updatedCfg);
      return updatedCfg;
    });
  };

  const handleSaveTerms = () => {
    saveBillTemplateConfig(billConfig);
    setIsTermsSaved(true);
    setTimeout(() => setIsTermsSaved(false), 3000);
  };

  const handleTogglePrintTerms = (checked: boolean) => {
    const updated = {
      ...billConfig,
      printTermsAndConditions: checked,
    };
    setBillConfig(updated);
    saveBillTemplateConfig(updated);
    setIsTermsSaved(true);
    setTimeout(() => setIsTermsSaved(false), 2500);
  };

  const handleResetDefaultTerms = (lang: 'marathi' | 'english') => {
    const defaultTerms = lang === 'marathi' ? MARATHI_TERMS : ENGLISH_TERMS;
    const updated = {
      ...billConfig,
      termsAndConditions: defaultTerms,
      printTermsAndConditions: true,
    };
    setBillConfig(updated);
    saveBillTemplateConfig(updated);
    setIsTermsSaved(true);
    setTimeout(() => setIsTermsSaved(false), 3000);
  };

  const handleSaveBankDetails = (updatedConfig?: BillTemplateConfig) => {
    const cfg = updatedConfig || billConfig;
    saveBillTemplateConfig(cfg);
    setIsBankSaved(true);
    setTimeout(() => {
      setIsBankSaved(false);
    }, 3000);
  };

  const handleAccount1Change = (val: string) => {
    setAccount1Name(val);
    localStorage.setItem('anand_acc1_name', val);
    // Auto-sync bankName in bill template so bills always have this bank name:
    const updated = {
      ...billConfig,
      bankName: val,
    };
    setBillConfig(updated);
    saveBillTemplateConfig(updated);
    window.dispatchEvent(new Event('anand_accounts_updated'));
  };

  const handleAccount2Change = (val: string) => {
    setAccount2Name(val);
    localStorage.setItem('anand_acc2_name', val);
    window.dispatchEvent(new Event('anand_accounts_updated'));
  };

  const handleCashAccountChange = (val: string) => {
    setCashAccountName(val);
    localStorage.setItem('anand_cash_name', val);
    window.dispatchEvent(new Event('anand_accounts_updated'));
  };

  const handleBankFieldChange = (
    field: 'bankName' | 'accountNumber' | 'ifscCode' | 'upiId' | 'showBankDetails',
    value: any
  ) => {
    const updated = {
      ...billConfig,
      [field]: value,
    };
    setBillConfig(updated);
    saveBillTemplateConfig(updated);
    if (field === 'bankName') {
      setAccount1Name(value);
      localStorage.setItem('anand_acc1_name', value);
      window.dispatchEvent(new Event('anand_accounts_updated'));
    }
  };

  const handleCopyAccount1ToBank = () => {
    const updated: BillTemplateConfig = {
      ...billConfig,
      bankName: account1Name || 'Main Bank',
    };
    setBillConfig(updated);
    handleSaveBankDetails(updated);
  };

  const handleClearBankDetails = () => {
    const updated: BillTemplateConfig = {
      ...billConfig,
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      upiId: '',
    };
    setBillConfig(updated);
    handleSaveBankDetails(updated);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    // Save business & parameters
    localStorage.setItem('anand_business_name', businessName);
    localStorage.setItem('anand_business_name_mr', businessNameMr);
    localStorage.setItem('anand_business_address', address);
    localStorage.setItem('anand_business_phones', phones);
    localStorage.setItem('anand_acc1_name', account1Name);
    localStorage.setItem('anand_acc2_name', account2Name);
    localStorage.setItem('anand_cash_name', cashAccountName);

    // Save bill template configuration
    saveBillTemplateConfig(billConfig);

    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
    }, 3000);
  };

  // Sample data for previewing template in real-time
  const todayStr = new Date().toISOString().split('T')[0];
  const sampleRental: Rental = {
    id: 'rent-sample-01',
    partyId: 'party-preview',
    partyName: 'patil constructions',
    plateType: '24×3',
    quantity: 100,
    dailyRate: 1.5,
    issueDate: todayStr,
    days: 40,
    totalRent: 6000,
    paid: 1100,
    pending: 4900,
    paymentMode: 'Account 1',
    status: 'active',
    currentCycleNumber: 1,
    currentCycleStartDate: todayStr,
  };

  const sampleParty: Party = {
    id: 'party-preview',
    name: 'patil constructions',
    mobile: '9881985058',
    address: 'Near Old Bus Stand, Solapur Road',
    notes: 'Sample preview party',
    platesWithParty: 100,
    totalRent: 6000,
    paid: 1100,
    pending: 4900,
    status: 'active',
  };

  const sampleCycle: RentalCycle = {
    id: 'cycle-preview',
    rentalId: 'rent-sample-01',
    partyId: 'party-preview',
    cycleNumber: 1,
    startDate: todayStr,
    expectedEndDate: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    days: 40,
    extraDays: 0,
    dailyRate: 1.5,
    quantity: 100,
    baseRent: 6000,
    extraAmount: 0,
    totalAmount: 6000,
    paidAmount: 1100,
    pendingAmount: 4900,
    status: 'active',
  };

  // Determine which rental to show in template preview
  const latestRental = rentals.length > 0 ? rentals[0] : null;

  const targetRental: Rental = (selectedPreviewRentalId === 'latest'
    ? latestRental
    : selectedPreviewRentalId === 'sample'
    ? null
    : rentals.find((r) => r.id === selectedPreviewRentalId)
  ) || latestRental || sampleRental;

  const targetParty: Party = parties.find((p) => p.id === targetRental.partyId) || {
    ...sampleParty,
    id: targetRental.partyId,
    name: targetRental.partyName,
  };

  const targetCycle: RentalCycle =
    rentalCycles.find((c) => c.rentalId === targetRental.id) || {
      ...sampleCycle,
      rentalId: targetRental.id,
      partyId: targetRental.partyId,
      dailyRate: targetRental.dailyRate,
      quantity: targetRental.quantity,
      baseRent: targetRental.totalRent,
      totalAmount: targetRental.totalRent,
      paidAmount: targetRental.paid,
      pendingAmount: targetRental.pending,
      startDate: targetRental.issueDate,
    };

  const targetPayments: Payment[] = payments.filter(
    (p) => p.rentalId === targetRental.id || (p.partyId === targetRental.partyId && p.date >= targetRental.issueDate)
  );

  return (
    <div className="max-w-4xl mx-auto text-left space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">System & Bill Settings</h3>
          <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">
            Configure business variables, banking info, and customize rental bill templates
          </p>
        </div>

        {/* Live Preview Button in Header */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[40px]"
            title="Preview currently configured bill template"
          >
            <Eye className="w-4 h-4 text-orange-400" />
            <span>Preview Bill Template</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {isSaved && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-sm font-bold flex items-center gap-2 shadow-sm animate-scaleUp">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>Settings and Bill Templates saved successfully! All generated bills will reflect these changes.</span>
          </div>
        )}

        {/* SECTION 1: BUSINESS BRANDING & YARD CONTACT */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-primary" />
            <span>Business Branding & Yard Contact</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Business Name (English)</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:outline-none px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Business Name (Marathi Subtitle)</label>
              <input
                type="text"
                value={businessNameMr}
                onChange={(e) => setBusinessNameMr(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:outline-none px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Office & Stockyard Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:outline-none px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Contact Numbers (Comma Separated)</label>
            <input
              type="text"
              value={phones}
              onChange={(e) => setPhones(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:outline-none px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800"
            />
          </div>
        </div>

        {/* SECTION 2: PAYMENT LEDGER ACCOUNTS */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <User className="w-4 h-4 text-primary" />
              <span>{isMarathi ? 'पेमेंट लेजर व बँक खाती' : 'Payment Ledger & Bank Accounts'}</span>
            </h4>
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isMarathi ? 'बँकेचे नाव बिलावर व सर्व ठिकाणी आपोआप लागू होते' : 'Bank name syncs with bills & all fields'}</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-600 uppercase flex items-center justify-between">
                <span>{isMarathi ? 'बँक खाते नाव (बँक १)' : 'Bank Account Name (Bank 1)'}</span>
                <span className="text-[9px] text-emerald-600 font-bold lowercase">{isMarathi ? 'बिलावर दिसेल' : 'on bills'}</span>
              </label>
              <input
                type="text"
                value={account1Name}
                onChange={(e) => handleAccount1Change(e.target.value)}
                onBlur={() => {
                  const cleaned = cleanAccountName(account1Name, account1Name);
                  if (cleaned !== account1Name) handleAccount1Change(cleaned);
                }}
                placeholder={isMarathi ? 'उदा. Ravi किंवा SBI बँक' : 'e.g. Ravi or SBI Bank'}
                className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:bg-white focus:outline-none px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 transition-all"
              />
              <p className="text-[10px] text-slate-400">
                {isMarathi ? 'येथे नाव टाकल्यास सर्व ठिकाणी व बिलावर हेच नाव दिसेल' : 'Adding name here updates all fields & bill bank name'}
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-600 uppercase">
                {isMarathi ? 'दुसरे खाते नाव (UPI / डिजिटल)' : 'Secondary Account Name (UPI / Digital)'}
              </label>
              <input
                type="text"
                value={account2Name}
                onChange={(e) => handleAccount2Change(e.target.value)}
                onBlur={() => {
                  const cleaned = cleanAccountName(account2Name, account2Name);
                  if (cleaned !== account2Name) handleAccount2Change(cleaned);
                }}
                placeholder={isMarathi ? 'उदा. Nilesh किंवा PhonePe' : 'e.g. Nilesh or PhonePe'}
                className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:bg-white focus:outline-none px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 transition-all"
              />
              <p className="text-[10px] text-slate-400">
                {isMarathi ? 'दुसऱ्या खात्याचे नाव (सर्व ठिकाणी हेच नाव दिसेल)' : 'Secondary bank/UPI name shown everywhere'}
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-600 uppercase">
                {isMarathi ? 'रोख / कॅश लेजर नाव' : 'Cash Ledger Name'}
              </label>
              <input
                type="text"
                value={cashAccountName}
                onChange={(e) => handleCashAccountChange(e.target.value)}
                placeholder="Cash"
                className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:bg-white focus:outline-none px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 transition-all"
              />
              <p className="text-[10px] text-slate-400">
                {isMarathi ? 'हातशिल्लक रोख रकमेचे लेजर नाव' : 'Physical cash on hand ledger title'}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              {isMarathi
                ? 'खाते क्र., IFSC व UPI ID बदलण्यासाठी खालील बँक खाते तपशील पहा ↓'
                : 'Looking to add/change Account Number, IFSC & UPI printed on customer bills?'}
            </span>
            <a href="#bank-account-settings" className="text-primary font-bold hover:underline flex items-center gap-1">
              <Landmark className="w-3.5 h-3.5" />
              <span>{isMarathi ? 'बँक खाते तपशील येथे पहा ↓' : 'Go to Bank Account Details ↓'}</span>
            </a>
          </div>
        </div>

        {/* SECTION 3: BILL & CHALLAN TEMPLATES */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-orange-100 text-primary rounded-2xl shadow-xs">
                <FileText className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-base font-extrabold text-slate-900">
                    {isMarathi ? 'भाडे बिल व चालान फॉरमॅट' : 'Rental Bill & Challan Format'}
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-primary border border-orange-200">
                    {billConfig.templateStyle === 'simple'
                      ? (isMarathi ? 'साधे बिल' : 'Simple Bill')
                      : (isMarathi ? 'तपशीलवार चालान' : 'Detailed Challan')}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isMarathi
                    ? 'बिलाची भाषा, लेआउट मांडणी, शीर्षक आणि प्रिंटिंग पर्याय निवडा'
                    : 'Configure bill language, layout design, document titles, and display options'}
                </p>
              </div>
            </div>

            {/* Quick Preview Target Bar */}
            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              <select
                value={selectedPreviewRentalId}
                onChange={(e) => setSelectedPreviewRentalId(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 px-3 py-2 rounded-xl focus:outline-none cursor-pointer max-w-[200px] truncate"
                title="Preview using customer rental data"
              >
                <option value="latest">
                  {isMarathi ? 'ताजे:' : 'Latest:'} {latestRental ? `${latestRental.partyName}` : 'Sample Bill'}
                </option>
                {rentals.map((r, idx) => (
                  <option key={r.id} value={r.id}>
                    #{idx + 1} {r.partyName} ({r.plateType})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                title="Preview live bill template"
              >
                <Eye className="w-4 h-4 text-orange-400" />
                <span>{isMarathi ? 'बिल पहा' : 'Preview'}</span>
              </button>
            </div>
          </div>

          {/* 1. Language Selector: Marathi / English */}
          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
              <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Languages className="w-4 h-4 text-primary" />
                <span>{isMarathi ? 'बिलाची भाषा' : 'Bill Language'}</span>
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                {isMarathi
                  ? 'मथळे, साहित्याची नावे आणि हिशोबाची भाषा निवडा'
                  : 'Choose language for headers, table, and print calculations'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Marathi */}
              <div
                onClick={() => handleUpdateLanguage('marathi')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  billConfig.billLanguage === 'marathi'
                    ? 'border-orange-500 bg-white shadow-xs ring-1 ring-orange-500/30'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-black text-slate-900">मराठी (Marathi)</span>
                  {billConfig.billLanguage === 'marathi' && (
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-500 text-white">
                      {isMarathi ? 'निवडले' : 'Selected'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  {isMarathi
                    ? 'सर्व मथळे, साहित्याची नावे, हिशोब तपशील आणि भाडे अटी पूर्णपणे मराठीत.'
                    : 'Pure Marathi headings, item descriptions, rental calculations, and terms.'}
                </p>
              </div>

              {/* Option 2: English */}
              <div
                onClick={() => handleUpdateLanguage('english')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  billConfig.billLanguage === 'english'
                    ? 'border-slate-900 bg-white shadow-xs ring-1 ring-slate-800/30'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-black text-slate-900">English (इंग्रजी)</span>
                  {billConfig.billLanguage === 'english' && (
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-900 text-white">
                      {isMarathi ? 'निवडले' : 'Selected'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  {isMarathi
                    ? 'सर्व मथळे, तक्ता, हिशोब व भाडे अटी इंग्रजीत.'
                    : 'Standard English layout, item tables, totals, and rental conditions.'}
                </p>
              </div>
            </div>
          </div>

          {/* 2. Template Style Selector (Only the 2 workable, functional layouts) */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2.5">
              {isMarathi ? 'बिल लेआउट निवडा' : 'Select Bill Layout Style'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Simple Bill (Recommended) */}
              <div
                onClick={() => handleUpdateTemplateStyle('simple')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  billConfig.templateStyle === 'simple'
                    ? 'border-primary bg-orange-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <FileText className={`w-5 h-5 ${billConfig.templateStyle === 'simple' ? 'text-primary' : 'text-slate-400'}`} />
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-100 text-primary">
                    {isMarathi ? 'शिफारस' : 'Recommended'}
                  </span>
                </div>
                <h5 className="text-sm font-bold text-slate-900">{isMarathi ? 'साधे बिल (Simple Bill)' : 'Simple Bill'}</h5>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  {isMarathi
                    ? 'स्वच्छ फॉरमॅट, सुटसुटीत साहित्य तक्ता, ठळक येणे बाकी आणि एका पानात (A4) परिपूर्ण छपाई.'
                    : 'Clean layout, simple item table, highlighted outstanding due, and perfect 1-page A4 print.'}
                </p>
              </div>

              {/* Option 2: Detailed Challan */}
              <div
                onClick={() => handleUpdateTemplateStyle('standard')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  billConfig.templateStyle === 'standard'
                    ? 'border-primary bg-orange-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <FileText className={`w-5 h-5 ${billConfig.templateStyle === 'standard' ? 'text-primary' : 'text-slate-400'}`} />
                  {billConfig.templateStyle === 'standard' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                  )}
                </div>
                <h5 className="text-sm font-bold text-slate-900">{isMarathi ? 'तपशीलवार चालान (Detailed Challan)' : 'Detailed Challan'}</h5>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  {isMarathi
                    ? 'सर्व तपशील, चालान क्रमांक आणि साहित्याच्या विस्‍तृत माहितीसह चालान पावती.'
                    : 'Full-featured rental bill & dispatch challan. Best for standard yard operations.'}
                </p>
              </div>
            </div>
          </div>

          {/* 3. Bill Fields Configuration Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase">
                {isMarathi ? 'बिल दस्तऐवज शीर्षक' : 'Bill Document Title'}
              </label>
              <input
                type="text"
                value={billConfig.billTitle}
                onChange={(e) => setBillConfig({ ...billConfig, billTitle: e.target.value })}
                placeholder={isMarathi ? 'उदा. भाडे पावती व साहित्य चालान' : 'e.g. RENTAL BILL & DELIVERY CHALLAN'}
                className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:bg-white focus:outline-none px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase">
                {isMarathi ? 'बिल क्रमांक पूर्वपद' : 'Bill Number Prefix'}
              </label>
              <input
                type="text"
                value={billConfig.billPrefix}
                onChange={(e) => setBillConfig({ ...billConfig, billPrefix: e.target.value })}
                placeholder="e.g. AB-BILL-"
                className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:bg-white focus:outline-none px-3.5 py-2.5 rounded-xl text-sm font-mono font-bold text-slate-800"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase">
                {isMarathi ? 'जीएसटी नोंदणी क्रमांक' : 'GSTIN Registration Number'}{' '}
                <span className="text-[10px] text-slate-400 font-normal">({isMarathi ? 'पर्यायी' : 'Optional'})</span>
              </label>
              <input
                type="text"
                value={billConfig.gstNumber}
                onChange={(e) => setBillConfig({ ...billConfig, gstNumber: e.target.value })}
                placeholder="e.g. 27AAAAA0000A1Z5"
                className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:bg-white focus:outline-none px-3.5 py-2.5 rounded-xl text-sm font-mono uppercase text-slate-800"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase">
                {isMarathi ? 'स्वाक्षरी पदनाम शीर्षक' : 'Signatory Designation Title'}
              </label>
              <input
                type="text"
                value={billConfig.signatoryTitle}
                onChange={(e) => setBillConfig({ ...billConfig, signatoryTitle: e.target.value })}
                placeholder={isMarathi ? 'उदा. अधिकृत स्वाक्षरी' : 'e.g. Authorized Signatory'}
                className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:bg-white focus:outline-none px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800"
              />
            </div>
          </div>

          {/* 4. Display Toggles */}
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-100">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={billConfig.showMarathiHeader}
                onChange={(e) => setBillConfig({ ...billConfig, showMarathiHeader: e.target.checked })}
                className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary"
              />
              <span>{isMarathi ? `मराठी नाव दाखवा (${businessNameMr})` : `Display Marathi business subtitle (${businessNameMr})`}</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={billConfig.showLastPayment}
                onChange={(e) => setBillConfig({ ...billConfig, showLastPayment: e.target.checked })}
                className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary"
              />
              <span>{isMarathi ? 'बिलावर मागील पेमेंट व बाकी इतिहास दाखवा' : 'Show Last Payment & Balance History on Bill'}</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700 sm:col-span-2">
              <input
                type="checkbox"
                checked={Boolean(billConfig.showKycDocuments)}
                onChange={(e) => setBillConfig({ ...billConfig, showKycDocuments: e.target.checked })}
                className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary"
              />
              <span>
                {isMarathi
                  ? 'बिलावर ग्राहक केवायसी फोटो (आधार कार्ड पुढील/मागील, चेहरा, चेक) दाखवा'
                  : 'Show Customer KYC Photos (Aadhaar Front/Back, Face, Cheque) on Bills'}
              </span>
            </label>
          </div>
        </div>

        {/* SECTION 4: BANK ACCOUNT & UPI PAYMENT DETAILS */}
        <div id="bank-account-settings" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm space-y-5 scroll-mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-100 text-primary rounded-2xl shadow-xs">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-base font-extrabold text-slate-900">
                    {isMarathi ? 'बँक खाते व डिजिटल पेमेंट माहिती' : 'Bank Account & UPI Details'}
                  </h4>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      billConfig.showBankDetails
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {billConfig.showBankDetails
                      ? (isMarathi ? 'बिलावर सक्रिय' : 'Active on Bills')
                      : (isMarathi ? 'बिलावर बंद' : 'Hidden on Bills')}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isMarathi
                    ? 'बँकेचे नाव, खाते क्र., आयएफएससी कोड आणि युपीआय आयडी — सर्व बिलांवर प्रिंट होतात'
                    : 'Edit Bank Name, Account No, IFSC & UPI printed on all bills'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 transition-all">
                <input
                  type="checkbox"
                  checked={billConfig.showBankDetails}
                  onChange={(e) => handleBankFieldChange('showBankDetails', e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                />
                <span>{isMarathi ? 'बिलावर दाखवा' : 'Print on Bill'}</span>
              </label>

              <button
                type="button"
                onClick={() => handleSaveBankDetails()}
                className="bg-primary hover:bg-primary-dark text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title={isMarathi ? 'बँक माहिती त्वरित सेव्ह करा' : 'Save Bank Details now'}
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isMarathi ? 'माहिती सेव्ह करा' : 'Save Bank Details'}</span>
              </button>
            </div>
          </div>

          {isBankSaved && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>
                {isMarathi
                  ? 'बँक माहिती यशस्वीरित्या सेव्ह झाली! सर्व बिलांवर त्वरित लागू झाली आहे.'
                  : 'Bank details saved successfully! Applied to all bills immediately.'}
              </span>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase flex items-center justify-between">
                  <span>{isMarathi ? 'बँकेचे नाव (Bank Name)' : 'Bank Name'}</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {isMarathi ? 'उदा. State Bank of India' : 'e.g. State Bank of India'}
                  </span>
                </label>
                <input
                  type="text"
                  value={billConfig.bankName}
                  onChange={(e) => handleBankFieldChange('bankName', e.target.value)}
                  onBlur={() => handleSaveBankDetails()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveBankDetails();
                    }
                  }}
                  placeholder="State Bank of India"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:bg-white focus:outline-none px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase flex items-center justify-between">
                  <span>{isMarathi ? 'खाते क्रमांक (Account Number)' : 'Account Number'}</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {isMarathi ? 'अंक' : 'Digits only'}
                  </span>
                </label>
                <input
                  type="text"
                  value={billConfig.accountNumber}
                  onChange={(e) => handleBankFieldChange('accountNumber', e.target.value)}
                  onBlur={() => handleSaveBankDetails()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveBankDetails();
                    }
                  }}
                  placeholder="e.g. 12345678901"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:bg-white focus:outline-none px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold text-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase flex items-center justify-between">
                  <span>{isMarathi ? 'आयएफएससी कोड (IFSC Code)' : 'IFSC Code'}</span>
                  <span className="text-[10px] text-slate-400 font-normal">११ अक्षरे</span>
                </label>
                <input
                  type="text"
                  value={billConfig.ifscCode}
                  onChange={(e) => handleBankFieldChange('ifscCode', e.target.value.toUpperCase())}
                  onBlur={() => handleSaveBankDetails()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveBankDetails();
                    }
                  }}
                  placeholder="e.g. SBIN0001234"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:bg-white focus:outline-none px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase text-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase flex items-center justify-between">
                  <span>{isMarathi ? 'युपीआय आयडी (UPI ID)' : 'UPI ID'}</span>
                  <span className="text-[10px] text-slate-400 font-normal">GPay / PhonePe</span>
                </label>
                <input
                  type="text"
                  value={billConfig.upiId}
                  onChange={(e) => handleBankFieldChange('upiId', e.target.value)}
                  onBlur={() => handleSaveBankDetails()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveBankDetails();
                    }
                  }}
                  placeholder="e.g. 9881985058@ybl"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:bg-white focus:outline-none px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-900"
                />
              </div>
            </div>

            {/* Quick Actions (Removed fake demo button) */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                {account1Name && account1Name !== billConfig.bankName && (
                  <button
                    type="button"
                    onClick={handleCopyAccount1ToBank}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                  >
                    {isMarathi ? `बँक नाव वापरा (${account1Name})` : `Use ${account1Name}`}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClearBankDetails}
                  className="text-slate-400 hover:text-rose-600 px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer"
                >
                  {isMarathi ? 'माहिती रिकामी करा' : 'Clear All'}
                </button>
              </div>

              <span className="text-[11px] text-slate-500 font-medium">
                {isMarathi
                  ? 'बदल टाइप करताच किंवा सेव्ह करताच आपोआप सुरक्षित होतात'
                  : 'Auto-saves as you type & on Save'}
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 5: TERMS AND CONDITIONS */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-100 text-primary rounded-2xl shadow-xs">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-base font-extrabold text-slate-900">
                    {isMarathi ? 'बिलावरील नियम व अटी' : 'Terms & Conditions Printed on Bill'}
                  </h4>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      billConfig.printTermsAndConditions
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {billConfig.printTermsAndConditions
                      ? (isMarathi ? 'बिलावर सक्रिय' : 'Active on Bills')
                      : (isMarathi ? 'बिलावर बंद' : 'Hidden on Bills')}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isMarathi
                    ? 'येथे जोडलेले सर्व नियम बिलाच्या शेवटी प्रिंट होतात — नवीन नियम टाइप करून जोडा'
                    : 'Conditions configured here print at the bottom of customer bills'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 transition-all">
                <input
                  type="checkbox"
                  id="toggle-print-terms-settings"
                  checked={billConfig.printTermsAndConditions}
                  onChange={(e) => handleTogglePrintTerms(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                />
                <span>{isMarathi ? 'बिलावर दाखवा' : 'Print on Bill'}</span>
              </label>

              <button
                type="button"
                onClick={handleSaveTerms}
                className="bg-primary hover:bg-primary-dark text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title={isMarathi ? 'नियम व अटी त्वरित सेव्ह करा' : 'Save Terms & Conditions'}
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isMarathi ? 'नियम सेव्ह करा' : 'Save Terms'}</span>
              </button>
            </div>
          </div>

          {isTermsSaved && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>
                {isMarathi
                  ? 'नियम व अटी यशस्वीरित्या सेव्ह झाल्या! सर्व बिलांवर त्वरित लागू झाल्या आहेत.'
                  : 'Terms & conditions saved successfully! Active on all bills immediately.'}
              </span>
            </div>
          )}

          <div className="space-y-2.5">
            {billConfig.termsAndConditions.map((term, index) => (
              <div key={index} className="flex items-center gap-2.5">
                <span className="w-6 text-center text-xs font-black text-slate-400 shrink-0">
                  {index + 1}.
                </span>
                <input
                  type="text"
                  value={term}
                  onChange={(e) => handleUpdateTerm(index, e.target.value)}
                  onBlur={handleSaveTerms}
                  className="flex-1 bg-slate-50 border border-slate-200 focus:border-primary focus:bg-white focus:outline-none px-3.5 py-2.5 rounded-xl text-xs text-slate-800 font-medium"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveTerm(index)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer shrink-0"
                  title="Remove Condition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {billConfig.termsAndConditions.length === 0 && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-center text-xs text-amber-800 font-semibold">
                {isMarathi
                  ? 'सध्या कोणतेही नियम जोडलेले नाहीत. खालील इनपुटमधून नवीन नियम जोडा किंवा डीफॉल्ट नियम लोड करा.'
                  : 'No custom terms configured. Add a new term below or load defaults.'}
              </div>
            )}
          </div>

          {/* Add new term input */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={newTermText}
              onChange={(e) => setNewTermText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTerm();
                }
              }}
              placeholder={
                isMarathi
                  ? 'नवीन नियम किंवा अट टाईप करा आणि Enter दाबा...'
                  : 'Type a new condition / policy note and press Enter...'
              }
              className="flex-1 bg-slate-50 border border-slate-200 focus:border-primary focus:bg-white focus:outline-none px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-900"
            />
            <button
              type="button"
              onClick={handleAddTerm}
              className="bg-primary hover:bg-primary-dark text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{isMarathi ? 'नियम जोडा' : 'Add Term'}</span>
            </button>
          </div>

          {/* Quick Helper Presets */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">
                {isMarathi ? 'पर्याय:' : 'Presets:'}
              </span>
              <button
                type="button"
                onClick={() => handleResetDefaultTerms('marathi')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              >
                {isMarathi ? 'मराठी डीफॉल्ट नियम' : 'Default Marathi Terms'}
              </button>
              <button
                type="button"
                onClick={() => handleResetDefaultTerms('english')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              >
                {isMarathi ? 'इंग्रजी डीफॉल्ट नियम' : 'Default English Terms'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const updated = {
                    ...billConfig,
                    termsAndConditions: [],
                  };
                  setBillConfig(updated);
                  saveBillTemplateConfig(updated);
                  setIsTermsSaved(true);
                  setTimeout(() => setIsTermsSaved(false), 2500);
                }}
                className="text-slate-400 hover:text-rose-600 px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer"
              >
                {isMarathi ? 'सर्व हटवा' : 'Clear All'}
              </button>
            </div>

            <span className="text-[11px] text-slate-500 font-medium">
              {billConfig.termsAndConditions.length} {isMarathi ? 'नियम सक्रिय' : 'Conditions Active'}
            </span>
          </div>
        </div>

        {/* Submit & Save Button */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-2">
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="w-full sm:w-auto px-5 py-3 rounded-xl sm:rounded-2xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
          >
            <Eye className="w-4 h-4" />
            <span>Preview Bill Template</span>
          </button>
          <button
            type="submit"
            className="w-full sm:w-auto bg-primary hover:bg-primary-dark text-white font-bold px-7 py-3 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm min-h-[44px]"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings Changes</span>
          </button>
        </div>
      </form>

      {/* -------------------------------------------------------------------------- */}
      {/* GOOGLE DRIVE BACKUP & RESTORE SECTION (Google Drive बॅकअप व रिस्टोअर)        */}
      {/* -------------------------------------------------------------------------- */}
      <GoogleDriveBackupSection
        getCurrentData={getCurrentData}
        onRestoreBackup={onRestoreBackup}
        isMarathi={isMarathi}
      />

      {/* -------------------------------------------------------------------------- */}
      {/* DATA MANAGEMENT & DELETE DATA SECTION (डेटा व्यवस्थापन व डिलीट पर्याय) */}
      {/* -------------------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-slate-100 pb-4 sm:pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 sm:p-3 bg-rose-50 text-rose-600 rounded-xl sm:rounded-2xl border border-rose-100 shadow-2xs flex-shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
                <span>{isMarathi ? 'डेटा व्यवस्थापन व डिलीट पर्याय' : 'Data Management & Delete Options'}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 uppercase font-mono">
                  Danger Zone
                </span>
              </h4>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">
                {isMarathi
                  ? 'भाडे वाटप, पेमेंट्स, ग्राहक डेटा हटवा अथवा नवीन सुरुवातीसाठी संपूर्ण डेटाबेस स्वच्छ करा.'
                  : 'Manage, prune, or delete transaction history, inactive parties, or reset database.'}
              </p>
            </div>
          </div>

          {/* Quick Utility Actions */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-2.5">
            {/* Hidden JSON file input */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />

            <button
              type="button"
              onClick={handleDownloadBackup}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer min-h-[38px]"
              title="Download full JSON data backup"
            >
              <Download className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
              <span className="truncate">{isMarathi ? 'बॅकअप डाउनलोड' : 'Download Backup'}</span>
            </button>

            {onRestoreBackup && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isRestoring}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer min-h-[38px]"
                title="Upload and restore a JSON data backup"
              >
                {isRestoring ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                ) : (
                  <Upload className="w-3.5 h-3.5 flex-shrink-0" />
                )}
                <span className="truncate">{isMarathi ? 'बॅकअप अपलोड' : 'Restore Backup'}</span>
              </button>
            )}


            {onDeduplicate && (
              <button
                type="button"
                onClick={handleRunDeduplication}
                disabled={isDeduplicating}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer min-h-[38px]"
                title="Deduplicate stored records"
              >
                {isDeduplicating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 flex-shrink-0" />
                )}
                <span className="truncate">{isMarathi ? 'ड्युप्लिकेट स्वच्छ' : 'Clean Dups'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Current Database Summary Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl sm:rounded-2xl p-3 sm:p-3.5 text-center">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 block">
              {isMarathi ? 'भाडे वाटप' : 'Rentals'}
            </span>
            <span className="text-lg sm:text-xl font-black text-slate-900 font-mono mt-0.5 block">
              {rentals.length}
            </span>
          </div>
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl sm:rounded-2xl p-3 sm:p-3.5 text-center">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 block">
              {isMarathi ? 'सायकल्स' : 'Cycles'}
            </span>
            <span className="text-lg sm:text-xl font-black text-slate-900 font-mono mt-0.5 block">
              {rentalCycles.length}
            </span>
          </div>
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl sm:rounded-2xl p-3 sm:p-3.5 text-center">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 block">
              {isMarathi ? 'जमा नोंदी' : 'Returns'}
            </span>
            <span className="text-lg sm:text-xl font-black text-slate-900 font-mono mt-0.5 block">
              {returns.length}
            </span>
          </div>
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl sm:rounded-2xl p-3 sm:p-3.5 text-center">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 block">
              {isMarathi ? 'पेमेंट्स' : 'Payments'}
            </span>
            <span className="text-lg sm:text-xl font-black text-slate-900 font-mono mt-0.5 block">
              {payments.length}
            </span>
          </div>
          <div className="col-span-2 sm:col-span-1 bg-slate-50 border border-slate-200/80 rounded-xl sm:rounded-2xl p-3 sm:p-3.5 text-center">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 block">
              {isMarathi ? 'ग्राहक' : 'Parties'}
            </span>
            <span className="text-lg sm:text-xl font-black text-slate-900 font-mono mt-0.5 block">
              {parties.length}
            </span>
          </div>
        </div>

        {/* Granular Delete Options Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Option 1: Delete Rentals & Cycles */}
          <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-900 flex items-center gap-1.5 uppercase tracking-wide">
                  <ClipboardList className="w-4 h-4 text-amber-600" />
                  <span>{isMarathi ? 'भाडे वाटप व व्यवहार डेटा' : 'Rentals & Cycles'}</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-mono">
                  {rentals.length} {isMarathi ? 'नोंदी' : 'records'}
                </span>
              </div>
              <p className="text-xs text-amber-800/80 leading-relaxed font-normal">
                {isMarathi
                  ? 'सर्व भाडे करार, सायकल कालावधी हिशोब व साहित्य जमा नोंदी हटवा. ग्राहक माहिती व प्लेट दर सुरक्षित राहतील.'
                  : 'Permanently deletes all rental dispatches, cycle schedules, and returns. Customer accounts and stock rates stay safe.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenDeleteModal('all_rentals')}
              disabled={rentals.length === 0}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                rentals.length > 0
                  ? 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-xs'
                  : 'bg-amber-200 text-amber-400 cursor-not-allowed'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isMarathi ? 'भाडे वाटप नोंदी हटवा' : 'Delete All Rentals'}</span>
            </button>
          </div>

          {/* Option 2: Delete Payments */}
          <div className="bg-blue-50/50 border border-blue-200/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-blue-900 flex items-center gap-1.5 uppercase tracking-wide">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  <span>{isMarathi ? 'पेमेंट नोंदी व पावत्या' : 'Payment History'}</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-mono">
                  {payments.length} {isMarathi ? 'नोंदी' : 'records'}
                </span>
              </div>
              <p className="text-xs text-blue-800/80 leading-relaxed font-normal">
                {isMarathi
                  ? 'ग्राहकांकडून जमा झालेले सर्व रोख व बँक पेमेंट व्यवहार आणि पावती नोंदी कायमच्या हटवा.'
                  : 'Permanently removes all cash, bank, and digital payment receipts and settlement entries.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenDeleteModal('all_payments')}
              disabled={payments.length === 0}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                payments.length > 0
                  ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs'
                  : 'bg-blue-200 text-blue-400 cursor-not-allowed'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isMarathi ? 'पेमेंट इतिहास हटवा' : 'Delete Payments'}</span>
            </button>
          </div>

          {/* Option 3: Delete Inactive Customers */}
          <div className="bg-indigo-50/50 border border-indigo-200/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-indigo-900 flex items-center gap-1.5 uppercase tracking-wide">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>{isMarathi ? 'शून्य बाकी असलेले निष्क्रिय ग्राहक' : 'Inactive Customers'}</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-mono">
                  {parties.filter((p) => (p.platesWithParty || 0) === 0 && (p.pending || 0) === 0).length} {isMarathi ? 'पात्र' : 'eligible'}
                </span>
              </div>
              <p className="text-xs text-indigo-800/80 leading-relaxed font-normal">
                {isMarathi
                  ? 'ज्या ग्राहकांकडे 0 प्लेट्स आहेत आणि बाकी रक्कम शून्य आहे असे पूर्ण झालेले ग्राहक काढून टाका. सक्रिय ग्राहक सुरक्षित राहतील.'
                  : 'Cleans up settled customers holding 0 plates and 0 outstanding balance. Active customers are protected.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenDeleteModal('inactive_customers')}
              disabled={parties.filter((p) => (p.platesWithParty || 0) === 0 && (p.pending || 0) === 0).length === 0}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                parties.filter((p) => (p.platesWithParty || 0) === 0 && (p.pending || 0) === 0).length > 0
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs'
                  : 'bg-indigo-200 text-indigo-400 cursor-not-allowed'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isMarathi ? 'निष्क्रिय ग्राहक हटवा' : 'Clean Settled Customers'}</span>
            </button>
          </div>

          {/* Option 4: Clear Notifications & Alerts */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                  <Bell className="w-4 h-4 text-slate-600" />
                  <span>{isMarathi ? 'सूचना व अलर्ट्स' : 'System Notifications'}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
                {isMarathi
                  ? 'सर्व वाचलेल्या व न वाचलेल्या सूचनांचा इतिहास साफ करा. आर्थिक किंवा ग्राहक डेटा सुरक्षित राहील.'
                  : 'Clears all read and unread system alerts. Business and customer data will not be touched.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenDeleteModal('all_notifications')}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isMarathi ? 'सूचना इतिहास साफ करा' : 'Clear Notifications'}</span>
            </button>
          </div>
        </div>

        {/* Master Danger Zone: Factory Reset */}
        <div className="mt-4 bg-gradient-to-br from-rose-50 to-red-50/80 border-2 border-rose-300/80 rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0" />
              <h5 className="text-xs sm:text-sm font-black text-rose-950 uppercase tracking-wide">
                {isMarathi ? 'फॅक्टरी रिसेट: सर्व डेटा पूर्णपणे पुसून टाका' : 'Complete Factory Reset / Wipe All Data'}
              </h5>
            </div>
            <p className="text-[11px] sm:text-xs text-rose-800 leading-relaxed">
              {isMarathi
                ? 'सर्व भाडे वाटप, सायकल्स, जमा नोंदी, पेमेंट्स, आणि ग्राहक एकाच वेळी कायमचे नष्ट केले जातील. नवीन सुरुवातीसाठीच वापरा.'
                : 'Permanently wipes all rentals, cycles, returns, payments, ledger logs, and customer accounts back to zero.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleOpenDeleteModal('factory_reset')}
            className="w-full sm:w-auto flex-shrink-0 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs px-4 sm:px-5 py-3 rounded-xl shadow-md hover:shadow-rose-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px]"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isMarathi ? 'सर्व डेटा कायमचा हटवा' : 'Wipe All Data (Factory Reset)'}</span>
          </button>
        </div>
      </div>

      {/* Real-time Bill Template Preview Modal */}
      {isPreviewOpen && (
        <RentalBillModal
          rental={targetRental}
          activeCycle={targetCycle}
          rentalCycles={rentalCycles.filter((c) => c.rentalId === targetRental.id)}
          party={targetParty}
          payments={targetPayments}
          templateConfig={billConfig}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}

      {/* Delete Data Confirmation Modal */}
      {isDeleteModalOpen && selectedDeleteCategory && (
        <DeleteDataConfirmModal
          isOpen={isDeleteModalOpen}
          category={selectedDeleteCategory}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setSelectedDeleteCategory(null);
          }}
          onConfirmDelete={async (cat) => {
            if (onDeleteData) {
              await onDeleteData(cat);
            }
          }}
          rentals={rentals}
          parties={parties}
          rentalCycles={rentalCycles}
          payments={payments}
          returns={returns}
          isMarathi={isMarathi}
        />
      )}
    </div>
  );
};
