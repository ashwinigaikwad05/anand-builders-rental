import React, { useState } from 'react';
import {
  Plus,
  Search,
  X,
  Check,
  ClipboardList,
  Info,
  Trash2,
  History,
  RotateCw,
  RefreshCw,
  FileText,
} from 'lucide-react';
import type { Party, PlateStock, Rental, RentalItem, RentalCycle, Payment } from '../../../data/adminMockData';
import {
  calculateCycleFinances,
  calculateExpectedCycleEndDate,
} from '../../../lib/supabase';

import { RenewRentalModal } from '../modals/RenewRentalModal';
import { RentalBillModal } from '../modals/RentalBillModal';

interface PlateRowItem {
  id: string;
  plateType: string;
  quantity: number | string;
  dailyRate: number | string;
  days: number | string;
}

interface RentalsTabProps {
  rentals: Rental[];
  parties: Party[];
  plates: PlateStock[];
  rentalCycles?: RentalCycle[];
  payments?: Payment[];
  onAddRental: (newRental: Omit<Rental, 'id' | 'totalRent' | 'pending' | 'status'>) => void;
  onUpdateRentalStatus?: (rentalId: string, status: 'active' | 'returned' | 'overdue') => void;
  onInitiateReturn?: (rental: Rental) => void;
  onRenewRental?: (
    rentalId: string,
    renewalConfirmationDate?: string,
    newItems?: RentalItem[],
    renewDays?: number,
    payment?: {
      amount: number;
      paymentMode: 'Cash' | 'Account 1' | 'Account 2';
      date?: string;
      reference?: string;
      notes?: string;
    }
  ) => Promise<void>;
}

