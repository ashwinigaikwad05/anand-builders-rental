import React, { useState, useEffect } from 'react';
import {
  FileText,
  Printer,
  Download,
  RefreshCw,
  Layout,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  DollarSign,
  Users,
  Search,
  ArrowLeft,
  Hash,
  Clock,
  Package,
  Eye,
} from 'lucide-react';
import type { Party, PlateStock, Rental, ReturnLog, Payment, RentalCycle } from '../../../data/adminMockData';
import { getStoredAppLanguage, t, type AppLanguage } from '../../../utils/appTranslations';
import { formatPartyName } from '../../../utils/marathiUtils';

export type ReportType = 'all' | 'rental' | 'return' | 'payment' | 'outstanding' | 'bill_history';

interface ReportsTabProps {
  parties: Party[];
  plates: PlateStock[];
  rentals: Rental[];
  returns: ReturnLog[];
  payments: Payment[];
  rentalCycles?: RentalCycle[];
  appLanguage?: AppLanguage;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({
  parties,
  plates,
  rentals,
  returns,
  payments,
  rentalCycles = [],
  appLanguage: propLanguage,
  searchTerm: externalSearchTerm,
  onSearchChange,
}) => {
  const [lang, setLang] = useState<AppLanguage>(() => propLanguage || getStoredAppLanguage());

  // Listen to system language changes in real-time
  useEffect(() => {
    if (propLanguage) {
      setLang(propLanguage);
    }
  }, [propLanguage]);

  useEffect(() => {
    const handleLangChange = (e: Event) => {
      const ce = e as CustomEvent<AppLanguage>;
      if (ce.detail) {
        setLang(ce.detail);
      }
    };
    window.addEventListener('anand_language_change', handleLangChange);
    return () => window.removeEventListener('anand_language_change', handleLangChange);
  }, []);

  const curT = t[lang]?.reports || t.marathi.reports;

  const [reportType, setReportType] = useState<ReportType>('all');
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [selectedPlateType, setSelectedPlateType] = useState('');
  const [internalSearchBillNumber, setInternalSearchBillNumber] = useState('');
  const searchBillNumber = externalSearchTerm !== undefined ? externalSearchTerm : internalSearchBillNumber;
  const setSearchBillNumber = (val: string) => {
    setInternalSearchBillNumber(val);
    onSearchChange?.(val);
  };
  const [selectedRentalIdForHistory, setSelectedRentalIdForHistory] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [pageOrientation, setPageOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // Business branding for print
  const businessName = localStorage.getItem('anand_business_name') || 'ANAND BUILDERS & DEVELOPERS';
  const businessNameMr = localStorage.getItem('anand_business_name_mr') || 'आनंद बिल्डर्स अँड डेव्हलपर्स';
  const address = localStorage.getItem('anand_business_address') || 'Near Old Bus Stand, Solapur Road';
  const phones = localStorage.getItem('anand_business_phones') || '7020914957, 9881985058, 9021519582';

  const handleReset = () => {
    setSelectedPartyId('');
    setSelectedPlateType('');
    setSearchBillNumber('');
    setSelectedRentalIdForHistory(null);
    setFromDate('');
    setToDate('');
  };

  const selectedParty = parties.find((p) => p.id === selectedPartyId);
  const selectedPartyName = selectedParty
    ? `${selectedParty.name}${selectedParty.customerNumber ? ` (Cust #${selectedParty.customerNumber})` : ''}`
    : curT.allParties;

  // Format date helper to DD/MM/YYYY
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Format name helper ensuring pure Marathi in Marathi mode and pure English in English mode
  const formatName = (name?: string) => {
    if (!name) return '';
    return formatPartyName(name, isMr ? 'marathi' : 'english');
  };

  // Helper to fetch all cycles for a rental
  const getCyclesForRental = (rental: Rental): RentalCycle[] => {
    const list = rentalCycles.filter((c) => c.rentalId === rental.id);
    if (list.length > 0) {
      return [...list].sort((a, b) => a.cycleNumber - b.cycleNumber);
    }
    if (rental.cycles && rental.cycles.length > 0) {
      return [...rental.cycles].sort((a, b) => a.cycleNumber - b.cycleNumber);
    }
    // Fallback baseline cycle
    return [
      {
        id: `c1-${rental.id}`,
        rentalId: rental.id,
        partyId: rental.partyId,
        cycleNumber: rental.currentCycleNumber || 1,
        startDate: rental.currentCycleStartDate || rental.issueDate,
        expectedEndDate: rental.currentCycleEndDate || rental.issueDate,
        days: rental.days || 40,
        extraDays: 0,
        dailyRate: rental.dailyRate,
        quantity: rental.quantity,
        baseRent: rental.totalRent,
        extraAmount: 0,
        totalAmount: rental.totalRent,
        paidAmount: rental.paid,
        pendingAmount: rental.pending,
        status: (rental.status === 'returned' ? 'completed' : 'active') as 'completed' | 'active',
      },
    ];
  };

  // Filtered sub-datasets based on parameters
  const filteredRentals = rentals.filter((r) => {
    if (selectedPartyId && r.partyId !== selectedPartyId) return false;
    if (selectedPlateType && r.plateType !== selectedPlateType) return false;
    if (searchBillNumber.trim()) {
      const q = searchBillNumber.trim().toLowerCase().replace(/^#/, '');
      const b = String(r.billNumber || '').toLowerCase().replace(/^#/, '');
      if (b !== q && !b.includes(q)) return false;
    }
    if (fromDate && new Date(r.issueDate) < new Date(fromDate)) return false;
    if (toDate && new Date(r.issueDate) > new Date(toDate)) return false;
    return true;
  });

  const filteredReturns = returns.filter((r) => {
    if (selectedPartyId && r.partyId !== selectedPartyId) return false;
    if (selectedPlateType && r.plateType !== selectedPlateType) return false;
    if (fromDate && new Date(r.returnDate) < new Date(fromDate)) return false;
    if (toDate && new Date(r.returnDate) > new Date(toDate)) return false;
    return true;
  });

  const filteredPayments = payments.filter((p) => {
    if (selectedPartyId && p.partyId !== selectedPartyId) return false;
    if (fromDate && new Date(p.date) < new Date(fromDate)) return false;
    if (toDate && new Date(p.date) > new Date(toDate)) return false;
    return true;
  });

  const filteredOutstanding = parties.filter((p) => {
    if (selectedPartyId && p.id !== selectedPartyId) return false;
    if (p.pending <= 0) return false;
    return true;
  });

  // Active rental for Bill-Wise History view
  const activeHistoryRental = selectedRentalIdForHistory
    ? rentals.find((r) => r.id === selectedRentalIdForHistory) || null
    : searchBillNumber.trim() && filteredRentals.length === 1
    ? filteredRentals[0]
    : null;

  // Grand summary figures
  const totalRentBilled = filteredRentals.reduce((sum, r) => sum + Number(r.totalRent || 0), 0);
  const totalRentPaid = filteredRentals.reduce((sum, r) => sum + Number(r.paid || 0), 0);
  const totalDispatchedQty = filteredRentals.reduce((sum, r) => sum + Number(r.quantity || 0), 0);
  const totalReturnedQty = filteredReturns.reduce((sum, r) => sum + Number(r.returnedQuantity || 0), 0);
  const activePlatesInField = Math.max(0, totalDispatchedQty - totalReturnedQty);
  const totalPaymentsReceived = filteredPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalOutstandingDue = filteredOutstanding.reduce((sum, p) => sum + Number(p.pending || 0), 0);

  const totalRecordsCount =
    reportType === 'all'
      ? filteredRentals.length + filteredReturns.length + filteredPayments.length + filteredOutstanding.length
      : reportType === 'bill_history'
      ? activeHistoryRental ? 1 : filteredRentals.length
      : reportType === 'rental'
      ? filteredRentals.length
      : reportType === 'return'
      ? filteredReturns.length
      : reportType === 'payment'
      ? filteredPayments.length
      : filteredOutstanding.length;

  const isMr = lang === 'marathi';

  // Print handler - triggers browser print dialog
  const handlePrint = () => {
    window.print();
  };

  // CSV Export handler
  const handleExportCSV = () => {
    if (totalRecordsCount === 0) return;

    // 1. Single Bill Comprehensive History Export
    if ((reportType === 'bill_history' || searchBillNumber.trim()) && activeHistoryRental) {
      const r = activeHistoryRental;
      const cust = parties.find(
        (p) =>
          (r.partyId && p.id === r.partyId) ||
          p.name.trim().toLowerCase() === r.partyName?.trim().toLowerCase()
      );
      const cycles = getCyclesForRental(r);
      const items =
        r.items && r.items.length > 0
          ? r.items
          : [
              {
                plateType: r.plateType,
                quantity: r.quantity,
                dailyRate: r.dailyRate,
                days: r.days,
                totalRent: r.totalRent,
              },
            ];
      const rReturns = returns.filter(
        (ret) =>
          (ret.rentalId && ret.rentalId === r.id) ||
          (ret.partyId === r.partyId &&
            ret.plateType === r.plateType &&
            new Date(ret.returnDate) >= new Date(r.issueDate))
      );
      const rPayments = payments.filter(
        (p) => (p.rentalId && p.rentalId === r.id) || (p.partyId && p.partyId === r.partyId)
      );

      const lines: string[] = [];
      const titleBanner = isMr
        ? `आनंद बिल्डर्स अँड डेव्हलपर्स — बिल क्रमांक #${r.billNumber || 1} सर्वंकष भाडे इतिहास`
        : `ANAND BUILDERS & DEVELOPERS — BILL #${r.billNumber || 1} COMPLETE RENTAL HISTORY`;
      lines.push(`"${titleBanner}"`);
      lines.push(`"${isMr ? 'ग्राहक नाव' : 'Customer'}: ${formatName(r.partyName).replace(/"/g, '""')}"`);
      lines.push(`"${isMr ? 'मोबाईल' : 'Mobile'}: ${cust?.mobile || ''}"`);
      lines.push(`"${isMr ? 'नोंद दिनांक' : 'Issue Date'}: ${formatDate(r.issueDate)}"`);
      lines.push(`"${isMr ? 'स्थिती' : 'Status'}: ${r.status}"`);
      lines.push('');

      // 1. Dispatched
      lines.push(`"=== ${isMr ? '१. वाटप साहित्य तपशील' : '1. Dispatched Material Particulars'} ==="`);
      lines.push(
        isMr
          ? 'अ.क्र.,प्लेट साईझ,नग,दर (रु/दिवस),दिवस,एकूण भाडे (रु)'
          : 'Sr No,Plate Size,Quantity,Daily Rate (Rs),Days,Total Rent (Rs)'
      );
      items.forEach((it, idx) => {
        lines.push(
          [
            String(idx + 1),
            it.plateType,
            String(it.quantity),
            String(it.dailyRate),
            String(it.days),
            String((Number(it.quantity) || 0) * (Number(it.dailyRate) || 0) * (Number(it.days) || 0)),
          ].join(',')
        );
      });
      lines.push('');

      // 2. Cycles
      lines.push(`"=== ${isMr ? '२. भाडे सायकल कालक्रम' : '2. Rental Cycles Timeline'} ==="`);
      lines.push(
        isMr
          ? 'सायकल क्र.,सुरुवात दिनांक,समाप्ती दिनांक,दिवस,नग,सायकल भाडे (रु),जमा (रु),बाकी (रु),स्थिती'
          : 'Cycle No,Start Date,End Date,Days,Quantity,Cycle Rent (Rs),Paid (Rs),Pending (Rs),Status'
      );
      cycles.forEach((c) => {
        lines.push(
          [
            `"${isMr ? 'सायकल' : 'Cycle'} ${c.cycleNumber}"`,
            formatDate(c.startDate),
            formatDate(c.expectedEndDate),
            String(c.days + (c.extraDays || 0)),
            String(c.quantity),
            String(c.totalAmount),
            String(c.paidAmount),
            String(c.pendingAmount),
            c.status,
          ].join(',')
        );
      });
      lines.push('');

      // 3. Returns
      lines.push(`"=== ${isMr ? '३. साहित्य परत जमा नोंद' : '3. Returns Intake Log'} ==="`);
      lines.push(isMr ? 'अ.क्र.,जमा दिनांक,जमा नग,शिल्लक नग' : 'Sr No,Return Date,Returned Qty,Remaining Qty');
      rReturns.forEach((ret, idx) => {
        lines.push(
          [
            String(idx + 1),
            formatDate(ret.returnDate),
            String(ret.returnedQuantity),
            String(ret.remainingQuantity),
          ].join(',')
        );
      });
      lines.push('');

      // 4. Payments
      lines.push(`"=== ${isMr ? '४. जमा पावत्या तपशील' : '4. Payment Receipts'} ==="`);
      lines.push(isMr ? 'अ.क्र.,पेमेंट दिनांक,रक्कम (रु),प्रकार,संदर्भ' : 'Sr No,Payment Date,Amount (Rs),Mode,Reference');
      rPayments.forEach((p, idx) => {
        lines.push(
          [
            String(idx + 1),
            formatDate(p.date),
            String(p.amount),
            p.paymentMode,
            `"${(p.reference || '').replace(/"/g, '""')}"`,
          ].join(',')
        );
      });
      lines.push('');

      // 5. Balance
      const totalCyclesRent = cycles.reduce((sum, c) => sum + (Number(c.totalAmount) || 0), 0) || r.totalRent;
      const totalPaidSum = rPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || r.paid;
      const netPendingSum = Math.max(0, totalCyclesRent - totalPaidSum);
      lines.push(`"=== ${isMr ? '५. अंतिम ताळेबंद गोषवारा' : '5. Final Financial Settlement'} ==="`);
      lines.push(`"${isMr ? 'एकूण भाडे आकारणी' : 'Total Accrued Rent'}",${totalCyclesRent}`);
      lines.push(`"${isMr ? 'एकूण जमा रक्कम' : 'Total Amount Paid'}",${totalPaidSum}`);
      lines.push(`"${isMr ? 'शिल्लक येणे बाकी' : 'Net Balance Due'}",${netPendingSum}`);

      const csvContent = lines.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Anand_Plates_Bill_${r.billNumber || 1}_History_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    // 2. Bill-Wise Directory Index CSV Export
    if (reportType === 'bill_history') {
      const headers = isMr
        ? ['अ.क्र.', 'बिल क्र.', 'नोंद दिनांक', 'ग्राहकाचे नाव', 'मोबाईल', 'प्लेट साईझ', 'नग', 'एकूण भाडे (₹)', 'जमा रक्कम (₹)', 'बाकी रक्कम (₹)', 'स्थिती']
        : ['Sr No', 'Bill No', 'Issue Date', 'Customer Name', 'Mobile', 'Plate Size', 'Quantity', 'Total Rent (Rs)', 'Paid Amount (Rs)', 'Balance Due (Rs)', 'Status'];
      const rows = filteredRentals.map((r, idx) => {
        const cust = parties.find((p) => p.id === r.partyId);
        return [
          String(idx + 1),
          `"#${r.billNumber || 1}"`,
          formatDate(r.issueDate),
          `"${formatName(r.partyName).replace(/"/g, '""')}"`,
          cust?.mobile || '',
          r.plateType,
          String(r.quantity),
          String(r.totalRent),
          String(r.paid),
          String(Math.max(0, r.totalRent - r.paid)),
          r.status,
        ];
      });

      const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Anand_Plates_Bills_Directory_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    // 3. All Reports Master CSV Export
    if (reportType === 'all') {
      const lines: string[] = [];
      const titleBanner = isMr ? 'आनंद बिल्डर्स अँड डेव्हलपर्स — सर्व अहवाल (सर्वंकष हिशोब)' : 'ANAND BUILDERS & DEVELOPERS — ALL REPORTS STATEMENT';
      lines.push(`"${titleBanner}"`);
      lines.push(`"${isMr ? 'ग्राहक' : 'Customer'}: ${selectedPartyName.replace(/"/g, '""')}"`);
      lines.push(`"${isMr ? 'दिनांक' : 'Date'}: ${new Date().toLocaleDateString('en-IN')}"`);
      lines.push('');

      // 1. Rentals
      lines.push(`"=== ${curT.sectionRentals} (${filteredRentals.length} ${isMr ? 'नोंदी' : 'Records'}) ==="`);
      const rentalHeaders = isMr
        ? ['अ.क्र.', 'बिल क्र.', 'नोंद दिनांक', 'ग्राहकाचे नाव', 'प्लेट साईझ', 'नग', 'एकूण भाडे (₹)', 'जमा रक्कम (₹)', 'बाकी रक्कम (₹)']
        : ['Sr No', 'Bill No', 'Issue Date', 'Customer Name', 'Plate Size', 'Quantity', 'Total Rent (Rs)', 'Paid Amount (Rs)', 'Balance Due (Rs)'];
      lines.push(rentalHeaders.join(','));
      filteredRentals.forEach((r, idx) => {
        lines.push([
          String(idx + 1),
          `"#${r.billNumber || 1}"`,
          formatDate(r.issueDate),
          `"${formatName(r.partyName).replace(/"/g, '""')}"`,
          r.plateType,
          String(r.quantity),
          String(r.totalRent),
          String(r.paid),
          String(Math.max(0, r.totalRent - r.paid)),
        ].join(','));
      });
      lines.push('');

      // 2. Returns
      lines.push(`"=== ${curT.sectionReturns} (${filteredReturns.length} ${isMr ? 'नोंदी' : 'Records'}) ==="`);
      const returnHeaders = isMr
        ? ['अ.क्र.', 'जमा दिनांक', 'ग्राहकाचे नाव', 'प्लेट साईझ', 'जमा नग', 'शिल्लक नग']
        : ['Sr No', 'Return Date', 'Customer Name', 'Plate Size', 'Returned Qty', 'Remaining Qty'];
      lines.push(returnHeaders.join(','));
      filteredReturns.forEach((r, idx) => {
        lines.push([
          String(idx + 1),
          formatDate(r.returnDate),
          `"${formatName(r.partyName).replace(/"/g, '""')}"`,
          r.plateType,
          String(r.returnedQuantity),
          String(r.remainingQuantity),
        ].join(','));
      });
      lines.push('');

      // 3. Payments
      lines.push(`"=== ${curT.sectionPayments} (${filteredPayments.length} ${isMr ? 'नोंदी' : 'Records'}) ==="`);
      const paymentHeaders = isMr
        ? ['अ.क्र.', 'पेमेंट दिनांक', 'ग्राहकाचे नाव', 'जमा रक्कम (₹)', 'पेमेंट प्रकार', 'संदर्भ / तपशील']
        : ['Sr No', 'Payment Date', 'Customer Name', 'Amount (Rs)', 'Payment Mode', 'Reference / Notes'];
      lines.push(paymentHeaders.join(','));
      filteredPayments.forEach((p, idx) => {
        lines.push([
          String(idx + 1),
          formatDate(p.date),
          `"${formatName(p.partyName).replace(/"/g, '""')}"`,
          String(p.amount),
          p.paymentMode,
          `"${(p.reference || '').replace(/"/g, '""')}"`,
        ].join(','));
      });
      lines.push('');

      // 4. Outstanding
      lines.push(`"=== ${curT.sectionOutstanding} (${filteredOutstanding.length} ${isMr ? 'नोंदी' : 'Records'}) ==="`);
      const outstandingHeaders = isMr
        ? ['अ.क्र.', 'ग्राहकाचे नाव', 'मोबाईल नंबर', 'एकूण बिल (₹)', 'एकूण जमा (₹)', 'बाकी रक्कम (₹)']
        : ['Sr No', 'Customer Name', 'Mobile Number', 'Total Billed (Rs)', 'Total Paid (Rs)', 'Outstanding Due (Rs)'];
      lines.push(outstandingHeaders.join(','));
      filteredOutstanding.forEach((p, idx) => {
        lines.push([
          String(idx + 1),
          `"${formatName(p.name).replace(/"/g, '""')}"`,
          p.mobile,
          String(p.totalRent),
          String(p.paid),
          String(p.pending),
        ].join(','));
      });
      lines.push('');

      // 5. Master Summary
      lines.push(`"=== ${curT.masterSummary} ==="`);
      lines.push(`"${curT.totalBilled}",${totalRentBilled}`);
      lines.push(`"${curT.totalPaid}",${totalPaymentsReceived}`);
      lines.push(`"${curT.netDue}",${totalOutstandingDue}`);
      lines.push(`"${curT.totalDispatchedPlates}",${totalDispatchedQty}`);
      lines.push(`"${curT.totalReturnedPlates}",${totalReturnedQty}`);
      lines.push(`"${curT.activePlatesWithParties}",${activePlatesInField}`);

      const csvContent = lines.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Anand_Plates_All_Reports_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    // 4. Standard Reports CSV
    let headers: string[] = [];
    let rows: string[][] = [];

    if (reportType === 'rental') {
      headers = isMr
        ? ['अ.क्र.', 'बिल क्र.', 'नोंद दिनांक', 'ग्राहकाचे नाव', 'प्लेट साईझ', 'नग', 'एकूण भाडे (₹)', 'जमा रक्कम (₹)', 'बाकी रक्कम (₹)']
        : ['Sr No', 'Bill No', 'Issue Date', 'Customer Name', 'Plate Size', 'Quantity', 'Total Rent (Rs)', 'Paid Amount (Rs)', 'Balance Due (Rs)'];
      rows = filteredRentals.map((r, idx) => [
        String(idx + 1),
        `"#${r.billNumber || 1}"`,
        formatDate(r.issueDate),
        `"${formatName(r.partyName).replace(/"/g, '""')}"`,
        r.plateType,
        String(r.quantity),
        String(r.totalRent),
        String(r.paid),
        String(Math.max(0, r.totalRent - r.paid)),
      ]);
    } else if (reportType === 'return') {
      headers = isMr
        ? ['अ.क्र.', 'जमा दिनांक', 'ग्राहकाचे नाव', 'प्लेट साईझ', 'जमा नग', 'शिल्लक नग']
        : ['Sr No', 'Return Date', 'Customer Name', 'Plate Size', 'Returned Qty', 'Remaining Qty'];
      rows = filteredReturns.map((r, idx) => [
        String(idx + 1),
        formatDate(r.returnDate),
        `"${formatName(r.partyName).replace(/"/g, '""')}"`,
        r.plateType,
        String(r.returnedQuantity),
        String(r.remainingQuantity),
      ]);
    } else if (reportType === 'payment') {
      headers = isMr
        ? ['अ.क्र.', 'पेमेंट दिनांक', 'ग्राहकाचे नाव', 'जमा रक्कम (₹)', 'पेमेंट प्रकार', 'संदर्भ / तपशील']
        : ['Sr No', 'Payment Date', 'Customer Name', 'Amount (Rs)', 'Payment Mode', 'Reference / Notes'];
      rows = filteredPayments.map((p, idx) => [
        String(idx + 1),
        formatDate(p.date),
        `"${formatName(p.partyName).replace(/"/g, '""')}"`,
        String(p.amount),
        p.paymentMode,
        `"${(p.reference || '').replace(/"/g, '""')}"`,
      ]);
    } else if (reportType === 'outstanding') {
      headers = isMr
        ? ['अ.क्र.', 'ग्राहकाचे नाव', 'मोबाईल नंबर', 'एकूण बिल (₹)', 'एकूण जमा (₹)', 'बाकी रक्कम (₹)']
        : ['Sr No', 'Customer Name', 'Mobile Number', 'Total Billed (Rs)', 'Total Paid (Rs)', 'Outstanding Due (Rs)'];
      rows = filteredOutstanding.map((p, idx) => [
        String(idx + 1),
        `"${formatName(p.name).replace(/"/g, '""')}"`,
        p.mobile,
        String(p.totalRent),
        String(p.paid),
        String(p.pending),
      ]);
    }

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `Anand_Plates_${reportType}_Report_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getReportHeaderTitle = () => {
    if (reportType === 'bill_history') {
      if (activeHistoryRental) {
        return isMr
          ? `बिल #${activeHistoryRental.billNumber || 1} सर्वंकष भाडे इतिहास`
          : `Bill #${activeHistoryRental.billNumber || 1} Complete History Statement`;
      }
      return curT.types.bill_history || (isMr ? 'बिल निहाय इतिहास' : 'Bill-Wise History');
    }
    return curT.types[reportType] || reportType;
  };

  // Reusable sub-renderers for tables
  const renderRentalsSection = (items: Rental[], sectionHeader?: string) => {
    const totalQty = items.reduce((sum, r) => sum + Number(r.quantity || 0), 0);
    const totalAccrued = items.reduce((sum, r) => sum + Number(r.totalRent || 0), 0);
    const totalPaid = items.reduce((sum, r) => sum + Number(r.paid || 0), 0);
    const totalPending = totalAccrued - totalPaid;

    return (
      <div className="print-section overflow-hidden rounded-2xl border border-slate-200 print:rounded-none print:border-slate-800">
        {sectionHeader && (
          <div className="px-5 py-2.5 bg-slate-100/90 border-b border-slate-200 flex justify-between items-center print:bg-slate-200 print:py-1 print:px-3">
            <h5 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-primary" />
              <span>{sectionHeader}</span>
            </h5>
            <span className="text-[10px] font-mono font-bold bg-white text-slate-700 px-2 py-0.5 rounded border border-slate-200 print:border-slate-400">
              {items.length} {lang === 'marathi' ? 'नोंदी' : 'records'}
            </span>
          </div>
        )}
        <table className="print-table w-full text-left text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-600 text-xs font-bold border-b border-slate-200 uppercase tracking-wider">
              <th className="px-3 py-2.5 text-center w-12">{curT.headers.srNo}</th>
              <th className="px-3 py-2.5 text-center w-16"># {isMr ? 'बिल' : 'Bill'}</th>
              <th className="px-4 py-2.5">{curT.headers.issueDate}</th>
              <th className="px-4 py-2.5">{curT.headers.partyName}</th>
              <th className="px-3 py-2.5">{curT.headers.plateSize}</th>
              <th className="px-3 py-2.5 text-right">{curT.headers.quantity}</th>
              <th className="px-4 py-2.5 text-right">{curT.headers.totalRent}</th>
              <th className="px-4 py-2.5 text-right">{curT.headers.paidAmount}</th>
              <th className="px-4 py-2.5 text-right">{curT.headers.pendingAmount}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-xs">
            {items.map((r, idx) => {
              const matchedParty = parties.find((p) => p.id === r.partyId);
              const custNum = matchedParty?.customerNumber || r.customerNumber;

              return (
                <tr key={r.id} className="hover:bg-slate-50/50">
                  <td className="px-3 py-2 text-center text-slate-500 font-mono">{idx + 1}</td>
                  <td className="px-3 py-2 text-center font-mono font-bold text-primary">
                    #{r.billNumber || 1}
                  </td>
                  <td className="px-4 py-2 text-slate-600 font-mono">{formatDate(r.issueDate)}</td>
                  <td className="px-4 py-2 font-bold text-slate-900">
                    <div className="flex items-center gap-1.5">
                      {custNum && (
                        <span className="font-mono text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-700 border border-slate-200 rounded">
                          #{custNum}
                        </span>
                      )}
                      <span>{formatName(r.partyName)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-slate-700 font-mono">{r.plateType}</td>
                  <td className="px-3 py-2 font-bold text-right font-mono">{r.quantity}</td>
                  <td className="px-4 py-2 font-semibold text-slate-900 text-right font-mono">₹{r.totalRent.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-2 text-emerald-600 font-semibold text-right font-mono">₹{r.paid.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-2 text-rose-600 font-bold text-right font-mono">₹{Math.max(0, r.totalRent - r.paid).toLocaleString('en-IN')}</td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={9} className="p-4 text-center text-slate-400 italic text-xs">
                  {curT.emptyRecords}
                </td>
              </tr>
            )}
          </tbody>
          {items.length > 0 && (
            <tfoot>
              <tr className="bg-slate-100/80 font-black text-xs border-t-2 border-slate-300">
                <td colSpan={5} className="px-4 py-2.5 text-slate-800 uppercase tracking-wide">
                  {curT.totalSummary} ({items.length} {lang === 'marathi' ? 'नोंदी' : 'Records'})
                </td>
                <td className="px-3 py-2.5 text-right font-black font-mono">{totalQty}</td>
                <td className="px-4 py-2.5 text-right text-slate-900 font-black font-mono">₹{totalAccrued.toLocaleString('en-IN')}</td>
                <td className="px-4 py-2.5 text-right text-emerald-700 font-black font-mono">₹{totalPaid.toLocaleString('en-IN')}</td>
                <td className="px-4 py-2.5 text-right text-rose-700 font-black font-mono">₹{totalPending.toLocaleString('en-IN')}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    );
  };

  const renderReturnsSection = (items: ReturnLog[], sectionHeader?: string) => {
    const totalReturned = items.reduce((sum, r) => sum + Number(r.returnedQuantity || 0), 0);

    return (
      <div className="print-section overflow-hidden rounded-2xl border border-slate-200 print:rounded-none print:border-slate-800">
        {sectionHeader && (
          <div className="px-5 py-2.5 bg-slate-100/90 border-b border-slate-200 flex justify-between items-center print:bg-slate-200 print:py-1 print:px-3">
            <h5 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
              <span>{sectionHeader}</span>
            </h5>
            <span className="text-[10px] font-mono font-bold bg-white text-slate-700 px-2 py-0.5 rounded border border-slate-200 print:border-slate-400">
              {items.length} {lang === 'marathi' ? 'नोंदी' : 'records'}
            </span>
          </div>
        )}
        <table className="print-table w-full text-left text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-600 text-xs font-bold border-b border-slate-200 uppercase tracking-wider">
              <th className="px-3 py-2.5 text-center w-12">{curT.headers.srNo}</th>
              <th className="px-4 py-2.5">{curT.headers.returnDate}</th>
              <th className="px-5 py-2.5">{curT.headers.partyName}</th>
              <th className="px-4 py-2.5">{curT.headers.plateSize}</th>
              <th className="px-4 py-2.5 text-right">{curT.headers.returnedQty}</th>
              <th className="px-4 py-2.5 text-right">{curT.headers.remainingQty}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-xs">
            {items.map((r, idx) => {
              const matchedParty = parties.find((p) => p.id === r.partyId);
              const custNum = matchedParty?.customerNumber;

              return (
                <tr key={r.id} className="hover:bg-slate-50/50">
                  <td className="px-3 py-2 text-center text-slate-500 font-mono">{idx + 1}</td>
                  <td className="px-4 py-2 text-slate-600 font-mono">{formatDate(r.returnDate)}</td>
                  <td className="px-5 py-2 font-bold text-slate-900">
                    <div className="flex items-center gap-1.5">
                      {custNum && (
                        <span className="font-mono text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-700 border border-slate-200 rounded">
                          #{custNum}
                        </span>
                      )}
                      <span>{formatName(r.partyName)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-slate-700 font-mono">{r.plateType}</td>
                  <td className="px-4 py-2 text-emerald-600 font-bold text-right font-mono">{r.returnedQuantity}</td>
                  <td className="px-4 py-2 font-semibold text-slate-900 text-right font-mono">{r.remainingQuantity}</td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-slate-400 italic text-xs">
                  {curT.emptyRecords}
                </td>
              </tr>
            )}
          </tbody>
          {items.length > 0 && (
            <tfoot>
              <tr className="bg-slate-100/80 font-black text-xs border-t-2 border-slate-300">
                <td colSpan={4} className="px-4 py-2.5 text-slate-800 uppercase tracking-wide">
                  {curT.totalSummary} ({items.length} {lang === 'marathi' ? 'नोंदी' : 'Records'})
                </td>
                <td className="px-4 py-2.5 text-right text-emerald-700 font-black font-mono">{totalReturned}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    );
  };

  const renderPaymentsSection = (items: Payment[], sectionHeader?: string) => {
    const totalAmount = items.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    return (
      <div className="print-section overflow-hidden rounded-2xl border border-slate-200 print:rounded-none print:border-slate-800">
        {sectionHeader && (
          <div className="px-5 py-2.5 bg-slate-100/90 border-b border-slate-200 flex justify-between items-center print:bg-slate-200 print:py-1 print:px-3">
            <h5 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>{sectionHeader}</span>
            </h5>
            <span className="text-[10px] font-mono font-bold bg-white text-slate-700 px-2 py-0.5 rounded border border-slate-200 print:border-slate-400">
              {items.length} {lang === 'marathi' ? 'नोंदी' : 'records'}
            </span>
          </div>
        )}
        <table className="print-table w-full text-left text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-600 text-xs font-bold border-b border-slate-200 uppercase tracking-wider">
              <th className="px-3 py-2.5 text-center w-12">{curT.headers.srNo}</th>
              <th className="px-4 py-2.5">{curT.headers.paymentDate}</th>
              <th className="px-5 py-2.5">{curT.headers.partyName}</th>
              <th className="px-4 py-2.5 text-right">{curT.headers.paidAmount}</th>
              <th className="px-4 py-2.5">{curT.headers.paymentMode}</th>
              <th className="px-4 py-2.5">{curT.headers.reference}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-xs">
            {items.map((p, idx) => {
              const matchedParty = parties.find((pt) => pt.id === p.partyId);
              const custNum = matchedParty?.customerNumber;

              return (
                <tr key={p.id} className="hover:bg-slate-50/50">
                  <td className="px-3 py-2 text-center text-slate-500 font-mono">{idx + 1}</td>
                  <td className="px-4 py-2 text-slate-600 font-mono">{formatDate(p.date)}</td>
                  <td className="px-5 py-2 font-bold text-slate-900">
                    <div className="flex items-center gap-1.5">
                      {custNum && (
                        <span className="font-mono text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-700 border border-slate-200 rounded">
                          #{custNum}
                        </span>
                      )}
                      <span>{formatName(p.partyName)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-emerald-600 font-black text-right font-mono">₹{p.amount.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-2 font-semibold text-slate-700">{p.paymentMode}</td>
                  <td className="px-4 py-2 text-slate-500 font-mono">{p.reference || '-'}</td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-slate-400 italic text-xs">
                  {curT.emptyRecords}
                </td>
              </tr>
            )}
          </tbody>
          {items.length > 0 && (
            <tfoot>
              <tr className="bg-slate-100/80 font-black text-xs border-t-2 border-slate-300">
                <td colSpan={3} className="px-4 py-2.5 text-slate-800 uppercase tracking-wide">
                  {curT.totalSummary} ({items.length} {lang === 'marathi' ? 'पेमेंट्स' : 'Payments'})
                </td>
                <td className="px-4 py-2.5 text-right text-emerald-700 font-black font-mono">₹{totalAmount.toLocaleString('en-IN')}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    );
  };

  const renderOutstandingSection = (items: Party[], sectionHeader?: string) => {
    const totalBilled = items.reduce((sum, p) => sum + Number(p.totalRent || 0), 0);
    const totalPaid = items.reduce((sum, p) => sum + Number(p.paid || 0), 0);
    const totalPending = items.reduce((sum, p) => sum + Number(p.pending || 0), 0);

    return (
      <div className="print-section overflow-hidden rounded-2xl border border-slate-200 print:rounded-none print:border-slate-800">
        {sectionHeader && (
          <div className="px-5 py-2.5 bg-slate-100/90 border-b border-slate-200 flex justify-between items-center print:bg-slate-200 print:py-1 print:px-3">
            <h5 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-rose-600" />
              <span>{sectionHeader}</span>
            </h5>
            <span className="text-[10px] font-mono font-bold bg-white text-slate-700 px-2 py-0.5 rounded border border-slate-200 print:border-slate-400">
              {items.length} {lang === 'marathi' ? 'नोंदी' : 'records'}
            </span>
          </div>
        )}
        <table className="print-table w-full text-left text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-600 text-xs font-bold border-b border-slate-200 uppercase tracking-wider">
              <th className="px-3 py-2.5 text-center w-12">{curT.headers.srNo}</th>
              <th className="px-5 py-2.5">{curT.headers.partyName}</th>
              <th className="px-4 py-2.5">{curT.headers.mobile}</th>
              <th className="px-4 py-2.5 text-right">{curT.headers.totalRent}</th>
              <th className="px-4 py-2.5 text-right">{curT.headers.paidAmount}</th>
              <th className="px-4 py-2.5 text-right">{curT.headers.pendingAmount}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-xs">
            {items.map((p, idx) => (
              <tr key={p.id} className="hover:bg-slate-50/50">
                <td className="px-3 py-2 text-center text-slate-500 font-mono">{idx + 1}</td>
                <td className="px-5 py-2 font-bold text-slate-900">
                  <div className="flex items-center gap-1.5">
                    {p.customerNumber && (
                      <span className="font-mono text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-700 border border-slate-200 rounded">
                        #{p.customerNumber}
                      </span>
                    )}
                    <span>{formatName(p.name)}</span>
                  </div>
                </td>
                <td className="px-4 py-2 font-mono text-slate-600">{p.mobile}</td>
                <td className="px-4 py-2 text-right font-semibold text-slate-800 font-mono">₹{p.totalRent.toLocaleString('en-IN')}</td>
                <td className="px-4 py-2 text-right text-emerald-600 font-semibold font-mono">₹{p.paid.toLocaleString('en-IN')}</td>
                <td className="px-4 py-2 text-right text-rose-600 font-black font-mono">₹{p.pending.toLocaleString('en-IN')}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-slate-400 italic text-xs">
                  {curT.emptyRecords}
                </td>
              </tr>
            )}
          </tbody>
          {items.length > 0 && (
            <tfoot>
              <tr className="bg-slate-100/80 font-black text-xs border-t-2 border-slate-300">
                <td colSpan={3} className="px-4 py-2.5 text-slate-800 uppercase tracking-wide">
                  {curT.totalSummary} ({items.length} {lang === 'marathi' ? 'ग्राहक' : 'Customers'})
                </td>
                <td className="px-4 py-2.5 text-right text-slate-900 font-black font-mono">₹{totalBilled.toLocaleString('en-IN')}</td>
                <td className="px-4 py-2.5 text-right text-emerald-700 font-black font-mono">₹{totalPaid.toLocaleString('en-IN')}</td>
                <td className="px-4 py-2.5 text-right text-rose-700 font-black font-mono">₹{totalPending.toLocaleString('en-IN')}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    );
  };

  // =========================================================================
  // BILL-WISE COMPREHENSIVE HISTORY SECTION
  // =========================================================================
  const renderBillHistorySection = (rental: Rental) => {
    const cust = parties.find(
      (p) =>
        (rental.partyId && p.id === rental.partyId) ||
        p.name.trim().toLowerCase() === rental.partyName?.trim().toLowerCase()
    );
    const custNumber = cust?.customerNumber || rental.customerNumber;
    const cycles = getCyclesForRental(rental);

    const items =
      rental.items && rental.items.length > 0
        ? rental.items
        : [
            {
              plateType: rental.plateType,
              quantity: rental.quantity,
              dailyRate: rental.dailyRate,
              days: rental.days,
              totalRent: rental.totalRent,
            },
          ];

    const rentalReturns = returns.filter(
      (ret) =>
        (ret.rentalId && ret.rentalId === rental.id) ||
        (ret.partyId === rental.partyId &&
          ret.plateType === rental.plateType &&
          new Date(ret.returnDate) >= new Date(rental.issueDate))
    );

    const rentalPayments = payments.filter(
      (p) =>
        (p.rentalId && p.rentalId === rental.id) ||
        (p.partyId && p.partyId === rental.partyId)
    );

    const totalDispatched = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
    const totalReturned = rentalReturns.reduce((sum, ret) => sum + (Number(ret.returnedQuantity) || 0), 0);
    const remainingInField = Math.max(0, totalDispatched - totalReturned);

    const totalCyclesRent = cycles.reduce((sum, c) => sum + (Number(c.totalAmount) || 0), 0) || rental.totalRent;
    const totalPaidSum = rentalPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || rental.paid;
    const netPendingSum = Math.max(0, totalCyclesRent - totalPaidSum);

    return (
      <div className="space-y-6">
        {/* Navigation & Header Actions (Screen Only) */}
        <div className="no-print flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-900 text-white p-4 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setSelectedRentalIdForHistory(null);
                setSearchBillNumber('');
              }}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer text-slate-200"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{isMr ? 'सर्व बिले पहा' : 'Back to All Bills'}</span>
            </button>
            <div className="h-4 w-px bg-white/20" />
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-primary text-white shadow-2xs">
                {isMr ? 'बिल क्रमांक' : 'Bill No'} #{rental.billNumber || 1}
              </span>
              <span className="text-sm font-bold text-white">{formatName(rental.partyName)}</span>
              {custNumber && (
                <span className="text-[10px] font-mono bg-white/20 px-2 py-0.5 rounded text-slate-200">
                  #{custNumber}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                rental.status === 'returned'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : rental.status === 'overdue'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
              }`}
            >
              {rental.status === 'returned'
                ? isMr ? 'साहित्य जमा (पूर्ण)' : 'Returned'
                : rental.status === 'overdue'
                ? isMr ? 'मुदत संपली' : 'Overdue'
                : isMr ? 'सक्रिय भाडे' : 'Active'}
            </span>
          </div>
        </div>

        {/* 4 KPI SUMMARY CARDS FOR THIS SPECIFIC BILL */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
          {/* KPI 1: Plates */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs print:border print:border-slate-800 print:rounded-none">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">
              {isMr ? 'वाटप व शिल्लक प्लेट्स' : 'Dispatched vs In Field'}
            </span>
            <div className="text-lg font-black text-slate-900 mt-0.5 font-mono">
              {remainingInField} <span className="text-xs text-slate-500 font-normal">/ {totalDispatched}</span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
              {totalReturned} {isMr ? 'जमा' : 'returned'} • {remainingInField} {isMr ? 'ग्राहकाकडे' : 'with party'}
            </span>
          </div>

          {/* KPI 2: Total Rent Accrued */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs print:border print:border-slate-800 print:rounded-none">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">
              {isMr ? 'एकूण भाडे आकारणी' : 'Total Billed Rent'}
            </span>
            <div className="text-lg font-black text-slate-900 mt-0.5 font-mono">
              ₹{totalCyclesRent.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
              {cycles.length} {isMr ? 'भाडे सायकल' : 'cycles'}
            </span>
          </div>

          {/* KPI 3: Total Paid */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs print:border print:border-slate-800 print:rounded-none">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">
              {isMr ? 'एकूण जमा रक्कम' : 'Total Payments Received'}
            </span>
            <div className="text-lg font-black text-emerald-600 mt-0.5 font-mono">
              ₹{totalPaidSum.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
              {rentalPayments.length} {isMr ? 'जमा पावत्या' : 'receipts'}
            </span>
          </div>

          {/* KPI 4: Net Balance Due */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs print:border print:border-slate-800 print:rounded-none">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">
              {isMr ? 'शिल्लक बाकी रक्कम' : 'Net Balance Due'}
            </span>
            <div className={`text-lg font-black mt-0.5 font-mono ${netPendingSum > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              ₹{netPendingSum.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
              {netPendingSum === 0 ? (isMr ? 'हिशोब पूर्ण चुकता' : 'Settled in Full') : (isMr ? 'थकबाकी बाकी' : 'Outstanding')}
            </span>
          </div>
        </div>

        {/* SECTION 1: MATERIAL DISPATCHED PARTICULARS */}
        <div className="print-section overflow-hidden rounded-2xl border border-slate-200 print:rounded-none print:border-slate-800">
          <div className="px-5 py-2.5 bg-slate-100/90 border-b border-slate-200 flex justify-between items-center print:bg-slate-200 print:py-1 print:px-3">
            <h5 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-primary" />
              <span>{isMr ? '१. वाटप साहित्य तपशील' : '1. Dispatched Material Particulars'}</span>
            </h5>
            <span className="text-[10px] font-mono font-bold bg-white text-slate-700 px-2 py-0.5 rounded border border-slate-200">
              {formatDate(rental.issueDate)}
            </span>
          </div>
          <table className="print-table w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs font-bold border-b border-slate-200 uppercase tracking-wider">
                <th className="px-3 py-2.5 text-center w-12">{curT.headers.srNo}</th>
                <th className="px-4 py-2.5">{curT.headers.plateSize}</th>
                <th className="px-4 py-2.5 text-right">{curT.headers.quantity}</th>
                <th className="px-4 py-2.5 text-right">{isMr ? 'दर / दिवस' : 'Daily Rate'}</th>
                <th className="px-4 py-2.5 text-right">{isMr ? 'दिवस' : 'Days'}</th>
                <th className="px-4 py-2.5 text-right">{curT.headers.totalRent}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-xs">
              {items.map((it, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="px-3 py-2 text-center text-slate-500 font-mono">{idx + 1}</td>
                  <td className="px-4 py-2 font-mono font-bold text-slate-800">{it.plateType}</td>
                  <td className="px-4 py-2 text-right font-mono font-black text-slate-900">{it.quantity}</td>
                  <td className="px-4 py-2 text-right font-mono text-slate-600">₹{it.dailyRate}/day</td>
                  <td className="px-4 py-2 text-right font-mono text-slate-600">{it.days} {isMr ? 'दिवस' : 'days'}</td>
                  <td className="px-4 py-2 text-right font-mono font-black text-slate-900">
                    ₹{((Number(it.quantity) || 0) * (Number(it.dailyRate) || 0) * (Number(it.days) || 0)).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100/80 font-black text-xs border-t-2 border-slate-300">
                <td colSpan={2} className="px-4 py-2 text-slate-800 uppercase">
                  {isMr ? 'एकूण वाटप नग' : 'Total Dispatched'}
                </td>
                <td className="px-4 py-2 text-right font-mono font-black">{totalDispatched}</td>
                <td colSpan={2}></td>
                <td className="px-4 py-2 text-right text-slate-900 font-black font-mono">
                  ₹{rental.totalRent.toLocaleString('en-IN')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* SECTION 2: RENTAL CYCLES TIMELINE */}
        <div className="print-section overflow-hidden rounded-2xl border border-slate-200 print:rounded-none print:border-slate-800">
          <div className="px-5 py-2.5 bg-slate-100/90 border-b border-slate-200 flex justify-between items-center print:bg-slate-200 print:py-1 print:px-3">
            <h5 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>{isMr ? '२. भाडे सायकल कालक्रम व तपशील' : '2. Rental Cycles Timeline & Duration'}</span>
            </h5>
            <span className="text-[10px] font-mono font-bold bg-white text-slate-700 px-2 py-0.5 rounded border border-slate-200">
              {cycles.length} {isMr ? 'सायकल्स' : 'Cycles'}
            </span>
          </div>
          <table className="print-table w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs font-bold border-b border-slate-200 uppercase tracking-wider">
                <th className="px-3 py-2.5 text-center w-24">{isMr ? 'सायकल' : 'Cycle'}</th>
                <th className="px-4 py-2.5">{isMr ? 'सुरुवात दिनांक' : 'Start Date'}</th>
                <th className="px-4 py-2.5">{isMr ? 'समाप्ती दिनांक' : 'End Date'}</th>
                <th className="px-3 py-2.5 text-right">{isMr ? 'कालावधी' : 'Duration'}</th>
                <th className="px-3 py-2.5 text-right">{curT.headers.quantity}</th>
                <th className="px-4 py-2.5 text-right">{isMr ? 'सायकल भाडे' : 'Cycle Rent'}</th>
                <th className="px-4 py-2.5 text-right">{curT.headers.paidAmount}</th>
                <th className="px-4 py-2.5 text-right">{curT.headers.pendingAmount}</th>
                <th className="px-3 py-2.5 text-center">{isMr ? 'स्थिती' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-xs">
              {cycles.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50">
                  <td className="px-3 py-2 text-center font-bold text-slate-900">
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 text-[11px]">
                      {isMr ? 'सायकल' : 'Cycle'} #{c.cycleNumber}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-600 font-mono">{formatDate(c.startDate)}</td>
                  <td className="px-4 py-2 text-slate-600 font-mono">{formatDate(c.expectedEndDate)}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-700">
                    {c.days} {isMr ? 'दिवस' : 'd'}{c.extraDays ? ` + ${c.extraDays} ${isMr ? 'अतिरिक्त' : 'ext'}` : ''}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-bold">{c.quantity}</td>
                  <td className="px-4 py-2 text-right font-mono font-black text-slate-900">
                    ₹{c.totalAmount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-2 text-right font-mono font-semibold text-emerald-600">
                    ₹{c.paidAmount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-2 text-right font-mono font-bold text-rose-600">
                    ₹{c.pendingAmount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        c.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-100 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {c.status === 'completed' ? (isMr ? 'पूर्ण' : 'Completed') : (isMr ? 'सक्रिय' : 'Active')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100/80 font-black text-xs border-t-2 border-slate-300">
                <td colSpan={5} className="px-4 py-2 text-slate-800 uppercase">
                  {isMr ? 'सर्व सायकल्स एकूण' : 'All Cycles Total'}
                </td>
                <td className="px-4 py-2 text-right text-slate-900 font-black font-mono">
                  ₹{totalCyclesRent.toLocaleString('en-IN')}
                </td>
                <td className="px-4 py-2 text-right text-emerald-700 font-black font-mono">
                  ₹{cycles.reduce((s, c) => s + (c.paidAmount || 0), 0).toLocaleString('en-IN')}
                </td>
                <td className="px-4 py-2 text-right text-rose-700 font-black font-mono">
                  ₹{cycles.reduce((s, c) => s + (c.pendingAmount || 0), 0).toLocaleString('en-IN')}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* SECTION 3: MATERIAL RETURNS INTAKE LOG */}
        <div className="print-section overflow-hidden rounded-2xl border border-slate-200 print:rounded-none print:border-slate-800">
          <div className="px-5 py-2.5 bg-slate-100/90 border-b border-slate-200 flex justify-between items-center print:bg-slate-200 print:py-1 print:px-3">
            <h5 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isMr ? '३. साहित्य परत जमा नोंद' : '3. Material Returns Intake Log'}</span>
            </h5>
            <span className="text-[10px] font-mono font-bold bg-white text-slate-700 px-2 py-0.5 rounded border border-slate-200">
              {rentalReturns.length} {isMr ? 'नोंदी' : 'Entries'}
            </span>
          </div>
          <table className="print-table w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs font-bold border-b border-slate-200 uppercase tracking-wider">
                <th className="px-3 py-2.5 text-center w-12">{curT.headers.srNo}</th>
                <th className="px-4 py-2.5">{curT.headers.returnDate}</th>
                <th className="px-4 py-2.5">{curT.headers.plateSize}</th>
                <th className="px-4 py-2.5 text-right">{isMr ? 'जमा केलेले नग' : 'Returned Qty'}</th>
                <th className="px-4 py-2.5 text-right">{isMr ? 'ग्राहकाकडे शिल्लक नग' : 'Remaining In Field'}</th>
                <th className="px-4 py-2.5 text-right">{isMr ? 'वसूल रक्कम' : 'Settlement Paid'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-xs">
              {rentalReturns.map((ret, idx) => (
                <tr key={ret.id} className="hover:bg-slate-50/50">
                  <td className="px-3 py-2 text-center text-slate-500 font-mono">{idx + 1}</td>
                  <td className="px-4 py-2 text-slate-600 font-mono">{formatDate(ret.returnDate)}</td>
                  <td className="px-4 py-2 text-slate-700 font-mono font-bold">{ret.plateType}</td>
                  <td className="px-4 py-2 text-emerald-600 font-black text-right font-mono">{ret.returnedQuantity}</td>
                  <td className="px-4 py-2 text-slate-800 font-bold text-right font-mono">{ret.remainingQuantity}</td>
                  <td className="px-4 py-2 text-right font-mono font-semibold text-slate-900">
                    {ret.collectedAmount ? `₹${Number(ret.collectedAmount).toLocaleString('en-IN')}` : '-'}
                  </td>
                </tr>
              ))}
              {rentalReturns.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-slate-400 italic text-xs">
                    {isMr
                      ? 'या बिलाचे कोणतेही साहित्य अद्याप परत जमा झालेले नाही (सर्व साहित्य ग्राहकाकडे सक्रिय आहे).'
                      : 'No plates have been returned for this bill yet (all plates active with party).'}
                  </td>
                </tr>
              )}
            </tbody>
            {rentalReturns.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100/80 font-black text-xs border-t-2 border-slate-300">
                  <td colSpan={3} className="px-4 py-2 text-slate-800 uppercase">
                    {isMr ? 'एकूण जमा साहित्य' : 'Total Returned'}
                  </td>
                  <td className="px-4 py-2 text-right text-emerald-700 font-black font-mono">{totalReturned}</td>
                  <td className="px-4 py-2 text-right text-slate-900 font-black font-mono">{remainingInField}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* SECTION 4: PAYMENT RECEIPTS LOG */}
        <div className="print-section overflow-hidden rounded-2xl border border-slate-200 print:rounded-none print:border-slate-800">
          <div className="px-5 py-2.5 bg-slate-100/90 border-b border-slate-200 flex justify-between items-center print:bg-slate-200 print:py-1 print:px-3">
            <h5 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isMr ? '४. जमा पावत्या व पेमेंट इतिहास' : '4. Payment Receipts & Collection Log'}</span>
            </h5>
            <span className="text-[10px] font-mono font-bold bg-white text-slate-700 px-2 py-0.5 rounded border border-slate-200">
              {rentalPayments.length} {isMr ? 'पावत्या' : 'Receipts'}
            </span>
          </div>
          <table className="print-table w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs font-bold border-b border-slate-200 uppercase tracking-wider">
                <th className="px-3 py-2.5 text-center w-12">{curT.headers.srNo}</th>
                <th className="px-4 py-2.5">{curT.headers.paymentDate}</th>
                <th className="px-4 py-2.5 text-right">{curT.headers.paidAmount}</th>
                <th className="px-4 py-2.5">{curT.headers.paymentMode}</th>
                <th className="px-4 py-2.5">{curT.headers.reference}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-xs">
              {rentalPayments.map((p, idx) => (
                <tr key={p.id} className="hover:bg-slate-50/50">
                  <td className="px-3 py-2 text-center text-slate-500 font-mono">{idx + 1}</td>
                  <td className="px-4 py-2 text-slate-600 font-mono">{formatDate(p.date)}</td>
                  <td className="px-4 py-2 text-emerald-600 font-black text-right font-mono">
                    ₹{p.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-2 font-semibold text-slate-700">{p.paymentMode}</td>
                  <td className="px-4 py-2 text-slate-500 font-mono">{p.reference || p.notes || '-'}</td>
                </tr>
              ))}
              {rentalPayments.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-400 italic text-xs">
                    {isMr ? 'या बिलासाठी कोणतीही स्वतंत्र जमा पावती नोंदवलेली नाही.' : 'No payment receipts recorded for this bill.'}
                  </td>
                </tr>
              )}
            </tbody>
            {rentalPayments.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100/80 font-black text-xs border-t-2 border-slate-300">
                  <td colSpan={2} className="px-4 py-2 text-slate-800 uppercase">
                    {isMr ? 'एकूण जमा रक्कम' : 'Total Collected'}
                  </td>
                  <td className="px-4 py-2 text-right text-emerald-700 font-black font-mono">
                    ₹{totalPaidSum.toLocaleString('en-IN')}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* SECTION 5: FINAL RECONCILED STATEMENT CARD */}
        <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl shadow-sm border border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 print:bg-white print:text-black print:border-2 print:border-slate-900 print:rounded-none">
          <div>
            <h5 className="text-xs font-black uppercase tracking-wider text-orange-400 print:text-black">
              {isMr ? '५. अंतिम हिशोब व ताळेबंद गोषवारा' : '5. Final Financial Settlement Summary'}
            </h5>
            <p className="text-[11px] text-slate-400 mt-0.5 print:text-slate-700">
              {isMr
                ? `बिल #${rental.billNumber || 1} • सर्व सायकल्स, साहित्य जमा व पेमेंट्सचा अंतिम ताळेबंद`
                : `Bill #${rental.billNumber || 1} • Reconciled summary across all cycles, returns and receipts`}
            </p>
          </div>

          <div className="flex items-center gap-6 text-center">
            <div>
              <span className="text-[10px] text-slate-400 uppercase block print:text-slate-600">
                {isMr ? 'एकूण भाडे आकारणी' : 'Total Accrued'}
              </span>
              <span className="text-base font-black font-mono">₹{totalCyclesRent.toLocaleString('en-IN')}</span>
            </div>
            <div className="text-slate-600 font-mono text-lg font-bold">-</div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block print:text-slate-600">
                {isMr ? 'एकूण जमा' : 'Total Paid'}
              </span>
              <span className="text-base font-black font-mono text-emerald-400 print:text-emerald-700">
                ₹{totalPaidSum.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="text-slate-600 font-mono text-lg font-bold">=</div>
            <div className="px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/20 print:bg-slate-100 print:border-slate-800">
              <span className="text-[10px] text-orange-300 uppercase block font-bold print:text-slate-800">
                {isMr ? 'शिल्लक येणे बाकी' : 'Net Due Balance'}
              </span>
              <span className={`text-lg font-black font-mono ${netPendingSum > 0 ? 'text-rose-400 print:text-rose-700' : 'text-emerald-400 print:text-emerald-700'}`}>
                ₹{netPendingSum.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // =========================================================================
  // BILL DIRECTORY / INDEX SECTION (When multiple bills match or browse all)
  // =========================================================================
  const renderBillDirectorySection = (items: Rental[]) => {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3 bg-slate-100/80 rounded-2xl border border-slate-200">
          <div>
            <h5 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Hash className="w-4 h-4 text-primary" />
              <span>{isMr ? 'सर्व बिलांची यादी व इतिहास' : 'All Bills Directory & History'}</span>
            </h5>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isMr
                ? 'खालील कोणत्याही बिलाचा संपूर्ण सायकल, जमा व पेमेंट इतिहास पाहण्यासाठी "इतिहास पहा" बटनावर क्लिक करा.'
                : 'Click "View History" on any bill below to view full cycles, returns, and payment breakdown.'}
            </p>
          </div>
          <span className="text-xs font-mono font-bold bg-white text-slate-700 px-3 py-1 rounded-xl border border-slate-200">
            {items.length} {isMr ? 'बिले' : 'Bills'}
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <th className="px-3 py-3 text-center"># {isMr ? 'बिल क्र.' : 'Bill #'}</th>
                <th className="px-4 py-3">{curT.headers.issueDate}</th>
                <th className="px-4 py-3">{curT.headers.partyName}</th>
                <th className="px-3 py-3">{curT.headers.plateSize}</th>
                <th className="px-3 py-3 text-right">{curT.headers.quantity}</th>
                <th className="px-4 py-3 text-right">{curT.headers.totalRent}</th>
                <th className="px-4 py-3 text-right">{curT.headers.paidAmount}</th>
                <th className="px-4 py-3 text-right">{curT.headers.pendingAmount}</th>
                <th className="px-3 py-3 text-center">{isMr ? 'स्थिती' : 'Status'}</th>
                <th className="px-4 py-3 text-center no-print">{isMr ? 'कृती' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {items.map((r) => {
                const cust = parties.find((p) => p.id === r.partyId);
                const custNo = cust?.customerNumber || r.customerNumber;
                const pending = Math.max(0, r.totalRent - r.paid);
                return (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-3 py-2.5 text-center font-mono font-black text-primary">
                      <span className="px-2 py-0.5 rounded bg-orange-100 border border-orange-200">
                        #{r.billNumber || 1}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 font-mono">{formatDate(r.issueDate)}</td>
                    <td className="px-4 py-2.5 font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        {custNo && (
                          <span className="font-mono text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-700 border border-slate-200 rounded">
                            #{custNo}
                          </span>
                        )}
                        <span>{formatName(r.partyName)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-700 font-mono">{r.plateType}</td>
                    <td className="px-3 py-2.5 text-right font-bold font-mono">{r.quantity}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-900 font-mono">
                      ₹{r.totalRent.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-2.5 text-right text-emerald-600 font-semibold font-mono">
                      ₹{r.paid.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-2.5 text-right text-rose-600 font-bold font-mono">
                      ₹{pending.toLocaleString('en-IN')}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          r.status === 'returned'
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : r.status === 'overdue'
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : 'bg-blue-100 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {r.status === 'returned'
                          ? isMr ? 'जमा झाले' : 'Returned'
                          : r.status === 'overdue'
                          ? isMr ? 'मुदत संपली' : 'Overdue'
                          : isMr ? 'सक्रिय' : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center no-print">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRentalIdForHistory(r.id);
                          setSearchBillNumber(String(r.billNumber || ''));
                        }}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-primary text-white text-xs font-bold rounded-lg transition flex items-center gap-1 mx-auto cursor-pointer shadow-2xs"
                        title={isMr ? 'या बिलाचा संपूर्ण इतिहास पहा' : 'View Full History for this Bill'}
                      >
                        <Eye className="w-3 h-3" />
                        <span>{isMr ? 'इतिहास पहा' : 'View History'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-slate-400 italic text-xs">
                    {curT.emptyRecords}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 text-left">
      {/* Print-specific CSS styles for A4 page output */}
      <style>{`
        .print-letterhead {
          display: none;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          }

          /* Ensure all parent containers flow naturally in print */
          #root,
          #root > div,
          .min-h-screen,
          .overflow-hidden,
          .overflow-y-auto,
          main {
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            position: static !important;
            display: block !important;
            box-shadow: none !important;
            border: none !important;
          }

          /* Hide application navigation & screen controls */
          aside,
          header,
          nav,
          .no-print,
          .md\\:hidden {
            display: none !important;
          }

          /* Printable report container */
          #printable-report-area {
            display: block !important;
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            overflow: visible !important;
          }

          .print-letterhead {
            display: block !important;
          }

          @page {
            size: A4 ${pageOrientation};
            margin: 8mm 10mm;
          }
          .print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            border: 1.5px solid #0f172a !important;
            font-size: ${pageOrientation === 'landscape' ? '8.5pt' : '8pt'} !important;
            line-height: 1.25 !important;
          }
          .print-table thead {
            display: table-header-group !important;
          }
          .print-table tr {
            page-break-inside: avoid !important;
          }
          .print-table th, .print-table td {
            border: 1px solid #334155 !important;
            padding: 4px 6px !important;
            color: #000000 !important;
          }
          .print-table th {
            background-color: #f1f5f9 !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.025em !important;
          }
          .print-table tfoot td {
            background-color: #f8fafc !important;
            font-weight: 800 !important;
            border-top: 2px solid #0f172a !important;
          }
          .print-avoid-break {
            page-break-inside: avoid !important;
          }
          .print-section {
            page-break-inside: avoid !important;
            margin-bottom: 12px !important;
          }
        }
      `}</style>

      {/* Reports controls (hidden during print) */}
      <div className="no-print bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h4 className="text-sm font-bold text-charcoal flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <span>{curT.compileTitle}</span>
          </h4>

          {/* Page orientation selector */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <span className="text-[11px] text-slate-500 pl-2 flex items-center gap-1">
              <Layout className="w-3.5 h-3.5 text-slate-400" />
              <span>{curT.printLayout}</span>
            </span>
            <button
              type="button"
              onClick={() => setPageOrientation('portrait')}
              className={`px-3 py-1.5 rounded-lg text-xs transition font-bold cursor-pointer ${
                pageOrientation === 'portrait'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {curT.portrait}
            </button>
            <button
              type="button"
              onClick={() => setPageOrientation('landscape')}
              className={`px-3 py-1.5 rounded-lg text-xs transition font-bold cursor-pointer ${
                pageOrientation === 'landscape'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {curT.landscape}
            </button>
          </div>
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Report Type */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">{curT.reportType}</label>
            <select
              value={reportType}
              onChange={(e) => {
                const newType = e.target.value as ReportType;
                setReportType(newType);
                if (newType !== 'bill_history') {
                  setSelectedRentalIdForHistory(null);
                }
              }}
              className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:outline-none px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer text-slate-900"
            >
              <option value="all">{curT.types.all}</option>
              <option value="bill_history">{curT.types.bill_history || (isMr ? 'बिल निहाय इतिहास' : 'Bill-Wise History')}</option>
              <option value="rental">{curT.types.rental}</option>
              <option value="return">{curT.types.return}</option>
              <option value="payment">{curT.types.payment}</option>
              <option value="outstanding">{curT.types.outstanding}</option>
            </select>
          </div>

          {/* Search Bill Number */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <Search className="w-3 h-3 text-primary" />
              <span>{isMr ? 'बिल नंबर शोधा' : 'Search Bill #'}</span>
            </label>
            <div className="relative">
              <input
                type="text"
                list="available-bill-numbers"
                value={searchBillNumber}
                onChange={(e) => {
                  setSearchBillNumber(e.target.value);
                  setSelectedRentalIdForHistory(null);
                }}
                placeholder={isMr ? 'उदा. 1, 2 किंवा #101' : 'e.g. 1, 2 or #101'}
                className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:outline-none px-3 py-2.5 rounded-xl text-xs font-semibold font-mono text-slate-900"
              />
              <datalist id="available-bill-numbers">
                {rentals.map((r) => (
                  <option key={r.id} value={String(r.billNumber || '')}>
                    #{r.billNumber || 1} — {r.partyName} (₹{r.totalRent})
                  </option>
                ))}
              </datalist>
            </div>
          </div>

          {/* Customer Party */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">{curT.customerParty}</label>
            <select
              value={selectedPartyId}
              onChange={(e) => setSelectedPartyId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:outline-none px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
            >
              <option value="">{curT.allParties}</option>
              {parties.map((p, idx) => (
                <option key={p.id} value={p.id}>
                  {p.customerNumber ? `Cust #${p.customerNumber} — ` : `Customer #${idx + 1} — `}
                  {p.name} {p.mobile ? `(${p.mobile})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Plate Size */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">{curT.plateSize}</label>
            <select
              value={selectedPlateType}
              onChange={(e) => setSelectedPlateType(e.target.value)}
              disabled={reportType === 'payment' || reportType === 'outstanding'}
              className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:outline-none px-3 py-2.5 rounded-xl text-xs font-semibold disabled:opacity-50 cursor-pointer"
            >
              <option value="">{curT.allSizes}</option>
              {plates.map((p) => (
                <option key={p.plateType} value={p.plateType}>{p.plateType}</option>
              ))}
            </select>
          </div>

          {/* From Date */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">{curT.fromDate}</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              disabled={reportType === 'outstanding'}
              className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:outline-none px-3 py-2.5 rounded-xl text-xs font-semibold disabled:opacity-50"
            />
          </div>

          {/* To Date */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">{curT.toDate}</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              disabled={reportType === 'outstanding'}
              className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:outline-none px-3 py-2.5 rounded-xl text-xs font-semibold disabled:opacity-50"
            />
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-4 justify-between items-center">
          <div className="text-xs text-slate-500 font-medium">
            {curT.totalRecords} <span className="font-bold text-slate-800">{totalRecordsCount}</span> | 
            {' '}{curT.paperSize} <span className="font-bold text-primary">A4 ({pageOrientation === 'portrait' ? curT.portrait : curT.landscape})</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{curT.reset}</span>
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={totalRecordsCount === 0}
              className="px-3.5 py-2 hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              title="Download statement as CSV file"
            >
              <Download className="w-4 h-4 text-primary" />
              <span>{curT.exportCsv}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={totalRecordsCount === 0}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-40"
              title="Print A4 Report"
            >
              <Printer className="w-4 h-4 text-orange-400" />
              <span>{curT.printReport}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Reports preview & printable container */}
      <div id="printable-report-area" className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden animate-fadeIn">
        {/* ========================================================= */}
        {/* PRINT-ONLY FORMAL BUSINESS LETTERHEAD (Visible on A4 Print) */}
        {/* ========================================================= */}
        <div className="print-letterhead p-4 pb-2 mb-3 text-center border-b-2 border-slate-900">
          {lang === 'marathi' && (
            <div className="text-[11px] font-bold text-slate-600 mb-0.5 tracking-wider font-serif">
              ॥ श्री गणेशाय नमः ॥
            </div>
          )}

          <h1 className="text-xl font-black text-slate-950 tracking-tight leading-tight uppercase">
            {lang === 'marathi' ? businessNameMr : businessName}
          </h1>
          <h2 className="text-xs font-bold text-slate-700 tracking-widest uppercase mt-0.5">
            {lang === 'marathi' ? businessName : businessNameMr}
          </h2>
          
          <p className="text-[10.5px] font-semibold text-slate-800 mt-0.5">
            {lang === 'marathi'
              ? 'सेंट्रिंग प्लेट्स व सर्व प्रकारचे बांधकाम साहित्य भाड्याने मिळण्याचे विश्वसनीय ठिकाण'
              : 'Reliable Center for Rental of Shuttering Centering Plates and Scaffolding Material'}
          </p>
          <div className="text-[10px] text-slate-600 mt-1 flex justify-center items-center gap-3">
            <span>📍 {address}</span>
            <span>|</span>
            <span>📞 {phones}</span>
          </div>

          {/* Official Report Title Banner */}
          <div className="mt-2.5 bg-slate-900 text-white py-1.5 px-4 flex justify-between items-center text-xs font-bold tracking-wide">
            <span className="uppercase">{getReportHeaderTitle()}</span>
            <span className="text-[10px] font-mono font-normal">
              {lang === 'marathi' ? 'अहवाल दिनांक:' : 'Statement Date:'} {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </span>
          </div>

          {/* Customer & Parameters Metadata Box */}
          <div className="border border-slate-800 bg-slate-50/50 p-2 text-[10px] grid grid-cols-3 gap-2 text-left mt-2">
            <div>
              <span className="text-slate-500 font-bold block text-[8.5px] uppercase">
                {lang === 'marathi' ? 'ग्राहक:' : 'Customer Party:'}
              </span>
              <span className="font-bold text-slate-900">
                {activeHistoryRental
                  ? `${activeHistoryRental.partyName} (Bill #${activeHistoryRental.billNumber || 1})`
                  : selectedParty
                  ? `${selectedParty.name} ${selectedParty.mobile ? `(${selectedParty.mobile})` : ''}`
                  : curT.allParties}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-bold block text-[8.5px] uppercase">
                {lang === 'marathi' ? 'कालावधी:' : 'Period:'}
              </span>
              <span className="font-semibold text-slate-900">
                {fromDate || toDate
                  ? `${formatDate(fromDate) || (lang === 'marathi' ? 'सुरुवात' : 'Start')} - ${formatDate(toDate) || (lang === 'marathi' ? 'आजपर्यंत' : 'Today')}`
                  : (lang === 'marathi' ? 'सर्व नोंदी' : 'All Records')}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-bold block text-[8.5px] uppercase">
                {lang === 'marathi' ? 'तपशील:' : 'Details:'}
              </span>
              <span className="font-semibold text-slate-900">
                {activeHistoryRental
                  ? (lang === 'marathi' ? `नोंद दिनांक: ${formatDate(activeHistoryRental.issueDate)}` : `Issue Date: ${formatDate(activeHistoryRental.issueDate)}`)
                  : reportType === 'all'
                  ? (lang === 'marathi' ? `४ विभाग • एकूण नोंदी: ${totalRecordsCount}` : `4 Sections • Total: ${totalRecordsCount}`)
                  : `${selectedPlateType ? `${selectedPlateType} • ` : `${curT.allSizes} • `}${curT.totalRecords} ${totalRecordsCount}`}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SCREEN-ONLY PREVIEW HEADER (Hidden during Print)          */}
        {/* ========================================================= */}
        <div className="no-print px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h4 className="text-sm font-bold text-charcoal uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <span>{getReportHeaderTitle()} {curT.previewHeading}</span>
              <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-mono normal-case">
                A4 {pageOrientation === 'portrait' ? curT.portrait : curT.landscape}
              </span>
            </h4>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              {activeHistoryRental ? (
                <>
                  {isMr ? 'बिल क्रमांक' : 'Bill No'} <strong className="text-primary font-mono font-bold">#{activeHistoryRental.billNumber || 1}</strong>
                  {' • '}{isMr ? 'ग्राहक:' : 'Customer:'} <strong className="text-slate-800">{activeHistoryRental.partyName}</strong>
                </>
              ) : (
                <>
                  {totalRecordsCount} {curT.recordsFound} • {curT.selectedCustomer} <span className="font-bold text-slate-800">{selectedPartyName}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* ========================================================= */}
        {/* MASTER SUMMARY KPI DASHBOARD (Shown when 'all' selected & no single bill) */}
        {/* ========================================================= */}
        {reportType === 'all' && !activeHistoryRental && (
          <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50/50 print:p-2 print:bg-white print:border-b-2 print:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>
                <span>{curT.masterSummary}</span>
              </h5>
              <span className="text-[11px] text-slate-500 font-medium">
                {curT.totalRecords} <strong className="text-slate-900">{totalRecordsCount}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
              {/* KPI 1: Rentals */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs print:border print:border-slate-800 print:rounded-none">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">{curT.totalBilled}</span>
                <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5 font-mono">
                  ₹{totalRentBilled.toLocaleString('en-IN')}
                </div>
                <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                  {filteredRentals.length} {lang === 'marathi' ? 'नोंदी' : 'Agreements'} • {lang === 'marathi' ? 'जमा' : 'Paid'}: ₹{totalRentPaid.toLocaleString('en-IN')}
                </span>
              </div>

              {/* KPI 2: Stock */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs print:border print:border-slate-800 print:rounded-none">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">{curT.activePlatesWithParties}</span>
                <div className="text-base sm:text-lg font-black text-amber-600 mt-0.5 font-mono">
                  {activePlatesInField.toLocaleString('en-IN')}
                </div>
                <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                  {totalDispatchedQty} {lang === 'marathi' ? 'वाटप' : 'Dispatched'} • {totalReturnedQty} {lang === 'marathi' ? 'जमा' : 'Returned'}
                </span>
              </div>

              {/* KPI 3: Payments */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs print:border print:border-slate-800 print:rounded-none">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">{curT.totalPaid}</span>
                <div className="text-base sm:text-lg font-black text-emerald-600 mt-0.5 font-mono">
                  ₹{totalPaymentsReceived.toLocaleString('en-IN')}
                </div>
                <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                  {filteredPayments.length} {lang === 'marathi' ? 'जमा पावत्या' : 'Receipts'}
                </span>
              </div>

              {/* KPI 4: Outstanding */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs print:border print:border-slate-800 print:rounded-none">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">{curT.netDue}</span>
                <div className="text-base sm:text-lg font-black text-rose-600 mt-0.5 font-mono">
                  ₹{totalOutstandingDue.toLocaleString('en-IN')}
                </div>
                <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                  {filteredOutstanding.length} {lang === 'marathi' ? 'थकबाकीदार' : 'Dues Pending'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* REPORT DATA TABLES (Formatted for both screen & A4 print)  */}
        {/* ========================================================= */}
        <div className="p-4 sm:p-6 space-y-6 print:p-4 print:space-y-4">
          {/* BILL-WISE HISTORY MODE */}
          {reportType === 'bill_history' && (
            activeHistoryRental
              ? renderBillHistorySection(activeHistoryRental)
              : renderBillDirectorySection(filteredRentals)
          )}

          {/* ALL REPORTS: If a single bill is searched, show that bill history, otherwise show the 4 master sections */}
          {reportType === 'all' && (
            activeHistoryRental && searchBillNumber.trim() ? (
              renderBillHistorySection(activeHistoryRental)
            ) : (
              <>
                {renderRentalsSection(filteredRentals, curT.sectionRentals)}
                {renderReturnsSection(filteredReturns, curT.sectionReturns)}
                {renderPaymentsSection(filteredPayments, curT.sectionPayments)}
                {renderOutstandingSection(filteredOutstanding, curT.sectionOutstanding)}
              </>
            )
          )}

          {/* INDIVIDUAL REPORTS */}
          {reportType === 'rental' && (
            activeHistoryRental && searchBillNumber.trim()
              ? renderBillHistorySection(activeHistoryRental)
              : renderRentalsSection(filteredRentals)
          )}
          {reportType === 'return' && renderReturnsSection(filteredReturns)}
          {reportType === 'payment' && renderPaymentsSection(filteredPayments)}
          {reportType === 'outstanding' && renderOutstandingSection(filteredOutstanding)}
        </div>

        {/* ========================================================= */}
        {/* PRINT-ONLY FORMAL FOOTER & SIGNATURES (Visible on A4 Print) */}
        {/* ========================================================= */}
        <div className="hidden print:block p-4 pt-4 mt-4 border-t border-slate-400 text-xs print-avoid-break">
          <div className="text-[9.5px] text-slate-600 mb-6 italic">
            {lang === 'marathi'
              ? 'टीप: हा संगणकीकृत अधिकृत अहवाल आहे. कृपया सर्व नोंदी व हिशोब तपासून घ्यावेत. काही तफावत आढळल्यास त्वरित कार्यालयात संपर्क साधावा.'
              : 'Note: This is a computer-generated official statement. Please verify all entries and balances. In case of any discrepancies, please contact the office immediately.'}
          </div>

          <div className="flex justify-between items-end px-6">
            <div className="text-center">
              <div className="w-48 border-b border-slate-900 pb-1 mb-1 font-bold text-slate-900">
                {lang === 'marathi' ? 'हिशोब तपासनीस' : 'Prepared By'}
              </div>
              <p className="text-[9.5px] text-slate-500">
                {lang === 'marathi' ? 'स्वाक्षरी व तारीख' : 'Signature & Date'}
              </p>
            </div>

            <div className="text-center">
              <div className="w-56 border-b border-slate-900 pb-1 mb-1 font-bold text-slate-900">
                {lang === 'marathi' ? businessNameMr : businessName}
              </div>
              <p className="text-[9.5px] text-slate-500">
                {lang === 'marathi' ? 'अधिकृत स्वाक्षरी' : 'Authorized Signatory'}
              </p>
            </div>
          </div>

          <div className="mt-6 pt-2 border-t border-dotted border-slate-300 flex justify-between text-[9px] text-slate-400 font-mono">
            <span>Anand Plates Management System • Solapur Road</span>
            <span>{lang === 'marathi' ? 'मुद्रित दिनांक व वेळ:' : 'Printed on:'} {new Date().toLocaleString('en-IN')}</span>
            <span>A4 ({pageOrientation})</span>
          </div>
        </div>
      </div>
    </div>
  );
};
