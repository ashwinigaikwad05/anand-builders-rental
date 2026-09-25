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
import type { Rental, Party, RentalCycle, Payment } from '../../../data/adminMockData';

interface SettingsTabProps {
  rentals?: Rental[];
  parties?: Party[];
  rentalCycles?: RentalCycle[];
  payments?: Payment[];
  onDeduplicate?: () => Promise<any>;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  rentals = [],
  parties = [],
  rentalCycles = [],
  payments = [],
  onDeduplicate: _onDeduplicate,
}) => {
  // Business branding & parameters
  const [businessName, setBusinessName] = useState(() => localStorage.getItem('anand_business_name') || 'ANAND BUILDERS & DEVELOPERS');
  const [businessNameMr, setBusinessNameMr] = useState(() => localStorage.getItem('anand_business_name_mr') || 'आनंद बिल्डिंग मटेरियल सप्लायर');
  const [address, setAddress] = useState(() => localStorage.getItem('anand_business_address') || 'Near Old Bus Stand, Solapur Road');
  const [phones, setPhones] = useState(() => localStorage.getItem('anand_business_phones') || '7020914957, 9881985058, 9021519582');

  const [defaultRate, setDefaultRate] = useState<number>(() => parseFloat(localStorage.getItem('anand_default_rate') || '1.50'));
  const [rentalCycle, setRentalCycle] = useState<number>(() => parseInt(localStorage.getItem('anand_rental_cycle') || '40'));

  const [account1Name, setAccount1Name] = useState(() => localStorage.getItem('anand_acc1_name') || 'Account 1 (Bank Direct)');
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
      return {
        ...prev,
        billLanguage: lang,
        billTitle: defaultTitle,
        termsAndConditions: defaultTerms,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">System & Bill Settings</h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Configure business variables, banking info, and customize rental bill templates
          </p>
        </div>

        {/* Live Preview Button in Header */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer"
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
                      ? 'Simple Bill (साधे बिल)'
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
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Language / भाषा</span>
                  <span className="font-bold text-primary capitalize">
                    {billConfig.billLanguage === 'marathi'
                      ? 'मराठी (Marathi)'
                      : 'English'}
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
                      <span className="text-sm font-black text-slate-900">मराठी (Marathi)</span>
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
                        Recommended
                      </span>
                    </div>
                    <h5 className="text-sm font-bold text-slate-900">Simple Bill (साधे बिल)</h5>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      Clean Marathi & English format, simple item table, highlighted outstanding due, and single-page A4 print.
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
                    <h5 className="text-sm font-bold text-slate-900">Modern Standard Challan</h5>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      Full-featured rental bill & dispatch challan. Best for standard yard operations.
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
                    <h5 className="text-sm font-bold text-slate-900">Tax / GST Invoice</h5>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      Includes GSTIN number, HSN/SAC code (9973), and formal tax invoice layout.
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
                    <h5 className="text-sm font-bold text-slate-900">Compact Dispatch Slip</h5>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      Condensed 1-page layout for rapid printing and site driver acknowledgment.
                    </p>
                  </div>
                </div>
              </div>

              {/* Bill Fields Configuration Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase">Bill Document Title</label>
                  <input
                    type="text"
                    value={billConfig.billTitle}
                    onChange={(e) => setBillConfig({ ...billConfig, billTitle: e.target.value })}
                    placeholder="e.g. RENTAL DISPATCH CHALLAN & BILL"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:outline-none px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase">Bill Number Prefix</label>
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
                    GSTIN Registration Number <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
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
                  <label className="text-xs font-bold text-slate-600 uppercase">Signatory Designation Title</label>
                  <input
                    type="text"
                    value={billConfig.signatoryTitle}
                    onChange={(e) => setBillConfig({ ...billConfig, signatoryTitle: e.target.value })}
                    placeholder="e.g. Authorized Signatory / Stamp"
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
                  <span>Display Marathi business subtitle ({businessNameMr})</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={billConfig.showLastPayment}
                    onChange={(e) => setBillConfig({ ...billConfig, showLastPayment: e.target.checked })}
                    className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary"
                  />
                  <span>Show Last Payment & Balance History on Bill</span>
                </label>
              </div>

              {/* Sub-Card: Bank & UPI Payment Details for Bills */}
              <div id="bank-account-settings" className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-4 scroll-mt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-primary" />
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800 block">
                        Bank Account & UPI Details (बँक खाते तपशील)
                      </span>
                      <span className="text-[11px] text-slate-500 font-normal">
                        Add / update Bank Name, Account No, IFSC & UPI printed on all bills
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
                    <span>Print on Bill</span>
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
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="px-5 py-3 rounded-2xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>Preview Bill Template</span>
          </button>
          <button
            type="submit"
            className="bg-primary hover:bg-primary-dark text-white font-bold px-7 py-3 rounded-2xl shadow-lg hover:shadow-orange-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings Changes</span>
          </button>
        </div>
      </form>

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
    </div>
  );
};
