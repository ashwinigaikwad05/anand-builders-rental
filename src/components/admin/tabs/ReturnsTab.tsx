import React, { useState } from 'react';
import { Plus, Search, RefreshCw, X, Check, Info, IndianRupee, Wallet, Calculator, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import type { Party, Rental, ReturnLog, RentalCycle } from '../../../data/adminMockData';
import {
  calculateCalendarDays,
  calculateCycleFinances,
  calculatePartialReturnsBreakdown,
  type PartialReturnsBreakdownResult,
} from '../../../lib/supabase';
import { getStoredAppLanguage, type AppLanguage } from '../../../utils/appTranslations';
import { formatMarathiDate, formatDateRange, getMarathiPaymentMode, formatPartyName, formatPlateType } from '../../../utils/marathiUtils';
import { useAccountNames } from '../../../utils/paymentAccountUtils';

export interface ReturnInputPayload extends Omit<ReturnLog, 'id' | 'partyName' | 'plateType' | 'issuedQuantity'> {
  collectedAmount?: number;
  refundAmount?: number;
  paymentMode?: 'Cash' | 'Account 1' | 'Account 2';
  paymentReference?: string;
  paymentNotes?: string;
  penaltyAmount?: number;
  daysKept?: number;
  batchRent?: number;
}

interface ReturnsTabProps {
  returns: ReturnLog[];
  rentals: Rental[];
  parties: Party[];
  rentalCycles?: RentalCycle[];
  onAddReturn: (newReturn: ReturnInputPayload) => void;
  preselectedRentalId?: string | null;
  onClearPreselectedRental?: () => void;
  appLanguage?: AppLanguage;
}

export const ReturnsTab: React.FC<ReturnsTabProps> = ({
  returns,
  rentals,
  parties,
  rentalCycles = [],
  onAddReturn,
  preselectedRentalId,
  onClearPreselectedRental,
  appLanguage,
}) => {
  const isMarathi = (appLanguage || getStoredAppLanguage()) === 'marathi';
  const accountNames = useAccountNames();
  const todayStr = new Date().toISOString().split('T')[0];
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isConfirmReturnOpen, setIsConfirmReturnOpen] = useState(false);

  // Form states
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [selectedRentalId, setSelectedRentalId] = useState('');
  const [returnedQty, setReturnedQty] = useState<number>(0);
  const [returnDate, setReturnDate] = useState(todayStr);

  // Payment, Refund & Penalty collection states
  const [penaltyAmount, setPenaltyAmount] = useState<number>(0);
  const [collectedAmount, setCollectedAmount] = useState<number>(0);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [settlementAction, setSettlementAction] = useState<'collect' | 'refund' | 'none'>('none');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Account 1' | 'Account 2'>('Cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  const [validationError, setValidationError] = useState('');

  const getAlreadyReturned = (rental: Rental) => {
    return returns
      .filter((ret) => ret.rentalId === rental.id)
      .reduce((sum, ret) => sum + ret.returnedQuantity, 0);
  };

  const getRemainingToReturn = (rental: Rental) => {
    const returnedSum = getAlreadyReturned(rental);
    return Math.max(0, rental.quantity - returnedSum);
  };

  const getActiveCycle = (rental: Rental): RentalCycle | null => {
    const list = rentalCycles.filter((c) => c.rentalId === rental.id);
    if (list.length > 0) {
      return list.find((c) => c.status === 'active') || list[list.length - 1];
    }
    return null;
  };

  // Helper to get ALL cycles for a rental
  const getAllCyclesForRental = (rental: Rental): RentalCycle[] => {
    const list = rentalCycles.filter((c) => c.rentalId === rental.id);
    if (list.length > 0) return [...list].sort((a, b) => a.cycleNumber - b.cycleNumber);
    if (rental.cycles && rental.cycles.length > 0) return [...rental.cycles].sort((a, b) => a.cycleNumber - b.cycleNumber);
    return [];
  };

  // Helper to compute live pending balance for a rental (ALL cycles)
  const computeRentalPendingDue = (rental: Rental, date = returnDate) => {
    const allCycs = getAllCyclesForRental(rental);
    if (allCycs.length > 0) {
      let totalAmount = 0;
      let totalPaid = 0;
      for (const cyc of allCycs) {
        if (cyc.status === 'active') {
          const finances = calculateCycleFinances(
            {
              startDate: cyc.startDate,
              actualEndDate: date,
              quantity: cyc.quantity,
              dailyRate: cyc.dailyRate,
              baseRent: cyc.baseRent,
              paidAmount: cyc.paidAmount,
              items: rental.items,
            },
            date
          );
          totalAmount += finances.totalAmount;
        } else {
          totalAmount += cyc.totalAmount;
        }
        totalPaid += cyc.paidAmount;
      }
      return Math.max(0, totalAmount - totalPaid);
    }
    return rental.pending;
  };

  // Handle preselected rental from other tabs
  React.useEffect(() => {
    if (preselectedRentalId) {
      const targetRental = rentals.find((r) => r.id === preselectedRentalId);
      if (targetRental) {
        const remaining = getRemainingToReturn(targetRental);
        const due = computeRentalPendingDue(targetRental, todayStr);

        setSelectedPartyId(targetRental.partyId);
        setSelectedRentalId(targetRental.id);
        setReturnedQty(remaining);
        setReturnDate(todayStr);
        setCollectedAmount(due);
        setPaymentMode('Cash');
        setPaymentReference('');
        setPaymentNotes('');
        setValidationError('');
        setIsAddOpen(true);
      }
      if (onClearPreselectedRental) {
        onClearPreselectedRental();
      }
    }
  }, [preselectedRentalId, rentals, returns, onClearPreselectedRental, todayStr]);

  const filteredReturns = returns.filter((r) =>
    r.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    formatPartyName(r.partyName, 'marathi').toLowerCase().includes(searchTerm.toLowerCase()) ||
    formatPartyName(r.partyName, 'english').toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.plateType.includes(searchTerm)
  );

  const partyActiveRentals = rentals.filter(
    (r) => r.partyId === selectedPartyId && (r.status === 'active' || r.status === 'overdue')
  );

  const selectedRental = rentals.find((r) => r.id === selectedRentalId);
  const selectedParty = parties.find((p) => p.id === selectedPartyId);
  const selectedActiveCycle = selectedRental ? getActiveCycle(selectedRental) : null;

  const cycleElapsed = selectedActiveCycle
    ? calculateCalendarDays(selectedActiveCycle.startDate, returnDate)
    : selectedRental
    ? calculateCalendarDays(selectedRental.issueDate, returnDate)
    : 0;

  const cycleFinances = selectedActiveCycle && selectedRental
    ? calculateCycleFinances(
        {
          startDate: selectedActiveCycle.startDate,
          actualEndDate: returnDate,
          quantity: selectedActiveCycle.quantity,
          dailyRate: selectedActiveCycle.dailyRate,
          baseRent: selectedActiveCycle.baseRent,
          paidAmount: selectedActiveCycle.paidAmount,
          items: selectedRental.items,
        },
        returnDate
      )
    : null;

  // Compute ALL-CYCLES aggregated totals for the selected rental
  const allCyclesFinancials = (() => {
    if (!selectedRental) return { totalAmount: 0, paidAmount: 0, pendingAmount: 0 };
    const allCycs = getAllCyclesForRental(selectedRental);
    if (allCycs.length === 0) {
      // Fallback to rental-level data
      return {
        totalAmount: selectedRental.totalRent,
        paidAmount: selectedRental.paid,
        pendingAmount: selectedRental.pending,
      };
    }
    let totalAmount = 0;
    let totalPaid = 0;
    for (const cyc of allCycs) {
      if (cyc.status === 'active') {
        const fin = calculateCycleFinances(
          {
            startDate: cyc.startDate,
            actualEndDate: returnDate,
            quantity: cyc.quantity,
            dailyRate: cyc.dailyRate,
            baseRent: cyc.baseRent,
            paidAmount: cyc.paidAmount,
            items: selectedRental.items,
          },
          returnDate
        );
        totalAmount += fin.totalAmount;
      } else {
        totalAmount += cyc.totalAmount;
      }
      totalPaid += cyc.paidAmount;
    }
    return {
      totalAmount,
      paidAmount: totalPaid,
      pendingAmount: Math.max(0, totalAmount - totalPaid),
    };
  })();

  // Live breakdown of partial returns, continuous remaining plates, and advance refunds
  const partialBreakdown: PartialReturnsBreakdownResult | null = React.useMemo(() => {
    if (!selectedRental) return null;
    const rentalReturns = returns.filter((r) => r.rentalId === selectedRental.id);
    const startDate = selectedActiveCycle?.startDate || selectedRental.currentCycleStartDate || selectedRental.issueDate;
    const cycleDays = selectedActiveCycle?.days || selectedRental.days || 40;

    return calculatePartialReturnsBreakdown({
      startDate,
      initialQuantity: selectedRental.quantity,
      dailyRate: selectedRental.dailyRate,
      cycleDays,
      paidAmount: allCyclesFinancials.paidAmount,
      items: selectedRental.items,
      returns: rentalReturns,
      currentReturn: returnedQty > 0 ? {
        returnedQuantity: returnedQty,
        returnDate: returnDate,
        penaltyAmount: penaltyAmount,
      } : undefined,
      asOfDate: returnDate,
    });
  }, [selectedRental, selectedActiveCycle, returns, allCyclesFinancials.paidAmount, returnedQty, returnDate, penaltyAmount]);

  const currentBatch = partialBreakdown?.returnedBatches.find((b) => b.id === 'current-pending-return');
  const batchDays = currentBatch?.elapsedDays || (selectedRental ? Math.max(1, calculateCalendarDays(selectedActiveCycle?.startDate || selectedRental.issueDate, returnDate)) : 0);
  const batchRent = currentBatch?.rentAmount || (selectedRental ? Math.round((returnedQty || 0) * selectedRental.dailyRate * batchDays * 100) / 100 : 0);
  const remainingQtyAfterThis = partialBreakdown?.remainingQuantity ?? (selectedRental ? Math.max(0, getRemainingToReturn(selectedRental) - returnedQty) : 0);
  const remainingPlatesRent = partialBreakdown?.remainingPlatesRent ?? 0;
  const totalAgreementRent = partialBreakdown?.totalRent ?? allCyclesFinancials.totalAmount;
  const totalPaidAmount = allCyclesFinancials.paidAmount;
  const refundDueFromAdmin = partialBreakdown?.refundDue ?? 0;
  const pendingDueFromCustomer = partialBreakdown 
    ? partialBreakdown.pendingDue 
    : (allCyclesFinancials.pendingAmount + (penaltyAmount || 0));

  // Sync default settlement action and amount based on partialBreakdown
  React.useEffect(() => {
    if (refundDueFromAdmin > 0) {
      setSettlementAction('refund');
      setRefundAmount(refundDueFromAdmin);
      setCollectedAmount(0);
    } else if (pendingDueFromCustomer > 0) {
      setSettlementAction('collect');
      setCollectedAmount(pendingDueFromCustomer);
      setRefundAmount(0);
    } else {
      setSettlementAction('none');
      setCollectedAmount(0);
      setRefundAmount(0);
    }
  }, [selectedRentalId, returnedQty, returnDate, penaltyAmount, refundDueFromAdmin, pendingDueFromCustomer]);

  const balanceAfterReturn = settlementAction === 'refund'
    ? Math.max(0, refundDueFromAdmin - (refundAmount || 0))
    : Math.max(0, pendingDueFromCustomer - (collectedAmount || 0));

  const handleOpenAdd = () => {
    const firstParty = parties[0]?.id || '';
    setSelectedPartyId(firstParty);
    setSelectedRentalId('');
    setReturnedQty(0);
    setReturnDate(todayStr);
    setPenaltyAmount(0);
    setCollectedAmount(0);
    setRefundAmount(0);
    setSettlementAction('none');
    setPaymentMode('Cash');
    setPaymentReference('');
    setPaymentNotes('');
    setValidationError('');
    setIsAddOpen(true);
  };

  const handlePartyChange = (partyId: string) => {
    setSelectedPartyId(partyId);
    setSelectedRentalId('');
    setReturnedQty(0);
    setPenaltyAmount(0);
    setCollectedAmount(0);
    setRefundAmount(0);
    setSettlementAction('none');
  };

  const handleRentalChange = (rentalId: string) => {
    setSelectedRentalId(rentalId);
    const rental = rentals.find((r) => r.id === rentalId);
    if (rental) {
      const remaining = getRemainingToReturn(rental);
      setReturnedQty(remaining);
      setPenaltyAmount(0);
    } else {
      setReturnedQty(0);
      setPenaltyAmount(0);
      setCollectedAmount(0);
      setRefundAmount(0);
      setSettlementAction('none');
    }
  };

  const handleReturnAll = () => {
    if (selectedRental) {
      const remaining = getRemainingToReturn(selectedRental);
      setReturnedQty(remaining);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!selectedPartyId || !selectedRentalId) {
      setValidationError('Please select a customer party and active rental agreement.');
      return;
    }

    if (returnedQty <= 0) {
      setValidationError('Please enter a return quantity greater than 0.');
      return;
    }

    if (selectedRental) {
      const remainingLimit = getRemainingToReturn(selectedRental);
      if (returnedQty > remainingLimit) {
        setValidationError(`You can return maximum ${remainingLimit} plates.`);
        return;
      }

      // Prompt confirmation alert before recording return
      setIsConfirmReturnOpen(true);
    }
  };

  const handleExecuteReturn = () => {
    if (!selectedRental) return;
    const remainingLimit = getRemainingToReturn(selectedRental);

    onAddReturn({
      partyId: selectedPartyId,
      rentalId: selectedRentalId,
      returnedQuantity: returnedQty,
      remainingQuantity: remainingLimit - returnedQty,
      returnDate,
      collectedAmount: settlementAction === 'collect' && collectedAmount > 0 ? collectedAmount : 0,
      refundAmount: settlementAction === 'refund' && refundAmount > 0 ? refundAmount : 0,
      paymentMode: (settlementAction === 'collect' && collectedAmount > 0) || (settlementAction === 'refund' && refundAmount > 0) ? paymentMode : undefined,
      paymentReference: paymentReference.trim() || undefined,
      paymentNotes: (paymentNotes.trim() ? paymentNotes.trim() : (settlementAction === 'refund' ? `Advance excess refund returned to customer (${returnedQty} plates returned)` : `Material return settlement (${returnedQty} plates)`)) + (penaltyAmount > 0 ? ` (Incl. Penalty ₹${penaltyAmount})` : ''),
      penaltyAmount: penaltyAmount > 0 ? penaltyAmount : undefined,
      daysKept: batchDays,
      batchRent: batchRent,
    });

    setIsConfirmReturnOpen(false);
    setIsAddOpen(false);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Search and Trigger */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        {/* Search */}
        <div className="relative flex-grow max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isMarathi ? 'ग्राहक नाव किंवा साईझने शोधा...' : 'Search Returns by Party or Size...'}
            className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-primary focus:outline-none pl-11 pr-4 py-3 rounded-xl text-sm font-medium"
          />
        </div>

        {/* Trigger Button */}
        <button
          onClick={handleOpenAdd}
          className="bg-primary hover:bg-primary-dark text-white font-bold px-5 py-3 rounded-xl shadow-md hover:shadow-orange-500/10 flex items-center justify-center gap-2 text-sm cursor-pointer transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{isMarathi ? '+ साहित्य जमा नोंद' : 'New Return Intake'}</span>
        </button>
      </div>

      {/* Grid of Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Returned Logs Table (7 Columns) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <h4 className="text-sm font-bold text-charcoal">{isMarathi ? 'साहित्य जमा व हिशोब नोंदी' : 'Material Return & Settlement Logs'}</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                  <th className="px-5 py-4">{isMarathi ? 'जमा दिनांक' : 'Return Date'}</th>
                  <th className="px-5 py-4">{isMarathi ? 'ग्राहकाचे नाव' : 'Party Name'}</th>
                  <th className="px-4 py-4">{isMarathi ? 'माप' : 'Size'}</th>
                  <th className="px-4 py-4">{isMarathi ? 'जमा नग' : 'Returned'}</th>
                  <th className="px-4 py-4">{isMarathi ? 'शिल्लक' : 'Remaining'}</th>
                  <th className="px-5 py-4 text-right">{isMarathi ? 'जमा रक्कम' : 'Payment Collected'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-light">
                {filteredReturns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 text-slate-500 font-mono text-xs">{formatMarathiDate(ret.returnDate)}</td>
                    <td className="px-5 py-4 font-bold text-slate-800">{formatPartyName(ret.partyName, isMarathi ? 'marathi' : 'english')}</td>
                    <td className="px-4 py-4 font-mono text-slate-500 text-xs">{ret.plateType}</td>
                    <td className="px-4 py-4 font-bold text-emerald-600">
                      <div>+{ret.returnedQuantity}</div>
                      {ret.daysKept && ret.batchRent ? (
                        <div className="text-[10px] text-slate-400 font-mono font-normal">
                          ({ret.daysKept} {isMarathi ? 'दिवस' : 'd'}: ₹{ret.batchRent.toLocaleString('en-IN')})
                        </div>
                      ) : null}
                    </td>
                    <td className={`px-4 py-4 ${ret.remainingQuantity > 0 ? 'text-amber-600 font-bold' : 'text-slate-400 text-xs'}`}>
                      {ret.remainingQuantity > 0 ? (isMarathi ? `${ret.remainingQuantity} शिल्लक` : `${ret.remainingQuantity} left`) : (isMarathi ? 'पूर्ण जमा ✓' : 'Fully Cleaned')}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {ret.refundAmount && ret.refundAmount > 0 ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="inline-flex items-center gap-1 font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-lg text-xs">
                            <ArrowDownLeft className="w-3 h-3 text-blue-600" />
                            <span>{isMarathi ? 'परतावा ₹' : 'Refund ₹'}{ret.refundAmount.toLocaleString('en-IN')}</span>
                            <span className="text-[10px] text-blue-600 font-normal">({ret.paymentMode ? getMarathiPaymentMode(ret.paymentMode, isMarathi ? 'marathi' : 'english') : (isMarathi ? 'परतावा' : 'Refund')})</span>
                          </span>
                          <span className="text-[10px] font-bold text-blue-600">
                            {isMarathi ? 'ग्राहकाला रक्कम परत केली' : 'Refunded to Customer'}
                          </span>
                        </div>
                      ) : ret.collectedAmount && ret.collectedAmount > 0 ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-lg text-xs">
                            <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                            <span>₹{ret.collectedAmount.toLocaleString('en-IN')}</span>
                            <span className="text-[10px] text-emerald-600 font-normal">({ret.paymentMode ? getMarathiPaymentMode(ret.paymentMode, isMarathi ? 'marathi' : 'english') : (isMarathi ? 'जमा' : 'Paid')})</span>
                          </span>
                          {ret.penaltyAmount && ret.penaltyAmount > 0 ? (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                              {isMarathi ? 'दंड समावेश ₹' : 'Incl. Penalty ₹'}{ret.penaltyAmount.toLocaleString('en-IN')}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-slate-400 text-xs italic">{isMarathi ? 'क्रेडिट (₹०)' : 'Credit (₹0)'}</span>
                          {ret.penaltyAmount && ret.penaltyAmount > 0 ? (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                              {isMarathi ? 'दंड ₹' : 'Penalty ₹'}{ret.penaltyAmount.toLocaleString('en-IN')}
                            </span>
                          ) : null}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {returns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-400 font-light italic">
                      {isMarathi ? 'अद्याप कोणतीही वापसी नोंद झालेली नाही.' : 'No returns logged yet.'}
                    </td>
                  </tr>
                ) : filteredReturns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-400 font-light italic">
                      {isMarathi ? 'शोध निकालाशी जुळणारी कोणतीही वापसी नोंद सापडली नाही.' : 'No return logs found matching query.'}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Active Dispatches Pending Return (5 Columns) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <h4 className="text-sm font-bold text-charcoal">{isMarathi ? 'वापसी प्रलंबित असलेले करार' : 'Pending Return Allocations'}</h4>
          </div>
          <div className="divide-y divide-slate-100">
            {rentals.filter((r) => r.status === 'active' || r.status === 'overdue').length === 0 ? (
              <div className="p-6 text-center text-slate-400 font-light italic text-xs sm:text-sm">
                {isMarathi ? 'कोणतेही साहित्य वापसी प्रलंबित नाही.' : 'No active dispatches pending return.'}
              </div>
            ) : (
              rentals
                .filter((r) => r.status === 'active' || r.status === 'overdue')
                .map((rent) => {
                  const remaining = getRemainingToReturn(rent);
                  if (remaining <= 0) return null;
                  const cyc = getActiveCycle(rent);
                  const due = computeRentalPendingDue(rent, todayStr);
                  return (
                    <div key={rent.id} className="p-4 hover:bg-slate-50/50 transition-colors flex justify-between items-center text-left text-xs sm:text-sm">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-slate-800">{formatPartyName(rent.partyName, isMarathi ? 'marathi' : 'english')}</p>
                          {cyc && (
                            <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded font-bold">
                              {isMarathi ? 'सायकल' : 'Cyc'} {cyc.cycleNumber}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-500 text-xs font-mono">
                          {rent.plateType} • {remaining} {isMarathi ? 'प्लेट्स साईटवर शिल्लक' : 'plates on site'}
                        </p>
                        <p className="text-[11px] font-bold text-rose-600">
                          {isMarathi ? 'बाकी:' : 'Due:'} ₹{due.toLocaleString('en-IN')}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedPartyId(rent.partyId);
                          setSelectedRentalId(rent.id);
                          setReturnedQty(remaining);
                          setPenaltyAmount(0);
                          setCollectedAmount(due);
                          setReturnDate(todayStr);
                          setValidationError('');
                          setIsAddOpen(true);
                        }}
                        className="text-xs bg-orange-50 hover:bg-orange-100 text-primary border border-orange-200 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer"
                      >
                        {isMarathi ? 'साहित्य जमा घ्या' : 'Receive & Settle'}
                      </button>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>

      {/* Add Return Intake Dialog */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full overflow-hidden shadow-2xl animate-scaleUp text-left my-auto">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h4 className="text-base font-bold text-charcoal flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-primary" />
                <span>{isMarathi ? 'साहित्य जमा व हिशोब पूर्ण करा' : 'Receive Plates & Settle Amount'}</span>
              </h4>
              <button onClick={() => setIsAddOpen(false)} className="p-1 text-slate-400 hover:text-slate-800 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
              {validationError && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2">
                  <Info className="w-4 h-4" /> {validationError}
                </div>
              )}

              {/* Step 1: Customer Party */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">{isMarathi ? 'ग्राहक / पार्टी *' : 'Customer Party *'}</label>
                <select
                  value={selectedPartyId}
                  onChange={(e) => handlePartyChange(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 px-4 py-3 rounded-xl text-sm font-medium"
                >
                  <option value="">{isMarathi ? '-- पार्टी निवडा --' : '-- Choose Party --'}</option>
                  {parties.map((p) => (
                    <option key={p.id} value={p.id}>{formatPartyName(p.name, isMarathi ? 'marathi' : 'english')}</option>
                  ))}
                </select>
              </div>

              {/* Step 2: Choose active rental */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">{isMarathi ? 'सक्रिय भाडे करार *' : 'Active Rental Agreement *'}</label>
                <select
                  value={selectedRentalId}
                  onChange={(e) => handleRentalChange(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 px-4 py-3 rounded-xl text-sm font-medium"
                >
                  <option value="">{isMarathi ? '-- भाडे नोंद निवडा --' : '-- Choose Dispatch Record --'}</option>
                  {partyActiveRentals.map((r) => {
                    const remaining = getRemainingToReturn(r);
                    const cyc = getActiveCycle(r);
                    return (
                      <option key={r.id} value={r.id}>
                        {formatPlateType(r.plateType, isMarathi ? 'marathi' : 'english')} {cyc ? `[${isMarathi ? 'सायकल' : 'Cycle'} ${cyc.cycleNumber}]` : ''} ({isMarathi ? 'दिलेले:' : 'Issued:'} {r.quantity} • {isMarathi ? 'शिल्लक:' : 'Remaining:'} {remaining} {isMarathi ? 'नग' : 'plates'})
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedRental && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">{isMarathi ? 'दिलेले एकूण साहित्य:' : 'Issued Quantity:'}</span>
                    <span className="font-bold text-slate-800">{selectedRental.quantity} {isMarathi ? 'प्लेट्स' : 'plates'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">{isMarathi ? 'यापूर्वी जमा केलेले:' : 'Already Returned:'}</span>
                    <span className="font-semibold text-slate-600">{getAlreadyReturned(selectedRental)} {isMarathi ? 'प्लेट्स' : 'plates'}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span className="text-slate-700 font-bold">{isMarathi ? 'साईटवर शिल्लक:' : 'Remaining on Site:'}</span>
                    <span className="font-black text-orange-600 text-sm">
                      {getRemainingToReturn(selectedRental)} {isMarathi ? 'प्लेट्स' : 'plates'}
                    </span>
                  </div>

                  {/* Active Cycle Duration & Extra Days Breakdown */}
                  {selectedActiveCycle && cycleFinances && (
                    <div className="pt-2 border-t border-slate-200 space-y-1 bg-white/70 p-2.5 rounded-xl">
                      <div className="flex justify-between text-slate-700">
                        <span className="font-semibold">{isMarathi ? 'चालू सायकल' : 'Active Cycle'} #{selectedActiveCycle.cycleNumber}:</span>
                        <span className="font-mono text-[11px]">{formatDateRange(selectedActiveCycle.startDate, selectedActiveCycle.expectedEndDate)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>{isMarathi ? 'वापरलेले दिवस:' : 'Elapsed on Return:'}</span>
                        <span className="font-bold text-slate-800">{cycleElapsed} {isMarathi ? 'दिवस' : 'Days'} ({cycleFinances.standardDays} {isMarathi ? 'नियमित' : 'Std'} + {cycleFinances.extraDays} {isMarathi ? 'अतिरिक्त' : 'Extra'})</span>
                      </div>
                      {cycleFinances.extraDays > 0 && (
                        <div className="flex justify-between text-amber-800 font-bold">
                          <span>{isMarathi ? 'वापसी अतिरिक्त आकार:' : 'Extra Charges for Return:'}</span>
                          <span>+₹{cycleFinances.extraAmount.toLocaleString('en-IN')} ({cycleFinances.extraDays} {isMarathi ? 'दिवस जादा' : 'days past 40d'})</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Quantities and Date with Return All button */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-500 uppercase">
                      {isMarathi ? 'वापसी संख्या (नग) *' : 'Return Qty (Plates) *'}
                    </label>
                    {selectedRental && (
                      <button
                        type="button"
                        onClick={handleReturnAll}
                        className="text-[11px] text-primary font-bold hover:text-primary-dark cursor-pointer"
                      >
                        {isMarathi ? 'सर्व (' : 'All ('}{getRemainingToReturn(selectedRental)})
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    min="1"
                    required
                    value={returnedQty || ''}
                    onChange={(e) => setReturnedQty(Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="e.g. 100"
                    className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">{isMarathi ? 'वापसी दिनांक *' : 'Return Date *'}</label>
                  <input
                    type="date"
                    required
                    value={returnDate}
                    onChange={(e) => {
                      setReturnDate(e.target.value);
                      if (selectedRental) {
                        const due = computeRentalPendingDue(selectedRental, e.target.value);
                        setCollectedAmount(due);
                      }
                    }}
                    className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-800"
                  />
                </div>
              </div>

              {/* Dynamic Partial Return & Continuing Calculation Card */}
              {selectedRental && returnedQty > 0 && (
                <div className="bg-gradient-to-br from-blue-50/90 to-indigo-50/90 border border-blue-200 p-4 rounded-2xl space-y-2.5 text-xs shadow-2xs">
                  <div className="flex justify-between items-center pb-2 border-b border-blue-200/80">
                    <span className="font-bold text-blue-950 flex items-center gap-1.5 text-xs">
                      <Calculator className="w-4 h-4 text-blue-600" />
                      {isMarathi ? 'साहित्य जमा व उर्वरित भाडे हिशोब' : 'Partial Return & Continuous Rent Calculation'}
                    </span>
                    <span className="text-[11px] font-mono bg-blue-100/90 text-blue-900 border border-blue-200 px-2 py-0.5 rounded-lg font-bold">
                      {batchDays} {isMarathi ? 'दिवस वापर' : 'Days Used'}
                    </span>
                  </div>

                  {/* Batch Calculation */}
                  <div className="flex justify-between items-center text-slate-700">
                    <span>
                      {isMarathi ? 'ह्या वेळी जमा नग भाडे आकार:' : 'This Return Batch Rent:'}{' '}
                      <span className="font-semibold text-slate-900 font-mono">({returnedQty} {isMarathi ? 'प्लेट्स' : 'plates'} × {batchDays} {isMarathi ? 'दिवस' : 'days'} @ ₹{selectedRental.dailyRate}/{isMarathi ? 'दिवस' : 'd'})</span>
                    </span>
                    <span className="font-bold font-mono text-blue-900 text-sm">
                      ₹{batchRent.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Remaining Plates Ongoing */}
                  <div className="flex justify-between items-center text-slate-700">
                    <span>
                      {isMarathi ? 'उर्वरित चालू साहित्य भाडे (४० दिवस):' : 'Remaining Plates Ongoing (40-day cycle):'}{' '}
                      <span className="font-semibold text-slate-900 font-mono">({remainingQtyAfterThis} {isMarathi ? 'प्लेट्स' : 'plates'})</span>
                    </span>
                    <span className="font-bold font-mono text-slate-800 text-sm">
                      ₹{remainingPlatesRent.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Summary Totals */}
                  <div className="pt-2 border-t border-blue-200/70 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/80 p-2 rounded-xl border border-blue-100">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">
                        {isMarathi ? 'सुधारित एकूण भाडे' : 'Calculated Total Rent'}
                      </span>
                      <span className="font-bold font-mono text-slate-900 text-sm">
                        ₹{totalAgreementRent.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="bg-white/80 p-2 rounded-xl border border-blue-100">
                      <span className="text-[10px] text-emerald-600 font-bold uppercase block">
                        {isMarathi ? 'जमा ॲडव्हान्स' : 'Paid Advance'}
                      </span>
                      <span className="font-bold font-mono text-emerald-800 text-sm">
                        ₹{totalPaidAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Settle Rent & Refund or Payment Collection */}
              {selectedRental && (
                <div className="space-y-3.5">
                  {refundDueFromAdmin > 0 ? (
                    /* CASE A: ADMIN REFUNDS EXCESS ADVANCE TO CUSTOMER */
                    <div className="bg-blue-50/80 border border-blue-300/80 rounded-2xl p-4 space-y-3.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 border-b border-blue-200 gap-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-2xs">
                            <ArrowDownLeft className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-blue-950 uppercase tracking-wider block">
                              {isMarathi ? 'ग्राहकाला ॲडव्हान्स मधून रक्कम परत करा' : 'Refund Excess Advance to Customer'}
                            </span>
                            <span className="text-[10px] text-blue-700 font-medium">
                              {isMarathi
                                ? `जमा ॲडव्हान्स (₹${totalPaidAmount.toLocaleString('en-IN')}) एकूण भाड्यापेक्षा जास्त आहे. ग्राहकाला ₹${refundDueFromAdmin.toLocaleString('en-IN')} परत द्यायचे आहेत.`
                                : `Advance paid (₹${totalPaidAmount.toLocaleString('en-IN')}) exceeds total rent (₹${totalAgreementRent.toLocaleString('en-IN')}). Refund ₹${refundDueFromAdmin.toLocaleString('en-IN')} to customer.`}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-black text-blue-900 bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-300 font-mono self-start sm:self-center">
                          {isMarathi ? 'परतावा देय:' : 'Refund Due:'} ₹{refundDueFromAdmin.toLocaleString('en-IN')}
                        </span>
                      </div>

                      {/* Refund Amount Input and Quick Actions */}
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between items-center">
                          <label className="font-bold text-slate-700 uppercase text-[11px]">
                            {isMarathi ? 'ग्राहकाला आता परत करावयाची रक्कम (₹)' : 'Refund Amount Paid to Customer (₹)'}
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSettlementAction('refund');
                                setRefundAmount(refundDueFromAdmin);
                              }}
                              className="text-[10px] bg-blue-600 hover:bg-blue-700 text-white font-bold px-2.5 py-0.5 rounded cursor-pointer transition-all shadow-2xs"
                            >
                              {isMarathi ? `पूर्ण परत करा (₹${refundDueFromAdmin.toLocaleString('en-IN')})` : `Full Refund (₹${refundDueFromAdmin.toLocaleString('en-IN')})`}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSettlementAction('none');
                                setRefundAmount(0);
                              }}
                              className="text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-2 py-0.5 rounded cursor-pointer transition-all"
                            >
                              {isMarathi ? '₹0 (खात्यावर क्रेडिट ठेवा)' : '₹0 (Hold as Credit)'}
                            </button>
                          </div>
                        </div>

                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-700">
                            <IndianRupee className="w-4 h-4 text-blue-700" />
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={refundAmount || ''}
                            onChange={(e) => {
                              const val = Math.max(0, parseFloat(e.target.value) || 0);
                              setRefundAmount(val);
                              setSettlementAction(val > 0 ? 'refund' : 'none');
                            }}
                            placeholder="0"
                            className="w-full bg-white border border-blue-300 focus:border-blue-600 focus:outline-none pl-9 pr-4 py-2.5 rounded-xl text-sm font-bold text-slate-900"
                          />
                        </div>
                      </div>

                      {/* Payment Mode for Refund */}
                      {refundAmount > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                          <div className="space-y-1">
                            <label className="font-bold text-slate-600 uppercase text-[10px]">
                              {isMarathi ? 'परत देण्याची पद्धत' : 'Refund Payment Mode'}
                            </label>
                            <select
                              value={paymentMode}
                              onChange={(e) => setPaymentMode(e.target.value as any)}
                              className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl font-semibold text-slate-800"
                            >
                              <option value="Cash">{accountNames.cleanCash}</option>
                              <option value="Account 1">{accountNames.cleanAccount1}</option>
                              <option value="Account 2">{accountNames.cleanAccount2}</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="font-bold text-slate-600 uppercase text-[10px]">
                              {isMarathi ? 'संदर्भ / व्हाऊचर क्र.' : 'Reference / Payout Note'}
                            </label>
                            <input
                              type="text"
                              value={paymentReference}
                              onChange={(e) => setPaymentReference(e.target.value)}
                              placeholder={isMarathi ? 'उदा. साहित्य जमा झाल्यावर आगाऊ परतावा' : 'e.g. Advance refund on return'}
                              className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs"
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between items-center text-xs font-bold pt-2 border-t border-blue-200 text-slate-700">
                        <span>{isMarathi ? 'परत केल्यावर उर्वरित क्रेडिट:' : 'Excess Advance Remaining After Refund:'}</span>
                        <span className={balanceAfterReturn === 0 ? 'text-emerald-700 font-black' : 'text-blue-700 font-black'}>
                          ₹{balanceAfterReturn.toLocaleString('en-IN')}{' '}
                          {balanceAfterReturn === 0 ? (isMarathi ? '(पूर्ण हिशोब नील ✓)' : '(Fully Settled ✓)') : (isMarathi ? '(लेजर क्रेडिट शिल्लक)' : '(Credit Balance Kept)')}
                        </span>
                      </div>
                    </div>
                  ) : pendingDueFromCustomer > 0 ? (
                    /* CASE B: CUSTOMER OWES PENDING BALANCE TO ADMIN */
                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-3.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 border-b border-emerald-200/80 gap-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                            <Wallet className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider block">
                              {isMarathi ? 'हिशोब व बाकी रक्कम जमा करा' : 'Collect Dues on Return'}
                            </span>
                            <span className="text-[10px] text-emerald-700 font-medium">
                              {isMarathi
                                ? '(ऐच्छिक: भाडे बाकी जमा करा, दंड आकारणी जोडा किंवा पेमेंट नोंदवा)'
                                : '(Optional: Settle rental dues, add penalty fee, or collect payment)'}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-black text-emerald-900 bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-300 font-mono self-start sm:self-center">
                          {isMarathi ? 'एकूण देय:' : 'Total Payable:'} ₹{pendingDueFromCustomer.toLocaleString('en-IN')}
                        </span>
                      </div>

                      {/* Boxes Breakdown */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                        <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase block truncate">
                              {isMarathi ? 'एकूण भाडे' : 'Total Rent'}
                            </span>
                            <span className="text-[9px] text-slate-400 block truncate">{isMarathi ? 'हिशोबानुसार' : 'Calculated'}</span>
                          </div>
                          <span className="font-mono text-sm sm:text-base font-black text-slate-800 mt-1">
                            ₹{totalAgreementRent.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase block truncate">
                              {isMarathi ? 'शिल्लक भाडे' : 'Pending Rent'}
                            </span>
                            <span className="text-[9px] text-emerald-600 font-medium block truncate">
                              {isMarathi ? 'जमा:' : 'Paid:'} ₹{totalPaidAmount.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <span className="font-mono text-sm sm:text-base font-black text-rose-600 mt-1">
                            ₹{(partialBreakdown?.pendingDue ?? 0).toLocaleString('en-IN')}
                          </span>
                        </div>

                        {/* Penalty Box */}
                        <div className="bg-amber-50/90 p-2.5 rounded-xl border border-amber-200/90 shadow-2xs flex flex-col justify-between ring-1 ring-amber-300/60">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-amber-900 font-extrabold uppercase block">
                              {isMarathi ? 'दंड आकारणी (₹)' : 'Damage / Penalty (₹)'}
                            </span>
                            {penaltyAmount > 0 && (
                              <button
                                type="button"
                                onClick={() => setPenaltyAmount(0)}
                                className="text-[9px] text-amber-700 hover:text-amber-950 font-bold underline cursor-pointer"
                              >
                                {isMarathi ? 'हटवा' : 'Clear'}
                              </button>
                            )}
                          </div>
                          <div className="relative mt-1">
                            <span className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-amber-700 font-bold text-xs">
                              ₹
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={penaltyAmount || ''}
                              onChange={(e) => setPenaltyAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                              placeholder="0"
                              className="w-full bg-white border border-amber-300 focus:border-amber-600 focus:ring-1 focus:ring-amber-500 focus:outline-none pl-5 pr-2 py-1 rounded-lg text-sm font-black text-amber-950 font-mono shadow-2xs"
                            />
                          </div>
                        </div>

                        {/* Total Payable */}
                        <div className="bg-white p-2.5 rounded-xl border border-slate-300 shadow-2xs flex flex-col justify-between bg-gradient-to-br from-white to-slate-50">
                          <div>
                            <span className="text-[10px] text-slate-700 font-black uppercase block truncate">
                              {isMarathi ? 'एकूण देय' : 'Total Payable'}
                            </span>
                            <span className="text-[9px] text-slate-400 block truncate">{isMarathi ? 'भाडे + दंड' : 'Rent + Penalty'}</span>
                          </div>
                          <span className="font-mono text-sm sm:text-base font-black text-slate-950 mt-1">
                            ₹{pendingDueFromCustomer.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* Payment Collection Inputs */}
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between items-center">
                          <label className="font-bold text-slate-700 uppercase text-[11px]">
                            {isMarathi ? 'आता जमा होणारी रक्कम (₹)' : 'Payment Amount Collected Now (₹)'}
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSettlementAction('collect');
                                setCollectedAmount(pendingDueFromCustomer);
                              }}
                              className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-0.5 rounded cursor-pointer transition-all shadow-2xs"
                            >
                              {isMarathi ? `पूर्ण जमा (₹${pendingDueFromCustomer.toLocaleString('en-IN')})` : `Pay Full (₹${pendingDueFromCustomer.toLocaleString('en-IN')})`}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSettlementAction('none');
                                setCollectedAmount(0);
                              }}
                              className="text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-2 py-0.5 rounded cursor-pointer transition-all"
                            >
                              {isMarathi ? '₹० (उधारी ठेवा)' : '₹0 (Outstanding)'}
                            </button>
                          </div>
                        </div>

                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <IndianRupee className="w-4 h-4 text-emerald-700" />
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={collectedAmount || ''}
                            onChange={(e) => {
                              const val = Math.max(0, parseFloat(e.target.value) || 0);
                              setCollectedAmount(val);
                              setSettlementAction(val > 0 ? 'collect' : 'none');
                            }}
                            placeholder="0"
                            className="w-full bg-white border border-emerald-300 focus:border-emerald-600 focus:outline-none pl-9 pr-4 py-2.5 rounded-xl text-sm font-bold text-slate-900"
                          />
                        </div>
                      </div>

                      {/* Payment Mode */}
                      {collectedAmount > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                          <div className="space-y-1">
                            <label className="font-bold text-slate-600 uppercase text-[10px]">{isMarathi ? 'जमा खाते' : 'Payment Mode'}</label>
                            <select
                              value={paymentMode}
                              onChange={(e) => setPaymentMode(e.target.value as any)}
                              className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl font-semibold text-slate-800"
                            >
                              <option value="Cash">{accountNames.cleanCash}</option>
                              <option value="Account 1">{accountNames.cleanAccount1}</option>
                              <option value="Account 2">{accountNames.cleanAccount2}</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="font-bold text-slate-600 uppercase text-[10px]">{isMarathi ? 'संदर्भ / पावती नोंद' : 'Reference / Receipt Note'}</label>
                            <input
                              type="text"
                              value={paymentReference}
                              onChange={(e) => setPaymentReference(e.target.value)}
                              placeholder={isMarathi ? 'उदा. काउंटरवर साहित्य वापसी वेळी जमा' : 'e.g. Return settlement / UPI ref'}
                              className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs"
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between items-center text-xs font-bold pt-2 border-t border-emerald-200 text-slate-700">
                        <span>{isMarathi ? 'या जमा नोंदीनंतर शिल्लक:' : 'Balance After This Return:'}</span>
                        <span className={balanceAfterReturn > 0 ? 'text-rose-600 font-black' : 'text-emerald-700 font-black'}>
                          ₹{balanceAfterReturn.toLocaleString('en-IN')}{' '}
                          {balanceAfterReturn === 0 ? (isMarathi ? '(पूर्ण हिशोब नील ✓)' : '(Fully Settled ✓)') : (isMarathi ? '(थकबाकी येणे बाकी)' : '(Pending as Outstanding)')}
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* CASE C: ACCOUNT IS PERFECTLY BALANCED */
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-emerald-600" />
                        <div>
                          <p className="font-bold text-emerald-950">
                            {isMarathi ? 'खाते पूर्ण समतोल आहे (₹० बाकी)' : 'Account Perfectly Balanced (₹0 Due)'}
                          </p>
                          <p className="text-[10px] text-emerald-700 font-medium">
                            {isMarathi ? 'कोणतीही बाकी किंवा रिफंड येणे/देणे शिल्लक नाही.' : 'No additional dues or refunds required.'}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
                        ₹0
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-4 pt-4 border-t border-slate-100 justify-end">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-all cursor-pointer"
                >
                  {isMarathi ? 'रद्द करा' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {settlementAction === 'refund' && refundAmount > 0
                      ? (isMarathi ? `वापसी नोंदवून ₹${refundAmount.toLocaleString('en-IN')} परतावा करा` : `Confirm Return & Refund ₹${refundAmount.toLocaleString('en-IN')}`)
                      : settlementAction === 'collect' && collectedAmount > 0
                      ? (isMarathi ? `वापसी नोंदवून ₹${collectedAmount.toLocaleString('en-IN')} जमा घ्या` : `Confirm Return & Collect ₹${collectedAmount.toLocaleString('en-IN')}`)
                      : (isMarathi ? 'केवळ वापसी नोंदवा' : 'Confirm Return Only')}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RETURN TIME CONFIRMATION ALERT MODAL */}
      {isConfirmReturnOpen && selectedRental && selectedParty && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full overflow-hidden shadow-2xl animate-scaleUp text-left">
            <div className="px-6 py-5 border-b border-orange-100 flex justify-between items-center bg-orange-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-orange-100 text-primary flex items-center justify-center shadow-xs">
                  <RefreshCw className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">{isMarathi ? 'साहित्य वापसी पुष्टी करा' : 'Confirm Plate Return'}</h4>
                </div>
              </div>
              <button
                onClick={() => setIsConfirmReturnOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                {isMarathi ? (
                  <>नोंद जतन करण्यापूर्वी <strong className="text-slate-900 font-bold font-mono">"{selectedParty.name}"</strong> यांचे वापसी तपशील तपासा:</>
                ) : (
                  <>Please review the return details for <strong className="text-slate-900 font-bold font-mono">"{selectedParty.name}"</strong> before saving:</>
                )}
              </p>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2.5 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">{isMarathi ? 'ग्राहक / पार्टी:' : 'Customer:'}</span>
                  <span className="font-bold text-slate-900">{selectedParty.name}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">{isMarathi ? 'प्लेट साईझ:' : 'Plate Size:'}</span>
                  <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {selectedRental.plateType}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">{isMarathi ? 'आता जमा होत असलेल्या प्लेट्स:' : 'Plates Returning Now:'}</span>
                  <span className="font-bold text-primary bg-orange-50 px-2.5 py-0.5 rounded-lg border border-orange-200 font-mono">
                    {returnedQty} {isMarathi ? 'प्लेट्स' : 'Plates'}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">{isMarathi ? 'वापरलेले दिवस:' : 'Days Kept / Duration:'}</span>
                  <span className="font-mono font-bold text-slate-800">
                    {batchDays} {isMarathi ? 'दिवस' : 'Days'} ({isMarathi ? 'बॅच भाडे:' : 'Batch Rent:'} ₹{batchRent.toLocaleString('en-IN')})
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">{isMarathi ? 'साईटवर शिल्लक साहित्य:' : 'Remaining on Site:'}</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[11px] font-mono ${
                    remainingQtyAfterThis === 0
                      ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                      : 'text-amber-800 bg-amber-50 border border-amber-200'
                  }`}>
                    {remainingQtyAfterThis} {isMarathi ? 'प्लेट्स' : 'Plates'}{' '}
                    {remainingQtyAfterThis === 0
                      ? (isMarathi ? '(सर्व साहित्य जमा ✓)' : '(Full Return ✓)')
                      : (isMarathi ? `(चालू भाडे: ₹${remainingPlatesRent.toLocaleString('en-IN')})` : `(Continuing: ₹${remainingPlatesRent.toLocaleString('en-IN')})`)}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">{isMarathi ? 'एकूण करार भाडे:' : 'Total Agreement Rent:'}</span>
                  <span className="font-bold text-slate-900 font-mono">
                    ₹{totalAgreementRent.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">{isMarathi ? 'आगाऊ जमा / एकूण प्राप्त:' : 'Paid Advance / Total Paid:'}</span>
                  <span className="font-bold text-emerald-800 font-mono">
                    ₹{totalPaidAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                {settlementAction === 'refund' && refundAmount > 0 ? (
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200/60 text-blue-900">
                    <span className="text-blue-800 font-bold">{isMarathi ? 'ग्राहकाला परतावा:' : 'Refund to Customer:'}</span>
                    <span className="font-bold bg-blue-100 text-blue-900 px-2.5 py-0.5 rounded-lg border border-blue-300 font-mono">
                      ₹{refundAmount.toLocaleString('en-IN')} ({getMarathiPaymentMode(paymentMode, isMarathi ? 'marathi' : 'english')})
                    </span>
                  </div>
                ) : settlementAction === 'collect' && collectedAmount > 0 ? (
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200/60 text-emerald-900">
                    <span className="text-emerald-800 font-bold">{isMarathi ? 'आता जमा घेतलेली रक्कम:' : 'Payment Collected Now:'}</span>
                    <span className="font-bold bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-lg border border-emerald-300 font-mono">
                      ₹{collectedAmount.toLocaleString('en-IN')} ({getMarathiPaymentMode(paymentMode, isMarathi ? 'marathi' : 'english')})
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">{isMarathi ? 'वापसीनंतर उर्वरित शिल्लक:' : 'Balance After Return:'}</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[11px] font-mono ${
                    balanceAfterReturn === 0
                      ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                      : settlementAction === 'refund'
                      ? 'text-blue-700 bg-blue-50 border border-blue-200'
                      : 'text-rose-700 bg-rose-50 border border-rose-200'
                  }`}>
                    ₹{balanceAfterReturn.toLocaleString('en-IN')}{' '}
                    {balanceAfterReturn === 0
                      ? (isMarathi ? '(पूर्ण हिशोब नील ✓)' : '(Fully Settled ✓)')
                      : settlementAction === 'refund'
                      ? (isMarathi ? '(क्रेडिट शिल्लक)' : '(Credit Kept)')
                      : (isMarathi ? '(थकबाकी)' : '(Pending)')}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                {isMarathi
                  ? 'आपण ही साहित्य वापसी नोंदवू इच्छिता? यार्ड इन्व्हेंटरी साठा वाढेल आणि हिशोब खाती अद्यतनित होतील.'
                  : 'Are you sure you want to record this return? Inventory stock will be replenished and payment accounts will be updated.'}
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmReturnOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  {isMarathi ? 'मागे जा' : 'Back / Review'}
                </button>
                <button
                  type="button"
                  onClick={handleExecuteReturn}
                  className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-md shadow-orange-500/20 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{isMarathi ? 'होय, वापसी निश्चित करा' : 'Yes, Confirm Return'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
