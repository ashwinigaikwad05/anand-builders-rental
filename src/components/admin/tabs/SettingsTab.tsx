import React, { useState } from 'react';
import {
  Save,
  Award,
  User,
  Settings,
  FileText,
  Receipt,
  Layers,
  Eye,
  Plus,
  Trash2,
  Landmark,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Languages,
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
import type { Rental, Party, RentalCycle, Payment, ReturnLog } from '../../../data/adminMockData';
import {
  Database,
  Download,
  Upload,
  Sparkles,
  ShieldAlert,
  Users,
  ClipboardList,
  DollarSign,
  Bell,
  RefreshCw,
  Loader2,
} from 'lucide-react';

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
  onLoadSampleData,
  onRestoreBackup,
  appLanguage,
}) => {
  // Business branding & parameters
  const [businessName, setBusinessName] = useState(() => localStorage.getItem('anand_business_name') || 'ANAND BUILDERS & DEVELOPERS');
  const [businessNameMr, setBusinessNameMr] = useState(() => localStorage.getItem('anand_business_name_mr') || 'आनंद बिल्डिंग मटेरियल सप्लायर');
  const [address, setAddress] = useState(() => localStorage.getItem('anand_business_address') || 'Near Old Bus Stand, Solapur Road');
  const [phones, setPhones] = useState(() => localStorage.getItem('anand_business_phones') || '7020914957, 9881985058, 9021519582');

  const [defaultRate, setDefaultRate] = useState<number>(() => parseFloat(localStorage.getItem('anand_default_rate') || '1.50'));
  const [rentalCycle, setRentalCycle] = useState<number>(() => parseInt(localStorage.getItem('anand_rental_cycle') || '40'));

  const [account1Name, setAccount1Name] = useState(() => localStorage.getItem('anand_acc1_name') || 'Account 1 (Main Bank)');
  const [account2Name, setAccount2Name] = useState(() => localStorage.getItem('anand_acc2_name') || 'Account 2 (UPI / Digital)');
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
  const [showTemplateSettings, setShowTemplateSettings] = useState(true);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Data deletion & maintenance states
  const isMarathi = appLanguage ? appLanguage === 'marathi' : getStoredAppLanguage() === 'marathi';
  const [selectedDeleteCategory, setSelectedDeleteCategory] = useState<DeleteDataCategory | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeduplicating, setIsDeduplicating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
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

  const handleLoadSample = async () => {
    if (!onLoadSampleData) return;
    const confirmMsg = isMarathi
      ? 'नमुना साहित्य, ग्राहक आणि भाडे नोंदी लोड करायच्या आहेत का?'
      : 'Load starter demo plates, customers, and rental records?';
    if (!window.confirm(confirmMsg)) return;
    try {
      setIsSeeding(true);
      await onLoadSampleData();
    } finally {
      setIsSeeding(false);
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
    setBillConfig((prev) => {
      let defaultTitle = prev.billTitle;
      if (style === 'tax_invoice' && prev.billTitle === 'RENTAL DISPATCH CHALLAN & BILL') {
        defaultTitle = 'TAX INVOICE';
      } else if (style === 'compact' && prev.billTitle === 'TAX INVOICE') {
        defaultTitle = 'DISPATCH DELIVERY SLIP';
      } else if (style === 'standard' && prev.billTitle === 'TAX INVOICE') {
        defaultTitle = 'RENTAL DISPATCH CHALLAN & BILL';
      }
      return {
        ...prev,
        templateStyle: style,
        billTitle: defaultTitle,
      };
    });
  };

  const handleUpdateLanguage = (lang: BillLanguage) => {
    setBillConfig((prev) => {
      const defaultTitle =
        lang === 'marathi'
          ? 'भाडे पावती व साहित्य चालान'
          : 'RENTAL BILL & DELIVERY CHALLAN';
      const defaultTerms =
        lang === 'marathi' ? MARATHI_TERMS : ENGLISH_TERMS;
      const defaultSignatory =
        lang === 'marathi'
          ? 'अधिकृत स्वाक्षरी / शिक्का'
          : 'Authorized Signatory / Stamp';
      return {
        ...prev,
        billLanguage: lang,
        billTitle: defaultTitle,
        termsAndConditions: defaultTerms,
        signatoryTitle: defaultSignatory,
      };
    });
  };

  const handleAddTerm = () => {
    if (!newTermText.trim()) return;
    setBillConfig((prev) => ({
      ...prev,
      termsAndConditions: [...prev.termsAndConditions, newTermText.trim()],
    }));
    setNewTermText('');
  };

  const handleRemoveTerm = (index: number) => {
    setBillConfig((prev) => ({
      ...prev,
      termsAndConditions: prev.termsAndConditions.filter((_, i) => i !== index),
    }));
  };

  const handleUpdateTerm = (index: number, text: string) => {
    setBillConfig((prev) => {
      const updated = [...prev.termsAndConditions];
      updated[index] = text;
      return {
        ...prev,
        termsAndConditions: updated,
      };
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    // Save business & parameters
    localStorage.setItem('anand_business_name', businessName);
    localStorage.setItem('anand_business_name_mr', businessNameMr);
    localStorage.setItem('anand_business_address', address);
    localStorage.setItem('anand_business_phones', phones);
    localStorage.setItem('anand_default_rate', defaultRate.toString());
    localStorage.setItem('anand_rental_cycle', rentalCycle.toString());
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
    dailyRate: defaultRate || 1.5,
    issueDate: todayStr,
    days: rentalCycle || 40,
    totalRent: 100 * (defaultRate || 1.5) * (rentalCycle || 40),
    paid: 1100,
    pending: 100 * (defaultRate || 1.5) * (rentalCycle || 40) - 1100,
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
    expectedEndDate: new Date(Date.now() + (rentalCycle || 40) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    days: rentalCycle || 40,
    extraDays: 0,
    dailyRate: defaultRate || 1.5,
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

        {/* SECTION 2: RENTAL PARAMETERS */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-1.5">
            <Settings className="w-4 h-4 text-primary" />
            <span>Rental Parameters</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-slate-500 uppercase">Default Daily Rate (₹ / Day)</label>
              <input
                type="number"
                step="any"
                value={defaultRate}
                onChange={(e) => setDefaultRate(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:outline-none px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800"
              />
            </div>
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-slate-500 uppercase">Normal Rental Cycle (Days)</label>
              <input
                type="number"
                value={rentalCycle}
                onChange={(e) => setRentalCycle(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:outline-none px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: PAYMENT LEDGER ACCOUNTS */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-1.5">
            <User className="w-4 h-4 text-primary" />
            <span>Payment Ledger Accounts</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Account 1 Name</label>
              <input
                type="text"
                value={account1Name}
                onChange={(e) => setAccount1Name(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:outline-none px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-800"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Account 2 Name</label>
              <input
                type="text"
                value={account2Name}
                onChange={(e) => setAccount2Name(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:outline-none px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-800"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Cash Ledger Name</label>
              <input
                type="text"
                value={cashAccountName}
                onChange={(e) => setCashAccountName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:outline-none px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-800"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>Looking to add/change Bank Name, Account Number & IFSC printed on customer bills?</span>
            <a href="#bank-account-settings" className="text-primary font-bold hover:underline flex items-center gap-1">
              <Landmark className="w-3.5 h-3.5" />
              <span>Go to Bank Account Details ↓</span>
            </a>
          </div>
        </div>

        {/* SECTION: ALL SETTINGS OF BILL TEMPLATES - OPEN TO SHOW */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden transition-all">
          {/* Card Header with Open to Show Toggle & Preview */}
          <div className="p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/40">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-orange-100 text-primary rounded-2xl shadow-xs">
                <FileText className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-base font-extrabold text-slate-900">
                    Rental Bill & Challan Templates
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-primary border border-orange-200">
                    {billConfig.templateStyle === 'simple'
                      ? (isMarathi ? 'साधे बिल' : 'Simple Bill')
                      : billConfig.templateStyle === 'standard'
                      ? 'Standard Challan'
                      : billConfig.templateStyle === 'tax_invoice'
                      ? 'Tax Invoice'
                      : 'Compact Slip'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Customize layout styles, document titles, banking info, and terms & conditions
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
              {/* Primary Toggle: Open to Show / Hide Template Settings */}
              <button
                type="button"
                onClick={() => setShowTemplateSettings((prev) => !prev)}
                className={`text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-xs cursor-pointer ${
                  showTemplateSettings
                    ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                    : 'bg-primary hover:bg-primary-dark text-white shadow-orange-500/10'
                }`}
                title={showTemplateSettings ? 'Collapse template settings' : 'Open and configure all bill template settings'}
              >
                {showTemplateSettings ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    <span>Hide Template Settings</span>
                  </>
                ) : (
                  <>
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>Open to Show Settings</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                title="Preview live bill template"
              >
                <Eye className="w-4 h-4 text-orange-400" />
                <span>Preview</span>
              </button>
            </div>
          </div>

          {/* Quick Summary Bar when collapsed */}
          {!showTemplateSettings && (
            <div className="p-6 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-slate-600">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Layout Style</span>
                  <span className="font-bold text-slate-900 capitalize">
                    {billConfig.templateStyle === 'simple' ? 'Simple Bill' : billConfig.templateStyle.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">{isMarathi ? 'भाषा' : 'Language'}</span>
                  <span className="font-bold text-primary capitalize">
                    {billConfig.billLanguage === 'marathi'
                      ? (isMarathi ? 'मराठी' : 'Marathi')
                      : (isMarathi ? 'इंग्रजी' : 'English')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Bill Prefix</span>
                  <span className="font-mono font-bold text-slate-900">{billConfig.billPrefix}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Bank Details</span>
                  <span className={`font-bold ${billConfig.showBankDetails ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {billConfig.showBankDetails ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Terms & Policies</span>
                  <span className="font-bold text-slate-900">
                    {billConfig.termsAndConditions.length} Conditions
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowTemplateSettings(true)}
                className="text-xs font-bold text-primary hover:text-orange-700 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
              >
                <span>Click Open to Show All Settings</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Expanded All Settings of Bill Templates */}
          {showTemplateSettings && (
            <div className="p-6 sm:p-7 space-y-6 bg-white animate-fadeIn">
              {/* Preview Target Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Preview Customer Data:</span>
                  <select
                    value={selectedPreviewRentalId}
                    onChange={(e) => setSelectedPreviewRentalId(e.target.value)}
                    className="bg-white border border-slate-200 text-xs font-bold text-slate-800 px-2.5 py-1.5 rounded-xl focus:outline-none cursor-pointer max-w-[220px] truncate"
                  >
                    <option value="latest">
                      Latest: {latestRental ? `${latestRental.partyName}` : 'Sample Bill'}
                    </option>
                    {rentals.map((r, idx) => (
                      <option key={r.id} value={r.id}>
                        #{idx + 1} {r.partyName} ({r.plateType})
                      </option>
                    ))}
                    <option value="sample">Generic Mock Sample</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(true)}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer self-start sm:self-auto"
                >
                  <Eye className="w-3.5 h-3.5 text-orange-400" />
                  <span>Open Live Preview</span>
                </button>
              </div>

              {/* 1. Language Selector: Marathi / English */}
              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Languages className="w-4 h-4 text-primary" />
                    <span>Bill Language / बिलाची भाषा</span>
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Choose language for bill headers, item table, and terms
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
                      <span className="text-sm font-black text-slate-900">मराठी</span>
                      {billConfig.billLanguage === 'marathi' && (
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-500 text-white">
                          Selected
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      सर्व मथळे, साहित्याची नावे, हिशोब तपशील आणि भाडे अटी पूर्णपणे मराठीत.
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
                      <span className="text-sm font-black text-slate-900">English</span>
                      {billConfig.billLanguage === 'english' && (
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-900 text-white">
                          Selected
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Full rental bill in English (Headers, item tables, totals, and standard terms).
                    </p>
                  </div>
                </div>
              </div>

              {/* Template Style Selector Cards */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2.5">
                  Select Bill Template Layout
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                    <h5 className="text-sm font-bold text-slate-900">{isMarathi ? 'साधे बिल' : 'Simple Bill'}</h5>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      {isMarathi
                        ? 'स्वच्छ मराठी फॉरमॅट, सुटसुटीत साहित्य तक्ता, ठळक येणे बाकी आणि १-पान छपाई.'
                        : 'Clean pure layout, simple item table, highlighted outstanding due, and single-page A4 print.'}
                    </p>
                  </div>

                  {/* Option 2: Standard */}
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
                        <span className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <h5 className="text-sm font-bold text-slate-900">{isMarathi ? 'आधुनिक स्टँडर्ड चालान' : 'Modern Standard Challan'}</h5>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      {isMarathi
                        ? 'सर्व वैशिष्ट्यांसह भाडे पावती व साहित्य चालान. दैनंदिन कामासाठी उत्तम.'
                        : 'Full-featured rental bill & dispatch challan. Best for standard yard operations.'}
                    </p>
                  </div>

                  {/* Option 3: Tax Invoice */}
                  <div
                    onClick={() => handleUpdateTemplateStyle('tax_invoice')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      billConfig.templateStyle === 'tax_invoice'
                        ? 'border-primary bg-orange-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Receipt className={`w-5 h-5 ${billConfig.templateStyle === 'tax_invoice' ? 'text-primary' : 'text-slate-400'}`} />
                      {billConfig.templateStyle === 'tax_invoice' && (
                        <span className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <h5 className="text-sm font-bold text-slate-900">{isMarathi ? 'टॅक्स / जीएसटी इनव्हॉईस' : 'Tax / GST Invoice'}</h5>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      {isMarathi
                        ? 'जीएसटी क्रमांक, एचएसएन कोड (९९७३) आणि अधिकृत टॅक्स इनव्हॉईस मांडणी.'
                        : 'Includes GSTIN number, HSN/SAC code (9973), and formal tax invoice layout.'}
                    </p>
                  </div>

                  {/* Option 4: Compact */}
                  <div
                    onClick={() => handleUpdateTemplateStyle('compact')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      billConfig.templateStyle === 'compact'
                        ? 'border-primary bg-orange-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Layers className={`w-5 h-5 ${billConfig.templateStyle === 'compact' ? 'text-primary' : 'text-slate-400'}`} />
                      {billConfig.templateStyle === 'compact' && (
                        <span className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <h5 className="text-sm font-bold text-slate-900">{isMarathi ? 'कॉम्पॅक्ट पावती स्लिप' : 'Compact Dispatch Slip'}</h5>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      {isMarathi
                        ? 'जलद प्रिंटिंग आणि ड्रायव्हर स्वाक्षरीसाठी संक्षिप्त १-पान मांडणी.'
                        : 'Condensed 1-page layout for rapid printing and site driver acknowledgment.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bill Fields Configuration Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase">
                    {isMarathi ? 'बिल दस्तऐवज शीर्षक' : 'Bill Document Title'}
                  </label>
                  <input
                    type="text"
                    value={billConfig.billTitle}
                    onChange={(e) => setBillConfig({ ...billConfig, billTitle: e.target.value })}
                    placeholder={isMarathi ? 'उदा. भाडे पावती व साहित्य चालान' : 'e.g. RENTAL DISPATCH CHALLAN & BILL'}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:outline-none px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800"
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
                    className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:outline-none px-3.5 py-2.5 rounded-xl text-sm font-mono font-bold text-slate-800"
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
                    className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:outline-none px-3.5 py-2.5 rounded-xl text-sm font-mono uppercase text-slate-800"
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
                    className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:outline-none px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
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

              {/* Sub-Card: Bank & UPI Payment Details for Bills */}
              <div id="bank-account-settings" className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-4 scroll-mt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-primary" />
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800 block">
                        {isMarathi ? 'बँक खाते व डिजिटल पेमेंट माहिती' : 'Bank Account & UPI Details'}
                      </span>
                      <span className="text-[11px] text-slate-500 font-normal">
                        {isMarathi
                          ? 'बँकेचे नाव, खाते क्र., आयएफएससी कोड आणि युपीआय आयडी बिलावर प्रिंट करण्यासाठी'
                          : 'Add / update Bank Name, Account No, IFSC & UPI printed on all bills'}
                      </span>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={billConfig.showBankDetails}
                      onChange={(e) => setBillConfig({ ...billConfig, showBankDetails: e.target.checked })}
                      className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary"
                    />
                    <span>{isMarathi ? 'बिलावर दाखवा' : 'Print on Bill'}</span>
                  </label>
                </div>

                {billConfig.showBankDetails && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Bank Name</label>
                      <input
                        type="text"
                        value={billConfig.bankName}
                        onChange={(e) => setBillConfig({ ...billConfig, bankName: e.target.value })}
                        className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Account Number</label>
                      <input
                        type="text"
                        value={billConfig.accountNumber}
                        onChange={(e) => setBillConfig({ ...billConfig, accountNumber: e.target.value })}
                        className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-mono font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">IFSC Code</label>
                      <input
                        type="text"
                        value={billConfig.ifscCode}
                        onChange={(e) => setBillConfig({ ...billConfig, ifscCode: e.target.value })}
                        className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-mono font-bold uppercase"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">UPI ID</label>
                      <input
                        type="text"
                        value={billConfig.upiId}
                        onChange={(e) => setBillConfig({ ...billConfig, upiId: e.target.value })}
                        placeholder="e.g. anandbuilders@upi"
                        className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Sub-Card: Custom Terms and Conditions */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Terms & Conditions Printed on Bill
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        id="toggle-print-terms-settings"
                        checked={billConfig.printTermsAndConditions}
                        onChange={(e) => setBillConfig({ ...billConfig, printTermsAndConditions: e.target.checked })}
                        className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                      />
                      <span>Print on Bill</span>
                    </label>
                    <span className="text-[11px] text-slate-400 hidden sm:inline">
                      {billConfig.termsAndConditions.length} conditions configured
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {billConfig.termsAndConditions.map((term, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="w-5 text-center text-xs font-bold text-slate-400">{index + 1}.</span>
                      <input
                        type="text"
                        value={term}
                        onChange={(e) => handleUpdateTerm(index, e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-200 focus:border-primary focus:outline-none px-3 py-2 rounded-xl text-xs text-slate-800"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveTerm(index)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        title="Remove Term"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
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
                    placeholder="Type a new condition / policy note..."
                    className="flex-1 bg-white border border-slate-200 focus:border-primary focus:outline-none px-3.5 py-2 rounded-xl text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddTerm}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            </div>
          )}
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

            {onLoadSampleData && (
              <button
                type="button"
                onClick={handleLoadSample}
                disabled={isSeeding}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors cursor-pointer min-h-[38px]"
                title="Populate system with verified starter plates, customers, and rentals"
              >
                {isSeeding ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                )}
                <span className="truncate">{isMarathi ? '⚡ नमुना डेटा' : '⚡ Load Sample'}</span>
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
