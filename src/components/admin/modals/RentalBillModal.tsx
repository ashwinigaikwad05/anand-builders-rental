import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Printer,
  X,
  ShieldCheck,
  Phone,
  Calendar,
  User,
  Package,
  Landmark,
  Languages,
  Edit2,
  Check,
  FileBadge,
  MessageSquare,
  Loader2,
  Copy,
  Save,
} from 'lucide-react';
import type { Rental, RentalCycle, Party, Payment, ReturnLog } from '../../../data/adminMockData';
import { getPenaltyTypeLabel } from '../../../data/adminMockData';
import { calculatePartialReturnsBreakdown } from '../../../lib/supabase';
import {
  getBillTemplateConfig,
  saveBillTemplateConfig,
  MARATHI_TERMS,
  ENGLISH_TERMS,
  PAPER_SIZE_OPTIONS,
  PAPER_ORIENTATION_OPTIONS,
  PAPER_MARGIN_OPTIONS,
  type BillTemplateConfig,
  type BillTemplateStyle,
  type BillLanguage,
  type BillPaperSize,
  type BillPaperOrientation,
  type BillPaperMargin,
  type BillCopyType,
} from '../../../utils/billTemplateUtils';
import { formatPartyName, formatPlateType } from '../../../utils/marathiUtils';
import {
  autoShareBillPdfViaWhatsApp,
  copyBillImageToClipboard,
} from '../../../utils/billPdfShareUtils';

interface RentalBillModalProps {
  rental: Rental;
  activeCycle?: RentalCycle;
  rentalCycles?: RentalCycle[];
  party?: Party;
  payments?: Payment[];
  returns?: ReturnLog[];
  templateConfig?: BillTemplateConfig;
  finances?: {
    elapsedDays: number;
    standardDays: number;
    extraDays: number;
    baseRent?: number;
    extraAmount: number;
    totalAmount: number;
    pendingAmount: number;
  };
  billNumber?: number | string;
  customerNumber?: number | string;
  autoShareWhatsApp?: boolean;
  onUpdateBillNumber?: (rentalId: string, newBillNumber: number | string) => void;
  onClose: () => void;
}

