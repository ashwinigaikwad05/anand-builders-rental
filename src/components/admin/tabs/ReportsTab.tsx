import React, { useState, useEffect } from 'react';
import { FileText, Printer, Download, RefreshCw, Layout, Layers, ArrowDownLeft, ArrowUpRight, DollarSign, Users } from 'lucide-react';
import type { Party, PlateStock, Rental, ReturnLog, Payment } from '../../../data/adminMockData';
import { getStoredAppLanguage, t, type AppLanguage } from '../../../utils/appTranslations';

export type ReportType = 'all' | 'rental' | 'return' | 'payment' | 'outstanding';

interface ReportsTabProps {
  parties: Party[];
  plates: PlateStock[];
  rentals: Rental[];
  returns: ReturnLog[];
  payments: Payment[];
  appLanguage?: AppLanguage;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({
  parties,
  plates,
  rentals,
  returns,
  payments,
  appLanguage: propLanguage,
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

  // Capitalize name helper
  const formatName = (name?: string) => {
    if (!name) return '';
    return name
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  // Filtered sub-datasets based on parameters
  const filteredRentals = rentals.filter((r) => {
    if (selectedPartyId && r.partyId !== selectedPartyId) return false;
    if (selectedPlateType && r.plateType !== selectedPlateType) return false;
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
        ? ['अ.क्र.', 'नोंद दिनांक', 'ग्राहकाचे नाव', 'प्लेट साईझ', 'नग', 'एकूण भाडे (₹)', 'जमा रक्कम (₹)', 'बाकी रक्कम (₹)']
        : ['Sr No', 'Issue Date', 'Customer Name', 'Plate Size', 'Quantity', 'Total Rent (Rs)', 'Paid Amount (Rs)', 'Balance Due (Rs)'];
      lines.push(rentalHeaders.join(','));
      filteredRentals.forEach((r, idx) => {
        lines.push([
          String(idx + 1),
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

    let headers: string[] = [];
    let rows: string[][] = [];

    if (reportType === 'rental') {
      headers = isMr
        ? ['अ.क्र.', 'नोंद दिनांक', 'ग्राहकाचे नाव', 'प्लेट साईझ', 'नग', 'एकूण भाडे (₹)', 'जमा रक्कम (₹)', 'बाकी रक्कम (₹)']
        : ['Sr No', 'Issue Date', 'Customer Name', 'Plate Size', 'Quantity', 'Total Rent (Rs)', 'Paid Amount (Rs)', 'Balance Due (Rs)'];
      rows = filteredRentals.map((r, idx) => [
        String(idx + 1),
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
                <td colSpan={8} className="p-4 text-center text-slate-400 italic text-xs">
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
                <td className="px-3 py-2.5 text-right font-mono font-black">{totalQty.toLocaleString('en-IN')}</td>
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
    const totalRemaining = items.reduce((sum, r) => sum + Number(r.remainingQuantity || 0), 0);

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
              <th className="px-4 py-2.5">{curT.headers.partyName}</th>
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
                  <td className="px-4 py-2 text-slate-700 font-mono">{r.plateType}</td>
                  <td className="px-4 py-2 text-emerald-600 font-bold text-right font-mono">+{r.returnedQuantity}</td>
                  <td className="px-4 py-2 text-slate-600 text-right font-mono">{r.remainingQuantity}</td>
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
                <td className="px-4 py-2.5 text-right text-emerald-700 font-mono font-black">+{totalReturned.toLocaleString('en-IN')}</td>
                <td className="px-4 py-2.5 text-right text-slate-800 font-mono font-black">{totalRemaining.toLocaleString('en-IN')}</td>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Report Type */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">{curT.reportType}</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:outline-none px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer text-slate-900"
            >
              <option value="all">{curT.types.all}</option>
              <option value="rental">{curT.types.rental}</option>
              <option value="return">{curT.types.return}</option>
              <option value="payment">{curT.types.payment}</option>
              <option value="outstanding">{curT.types.outstanding}</option>
            </select>
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
                {selectedParty ? `${selectedParty.name} ${selectedParty.mobile ? `(${selectedParty.mobile})` : ''}` : curT.allParties}
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
                {reportType === 'all'
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
              {totalRecordsCount} {curT.recordsFound} • {curT.selectedCustomer} <span className="font-bold text-slate-800">{selectedPartyName}</span>
            </p>
          </div>
        </div>

        {/* ========================================================= */}
        {/* MASTER SUMMARY KPI DASHBOARD (Shown when 'all' selected)  */}
        {/* ========================================================= */}
        {reportType === 'all' && (
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
          {/* ALL REPORTS: Render all 4 sections in order */}
          {reportType === 'all' && (
            <>
              {renderRentalsSection(filteredRentals, curT.sectionRentals)}
              {renderReturnsSection(filteredReturns, curT.sectionReturns)}
              {renderPaymentsSection(filteredPayments, curT.sectionPayments)}
              {renderOutstandingSection(filteredOutstanding, curT.sectionOutstanding)}
            </>
          )}

          {/* INDIVIDUAL REPORTS */}
          {reportType === 'rental' && renderRentalsSection(filteredRentals)}
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