export const RentalsTab: React.FC<RentalsTabProps> = ({
  rentals,
  parties,
  plates,
  rentalCycles = [],
  payments = [],
  onAddRental,
  onUpdateRentalStatus: _onUpdateRentalStatus,
  onInitiateReturn,
  onRenewRental,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'active' | 'returned' | 'overdue'>('All');
  const [partyFilter, setPartyFilter] = useState<string>('All');
  const [plateFilter, setPlateFilter] = useState<string>('All');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [renewTarget, setRenewTarget] = useState<Rental | null>(null);
  const [historyTarget, setHistoryTarget] = useState<Rental | null>(null);
  const [billTarget, setBillTarget] = useState<Rental | null>(null);

  // Form states for Add Rental
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [issueDate, setIssueDate] = useState(todayStr);
  const [plateRows, setPlateRows] = useState<PlateRowItem[]>([
    { id: 'row-1', plateType: '24×3', quantity: 100, dailyRate: 1.5, days: 40 },
  ]);
  const [amountPaid, setAmountPaid] = useState<string>('0');
  const [paymentMode, setPaymentMode] = useState<'Account 1' | 'Account 2' | 'Cash' | 'Outstanding'>('Outstanding');
  const [validationError, setValidationError] = useState('');

  // Calculations across all plate rows
  const calculatedTotalRent = plateRows.reduce((sum, r) => {
    const q = parseInt(String(r.quantity), 10) || 0;
    const rate = parseFloat(String(r.dailyRate)) || 0;
    const d = parseInt(String(r.days), 10) || 0;
    return sum + q * rate * d;
  }, 0);
  const numericPaid = parseFloat(amountPaid) || 0;
  const calculatedPending = Math.max(0, calculatedTotalRent - numericPaid);

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
        id: `fallback-${rental.id}`,
        rentalId: rental.id,
        partyId: rental.partyId,
        cycleNumber: rental.currentCycleNumber || 1,
        startDate: rental.currentCycleStartDate || rental.issueDate,
        expectedEndDate: rental.currentCycleEndDate || calculateExpectedCycleEndDate(rental.issueDate, 40),
        days: rental.days || 40,
        extraDays: Math.max(0, (rental.days || 40) - 40),
        dailyRate: rental.dailyRate,
        quantity: rental.quantity,
        baseRent: rental.totalRent,
        extraAmount: 0,
        totalAmount: rental.totalRent,
        paidAmount: rental.paid,
        pendingAmount: rental.pending,
        status: rental.status === 'returned' ? 'completed' : 'active',
      },
    ];
  };

  // Helper to get the active cycle of a rental
  const getActiveCycleForRental = (rental: Rental): RentalCycle => {
    const cycles = getCyclesForRental(rental);
    const active = cycles.find((c) => c.status === 'active');
    return active || cycles[cycles.length - 1];
  };

  // Helper to get live financial figures for the active cycle
  const getLiveCycleData = (rental: Rental) => {
    const activeCycle = getActiveCycleForRental(rental);
    if (rental.status === 'returned' || activeCycle.status === 'completed') {
      return {
        activeCycle,
        finances: {
          elapsedDays: activeCycle.days,
          standardDays: Math.min(activeCycle.days, 40),
          extraDays: activeCycle.extraDays,
          baseRent: activeCycle.baseRent,
          extraAmount: activeCycle.extraAmount,
          totalAmount: activeCycle.totalAmount,
          pendingAmount: activeCycle.pendingAmount,
        },
      };
    }

    const finances = calculateCycleFinances(
      {
        startDate: activeCycle.startDate,
        quantity: activeCycle.quantity,
        dailyRate: activeCycle.dailyRate,
        baseRent: activeCycle.baseRent,
        paidAmount: activeCycle.paidAmount,
        items: rental.items,
      },
      todayStr
    );

    return { activeCycle, finances };
  };

  // Helper to determine real-time effective status
  const getEffectiveRentalStatus = (rental: Rental): 'active' | 'returned' | 'overdue' => {
    if (rental.status === 'returned') return 'returned';
    const { activeCycle, finances } = getLiveCycleData(rental);
    if (
      rental.status === 'overdue' ||
      finances.extraDays > 0 ||
      Boolean(activeCycle.expectedEndDate && todayStr > activeCycle.expectedEndDate)
    ) {
      return 'overdue';
    }
    return 'active';
  };

  const filteredRentals = rentals.filter((r) => {
    const matchesSearch =
      r.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.plateType.toLowerCase().includes(searchTerm.toLowerCase());

    const effectiveStatus = getEffectiveRentalStatus(r);
    const matchesStatus = statusFilter === 'All' || effectiveStatus === statusFilter;
    const matchesParty = partyFilter === 'All' || r.partyId === partyFilter;
    const matchesPlate = plateFilter === 'All' || r.plateType.includes(plateFilter);

    return matchesSearch && matchesStatus && matchesParty && matchesPlate;
  });

  const handleOpenAdd = () => {
    setSelectedPartyId(parties[0]?.id || '');
    setIssueDate(todayStr);
    const firstPlate = plates[0];
    const initialDailyRate =
      firstPlate && firstPlate.dailyRate && firstPlate.dailyRate > 0
        ? firstPlate.dailyRate
        : 1.5;
    setPlateRows([
      {
        id: `row-${Date.now()}-1`,
        plateType: firstPlate?.plateType || '24×3',
        quantity: 100,
        dailyRate: initialDailyRate,
        days: 40,
      },
    ]);
    setAmountPaid('0');
    setPaymentMode('Outstanding');
    setValidationError('');
    setIsAddOpen(true);
  };

  const handleAddPlateRow = () => {
    const unusedPlate = plates.find(
      (p) => !plateRows.some((r) => r.plateType === p.plateType)
    );
    const targetPlate = unusedPlate || plates[0];
    const targetDailyRate =
      targetPlate && targetPlate.dailyRate && targetPlate.dailyRate > 0
        ? targetPlate.dailyRate
        : 1.5;
    const newRow: PlateRowItem = {
      id: `row-${Date.now()}-${plateRows.length + 1}`,
      plateType: targetPlate?.plateType || '21×3',
      quantity: 50,
      dailyRate: targetDailyRate,
      days: plateRows[0]?.days || 40,
    };
    setPlateRows((prev) => [...prev, newRow]);
  };

  const handleRemovePlateRow = (id: string) => {
    setPlateRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdatePlateRow = (id: string, field: keyof PlateRowItem, value: any) => {
    setPlateRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: value };
        if (field === 'plateType') {
          const matched = plates.find((p) => p.plateType === value);
          if (matched) {
            updated.dailyRate =
              matched.dailyRate && matched.dailyRate > 0 ? matched.dailyRate : 1.5;
          }
        }
        return updated;
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!selectedPartyId || plateRows.length === 0) {
      setValidationError('Please select a customer party and at least one plate row.');
      return;
    }

    const selectedTypes = plateRows.map((r) => r.plateType);
    const hasDuplicates = new Set(selectedTypes).size !== selectedTypes.length;
    if (hasDuplicates) {
      setValidationError('This plate type is already added. Duplicate plate sizes are not allowed.');
      return;
    }

    for (const row of plateRows) {
      if (!row.plateType) {
        setValidationError('Please choose a valid plate size for all rows.');
        return;
      }
      const q = parseInt(String(row.quantity), 10) || 0;
      if (q < 1) {
        setValidationError(`Please enter a quantity of at least 1 for size ${row.plateType}.`);
        return;
      }
      const d = parseInt(String(row.days), 10) || 0;
      if (d < 1) {
        setValidationError(`Please enter rental term days of at least 1 for size ${row.plateType}.`);
        return;
      }
      const rate = parseFloat(String(row.dailyRate));
      if (isNaN(rate) || rate < 0) {
        setValidationError(`Please enter a valid daily rate for size ${row.plateType}.`);
        return;
      }

      const matchedPlate = plates.find((p) => p.plateType === row.plateType);
      const available = matchedPlate ? matchedPlate.available : 0;
      if (q > available) {
        setValidationError(`Only ${available} plates are available for size ${row.plateType}.`);
        return;
      }
    }

    const party = parties.find((p) => p.id === selectedPartyId);
    if (!party) return;

    const items: RentalItem[] = plateRows.map((r) => ({
      plateType: r.plateType,
      quantity: parseInt(String(r.quantity), 10) || 1,
      dailyRate: parseFloat(String(r.dailyRate)) || 0,
      days: parseInt(String(r.days), 10) || 1,
    }));

    const totalQuantity = plateRows.reduce(
      (sum, r) => sum + (parseInt(String(r.quantity), 10) || 1),
      0
    );
    const plateTypeSummary =
      plateRows.length === 1
        ? plateRows[0].plateType
        : plateRows
            .map((r) => `${r.plateType} (${parseInt(String(r.quantity), 10) || 1})`)
            .join(', ');

    onAddRental({
      partyId: selectedPartyId,
      partyName: party.name,
      plateType: plateTypeSummary,
      quantity: totalQuantity,
      dailyRate: parseFloat(String(plateRows[0]?.dailyRate)) || 1.5,
      issueDate,
      days: parseInt(String(plateRows[0]?.days), 10) || 40,
      paid: parseFloat(amountPaid) || 0,
      paymentMode,
      items,
    });

    // Reset filters so the newly dispatched rental is guaranteed to be visible
    setSearchTerm('');
    setStatusFilter('All');
    setPartyFilter('All');
    setPlateFilter('All');

    setIsAddOpen(false);
  };

  // Open Renew Modal
  const handleOpenRenewModal = (rental: Rental) => {
    setRenewTarget(rental);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Search and Filters Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 flex-grow max-w-3xl">
          <div className="relative flex-grow">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by party name or size..."
              className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-white border border-slate-200 focus:border-primary focus:outline-none px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700"
          >
            <option value="All">All Statuses</option>
            <option value="active">Active</option>
            <option value="overdue">Overdue</option>
            <option value="returned">Returned</option>
          </select>

          {/* Party Filter */}
          <select
            value={partyFilter}
            onChange={(e) => setPartyFilter(e.target.value)}
            className="bg-white border border-slate-200 focus:border-primary focus:outline-none px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 max-w-[180px]"
          >
            <option value="All">All Parties</option>
            {parties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Plate Size Filter */}
          <select
            value={plateFilter}
            onChange={(e) => setPlateFilter(e.target.value)}
            className="bg-white border border-slate-200 focus:border-primary focus:outline-none px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700"
          >
            <option value="All">All Sizes</option>
            {plates.map((p) => (
              <option key={p.plateType} value={p.plateType}>
                {p.plateType}
              </option>
            ))}
          </select>
        </div>

        {/* Trigger Button */}
        <button
          onClick={handleOpenAdd}
          className="bg-primary hover:bg-primary-dark text-white font-bold px-5 py-2.5 rounded-xl shadow-md hover:shadow-orange-500/10 flex items-center justify-center gap-2 text-sm transition-all flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Rental Dispatch</span>
        </button>
      </div>

      {/* Rentals Table */}
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="px-5 py-4 min-w-[160px]">Party & Agreement</th>
                <th className="px-4 py-4 min-w-[100px]">Size & Qty</th>
                <th className="px-4 py-4 min-w-[90px]">Cycle</th>
                <th className="px-4 py-4 min-w-[140px]">Cycle Dates</th>
                <th className="px-4 py-4 min-w-[110px]">Duration</th>
                <th className="px-4 py-4 min-w-[90px]">Total</th>
                <th className="px-4 py-4 min-w-[80px]">Paid</th>
                <th className="px-4 py-4 min-w-[100px]">Due</th>
                <th className="px-4 py-4 min-w-[100px]">Status</th>
                <th className="px-5 py-4 min-w-[270px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-light">
              {filteredRentals.map((rent) => {
                const { activeCycle, finances } = getLiveCycleData(rent);
                const allCycles = getCyclesForRental(rent);
                const hasExtra = finances.extraDays > 0;
                const isOverdue =
                  rent.status !== 'returned' &&
                  (rent.status === 'overdue' ||
                    hasExtra ||
                    Boolean(activeCycle.expectedEndDate && todayStr > activeCycle.expectedEndDate));
                const effectiveStatus: 'active' | 'returned' | 'overdue' =
                  rent.status === 'returned' ? 'returned' : isOverdue ? 'overdue' : 'active';

                return (
                  <tr key={rent.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Party & Agreement */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-xs px-2 py-0.5 rounded-lg bg-orange-100 text-primary border border-orange-200 shadow-2xs">
                          Bill #{rent.billNumber || 1}
                        </span>
                        <span className="font-bold text-slate-900 text-sm">{rent.partyName}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-1.5">
                        <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded text-[10px]">
                          Cust #{rent.customerNumber || parties.find((p) => p.id === rent.partyId)?.customerNumber || 1}
                        </span>
                        <span>•</span>
                        <span>Disp: {rent.issueDate}</span>
                      </div>
                    </td>

                    {/* Size & Qty */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                        {rent.plateType}
                      </span>
                      <div className="text-xs font-bold text-slate-700 mt-1">
                        {rent.quantity} Plates
                      </div>
                    </td>

                    {/* Active Cycle Badge */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold px-2.5 py-1 rounded-lg">
                        <span>Cycle {activeCycle.cycleNumber}</span>
                        {activeCycle.status === 'active' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                        )}
                      </span>
                      {allCycles.length > 1 && (
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          {allCycles.length} cyc total
                        </div>
                      )}
                    </td>

                    {/* Cycle Dates */}
                    <td className="px-4 py-4 text-xs font-mono text-slate-700 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{activeCycle.startDate}</div>
                      <div className="text-slate-400 text-[11px]">
                        → {activeCycle.actualEndDate || activeCycle.expectedEndDate}
                      </div>
                    </td>

                    {/* Duration & Extra */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="font-bold text-slate-800 text-xs">
                        {finances.elapsedDays} Days
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {finances.standardDays} / {activeCycle.days || 40}d
                      </div>
                      {hasExtra && (
                        <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold rounded">
                          +{finances.extraDays}d Overdue
                        </span>
                      )}
                    </td>

                    {/* Cycle Total */}
                    {(() => {
                      // Compute all-cycles aggregate figures
                      let allCyclesTotalAmount = 0;
                      let allCyclesPaidAmount = 0;
                      for (const cyc of allCycles) {
                        if (cyc.status === 'active' && rent.status !== 'returned') {
                          const cycFin = calculateCycleFinances(
                            {
                              startDate: cyc.startDate,
                              quantity: cyc.quantity,
                              dailyRate: cyc.dailyRate,
                              baseRent: cyc.baseRent,
                              paidAmount: cyc.paidAmount,
                              items: rent.items,
                            },
                            todayStr
                          );
                          allCyclesTotalAmount += cycFin.totalAmount;
                        } else {
                          allCyclesTotalAmount += cyc.totalAmount;
                        }
                        allCyclesPaidAmount += cyc.paidAmount;
                      }
                      const allCyclesPendingAmount = Math.max(0, allCyclesTotalAmount - allCyclesPaidAmount);
                      const hasMultipleCycles = allCycles.length > 1;

                      return (
                        <>
                          {/* Total */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="font-bold text-slate-900 text-sm">
                              ₹{allCyclesTotalAmount.toLocaleString('en-IN')}
                            </div>
                            {hasExtra && (
                              <div className="text-[10px] text-amber-700 font-medium">
                                +₹{finances.extraAmount.toLocaleString('en-IN')} extra
                              </div>
                            )}
                            {hasMultipleCycles && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                {allCycles.length} cycles
                              </div>
                            )}
                          </td>

                          {/* Paid */}
                          <td className="px-4 py-4 whitespace-nowrap text-emerald-600 font-bold text-sm">
                            ₹{allCyclesPaidAmount.toLocaleString('en-IN')}
                          </td>

                          {/* Due (All Cycles Pending) */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className={`font-black text-sm ${allCyclesPendingAmount > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                              ₹{allCyclesPendingAmount.toLocaleString('en-IN')}
                            </div>
                            {allCyclesPendingAmount === 0 && (
                              <span className="text-[10px] font-bold text-emerald-600">Settled ✓</span>
                            )}
                          </td>
                        </>
                      );
                    })()}

                    {/* Status */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            effectiveStatus === 'returned'
                              ? 'bg-slate-100 text-slate-500 border border-slate-200'
                              : effectiveStatus === 'overdue'
                              ? 'bg-rose-100 text-rose-700 border border-rose-300 font-black'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {effectiveStatus === 'overdue' ? 'OVERDUE' : effectiveStatus.toUpperCase()}
                        </span>
                        {effectiveStatus === 'overdue' && finances.extraDays > 0 && (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                            +{finances.extraDays}d
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {/* View & Print Rental Bill */}
                        <button
                          onClick={() => setBillTarget(rent)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-all cursor-pointer"
                          title={`Generate / Print Rental Bill #${rent.billNumber || 1}`}
                        >
                          <FileText className="w-3.5 h-3.5 text-orange-400" />
                          <span>Bill #{rent.billNumber || 1}</span>
                        </button>

                        {/* Return Action */}
                        {(effectiveStatus === 'active' || effectiveStatus === 'overdue') && onInitiateReturn && (
                          <button
                            onClick={() => onInitiateReturn(rent)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-orange-50 hover:bg-orange-100 text-primary border border-orange-200 transition-all cursor-pointer"
                            title="Record plate return and collect remaining balance"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Return</span>
                          </button>
                        )}

                        {/* Renew Cycle Button */}
                        {(effectiveStatus === 'active' || effectiveStatus === 'overdue') && onRenewRental && (
                          <button
                            onClick={() => handleOpenRenewModal(rent)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all cursor-pointer"
                            title="Renew rental for another 40-day cycle"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                            <span>Renew</span>
                          </button>
                        )}

                        {/* View Cycle History Modal Trigger */}
                        <button
                          onClick={() => setHistoryTarget(rent)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                          title="View Cycle Financial History"
                        >
                          <History className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rentals.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-10 text-center text-slate-400 font-light italic">
                    No rentals yet.
                  </td>
                </tr>
              ) : filteredRentals.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-10 text-center text-slate-400 font-light italic">
                    No dispatches found matching query.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* RENEW CYCLE MODAL (Rule 1A/B/C) */}
      {renewTarget && (
        <RenewRentalModal
          rental={renewTarget}
          activeCycle={getActiveCycleForRental(renewTarget)}
          plates={plates}
          onClose={() => setRenewTarget(null)}
          onConfirm={async (rentalId, renewalDate, newItems, renewDays, payment) => {
            if (onRenewRental) {
              await onRenewRental(rentalId, renewalDate, newItems, renewDays, payment);
            }
          }}
        />
      )}

      {/* CYCLE HISTORY MODAL */}
      {historyTarget && (() => {
        const cycles = getCyclesForRental(historyTarget);
        const totalRentalAllCycles = cycles.reduce((sum, c) => sum + c.totalAmount, 0);
        const totalPaidAllCycles = cycles.reduce((sum, c) => sum + c.paidAmount, 0);
        const totalPendingAllCycles = cycles.reduce((sum, c) => sum + c.pendingAmount, 0);

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-scaleUp text-left">
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/60 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-charcoal">
                      Rental Cycle History — {historyTarget.partyName}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-light">
                      {historyTarget.plateType} • {historyTarget.quantity} Plates • Dispatched {historyTarget.issueDate}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setHistoryTarget(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Cycles List */}
              <div className="p-6 space-y-4 overflow-y-auto flex-grow">
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                        <th className="px-4 py-3">Cycle #</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Dates (Start → End)</th>
                        <th className="px-4 py-3">Days</th>
                        <th className="px-4 py-3">Base Rent</th>
                        <th className="px-4 py-3">Extra Days Charge</th>
                        <th className="px-4 py-3">Total Rent</th>
                        <th className="px-4 py-3">Paid</th>
                        <th className="px-4 py-3">Pending</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cycles.map((cyc) => {
                        const isCycActive = cyc.status === 'active';
                        const liveData = isCycActive
                          ? calculateCycleFinances(
                              {
                                startDate: cyc.startDate,
                                quantity: cyc.quantity,
                                dailyRate: cyc.dailyRate,
                                baseRent: cyc.baseRent,
                                paidAmount: cyc.paidAmount,
                                items: historyTarget.items,
                              },
                              todayStr
                            )
                          : {
                              elapsedDays: cyc.days,
                              standardDays: Math.min(cyc.days, 40),
                              extraDays: cyc.extraDays,
                              extraAmount: cyc.extraAmount,
                              totalAmount: cyc.totalAmount,
                              pendingAmount: cyc.pendingAmount,
                            };

                        return (
                          <tr key={cyc.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-bold text-slate-800">
                              Cycle {cyc.cycleNumber}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  isCycActive
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {cyc.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-600">
                              {cyc.startDate} → {cyc.actualEndDate || cyc.expectedEndDate}
                            </td>
                            <td className="px-4 py-3 font-mono">
                              {liveData.elapsedDays}d ({liveData.standardDays} + {liveData.extraDays}ex)
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-700">
                              ₹{cyc.baseRent.toLocaleString('en-IN')}
                            </td>
                            <td className={`px-4 py-3 font-semibold ${liveData.extraAmount > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                              ₹{liveData.extraAmount.toLocaleString('en-IN')}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-800">
                              ₹{liveData.totalAmount.toLocaleString('en-IN')}
                            </td>
                            <td className="px-4 py-3 font-bold text-emerald-600">
                              ₹{cyc.paidAmount.toLocaleString('en-IN')}
                            </td>
                            <td className={`px-4 py-3 font-bold ${liveData.pendingAmount > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                              ₹{liveData.pendingAmount.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Overall Totals Summary Banner */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-bold">
                  <div className="text-slate-500">
                    Agreement Cumulative ({cycles.length} Cycles)
                  </div>
                  <div className="flex gap-6">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Total Cycle Rent</span>
                      <span className="text-slate-800 text-sm">₹{totalRentalAllCycles.toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Total Paid</span>
                      <span className="text-emerald-600 text-sm">₹{totalPaidAllCycles.toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Total Outstanding</span>
                      <span className="text-rose-600 text-sm">₹{totalPendingAllCycles.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setHistoryTarget(null)}
                  className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-xl text-sm transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* New Rental Dispatch Dialog */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-scaleUp text-left">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/60 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-orange-50 text-primary rounded-xl">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-charcoal">
                    Dispatch Plates - New Rental Sheet (Cycle 1)
                  </h4>
                  <p className="text-[11px] text-slate-400 font-light">
                    Issue centering plates and configure standard 40-day rental cycle
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-grow">
              {/* Validation alert */}
              {validationError && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Row 1: Party and Dispatch Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                    Customer Party *
                  </label>
                  <select
                    value={selectedPartyId}
                    onChange={(e) => setSelectedPartyId(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary px-4 py-3 rounded-xl text-sm font-semibold text-slate-800"
                  >
                    <option value="">-- Choose Party --</option>
                    {parties.map((p, idx) => (
                      <option key={p.id} value={p.id}>
                        Customer #{p.customerNumber || idx + 1} — {p.name} ({p.mobile})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                    Dispatch Issue Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary px-4 py-3 rounded-xl text-sm font-semibold text-slate-800"
                  />
                </div>
              </div>

              {/* Multi-Plate Rows Section */}
              <div className="space-y-3">
                <div className="hidden lg:grid grid-cols-12 gap-3 text-xs font-bold text-slate-600 uppercase tracking-wider px-1">
                  <div className="col-span-4">Shuttering Plate Size *</div>
                  <div className="col-span-3">Dispatch Quantity *</div>
                  <div className="col-span-2">Daily Rate (₹/day) *</div>
                  <div className="col-span-2">Standard Term (Days) *</div>
                  <div className="col-span-1 text-center">Action</div>
                </div>

                <div className="space-y-3">
                  {plateRows.map((row, index) => (
                    <div
                      key={row.id}
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center bg-slate-50/70 p-3 sm:p-3.5 rounded-2xl border border-slate-200/70"
                    >
                      {/* Plate Size */}
                      <div className="lg:col-span-4 space-y-1 sm:space-y-0">
                        <label className="lg:hidden text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                          Plate Size *
                        </label>
                        <select
                          value={row.plateType}
                          onChange={(e) => handleUpdatePlateRow(row.id, 'plateType', e.target.value)}
                          required
                          className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800"
                        >
                          <option value="">-- Choose Width --</option>
                          {plates.map((p) => {
                            const isSelectedElsewhere = plateRows.some(
                              (r) => r.id !== row.id && r.plateType === p.plateType
                            );
                            return (
                              <option
                                key={p.plateType}
                                value={p.plateType}
                                disabled={isSelectedElsewhere}
                              >
                                {p.plateType} ({p.available} avail.){isSelectedElsewhere ? ' - Already Added' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="lg:col-span-3 space-y-1 sm:space-y-0">
                        <label className="lg:hidden text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                          Dispatch Quantity *
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={row.quantity}
                          placeholder="e.g. 100"
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleUpdatePlateRow(row.id, 'quantity', e.target.value)}
                          onBlur={() => {
                            const val = parseInt(String(row.quantity), 10);
                            if (!val || val < 1) {
                              handleUpdatePlateRow(row.id, 'quantity', 1);
                            } else {
                              handleUpdatePlateRow(row.id, 'quantity', val);
                            }
                          }}
                          className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800"
                        />
                      </div>

                      {/* Daily Rate */}
                      <div className="lg:col-span-2 space-y-1 sm:space-y-0">
                        <label className="lg:hidden text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                          Daily Rate (₹/day) *
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          required
                          value={row.dailyRate}
                          placeholder="1.50"
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleUpdatePlateRow(row.id, 'dailyRate', e.target.value)}
                          onBlur={() => {
                            const strVal = String(row.dailyRate).trim();
                            if (strVal === '' || isNaN(parseFloat(strVal))) {
                              const defaultRate =
                                plates.find((p) => p.plateType === row.plateType)?.dailyRate || 1.5;
                              handleUpdatePlateRow(row.id, 'dailyRate', defaultRate);
                            } else {
                              handleUpdatePlateRow(row.id, 'dailyRate', Math.max(0, parseFloat(strVal)));
                            }
                          }}
                          className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800"
                        />
                      </div>

                      {/* Rental Term */}
                      <div className="lg:col-span-2 space-y-1 sm:space-y-0">
                        <label className="lg:hidden text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                          Standard Term (Days) *
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="365"
                          required
                          value={row.days}
                          placeholder="e.g. 40"
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleUpdatePlateRow(row.id, 'days', e.target.value)}
                          onBlur={() => {
                            const val = parseInt(String(row.days), 10);
                            if (!val || val < 1) {
                              handleUpdatePlateRow(row.id, 'days', 1);
                            } else {
                              handleUpdatePlateRow(row.id, 'days', Math.min(365, val));
                            }
                          }}
                          className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800"
                        />
                      </div>

                      {/* Delete button */}
                      <div className="lg:col-span-1 flex items-center justify-center pt-1 sm:pt-0">
                        {index > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleRemovePlateRow(row.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            title="Remove this plate"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <div className="hidden lg:block w-8" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* + Add Plate Button */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleAddPlateRow}
                    disabled={plateRows.length >= plates.length}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-primary bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add Plate</span>
                  </button>
                </div>
              </div>

              {/* Total Rent & Financial Payment Summary Card */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-200/70">
                  <div className="space-y-1 text-left">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      Calculated {plateRows[0]?.days ? `${plateRows[0].days}-Day ` : ''}Base Rent
                    </span>
                    <div className="space-y-0.5 text-[11px] text-slate-500 font-mono">
                      {plateRows.map((r, idx) => {
                        const q = parseInt(String(r.quantity), 10) || 0;
                        const rate = parseFloat(String(r.dailyRate)) || 0;
                        const d = parseInt(String(r.days), 10) || 0;
                        return (
                          <div key={idx}>
                            {q} plates ({r.plateType}) × ₹{rate.toFixed(2)}/day × {d} days = ₹{(q * rate * d).toLocaleString('en-IN')}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-charcoal">
                      ₹{calculatedTotalRent.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                      Advance Amount Paid (₹) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={amountPaid}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      onBlur={() => {
                        if (amountPaid.trim() === '') {
                          setAmountPaid('0');
                        }
                      }}
                      className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-800"
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                      Dispatch Payment Mode *
                    </label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value as any)}
                      className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-800"
                    >
                      <option value="Outstanding">Outstanding</option>
                      <option value="Account 1">Account 1 (Bank)</option>
                      <option value="Account 2">Account 2 (Digital)</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-200 text-xs font-bold">
                  <span className="text-slate-500 uppercase tracking-wider">Outstanding Dues:</span>
                  <span className={`text-base font-black ${calculatedPending > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    ₹{calculatedPending.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-2 border-t border-slate-100 justify-end flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl text-sm shadow-md hover:shadow-orange-500/20 transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Dispatch Material</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENTAL BILL / CHALLAN MODAL */}
      {billTarget && (
        <RentalBillModal
          rental={billTarget}
          activeCycle={getActiveCycleForRental(billTarget)}
          rentalCycles={getCyclesForRental(billTarget)}
          party={parties.find((p) => p.id === billTarget.partyId)}
          payments={payments.filter((p) => (p.rentalId && p.rentalId === billTarget.id) || (p.partyId && p.partyId === billTarget.partyId))}
          finances={getLiveCycleData(billTarget).finances}
          billNumber={billTarget.billNumber}
          customerNumber={billTarget.customerNumber || parties.find((p) => p.id === billTarget.partyId)?.customerNumber}
          onClose={() => setBillTarget(null)}
        />
      )}
    </div>
  );
};