export const RentalBillModal: React.FC<RentalBillModalProps> = ({
  rental,
  activeCycle,
  rentalCycles = [],
  party,
  payments = [],
  returns = [],
  templateConfig,
  finances,
  billNumber: billNumberProp,
  customerNumber: customerNumberProp,
  autoShareWhatsApp = false,
  onUpdateBillNumber,
  onClose,
}) => {
  const [billConfig, setBillConfig] = useState<BillTemplateConfig>(
    () => templateConfig || getBillTemplateConfig()
  );
  const config = billConfig;
  // Auto-select Simple Bill ('simple') by default whenever opening the bill modal
  const [selectedStyle, setSelectedStyle] = useState<BillTemplateStyle>(
    templateConfig?.templateStyle || 'simple'
  );
  const [selectedLanguage, setSelectedLanguage] = useState<BillLanguage>(config.billLanguage || 'marathi');
  const [printTerms, setPrintTerms] = useState<boolean>(
    config.printTermsAndConditions !== undefined ? Boolean(config.printTermsAndConditions) : true
  );
  const [showCycles, setShowCycles] = useState<boolean>(true);
  const [showPayments, setShowPayments] = useState<boolean>(true);
  const [showBankDetails, setShowBankDetails] = useState<boolean>(() => {
    if (templateConfig?.showBankDetails !== undefined) {
      return Boolean(templateConfig.showBankDetails);
    }
    return billConfig.showBankDetails !== false;
  });
  const [isEditingBankModalOpen, setIsEditingBankModalOpen] = useState<boolean>(false);
  const [bankEditForm, setBankEditForm] = useState({
    bankName: billConfig.bankName || '',
    accountNumber: billConfig.accountNumber || '',
    ifscCode: billConfig.ifscCode || '',
    upiId: billConfig.upiId || '',
    showBankDetails: billConfig.showBankDetails !== false,
  });
  const [bankSaveSuccess, setBankSaveSuccess] = useState<string | null>(null);

  const [showKycDocs, setShowKycDocs] = useState<boolean>(() => {
    const stored = localStorage.getItem('anand_bill_show_kyc_docs');
    if (stored !== null) return stored === 'true';
    return Boolean(config.showKycDocuments);
  });
  const [enlargedImage, setEnlargedImage] = useState<{ url: string; title: string } | null>(null);

  // Bill Paper Format & Print Settings
  const [paperSize, setPaperSize] = useState<BillPaperSize>(
    templateConfig?.paperSize || config.paperSize || 'a4'
  );
  const [paperOrientation, setPaperOrientation] = useState<BillPaperOrientation>(
    templateConfig?.paperOrientation || config.paperOrientation || 'portrait'
  );
  const [paperMargin, setPaperMargin] = useState<BillPaperMargin>(
    templateConfig?.paperMargin || config.paperMargin || 'normal'
  );
  const [fitToSinglePage, setFitToSinglePage] = useState<boolean>(
    templateConfig?.fitToSinglePage !== undefined
      ? Boolean(templateConfig.fitToSinglePage)
      : config.fitToSinglePage !== false
  );
  const [billCopyType, setBillCopyType] = useState<BillCopyType>('none');
  const [twoBillsPerPage, setTwoBillsPerPage] = useState<boolean>(
    templateConfig?.twoBillsPerPage !== undefined
      ? Boolean(templateConfig.twoBillsPerPage)
      : (config.twoBillsPerPage ?? (config.paperSize === 'a4_2in1' || templateConfig?.paperSize === 'a4_2in1'))
  );
  const [twoBillsSecondCopyLabel, setTwoBillsSecondCopyLabel] = useState<'office' | 'duplicate' | 'store'>(
    templateConfig?.twoBillsSecondCopyLabel || config.twoBillsSecondCopyLabel || 'office'
  );
  const [isPaperSettingsOpen, setIsPaperSettingsOpen] = useState<boolean>(false);

  const [isSharingWhatsApp, setIsSharingWhatsApp] = useState<boolean>(false);
  const [shareToast, setShareToast] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  // Sync when templateConfig prop updates (e.g. previewing from settings)
  useEffect(() => {
    if (templateConfig) {
      setBillConfig(templateConfig);
      if (templateConfig.showBankDetails !== undefined) {
        setShowBankDetails(Boolean(templateConfig.showBankDetails));
      }
      if (templateConfig.paperSize) {
        setPaperSize(templateConfig.paperSize);
      }
      if (templateConfig.paperOrientation) {
        setPaperOrientation(templateConfig.paperOrientation);
      }
      if (templateConfig.paperMargin) {
        setPaperMargin(templateConfig.paperMargin);
      }
      if (templateConfig.fitToSinglePage !== undefined) {
        setFitToSinglePage(Boolean(templateConfig.fitToSinglePage));
      }
      if (templateConfig.billCopyType) {
        setBillCopyType(templateConfig.billCopyType);
      }
      if (templateConfig.twoBillsPerPage !== undefined) {
        setTwoBillsPerPage(Boolean(templateConfig.twoBillsPerPage));
      } else if (templateConfig.paperSize === 'a4_2in1') {
        setTwoBillsPerPage(true);
      }
      if (templateConfig.twoBillsSecondCopyLabel) {
        setTwoBillsSecondCopyLabel(templateConfig.twoBillsSecondCopyLabel);
      }
    }
  }, [templateConfig]);

  useEffect(() => {
    setBankEditForm((prev) => ({
      ...prev,
      bankName: billConfig.bankName || '',
      accountNumber: billConfig.accountNumber || '',
      ifscCode: billConfig.ifscCode || '',
      upiId: billConfig.upiId || '',
      showBankDetails: showBankDetails,
    }));
  }, [billConfig, showBankDetails]);

  useEffect(() => {
    if (templateConfig?.templateStyle) {
      setSelectedStyle(templateConfig.templateStyle);
    }
  }, [templateConfig?.templateStyle]);

  useEffect(() => {
    if (templateConfig?.printTermsAndConditions !== undefined) {
      setPrintTerms(Boolean(templateConfig.printTermsAndConditions));
    }
  }, [templateConfig?.printTermsAndConditions]);

  useEffect(() => {
    if (templateConfig?.showKycDocuments !== undefined) {
      setShowKycDocs(Boolean(templateConfig.showKycDocuments));
    }
  }, [templateConfig?.showKycDocuments]);

  // Ensure simple bill is saved as default template style if not set
  useEffect(() => {
    const latestConfig = getBillTemplateConfig();
    if (!latestConfig.templateStyle || latestConfig.templateStyle !== 'simple') {
      saveBillTemplateConfig({
        ...latestConfig,
        templateStyle: 'simple',
      });
    }
  }, []);

  const handleSelectStyle = (style: BillTemplateStyle) => {
    setSelectedStyle(style);
    const latestConfig = getBillTemplateConfig();
    saveBillTemplateConfig({
      ...latestConfig,
      templateStyle: style,
    });
  };

  const handleSelectLanguage = (lang: BillLanguage) => {
    setSelectedLanguage(lang);
    const latestConfig = getBillTemplateConfig();
    saveBillTemplateConfig({
      ...latestConfig,
      billLanguage: lang,
    });
  };

  const handleTogglePrintTerms = (checked: boolean) => {
    setPrintTerms(checked);
    const latestConfig = getBillTemplateConfig();
    saveBillTemplateConfig({
      ...latestConfig,
      printTermsAndConditions: checked,
    });
  };

  const handleToggleShowKycDocs = (checked: boolean) => {
    setShowKycDocs(checked);
    try {
      localStorage.setItem('anand_bill_show_kyc_docs', String(checked));
    } catch {
      // ignore
    }
    const latestConfig = getBillTemplateConfig();
    saveBillTemplateConfig({
      ...latestConfig,
      showKycDocuments: checked,
    });
  };

  const handleToggleShowBankDetails = (checked: boolean) => {
    setShowBankDetails(checked);
    const updated = {
      ...billConfig,
      showBankDetails: checked,
    };
    setBillConfig(updated);
    saveBillTemplateConfig(updated);
  };

  const handleOpenBankEdit = () => {
    setBankEditForm({
      bankName: billConfig.bankName || '',
      accountNumber: billConfig.accountNumber || '',
      ifscCode: billConfig.ifscCode || '',
      upiId: billConfig.upiId || '',
      showBankDetails: showBankDetails,
    });
    setBankSaveSuccess(null);
    setIsEditingBankModalOpen(true);
  };

  const handleSaveBankEdit = (saveAsDefault = true) => {
    const updated: BillTemplateConfig = {
      ...billConfig,
      bankName: bankEditForm.bankName.trim(),
      accountNumber: bankEditForm.accountNumber.trim(),
      ifscCode: bankEditForm.ifscCode.trim().toUpperCase(),
      upiId: bankEditForm.upiId.trim(),
      showBankDetails: bankEditForm.showBankDetails,
    };
    setBillConfig(updated);
    setShowBankDetails(bankEditForm.showBankDetails);
    if (saveAsDefault) {
      saveBillTemplateConfig(updated);
      setBankSaveSuccess(
        selectedLanguage === 'marathi'
          ? 'बँक माहिती सर्व बिलांसाठी सेव्ह झाली!'
          : 'Bank details saved for all bills!'
      );
    } else {
      setBankSaveSuccess(
        selectedLanguage === 'marathi'
          ? 'बँक माहिती या बिलासाठी लागू झाली!'
          : 'Bank details applied to this bill!'
      );
    }
    setTimeout(() => {
      setIsEditingBankModalOpen(false);
      setBankSaveSuccess(null);
    }, 800);
  };

  // Add body class to hide background app during printing
  useEffect(() => {
    document.body.classList.add('bill-modal-open');
    return () => {
      document.body.classList.remove('bill-modal-open');
    };
  }, []);

  // Business branding from settings or defaults
  const businessName = localStorage.getItem('anand_business_name') || 'ANAND BUILDERS & DEVELOPERS';
  const businessNameMr = localStorage.getItem('anand_business_name_mr') || 'आनंद बिल्डर्स अँड डेव्हलपर्स';
  const address = localStorage.getItem('anand_business_address') || 'Near Old Bus Stand, Solapur Road';
  const phones = localStorage.getItem('anand_business_phones') || '7020914957, 9881985058, 9021519582';

  // Sequential Bill Number (1, 2, 3...) and Customer Number (1, 2, 3...)
  const initialBillNo = String(billNumberProp ?? rental.billNumber ?? 1);
  const [currentBillNo, setCurrentBillNo] = useState<string>(initialBillNo);
  const [tempBillNo, setTempBillNo] = useState<string>(initialBillNo);
  const [isEditingBillNo, setIsEditingBillNo] = useState<boolean>(false);

  useEffect(() => {
    const b = String(billNumberProp ?? rental.billNumber ?? 1);
    setCurrentBillNo(b);
    setTempBillNo(b);
  }, [billNumberProp, rental.billNumber]);

  const handleSaveBillNumber = () => {
    const trimmed = tempBillNo.trim();
    if (!trimmed) return;
    setCurrentBillNo(trimmed);
    setIsEditingBillNo(false);

    try {
      let saved: Record<string, number | string> = {};
      try {
        saved = JSON.parse(localStorage.getItem('anand_custom_bill_numbers') || '{}');
      } catch {
        saved = {};
      }
      saved[rental.id] = trimmed;
      localStorage.setItem('anand_custom_bill_numbers', JSON.stringify(saved));
    } catch {
      // ignore
    }

    if (onUpdateBillNumber) {
      onUpdateBillNumber(rental.id, trimmed);
    }
  };

  // Resolve party details (including KYC photos) from prop or local storage fallback
  const resolvedParty: Party | undefined = React.useMemo(() => {
    if (party && (party.photoUrl || party.aadhaarUrl || party.aadhaarBackUrl || party.chequeUrl)) {
      return party;
    }
    try {
      const raw = localStorage.getItem('anand_parties');
      if (raw) {
        const all: Party[] = JSON.parse(raw);
        const found = all.find(
          (p) =>
            (party?.id && p.id === party.id) ||
            (rental.partyId && p.id === rental.partyId) ||
            p.name.trim().toLowerCase() === (party?.name || rental.partyName || '').trim().toLowerCase()
        );
        if (found) {
          return { ...(party || {}), ...found };
        }
      }
    } catch {
      // ignore
    }
    return party;
  }, [party, rental.partyId, rental.partyName]);

  const rawPartyName = resolvedParty?.name || party?.name || rental.partyName;
  const partyDisplayName = formatPartyName(rawPartyName, selectedLanguage);
  const partyDisplayMobile = resolvedParty?.mobile || party?.mobile || '';
  const partyDisplayAddress = resolvedParty?.address || party?.address || '';
  const assignedCustomerNumber = customerNumberProp ?? resolvedParty?.customerNumber ?? party?.customerNumber ?? rental.customerNumber ?? 1;
  const billNumber = currentBillNo;

  const issueDateFormatted = rental.issueDate
    ? new Date(rental.issueDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const cycleStartDate = activeCycle?.startDate || rental.currentCycleStartDate || rental.issueDate;
  const cycleEndDate = activeCycle?.expectedEndDate || rental.currentCycleEndDate || '';

  const cycleStartFormatted = cycleStartDate
    ? new Date(cycleStartDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '-';
  const cycleEndFormatted = cycleEndDate
    ? new Date(cycleEndDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : (selectedLanguage === 'marathi' ? '४० दिवसांनंतर' : '40 Days from issue');

  const cycleDays = activeCycle?.days || rental.days || 40;

  // Itemized plates list
  const plateItems = (() => {
    if (activeCycle?.items && activeCycle.items.length > 0) {
      return activeCycle.items;
    }
    if (rental.items && rental.items.length > 0) {
      return rental.items;
    }
    return [
      {
        plateType: rental.plateType,
        quantity: rental.quantity,
        dailyRate: rental.dailyRate,
        days: rental.days || 40,
      },
    ];
  })();

  const partialBreakdown = React.useMemo(() => {
    if (!returns || returns.length === 0) return null;
    const dailyRate = activeCycle?.dailyRate || 
      (rental.items && rental.items.length > 0 && rental.items[0].dailyRate 
        ? rental.items[0].dailyRate 
        : (rental.dailyRate || 1.5));
    return calculatePartialReturnsBreakdown({
      startDate: activeCycle?.startDate || rental.currentCycleStartDate || rental.issueDate,
      initialQuantity: rental.quantity,
      dailyRate: dailyRate,
      cycleDays: 40,
      returns: returns.map((r) => ({ returnDate: r.returnDate, returnedQuantity: r.returnedQuantity })),
    });
  }, [returns, activeCycle, rental]);

  const totalCycleAmount = partialBreakdown
    ? partialBreakdown.totalRent
    : (finances?.totalAmount ?? activeCycle?.totalAmount ?? rental.totalRent);
  const totalPaidAmount = activeCycle?.paidAmount ?? rental.paid;
  const totalPendingAmount = partialBreakdown
    ? Math.max(0, partialBreakdown.totalRent - totalPaidAmount)
    : (finances?.pendingAmount ?? activeCycle?.pendingAmount ?? rental.pending);
  const extraDays = finances?.extraDays ?? activeCycle?.extraDays ?? 0;
  const extraAmount = finances?.extraAmount ?? activeCycle?.extraAmount ?? 0;

  // Process all rental cycles (from props, rental object, or fallback to activeCycle)
  const allCycles: RentalCycle[] = (() => {
    if (rentalCycles && rentalCycles.length > 0) {
      return [...rentalCycles].sort((a, b) => a.cycleNumber - b.cycleNumber);
    }
    if (rental.cycles && rental.cycles.length > 0) {
      return [...rental.cycles].sort((a, b) => a.cycleNumber - b.cycleNumber);
    }
    if (activeCycle) {
      return [activeCycle];
    }
    // Baseline fallback if none
    return [
      {
        id: `fallback-${rental.id}`,
        rentalId: rental.id,
        partyId: rental.partyId,
        cycleNumber: rental.currentCycleNumber || 1,
        startDate: rental.currentCycleStartDate || rental.issueDate,
        expectedEndDate: rental.currentCycleEndDate || '',
        days: rental.days || 40,
        extraDays: extraDays || 0,
        dailyRate: rental.dailyRate,
        quantity: rental.quantity,
        baseRent: totalCycleAmount - extraAmount,
        extraAmount: extraAmount,
        totalAmount: totalCycleAmount,
        paidAmount: totalPaidAmount,
        pendingAmount: totalPendingAmount,
        status: rental.status === 'returned' ? 'completed' : 'active',
      },
    ];
  })();

  // Filter and sort payments belonging to this rental or party
  const rentalPayments: Payment[] = (() => {
    const list: Payment[] = [];
    if (payments && payments.length > 0) {
      const matched = payments
        .filter((p) => (p.rentalId && p.rentalId === rental.id) || (p.partyId && p.partyId === rental.partyId))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      list.push(...matched);
    }

    // Synthesize payment entries if cycle paid amounts or rental advance exists but no explicit payments table rows
    if (list.length === 0) {
      const cyclePayments: Payment[] = [];
      allCycles.forEach((c) => {
        if ((c.paidAmount || 0) > 0) {
          cyclePayments.push({
            id: `pay-cycle-${c.id || c.cycleNumber}`,
            partyId: rental.partyId,
            partyName: rental.partyName,
            rentalId: rental.id,
            cycleId: c.id,
            cycleNumber: c.cycleNumber,
            amount: c.paidAmount,
            date: c.startDate || rental.issueDate,
            paymentMode: rental.paymentMode === 'Udhari' ? 'Outstanding' : (rental.paymentMode as any),
            reference: `Cycle #${c.cycleNumber} Payment`,
            notes: `Recorded payment for Cycle #${c.cycleNumber}`,
            status: 'verified',
          });
        }
      });

      if (cyclePayments.length > 0) {
        list.push(...cyclePayments);
      } else if (totalPaidAmount > 0) {
        list.push({
          id: `pay-initial-${rental.id}`,
          partyId: rental.partyId,
          partyName: rental.partyName,
          rentalId: rental.id,
          cycleNumber: 1,
          amount: totalPaidAmount,
          date: rental.issueDate,
          paymentMode: rental.paymentMode === 'Udhari' ? 'Outstanding' : (rental.paymentMode as any),
          reference: 'Advance Payment',
          notes: 'Initial advance paid at material dispatch',
          status: 'verified',
        });
      }
    }
    return list;
  })();

  // Financial aggregates across all cycles & payments
  const allCyclesTotalRent = allCycles.length > 1
    ? allCycles.reduce((sum, c) => sum + (c.totalAmount || c.baseRent || 0), 0)
    : totalCycleAmount;

  const totalPaymentsReceived = rentalPayments.reduce((sum, p) => sum + (p.type === 'refund' ? -p.amount : (p.amount || 0)), 0);

  const allCyclesTotalPaid = rentalPayments.length > 0
    ? totalPaymentsReceived
    : (allCycles.length > 0
        ? allCycles.reduce((sum, c) => sum + (c.paidAmount || 0), 0)
        : totalPaidAmount);

  // All penalties associated with this rental (from payments or returns)
  const rentalPenalties = [
    ...rentalPayments
      .filter((p) => p.penaltyAmount && p.penaltyAmount > 0)
      .map((p) => ({
        amount: Number(p.penaltyAmount),
        type: p.penaltyType || 'damage',
        label: getPenaltyTypeLabel(p.penaltyType, selectedLanguage === 'marathi'),
      })),
    ...returns
      .filter((r: ReturnLog) => r.rentalId === rental.id && r.penaltyAmount && r.penaltyAmount > 0)
      .map((r: ReturnLog) => ({
        amount: Number(r.penaltyAmount),
        type: r.penaltyType || 'damage',
        label: getPenaltyTypeLabel(r.penaltyType, selectedLanguage === 'marathi'),
      })),
  ];

  const totalPenaltyAmount = rentalPenalties.reduce((sum, p) => sum + p.amount, 0);
  const penaltyTypesSummary = Array.from(new Set(rentalPenalties.map((p) => p.label))).join(', ');
  const grandTotalWithPenalties = allCyclesTotalRent + totalPenaltyAmount;

  const allCyclesBalanceDue = Math.max(0, grandTotalWithPenalties - allCyclesTotalPaid);
  const allCyclesRefundDue = Math.max(0, allCyclesTotalPaid - grandTotalWithPenalties);
  const currentActiveCycleNumber = activeCycle?.cycleNumber || rental.currentCycleNumber || 1;

  const isSimple = selectedStyle === 'simple';
  const isTaxInvoice = selectedStyle === 'tax_invoice';
  const isCompact = selectedStyle === 'compact';

  // Sanitized Payment Mode - strictly pure language, no "Udhari" or mixed terms
  const cleanPaymentMode = (mode?: string, lang: BillLanguage = selectedLanguage) => {
    if (!mode) {
      return lang === 'marathi' ? 'बाकी' : 'Outstanding';
    }
    const lower = mode.toLowerCase();
    if (lower === 'udhari' || lower === 'outstanding' || lower === 'credit') {
      return lang === 'marathi' ? 'बाकी' : 'Outstanding';
    }
    if (lower === 'cash' || lower === 'rokh' || lower === 'रोख') {
      return lang === 'marathi' ? 'रोख' : 'Cash';
    }
    if (lower === 'upi') {
      return 'UPI';
    }
    if (lower === 'cheque' || lower === 'चेक') {
      return lang === 'marathi' ? 'चेक' : 'Cheque';
    }
    if (lower.includes('bank') || lower.includes('transfer')) {
      return lang === 'marathi' ? 'बँक ट्रान्सफर' : 'Bank Transfer';
    }
    return mode;
  };

  // Translations dictionary for dynamic language switching
  const t = {
    marathi: {
      sacred: '॥ श्री गणेशाय नमः ॥',
      businessTitle: businessNameMr,
      businessSubtitle: '',
      tagline: 'सेन्टरिंग प्लेट्स, कॉलम बॉक्सेस आणि बांधकाम साहित्य भाड्याने मिळतील',
      addressPrefix: 'पत्ता:',
      billTitle: 'भाडे पावती व साहित्य चालान',
      billNoLabel: 'पावती क्र.:',
      customerTitle: 'ग्राहकाचे नाव:',
      contactLabel: 'मोबाईल नं.:',
      siteLabel: 'कामाचे ठिकाण:',
      challanDetailsTitle: 'पावती तपशील:',
      issueDateLabel: 'दिनांक:',
      termLabel: 'भाडे मुदत:',
      termValue: `${cycleDays} दिवस सामान्य मुदत`,
      periodLabel: 'कालावधी:',
      paymentModeLabel: 'पेमेंट पद्धत:',
      srNo: 'अ.क्र.',
      particulars: 'साहित्याचे नाव',
      qty: 'नग',
      term: 'मुदत',
      ratePerDay: 'दर/दिवस',
      totalRent: 'एकूण भाडे (₹)',
      platePrefix: 'सेन्टरिंग प्लेट',
      plateSub: 'हेवी-गेज स्टील प्लेट्स',
      nosSuffix: 'नग',
      daysSuffix: 'दिवस',
      extraDaysTitle: `अतिरिक्त वापर दिवस (${cycleDays} दिवसांनंतर)`,
      extraDaysSub: `${cycleDays} दिवसांच्या मुदतीनंतरचा प्रतिदिन वापर`,
      bankTitle: 'बँक व डिजिटल पेमेंट तपशील:',
      bankLabel: 'बँक:',
      acNoLabel: 'खाते क्र.:',
      ifscLabel: 'आयएफएससी कोड:',
      upiLabel: 'युपीआय आयडी:',
      termsTitle: 'नियम व अटी:',
      summaryTitle: 'हिशोब सारांश',
      baseRentLabel: `${cycleDays} दिवसांचे भाडे:`,
      extraRentLabel: 'अतिरिक्त दिवस भाडे:',
      totalDueLabel: 'एकूण देय रक्कम:',
      paidLabel: 'जमा रक्कम:',
      outstandingLabel: 'निव्वळ येणे बाकी:',
      customerSign: 'ग्राहकाची सही',
      customerSignSub: `साहित्य सुस्थितीत मिळाले (${partyDisplayName})`,
      authorizedSign: `${businessNameMr} करिता`,
      authorizedSignSub:
        config.signatoryTitle &&
        !config.signatoryTitle.toLowerCase().includes('authorized') &&
        !config.signatoryTitle.includes('/')
          ? config.signatoryTitle
          : 'अधिकृत स्वाक्षरी',
      footerNote: `संगणकीकृत भाडे पावती • ${businessNameMr} • ${address}`,
      cyclesTitle: 'भाडे सायकल तपशील व इतिहास',
      cycleCol: 'सायकल #',
      cyclePeriodCol: 'कालावधी',
      cycleDaysCol: 'दिवस',
      cycleRentCol: 'भाडे (₹)',
      cyclePaidCol: 'जमा (₹)',
      cyclePendingCol: 'बाकी (₹)',
      cycleStatusCol: 'स्थिती',
      activeCycleBadge: 'चालू',
      completedCycleBadge: 'पूर्ण',
      overdueCycleBadge: 'मुदत संपली',
      paymentsTitle: 'जमा पेमेंट्स व पावती नोंद',
      paymentDateCol: 'दिनांक',
      paymentModeCol: 'पेमेंट प्रकार',
      paymentCycleCol: 'सायकल',
      paymentRefCol: 'संदर्भ',
      paymentAmtCol: 'जमा रक्कम (₹)',
      noPaymentsText: 'या भाडे खात्यावर अद्याप कोणतेही पेमेंट जमा नोंदवलेले नाही.',
      totalCyclesRentLabel: 'सर्व सायकल्स एकूण भाडे:',
      totalPaidPaymentsLabel: 'एकूण जमा पेमेंट्स:',
      netAllCyclesDueLabel: 'एकूण निव्वळ येणे बाकी:',
      activeCycleLabel: 'चालू सायकल:',
    },
    english: {
      sacred: '',
      businessTitle: businessName,
      businessSubtitle: '',
      tagline: 'Heavy-Duty Steel Shuttering Plates, Columns & Scaffolding Material on Rental',
      addressPrefix: 'Yard Address:',
      billTitle: 'RENTAL BILL & DELIVERY CHALLAN',
      billNoLabel: 'BILL NO.:',
      customerTitle: 'Customer Details:',
      contactLabel: 'Mobile No.:',
      siteLabel: 'Delivery Site Address:',
      challanDetailsTitle: 'Challan Details:',
      issueDateLabel: 'Issue Date:',
      termLabel: 'Rental Term:',
      termValue: `${cycleDays} Days Normal Cycle`,
      periodLabel: 'Cycle Period:',
      paymentModeLabel: 'Payment Mode:',
      srNo: 'Sr. No.',
      particulars: 'Item Description',
      qty: 'Qty',
      term: 'Period',
      ratePerDay: 'Rate/Day',
      totalRent: 'Total Rent (₹)',
      platePrefix: 'Steel Shuttering Plate',
      plateSub: 'Heavy-gauge standard centering plate',
      nosSuffix: 'Nos',
      daysSuffix: 'Days',
      extraDaysTitle: `Extended Usage Beyond ${cycleDays}-Day Standard Cycle`,
      extraDaysSub: 'Daily rental applied beyond cycle return date',
      bankTitle: 'Bank & UPI Payment Information:',
      bankLabel: 'Bank:',
      acNoLabel: 'A/C No:',
      ifscLabel: 'IFSC Code:',
      upiLabel: 'UPI ID:',
      termsTitle: 'Terms & Conditions:',
      summaryTitle: 'Payment Summary',
      baseRentLabel: `Standard ${cycleDays}-Day Rent:`,
      extraRentLabel: 'Extra Overdue Rent:',
      totalDueLabel: 'Total Billed Amount:',
      paidLabel: 'Advance / Total Paid:',
      outstandingLabel: 'Net Outstanding Due:',
      customerSign: 'Customer Signature',
      customerSignSub: `Material Received in Good Condition (${partyDisplayName})`,
      authorizedSign: `For ${businessName}`,
      authorizedSignSub:
        config.signatoryTitle &&
        !config.signatoryTitle.includes('अधिकृत') &&
        !config.signatoryTitle.includes('सही') &&
        !config.signatoryTitle.includes('/')
          ? config.signatoryTitle
          : 'Authorized Signatory',
      footerNote: `Computer-generated rental challan & bill issued by ${businessName}.`,
      cyclesTitle: 'Rental Cycles Breakdown & History',
      cycleCol: 'Cycle #',
      cyclePeriodCol: 'Period',
      cycleDaysCol: 'Days',
      cycleRentCol: 'Rent (₹)',
      cyclePaidCol: 'Paid (₹)',
      cyclePendingCol: 'Due (₹)',
      cycleStatusCol: 'Status',
      activeCycleBadge: 'Active',
      completedCycleBadge: 'Completed',
      overdueCycleBadge: 'Overdue',
      paymentsTitle: 'Payment Receipts & Transactions Log',
      paymentDateCol: 'Date',
      paymentModeCol: 'Payment Mode',
      paymentCycleCol: 'Cycle',
      paymentRefCol: 'Reference / Notes',
      paymentAmtCol: 'Amount Paid (₹)',
      noPaymentsText: 'No payments recorded yet for this rental.',
      totalCyclesRentLabel: 'Total Rent (All Cycles):',
      totalPaidPaymentsLabel: 'Total Paid / Received:',
      netAllCyclesDueLabel: 'Net Outstanding Due:',
      activeCycleLabel: 'Active Cycle:',
    },
  };

  const currentT = t[selectedLanguage] || t.marathi;

  // Active terms: use user's configured terms if present, otherwise default to language terms
  const activeTerms = (() => {
    if (config.termsAndConditions && Array.isArray(config.termsAndConditions) && config.termsAndConditions.length > 0) {
      return config.termsAndConditions;
    }
    return selectedLanguage === 'marathi' ? MARATHI_TERMS : ENGLISH_TERMS;
  })();

  const handlePrint = () => {
    window.print();
  };


  const handleShareWhatsApp = async () => {
    const sheetEl = document.getElementById('rental-bill-sheet');
    if (!sheetEl) return;

    try {
      setIsSharingWhatsApp(true);
      await autoShareBillPdfViaWhatsApp(
        sheetEl,
        {
          billNumber,
          partyName: rawPartyName,
          partyMobile: partyDisplayMobile,
          partyAddress: partyDisplayAddress,
          cycleStartDate: cycleStartFormatted !== '-' ? cycleStartFormatted : issueDateFormatted,
          cycleEndDate: cycleEndFormatted,
          cycleDays,
          items: plateItems.map((it) => ({
            plateType: it.plateType,
            quantity: it.quantity,
            dailyRate: it.dailyRate,
            days: it.days,
            totalRent: it.quantity * it.dailyRate * (it.days || cycleDays),
          })),
          totalRent: totalCycleAmount,
          paidAmount: totalPaidAmount,
          pendingAmount: totalPendingAmount,
          lang: selectedLanguage,
          phones,
          paperSize,
          paperOrientation,
        },
        (status, message) => {
          if (status === 'shared') {
            setShareToast({
              type: 'success',
              message: message || (selectedLanguage === 'marathi' ? 'बिलाची PDF व्हॉट्सॲपवर पाठवली!' : 'Bill PDF shared on WhatsApp!'),
            });
          } else if (status === 'downloaded') {
            setShareToast({
              type: 'info',
              message: message || (selectedLanguage === 'marathi' ? 'PDF डाउनलोड झाली व व्हॉट्सॲप चॅट उघडली!' : 'PDF downloaded and WhatsApp opened!'),
            });
          } else if (status === 'error') {
            setShareToast({
              type: 'error',
              message: message || (selectedLanguage === 'marathi' ? 'व्हॉट्सॲप शेअर अयशस्वी' : 'Failed to share on WhatsApp'),
            });
          }
        }
      );
    } catch (err: any) {
      setShareToast({
        type: 'error',
        message: err?.message || (selectedLanguage === 'marathi' ? 'व्हॉट्सॲप शेअर करताना त्रुटी आली' : 'Error sharing on WhatsApp'),
      });
    } finally {
      setIsSharingWhatsApp(false);
    }
  };

  const [isCopyingImage, setIsCopyingImage] = useState(false);
  const handleCopyBillImage = async () => {
    const sheetEl = document.getElementById('rental-bill-sheet');
    if (!sheetEl) return;
    try {
      setIsCopyingImage(true);
      const success = await copyBillImageToClipboard(sheetEl);
      if (success) {
        setShareToast({
          type: 'success',
          message: selectedLanguage === 'marathi'
            ? 'बिलाचा फोटो कॉपी झाला! व्हॉट्सॲपमध्ये फक्त Ctrl+V दाबा.'
            : 'Bill image copied to clipboard! Press Ctrl+V in WhatsApp.',
        });
      } else {
        setShareToast({
          type: 'info',
          message: selectedLanguage === 'marathi'
            ? 'ब्राउझरमध्ये इमेज कॉपी उपलब्ध नाही, कृपया WhatsApp PDF वापरा.'
            : 'Clipboard image copy unavailable, please use WhatsApp PDF.',
        });
      }
    } catch {
      setShareToast({
        type: 'error',
        message: selectedLanguage === 'marathi' ? 'फोटो कॉपी करताना त्रुटी आली' : 'Failed to copy image',
      });
    } finally {
      setIsCopyingImage(false);
    }
  };

  // Trigger automatic WhatsApp sharing if explicitly requested via prop
  const hasAutoSharedRef = React.useRef(false);
  useEffect(() => {
    if (autoShareWhatsApp && !hasAutoSharedRef.current) {
      hasAutoSharedRef.current = true;
      const timer = setTimeout(() => {
        handleShareWhatsApp();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [autoShareWhatsApp]);

  const renderKycDocumentsSection = (isSimpleBill: boolean) => {
    if (!showKycDocs) return null;

    const allDocs = [
      {
        id: 'photo',
        title: selectedLanguage === 'marathi' ? 'ग्राहक फोटो' : 'Customer Face Photo',
        icon: User,
        iconColor: 'text-emerald-600',
        url: resolvedParty?.photoUrl,
      },
      {
        id: 'aadhaarFront',
        title: selectedLanguage === 'marathi' ? 'आधार कार्ड (पुढील बाजू)' : 'Aadhaar Card (Front)',
        icon: FileBadge,
        iconColor: 'text-blue-600',
        url: resolvedParty?.aadhaarUrl,
      },
      {
        id: 'aadhaarBack',
        title: selectedLanguage === 'marathi' ? 'आधार कार्ड (मागील बाजू)' : 'Aadhaar Card (Back)',
        icon: FileBadge,
        iconColor: 'text-indigo-600',
        url: resolvedParty?.aadhaarBackUrl,
      },
      {
        id: 'cheque',
        title: selectedLanguage === 'marathi' ? 'सुरक्षा चेक' : 'Security Cheque',
        icon: Landmark,
        iconColor: 'text-amber-600',
        url: resolvedParty?.chequeUrl,
      },
    ];

    // Filter to ONLY documents that have actually been uploaded
    const uploadedDocs = allDocs.filter(
      (d) => Boolean(d.url && typeof d.url === 'string' && d.url.trim().length > 0)
    );

    // If no documents are uploaded, do NOT show 4 empty boxes on bill.
    // In print mode, hide completely. On screen, show a clean informative banner.
    if (uploadedDocs.length === 0) {
      return (
        <div
          data-no-print="true"
          className="no-print print:hidden kyc-empty-placeholder mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500 italic flex items-center justify-center gap-2"
        >
          <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
          <span>
            {selectedLanguage === 'marathi'
              ? 'टीप: या ग्राहकासाठी अद्याप कोणतेही केवायसी कागदपत्रे अपलोड केलेली नाहीत (ग्राहक खात्यामधून फोटो किंवा आधार जोडू शकता).'
              : 'Note: No KYC document photos have been uploaded for this customer yet (can be added from Customers Tab).'}
          </span>
        </div>
      );
    }

    // Adaptive grid and height based on the number of uploaded documents
    let gridColsClass = 'grid-cols-2 sm:grid-cols-4 print:grid-cols-4';
    let imgHeightClass = 'h-32 sm:h-36 print:h-28';
    let containerMaxWidthClass = 'w-full';

    if (uploadedDocs.length === 1) {
      gridColsClass = 'grid-cols-1';
      imgHeightClass = 'h-48 sm:h-56 print:h-44';
      containerMaxWidthClass = 'max-w-xs mx-auto';
    } else if (uploadedDocs.length === 2) {
      gridColsClass = 'grid-cols-2 print:grid-cols-2';
      imgHeightClass = 'h-36 sm:h-44 print:h-32';
      containerMaxWidthClass = 'max-w-lg mx-auto';
    } else if (uploadedDocs.length === 3) {
      gridColsClass = 'grid-cols-3 print:grid-cols-3';
      imgHeightClass = 'h-32 sm:h-36 print:h-28';
      containerMaxWidthClass = 'max-w-2xl mx-auto';
    } else {
      gridColsClass = 'grid-cols-2 sm:grid-cols-4 print:grid-cols-4';
      imgHeightClass = 'h-32 sm:h-36 print:h-28';
      containerMaxWidthClass = 'w-full';
    }

    return (
      <div className={`mt-5 pt-3.5 ${isSimpleBill ? 'border-t-2 border-slate-900' : 'border-t-2 border-slate-800'} print:break-inside-avoid print:mt-3 print:pt-2`}>
        <div className="flex items-center justify-between pb-1.5 mb-2.5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
              {selectedLanguage === 'marathi'
                ? 'ग्राहक ओळख व सुरक्षा दस्तऐवज'
                : 'Customer Identification & Security Documents (KYC)'}
            </h4>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
            <span>
              {selectedLanguage === 'marathi' ? 'ग्राहक:' : 'Customer:'} {partyDisplayName}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono text-[9px] font-black">
              {uploadedDocs.length} {selectedLanguage === 'marathi' ? 'दस्तऐवज' : 'Document(s)'}
            </span>
          </div>
        </div>

        <div className={containerMaxWidthClass}>
          <div className={`grid ${gridColsClass} gap-2.5 sm:gap-3 print:gap-2.5`}>
            {uploadedDocs.map((doc) => (
              <div
                key={doc.id}
                className="group relative border border-slate-300 rounded-xl overflow-hidden bg-white shadow-2xs hover:shadow-md transition-all cursor-pointer p-1.5"
                onClick={() => {
                  if (doc.url) setEnlargedImage({ url: doc.url, title: doc.title });
                }}
                title={selectedLanguage === 'marathi' ? 'मोठे करून पाहण्यासाठी क्लिक करा' : 'Click to enlarge'}
              >
                <div className={`${imgHeightClass} w-full flex items-center justify-center bg-slate-50/80 rounded-lg overflow-hidden`}>
                  <img
                    src={doc.url!}
                    alt={doc.title}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-center pointer-events-none print:hidden">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/75 text-white text-[10px] px-2.5 py-1 rounded-full font-bold shadow-md">
                    🔍 {selectedLanguage === 'marathi' ? 'पहा' : 'View'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const isThermal = paperSize === 'thermal_80' || paperSize === 'thermal_58';
  const thermalWidth = paperSize === 'thermal_58' ? '58mm' : '80mm';
  const isTwoBills = paperSize === 'a4_2in1' || Boolean(twoBillsPerPage);
  const isHalfPage = (paperSize === 'half_page' || paperSize === 'a5') && !isTwoBills;

  // Dynamic CSS @page rules
  const pageCssSize = isThermal
    ? `${thermalWidth} auto`
    : isTwoBills
      ? 'A4 portrait'
      : paperSize === 'a5'
        ? `A5 ${paperOrientation}`
        : paperSize === 'half_page'
          ? 'A4 portrait'
          : paperSize === 'letter'
            ? `letter ${paperOrientation}`
            : `A4 ${paperOrientation}`;

  const pageMarginCss = isThermal
    ? '2mm 2mm'
    : (isTwoBills || isHalfPage)
      ? '4mm 5mm'
      : paperMargin === 'compact'
        ? '3mm 4mm'
        : paperMargin === 'wide'
          ? '12mm 14mm'
          : '6mm 8mm';

  const sheetPaddingCss = isThermal
    ? '2mm 3mm'
    : (isTwoBills || isHalfPage)
      ? '2mm 3mm'
      : paperMargin === 'compact'
        ? '3mm 5mm'
        : paperMargin === 'wide'
          ? '10mm 12mm'
          : isCompact ? '4mm 6mm' : '6mm 8mm';

  const handleSavePaperAsDefault = () => {
    const updated: BillTemplateConfig = {
      ...billConfig,
      paperSize: isTwoBills ? 'a4_2in1' : paperSize,
      paperOrientation,
      paperMargin,
      fitToSinglePage,
      billCopyType,
      twoBillsPerPage: isTwoBills,
      twoBillsSecondCopyLabel,
      halfPageFormat: isHalfPage,
    };
    setBillConfig(updated);
    saveBillTemplateConfig(updated);
    setIsPaperSettingsOpen(false);
    setShareToast({
      type: 'success',
      message: selectedLanguage === 'marathi'
        ? 'कागद साईझ व छपाई सेटिंग्ज सेव्ह झाल्या!'
        : 'Paper format settings saved as default!',
    });
  };

  const renderTwoBillsSubSheet = (copyBadgeText: string, isUpper: boolean) => {
    const totalPlateUnits = plateItems.reduce((acc, it) => acc + (it.quantity || 0), 0);

    return (
      <div
        key={isUpper ? 'copy-upper' : 'copy-lower'}
        className="two-bills-copy bg-white border border-slate-900 rounded-lg p-2 sm:p-2.5 text-[9.5px] leading-tight flex flex-col justify-between"
        style={{
          boxSizing: 'border-box',
          pageBreakInside: 'avoid',
          breakInside: 'avoid',
        }}
      >
        {/* 1. Header Row */}
        <div className="flex justify-between items-start pb-1 border-b border-slate-800">
          {/* Left: Branding & Company Info */}
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="ANAND"
              className="h-8 w-auto object-contain flex-shrink-0"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div>
              <h2 className="text-xs sm:text-sm font-black uppercase text-slate-950 tracking-tight leading-none">
                {selectedLanguage === 'marathi' ? businessNameMr : businessName}
              </h2>
              <p className="text-[9px] text-slate-600 font-semibold leading-tight mt-0.5">
                {selectedLanguage === 'marathi' ? 'शटरिंग प्लेट्स भाडे व बांधकाम साहित्य पुरवठादार' : 'Shuttering Plates Rentals & Scaffolding'} • {address}
              </p>
              <p className="text-[9px] text-slate-700 font-bold leading-tight">
                {selectedLanguage === 'marathi' ? 'मोबाईल:' : 'Mob:'} {phones.split(',')[0]?.trim()} / {phones.split(',')[1]?.trim() || '9881985058'}
              </p>
            </div>
          </div>

          {/* Right: Bill Title, Copy Badge, Bill No & Date */}
          <div className="text-right flex-shrink-0">
            <div className="flex items-center justify-end gap-1.5 mb-0.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-950">
                {selectedLanguage === 'marathi' ? 'भाडे पावती व चालान' : 'RENTAL BILL & CHALLAN'}
              </span>
              <span className="px-1.5 py-0.5 rounded border border-slate-900 bg-slate-100 text-[8.5px] font-black uppercase tracking-wider text-slate-900 shadow-2xs">
                {copyBadgeText}
              </span>
            </div>
            <div className="text-[9.5px] font-mono font-bold text-slate-900">
              <span>#{billNumber}</span>
              <span className="mx-1 text-slate-400">|</span>
              <span>{selectedLanguage === 'marathi' ? 'दिनांक:' : 'Date:'} {issueDateFormatted}</span>
            </div>
          </div>
        </div>

        {/* 2. Customer & Rental Metadata Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 py-1 my-0.5 bg-slate-50 border-y border-slate-300 text-[9px]">
          <div>
            <span className="font-bold text-slate-600">{selectedLanguage === 'marathi' ? 'ग्राहक नाव:' : 'Customer:'} </span>
            <span className="font-black text-slate-900 uppercase">#{assignedCustomerNumber} {partyDisplayName}</span>
          </div>
          <div>
            <span className="font-bold text-slate-600">{selectedLanguage === 'marathi' ? 'मोबाईल:' : 'Mobile:'} </span>
            <span className="font-mono font-bold text-slate-900">{partyDisplayMobile || '-'}</span>
            {partyDisplayAddress && (
              <span className="text-slate-600 truncate ml-1">({partyDisplayAddress})</span>
            )}
          </div>
          <div className="text-right col-span-2 sm:col-span-1">
            <span className="font-bold text-slate-600">{selectedLanguage === 'marathi' ? 'वाटप:' : 'Dispatch:'} </span>
            <span className="font-mono font-bold text-slate-900">{cycleStartFormatted !== '-' ? cycleStartFormatted : issueDateFormatted}</span>
            <span className="text-slate-500 ml-1">({cycleDays} {selectedLanguage === 'marathi' ? 'दिवस' : 'days'})</span>
          </div>
        </div>

        {/* 3. Plate Items Table */}
        <div className="my-0.5 overflow-hidden rounded border border-slate-800">
          <table className="w-full border-collapse text-[9px]">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-800 text-slate-900 font-bold">
                <th className="py-0.5 px-1 text-center border-r border-slate-800 w-6">क्र.</th>
                <th className="py-0.5 px-1.5 text-left border-r border-slate-800">साहित्य तपशील (Plate Size)</th>
                <th className="py-0.5 px-1 text-center border-r border-slate-800 w-12">नग (Qty)</th>
                <th className="py-0.5 px-1 text-right border-r border-slate-800 w-14">दर/दिवस</th>
                <th className="py-0.5 px-1 text-center border-r border-slate-800 w-10">दिवस</th>
                <th className="py-0.5 px-1.5 text-right w-16">एकूण भाडे</th>
              </tr>
            </thead>
            <tbody>
              {plateItems.map((item, index) => {
                const itemDays = item.days || cycleDays;
                const rowRent = item.quantity * (item.dailyRate || 1.5) * itemDays;
                return (
                  <tr key={index} className="border-b border-slate-200 text-slate-900">
                    <td className="py-0.5 px-1 text-center border-r border-slate-200">{index + 1}</td>
                    <td className="py-0.5 px-1.5 font-bold border-r border-slate-200">
                      {formatPlateType(item.plateType, selectedLanguage)} प्लेट्स
                    </td>
                    <td className="py-0.5 px-1 text-center font-bold font-mono border-r border-slate-200">{item.quantity}</td>
                    <td className="py-0.5 px-1 text-right font-mono border-r border-slate-200">₹{Number(item.dailyRate || 1.5).toFixed(2)}</td>
                    <td className="py-0.5 px-1 text-center font-mono border-r border-slate-200">{itemDays}</td>
                    <td className="py-0.5 px-1.5 text-right font-black font-mono">₹{rowRent.toLocaleString('en-IN')}</td>
                  </tr>
                );
              })}
              <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-800">
                <td colSpan={2} className="py-0.5 px-1.5 text-right border-r border-slate-800">
                  {selectedLanguage === 'marathi' ? 'एकूण साहित्य:' : 'Total Plates:'}
                </td>
                <td className="py-0.5 px-1 text-center font-black font-mono border-r border-slate-800 text-primary">
                  {totalPlateUnits} नग
                </td>
                <td colSpan={2} className="py-0.5 px-1.5 text-right border-r border-slate-800">
                  {selectedLanguage === 'marathi' ? 'एकूण भाडे:' : 'Total Rent:'}
                </td>
                <td className="py-0.5 px-1.5 text-right font-black font-mono">
                  ₹{allCyclesTotalRent.toLocaleString('en-IN')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 4. Financial Summary & Bank Details Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 py-0.5 my-0.5 text-[9px]">
          {/* Left: Bank Details & Short Note */}
          <div className="space-y-0.5">
            {showBankDetails && (
              <div className="bg-slate-50 border border-slate-200 rounded p-1 text-[8.5px]">
                <span className="font-bold text-slate-800">{selectedLanguage === 'marathi' ? 'बँक माहिती:' : 'Bank:'} </span>
                <span className="font-semibold text-slate-700">
                  {billConfig.bankName || 'SBI'} • A/c: {billConfig.accountNumber || '39482910482'} • IFSC: {billConfig.ifscCode || 'SBIN0001234'} • UPI: {billConfig.upiId || 'anandbuilders@upi'}
                </span>
              </div>
            )}
            <p className="text-[8px] text-slate-500 italic leading-tight">
              * {selectedLanguage === 'marathi' ? 'मानक मुदत ४० दिवस. साहित्य स्वच्छ परत आणणे. नुकसान झाल्यास भरपाई आकारली जाईल.' : 'Standard 40 days cycle. Return material clean. Breakages charged at market cost.'}
            </p>
          </div>

          {/* Right: Payment Breakdown */}
          <div className="flex flex-col items-end justify-center space-y-0.5">
            <div className="flex items-center justify-between w-full max-w-[210px] text-[9px]">
              <span className="text-slate-600">{selectedLanguage === 'marathi' ? 'एकूण भाडे:' : 'Total Rent:'}</span>
              <span className="font-bold font-mono">₹{allCyclesTotalRent.toLocaleString('en-IN')}</span>
            </div>
            {totalPenaltyAmount > 0 && (
              <div className="flex items-center justify-between w-full max-w-[210px] text-[8.5px] text-amber-950 font-bold bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                <span className="truncate">{selectedLanguage === 'marathi' ? `दंड (${penaltyTypesSummary}):` : `Penalty (${penaltyTypesSummary}):`}</span>
                <span className="font-mono text-amber-950 flex-shrink-0">+₹{totalPenaltyAmount.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex items-center justify-between w-full max-w-[210px] text-[9px]">
              <span className="text-emerald-700 font-bold">{selectedLanguage === 'marathi' ? 'जमा रक्कम:' : 'Paid Amount:'}</span>
              <span className="font-bold font-mono text-emerald-800">₹{allCyclesTotalPaid.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between w-full max-w-[210px] px-1.5 py-0.5 rounded bg-slate-900 text-white font-black text-[9.5px]">
              <span>{selectedLanguage === 'marathi' ? 'शिल्लक बाकी:' : 'Balance Due:'}</span>
              <span className="font-mono text-amber-300">₹{allCyclesBalanceDue.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* 5. Signatures Footer */}
        <div className="flex justify-between items-end pt-1 mt-0.5 border-t border-slate-300 text-[8.5px] text-slate-800">
          <div className="text-center space-y-0.5">
            <div className="border-b border-dashed border-slate-600 w-24 sm:w-32 mb-0.5" />
            <p className="font-bold">{selectedLanguage === 'marathi' ? 'ग्राहकाची सही' : "Customer's Signature"}</p>
          </div>
          <div className="text-center space-y-0.5">
            <div className="border-b border-dashed border-slate-600 w-24 sm:w-32 mb-0.5" />
            <p className="font-bold">
              {currentT.authorizedSign || (selectedLanguage === 'marathi' ? 'अधिकृत स्वाक्षरी' : 'Authorized Signatory')}<br />
              <span className="text-[7.5px] text-slate-500 font-normal">{selectedLanguage === 'marathi' ? 'आनंद बिल्डर्स अँड डेव्हलपर्स' : 'Anand Builders & Developers'}</span>
            </p>
          </div>
        </div>
      </div>
    );
  };


  return createPortal(
    <div id="rental-bill-portal" className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      {/* Print-specific CSS styles */}
      <style>{`
        /* Clean export rules when capturing for PDF, WhatsApp or clipboard copy */
        .is-exporting-clean-bill .no-print,
        .is-exporting-clean-bill .print\:hidden,
        .is-exporting-clean-bill [data-no-print="true"],
        .is-exporting-clean-bill .bill-edit-control,
        .is-exporting-clean-bill button,
        .is-exporting-clean-bill .kyc-empty-placeholder {
          display: none !important;
          visibility: hidden !important;
        }

        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Hide entire SPA application under #root when printing bill */
          #root {
            display: none !important;
          }

          /* Hide controls, edit buttons and screen-only elements */
          .no-print,
          .print\:hidden,
          [data-no-print="true"],
          .bill-edit-control,
          #rental-bill-sheet button,
          .kyc-empty-placeholder {
            display: none !important;
            visibility: hidden !important;
          }

          /* Portal container */
          #rental-bill-portal {
            position: static !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            height: auto !important;
            min-height: 0 !important;
            display: block !important;
            width: 100% !important;
            box-shadow: none !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }

          /* Inner card wrapper */
          #rental-bill-portal > div {
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            max-width: 100% !important;
            max-height: none !important;
            height: auto !important;
            overflow: visible !important;
            background: transparent !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
          }

          /* Printable bill sheet */
          #rental-bill-sheet {
            display: block !important;
            position: static !important;
            width: ${isThermal ? thermalWidth : '100%'} !important;
            max-width: ${isThermal ? thermalWidth : '100%'} !important;
            margin: 0 auto !important;
            padding: ${sheetPaddingCss} !important;
            box-shadow: none !important;
            border: ${isThermal ? 'none' : isTwoBills ? 'none' : '1px solid #1e293b'} !important;
            background: white !important;
            color: black !important;
            overflow: visible !important;
            font-size: ${isThermal ? (paperSize === 'thermal_58' ? '9px' : '10px') : isTwoBills ? '9.5px' : isHalfPage ? '9px' : 'inherit'} !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          #rental-bill-sheet.is-half-page-sheet {
            max-height: 138mm !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .two-bills-copy {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-sizing: border-box !important;
          }

          @page {
            size: ${pageCssSize};
            margin: ${pageMarginCss};
          }
        }
      `}</style>

      <div className={`bg-white rounded-3xl border border-slate-200 ${
        isThermal
          ? (paperSize === 'thermal_58' ? 'max-w-md' : 'max-w-lg')
          : isTwoBills
            ? 'max-w-4xl'
            : isHalfPage
              ? 'max-w-2xl'
              : paperOrientation === 'landscape'
                ? 'max-w-6xl'
                : (isCompact || paperSize === 'a5' ? 'max-w-3xl' : 'max-w-4xl')
      } w-full max-h-[95vh] flex flex-col overflow-hidden shadow-2xl animate-scaleUp my-auto print:max-w-full print:max-h-none print:shadow-none print:border-none print:rounded-none`}>
        {/* Top Control Bar (Hidden during print) */}
        <div className="no-print px-5 py-3.5 border-b border-slate-200 flex flex-wrap justify-between items-center bg-slate-50 gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-orange-100 text-primary rounded-xl font-bold">
              <Package className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                  {currentT.billTitle}
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {selectedLanguage === 'marathi' ? 'ग्राहक:' : 'Customer:'} #{assignedCustomerNumber} {partyDisplayName}
              </p>
            </div>
          </div>

          {/* Language and Format controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Edit Bill Number Control */}
            <div className="flex items-center bg-slate-200/90 p-1 rounded-xl text-xs font-bold shadow-xs">
              <span className="text-[10px] text-slate-500 uppercase px-2 font-black">
                {selectedLanguage === 'marathi' ? 'बिल क्र.:' : 'Bill #:'}
              </span>
              {!isEditingBillNo ? (
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-black text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-300">
                    #{currentBillNo}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setTempBillNo(currentBillNo);
                      setIsEditingBillNo(true);
                    }}
                    className="p-1 hover:bg-white text-slate-700 hover:text-primary rounded-lg transition-colors cursor-pointer"
                    title={selectedLanguage === 'marathi' ? 'बिल नंबर बदला' : 'Edit Bill Number'}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={tempBillNo}
                    onChange={(e) => setTempBillNo(e.target.value)}
                    className="w-20 bg-white border border-primary focus:ring-1 focus:ring-primary focus:outline-none px-2 py-0.5 rounded-lg text-xs font-bold font-mono text-slate-900 shadow-2xs"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleSaveBillNumber}
                    className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
                    title="Save Bill Number"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTempBillNo(currentBillNo);
                      setIsEditingBillNo(false);
                    }}
                    className="p-1 hover:bg-slate-300 text-slate-500 rounded-lg transition-colors cursor-pointer"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Language Selector */}
            <div className="flex items-center bg-slate-200/90 p-1 rounded-xl text-xs font-bold shadow-xs">
              <span className="text-[10px] text-slate-500 uppercase px-2 font-black flex items-center gap-1">
                <Languages className="w-3.5 h-3.5 text-primary" />
                <span>भाषा:</span>
              </span>
              <button
                type="button"
                onClick={() => handleSelectLanguage('marathi')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedLanguage === 'marathi'
                    ? 'bg-primary text-white shadow-xs font-black'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
                title="संपूर्ण बिल मराठीत दाखवा"
              >
                मराठी
              </button>
              <button
                type="button"
                onClick={() => handleSelectLanguage('english')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedLanguage === 'english'
                    ? 'bg-slate-900 text-white shadow-xs font-black'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
                title="Show complete bill in English"
              >
                English
              </button>
            </div>

            {/* Layout format switcher */}
            <div className="hidden sm:flex items-center bg-slate-200/80 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => handleSelectStyle('simple')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedStyle === 'simple'
                    ? 'bg-white text-slate-950 shadow-sm font-extrabold ring-1 ring-slate-300'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Simple Bill (साधे)
              </button>
              <button
                type="button"
                onClick={() => handleSelectStyle('standard')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedStyle === 'standard'
                    ? 'bg-white text-slate-950 shadow-sm font-extrabold ring-1 ring-slate-300'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => handleSelectStyle('compact')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedStyle === 'compact'
                    ? 'bg-white text-slate-950 shadow-sm font-extrabold ring-1 ring-slate-300'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Compact
              </button>
            </div>

            {/* Unified Paper Format Selector & Settings */}
            <div className="relative flex items-center bg-slate-200/90 p-1 rounded-xl text-xs font-bold shadow-xs">
              <button
                type="button"
                onClick={() => {
                  setPaperSize('a4');
                  setTwoBillsPerPage(false);
                }}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  !isHalfPage && !isTwoBills && !isThermal
                    ? 'bg-white text-slate-900 shadow-xs font-black'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
                title="A4 Full Page"
              >
                {selectedLanguage === 'marathi' ? 'A4 पूर्ण' : 'A4 Full'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaperSize('half_page');
                  setTwoBillsPerPage(false);
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  isHalfPage
                    ? 'bg-emerald-600 text-white shadow-xs font-black'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
                title={
                  selectedLanguage === 'marathi'
                    ? 'अर्ध्या पानात बिल (A5 किंवा A4 चा वरचा भाग)'
                    : 'Half Page format (A5 or top half of A4)'
                }
              >
                <FileBadge className="w-3.5 h-3.5" />
                <span>{selectedLanguage === 'marathi' ? 'अर्धे पान (Half)' : 'Half Page'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTwoBillsPerPage(true);
                  setPaperSize('a4_2in1');
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  isTwoBills
                    ? 'bg-amber-600 text-white shadow-xs font-black'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
                title={
                  selectedLanguage === 'marathi'
                    ? 'एका पानात २ पावत्या (मूळ प्रत + कार्यालयीन प्रत)'
                    : '2 Bills on 1 Sheet'
                }
              >
                <span className="text-xs">✂</span>
                <span>{selectedLanguage === 'marathi' ? '१ पानात २' : '2-in-1'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPaperSettingsOpen(!isPaperSettingsOpen)}
                className={`p-1 rounded-lg transition-all cursor-pointer ml-0.5 border-l border-slate-300 pl-1.5 ${
                  isPaperSettingsOpen
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
                title={selectedLanguage === 'marathi' ? 'अधिक कागद व छपाई सेटिंग्ज (Margins, Orientation, Thermal)' : 'More Print & Paper Settings'}
              >
                <Printer className="w-3.5 h-3.5" />
              </button>

              {/* Paper Format Dropdown Popover */}
              {isPaperSettingsOpen && (
                <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3.5 z-50 text-slate-800 space-y-3 animate-scaleUp">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Printer className="w-4 h-4 text-primary" />
                      <span>{selectedLanguage === 'marathi' ? 'कागद व प्रिंट सेटिंग्ज' : 'Paper & Print Settings'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsPaperSettingsOpen(false)}
                      className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Paper Size */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500">
                      {selectedLanguage === 'marathi' ? 'कागद साईझ (Paper Size):' : 'Paper Size:'}
                    </label>
                    <select
                      value={paperSize}
                      onChange={(e) => {
                        const newSize = e.target.value as BillPaperSize;
                        setPaperSize(newSize);
                        if (newSize === 'a4_2in1') {
                          setTwoBillsPerPage(true);
                        } else if (newSize === 'half_page' || newSize === 'a5') {
                          setTwoBillsPerPage(false);
                        } else if (paperSize === 'a4_2in1') {
                          setTwoBillsPerPage(false);
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-primary px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                    >
                      {PAPER_SIZE_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {selectedLanguage === 'marathi' ? opt.labelMr : opt.labelEn} ({opt.dimensions})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 1 Sheet 2 Bills Toggle inside Popover */}
                  <div className="p-2 rounded-xl bg-amber-50/80 border border-amber-200/80 space-y-1.5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isTwoBills}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setTwoBillsPerPage(checked);
                          if (checked) {
                            setPaperSize('a4_2in1');
                          } else if (paperSize === 'a4_2in1') {
                            setPaperSize('a4');
                          }
                        }}
                        className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-900">
                        {selectedLanguage === 'marathi' ? '१ पानात २ पावत्या (2-in-1)' : '2 Bills on 1 Sheet (2-in-1)'}
                      </span>
                    </label>
                    {isTwoBills && (
                      <div className="pl-5 space-y-1">
                        <label className="text-[9px] font-bold text-slate-600 uppercase">
                          {selectedLanguage === 'marathi' ? 'दुसऱ्या प्रतीचे नाव:' : '2nd Copy Label:'}
                        </label>
                        <select
                          value={twoBillsSecondCopyLabel}
                          onChange={(e) => setTwoBillsSecondCopyLabel(e.target.value as any)}
                          className="w-full bg-white border border-slate-200 focus:border-primary px-2 py-1 rounded-lg text-[11px] font-bold text-slate-800 cursor-pointer"
                        >
                          <option value="office">{selectedLanguage === 'marathi' ? 'कार्यालयीन प्रत (Office Copy)' : 'Office Copy'}</option>
                          <option value="duplicate">{selectedLanguage === 'marathi' ? 'दुसरी प्रत (Duplicate Copy)' : 'Duplicate Copy'}</option>
                          <option value="store">{selectedLanguage === 'marathi' ? 'दुकान प्रत (Store Copy)' : 'Store Copy'}</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Orientation (if not thermal and not 2-in-1) */}
                  {!isTwoBills && paperSize !== 'thermal_80' && paperSize !== 'thermal_58' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-500">
                        {selectedLanguage === 'marathi' ? 'कागद दिशा (Orientation):' : 'Orientation:'}
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {PAPER_ORIENTATION_OPTIONS.map((ori) => (
                          <button
                            key={ori.id}
                            type="button"
                            onClick={() => setPaperOrientation(ori.id)}
                            className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              paperOrientation === ori.id
                                ? 'bg-primary text-white border-primary shadow-xs'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {selectedLanguage === 'marathi' ? ori.labelMr : ori.labelEn}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Margins */}
                  {!isTwoBills && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-500">
                        {selectedLanguage === 'marathi' ? 'समास (Margins):' : 'Margins:'}
                      </label>
                      <div className="grid grid-cols-3 gap-1">
                        {PAPER_MARGIN_OPTIONS.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setPaperMargin(m.id)}
                            className={`py-1 px-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                              paperMargin === m.id
                                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {selectedLanguage === 'marathi' ? m.labelMr.split(' ')[0] : m.labelEn.split(' ')[0]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}


                  {/* Save as default button */}
                  <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                    <button
                      type="button"
                      onClick={handleSavePaperAsDefault}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{selectedLanguage === 'marathi' ? 'नेहमीसाठी सेव्ह करा' : 'Save as Default'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Cycles Breakdown Checkbox */}
            <label
              className="flex items-center gap-1.5 bg-slate-200/90 hover:bg-slate-300/80 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-800 cursor-pointer transition-all select-none border border-slate-300/50 shadow-xs"
              title={selectedLanguage === 'marathi' ? 'बिलावर सर्व सायकल्स तपशील दाखवण्यासाठी टिक करा' : 'Tick to display all rental cycles breakdown on bill'}
            >
              <input
                type="checkbox"
                checked={showCycles}
                onChange={(e) => setShowCycles(e.target.checked)}
                className="w-3.5 h-3.5 accent-primary rounded cursor-pointer text-primary focus:ring-primary"
              />
              <span>{selectedLanguage === 'marathi' ? 'सायकल्स तपशील' : 'Cycles Details'}</span>
            </label>

            {/* Payments History Checkbox */}
            <label
              className="flex items-center gap-1.5 bg-slate-200/90 hover:bg-slate-300/80 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-800 cursor-pointer transition-all select-none border border-slate-300/50 shadow-xs"
              title={selectedLanguage === 'marathi' ? 'बिलावर जमा पेमेंट्स दाखवण्यासाठी टिक करा' : 'Tick to display payment history on bill'}
            >
              <input
                type="checkbox"
                checked={showPayments}
                onChange={(e) => setShowPayments(e.target.checked)}
                className="w-3.5 h-3.5 accent-primary rounded cursor-pointer text-primary focus:ring-primary"
              />
              <span>{selectedLanguage === 'marathi' ? 'जमा पेमेंट्स' : 'Payments'}</span>
            </label>

            {/* Bank Details Checkbox & Edit Control */}
            <div className="flex items-center bg-slate-200/90 p-1 rounded-xl text-xs font-bold shadow-xs">
              <label
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg cursor-pointer transition-all select-none"
                title={
                  selectedLanguage === 'marathi'
                    ? 'बिलावर बँक खाते व युपीआय तपशील दाखवण्यासाठी टिक करा'
                    : 'Tick to display Bank & UPI details on bill'
                }
              >
                <input
                  type="checkbox"
                  id="toggle-bank-details-modal"
                  checked={showBankDetails}
                  onChange={(e) => handleToggleShowBankDetails(e.target.checked)}
                  className="w-3.5 h-3.5 accent-primary rounded cursor-pointer text-primary focus:ring-primary"
                />
                <span className="flex items-center gap-1 text-slate-800">
                  <Landmark className="w-3.5 h-3.5 text-primary" />
                  <span>{selectedLanguage === 'marathi' ? 'बँक तपशील' : 'Bank Details'}</span>
                </span>
              </label>

              {showBankDetails && (
                <button
                  type="button"
                  onClick={handleOpenBankEdit}
                  className="p-1 hover:bg-white text-slate-700 hover:text-primary rounded-lg transition-colors cursor-pointer border-l border-slate-300 pl-1.5 ml-0.5"
                  title={
                    selectedLanguage === 'marathi'
                      ? 'बँकेचे नाव, खाते क्र., आयएफएससी आणि युपीआय बदला'
                      : 'Edit Bank Name, A/C No, IFSC and UPI'
                  }
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Terms and Conditions Checkbox (Tick to select to print on all bills) */}
            <label
              className="flex items-center gap-2 bg-slate-200/90 hover:bg-slate-300/80 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-800 cursor-pointer transition-all select-none border border-slate-300/50 shadow-xs"
              title={selectedLanguage === 'marathi' ? 'नियम व अटी बिलावर प्रिंट करण्यासाठी टिक करा (सर्व बिलांसाठी सेव्ह होते)' : 'Tick to select Terms & Conditions to print on all bills'}
            >
              <input
                type="checkbox"
                id="toggle-print-terms-modal"
                checked={printTerms}
                onChange={(e) => handleTogglePrintTerms(e.target.checked)}
                className="w-4 h-4 accent-primary rounded cursor-pointer text-primary focus:ring-primary"
              />
              <span className="flex items-center gap-1">
                <span>{selectedLanguage === 'marathi' ? 'नियम व अटी' : 'Terms & Conditions'}</span>
                <span className="text-[10px] font-normal text-slate-500 hidden sm:inline">
                  ({selectedLanguage === 'marathi' ? 'सर्व बिलांवर प्रिंट' : 'Print on all bills'})
                </span>
              </span>
            </label>

            {/* KYC / Customer Verification Proofs Checkbox */}
            <label
              className="flex items-center gap-1.5 bg-slate-200/90 hover:bg-slate-300/80 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-800 cursor-pointer transition-all select-none border border-slate-300/50 shadow-xs"
              title={
                selectedLanguage === 'marathi'
                  ? 'बिलाच्या शेवटी ग्राहकाचे आधार कार्ड, चेहरा आणि चेक फोटो जोडण्यासाठी टिक करा'
                  : 'Tick to display customer Aadhaar card, face, and cheque photo at the end of the bill'
              }
            >
              <input
                type="checkbox"
                id="toggle-kyc-docs-modal"
                checked={showKycDocs}
                onChange={(e) => handleToggleShowKycDocs(e.target.checked)}
                className="w-3.5 h-3.5 accent-primary rounded cursor-pointer text-primary focus:ring-primary"
              />
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <span>{selectedLanguage === 'marathi' ? 'केवायसी / फोटो पुरावे' : 'KYC Documents'}</span>
              </span>
            </label>


            {/* WhatsApp PDF Share Button */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
              disabled={isSharingWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold px-3.5 py-2 rounded-xl shadow-md hover:shadow-emerald-600/20 text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              title={
                selectedLanguage === 'marathi'
                  ? 'ग्राहकाच्या व्हॉट्सॲपवर बिलाची PDF व तपशील थेट पाठवा'
                  : 'Share bill PDF & summary directly to customer on WhatsApp'
              }
            >
              {isSharingWhatsApp ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <MessageSquare className="w-4 h-4 text-white" />
              )}
              <span>
                {isSharingWhatsApp
                  ? (selectedLanguage === 'marathi' ? 'तयार होत आहे...' : 'Generating...')
                  : (selectedLanguage === 'marathi' ? 'व्हॉट्सॲप PDF' : 'WhatsApp PDF')}
              </span>
            </button>

            {/* Copy Bill Image Button (for fast Ctrl+V WhatsApp pasting) */}
            <button
              type="button"
              onClick={handleCopyBillImage}
              disabled={isCopyingImage}
              className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold px-3 py-2 rounded-xl shadow-md hover:shadow-indigo-600/20 text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-70"
              title={
                selectedLanguage === 'marathi'
                  ? 'बिलाचा संपूर्ण फोटो कॉपी करा (व्हॉट्सॲपवर Ctrl+V करून थेट पाठवू शकता)'
                  : 'Copy full bill photo to clipboard (paste with Ctrl+V into WhatsApp)'
              }
            >
              {isCopyingImage ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Copy className="w-4 h-4 text-white" />
              )}
              <span>
                {isCopyingImage
                  ? (selectedLanguage === 'marathi' ? 'कॉपी होत आहे...' : 'Copying...')
                  : (selectedLanguage === 'marathi' ? 'इमेज कॉपी' : 'Copy Image')}
              </span>
            </button>

            <button
              onClick={handlePrint}
              className="bg-primary hover:bg-primary-dark text-white font-bold px-3.5 py-2 rounded-xl shadow-md hover:shadow-orange-500/20 text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer"
              title="Print Bill or Save PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer"
              title="Close Bill"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Bill Sheet Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-100/70 print:bg-white print:p-0 print:overflow-visible">
          
          {/* ========================================================= */}
          {/* 0. THERMAL RECEIPT FORMAT (POS ROLL) - 80mm & 58mm        */}
          {/* ========================================================= */}
          {isThermal ? (
            <div
              id="rental-bill-sheet"
              className={`bg-white text-black p-3.5 font-mono mx-auto ${
                paperSize === 'thermal_58' ? 'max-w-[270px] text-[10px]' : 'max-w-[340px] text-xs'
              } border border-slate-300 shadow-md rounded-lg print:border-none print:shadow-none print:p-0 print:max-w-none leading-tight`}
            >
              {/* Thermal Header */}
              <div className="text-center pb-2 border-b border-dashed border-slate-400 space-y-0.5">
                <h1 className="text-sm font-black uppercase tracking-tight text-black">
                  {selectedLanguage === 'marathi' ? businessNameMr : businessName}
                </h1>
                <p className="text-[10px] text-slate-700">{address}</p>
                <p className="text-[10px] font-bold text-slate-800">
                  {selectedLanguage === 'marathi' ? 'मो.:' : 'Mob:'} {phones.split(',')[0]?.trim()}
                </p>
                <div className="pt-1 flex items-center justify-center">
                  <span className="font-extrabold underline uppercase text-[11px] text-black">
                    {selectedLanguage === 'marathi' ? 'भाडे पावती व चालान' : 'RENTAL RECEIPT'}
                  </span>
                </div>
              </div>

              {/* Thermal Bill Meta */}
              <div className="py-2 border-b border-dashed border-slate-400 text-[10px] space-y-0.5">
                <div className="flex justify-between">
                  <span className="font-bold">{selectedLanguage === 'marathi' ? 'बिल क्र.:' : 'Bill No:'} #{billNumber}</span>
                  <span>{issueDateFormatted}</span>
                </div>
                <div className="font-bold text-black truncate">
                  {selectedLanguage === 'marathi' ? 'ग्राहक:' : 'Customer:'} {rawPartyName}
                </div>
                {partyDisplayMobile && (
                  <div>{selectedLanguage === 'marathi' ? 'मोबाईल:' : 'Mob:'} {partyDisplayMobile}</div>
                )}
                {partyDisplayAddress && (
                  <div className="truncate">{selectedLanguage === 'marathi' ? 'साइट:' : 'Site:'} {partyDisplayAddress}</div>
                )}
                <div className="text-[9px] text-slate-600">
                  {selectedLanguage === 'marathi' ? 'कालावधी:' : 'Period:'} {cycleDays} {selectedLanguage === 'marathi' ? 'दिवस' : 'Days'} ({cycleStartFormatted} - {cycleEndFormatted})
                </div>
              </div>

              {/* Thermal Items Table */}
              <div className="py-2 border-b border-dashed border-slate-400">
                <div className="flex justify-between text-[10px] font-black border-b border-black pb-1 mb-1">
                  <span className="flex-1">{selectedLanguage === 'marathi' ? 'साहित्य' : 'Item'}</span>
                  <span className="w-12 text-center">{selectedLanguage === 'marathi' ? 'नग' : 'Qty'}</span>
                  <span className="w-16 text-right">{selectedLanguage === 'marathi' ? 'रक्कम' : 'Total'}</span>
                </div>
                {plateItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-[10px] py-0.5">
                    <span className="flex-1 truncate font-medium">{formatPlateType(item.plateType)}</span>
                    <span className="w-12 text-center font-bold">{item.quantity}</span>
                    <span className="w-16 text-right font-bold">₹{Math.round(item.quantity * item.dailyRate * (item.days || cycleDays)).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>

              {/* Thermal Totals */}
              <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>{selectedLanguage === 'marathi' ? 'एकूण भाडे:' : 'Total Rent:'}</span>
                  <span className="font-bold">₹{totalCycleAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-emerald-800">
                  <span>{selectedLanguage === 'marathi' ? 'जमा रक्कम:' : 'Paid Amount:'}</span>
                  <span className="font-bold">₹{totalPaidAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between font-black text-xs border border-black p-1 bg-slate-50 mt-1">
                  <span>{selectedLanguage === 'marathi' ? 'येणे बाकी:' : 'Balance Due:'}</span>
                  <span>₹{totalPendingAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Thermal Bank Details if enabled */}
              {showBankDetails && billConfig.bankName && (
                <div className="py-1.5 border-b border-dashed border-slate-400 text-[9px] space-y-0.5">
                  <div className="font-bold">{billConfig.bankName}</div>
                  {billConfig.accountNumber && <div>A/C: {billConfig.accountNumber}</div>}
                  {billConfig.ifscCode && <div>IFSC: {billConfig.ifscCode}</div>}
                  {billConfig.upiId && <div>UPI: {billConfig.upiId}</div>}
                </div>
              )}

              {/* Thermal Terms if enabled */}
              {printTerms && activeTerms.length > 0 && (
                <div className="py-1 border-b border-dashed border-slate-400 text-[8px] text-slate-700 leading-tight">
                  <div className="font-bold">{selectedLanguage === 'marathi' ? 'नियम व अटी:' : 'Terms:'}</div>
                  <p>{activeTerms[0]}</p>
                </div>
              )}

              {/* Thermal Signatures & Footer */}
              <div className="pt-2 text-center text-[9px] space-y-1">
                <div className="pt-4 flex justify-between items-end text-[9px]">
                  <div>
                    <div className="border-t border-black pt-0.5 w-16 text-center">{selectedLanguage === 'marathi' ? 'ग्राहक सही' : 'Customer'}</div>
                  </div>
                  <div>
                    <div className="border-t border-black pt-0.5 w-16 text-center">{selectedLanguage === 'marathi' ? 'अधिकृत सही' : 'Signatory'}</div>
                  </div>
                </div>
                <p className="text-[9px] pt-1 font-semibold">{selectedLanguage === 'marathi' ? 'धन्यवाद! पुन्हा भेट द्या.' : 'Thank you!'}</p>
              </div>

              {/* KYC Annexure if enabled */}
              {showKycDocs && renderKycDocumentsSection(true)}
            </div>
          ) : isTwoBills ? (
            /* ========================================================= */
            /* 1. 2 BILLS ON 1 SHEET (A4 2-in-1 FORMAT)                  */
            /* ========================================================= */
            <div
              id="rental-bill-sheet"
              className="bg-white text-black font-sans mx-auto border border-slate-300 shadow-sm rounded-2xl max-w-4xl p-2.5 sm:p-3 text-[9.5px] leading-tight print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none flex flex-col justify-between"
            >
              {/* Upper Bill: Customer / Original Copy */}
              {renderTwoBillsSubSheet(
                selectedLanguage === 'marathi' ? 'मूळ प्रत (ग्राहक प्रत)' : 'ORIGINAL COPY (Customer)',
                true
              )}

              {/* Perforation Cut Line */}
              <div className="relative py-1 flex items-center justify-center my-0.5 print:my-0 select-none">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-dashed border-slate-500" />
                </div>
                <div className="relative bg-white px-3 py-0.5 text-[8.5px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5 border border-dashed border-slate-400 rounded-full shadow-2xs">
                  <span className="text-xs">✂</span>
                  <span>
                    {selectedLanguage === 'marathi'
                      ? 'इथून कापा (CUT HERE) — वर: ग्राहक मूळ प्रत | खाली: दुकान / कार्यालय प्रत'
                      : 'CUT HERE (इथून कापा) — TOP: CUSTOMER COPY | BOTTOM: OFFICE COPY'}
                  </span>
                  <span className="text-xs">✂</span>
                </div>
              </div>

              {/* Lower Bill: Office / Duplicate / Store Copy */}
              {renderTwoBillsSubSheet(
                twoBillsSecondCopyLabel === 'duplicate'
                  ? (selectedLanguage === 'marathi' ? 'दुसरी प्रत (Duplicate)' : 'DUPLICATE COPY')
                  : twoBillsSecondCopyLabel === 'store'
                    ? (selectedLanguage === 'marathi' ? 'दुकान प्रत (Store Copy)' : 'STORE COPY')
                    : (selectedLanguage === 'marathi' ? 'कार्यालयीन प्रत (Office Copy)' : 'OFFICE COPY'),
                false
              )}
            </div>
          ) : isSimple ? (
            <div
              id="rental-bill-sheet"
              className={`bg-white text-black font-sans mx-auto border border-slate-200 shadow-sm rounded-xl print:border-none print:shadow-none print:p-2 print:max-w-none ${
                isHalfPage
                  ? 'p-3 sm:p-4 max-w-2xl text-[9.5px] leading-snug is-half-page-sheet'
                  : paperSize === 'a5'
                    ? 'p-5 sm:p-6 max-w-xl text-[11px] leading-relaxed'
                    : paperOrientation === 'landscape'
                      ? 'p-6 sm:p-8 max-w-4xl text-xs leading-relaxed'
                      : 'p-8 sm:p-10 max-w-2xl text-xs leading-relaxed'
              }`}
            >
              {/* TOP HEADER: Left Company Info | Right INVOICE & Meta */}
              <div className={`flex justify-between items-start ${isHalfPage ? 'pb-2 border-b border-slate-200' : 'pb-4'}`}>
                <div className={`flex items-center ${isHalfPage ? 'gap-2 sm:gap-2.5' : 'gap-3 sm:gap-4'}`}>
                  <img
                    src="/logo.png"
                    alt="ANAND Logo"
                    className={`${isHalfPage ? 'h-8 sm:h-9' : 'h-14 sm:h-16'} w-auto object-contain flex-shrink-0`}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <div className="text-left space-y-0.5">
                    <h1 className={`${isHalfPage ? 'text-sm sm:text-base' : 'text-xl sm:text-2xl'} font-black text-black tracking-tight uppercase leading-tight`}>
                      {selectedLanguage === 'marathi' ? businessNameMr : businessName}
                    </h1>
                    <p className={`${isHalfPage ? 'text-[9px]' : 'text-xs'} text-slate-800 font-medium`}>{address}</p>
                    <p className={`${isHalfPage ? 'text-[9px]' : 'text-xs'} text-slate-800 font-medium`}>
                      {selectedLanguage === 'marathi' ? 'फोन:' : 'Ph:'} {phones.split(',')[0]?.trim() || '7020914957'}
                      {phones.split(',')[1] && `, ${phones.split(',')[1].trim()}`}
                    </p>
                  </div>
                </div>

                <div className="text-right space-y-0.5">
                  <div className="flex items-center justify-end">
                    <h2 className={`${isHalfPage ? 'text-sm sm:text-base' : 'text-xl sm:text-2xl'} font-black tracking-wider text-black uppercase`}>
                      {selectedLanguage === 'marathi' ? 'भाडे पावती' : 'INVOICE'}
                    </h2>
                  </div>
                  <div className="flex items-center justify-end gap-1.5 group">
                    <p className={`${isHalfPage ? 'text-[10px]' : 'text-xs'} font-mono font-bold text-slate-900`}>#{billNumber}</p>
                    <button
                      type="button"
                      data-no-print="true"
                      onClick={() => {
                        setTempBillNo(currentBillNo);
                        setIsEditingBillNo(true);
                      }}
                      className="no-print bill-edit-control p-0.5 text-slate-400 hover:text-primary transition-colors cursor-pointer group-hover:opacity-100 opacity-0"
                      title={selectedLanguage === 'marathi' ? 'बिल नंबर बदला' : 'Edit Bill Number'}
                    >
                      <Edit2 className={`${isHalfPage ? 'w-2.5 h-2.5' : 'w-3 h-3'}`} />
                    </button>
                  </div>
                  <div className={`${isHalfPage ? 'text-[9px] px-1.5 py-0.2' : 'text-xs px-2 py-0.5'} font-mono font-bold text-slate-900 bg-slate-100 border border-slate-300 rounded mt-0.5 inline-block`}>
                    <span className="text-slate-600 font-semibold">{selectedLanguage === 'marathi' ? 'बिल दिनांक:' : 'Bill Dated:'}</span>{' '}
                    {issueDateFormatted}
                  </div>
                </div>
              </div>

              {/* SUBHEADER: Bill To, Delivery & Rental Duration Time */}
              <div className={`${isHalfPage ? 'text-[9px] pt-1.5 pb-1' : 'text-xs pt-3 pb-2'} font-normal`}>
                <div className="flex justify-between items-baseline">
                  <div>
                    <span className="font-bold text-black">{selectedLanguage === 'marathi' ? 'बिल नाव:' : 'Bill To:'}</span>{' '}
                    <span className={`font-mono font-bold text-slate-900 bg-slate-100 border border-slate-300 ${isHalfPage ? 'px-1 py-0.2 text-[9px]' : 'px-1.5 py-0.5 text-[11px]'} rounded mr-1`}>
                      {selectedLanguage === 'marathi' ? 'ग्राहक #' : 'Cust #'}{assignedCustomerNumber}
                    </span>
                    <span className="font-bold text-black uppercase">{partyDisplayName}</span>{' '}
                    <span className="font-mono text-slate-800 ml-2">{partyDisplayMobile}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-black">{selectedLanguage === 'marathi' ? 'साहित्य वाटप:' : 'Dispatch Date:'}</span>{' '}
                    <span className="font-mono text-black font-semibold">{cycleStartFormatted !== '-' ? cycleStartFormatted : issueDateFormatted}</span>
                  </div>
                </div>

                {/* Rental Duration & Period Row */}
                <div className="flex justify-between items-baseline pt-0.5">
                  <div className="text-slate-700">
                    {partyDisplayAddress ? (
                      <>
                        <span className="font-bold text-black">{selectedLanguage === 'marathi' ? 'कामाचे ठिकाण:' : 'Site:'}</span>{' '}
                        <span>{partyDisplayAddress}</span>
                      </>
                    ) : (
                      <span>&nbsp;</span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-black">
                      {selectedLanguage === 'marathi' ? 'भाडे कालावधी:' : 'Rental Period:'}
                    </span>{' '}
                    <span className="font-mono text-black font-bold">{cycleDays} {selectedLanguage === 'marathi' ? 'दिवस' : 'Days'}</span>
                    {cycleEndFormatted && cycleEndFormatted !== '40 Days from issue' && cycleEndFormatted !== '४० दिवसांनंतर' && (
                      <span className={`font-mono text-slate-700 font-semibold ${isHalfPage ? 'text-[9px]' : 'text-[11px]'} ml-1`}>
                        ({cycleStartFormatted} {selectedLanguage === 'marathi' ? 'ते' : 'to'} {cycleEndFormatted})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* TABLE: Clean Divider lines above and below headers, and at bottom of rows */}
              <table className="w-full text-left my-1 border-collapse">
                <thead>
                  <tr className={`border-t-2 border-b-2 border-slate-900 ${isHalfPage ? 'text-[9px]' : 'text-xs'} font-bold text-black`}>
                    <th className={`${isHalfPage ? 'py-1 pr-2' : 'py-2 pr-4'} text-left`}>{selectedLanguage === 'marathi' ? 'साहित्य' : 'Item'}</th>
                    <th className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} text-center`}>{selectedLanguage === 'marathi' ? 'नग' : 'Qty'}</th>
                    <th className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} text-right`}>{selectedLanguage === 'marathi' ? 'दर' : 'Rate'}</th>
                    <th className={`${isHalfPage ? 'py-1 pl-2' : 'py-2 pl-4'} text-right`}>{selectedLanguage === 'marathi' ? 'रक्कम' : 'Amt'}</th>
                  </tr>
                </thead>
                <tbody className={`${isHalfPage ? 'text-[9.5px]' : 'text-xs'} border-b-2 border-slate-900`}>
                  {plateItems.map((item, index) => {
                    const itemDays = item.days || cycleDays;
                    const rowRent = item.quantity * item.dailyRate * itemDays;
                    return (
                      <tr key={index}>
                        <td className={`${isHalfPage ? 'py-1 pr-2' : 'py-2.5 pr-4'} text-black`}>
                          <div className={`font-bold uppercase ${isHalfPage ? 'text-[10px]' : 'text-[12px]'}`}>
                            {formatPlateType(item.plateType, selectedLanguage)}
                          </div>
                          {/* Explicit Day-Wise Calculation Formula */}
                          <div className={`${isHalfPage ? 'text-[8.5px] px-1.5 py-0' : 'text-[11px] px-2 py-0.5'} font-mono font-medium text-slate-700 bg-slate-100/90 border border-slate-300 rounded mt-0.5 inline-block`}>
                            {item.quantity} {selectedLanguage === 'marathi' ? 'प्लेट्स' : 'plates'} × ₹{Number(item.dailyRate).toFixed(2)}/{selectedLanguage === 'marathi' ? 'दिवस' : 'day'} × {itemDays} {selectedLanguage === 'marathi' ? 'दिवस' : 'days'}
                          </div>
                        </td>
                        <td className={`${isHalfPage ? 'py-1 px-1.5 text-xs' : 'py-2.5 px-3 text-sm'} text-center font-mono text-black align-top font-bold`}>
                          {item.quantity}
                        </td>
                        <td className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2.5 px-3'} text-right font-mono text-black align-top font-semibold`}>
                          ₹{Number(item.dailyRate).toFixed(2)}/{selectedLanguage === 'marathi' ? 'दिवस' : 'd'}
                        </td>
                        <td className={`${isHalfPage ? 'py-1 pl-2 font-bold' : 'py-2.5 pl-4 font-black text-sm'} text-right font-mono text-black align-top`}>
                          ₹{rowRent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Overdue Extra Days Row if applicable */}
                  {extraDays > 0 && extraAmount > 0 && (
                    <tr>
                      <td className={`${isHalfPage ? 'py-1 pr-2' : 'py-2 pr-4'} text-black`}>
                        <div className="lowercase">
                          {selectedLanguage === 'marathi' ? 'अतिरिक्त दिवस' : 'extra days'} (+{extraDays}{selectedLanguage === 'marathi' ? ' दि' : 'd'})
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">
                          {selectedLanguage === 'marathi' ? 'मुदतीनंतरचा वापर' : 'Overdue usage beyond cycle'}
                        </div>
                      </td>
                      <td className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} text-center font-mono text-black align-top`}>{rental.quantity}</td>
                      <td className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} text-right font-mono text-black align-top`}>₹{Number(rental.dailyRate || 1.5).toFixed(2)}</td>
                      <td className={`${isHalfPage ? 'py-1 pl-2' : 'py-2 pl-4'} text-right font-mono text-black align-top`}>
                        ₹{extraAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* RENTAL CYCLES BREAKDOWN (Simple Template) */}
              {showCycles && allCycles.length > 0 && (
                <div className={`${isHalfPage ? 'my-1 pt-0.5' : 'my-3 pt-1'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className={`${isHalfPage ? 'text-[9.5px]' : 'text-[11px]'} font-black uppercase text-black tracking-wider flex items-center gap-1`}>
                      <span>{currentT.cyclesTitle}</span>
                    </span>
                    <span className={`${isHalfPage ? 'text-[8.5px]' : 'text-[10px]'} font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 border border-slate-300 text-slate-800`}>
                      {allCycles.length} {selectedLanguage === 'marathi' ? 'सायकल्स' : 'Cycles'}
                    </span>
                  </div>
                  <table className={`w-full text-left my-0.5 border-collapse border border-slate-800 ${isHalfPage ? 'text-[8.5px]' : 'text-[10px]'}`}>
                    <thead>
                      <tr className="bg-slate-100 text-black font-bold border-b border-slate-800">
                        <th className={`${isHalfPage ? 'py-0.5 px-1.5' : 'py-1 px-2'} border-r border-slate-300`}>{currentT.cycleCol}</th>
                        <th className={`${isHalfPage ? 'py-0.5 px-1.5' : 'py-1 px-2'} border-r border-slate-300`}>{currentT.cyclePeriodCol}</th>
                        <th className={`${isHalfPage ? 'py-0.5 px-1.5' : 'py-1 px-2'} text-center border-r border-slate-300`}>{currentT.cycleDaysCol}</th>
                        <th className={`${isHalfPage ? 'py-0.5 px-1.5' : 'py-1 px-2'} text-right border-r border-slate-300`}>{currentT.cycleRentCol}</th>
                        <th className={`${isHalfPage ? 'py-0.5 px-1.5' : 'py-1 px-2'} text-right border-r border-slate-300`}>{currentT.cyclePaidCol}</th>
                        <th className={`${isHalfPage ? 'py-0.5 px-1.5' : 'py-1 px-2'} text-right border-r border-slate-300`}>{currentT.cyclePendingCol}</th>
                        <th className={`${isHalfPage ? 'py-0.5 px-1.5' : 'py-1 px-2'} text-center`}>{currentT.cycleStatusCol}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {allCycles.map((c) => {
                        const isCurrent = c.cycleNumber === currentActiveCycleNumber;
                        const startFmt = c.startDate ? new Date(c.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
                        const endFmt = c.expectedEndDate ? new Date(c.expectedEndDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
                        return (
                          <tr key={c.id || c.cycleNumber} className={isCurrent ? 'bg-orange-50/60 font-semibold' : ''}>
                            <td className={`${isHalfPage ? 'py-0.5 px-1.5' : 'py-1 px-2'} border-r border-slate-200`}>
                              {selectedLanguage === 'marathi' ? 'सायकल #' : 'Cycle #'}{c.cycleNumber}
                              {isCurrent && (
                                <span className="ml-1 text-[8px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-black uppercase">
                                  {currentT.activeCycleBadge}
                                </span>
                              )}
                            </td>
                            <td className={`${isHalfPage ? 'py-0.5 px-1.5' : 'py-1 px-2'} font-mono border-r border-slate-200`}>{startFmt} → {endFmt}</td>
                            <td className={`${isHalfPage ? 'py-0.5 px-1.5' : 'py-1 px-2'} text-center font-mono border-r border-slate-200`}>{c.days}{selectedLanguage === 'marathi' ? ' दि' : 'd'} {c.extraDays > 0 ? `(+${c.extraDays}${selectedLanguage === 'marathi' ? ' दि' : 'd'})` : ''}</td>
                            <td className={`${isHalfPage ? 'py-0.5 px-1.5' : 'py-1 px-2'} text-right font-mono border-r border-slate-200`}>₹{(c.totalAmount || c.baseRent || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td className={`${isHalfPage ? 'py-0.5 px-1.5' : 'py-1 px-2'} text-right font-mono text-emerald-700 border-r border-slate-200`}>₹{(c.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td className={`${isHalfPage ? 'py-0.5 px-1.5' : 'py-1 px-2'} text-right font-mono text-rose-700 border-r border-slate-200`}>₹{(c.pendingAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td className={`${isHalfPage ? 'py-0.5 px-1.5 text-[8.5px]' : 'py-1 px-2 text-[9px]'} text-center font-bold`}>
                              {c.status === 'completed'
                                ? currentT.completedCycleBadge
                                : (c.extraDays > 0 || (Boolean(c.expectedEndDate) && new Date(c.expectedEndDate).getTime() < Date.now()))
                                ? currentT.overdueCycleBadge
                                : currentT.activeCycleBadge}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* RETURNED BATCHES & CONTINUOUS PRORATION (Simple Template) */}
              {partialBreakdown && partialBreakdown.returnedBatches.length > 0 && (
                <div className={`${isHalfPage ? 'my-1 pt-0.5' : 'my-3 pt-1'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className={`${isHalfPage ? 'text-[9.5px]' : 'text-[11px]'} font-black uppercase text-black tracking-wider flex items-center gap-1`}>
                      <span>{selectedLanguage === 'marathi' ? 'माघारी आलेले साहित्य व भाडे हिशोब' : 'Returned Plates & Day-Wise Proration'}</span>
                    </span>
                    <span className={`${isHalfPage ? 'text-[8.5px]' : 'text-[10px]'} font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 border border-slate-300 text-slate-800`}>
                      {selectedLanguage === 'marathi' ? `दर: ₹${partialBreakdown.dailyRate}/दिवस` : `Rate: ₹${partialBreakdown.dailyRate}/day`}
                    </span>
                  </div>
                  <table className={`w-full text-left my-0.5 border-collapse border border-slate-800 ${isHalfPage ? 'text-[8.5px]' : 'text-[10px]'}`}>
                    <thead>
                      <tr className="bg-slate-100 text-black font-bold border-b border-slate-800">
                        <th className={`${isHalfPage ? 'py-0.5 px-1.5' : 'py-1 px-2'} border-r border-slate-300`}>{selectedLanguage === 'marathi' ? 'तपशील' : 'Details'}</th>
                        <th className={`${isHalfPage ? 'py-0.5 px-1.5' : 'py-1 px-2'} border-r border-slate-300`}>{selectedLanguage === 'marathi' ? 'परत दिनांक' : 'Return Date'}</th>
                        <th className={`${isHalfPage ? 'py-0.5 px-1.5' : 'py-1 px-2'} text-center border-r border-slate-300`}>{selectedLanguage === 'marathi' ? 'नग' : 'Qty'}</th>
                        <th className={`${isHalfPage ? 'py-0.5 px-1.5' : 'py-1 px-2'} text-center border-r border-slate-300`}>{selectedLanguage === 'marathi' ? 'वापर दिवस' : 'Days Kept'}</th>
                        <th className={`${isHalfPage ? 'py-0.5 px-1.5' : 'py-1 px-2'} text-right`}>{selectedLanguage === 'marathi' ? 'भाडे रक्कम' : 'Rent (₹)'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {partialBreakdown.returnedBatches.map((b, idx) => (
                        <tr key={idx}>
                          <td className={`${isHalfPage ? 'py-0.5 px-1.5' : 'py-1 px-2'} border-r border-slate-200 font-semibold text-slate-800`}>
                            {selectedLanguage === 'marathi' ? `माघार बॅच #${idx + 1}` : `Returned Batch #${idx + 1}`}
                          </td>
                          <td className={`${isHalfPage ? 'py-0.5 px-1.5' : 'py-1 px-2'} font-mono border-r border-slate-200`}>{b.returnDate}</td>
                          <td className={`${isHalfPage ? 'py-0.5 px-1.5' : 'py-1 px-2'} text-center font-bold border-r border-slate-200`}>{b.returnedQuantity} {selectedLanguage === 'marathi' ? 'प्लेट्स' : 'Plates'}</td>
                          <td className={`${isHalfPage ? 'py-0.5 px-1.5' : 'py-1 px-2'} text-center font-mono border-r border-slate-200`}>{b.elapsedDays} {selectedLanguage === 'marathi' ? 'दिवस' : 'Days'}</td>
                          <td className={`${isHalfPage ? 'py-0.5 px-1.5' : 'py-1 px-2'} text-right font-mono font-bold text-slate-900`}>
                            ₹{b.rentAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                      {partialBreakdown.remainingQuantity > 0 && (
                        <tr className="bg-blue-50/60 font-semibold">
                          <td className={`${isHalfPage ? 'py-0.5 px-1.5' : 'py-1 px-2'} border-r border-slate-200 text-blue-900`}>
                            {selectedLanguage === 'marathi' ? 'चालू उर्वरित साहित्य (४० दिवस)' : 'Remaining Plates (Continuing 40 Days)'}
                          </td>
                          <td className={`${isHalfPage ? 'py-0.5 px-1.5' : 'py-1 px-2'} font-mono border-r border-slate-200 text-blue-700 italic`}>
                            {selectedLanguage === 'marathi' ? 'चालू भाडे' : 'Continuing'}
                          </td>
                          <td className={`${isHalfPage ? 'py-0.5 px-1.5' : 'py-1 px-2'} text-center font-bold text-blue-900 border-r border-slate-200`}>{partialBreakdown.remainingQuantity} {selectedLanguage === 'marathi' ? 'प्लेट्स' : 'Plates'}</td>
                          <td className={`${isHalfPage ? 'py-0.5 px-1.5' : 'py-1 px-2'} text-center font-mono border-r border-slate-200 text-blue-900`}>{partialBreakdown.remainingPlatesDays} {selectedLanguage === 'marathi' ? 'दिवस' : 'Days'}</td>
                          <td className={`${isHalfPage ? 'py-0.5 px-1.5' : 'py-1 px-2'} text-right font-mono font-bold text-blue-950`}>
                            ₹{partialBreakdown.remainingPlatesRent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* LATEST PAYMENTS SECTION (Simple Template) */}
              {showPayments && (
                <div className={`${isHalfPage ? 'my-1 pt-0.5' : 'my-3 pt-1'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className={`${isHalfPage ? 'text-[9.5px]' : 'text-[11px]'} font-black uppercase text-black tracking-wider flex items-center gap-1`}>
                      <span>{currentT.paymentsTitle}</span>
                    </span>
                    <span className={`${isHalfPage ? 'text-[8.5px]' : 'text-[10px]'} font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 border border-slate-300 text-slate-800`}>
                      {rentalPayments.length} {selectedLanguage === 'marathi' ? 'पेमेंट्स' : 'Payments'}
                    </span>
                  </div>
                  {rentalPayments.length > 0 ? (
                    <table className={`w-full text-left my-0.5 border-collapse border border-slate-800 ${isHalfPage ? 'text-[8.5px]' : 'text-[10px]'}`}>
                      <thead>
                        <tr className="bg-slate-100 text-black font-bold border-b border-slate-800">
                          <th className={`${isHalfPage ? 'py-0.5 px-1.5' : 'py-1 px-2'} border-r border-slate-300`}>{currentT.paymentDateCol}</th>
                          <th className={`${isHalfPage ? 'py-0.5 px-1.5' : 'py-1 px-2'} border-r border-slate-300`}>{currentT.paymentModeCol}</th>
                          <th className={`${isHalfPage ? 'py-0.5 px-1.5' : 'py-1 px-2'} border-r border-slate-300`}>{currentT.paymentCycleCol}</th>
                          <th className={`${isHalfPage ? 'py-0.5 px-1.5' : 'py-1 px-2'} border-r border-slate-300`}>{currentT.paymentRefCol}</th>
                          <th className={`${isHalfPage ? 'py-0.5 px-1.5' : 'py-1 px-2'} text-right`}>{currentT.paymentAmtCol}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {rentalPayments.map((pay) => {
                          const payDateFmt = pay.date ? new Date(pay.date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
                          const isRefund = pay.type === 'refund';
                          return (
                            <tr key={pay.id} className={isRefund ? 'bg-amber-50/60' : ''}>
                              <td className={`${isHalfPage ? 'py-0.5 px-1.5' : 'py-1 px-2'} font-mono border-r border-slate-200`}>{payDateFmt}</td>
                              <td className={`${isHalfPage ? 'py-0.5 px-1.5' : 'py-1 px-2'} font-semibold border-r border-slate-200`}>
                                {cleanPaymentMode(pay.paymentMode, selectedLanguage)}
                                {isRefund && (
                                  <span className="ml-1 text-[9px] bg-amber-100 text-amber-900 font-bold px-1 py-0.2 rounded border border-amber-300">
                                    {selectedLanguage === 'marathi' ? 'परतावा' : 'Refund'}
                                  </span>
                                )}
                              </td>
                              <td className={`${isHalfPage ? 'py-0.5 px-1.5' : 'py-1 px-2'} border-r border-slate-200`}>{pay.cycleNumber ? (selectedLanguage === 'marathi' ? `सायकल #${pay.cycleNumber}` : `Cycle #${pay.cycleNumber}`) : '-'}</td>
                              <td className={`${isHalfPage ? 'py-0.5 px-1.5' : 'py-1 px-2'} text-slate-600 border-r border-slate-200 truncate max-w-xs`}>{pay.reference || pay.notes || (isRefund ? (selectedLanguage === 'marathi' ? 'अतिरिक्त ऍडव्हान्स परतावा' : 'Excess advance refunded') : '-')}</td>
                              <td className={`${isHalfPage ? 'py-0.5 px-1.5' : 'py-1 px-2'} text-right font-mono font-bold ${isRefund ? 'text-amber-700' : 'text-emerald-800'}`}>
                                {isRefund ? `-₹${pay.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : `+₹${pay.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-2 text-center text-slate-500 text-[10px] italic border border-dashed border-slate-300 rounded">
                      {currentT.noPaymentsText}
                    </div>
                  )}
                </div>
              )}

              {/* SUMMARY SECTION: Right-aligned under table */}
              <div className={`flex justify-end ${isHalfPage ? 'pt-1 pb-1' : 'pt-2 pb-4'}`}>
                <div className={`${isHalfPage ? 'w-56 sm:w-64 text-[9px]' : 'w-64 sm:w-72 text-xs'} space-y-0.5`}>
                  {allCycles.length > 1 ? (
                    <>
                      <div className="flex justify-between py-0.5 text-slate-700">
                        <span className="font-semibold">
                          {selectedLanguage === 'marathi' ? `सक्रिय सायकल (#${currentActiveCycleNumber}):` : `Active Cycle (#${currentActiveCycleNumber}):`}
                        </span>
                        <span className="font-mono">
                          ₹{totalCycleAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="font-semibold text-black">
                          {selectedLanguage === 'marathi' ? `एकूण भाडे (${allCycles.length} सायकल्स):` : `Total Rent (${allCycles.length} Cycles):`}
                        </span>
                        <span className="font-mono text-black font-bold">
                          ₹{allCyclesTotalRent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      {totalPenaltyAmount > 0 && (
                        <div className="flex justify-between py-0.5 text-amber-950 bg-amber-50 px-1 rounded border border-amber-200">
                          <span className="font-bold text-[11px]">
                            {selectedLanguage === 'marathi' ? `दंड आकारणी (${penaltyTypesSummary}):` : `Penalty Charges (${penaltyTypesSummary}):`}
                          </span>
                          <span className="font-mono font-bold">
                            + ₹{totalPenaltyAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between py-0.5">
                        <span className="font-semibold text-emerald-800">
                          {selectedLanguage === 'marathi' ? 'एकूण जमा पेमेंट्स:' : 'Total Paid Payments:'}
                        </span>
                        <span className="font-mono text-emerald-800 font-bold">
                          - ₹{allCyclesTotalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      {allCyclesBalanceDue > 0 ? (
                        <div className={`border-t-2 border-slate-900 ${isHalfPage ? 'pt-1' : 'pt-1.5 mt-1'} flex justify-between items-baseline`}>
                          <span className={`${isHalfPage ? 'text-xs' : 'text-base'} font-black text-rose-700`}>
                            {selectedLanguage === 'marathi' ? 'एकूण येणे बाकी:' : 'Balance Due:'}
                          </span>
                          <span className={`${isHalfPage ? 'text-sm' : 'text-base sm:text-lg'} font-black font-mono text-rose-700`}>
                            ₹{allCyclesBalanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      ) : allCyclesRefundDue > 0 ? (
                        <div className="border-t-2 border-emerald-600 bg-emerald-50/90 p-1.5 rounded mt-1 flex justify-between items-baseline">
                          <span className="text-xs font-black text-emerald-900">
                            {selectedLanguage === 'marathi' ? 'ग्राहकाला परतावा शिल्लक:' : 'Refund Due to Customer:'}
                          </span>
                          <span className={`${isHalfPage ? 'text-xs' : 'text-sm sm:text-base'} font-black font-mono text-emerald-800`}>
                            ₹{allCyclesRefundDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      ) : (
                        <div className="border-t-2 border-emerald-600 bg-emerald-50/60 p-1 rounded mt-0.5 flex justify-between items-baseline">
                          <span className="text-[10px] font-black text-emerald-900">
                            {selectedLanguage === 'marathi' ? 'हिशोब पूर्ण समतोल:' : 'Fully Settled:'}
                          </span>
                          <span className="text-[11px] font-black font-mono text-emerald-800">
                            ₹0.00 ✓
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between py-0.5 text-black">
                        <span className="font-bold">
                          {selectedLanguage === 'marathi' ? `दिवसनिहाय एकूण भाडे (${cycleDays} दिवस):` : `Total Day-Wise Rent (${cycleDays} Days):`}
                        </span>
                        <span className="font-mono text-black font-bold">
                          ₹{totalCycleAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between py-0.5 text-emerald-800">
                        <span className="font-bold">
                          {selectedLanguage === 'marathi' ? 'जमा रक्कम (ऍडव्हान्स):' : 'Advance / Total Paid:'}
                        </span>
                        <span className="font-mono text-emerald-800 font-bold">
                          - ₹{allCyclesTotalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      {allCyclesBalanceDue > 0 ? (
                        <div className={`border-t-2 border-slate-900 ${isHalfPage ? 'pt-1' : 'pt-1.5 mt-1'} flex justify-between items-baseline`}>
                          <span className={`${isHalfPage ? 'text-xs' : 'text-base'} font-black text-rose-700`}>
                            {selectedLanguage === 'marathi' ? 'शिल्लक येणे बाकी:' : 'Balance Remaining Due:'}
                          </span>
                          <span className={`${isHalfPage ? 'text-sm' : 'text-base sm:text-lg'} font-black font-mono text-rose-700`}>
                            ₹{allCyclesBalanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      ) : allCyclesRefundDue > 0 ? (
                        <div className="border-t-2 border-emerald-600 bg-emerald-50/90 p-1.5 rounded mt-1 flex justify-between items-baseline">
                          <span className="text-xs font-black text-emerald-900">
                            {selectedLanguage === 'marathi' ? 'ग्राहकाला परतावा शिल्लक:' : 'Excess Refund to Customer:'}
                          </span>
                          <span className={`${isHalfPage ? 'text-xs' : 'text-sm sm:text-base'} font-black font-mono text-emerald-800`}>
                            ₹{allCyclesRefundDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      ) : (
                        <div className="border-t-2 border-emerald-600 bg-emerald-50/60 p-1 rounded mt-0.5 flex justify-between items-baseline">
                          <span className="text-[10px] font-black text-emerald-900">
                            {selectedLanguage === 'marathi' ? 'हिशोब पूर्ण समतोल:' : 'Fully Settled:'}
                          </span>
                          <span className="text-[11px] font-black font-mono text-emerald-800">
                            ₹0.00 ✓
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* FOOTER */}
              <div className={`${isHalfPage ? 'pt-2' : 'pt-4'} space-y-3`}>
                {/* Bank Details & Terms */}
                {(showBankDetails || (printTerms && activeTerms && activeTerms.length > 0)) && (
                  <div className={`${isHalfPage ? 'pt-1 text-[8.5px]' : 'pt-2 text-[10px]'} border-t border-slate-100 text-slate-500 space-y-0.5`}>
                    {showBankDetails && (
                      <div className="flex items-center justify-between gap-2 flex-wrap group">
                        <p className="font-mono">
                          {selectedLanguage === 'marathi' ? 'बँक:' : 'Bank:'} {config.bankName || 'SBI'} • {selectedLanguage === 'marathi' ? 'खाते क्र.:' : 'A/C:'} {config.accountNumber || '39482910482'} • IFSC: {config.ifscCode || 'SBIN0001234'}
                          {config.upiId && ` • UPI: ${config.upiId}`}
                        </p>
                        <button
                          type="button"
                          data-no-print="true"
                          onClick={handleOpenBankEdit}
                          className="no-print bill-edit-control text-primary hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200/80 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer flex-shrink-0 group-hover:opacity-100 opacity-0"
                          title={selectedLanguage === 'marathi' ? 'बँक तपशील बदला' : 'Edit Bank Details'}
                        >
                          <Edit2 className="w-2.5 h-2.5" />
                          <span>{selectedLanguage === 'marathi' ? 'बदला' : 'Edit'}</span>
                        </button>
                      </div>
                    )}
                    {printTerms && activeTerms && activeTerms.length > 0 && (
                      <div className="space-y-0.5 pt-0.5">
                        <span className="font-bold text-slate-700 block">{currentT.termsTitle}</span>
                        {activeTerms.map((term, i) => (
                          <p key={i} className="text-slate-600 leading-tight">
                            • {term}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* KYC / Customer Verification Documents (Aadhaar Front/Back, Face, Cheque) */}
                {renderKycDocumentsSection(true)}

                {/* FOOTER: Left Party Signature | Center Thank You | Right Authorized Signature (LAST ON BILL) */}
                <div className={`${isHalfPage ? 'pt-2' : 'pt-4'}`}>
                  <div className={`flex justify-between items-end ${isHalfPage ? 'gap-2 sm:gap-3' : 'gap-3 sm:gap-6'}`}>
                    {/* Left: Party / Customer Signature */}
                    <div className={`text-center ${isHalfPage ? 'min-w-[100px] sm:min-w-[120px]' : 'min-w-[120px] sm:min-w-[140px]'}`}>
                      <div className={`border-b border-black ${isHalfPage ? 'w-24 sm:w-28' : 'w-32 sm:w-36'} mb-1 mx-auto`} />
                      <p className={`${isHalfPage ? 'text-[8.5px]' : 'text-[10px]'} font-bold uppercase text-black tracking-wider`}>
                        {selectedLanguage === 'marathi' ? 'ग्राहकाची सही / अंगठा' : "Customer's Signature"}
                      </p>
                      <p className={`${isHalfPage ? 'text-[8px]' : 'text-[9px]'} text-slate-700 font-semibold truncate ${isHalfPage ? 'max-w-[130px]' : 'max-w-[160px]'} mx-auto`}>
                        {partyDisplayName}
                      </p>
                    </div>

                    {/* Center: Thank you */}
                    <div className="text-center pb-0.5">
                      <p className={`${isHalfPage ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'} font-black text-black tracking-wide`}>
                        {selectedLanguage === 'marathi' ? '॥ धन्यवाद ॥' : 'Thank you!'}
                      </p>
                    </div>

                    {/* Right: Authorized Signature */}
                    <div className={`text-center ${isHalfPage ? 'min-w-[100px] sm:min-w-[120px]' : 'min-w-[120px] sm:min-w-[140px]'}`}>
                      <div className={`border-b border-black ${isHalfPage ? 'w-24 sm:w-28' : 'w-32 sm:w-36'} mb-1 mx-auto`} />
                      <p className={`${isHalfPage ? 'text-[8.5px]' : 'text-[10px]'} font-bold uppercase text-black tracking-wider`}>
                        {selectedLanguage === 'marathi' ? 'अधिकृत स्वाक्षरी' : 'Authorized Signature'}
                      </p>
                      <p className={`${isHalfPage ? 'text-[8px]' : 'text-[9px]'} text-slate-700 font-semibold truncate ${isHalfPage ? 'max-w-[130px]' : 'max-w-[160px]'} mx-auto`}>
                        {selectedLanguage === 'marathi' ? businessNameMr : businessName}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================= */
            /* 2. STANDARD / COMPACT / TAX INVOICE FORMAT               */
            /* ========================================================= */
            <div
              id="rental-bill-sheet"
              className={`bg-white border border-slate-200 shadow-sm rounded-2xl ${
                isHalfPage
                  ? 'p-3 sm:p-4 max-w-2xl text-[9.5px] leading-snug is-half-page-sheet'
                  : paperSize === 'a5'
                    ? 'p-4 sm:p-5 max-w-xl text-[11px]'
                    : paperOrientation === 'landscape'
                      ? 'p-5 sm:p-6 max-w-5xl text-xs'
                      : isCompact ? 'p-5 sm:p-6 max-w-3xl text-xs' : 'p-6 sm:p-8 max-w-3xl text-xs'
              } text-slate-800 font-sans mx-auto print:border-none print:shadow-none print:p-0`}
            >
              {/* Header Section */}
              <div className={`border-b-2 border-slate-800 ${isHalfPage ? 'pb-2 mb-2' : (isCompact ? 'pb-3 mb-4' : 'pb-5 mb-6')}`}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`${isHalfPage ? 'w-8 h-8' : (isCompact ? 'w-11 h-11' : 'w-14 h-14')} rounded-2xl bg-white border border-slate-200 flex items-center justify-center p-1 shadow-2xs flex-shrink-0`}>
                      <img
                        src="/logo.png"
                        alt="Anand Logo"
                        className="max-h-full max-w-full object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                    <div>
                      <h1 className={`${isHalfPage ? 'text-sm sm:text-base' : (isCompact ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl')} font-black tracking-tight text-slate-900 uppercase`}>
                        {selectedLanguage === 'marathi' ? businessNameMr : businessName}
                      </h1>
                      {config.showMarathiHeader && (
                        <p className="text-xs font-bold text-orange-600 tracking-wide">
                          {selectedLanguage === 'marathi'
                            ? `${businessNameMr} • सेन्टरिंग प्लेट्स व भाडे सेवा`
                            : `${businessName} • Centering Plates & Rental Services`}
                        </p>
                      )}
                      <p className={`${isHalfPage ? 'text-[9.5px]' : 'text-[11px]'} text-slate-500 font-medium`}>
                        {selectedLanguage === 'marathi'
                          ? 'हेवी-गेज स्टील शटरिंग प्लेट्स, कॉलम बॉक्सेस आणि बांधकाम साहित्य'
                          : 'Heavy-Duty Steel Shuttering Plates, Columns & Scaffolding Material'}
                      </p>
                      {isTaxInvoice && config.gstNumber && (
                        <p className="text-[11px] font-bold text-slate-800 font-mono mt-0.5">
                          GSTIN: <span className="text-primary">{config.gstNumber}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-left sm:text-right text-xs space-y-1 bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl w-full sm:w-auto border sm:border-none border-slate-100">
                    <div className="font-bold text-slate-700 flex items-center sm:justify-end gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-primary" />
                      <span>+91 {phones.split(',')[0]?.trim() || '7020914957'}</span>
                    </div>
                    <p className={`${isHalfPage ? 'text-[9.5px]' : 'text-[11px]'} text-slate-500`}>{selectedLanguage === 'marathi' ? 'संपर्क:' : 'Contact:'} {phones.split(',').slice(1).join(' / ').trim() || '9881985058'}</p>
                    <p className={`${isHalfPage ? 'text-[9.5px]' : 'text-[11px]'} text-slate-500`}>{address}</p>
                  </div>
                </div>
              </div>

              {/* Bill Title Banner */}
              <div className={`flex justify-between items-center ${isTaxInvoice ? 'bg-indigo-950' : 'bg-slate-900'} text-white px-4 ${isHalfPage ? 'py-1 mb-2 text-[10px]' : (isCompact ? 'py-1.5 mb-4' : 'py-2.5 mb-6')} rounded-xl shadow-sm`}>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-orange-400" />
                  <span className="text-xs font-black uppercase tracking-wider">
                    {currentT.billTitle}
                  </span>
                </div>
                <div className="text-xs font-bold tracking-wide flex items-center gap-1.5">
                  <span>{currentT.billNoLabel}</span>
                  <span className="text-orange-400 font-mono font-black">#{billNumber}</span>
                  <button
                    type="button"
                    data-no-print="true"
                    onClick={() => {
                      setTempBillNo(currentBillNo);
                      setIsEditingBillNo(true);
                    }}
                    className="no-print bill-edit-control p-0.5 text-slate-400 hover:text-white transition-colors cursor-pointer group-hover:opacity-100 opacity-0"
                    title={selectedLanguage === 'marathi' ? 'बिल नंबर बदला' : 'Edit Bill Number'}
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Customer & Billing Details Grid */}
              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${isHalfPage ? 'mb-2 p-2 text-[9px] gap-2' : (isCompact ? 'mb-4 p-3' : 'mb-6 p-4')} bg-slate-50/90 border border-slate-200/80 rounded-xl text-xs`}>
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-500" /> {currentT.customerTitle}
                  </span>
                  <p className="text-sm font-black text-slate-900 uppercase flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-slate-700 bg-slate-200/80 px-1.5 py-0.5 rounded">
                      {selectedLanguage === 'marathi' ? 'ग्राहक #' : 'Cust #'}{assignedCustomerNumber}
                    </span>
                    <span>{partyDisplayName}</span>
                  </p>
                  <p className="text-slate-600 font-medium">
                    <span className="font-bold">{currentT.contactLabel}</span> {partyDisplayMobile || (selectedLanguage === 'marathi' ? 'नोंद नाही' : 'Not specified')}
                  </p>
                  <p className="text-slate-600 font-medium">
                    <span className="font-bold">{currentT.siteLabel}</span> {partyDisplayAddress || (selectedLanguage === 'marathi' ? 'थेट साइट वाटप' : 'Direct Site Delivery')}
                  </p>
                </div>

                <div className="space-y-1.5 sm:border-l sm:border-slate-200 sm:pl-4">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-500" /> {currentT.challanDetailsTitle}
                  </span>
                  <p className="text-slate-700">
                    <span className="font-bold">{selectedLanguage === 'marathi' ? 'बिल दिनांक:' : 'Bill Dated:'}</span>{' '}
                    <span className="font-mono font-bold text-slate-900">{issueDateFormatted}</span>
                  </p>
                  <p className="text-slate-700">
                    <span className="font-bold">{currentT.periodLabel}</span> {cycleStartFormatted} {selectedLanguage === 'marathi' ? 'ते' : 'to'} {cycleEndFormatted} ({cycleDays} {selectedLanguage === 'marathi' ? 'दिवस' : 'Days'})
                  </p>
                  <p className="text-slate-700">
                    <span className="font-bold">{currentT.paymentModeLabel}</span>{' '}
                    <span className="font-bold uppercase text-slate-800">{cleanPaymentMode(rental.paymentMode, selectedLanguage)}</span>
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className={`${isHalfPage ? 'mb-2' : (isCompact ? 'mb-4' : 'mb-6')} overflow-hidden rounded-xl border border-slate-200`}>
                <table className={`w-full text-left ${isHalfPage ? 'text-[9.5px]' : 'text-xs'} border-collapse`}>
                  <thead>
                    <tr className={`bg-slate-800 text-white font-bold uppercase ${isHalfPage ? 'text-[8.5px]' : 'text-[10px]'} tracking-wider`}>
                      <th className={`${isHalfPage ? 'py-1 px-1.5 w-8' : 'py-2 px-3 w-10'} text-center`}>{currentT.srNo}</th>
                      <th className={`${isHalfPage ? 'py-1 px-2' : 'py-2 px-3'}`}>{currentT.particulars}</th>
                      <th className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} text-center`}>{currentT.qty}</th>
                      <th className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} text-right`}>{currentT.ratePerDay}</th>
                      <th className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} text-center`}>{currentT.term}</th>
                      <th className={`${isHalfPage ? 'py-1 px-2' : 'py-2 px-3'} text-right`}>{currentT.totalRent}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {plateItems.map((item, index) => {
                      const itemDays = item.days || cycleDays;
                      const rowRent = item.quantity * item.dailyRate * itemDays;
                      return (
                        <tr key={index} className="hover:bg-slate-50/50">
                          <td className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} text-center text-slate-500 font-bold`}>{index + 1}</td>
                          <td className={`${isHalfPage ? 'py-1 px-2' : 'py-2 px-3'}`}>
                            <div className={`font-bold text-slate-900 ${isHalfPage ? 'text-[10px]' : ''}`}>{formatPlateType(item.plateType, selectedLanguage)}</div>
                            <div className={`${isHalfPage ? 'text-[8.5px] px-1 py-0.2' : 'text-[10px] px-1.5 py-0.5'} font-mono text-slate-600 bg-slate-100 rounded mt-0.5 inline-block border border-slate-200`}>
                              {item.quantity} {selectedLanguage === 'marathi' ? 'प्लेट्स' : 'plates'} × ₹{Number(item.dailyRate).toFixed(2)} × {itemDays} {selectedLanguage === 'marathi' ? 'दिवस' : 'days'}
                            </div>
                          </td>
                          <td className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} text-center font-bold text-slate-800`}>{item.quantity} {currentT.nosSuffix}</td>
                          <td className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} text-right font-mono font-semibold`}>₹{Number(item.dailyRate).toFixed(2)}</td>
                          <td className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} text-center font-mono`}>{itemDays} {currentT.daysSuffix}</td>
                          <td className={`${isHalfPage ? 'py-1 px-2 font-bold' : 'py-2 px-3 font-bold'} text-right text-slate-900 font-mono`}>
                            ₹{rowRent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}

                    {extraDays > 0 && extraAmount > 0 && (
                      <tr className="bg-amber-50/60 text-amber-900 font-semibold">
                        <td className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} text-center font-bold`}>•</td>
                        <td className={`${isHalfPage ? 'py-1 px-2' : 'py-2 px-3'}`}>
                          {currentT.extraDaysTitle} ({extraDays} {currentT.daysSuffix})
                        </td>
                        <td className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} text-center font-bold`}>{rental.quantity} {currentT.nosSuffix}</td>
                        <td className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} text-right`}>₹{Number(rental.dailyRate || 1.5).toFixed(2)}</td>
                        <td className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} text-center`}>{extraDays} {selectedLanguage === 'marathi' ? 'अतिरिक्त दिवस' : 'Extra'}</td>
                        <td className={`${isHalfPage ? 'py-1 px-2' : 'py-2 px-3'} text-right font-bold text-amber-900`}>
                          +₹{extraAmount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* RENTAL CYCLES BREAKDOWN (Standard / Compact / Tax Invoice) */}
              {showCycles && allCycles.length > 0 && (
                <div className={`${isHalfPage ? 'mb-2' : (isCompact ? 'mb-4' : 'mb-6')} overflow-hidden rounded-xl border border-slate-200`}>
                  <div className={`bg-slate-100 ${isHalfPage ? 'px-2 py-1' : 'px-3 py-2'} border-b border-slate-200 flex justify-between items-center`}>
                    <span className={`${isHalfPage ? 'text-[9.5px]' : 'text-xs'} font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide`}>
                      <Calendar className={`${isHalfPage ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-primary`} />
                      <span>{currentT.cyclesTitle}</span>
                    </span>
                    <span className={`${isHalfPage ? 'text-[8.5px] px-1.5 py-0.2' : 'text-[10px] px-2 py-0.5'} font-mono font-bold rounded-full bg-slate-200 text-slate-700`}>
                      {allCycles.length} {selectedLanguage === 'marathi' ? 'सायकल्स' : 'Cycles'}
                    </span>
                  </div>
                  <div className="overflow-x-auto print:overflow-visible">
                    <table className={`w-full text-left ${isHalfPage ? 'text-[8.5px]' : 'text-xs'} border-collapse`}>
                      <thead>
                        <tr className={`bg-slate-800 text-white font-bold uppercase ${isHalfPage ? 'text-[8px]' : 'text-[10px]'} tracking-wider`}>
                          <th className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'}`}>{currentT.cycleCol}</th>
                          <th className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'}`}>{currentT.cyclePeriodCol}</th>
                          <th className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} text-center`}>{currentT.cycleDaysCol}</th>
                          <th className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} text-right`}>{currentT.cycleRentCol}</th>
                          <th className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} text-right`}>{currentT.cyclePaidCol}</th>
                          <th className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} text-right`}>{currentT.cyclePendingCol}</th>
                          <th className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} text-center`}>{currentT.cycleStatusCol}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-medium">
                        {allCycles.map((c) => {
                          const isCurrent = c.cycleNumber === currentActiveCycleNumber;
                          const startFmt = c.startDate ? new Date(c.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
                          const endFmt = c.expectedEndDate ? new Date(c.expectedEndDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
                          const isOverdue = c.status === 'active' && ((c.extraDays > 0) || (Boolean(c.expectedEndDate) && new Date(c.expectedEndDate).getTime() < Date.now()));
                          const statusBadge = c.status === 'completed'
                            ? currentT.completedCycleBadge
                            : isOverdue
                            ? currentT.overdueCycleBadge
                            : currentT.activeCycleBadge;
                          return (
                            <tr key={c.id || c.cycleNumber} className={isCurrent ? 'bg-orange-50/60 font-semibold' : 'hover:bg-slate-50/50'}>
                              <td className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'}`}>
                                {selectedLanguage === 'marathi' ? 'सायकल #' : 'Cycle #'}{c.cycleNumber}
                                {isCurrent && (
                                  <span className={`ml-1 ${isHalfPage ? 'text-[7.5px] px-1' : 'text-[9px] px-1.5 py-0.5'} bg-emerald-100 text-emerald-800 rounded font-black uppercase`}>
                                    {currentT.activeCycleBadge}
                                  </span>
                                )}
                              </td>
                              <td className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} font-mono`}>{startFmt} → {endFmt}</td>
                              <td className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} text-center font-mono`}>{c.days}{selectedLanguage === 'marathi' ? ' दि' : 'd'} {c.extraDays > 0 ? `(+${c.extraDays}${selectedLanguage === 'marathi' ? ' दि' : 'd'})` : ''}</td>
                              <td className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} text-right font-mono font-bold text-slate-900`}>
                                ₹{(c.totalAmount || c.baseRent || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} text-right font-mono text-emerald-700 font-semibold`}>
                                ₹{(c.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} text-right font-mono text-rose-700 font-semibold`}>
                                ₹{(c.pendingAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} text-center`}>
                                <span className={`${isHalfPage ? 'text-[8.5px] px-1.5 py-0.2' : 'text-[10px] px-2 py-0.5'} font-bold rounded-full ${
                                  c.status === 'completed' ? 'bg-slate-100 text-slate-700' : isOverdue ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  {statusBadge}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* RETURNED BATCHES LOG (Standard / Compact / Tax Invoice) */}
              {partialBreakdown && partialBreakdown.returnedBatches.length > 0 && (
                <div className={`${isHalfPage ? 'mb-2' : (isCompact ? 'mb-4' : 'mb-6')} overflow-hidden rounded-xl border border-slate-200`}>
                  <div className={`bg-slate-100 ${isHalfPage ? 'px-2 py-1' : 'px-3 py-2'} border-b border-slate-200 flex justify-between items-center`}>
                    <span className={`${isHalfPage ? 'text-[9.5px]' : 'text-xs'} font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide`}>
                      <Package className={`${isHalfPage ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-blue-600`} />
                      <span>{selectedLanguage === 'marathi' ? 'माघारी आलेले साहित्य व भाडे हिशोब' : 'Returned Plates & Day-Wise Proration'}</span>
                    </span>
                    <span className={`${isHalfPage ? 'text-[8.5px] px-1.5 py-0.2' : 'text-[10px] px-2 py-0.5'} font-mono font-bold rounded-full bg-slate-200 text-slate-700`}>
                      {selectedLanguage === 'marathi' ? `दर: ₹${partialBreakdown.dailyRate}/दिवस` : `Rate: ₹${partialBreakdown.dailyRate}/day`}
                    </span>
                  </div>
                  <div className="overflow-x-auto print:overflow-visible">
                    <table className={`w-full text-left ${isHalfPage ? 'text-[8.5px]' : 'text-xs'} border-collapse`}>
                      <thead>
                        <tr className={`bg-slate-800 text-white font-bold uppercase ${isHalfPage ? 'text-[8px]' : 'text-[10px]'} tracking-wider`}>
                          <th className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'}`}>{selectedLanguage === 'marathi' ? 'तपशील' : 'Details'}</th>
                          <th className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'}`}>{selectedLanguage === 'marathi' ? 'परत दिनांक' : 'Return Date'}</th>
                          <th className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} text-center`}>{selectedLanguage === 'marathi' ? 'नग' : 'Qty'}</th>
                          <th className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} text-center`}>{selectedLanguage === 'marathi' ? 'वापर दिवस' : 'Days Kept'}</th>
                          <th className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} text-right`}>{selectedLanguage === 'marathi' ? 'भाडे रक्कम' : 'Rent (₹)'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-medium">
                        {partialBreakdown.returnedBatches.map((b, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} font-semibold text-slate-800`}>
                              {selectedLanguage === 'marathi' ? `माघार बॅच #${idx + 1}` : `Returned Batch #${idx + 1}`}
                            </td>
                            <td className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} font-mono`}>{b.returnDate}</td>
                            <td className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} text-center font-bold`}>{b.returnedQuantity} {selectedLanguage === 'marathi' ? 'प्लेट्स' : 'Plates'}</td>
                            <td className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} text-center font-mono`}>{b.elapsedDays} {selectedLanguage === 'marathi' ? 'दिवस' : 'Days'}</td>
                            <td className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} text-right font-mono font-bold text-slate-900`}>
                              ₹{b.rentAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                        {partialBreakdown.remainingQuantity > 0 && (
                          <tr className="bg-blue-50/60 font-semibold">
                            <td className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} text-blue-900 font-bold`}>
                              {selectedLanguage === 'marathi' ? 'चालू उर्वरित साहित्य (४० दिवस)' : 'Remaining Plates (Continuing 40 Days)'}
                            </td>
                            <td className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} font-mono text-blue-700 italic`}>
                              {selectedLanguage === 'marathi' ? 'चालू भाडे' : 'Continuing'}
                            </td>
                            <td className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} text-center font-bold text-blue-900`}>{partialBreakdown.remainingQuantity} {selectedLanguage === 'marathi' ? 'प्लेट्स' : 'Plates'}</td>
                            <td className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} text-center font-mono text-blue-900`}>{partialBreakdown.remainingPlatesDays} {selectedLanguage === 'marathi' ? 'दिवस' : 'Days'}</td>
                            <td className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} text-right font-mono font-bold text-blue-950`}>
                              ₹{partialBreakdown.remainingPlatesRent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* LATEST PAYMENTS LOG (Standard / Compact / Tax Invoice) */}
              {showPayments && (
                <div className={`${isHalfPage ? 'mb-2' : (isCompact ? 'mb-4' : 'mb-6')} overflow-hidden rounded-xl border border-slate-200`}>
                  <div className={`bg-slate-100 ${isHalfPage ? 'px-2 py-1' : 'px-3 py-2'} border-b border-slate-200 flex justify-between items-center`}>
                    <span className={`${isHalfPage ? 'text-[9.5px]' : 'text-xs'} font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide`}>
                      <Landmark className={`${isHalfPage ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-emerald-600`} />
                      <span>{currentT.paymentsTitle}</span>
                    </span>
                    <span className={`${isHalfPage ? 'text-[8.5px] px-1.5 py-0.2' : 'text-[10px] px-2 py-0.5'} font-mono font-bold rounded-full bg-slate-200 text-slate-700`}>
                      {rentalPayments.length} {selectedLanguage === 'marathi' ? 'पेमेंट्स' : 'Payments'}
                    </span>
                  </div>
                  {rentalPayments.length > 0 ? (
                    <div className="overflow-x-auto print:overflow-visible">
                      <table className={`w-full text-left ${isHalfPage ? 'text-[8.5px]' : 'text-xs'} border-collapse`}>
                        <thead>
                          <tr className={`bg-slate-800 text-white font-bold uppercase ${isHalfPage ? 'text-[8px]' : 'text-[10px]'} tracking-wider`}>
                            <th className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'}`}>{currentT.paymentDateCol}</th>
                            <th className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'}`}>{currentT.paymentModeCol}</th>
                            <th className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'}`}>{currentT.paymentCycleCol}</th>
                            <th className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'}`}>{currentT.paymentRefCol}</th>
                            <th className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} text-right`}>{currentT.paymentAmtCol}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-medium">
                          {rentalPayments.map((pay) => {
                            const payDateFmt = pay.date ? new Date(pay.date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
                            const isRefund = pay.type === 'refund';
                            return (
                              <tr key={pay.id} className={isRefund ? 'bg-amber-50/60' : 'hover:bg-slate-50/50'}>
                                <td className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} font-mono`}>{payDateFmt}</td>
                                <td className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} font-semibold text-slate-900`}>
                                  {cleanPaymentMode(pay.paymentMode, selectedLanguage)}
                                  {isRefund && (
                                    <span className={`ml-1 ${isHalfPage ? 'text-[7.5px] px-1' : 'text-[9px] px-1.5 py-0.5'} bg-amber-100 text-amber-900 font-bold rounded border border-amber-300`}>
                                      {selectedLanguage === 'marathi' ? 'परतावा' : 'Refund'}
                                    </span>
                                  )}
                                  {pay.penaltyAmount && pay.penaltyAmount > 0 && (
                                    <span className={`ml-1 ${isHalfPage ? 'text-[7.5px] px-1' : 'text-[9px] px-1.5 py-0.5'} bg-amber-100 text-amber-950 font-bold rounded border border-amber-300`}>
                                      +{selectedLanguage === 'marathi' ? 'दंड' : 'Penalty'} ₹{pay.penaltyAmount}{pay.penaltyType ? ` (${getPenaltyTypeLabel(pay.penaltyType, selectedLanguage === 'marathi')})` : ''}
                                    </span>
                                  )}
                                </td>
                                <td className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} text-slate-600`}>{pay.cycleNumber ? (selectedLanguage === 'marathi' ? `सायकल #${pay.cycleNumber}` : `Cycle #${pay.cycleNumber}`) : '-'}</td>
                                <td className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} text-slate-600 max-w-xs truncate`}>{pay.reference || pay.notes || (isRefund ? (selectedLanguage === 'marathi' ? 'अतिरिक्त ऍडव्हान्स परतावा' : 'Excess advance refunded') : '-')}</td>
                                <td className={`${isHalfPage ? 'py-1 px-1.5' : 'py-2 px-3'} text-right font-mono font-bold ${isRefund ? 'text-amber-700' : 'text-emerald-700'}`}>
                                  {isRefund ? `-₹${pay.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : `+₹${pay.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className={`p-2 text-center text-slate-500 ${isHalfPage ? 'text-[9px]' : 'text-xs'} italic bg-slate-50/50`}>
                      {currentT.noPaymentsText}
                    </div>
                  )}
                </div>
              )}

              {/* Totals & Details */}
              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${isHalfPage ? 'mb-2 text-[9px]' : (isCompact ? 'mb-4 text-xs' : 'mb-6 text-xs')}`}>
                <div className={`${isHalfPage ? 'space-y-1.5' : 'space-y-3'}`}>
                  <div className={`bg-slate-50 border border-slate-200 rounded-xl ${isHalfPage ? 'p-2' : 'p-3'}`}>
                    <span className={`${isHalfPage ? 'text-[8.5px]' : 'text-[10px]'} font-black uppercase text-slate-500 tracking-wider block ${isHalfPage ? 'mb-0.5' : 'mb-1.5'}`}>
                      {currentT.paymentModeLabel}
                    </span>
                    <p className="flex justify-between">
                      <span className="text-slate-500">{selectedLanguage === 'marathi' ? 'पद्धत:' : 'Mode:'}</span>
                      <span className="font-bold">{cleanPaymentMode(rental.paymentMode, selectedLanguage)}</span>
                    </p>
                  </div>

                  {showBankDetails && (
                    <div className={`bg-blue-50/70 border border-blue-200/80 rounded-xl ${isHalfPage ? 'p-2' : 'p-3'} relative group`}>
                      <div className="flex items-center justify-between gap-1 mb-1 group">
                        <span className={`${isHalfPage ? 'text-[8.5px]' : 'text-[10px]'} font-black uppercase text-blue-800 tracking-wider flex items-center gap-1`}>
                          <Landmark className={`${isHalfPage ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-blue-600`} /> {currentT.bankTitle}
                        </span>
                        <button
                          type="button"
                          data-no-print="true"
                          onClick={handleOpenBankEdit}
                          className="no-print bill-edit-control text-blue-700 hover:text-blue-900 bg-white hover:bg-blue-100/80 border border-blue-200 px-1.5 py-0.2 rounded text-[9px] font-bold flex items-center gap-0.5 transition-all cursor-pointer shadow-2xs group-hover:opacity-100 opacity-0"
                          title={selectedLanguage === 'marathi' ? 'बँक तपशील बदला' : 'Edit Bank Details'}
                        >
                          <Edit2 className="w-2.5 h-2.5" />
                          <span>{selectedLanguage === 'marathi' ? 'बदला' : 'Edit'}</span>
                        </button>
                      </div>
                      <div className={`space-y-0.5 text-slate-700 font-medium ${isHalfPage ? 'text-[8.5px]' : 'text-[11px]'}`}>
                        <p><span className="text-slate-500">{currentT.bankLabel}</span> <strong className="text-slate-800">{config.bankName || 'SBI'}</strong></p>
                        <p><span className="text-slate-500">{currentT.acNoLabel}</span> <strong className="font-mono text-slate-900">{config.accountNumber || '39482910482'}</strong></p>
                        <p><span className="text-slate-500">{currentT.ifscLabel}</span> <strong className="font-mono text-slate-900">{config.ifscCode || 'SBIN0001234'}</strong></p>
                        {config.upiId && <p className="font-semibold text-blue-900">{currentT.upiLabel} {config.upiId}</p>}
                      </div>
                    </div>
                  )}
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden h-fit">
                  <div className="divide-y divide-slate-200">
                    {allCycles.length > 1 ? (
                      <>
                        <div className={`flex justify-between ${isHalfPage ? 'py-1 px-2.5' : 'py-2 px-4'} bg-slate-50 font-medium`}>
                          <span className="text-slate-600">{currentT.activeCycleLabel} #{currentActiveCycleNumber}</span>
                          <span className="font-bold text-slate-900">₹{totalCycleAmount.toLocaleString('en-IN')}</span>
                        </div>
                        <div className={`flex justify-between ${isHalfPage ? 'py-1 px-2.5' : 'py-2.5 px-4'} bg-slate-100 font-bold text-slate-900`}>
                          <span>{currentT.totalCyclesRentLabel} ({allCycles.length} {selectedLanguage === 'marathi' ? 'सायकल्स' : 'Cycles'})</span>
                          <span className={`${isHalfPage ? 'text-xs' : 'text-sm'}`}>₹{allCyclesTotalRent.toLocaleString('en-IN')}</span>
                        </div>
                        {totalPenaltyAmount > 0 && (
                          <div className={`flex justify-between ${isHalfPage ? 'py-1 px-2.5' : 'py-2 px-4'} bg-amber-50 text-amber-950 font-bold border-t border-amber-200`}>
                            <span>
                              {selectedLanguage === 'marathi' ? 'दंड / अतिरिक्त आकारणी' : 'Damage / Penalty Charges'}{' '}
                              <span className="text-[11px] font-semibold text-amber-800">({penaltyTypesSummary})</span>
                            </span>
                            <span className="font-mono">+ ₹{totalPenaltyAmount.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        <div className={`flex justify-between ${isHalfPage ? 'py-1 px-2.5' : 'py-2 px-4'} font-bold text-emerald-700 bg-emerald-50/50`}>
                          <span>{currentT.totalPaidPaymentsLabel}</span>
                          <span>- ₹{allCyclesTotalPaid.toLocaleString('en-IN')}</span>
                        </div>
                        {allCyclesBalanceDue > 0 ? (
                          <div className={`flex justify-between ${isHalfPage ? 'py-1.5 px-2.5' : 'py-3 px-4'} font-black bg-rose-50 text-rose-700 ${isHalfPage ? 'text-xs' : 'text-sm'}`}>
                            <span>{currentT.netAllCyclesDueLabel}</span>
                            <span>₹{allCyclesBalanceDue.toLocaleString('en-IN')}</span>
                          </div>
                        ) : allCyclesRefundDue > 0 ? (
                          <div className={`flex justify-between ${isHalfPage ? 'py-1.5 px-2.5' : 'py-3 px-4'} font-black bg-emerald-50 text-emerald-800 ${isHalfPage ? 'text-xs' : 'text-sm'}`}>
                            <span>{selectedLanguage === 'marathi' ? 'ग्राहकाला परतावा शिल्लक' : 'Refund Due to Customer'}</span>
                            <span>₹{allCyclesRefundDue.toLocaleString('en-IN')}</span>
                          </div>
                        ) : (
                          <div className={`flex justify-between ${isHalfPage ? 'py-1.5 px-2.5' : 'py-3 px-4'} font-black bg-emerald-50 text-emerald-800 ${isHalfPage ? 'text-xs' : 'text-sm'}`}>
                            <span>{selectedLanguage === 'marathi' ? 'हिशोब पूर्ण समतोल' : 'Fully Settled'}</span>
                            <span>₹0 ✓</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className={`flex justify-between ${isHalfPage ? 'py-1 px-2.5' : 'py-2 px-4'} bg-slate-50 font-medium`}>
                          <span className="text-slate-600">{currentT.baseRentLabel}</span>
                          <span className="font-bold text-slate-900">₹{(totalCycleAmount - extraAmount).toLocaleString('en-IN')}</span>
                        </div>
                        {extraAmount > 0 && (
                          <div className={`flex justify-between ${isHalfPage ? 'py-1 px-2.5' : 'py-2 px-4'} bg-amber-50/50 text-amber-800`}>
                            <span>{currentT.extraRentLabel}</span>
                            <span className="font-bold">₹{extraAmount.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        <div className={`flex justify-between ${isHalfPage ? 'py-1 px-2.5' : 'py-2.5 px-4'} bg-slate-100 font-bold text-slate-900`}>
                          <span>{currentT.totalDueLabel}</span>
                          <span className={`${isHalfPage ? 'text-xs' : 'text-sm'}`}>₹{totalCycleAmount.toLocaleString('en-IN')}</span>
                        </div>
                        {totalPenaltyAmount > 0 && (
                          <div className={`flex justify-between ${isHalfPage ? 'py-1 px-2.5' : 'py-2 px-4'} bg-amber-50 text-amber-950 font-bold border-t border-amber-200`}>
                            <span>
                              {selectedLanguage === 'marathi' ? 'दंड / अतिरिक्त आकारणी' : 'Damage / Penalty Charges'}{' '}
                              <span className="text-[11px] font-semibold text-amber-800">({penaltyTypesSummary})</span>
                            </span>
                            <span className="font-mono">+ ₹{totalPenaltyAmount.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        <div className={`flex justify-between ${isHalfPage ? 'py-1 px-2.5' : 'py-2 px-4'} font-bold text-emerald-700 bg-emerald-50/50`}>
                          <span>{currentT.paidLabel}</span>
                          <span>- ₹{allCyclesTotalPaid.toLocaleString('en-IN')}</span>
                        </div>
                        {allCyclesBalanceDue > 0 ? (
                          <div className={`flex justify-between ${isHalfPage ? 'py-1.5 px-2.5' : 'py-3 px-4'} font-black bg-rose-50 text-rose-700 ${isHalfPage ? 'text-xs' : 'text-sm'}`}>
                            <span>{currentT.outstandingLabel}</span>
                            <span>₹{allCyclesBalanceDue.toLocaleString('en-IN')}</span>
                          </div>
                        ) : allCyclesRefundDue > 0 ? (
                          <div className={`flex justify-between ${isHalfPage ? 'py-1.5 px-2.5' : 'py-3 px-4'} font-black bg-emerald-50 text-emerald-800 ${isHalfPage ? 'text-xs' : 'text-sm'}`}>
                            <span>{selectedLanguage === 'marathi' ? 'ग्राहकाला परतावा शिल्लक' : 'Refund Due to Customer'}</span>
                            <span>₹{allCyclesRefundDue.toLocaleString('en-IN')}</span>
                          </div>
                        ) : (
                          <div className={`flex justify-between ${isHalfPage ? 'py-1.5 px-2.5' : 'py-3 px-4'} font-black bg-emerald-50 text-emerald-800 ${isHalfPage ? 'text-xs' : 'text-sm'}`}>
                            <span>{selectedLanguage === 'marathi' ? 'हिशोब पूर्ण समतोल' : 'Fully Settled'}</span>
                            <span>₹0 ✓</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Terms & Conditions block (Standard / Compact / Tax Invoice) */}
              {printTerms && activeTerms && activeTerms.length > 0 && (
                <div className={`bg-slate-50 border border-slate-200 rounded-xl ${isHalfPage ? 'p-2 text-[9px] mb-2' : (isCompact ? 'p-3 text-[11px] mb-4' : 'p-3 text-[11px] mb-6')} text-slate-600`}>
                  <span className={`${isHalfPage ? 'text-[8.5px]' : 'text-[10px]'} font-black uppercase text-slate-700 tracking-wider block mb-1`}>
                    {currentT.termsTitle}
                  </span>
                  <ul className="space-y-0.5 pl-1 leading-relaxed">
                    {activeTerms.map((term, index) => (
                      <li key={index} className="text-slate-600 flex items-start gap-1.5">
                        <span className="font-bold text-slate-400 select-none">•</span>
                        <span>{term}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* KYC / Customer Verification Documents (Aadhaar Front/Back, Face, Cheque) */}
              {renderKycDocumentsSection(false)}

              {/* Signatures (LAST ON BILL) */}
              <div className={`grid grid-cols-2 gap-8 ${isHalfPage ? 'pt-2' : (isCompact ? 'pt-4' : 'pt-6')} border-t border-slate-200 text-xs`}>
                <div className={`text-center ${isHalfPage ? 'space-y-2' : 'space-y-6'}`}>
                  <div className={`border-b border-dashed border-slate-400 ${isHalfPage ? 'w-28' : 'w-44'} mx-auto`} />
                  <p className="font-bold text-slate-800">
                    {currentT.customerSign}<br />
                    <span className="text-[10px] text-slate-400 font-normal">{currentT.customerSignSub}</span>
                  </p>
                </div>

                <div className={`text-center ${isHalfPage ? 'space-y-2' : 'space-y-6'}`}>
                  <div className={`border-b border-dashed border-slate-400 ${isHalfPage ? 'w-28' : 'w-44'} mx-auto`} />
                  <p className="font-bold text-slate-800">
                    {currentT.authorizedSign}<br />
                    <span className="text-[10px] text-slate-400 font-normal">{currentT.authorizedSignSub}</span>
                  </p>
                </div>
              </div>


            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal for Enlarge KYC Document */}
      {enlargedImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-4 print:hidden"
          onClick={() => setEnlargedImage(null)}
        >
          <div
            className="relative max-w-3xl w-full max-h-[90vh] bg-white rounded-2xl p-4 shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-3 mb-2 border-b border-slate-200">
              <span className="font-bold text-sm text-slate-900">{enlargedImage.title}</span>
              <button
                type="button"
                onClick={() => setEnlargedImage(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="w-full overflow-auto max-h-[75vh] flex items-center justify-center bg-slate-50 rounded-xl p-2">
              <img
                src={enlargedImage.url}
                alt={enlargedImage.title}
                className="max-h-[72vh] max-w-full object-contain rounded-lg shadow-sm"
              />
            </div>
          </div>
        </div>
      )}
      {/* Edit Bank & UPI Details Modal */}
      {isEditingBankModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsEditingBankModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 animate-scaleUp text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-orange-100 text-primary rounded-xl">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-slate-900">
                    {selectedLanguage === 'marathi' ? 'बँक व युपीआय तपशील संपादन' : 'Edit Bank & UPI Details'}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {selectedLanguage === 'marathi'
                      ? 'बिलावर प्रिंट होणारे बँक नाव, खाते क्र., आयएफएससी आणि युपीआय बदला'
                      : 'Change Bank Name, Account No, IFSC Code & UPI printed on bill'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingBankModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {bankSaveSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{bankSaveSuccess}</span>
              </div>
            )}

            <div className="space-y-3.5">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 hover:bg-slate-100 transition-all">
                <input
                  type="checkbox"
                  checked={bankEditForm.showBankDetails}
                  onChange={(e) =>
                    setBankEditForm((prev) => ({ ...prev, showBankDetails: e.target.checked }))
                  }
                  className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                />
                <span>
                  {selectedLanguage === 'marathi'
                    ? 'या बिलावर बँक माहिती दाखवा (Print Bank Details on Bill)'
                    : 'Print Bank Details on this Bill'}
                </span>
              </label>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase">
                  {selectedLanguage === 'marathi' ? 'बँकेचे नाव (Bank Name)' : 'Bank Name'}
                </label>
                <input
                  type="text"
                  value={bankEditForm.bankName}
                  onChange={(e) =>
                    setBankEditForm((prev) => ({ ...prev, bankName: e.target.value }))
                  }
                  placeholder="State Bank of India"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase">
                  {selectedLanguage === 'marathi' ? 'खाते क्रमांक (Account Number)' : 'Account Number'}
                </label>
                <input
                  type="text"
                  value={bankEditForm.accountNumber}
                  onChange={(e) =>
                    setBankEditForm((prev) => ({ ...prev, accountNumber: e.target.value }))
                  }
                  placeholder="39482910482"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase">
                    {selectedLanguage === 'marathi' ? 'आयएफएससी कोड (IFSC Code)' : 'IFSC Code'}
                  </label>
                  <input
                    type="text"
                    value={bankEditForm.ifscCode}
                    onChange={(e) =>
                      setBankEditForm((prev) => ({ ...prev, ifscCode: e.target.value.toUpperCase() }))
                    }
                    placeholder="SBIN0001234"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase">
                    {selectedLanguage === 'marathi' ? 'युपीआय आयडी (UPI ID)' : 'UPI ID'}
                  </label>
                  <input
                    type="text"
                    value={bankEditForm.upiId}
                    onChange={(e) =>
                      setBankEditForm((prev) => ({ ...prev, upiId: e.target.value }))
                    }
                    placeholder="anandbuilders@upi"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-900"
                  />
                </div>
              </div>

              {/* Quick Helper Presets */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  {selectedLanguage === 'marathi' ? 'त्वरित पर्याय:' : 'Presets:'}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setBankEditForm({
                      bankName: 'State Bank of India',
                      accountNumber: '39482910482',
                      ifscCode: 'SBIN0001234',
                      upiId: 'anandbuilders@upi',
                      showBankDetails: true,
                    })
                  }
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer"
                >
                  SBI Default
                </button>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditingBankModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-xs transition cursor-pointer"
              >
                {selectedLanguage === 'marathi' ? 'रद्द करा' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => handleSaveBankEdit(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer"
                title="Only change for this bill without updating global settings"
              >
                {selectedLanguage === 'marathi' ? 'फक्त या बिलासाठी लागू करा' : 'Apply to This Bill'}
              </button>
              <button
                type="button"
                onClick={() => handleSaveBankEdit(true)}
                className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 cursor-pointer"
                title="Save for this bill and make default for future bills"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{selectedLanguage === 'marathi' ? 'सर्व बिलांसाठी सेव्ह करा' : 'Save for All Bills'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Sharing Notification Toast */}
      {shareToast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 animate-slideUp text-xs font-bold ${
            shareToast.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-900/30'
              : shareToast.type === 'info'
              ? 'bg-slate-900 text-white border-slate-700 shadow-slate-900/40'
              : 'bg-rose-600 text-white border-rose-500 shadow-rose-900/30'
          }`}
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 flex-shrink-0" />
            <span>{shareToast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setShareToast(null)}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>,
    document.body
  );
};


