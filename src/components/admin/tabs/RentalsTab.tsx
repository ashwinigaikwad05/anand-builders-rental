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
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import type { Party, PlateStock, Rental, RentalItem, RentalCycle } from '../../../data/adminMockData';
import {
  calculateCycleFinances,
  determineRenewalStartDate,
  calculateExpectedCycleEndDate,
} from '../../../lib/supabase';

interface PlateRowItem {
  id: string;
  plateType: string;
  quantity: number;
  dailyRate: number;
  days: number;
}

interface RentalsTabProps {
  rentals: Rental[];
  parties: Party[];
  plates: PlateStock[];
  rentalCycles?: RentalCycle[];
  onAddRental: (newRental: Omit<Rental, 'id' | 'totalRent' | 'pending' | 'status'>) => void;
  onUpdateRentalStatus: (rentalId: string, status: 'active' | 'returned' | 'overdue') => void;
  onInitiateReturn?: (rental: Rental) => void;
  onRenewRental?: (rentalId: string, renewalConfirmationDate?: string) => Promise<void>;
}

export const RentalsTab: React.FC<RentalsTabProps> = ({
  rentals,
  parties,
  plates,
  rentalCycles = [],
  onAddRental,
  onUpdateRentalStatus,
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
  const [renewDate, setRenewDate] = useState<string>(todayStr);
  const [isRenewing, setIsRenewing] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<Rental | null>(null);

  // Form states for Add Rental
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [issueDate, setIssueDate] = useState(todayStr);
  const [plateRows, setPlateRows] = useState<PlateRowItem[]>([
    { id: 'row-1', plateType: '24×3', quantity: 100, dailyRate: 1.5, days: 40 },
  ]);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<'Account 1' | 'Account 2' | 'Cash' | 'Udhari'>('Udhari');
  const [validationError, setValidationError] = useState('');

  // Calculations across all plate rows
  const calculatedTotalRent = plateRows.reduce(
    (sum, r) => sum + r.quantity * r.dailyRate * r.days,
    0
  );
  const calculatedPending = Math.max(0, calculatedTotalRent - amountPaid);

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
    if (rental.status === 'returned') {
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

  const filteredRentals = rentals.filter((r) => {
    const matchesSearch =
      r.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.plateType.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    const matchesParty = partyFilter === 'All' || r.partyId === partyFilter;
    const matchesPlate = plateFilter === 'All' || r.plateType.includes(plateFilter);

    return matchesSearch && matchesStatus && matchesParty && matchesPlate;
  });

  const handleOpenAdd = () => {
    setSelectedPartyId(parties[0]?.id || '');
    setIssueDate(todayStr);
    const firstPlate = plates[0];
    setPlateRows([
      {
        id: `row-${Date.now()}-1`,
        plateType: firstPlate?.plateType || '24×3',
        quantity: 100,
        dailyRate: firstPlate?.dailyRate || 1.5,
        days: 40,
      },
    ]);
    setAmountPaid(0);
    setPaymentMode('Udhari');
    setValidationError('');
    setIsAddOpen(true);
  };

  const handleAddPlateRow = () => {
    const unusedPlate = plates.find(
      (p) => !plateRows.some((r) => r.plateType === p.plateType)
    );
    const targetPlate = unusedPlate || plates[0];
    const newRow: PlateRowItem = {
      id: `row-${Date.now()}-${plateRows.length + 1}`,
      plateType: targetPlate?.plateType || '21×3',
      quantity: 50,
      dailyRate: targetPlate?.dailyRate || 1.5,
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
            updated.dailyRate = matched.dailyRate;
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
      if (row.quantity <= 0) {
        setValidationError(`Please enter a quantity greater than 0 for size ${row.plateType}.`);
        return;
      }
      if (row.days <= 0) {
        setValidationError(`Please enter rental term days greater than 0 for size ${row.plateType}.`);
        return;
      }

      const matchedPlate = plates.find((p) => p.plateType === row.plateType);
      const available = matchedPlate ? matchedPlate.available : 0;
      if (row.quantity > available) {
        setValidationError(`Only ${available} plates are available for size ${row.plateType}.`);
        return;
      }
    }

    const party = parties.find((p) => p.id === selectedPartyId);
    if (!party) return;

    const items: RentalItem[] = plateRows.map((r) => ({
      plateType: r.plateType,
      quantity: r.quantity,
      dailyRate: r.dailyRate,
      days: r.days,
    }));

    const totalQuantity = plateRows.reduce((sum, r) => sum + r.quantity, 0);
    const plateTypeSummary =
      plateRows.length === 1
        ? plateRows[0].plateType
        : plateRows.map((r) => `${r.plateType} (${r.quantity})`).join(', ');

    onAddRental({
      partyId: selectedPartyId,
      partyName: party.name,
      plateType: plateTypeSummary,
      quantity: totalQuantity,
      dailyRate: plateRows[0]?.dailyRate || 1.5,
      issueDate,
      days: plateRows[0]?.days || 40,
      paid: amountPaid,
      paymentMode,
      items,
    });

    setIsAddOpen(false);
  };

  // Open Renew Modal
  const handleOpenRenewModal = (rental: Rental) => {
    setRenewTarget(rental);
    setRenewDate(todayStr);
  };

  // Confirm Renewal execution
  const handleConfirmRenew = async () => {
    if (!renewTarget || !onRenewRental) return;
    try {
      setIsRenewing(true);
      await onRenewRental(renewTarget.id, renewDate);
      setRenewTarget(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRenewing(false);
    }
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
                <th className="px-5 py-4">Party & Agreement</th>
                <th className="px-4 py-4">Size & Qty</th>
                <th className="px-4 py-4">Active Cycle</th>
                <th className="px-4 py-4">Cycle Dates</th>
                <th className="px-4 py-4">Duration & Extra</th>
                <th className="px-4 py-4">Cycle Total</th>
                <th className="px-4 py-4">Paid</th>
                <th className="px-4 py-4">Outstanding</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-light">
              {filteredRentals.map((rent) => {
                const { activeCycle, finances } = getLiveCycleData(rent);
                const allCycles = getCyclesForRental(rent);
                const hasExtra = finances.extraDays > 0;

                return (
                  <tr key={rent.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Party & Agreement */}
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-800 text-sm">{rent.partyName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Dispatched: {rent.issueDate}
                      </div>
                    </td>

                    {/* Size & Qty */}
                    <td className="px-4 py-4">
                      <div className="font-mono text-xs font-semibold text-slate-700">
                        {rent.plateType}
                      </div>
                      <div className="text-xs font-bold text-slate-800">
                        {rent.quantity} Plates
                      </div>
                    </td>

                    {/* Active Cycle Badge */}
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold px-2.5 py-1 rounded-lg">
                        <span>Cycle {activeCycle.cycleNumber}</span>
                        {activeCycle.status === 'active' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                        )}
                      </span>
                      {allCycles.length > 1 && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {allCycles.length} cycles total
                        </div>
                      )}
                    </td>

                    {/* Cycle Dates */}
                    <td className="px-4 py-4 text-xs font-mono text-slate-600">
                      <div>{activeCycle.startDate}</div>
                      <div className="text-slate-400 text-[11px]">
                        to {activeCycle.actualEndDate || activeCycle.expectedEndDate}
                      </div>
                    </td>

                    {/* Duration & Extra */}
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-800 text-xs">
                        {finances.elapsedDays} Days
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {finances.standardDays} Std {finances.extraDays > 0 ? `+ ${finances.extraDays} Extra` : ''}
                      </div>
                      {hasExtra && (
                        <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold rounded">
                          +{finances.extraDays}d Over 40
                        </span>
                      )}
                    </td>

                    {/* Cycle Total with Extra Day Breakdown Notice */}
                    <td className="px-4 py-4">
                      <div className="font-bold text-slate-800">
                        ₹{finances.totalAmount.toLocaleString('en-IN')}
                      </div>
                      {hasExtra && (
                        <div className="text-[10px] text-amber-700 font-medium bg-amber-50/90 border border-amber-200 rounded px-1.5 py-0.5 mt-1 max-w-[180px] leading-tight">
                          ₹{finances.extraAmount.toLocaleString('en-IN')} extra added for {finances.extraDays} days beyond 40-day cycle.
                        </div>
                      )}
                    </td>

                    {/* Paid */}
                    <td className="px-4 py-4 text-emerald-600 font-bold">
                      ₹{activeCycle.paidAmount.toLocaleString('en-IN')}
                    </td>

                    {/* Outstanding */}
                    <td className={`px-4 py-4 font-bold ${finances.pendingAmount > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                      ₹{finances.pendingAmount.toLocaleString('en-IN')}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          rent.status === 'returned'
                            ? 'bg-slate-50 text-slate-500 border border-slate-200'
                            : rent.status === 'overdue' || hasExtra
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {rent.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4">
                      <div className="flex justify-center gap-1.5 items-center flex-wrap">
                        {/* Renew Cycle Button */}
                        {(rent.status === 'active' || rent.status === 'overdue') && onRenewRental && (
                          <button
                            onClick={() => handleOpenRenewModal(rent)}
                            className="text-xs bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1"
                            title="Renew rental for another 40-day cycle"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                            <span>Renew</span>
                          </button>
                        )}

                        {/* Return Action */}
                        {(rent.status === 'active' || rent.status === 'overdue') && onInitiateReturn && (
                          <button
                            onClick={() => onInitiateReturn(rent)}
                            className="text-xs bg-orange-50 border border-orange-200 hover:bg-orange-100 text-primary font-bold px-2.5 py-1 rounded-lg transition-all"
                            title="Record return intake for this rental"
                          >
                            Return
                          </button>
                        )}

                        {/* View Cycle History Modal Trigger */}
                        <button
                          onClick={() => setHistoryTarget(rent)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                          title="View Cycle Financial History"
                        >
                          <History className="w-4 h-4" />
                        </button>

                        {/* Status Toggle */}
                        {rent.status === 'active' && (
                          <button
                            onClick={() => onUpdateRentalStatus(rent.id, 'overdue')}
                            className="text-[11px] text-rose-600 hover:bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100"
                            title="Mark Overdue"
                          >
                            Overdue
                          </button>
                        )}
                        {rent.status === 'overdue' && (
                          <button
                            onClick={() => onUpdateRentalStatus(rent.id, 'active')}
                            className="text-[11px] text-emerald-600 hover:bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100"
                            title="Mark Active"
                          >
                            Active
                          </button>
                        )}
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
      {renewTarget && (() => {
        const activeCycle = getActiveCycleForRental(renewTarget);
        const { newStartDate, isOverdueRenewal } = determineRenewalStartDate(
          activeCycle.expectedEndDate,
          renewDate
        );
        const newExpectedEndDate = calculateExpectedCycleEndDate(newStartDate, 40);

        // Previous cycle extra days calculations
        const finalizedEndDate = isOverdueRenewal ? renewDate : activeCycle.expectedEndDate;
        const prevFinances = calculateCycleFinances(
          {
            startDate: activeCycle.startDate,
            actualEndDate: finalizedEndDate,
            quantity: activeCycle.quantity,
            dailyRate: activeCycle.dailyRate,
            baseRent: activeCycle.baseRent,
            paidAmount: activeCycle.paidAmount,
            items: renewTarget.items,
          },
          finalizedEndDate
        );

        // New Cycle 40-Day Base Rent
        const newCycleBaseRent =
          renewTarget.items && renewTarget.items.length > 0
            ? renewTarget.items.reduce((sum, it) => sum + it.quantity * it.dailyRate * 40, 0)
            : renewTarget.quantity * renewTarget.dailyRate * 40;

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-scaleUp text-left">
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                    <RotateCw className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-charcoal">
                      Renew 40-Day Rental Cycle
                    </h4>
                    <p className="text-[11px] text-slate-500 font-light">
                      Start Cycle {activeCycle.cycleNumber + 1} for {renewTarget.partyName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setRenewTarget(null)}
                  disabled={isRenewing}
                  className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-5 overflow-y-auto flex-grow">
                {/* Notice Box: Physical Stock Invariant */}
                <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-2xl text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-blue-600" />
                    <span>Physical Stock Remains On-Site</span>
                  </div>
                  <p className="text-blue-700 leading-relaxed font-light">
                    The {renewTarget.quantity} plates of {renewTarget.plateType} remain with{' '}
                    <strong>{renewTarget.partyName}</strong>. Inventory stock counts will remain unchanged.
                  </p>
                </div>

                {/* Renewal Confirmation Date Picker */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Renewal Confirmation Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={renewDate}
                    onChange={(e) => setRenewDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-indigo-600 focus:outline-none px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-800"
                  />
                  <p className="text-[11px] text-slate-400">
                    Rule: If renewed before/on cycle end ({activeCycle.expectedEndDate}), new cycle starts next day ({determineRenewalStartDate(activeCycle.expectedEndDate, renewDate).newStartDate}). If after, starts on confirmation date.
                  </p>
                </div>

                {/* Previous Cycle Finalization Card */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700 pb-2 border-b border-slate-200">
                    <span>Cycle {activeCycle.cycleNumber} Finalization</span>
                    <span className="text-slate-500 font-mono">
                      {activeCycle.startDate} to {finalizedEndDate}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Elapsed Term</span>
                      <span className="font-bold text-slate-700">{prevFinances.elapsedDays} Days</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Extra Days</span>
                      <span className={`font-bold ${prevFinances.extraDays > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                        {prevFinances.extraDays} Days
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Base Rent (40d)</span>
                      <span className="font-bold text-slate-700">₹{activeCycle.baseRent.toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Extra Charge</span>
                      <span className={`font-bold ${prevFinances.extraAmount > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                        ₹{prevFinances.extraAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-xs font-bold">
                    <span className="text-slate-500">Cycle {activeCycle.cycleNumber} Pending Balance:</span>
                    <span className={`text-sm ${prevFinances.pendingAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      ₹{prevFinances.pendingAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Next Cycle (Cycle N+1) Plan */}
                <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-200 space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-indigo-900 pb-2 border-b border-indigo-200/80">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>New Cycle {activeCycle.cycleNumber + 1} (40 Standard Days)</span>
                    </span>
                    <span className="text-indigo-700 font-mono text-xs">
                      {newStartDate} → {newExpectedEndDate}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-indigo-600/80 block text-[10px] uppercase">Selected Start Date</span>
                      <span className="font-bold text-indigo-950 font-mono">{newStartDate}</span>
                    </div>
                    <div>
                      <span className="text-indigo-600/80 block text-[10px] uppercase">Expected 40d End Date</span>
                      <span className="font-bold text-indigo-950 font-mono">{newExpectedEndDate}</span>
                    </div>
                    <div>
                      <span className="text-indigo-600/80 block text-[10px] uppercase">New 40-Day Base Rent</span>
                      <span className="font-black text-indigo-950 text-sm">₹{newCycleBaseRent.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-indigo-700 bg-white/60 p-2.5 rounded-xl border border-indigo-100 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                    <span>Cycle {activeCycle.cycleNumber + 1} will start with ₹0 paid and ₹{newCycleBaseRent.toLocaleString('en-IN')} pending. Financial tracking remains isolated.</span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setRenewTarget(null)}
                  disabled={isRenewing}
                  className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRenew}
                  disabled={isRenewing}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-md hover:shadow-indigo-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RotateCw className={`w-4 h-4 ${isRenewing ? 'animate-spin' : ''}`} />
                  <span>{isRenewing ? 'Processing Renewal...' : 'Confirm 40-Day Renewal'}</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
                    {parties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.mobile})
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
                          value={row.quantity || ''}
                          onChange={(e) =>
                            handleUpdatePlateRow(row.id, 'quantity', Math.max(0, parseInt(e.target.value) || 0))
                          }
                          placeholder="e.g. 100"
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
                          step="0.05"
                          min="0"
                          required
                          value={row.dailyRate}
                          onChange={(e) =>
                            handleUpdatePlateRow(row.id, 'dailyRate', Math.max(0, parseFloat(e.target.value) || 0))
                          }
                          className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800"
                        />
                      </div>

                      {/* Rental Term */}
                      <div className="lg:col-span-2 space-y-1 sm:space-y-0">
                        <label className="lg:hidden text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                          Rental Term (Days) *
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={row.days}
                          onChange={(e) =>
                            handleUpdatePlateRow(row.id, 'days', Math.max(1, parseInt(e.target.value) || 1))
                          }
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
                      Calculated 40-Day Base Rent
                    </span>
                    <div className="space-y-0.5 text-[11px] text-slate-500 font-mono">
                      {plateRows.map((r, idx) => (
                        <div key={idx}>
                          {r.quantity} plates ({r.plateType}) × ₹{r.dailyRate.toFixed(2)}/day × {r.days} days = ₹{(r.quantity * r.dailyRate * r.days).toLocaleString('en-IN')}
                        </div>
                      ))}
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
                      required
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(Math.max(0, parseFloat(e.target.value) || 0))}
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
                      <option value="Udhari">Outstanding Dues</option>
                      <option value="Account 1">Account 1 (Bank)</option>
                      <option value="Account 2">Account 2 (Digital)</option>
                      <option value="Cash">Yard Drawer Cash</option>
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
    </div>
  );
};
