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
} from 'lucide-react';
import type { Rental, RentalCycle, Party, Payment } from '../../../data/adminMockData';
import {
  getBillTemplateConfig,
  saveBillTemplateConfig,
  MARATHI_TERMS,
  ENGLISH_TERMS,
  type BillTemplateConfig,
  type BillTemplateStyle,
  type BillLanguage,
} from '../../../utils/billTemplateUtils';

interface RentalBillModalProps {
  rental: Rental;
  activeCycle?: RentalCycle;
  rentalCycles?: RentalCycle[];
  party?: Party;
  payments?: Payment[];
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
  onClose: () => void;
}

export const RentalBillModal: React.FC<RentalBillModalProps> = ({
  rental,
  activeCycle,
  rentalCycles = [],
  party,
  payments = [],
  templateConfig,
  finances,
  billNumber: billNumberProp,
  customerNumber: customerNumberProp,
  onClose,
}) => {
  const config = templateConfig || getBillTemplateConfig();
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

  // Sync when templateConfig prop updates (e.g. previewing from settings)
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
  const assignedBillNumber = billNumberProp ?? rental.billNumber ?? 1;
  const assignedCustomerNumber = customerNumberProp ?? party?.customerNumber ?? rental.customerNumber ?? 1;
  const billNumber = String(assignedBillNumber);

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
    : '40 Days from issue';

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

  const totalCycleAmount = finances?.totalAmount ?? activeCycle?.totalAmount ?? rental.totalRent;
  const totalPaidAmount = activeCycle?.paidAmount ?? rental.paid;
  const totalPendingAmount = finances?.pendingAmount ?? activeCycle?.pendingAmount ?? rental.pending;
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
  const allCyclesTotalRent = allCycles.length > 0
    ? allCycles.reduce((sum, c) => sum + (c.totalAmount || c.baseRent || 0), 0)
    : totalCycleAmount;

  const totalPaymentsReceived = rentalPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  const allCyclesTotalPaid = totalPaymentsReceived > 0
    ? totalPaymentsReceived
    : (allCycles.length > 0
        ? allCycles.reduce((sum, c) => sum + (c.paidAmount || 0), 0)
        : totalPaidAmount);

  const allCyclesBalanceDue = Math.max(0, allCyclesTotalRent - allCyclesTotalPaid);
  const currentActiveCycleNumber = activeCycle?.cycleNumber || rental.currentCycleNumber || 1;

  const isSimple = selectedStyle === 'simple';
  const isTaxInvoice = selectedStyle === 'tax_invoice';
  const isCompact = selectedStyle === 'compact';

  // Sanitized Payment Mode - strictly no "Udhari" name
  const cleanPaymentMode = (mode?: string, lang: BillLanguage = selectedLanguage) => {
    if (!mode) {
      return lang === 'marathi' ? 'बाकी (Outstanding)' : lang === 'english' ? 'Outstanding' : 'बाकी / Outstanding';
    }
    const lower = mode.toLowerCase();
    if (lower === 'udhari' || lower === 'outstanding' || lower === 'credit') {
      if (lang === 'marathi') return 'बाकी (Outstanding)';
      if (lang === 'english') return 'Outstanding';
      return 'बाकी / Outstanding';
    }
    return mode;
  };

  // Translations dictionary for dynamic language switching
  const t = {
    marathi: {
      sacred: '॥ श्री गणेशाय नमः ॥',
      businessTitle: businessNameMr,
      businessSubtitle: businessName,
      tagline: 'सेन्टरिंग प्लेट्स, कॉलम बॉक्सेस आणि बांधकाम साहित्य भाड्याने मिळतील',
      addressPrefix: 'पत्ता:',
      billTitle: 'भाडे पावती व साहित्य चालान',
      billNoLabel: 'पावती क्र.:',
      customerTitle: 'ग्राहकाचे नाव (Billed To):',
      contactLabel: 'मोबाईल नं.:',
      siteLabel: 'कामाचे ठिकाण (Site):',
      challanDetailsTitle: 'पावती तपशील:',
      issueDateLabel: 'दिनांक (Issue Date):',
      termLabel: 'भाडे मुदत:',
      termValue: `${cycleDays} दिवस (${cycleDays} Days Cycle)`,
      periodLabel: 'कालावधी:',
      paymentModeLabel: 'पेमेंट पद्धत:',
      srNo: 'अ.क्र.',
      particulars: 'साहित्याचे नाव (Particulars)',
      qty: 'नग (Qty)',
      term: 'मुदत',
      ratePerDay: 'दर/दिवस',
      totalRent: 'एकूण भाडे (₹)',
      platePrefix: 'सेन्टरिंग प्लेट्स',
      plateSub: 'हेवी-गेज स्टील प्लेट्स',
      nosSuffix: 'नग',
      daysSuffix: 'दिवस',
      extraDaysTitle: `अतिरिक्त वापर दिवस (${cycleDays} दिवसांनंतर)`,
      extraDaysSub: `${cycleDays} दिवसांच्या मुदतीनंतरचा प्रतिदिन वापर`,
      bankTitle: 'बँक व UPI माहिती (Payment Details):',
      bankLabel: 'बँक:',
      acNoLabel: 'खाते क्र.:',
      ifscLabel: 'IFSC:',
      upiLabel: 'UPI ID:',
      termsTitle: 'नियम व अटी (Terms & Conditions):',
      summaryTitle: 'हिशोब तपशील (Payment Summary)',
      baseRentLabel: `${cycleDays} दिवसांचे भाडे:`,
      extraRentLabel: 'अतिरिक्त दिवस भाडे:',
      totalDueLabel: 'एकूण देय रक्कम:',
      paidLabel: 'जमा रक्कम / ऍडव्हान्स:',
      outstandingLabel: 'बाकी रक्कम (Outstanding Due):',
      customerSign: 'ग्राहकाची सही / अंगठा',
      customerSignSub: `Customer Signature (${party?.name || rental.partyName})`,
      authorizedSign: `${businessNameMr} करिता`,
      authorizedSignSub: 'Authorized Signatory / अधिकृत स्वाक्षरी',
      footerNote: `संगणकीकृत भाडे पावती • ${businessName} • ${address}`,
      cyclesTitle: 'भाडे सायकल तपशील (Rental Cycles Breakdown)',
      cycleCol: 'सायकल',
      cyclePeriodCol: 'कालावधी (Period)',
      cycleDaysCol: 'दिवस',
      cycleRentCol: 'भाडे (₹)',
      cyclePaidCol: 'जमा (₹)',
      cyclePendingCol: 'बाकी (₹)',
      cycleStatusCol: 'स्थिती',
      activeCycleBadge: 'सक्रिय (Active)',
      completedCycleBadge: 'पूर्ण',
      overdueCycleBadge: 'मुदत संपली (Overdue)',
      paymentsTitle: 'जमा पेमेंट्स तपशील (Latest Payments & Receipts Log)',
      paymentDateCol: 'दिनांक',
      paymentModeCol: 'पेमेंट प्रकार',
      paymentCycleCol: 'सायकल',
      paymentRefCol: 'संदर्भ / तपशील',
      paymentAmtCol: 'जमा रक्कम (₹)',
      noPaymentsText: 'या भाडे खात्यावर अद्याप कोणतेही पेमेंट जमा नोंदवलेले नाही.',
      totalCyclesRentLabel: 'सर्व सायकल्स एकूण भाडे:',
      totalPaidPaymentsLabel: 'एकूण जमा पेमेंट्स:',
      netAllCyclesDueLabel: 'एकूण निव्वळ येणे बाकी:',
      activeCycleLabel: 'सक्रिय सायकल:',
    },
    english: {
      sacred: '',
      businessTitle: businessName,
      businessSubtitle: businessNameMr,
      tagline: 'Heavy-Duty Steel Shuttering Plates, Columns & Scaffolding Material on Rental',
      addressPrefix: 'Yard Address:',
      billTitle: 'RENTAL BILL & DELIVERY CHALLAN',
      billNoLabel: 'BILL NO.:',
      customerTitle: 'Billed / Dispatched To:',
      contactLabel: 'Mobile / Phone:',
      siteLabel: 'Delivery Site Address:',
      challanDetailsTitle: 'Challan Details:',
      issueDateLabel: 'Issue Date:',
      termLabel: 'Rental Term:',
      termValue: `${cycleDays} Days Normal Cycle`,
      periodLabel: 'Cycle Period:',
      paymentModeLabel: 'Payment Mode:',
      srNo: 'Sr.',
      particulars: 'Item Description (Shuttering Plates)',
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
      summaryTitle: 'Settlement & Payment Summary',
      baseRentLabel: `Standard ${cycleDays}-Day Rent:`,
      extraRentLabel: 'Extra Overdue Rent:',
      totalDueLabel: 'Total Billed Amount:',
      paidLabel: 'Advance / Total Paid:',
      outstandingLabel: 'Net Outstanding Due:',
      customerSign: 'Customer / Receiver Signature',
      customerSignSub: `Material Received in Good Condition (${party?.name || rental.partyName})`,
      authorizedSign: `For ${businessName}`,
      authorizedSignSub: config.signatoryTitle || 'Authorized Signatory / Stamp',
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

  // Active terms based on selected language
  const activeTerms = (() => {
    if (selectedLanguage === 'marathi') {
      return (config.termsAndConditions && config.termsAndConditions.length > 0 && config.billLanguage === 'marathi')
        ? config.termsAndConditions
        : MARATHI_TERMS;
    }
    return ENGLISH_TERMS;
  })();

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div id="rental-bill-portal" className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      {/* Print-specific CSS styles */}
      <style>{`
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

          /* Hide controls and screen-only elements */
          .no-print {
            display: none !important;
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
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: ${isCompact ? '4mm 6mm' : '6mm 8mm'} !important;
            box-shadow: none !important;
            border: 1px solid #1e293b !important;
            background: white !important;
            color: black !important;
            overflow: visible !important;
          }

          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
        }
      `}</style>

      <div className={`bg-white rounded-3xl border border-slate-200 ${isCompact ? 'max-w-3xl' : 'max-w-4xl'} w-full max-h-[95vh] flex flex-col overflow-hidden shadow-2xl animate-scaleUp my-auto print:max-w-full print:max-h-none print:shadow-none print:border-none print:rounded-none`}>
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
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {selectedStyle.replace('_', ' ')}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">{currentT.billNoLabel} #{billNumber}</p>
            </div>
          </div>

          {/* Language and Format controls */}
          <div className="flex items-center gap-2 flex-wrap">
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

            <button
              onClick={handlePrint}
              className="bg-primary hover:bg-primary-dark text-white font-bold px-4 py-2 rounded-xl shadow-md hover:shadow-orange-500/20 text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer"
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
          {/* 1. SIMPLE BILL FORMAT (साधे बिल) - DEFAULT & RECOMMENDED */}
          {/* ========================================================= */}
          {isSimple ? (
            <div
              id="rental-bill-sheet"
              className="bg-white text-black p-8 sm:p-10 font-sans mx-auto max-w-2xl border border-slate-200 shadow-sm rounded-xl print:border-none print:shadow-none print:p-4 print:max-w-none text-xs leading-relaxed"
            >
              {/* TOP HEADER: Left Company Info | Right INVOICE & Meta */}
              <div className="flex justify-between items-start pb-4">
                <div className="text-left space-y-0.5">
                  <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight uppercase">
                    {selectedLanguage === 'marathi' ? businessNameMr : businessName}
                  </h1>
                  <p className="text-xs text-slate-800 font-medium">{address}</p>
                  <p className="text-xs text-slate-800 font-medium">
                    Ph: {phones.split(',')[0]?.trim() || '7020914957'}
                    {phones.split(',')[1] && `, ${phones.split(',')[1].trim()}`}
                  </p>
                </div>

                <div className="text-right space-y-0.5">
                  <h2 className="text-xl sm:text-2xl font-black tracking-wider text-black uppercase">
                    {selectedLanguage === 'marathi' ? 'INVOICE / पावती' : 'INVOICE'}
                  </h2>
                  <p className="text-xs font-mono font-bold text-slate-900">#{billNumber}</p>
                  <p className="text-xs font-mono text-slate-800">{issueDateFormatted}</p>
                </div>
              </div>

              {/* SUBHEADER: Bill To, Delivery & Rental Duration Time */}
              <div className="text-xs pt-3 pb-2 font-normal">
                <div className="flex justify-between items-baseline">
                  <div>
                    <span className="font-bold text-black">{selectedLanguage === 'marathi' ? 'Bill To:' : 'Bill To:'}</span>{' '}
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded text-[11px] mr-1.5">
                      Cust #{assignedCustomerNumber}
                    </span>
                    <span className="font-bold text-black uppercase">{party?.name || rental.partyName}</span>{' '}
                    <span className="font-mono text-slate-800 ml-3">{party?.mobile || ''}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-black">{selectedLanguage === 'marathi' ? 'Delivery:' : 'Delivery:'}</span>{' '}
                    <span className="font-mono text-black font-semibold">{cycleStartFormatted !== '-' ? cycleStartFormatted : issueDateFormatted}</span>
                  </div>
                </div>

                {/* Rental Duration & Period Row */}
                <div className="flex justify-between items-baseline pt-1">
                  <div className="text-slate-700">
                    {party?.address ? (
                      <>
                        <span className="font-bold text-black">{selectedLanguage === 'marathi' ? 'Site:' : 'Site:'}</span>{' '}
                        <span>{party.address}</span>
                      </>
                    ) : (
                      <span>&nbsp;</span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-black">
                      {selectedLanguage === 'marathi' ? 'भाडे कालावधी:' : 'Rental Duration:'}
                    </span>{' '}
                    <span className="font-mono text-black font-bold">{cycleDays} Days</span>
                    {cycleEndFormatted && cycleEndFormatted !== '40 Days from issue' && (
                      <span className="font-mono text-slate-600 text-[11px] ml-1.5">
                        ({cycleStartFormatted} to {cycleEndFormatted})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* TABLE: Clean Divider lines above and below headers, and at bottom of rows */}
              <table className="w-full text-left my-1 border-collapse">
                <thead>
                  <tr className="border-t-2 border-b-2 border-slate-900 text-xs font-bold text-black">
                    <th className="py-2 pr-4 text-left">{selectedLanguage === 'marathi' ? 'Item' : 'Item'}</th>
                    <th className="py-2 px-3 text-center">{selectedLanguage === 'marathi' ? 'Qty' : 'Qty'}</th>
                    <th className="py-2 px-3 text-right">{selectedLanguage === 'marathi' ? 'Rate' : 'Rate'}</th>
                    <th className="py-2 pl-4 text-right">{selectedLanguage === 'marathi' ? 'Amt' : 'Amt'}</th>
                  </tr>
                </thead>
                <tbody className="text-xs border-b-2 border-slate-900">
                  {plateItems.map((item, index) => {
                    const itemDays = item.days || cycleDays;
                    const rowRent = item.quantity * item.dailyRate * itemDays;
                    return (
                      <tr key={index}>
                        <td className="py-2 pr-4 text-black">
                          <div className="font-normal lowercase">
                            {item.plateType.toLowerCase().includes('plate') ? item.plateType : `plates ${item.plateType}`}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500">
                            {selectedLanguage === 'marathi' ? 'मुदत:' : 'Duration:'} {itemDays} {selectedLanguage === 'marathi' ? 'दिवस' : 'Days'} • ₹{Number(item.dailyRate).toFixed(2)}/day
                          </div>
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-black align-top">
                          {item.quantity}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-black align-top">
                          ₹{Number(item.dailyRate).toFixed(2)}
                        </td>
                        <td className="py-2 pl-4 text-right font-mono text-black align-top">
                          ₹{rowRent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Overdue Extra Days Row if applicable */}
                  {extraDays > 0 && extraAmount > 0 && (
                    <tr>
                      <td className="py-2 pr-4 text-black">
                        <div className="lowercase">
                          {selectedLanguage === 'marathi' ? 'अतिरिक्त दिवस' : 'extra days'} (+{extraDays}d)
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">
                          {selectedLanguage === 'marathi' ? 'मुदतीनंतरचा वापर' : 'Overdue usage beyond cycle'}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-black align-top">{rental.quantity}</td>
                      <td className="py-2 px-3 text-right font-mono text-black align-top">₹{Number(rental.dailyRate || 1.5).toFixed(2)}</td>
                      <td className="py-2 pl-4 text-right font-mono text-black align-top">
                        ₹{extraAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* RENTAL CYCLES BREAKDOWN (Simple Template) */}
              {showCycles && allCycles.length > 0 && (
                <div className="my-3 pt-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-black uppercase text-black tracking-wider flex items-center gap-1">
                      <span>{currentT.cyclesTitle}</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 border border-slate-300 text-slate-800">
                      {allCycles.length} {selectedLanguage === 'marathi' ? 'सायकल्स' : 'Cycles'}
                    </span>
                  </div>
                  <table className="w-full text-left my-1 border-collapse border border-slate-800 text-[10px]">
                    <thead>
                      <tr className="bg-slate-100 text-black font-bold border-b border-slate-800">
                        <th className="py-1 px-2 border-r border-slate-300">{currentT.cycleCol}</th>
                        <th className="py-1 px-2 border-r border-slate-300">{currentT.cyclePeriodCol}</th>
                        <th className="py-1 px-2 text-center border-r border-slate-300">{currentT.cycleDaysCol}</th>
                        <th className="py-1 px-2 text-right border-r border-slate-300">{currentT.cycleRentCol}</th>
                        <th className="py-1 px-2 text-right border-r border-slate-300">{currentT.cyclePaidCol}</th>
                        <th className="py-1 px-2 text-right border-r border-slate-300">{currentT.cyclePendingCol}</th>
                        <th className="py-1 px-2 text-center">{currentT.cycleStatusCol}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {allCycles.map((c) => {
                        const isCurrent = c.cycleNumber === currentActiveCycleNumber;
                        const startFmt = c.startDate ? new Date(c.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
                        const endFmt = c.expectedEndDate ? new Date(c.expectedEndDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
                        return (
                          <tr key={c.id || c.cycleNumber} className={isCurrent ? 'bg-orange-50/60 font-semibold' : ''}>
                            <td className="py-1 px-2 border-r border-slate-200">
                              Cycle #{c.cycleNumber}
                              {isCurrent && (
                                <span className="ml-1 text-[8px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-black uppercase">
                                  {currentT.activeCycleBadge}
                                </span>
                              )}
                            </td>
                            <td className="py-1 px-2 font-mono border-r border-slate-200">{startFmt} → {endFmt}</td>
                            <td className="py-1 px-2 text-center font-mono border-r border-slate-200">{c.days}d {c.extraDays > 0 ? `(+${c.extraDays}d)` : ''}</td>
                            <td className="py-1 px-2 text-right font-mono border-r border-slate-200">₹{(c.totalAmount || c.baseRent || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td className="py-1 px-2 text-right font-mono text-emerald-700 border-r border-slate-200">₹{(c.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td className="py-1 px-2 text-right font-mono text-rose-700 border-r border-slate-200">₹{(c.pendingAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td className="py-1 px-2 text-center font-bold text-[9px]">
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

              {/* LATEST PAYMENTS SECTION (Simple Template) */}
              {showPayments && (
                <div className="my-3 pt-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-black uppercase text-black tracking-wider flex items-center gap-1">
                      <span>{currentT.paymentsTitle}</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 border border-slate-300 text-slate-800">
                      {rentalPayments.length} {selectedLanguage === 'marathi' ? 'पेमेंट्स' : 'Payments'}
                    </span>
                  </div>
                  {rentalPayments.length > 0 ? (
                    <table className="w-full text-left my-1 border-collapse border border-slate-800 text-[10px]">
                      <thead>
                        <tr className="bg-slate-100 text-black font-bold border-b border-slate-800">
                          <th className="py-1 px-2 border-r border-slate-300">{currentT.paymentDateCol}</th>
                          <th className="py-1 px-2 border-r border-slate-300">{currentT.paymentModeCol}</th>
                          <th className="py-1 px-2 border-r border-slate-300">{currentT.paymentCycleCol}</th>
                          <th className="py-1 px-2 border-r border-slate-300">{currentT.paymentRefCol}</th>
                          <th className="py-1 px-2 text-right">{currentT.paymentAmtCol}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {rentalPayments.map((pay) => {
                          const payDateFmt = pay.date ? new Date(pay.date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
                          return (
                            <tr key={pay.id}>
                              <td className="py-1 px-2 font-mono border-r border-slate-200">{payDateFmt}</td>
                              <td className="py-1 px-2 font-semibold border-r border-slate-200">{cleanPaymentMode(pay.paymentMode, selectedLanguage)}</td>
                              <td className="py-1 px-2 border-r border-slate-200">{pay.cycleNumber ? `Cycle #${pay.cycleNumber}` : '-'}</td>
                              <td className="py-1 px-2 text-slate-600 border-r border-slate-200 truncate max-w-xs">{pay.reference || pay.notes || '-'}</td>
                              <td className="py-1 px-2 text-right font-mono font-bold text-emerald-800">+₹{pay.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
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
              <div className="flex justify-end pt-2 pb-4">
                <div className="w-64 sm:w-72 space-y-1 text-xs">
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
                      <div className="flex justify-between py-0.5">
                        <span className="font-semibold text-emerald-800">
                          {selectedLanguage === 'marathi' ? 'एकूण जमा पेमेंट्स:' : 'Total Paid Payments:'}
                        </span>
                        <span className="font-mono text-emerald-800 font-bold">
                          - ₹{allCyclesTotalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="border-t-2 border-slate-900 pt-1.5 mt-1 flex justify-between items-baseline">
                        <span className="text-base font-black text-black">
                          {selectedLanguage === 'marathi' ? 'एकूण येणे बाकी:' : 'Balance Due:'}
                        </span>
                        <span className="text-base sm:text-lg font-black font-mono text-black">
                          ₹{allCyclesBalanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between py-0.5">
                        <span className="font-semibold text-black">
                          Total ({cycleDays}d):
                        </span>
                        <span className="font-mono text-black">
                          ₹{totalCycleAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="font-semibold text-black">Paid:</span>
                        <span className="font-mono text-black">
                          ₹{allCyclesTotalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="border-t-2 border-slate-900 pt-1.5 mt-1 flex justify-between items-baseline">
                        <span className="text-base font-black text-black">Balance:</span>
                        <span className="text-base sm:text-lg font-black font-mono text-black">
                          ₹{allCyclesBalanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* FOOTER: Left Thank You | Right Signature */}
              <div className="pt-4">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-base font-bold text-black">Thank you!</p>
                  </div>

                  <div className="text-center">
                    <div className="border-b border-black w-32 mb-1" />
                    <p className="text-[10px] font-semibold uppercase text-black tracking-wider">Authorized Signature</p>
                  </div>
                </div>

                {/* Bank Details & Terms */}
                {(config.showBankDetails || (printTerms && activeTerms && activeTerms.length > 0)) && (
                  <div className="mt-6 pt-3 border-t border-slate-100 text-[10px] text-slate-500 space-y-1">
                    {config.showBankDetails && (
                      <p className="font-mono">
                        Bank: {config.bankName || 'SBI'} • A/C: {config.accountNumber || '39482910482'} • IFSC: {config.ifscCode || 'SBIN0001234'}
                        {config.upiId && ` • UPI: ${config.upiId}`}
                      </p>
                    )}
                    {printTerms && activeTerms && activeTerms.length > 0 && (
                      <div className="space-y-0.5 pt-1">
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
              </div>
            </div>
          ) : (
            /* ========================================================= */
            /* 2. STANDARD / COMPACT / TAX INVOICE FORMAT               */
            /* ========================================================= */
            <div
              id="rental-bill-sheet"
              className={`bg-white border border-slate-200 shadow-sm rounded-2xl ${isCompact ? 'p-5 sm:p-6' : 'p-6 sm:p-8'} text-slate-800 font-sans mx-auto max-w-3xl print:border-none print:shadow-none print:p-0`}
            >
              {/* Header Section */}
              <div className={`border-b-2 border-slate-800 ${isCompact ? 'pb-3 mb-4' : 'pb-5 mb-6'}`}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`${isCompact ? 'w-11 h-11' : 'w-14 h-14'} rounded-2xl bg-slate-900 flex items-center justify-center p-2 shadow-md flex-shrink-0`}>
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
                      <h1 className={`${isCompact ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'} font-black tracking-tight text-slate-900 uppercase`}>
                        {businessName}
                      </h1>
                      {config.showMarathiHeader && (
                        <p className="text-xs font-bold text-orange-600 tracking-wide">
                          {businessNameMr} • Centering Plates & Rental Services
                        </p>
                      )}
                      <p className="text-[11px] text-slate-500 font-medium">
                        Heavy-Duty Steel Shuttering Plates, Columns & Scaffolding Material
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
                    <p className="text-[11px] text-slate-500">Contact: {phones.split(',').slice(1).join(' / ').trim() || '9881985058'}</p>
                    <p className="text-[11px] text-slate-500">{address}</p>
                  </div>
                </div>
              </div>

              {/* Bill Title Banner */}
              <div className={`flex justify-between items-center ${isTaxInvoice ? 'bg-indigo-950' : 'bg-slate-900'} text-white px-4 ${isCompact ? 'py-1.5 mb-4' : 'py-2.5 mb-6'} rounded-xl shadow-sm`}>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-orange-400" />
                  <span className="text-xs font-black uppercase tracking-wider">
                    {currentT.billTitle}
                  </span>
                </div>
                <div className="text-xs font-bold tracking-wide">
                  {currentT.billNoLabel} <span className="text-orange-400 font-mono font-black">{billNumber}</span>
                </div>
              </div>

              {/* Customer & Billing Details Grid */}
              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${isCompact ? 'mb-4 p-3' : 'mb-6 p-4'} bg-slate-50/90 border border-slate-200/80 rounded-xl text-xs`}>
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-500" /> {currentT.customerTitle}
                  </span>
                  <p className="text-sm font-black text-slate-900 uppercase flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-slate-700 bg-slate-200/80 px-1.5 py-0.5 rounded">
                      Cust #{assignedCustomerNumber}
                    </span>
                    <span>{party?.name || rental.partyName}</span>
                  </p>
                  <p className="text-slate-600 font-medium">
                    <span className="font-bold">{currentT.contactLabel}</span> {party?.mobile || 'Not specified'}
                  </p>
                  <p className="text-slate-600 font-medium">
                    <span className="font-bold">{currentT.siteLabel}</span> {party?.address || 'Direct Site Delivery'}
                  </p>
                </div>

                <div className="space-y-1.5 sm:border-l sm:border-slate-200 sm:pl-4">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-500" /> {currentT.challanDetailsTitle}
                  </span>
                  <p className="text-slate-700">
                    <span className="font-bold">{currentT.issueDateLabel}</span> {issueDateFormatted}
                  </p>
                  <p className="text-slate-700">
                    <span className="font-bold">{currentT.periodLabel}</span> {cycleStartFormatted} to {cycleEndFormatted}
                  </p>
                  <p className="text-slate-700">
                    <span className="font-bold">{currentT.paymentModeLabel}</span>{' '}
                    <span className="font-bold uppercase text-slate-800">{cleanPaymentMode(rental.paymentMode, selectedLanguage)}</span>
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className={`${isCompact ? 'mb-4' : 'mb-6'} overflow-hidden rounded-xl border border-slate-200`}>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-2 px-3 w-10 text-center">{currentT.srNo}</th>
                      <th className="py-2 px-3">{currentT.particulars}</th>
                      <th className="py-2 px-3 text-center">{currentT.qty}</th>
                      <th className="py-2 px-3 text-right">{currentT.ratePerDay}</th>
                      <th className="py-2 px-3 text-center">{currentT.term}</th>
                      <th className="py-2 px-3 text-right">{currentT.totalRent}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {plateItems.map((item, index) => {
                      const rowRent = item.quantity * item.dailyRate * (item.days || 40);
                      return (
                        <tr key={index} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 text-center text-slate-500">{index + 1}</td>
                          <td className="py-2 px-3">
                            <span className="font-bold text-slate-900">{currentT.platePrefix} — {item.plateType}</span>
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-slate-800">{item.quantity} {currentT.nosSuffix}</td>
                          <td className="py-2 px-3 text-right">₹{Number(item.dailyRate).toFixed(2)}</td>
                          <td className="py-2 px-3 text-center">{item.days || 40} {currentT.daysSuffix}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">
                            ₹{rowRent.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      );
                    })}

                    {extraDays > 0 && extraAmount > 0 && (
                      <tr className="bg-amber-50/60 text-amber-900 font-semibold">
                        <td className="py-2 px-3 text-center font-bold">•</td>
                        <td className="py-2 px-3">
                          {currentT.extraDaysTitle} ({extraDays} {currentT.daysSuffix})
                        </td>
                        <td className="py-2 px-3 text-center font-bold">{rental.quantity} {currentT.nosSuffix}</td>
                        <td className="py-2 px-3 text-right">₹{Number(rental.dailyRate || 1.5).toFixed(2)}</td>
                        <td className="py-2 px-3 text-center">{extraDays} Extra</td>
                        <td className="py-2 px-3 text-right font-bold text-amber-900">
                          +₹{extraAmount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* RENTAL CYCLES BREAKDOWN (Standard / Compact / Tax Invoice) */}
              {showCycles && allCycles.length > 0 && (
                <div className={`${isCompact ? 'mb-4' : 'mb-6'} overflow-hidden rounded-xl border border-slate-200`}>
                  <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      <span>{currentT.cyclesTitle}</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                      {allCycles.length} {selectedLanguage === 'marathi' ? 'सायकल्स' : 'Cycles'}
                    </span>
                  </div>
                  <div className="overflow-x-auto print:overflow-visible">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-800 text-white font-bold uppercase text-[10px] tracking-wider">
                          <th className="py-2 px-3">{currentT.cycleCol}</th>
                          <th className="py-2 px-3">{currentT.cyclePeriodCol}</th>
                          <th className="py-2 px-3 text-center">{currentT.cycleDaysCol}</th>
                          <th className="py-2 px-3 text-right">{currentT.cycleRentCol}</th>
                          <th className="py-2 px-3 text-right">{currentT.cyclePaidCol}</th>
                          <th className="py-2 px-3 text-right">{currentT.cyclePendingCol}</th>
                          <th className="py-2 px-3 text-center">{currentT.cycleStatusCol}</th>
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
                              <td className="py-2 px-3">
                                Cycle #{c.cycleNumber}
                                {isCurrent && (
                                  <span className="ml-1.5 text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-black uppercase">
                                    {currentT.activeCycleBadge}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 font-mono">{startFmt} → {endFmt}</td>
                              <td className="py-2 px-3 text-center font-mono">{c.days}d {c.extraDays > 0 ? `(+${c.extraDays}d)` : ''}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                ₹{(c.totalAmount || c.baseRent || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-emerald-700 font-semibold">
                                ₹{(c.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-rose-700 font-semibold">
                                ₹{(c.pendingAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
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

              {/* LATEST PAYMENTS LOG (Standard / Compact / Tax Invoice) */}
              {showPayments && (
                <div className={`${isCompact ? 'mb-4' : 'mb-6'} overflow-hidden rounded-xl border border-slate-200`}>
                  <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                      <Landmark className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{currentT.paymentsTitle}</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                      {rentalPayments.length} {selectedLanguage === 'marathi' ? 'पेमेंट्स' : 'Payments'}
                    </span>
                  </div>
                  {rentalPayments.length > 0 ? (
                    <div className="overflow-x-auto print:overflow-visible">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-800 text-white font-bold uppercase text-[10px] tracking-wider">
                            <th className="py-2 px-3">{currentT.paymentDateCol}</th>
                            <th className="py-2 px-3">{currentT.paymentModeCol}</th>
                            <th className="py-2 px-3">{currentT.paymentCycleCol}</th>
                            <th className="py-2 px-3">{currentT.paymentRefCol}</th>
                            <th className="py-2 px-3 text-right">{currentT.paymentAmtCol}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-medium">
                          {rentalPayments.map((pay) => {
                            const payDateFmt = pay.date ? new Date(pay.date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
                            return (
                              <tr key={pay.id} className="hover:bg-slate-50/50">
                                <td className="py-2 px-3 font-mono">{payDateFmt}</td>
                                <td className="py-2 px-3 font-semibold text-slate-900">{cleanPaymentMode(pay.paymentMode, selectedLanguage)}</td>
                                <td className="py-2 px-3 text-slate-600">{pay.cycleNumber ? `Cycle #${pay.cycleNumber}` : '-'}</td>
                                <td className="py-2 px-3 text-slate-600 max-w-xs truncate">{pay.reference || pay.notes || '-'}</td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                                  +₹{pay.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-3 text-center text-slate-500 text-xs italic bg-slate-50/50">
                      {currentT.noPaymentsText}
                    </div>
                  )}
                </div>
              )}

              {/* Totals & Details */}
              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${isCompact ? 'mb-4' : 'mb-6'}`}>
                <div className="space-y-3">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1.5">
                      {currentT.paymentModeLabel}
                    </span>
                    <p className="flex justify-between">
                      <span className="text-slate-500">Mode:</span>
                      <span className="font-bold">{cleanPaymentMode(rental.paymentMode, selectedLanguage)}</span>
                    </p>
                  </div>

                  {config.showBankDetails && (
                    <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 text-xs">
                      <span className="text-[10px] font-black uppercase text-blue-800 tracking-wider flex items-center gap-1 mb-1.5">
                        <Landmark className="w-3.5 h-3.5 text-blue-600" /> {currentT.bankTitle}
                      </span>
                      <div className="space-y-0.5 text-slate-700 font-medium text-[11px]">
                        <p><span className="text-slate-500">{currentT.bankLabel}</span> <strong className="text-slate-800">{config.bankName}</strong></p>
                        <p><span className="text-slate-500">{currentT.acNoLabel}</span> <strong className="font-mono text-slate-900">{config.accountNumber}</strong></p>
                        <p><span className="text-slate-500">{currentT.ifscLabel}</span> <strong className="font-mono text-slate-900">{config.ifscCode}</strong></p>
                        {config.upiId && <p className="font-semibold text-blue-900">{currentT.upiLabel} {config.upiId}</p>}
                      </div>
                    </div>
                  )}
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs h-fit">
                  <div className="divide-y divide-slate-200">
                    {allCycles.length > 1 ? (
                      <>
                        <div className="flex justify-between py-2 px-4 bg-slate-50 font-medium">
                          <span className="text-slate-600">{currentT.activeCycleLabel} #{currentActiveCycleNumber}</span>
                          <span className="font-bold text-slate-900">₹{totalCycleAmount.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between py-2.5 px-4 bg-slate-100 font-bold text-slate-900">
                          <span>{currentT.totalCyclesRentLabel} ({allCycles.length} {selectedLanguage === 'marathi' ? 'सायकल्स' : 'Cycles'})</span>
                          <span className="text-sm">₹{allCyclesTotalRent.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between py-2 px-4 font-bold text-emerald-700 bg-emerald-50/50">
                          <span>{currentT.totalPaidPaymentsLabel}</span>
                          <span>- ₹{allCyclesTotalPaid.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between py-3 px-4 font-black bg-rose-50 text-rose-700 text-sm">
                          <span>{currentT.netAllCyclesDueLabel}</span>
                          <span>₹{allCyclesBalanceDue.toLocaleString('en-IN')}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between py-2 px-4 bg-slate-50 font-medium">
                          <span className="text-slate-600">{currentT.baseRentLabel}</span>
                          <span className="font-bold text-slate-900">₹{(totalCycleAmount - extraAmount).toLocaleString('en-IN')}</span>
                        </div>
                        {extraAmount > 0 && (
                          <div className="flex justify-between py-2 px-4 bg-amber-50/50 text-amber-800">
                            <span>{currentT.extraRentLabel}</span>
                            <span className="font-bold">₹{extraAmount.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        <div className="flex justify-between py-2.5 px-4 bg-slate-100 font-bold text-slate-900">
                          <span>{currentT.totalDueLabel}</span>
                          <span className="text-sm">₹{totalCycleAmount.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between py-2 px-4 font-bold text-emerald-700 bg-emerald-50/50">
                          <span>{currentT.paidLabel}</span>
                          <span>- ₹{allCyclesTotalPaid.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between py-3 px-4 font-black bg-rose-50 text-rose-700 text-sm">
                          <span>{currentT.outstandingLabel}</span>
                          <span>₹{allCyclesBalanceDue.toLocaleString('en-IN')}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Terms & Conditions block (Standard / Compact / Tax Invoice) */}
              {printTerms && activeTerms && activeTerms.length > 0 && (
                <div className={`bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 ${isCompact ? 'mb-4' : 'mb-6'}`}>
                  <span className="text-[10px] font-black uppercase text-slate-700 tracking-wider block mb-1">
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

              {/* Signatures */}
              <div className={`grid grid-cols-2 gap-8 ${isCompact ? 'pt-4' : 'pt-6'} border-t border-slate-200 text-xs`}>
                <div className="text-center space-y-6">
                  <div className="border-b border-dashed border-slate-400 w-44 mx-auto" />
                  <p className="font-bold text-slate-800">
                    {currentT.customerSign}<br />
                    <span className="text-[10px] text-slate-400 font-normal">{currentT.customerSignSub}</span>
                  </p>
                </div>

                <div className="text-center space-y-6">
                  <div className="border-b border-dashed border-slate-400 w-44 mx-auto" />
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
    </div>,
    document.body
  );
};


