import React, { useState } from 'react';
import {
  RotateCw,
  X,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  IndianRupee,
} from 'lucide-react';
import type { Rental, RentalCycle, PlateStock, RentalItem, Party } from '../../../data/adminMockData';
import {
  calculateCycleFinances,
  determineRenewalStartDate,
  calculateExpectedCycleEndDate,
  STANDARD_PLATE_SIZES,
  type PlateSizeType,
} from '../../../lib/supabase';

export interface RenewPaymentPayload {
  amount: number;
  paymentMode: 'Cash' | 'Account 1' | 'Account 2';
  date: string;
  reference?: string;
  notes?: string;
}

interface RenewRentalModalProps {
  rental: Rental;
  activeCycle: RentalCycle;
  plates: PlateStock[];
  rentalCycles?: RentalCycle[];
  party?: Party;
  onClose: () => void;
  onConfirm: (
    rentalId: string,
    renewalConfirmationDate: string,
    newItems: RentalItem[],
    renewDays: number,
    payment?: RenewPaymentPayload,
    penalty?: number
  ) => Promise<void>;
}

export const RenewRentalModal: React.FC<RenewRentalModalProps> = ({
  rental,
  activeCycle,
  plates,
  rentalCycles = [],
  party,
  onClose,
  onConfirm,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const initialDays = activeCycle.days && activeCycle.days > 0 ? activeCycle.days : 40;

  const [renewDate, setRenewDate] = useState<string>(todayStr);
  const [renewDays, setRenewDays] = useState<number>(initialDays);
  const [daysInputStr, setDaysInputStr] = useState<string>(String(initialDays));
  const [isRenewing, setIsRenewing] = useState(false);
  const [validationError, setValidationError] = useState<string>('');

  // Payment Collection States (Accept money on renewal)
  const [collectedPayment, setCollectedPayment] = useState<number>(0);
  const [penaltyAmount, setPenaltyAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Account 1' | 'Account 2'>('Cash');
  const [paymentDate, setPaymentDate] = useState<string>(todayStr);
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  // Extract initial plate items from rental.items or construct fallback from single plateType & quantity
  const initialItems: RentalItem[] = (() => {
    if (rental.items && rental.items.length > 0) {
      return rental.items.map((it) => ({
        plateType: it.plateType,
        quantity: it.quantity,
        dailyRate: it.dailyRate || plates.find((p) => p.plateType === it.plateType)?.dailyRate || 1.5,
        days: renewDays,
      }));
    }
    return [
      {
        plateType: rental.plateType as PlateSizeType,
        quantity: rental.quantity,
        dailyRate: rental.dailyRate || plates.find((p) => p.plateType === rental.plateType)?.dailyRate || 1.5,
        days: renewDays,
      },
    ];
  })();

  // State for editable New Cycle Plate items
  const [renewItems, setRenewItems] = useState<RentalItem[]>(initialItems);
  const [isAddingPlate, setIsAddingPlate] = useState(false);
  const [newPlateSize, setNewPlateSize] = useState<PlateSizeType>('21×3');
  const [newPlateQty, setNewPlateQty] = useState<number>(10);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Previous cycle date finalization evaluation
  const { newStartDate, isOverdueRenewal } = determineRenewalStartDate(
    activeCycle.expectedEndDate,
    renewDate
  );
  const newExpectedEndDate = calculateExpectedCycleEndDate(newStartDate, renewDays);
  const finalizedEndDate = isOverdueRenewal ? renewDate : activeCycle.expectedEndDate;

  const prevFinances = calculateCycleFinances(
    {
      startDate: activeCycle.startDate,
      actualEndDate: finalizedEndDate,
      quantity: activeCycle.quantity,
      dailyRate: activeCycle.dailyRate,
      baseRent: activeCycle.baseRent,
      paidAmount: activeCycle.paidAmount,
      days: activeCycle.days || 40,
      items: rental.items,
    },
    finalizedEndDate
  );

  // Helper to find previous cycle quantity for a specific plate type in this rental
  const getPreviousQtyForPlateType = (plateSize: string): number => {
    if (rental.items && rental.items.length > 0) {
      const match = rental.items.find((it) => it.plateType === plateSize);
      return match ? match.quantity : 0;
    }
    return rental.plateType === plateSize ? rental.quantity : 0;
  };

  // Live recalculation of New Cycle Base Rent using configurable rates and selected renewal days
  const totalNewPlatesCount = renewItems.reduce((sum, it) => sum + Number(it.quantity || 0), 0);
  const newCycleBaseRent = renewItems.reduce(
    (sum, it) => sum + Number(it.quantity || 0) * Number(it.dailyRate || 1.5) * renewDays,
    0
  );

  // Handle Manual Days typing (allows freely clearing, backspacing, typing any number)
  const handleManualDaysInputChange = (val: string) => {
    setDaysInputStr(val);
    setValidationError('');
    if (val === '') {
      return; // Allow temporary empty state while typing
    }
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0) {
      const clamped = Math.min(365, parsed);
      setRenewDays(clamped);
    }
  };

  // Handle blur on Manual Days input (ensures valid fallback if left blank)
  const handleManualDaysInputBlur = () => {
    const parsed = parseInt(daysInputStr, 10);
    if (isNaN(parsed) || parsed < 1) {
      const fallback = 40;
      setRenewDays(fallback);
      setDaysInputStr(String(fallback));
    } else {
      const clamped = Math.min(365, Math.max(1, parsed));
      setRenewDays(clamped);
      setDaysInputStr(String(clamped));
    }
  };

  // Update quantity for an existing plate item in renewal list
  const handleItemQtyChange = (index: number, newQty: number) => {
    setValidationError('');
    setRenewItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, quantity: Math.max(0, newQty) } : item))
    );
  };

  // Remove a plate item row from renewal list
  const handleRemoveItem = (index: number) => {
    setValidationError('');
    if (renewItems.length <= 1) {
      setValidationError('At least one plate size is required for renewal.');
      return;
    }
    setRenewItems((prev) => prev.filter((_, idx) => idx !== index));
    if (editingIndex === index) setEditingIndex(null);
  };

  // Handle adding a new plate type to renewal list
  const handleConfirmAddPlate = () => {
    setValidationError('');
    if (newPlateQty <= 0) {
      setValidationError('Please enter a quantity greater than 0.');
      return;
    }

    // Check if plate type already exists in renewal list
    const existingIndex = renewItems.findIndex((it) => it.plateType === newPlateSize);
    if (existingIndex >= 0) {
      setRenewItems((prev) =>
        prev.map((item, idx) =>
          idx === existingIndex ? { ...item, quantity: item.quantity + newPlateQty } : item
        )
      );
    } else {
      const matchedPlate = plates.find((p) => p.plateType === newPlateSize);
      const dailyRate = matchedPlate ? matchedPlate.dailyRate : 1.5;
      setRenewItems((prev) => [
        ...prev,
        {
          plateType: newPlateSize,
          quantity: newPlateQty,
          dailyRate,
          days: renewDays,
        },
      ]);
    }

    setIsAddingPlate(false);
    setNewPlateQty(10);
  };

  // Confirm Renewal execution with strict validation
  const handleSubmitRenewal = async () => {
    setValidationError('');

    const effectiveDays = parseInt(daysInputStr, 10) || renewDays;
    if (effectiveDays <= 0) {
      setValidationError('Please enter a valid rental renewal period (at least 1 day).');
      return;
    }

    if (renewItems.length === 0 || totalNewPlatesCount <= 0) {
      setValidationError('Must have at least one plate in the renewal cycle with quantity > 0.');
      return;
    }

    // Validate per-plate-type inventory availability
    for (const item of renewItems) {
      if (item.quantity <= 0) {
        setValidationError(`Quantity for ${item.plateType} must be greater than 0.`);
        return;
      }

      const prevQty = getPreviousQtyForPlateType(item.plateType);
      const diff = item.quantity - prevQty;

      if (diff > 0) {
        const matchedStock = plates.find((p) => p.plateType === item.plateType);
        const availableStock = matchedStock ? matchedStock.available : 0;
        if (diff > availableStock) {
          setValidationError(
            `Only ${availableStock} plates are currently available for size ${item.plateType}. Additional ${diff} plates requested.`
          );
          return;
        }
      }
    }

    try {
      setIsRenewing(true);
      const finalItemsWithDays: RentalItem[] = renewItems.map((it) => ({
        ...it,
        days: effectiveDays,
      }));
      await onConfirm(
        rental.id,
        renewDate,
        finalItemsWithDays,
        effectiveDays,
        collectedPayment > 0
          ? {
              amount: collectedPayment,
              paymentMode,
              date: paymentDate || renewDate,
              reference: paymentReference.trim() || undefined,
              notes: (paymentNotes.trim() ? `${paymentNotes.trim()}` : 'Renewal payment') + (penaltyAmount > 0 ? ` (Incl. Penalty ₹${penaltyAmount})` : ''),
            }
          : undefined,
        penaltyAmount > 0 ? penaltyAmount : undefined
      );
      onClose();
    } catch (err: any) {
      setValidationError(err?.message || 'Failed to complete renewal.');
    } finally {
      setIsRenewing(false);
    }
  };

  // 1. Calculate pending due from all earlier completed cycles (Cycle 1 to Cycle N-1)
  const allRelatedCycles = rentalCycles && rentalCycles.length > 0
    ? rentalCycles
    : (rental.cycles || []);

  const earlierCycles = allRelatedCycles.filter(
    (c) => c.id !== activeCycle.id && c.cycleNumber < activeCycle.cycleNumber
  );

  const earlierCyclesDue = earlierCycles.reduce((sum, c) => {
    const cycDue = typeof c.pendingAmount === 'number'
      ? c.pendingAmount
      : Math.max(0, (c.totalAmount || c.baseRent || 0) - (c.paidAmount || 0));
    return sum + Math.max(0, cycDue);
  }, 0);

  const activeCycleDue = Math.max(0, prevFinances.pendingAmount);
  const calculatedAllPrevDue = earlierCyclesDue + activeCycleDue;

  // Canonical previous pending bill for this rental's cycles
  // Strictly uses calculatedAllPrevDue (prior cycles + active cycle remaining due)
  const allPreviousPendingDue = calculatedAllPrevDue > 0
    ? calculatedAllPrevDue
    : (allRelatedCycles.length === 0 && (activeCycle.baseRent || 0) === 0 ? Math.max(0, rental.pending || 0) : 0);

  // Total Account Due = Previous All-time Pending + New Cycle Rent + Penalty
  const totalAccountDue = allPreviousPendingDue + newCycleBaseRent + (penaltyAmount || 0);

  // Payment allocations order: 1. Previous All Dues -> 2. Penalty -> 3. New Cycle Advance
  const prevCyclePaymentAllocation = Math.min(collectedPayment || 0, allPreviousPendingDue);
  const remainingAfterPrev = Math.max(0, (collectedPayment || 0) - prevCyclePaymentAllocation);
  const penaltyPaymentAllocation = Math.min(remainingAfterPrev, penaltyAmount || 0);
  const newCycleAdvanceAllocation = Math.max(0, remainingAfterPrev - penaltyPaymentAllocation);

  const remainingPrevDue = Math.max(0, allPreviousPendingDue - prevCyclePaymentAllocation);
  const remainingPenalty = Math.max(0, (penaltyAmount || 0) - penaltyPaymentAllocation);
  const remainingNewCycleDue = Math.max(0, newCycleBaseRent - newCycleAdvanceAllocation);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full max-h-[94vh] flex flex-col overflow-hidden shadow-2xl animate-scaleUp text-left">
        {/* Modal Header */}
        <div className="px-6 py-4 sm:py-5 border-b border-slate-100 flex justify-between items-center bg-indigo-50/60 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl shadow-xs">
              <RotateCw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-slate-900">
                  Renew Rental Cycle / मुदत वाढवा
                </h4>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                  Cycle {activeCycle.cycleNumber + 1}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Customer: <span className="font-bold text-slate-700">{party?.name || rental.partyName}</span>
                {party?.mobile ? <span className="text-slate-400 font-normal"> ({party.mobile})</span> : null} (ID: #{rental.id.slice(-5).toUpperCase()})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isRenewing}
            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-grow">
          {/* Validation Error Banner */}
          {validationError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-2xl text-xs flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span className="font-bold">{validationError}</span>
            </div>
          )}

          {/* SECTION 1: CLEAN RENEWAL DATE & MANUAL DAYS */}
          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/90 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Renewal Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Renewal Date (नोंद दिनांक) *
                </label>
                <input
                  type="date"
                  required
                  value={renewDate}
                  onChange={(e) => {
                    setRenewDate(e.target.value);
                    setValidationError('');
                  }}
                  className="w-full bg-white border border-slate-200 focus:border-indigo-600 focus:outline-none px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-800 shadow-xs"
                />
              </div>

              {/* Renewal Days (Direct Manual Entry) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Rental Days (मुदत दिवस) *
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    required
                    value={daysInputStr}
                    onChange={(e) => handleManualDaysInputChange(e.target.value)}
                    onBlur={handleManualDaysInputBlur}
                    placeholder="e.g. 40"
                    className="w-full bg-white border border-slate-200 focus:border-indigo-600 focus:outline-none px-4 py-2.5 rounded-xl text-sm font-bold text-slate-900 pr-16 shadow-xs"
                  />
                  <span className="absolute right-3.5 text-xs font-bold text-slate-400 pointer-events-none">
                    Days
                  </span>
                </div>
              </div>
            </div>

            {/* Clean Period Info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200/70 gap-1 font-medium">
              <span>
                New Cycle Period: <span className="font-semibold text-slate-800 font-mono">{newStartDate}</span> to <span className="font-semibold text-slate-800 font-mono">{newExpectedEndDate}</span>
              </span>
              <span className="font-bold text-indigo-700">
                Cycle {activeCycle.cycleNumber + 1} ({renewDays} Days)
              </span>
            </div>
          </div>

          {/* SECTION 2: NEW CYCLE PLATES (Edit / Add / Remove) */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/90 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                New Cycle Plates / साहित्याची यादी
              </span>
              <span className="text-[11px] text-slate-500 font-bold">
                Total: {totalNewPlatesCount} Plates ({renewDays} Days)
              </span>
            </div>

            {/* List of Plate Rows */}
            <div className="space-y-2">
              {renewItems.map((item, idx) => {
                const prevQty = getPreviousQtyForPlateType(item.plateType);
                const diff = item.quantity - prevQty;
                const isEditing = editingIndex === idx;
                const rowTotal = Number(item.quantity || 0) * Number(item.dailyRate || 1.5) * renewDays;

                return (
                  <div
                    key={item.plateType}
                    className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {item.plateType}
                      </span>

                      {/* Current / Prev vs New Qty Display */}
                      {!isEditing ? (
                        <div className="text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{item.quantity} Plates</span>
                            <span className="text-slate-400 font-normal">•</span>
                            <span className="text-slate-600 font-medium">₹{item.dailyRate}/day</span>
                            <span className="text-slate-400 font-normal">•</span>
                            <span className="font-bold text-indigo-900">
                              ₹{rowTotal.toLocaleString('en-IN')} ({renewDays}d)
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 block font-mono">
                            Prev: {prevQty} {diff > 0 ? `(+${diff} new)` : diff < 0 ? `(${diff} released)` : '(no change)'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">Current: {prevQty} → New:</span>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemQtyChange(idx, Number(e.target.value))}
                            className="w-20 bg-slate-50 border border-indigo-300 focus:border-indigo-600 focus:outline-none px-2 py-1 rounded-lg text-xs font-bold text-slate-900"
                          />
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {!isEditing ? (
                        <button
                          type="button"
                          onClick={() => setEditingIndex(idx)}
                          className="px-2.5 py-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingIndex(null)}
                          className="px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors cursor-pointer"
                        >
                          Done
                        </button>
                      )}

                      {renewItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Remove plate type"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* + Add Plate Section */}
            {!isAddingPlate ? (
              <button
                type="button"
                onClick={() => setIsAddingPlate(true)}
                className="w-full py-2 bg-white hover:bg-indigo-50 border border-dashed border-indigo-300 hover:border-indigo-500 text-indigo-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Plate Size (नवीन प्लेट जोडा)</span>
              </button>
            ) : (
              <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-200 space-y-3">
                <span className="text-xs font-bold text-indigo-900 block">Add New Plate Type</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-indigo-800 uppercase block mb-1">
                      Plate Type
                    </label>
                    <select
                      value={newPlateSize}
                      onChange={(e) => setNewPlateSize(e.target.value as PlateSizeType)}
                      className="w-full bg-white border border-indigo-200 focus:border-indigo-600 focus:outline-none px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      {(plates && plates.length > 0 ? plates.map((p) => p.plateType) : STANDARD_PLATE_SIZES).map((size) => {
                        const matched = plates.find((p) => p.plateType === size);
                        const avail = matched ? matched.available : 0;
                        return (
                          <option key={size} value={size}>
                            {size} (Available: {avail})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-indigo-800 uppercase block mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newPlateQty}
                      onChange={(e) => setNewPlateQty(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-white border border-indigo-200 focus:border-indigo-600 focus:outline-none px-3 py-1 rounded-lg text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingPlate(false)}
                    className="px-3 py-1.5 bg-white text-slate-600 font-semibold rounded-lg text-xs hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmAddPlate}
                    className="px-4 py-1.5 bg-indigo-600 text-white font-bold rounded-lg text-xs hover:bg-indigo-700 cursor-pointer"
                  >
                    Add to Renewal
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: PREVIOUS CYCLE FINALIZATION CARD */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
            <div className="flex justify-between items-center text-xs font-bold text-slate-700 pb-2 border-b border-slate-200">
              <span>Cycle {activeCycle.cycleNumber} Finalization ({activeCycle.days || 40} Days Term)</span>
              <span className="text-slate-500 font-mono text-[11px]">
                {activeCycle.startDate} to {finalizedEndDate}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/70 shadow-2xs">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Elapsed Term</span>
                <span className="font-bold text-slate-800">{prevFinances.elapsedDays} Days</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/70 shadow-2xs">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Extra Days</span>
                <span className={`font-bold ${prevFinances.extraDays > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                  {prevFinances.extraDays} Days
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/70 shadow-2xs">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Base Rent ({activeCycle.days || 40}d)</span>
                <span className="font-bold text-slate-800">₹{activeCycle.baseRent.toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/70 shadow-2xs">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Extra Charge</span>
                <span className={`font-bold ${prevFinances.extraAmount > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                  ₹{prevFinances.extraAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/70 shadow-2xs">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Cycle Rent</span>
                <span className="font-black text-slate-900">₹{prevFinances.totalAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200/70 shadow-2xs">
                <span className="text-emerald-700 block text-[10px] uppercase font-bold">Paid / जमा</span>
                <span className="font-black text-emerald-800 font-mono">₹{(activeCycle.paidAmount || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Clear calculation & remaining balance breakdown */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2.5 border-t border-slate-200 text-xs gap-2">
              <div className="flex items-center gap-1.5 text-slate-500 font-medium text-[11px]">
                <span>हिशोब:</span>
                <span className="font-mono text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                  ₹{prevFinances.totalAmount.toLocaleString('en-IN')} (एकूण) - ₹{(activeCycle.paidAmount || 0).toLocaleString('en-IN')} (जमा)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-700 font-bold">
                  Cycle {activeCycle.cycleNumber} Remaining Due / शिल्लक बाकी:
                </span>
                <span className={`text-base font-black font-mono ${prevFinances.pendingAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  ₹{prevFinances.pendingAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Earlier Cycles Due Breakdown (if cycleNumber > 1) */}
            {earlierCycles.length > 0 && (
              <div className="pt-2 border-t border-slate-200/80 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-600 font-semibold">
                  <span>Earlier Cycles Pending (मागील सायकल येणे बाकी):</span>
                  <span className="font-mono font-bold text-rose-600">₹{earlierCyclesDue.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {earlierCycles.map((c) => {
                    const cPending = typeof c.pendingAmount === 'number'
                      ? c.pendingAmount
                      : Math.max(0, (c.totalAmount || c.baseRent || 0) - (c.paidAmount || 0));
                    return (
                      <span key={c.id} className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded font-mono text-slate-700">
                        Cycle {c.cycleNumber}: Total ₹{(c.totalAmount || c.baseRent || 0).toLocaleString('en-IN')} • Paid <strong className="text-emerald-700">₹{(c.paidAmount || 0).toLocaleString('en-IN')}</strong> • Pending <strong className={cPending > 0 ? 'text-rose-600' : 'text-emerald-600'}>₹{cPending.toLocaleString('en-IN')}</strong>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 4: NEW CYCLE SUMMARY CARD (Dynamic Base Rent Recalculation) */}
          <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-200 space-y-3">
            <div className="flex justify-between items-center text-xs font-bold text-indigo-900 pb-2 border-b border-indigo-200/80">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>New Cycle {activeCycle.cycleNumber + 1} ({renewDays} Days Term)</span>
              </span>
              <span className="text-indigo-700 font-mono text-xs font-bold">
                {newStartDate} → {newExpectedEndDate}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-indigo-600/80 block text-[10px] uppercase">Start Date</span>
                <span className="font-bold text-indigo-950 font-mono">{newStartDate}</span>
              </div>
              <div>
                <span className="text-indigo-600/80 block text-[10px] uppercase">Expected End Date ({renewDays}d)</span>
                <span className="font-bold text-indigo-950 font-mono">{newExpectedEndDate}</span>
              </div>
              <div>
                <span className="text-indigo-600/80 block text-[10px] uppercase">New {renewDays}-Day Base Rent</span>
                <span className="font-black text-indigo-950 text-base">₹{newCycleBaseRent.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="text-[11px] text-indigo-700 bg-white/60 p-2.5 rounded-xl border border-indigo-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span>
                Cycle {activeCycle.cycleNumber + 1} ({renewDays} days) base rent is ₹{newCycleBaseRent.toLocaleString('en-IN')}.
              </span>
            </div>
          </div>

          {/* SECTION 5: PAYMENT & MONEY COLLECTION (रक्कम स्वीकारा / पावती) */}
          <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/90 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 border-b border-emerald-200/80 gap-1.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                  <IndianRupee className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider block">
                    Accept Money on Renewal / रक्कम जमा करा
                  </span>
                  <span className="text-[10px] text-emerald-700 font-medium">
                    (Optional: Clear previous dues and/or collect advance for new cycle)
                  </span>
                </div>
              </div>
              <span className="text-xs font-black text-emerald-900 bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-300 font-mono self-start sm:self-center">
                Total Due: ₹{totalAccountDue.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Dues Breakdown & Penalty Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              {/* Box 1: Previous All-Time Pending Dues */}
              <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block truncate" title="सर्व मागील येणे बाकी">
                    Prev Pending Dues (सर्व बाकी)
                  </span>
                  <span className="text-[9px] text-slate-500 font-medium block truncate">
                    {earlierCyclesDue > 0 ? `Cyc ${activeCycle.cycleNumber}: ₹${activeCycleDue.toLocaleString('en-IN')} • Earlier: ₹${earlierCyclesDue.toLocaleString('en-IN')}` : `Cycle ${activeCycle.cycleNumber} Remaining: ₹${activeCycleDue.toLocaleString('en-IN')}`}
                  </span>
                </div>
                <span className={`font-mono text-sm sm:text-base font-black mt-1 ${allPreviousPendingDue > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                  ₹{allPreviousPendingDue.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Box 2: New Cycle Rent */}
              <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block truncate">
                    Cycle {activeCycle.cycleNumber + 1} Rent (नवीन भाडे)
                  </span>
                  <span className="text-[9px] text-indigo-600 font-medium block">
                    {renewDays} Days Term
                  </span>
                </div>
                <span className="font-mono text-sm sm:text-base font-black text-indigo-900 mt-1">
                  ₹{newCycleBaseRent.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Box 3: Penalty Simple Box (दंड / लेट फी) */}
              <div className="bg-amber-50/90 p-2.5 rounded-xl border border-amber-200/90 shadow-2xs flex flex-col justify-between ring-1 ring-amber-300/60">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-amber-900 font-extrabold uppercase block">
                    Penalty / दंड (₹)
                  </span>
                  {penaltyAmount > 0 && (
                    <button
                      type="button"
                      onClick={() => setPenaltyAmount(0)}
                      className="text-[9px] text-amber-700 hover:text-amber-950 font-bold underline cursor-pointer"
                    >
                      Clear
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

              {/* Box 4: Total Payable */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-300 shadow-2xs flex flex-col justify-between bg-gradient-to-br from-white to-slate-50">
                <div>
                  <span className="text-[10px] text-slate-700 font-black uppercase block truncate">
                    Total Payable (एकूण देय)
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    Prev + Rent{penaltyAmount > 0 ? ' + Penalty' : ''}
                  </span>
                </div>
                <span className="font-mono text-sm sm:text-base font-black text-slate-950 mt-1">
                  ₹{totalAccountDue.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Payment Input with Quick Fill Buttons */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                <label className="font-bold text-emerald-950 uppercase text-[11px]">
                  Payment Amount Collected Now (₹)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {allPreviousPendingDue > 0 && (
                    <button
                      type="button"
                      onClick={() => setCollectedPayment(allPreviousPendingDue)}
                      className="text-[10px] bg-rose-100 hover:bg-rose-200 text-rose-950 font-bold px-2 py-0.5 rounded cursor-pointer transition-all border border-rose-200"
                    >
                      Pay Prev Due (₹{allPreviousPendingDue.toLocaleString('en-IN')})
                    </button>
                  )}
                  {newCycleBaseRent > 0 && (
                    <button
                      type="button"
                      onClick={() => setCollectedPayment(newCycleBaseRent)}
                      className="text-[10px] bg-indigo-100 hover:bg-indigo-200 text-indigo-900 font-bold px-2 py-0.5 rounded cursor-pointer transition-all"
                    >
                      Pay New Rent (₹{newCycleBaseRent.toLocaleString('en-IN')})
                    </button>
                  )}
                  {penaltyAmount > 0 && (
                    <button
                      type="button"
                      onClick={() => setCollectedPayment(newCycleBaseRent + penaltyAmount)}
                      className="text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold px-2 py-0.5 rounded cursor-pointer transition-all border border-amber-200"
                    >
                      Rent + Penalty (₹{(newCycleBaseRent + penaltyAmount).toLocaleString('en-IN')})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setCollectedPayment(totalAccountDue)}
                    className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-0.5 rounded cursor-pointer transition-all shadow-2xs"
                  >
                    Pay Full (₹{totalAccountDue.toLocaleString('en-IN')})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCollectedPayment(0)}
                    className="text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-2 py-0.5 rounded cursor-pointer transition-all"
                  >
                    ₹0 (Unpaid)
                  </button>
                </div>
              </div>

              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-700">
                  <IndianRupee className="w-4 h-4" />
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={collectedPayment || ''}
                  onChange={(e) => setCollectedPayment(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0 (Enter amount if customer is paying now)"
                  className="w-full bg-white border border-emerald-300 focus:border-emerald-600 focus:outline-none pl-9 pr-4 py-2.5 rounded-xl text-sm font-bold text-slate-900 shadow-2xs"
                />
              </div>
            </div>

            {/* Payment Mode, Date, Reference & Notes (shown when collectedPayment > 0) */}
            {collectedPayment > 0 && (
              <div className="space-y-3 pt-1 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 uppercase text-[10px]">Payment Mode / पद्धत *</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['Cash', 'Account 1', 'Account 2'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setPaymentMode(mode)}
                          className={`py-2 px-1 text-center font-bold text-xs rounded-xl border transition-all cursor-pointer ${
                            paymentMode === mode
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50/50'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 uppercase text-[10px]">Payment Date / तारीख *</label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 focus:border-emerald-600 focus:outline-none px-3 py-2 rounded-xl text-xs font-semibold text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 uppercase text-[10px]">Reference / UTR / Cheque # (Optional)</label>
                    <input
                      type="text"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder="e.g. UPI Ref / GPay / Cheque No."
                      className="w-full bg-white border border-slate-200 focus:border-emerald-600 focus:outline-none px-3 py-2 rounded-xl text-xs font-medium text-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 uppercase text-[10px]">Payment Notes / शेरा (Optional)</label>
                    <input
                      type="text"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      placeholder="e.g. Renewal payment / advance"
                      className="w-full bg-white border border-slate-200 focus:border-emerald-600 focus:outline-none px-3 py-2 rounded-xl text-xs font-medium text-slate-800"
                    />
                  </div>
                </div>

                {/* Settlement Distribution Summary */}
                <div className="p-3 bg-white rounded-xl border border-emerald-200 space-y-1.5 text-[11px]">
                  <div className="flex justify-between items-center text-slate-700">
                    <span>Applied to Previous All Dues (मागील येणे बाकी):</span>
                    <span className="font-bold font-mono text-emerald-800">
                      ₹{prevCyclePaymentAllocation.toLocaleString('en-IN')}{' '}
                      {remainingPrevDue === 0 && allPreviousPendingDue > 0 ? (
                        <span className="text-emerald-600 font-bold">(Fully Cleared ✓)</span>
                      ) : remainingPrevDue > 0 ? (
                        <span className="text-rose-600">(Remaining: ₹{remainingPrevDue.toLocaleString('en-IN')})</span>
                      ) : (
                        <span className="text-slate-400 font-normal">(No Prior Due)</span>
                      )}
                    </span>
                  </div>
                  {penaltyAmount > 0 && (
                    <div className="flex justify-between items-center text-amber-900">
                      <span>Applied to Penalty (दंड भरणा):</span>
                      <span className="font-bold font-mono">
                        ₹{penaltyPaymentAllocation.toLocaleString('en-IN')}{' '}
                        {remainingPenalty === 0 ? (
                          <span className="text-emerald-600 font-bold">(Cleared ✓)</span>
                        ) : (
                          <span className="text-rose-600">(Remaining: ₹{remainingPenalty.toLocaleString('en-IN')})</span>
                        )}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-slate-700">
                    <span>Applied to Cycle {activeCycle.cycleNumber + 1} (नवीन भाडे जमा):</span>
                    <span className="font-bold font-mono text-indigo-800">
                      ₹{newCycleAdvanceAllocation.toLocaleString('en-IN')}{' '}
                      {remainingNewCycleDue === 0 ? (
                        <span className="text-emerald-600 font-bold">(Fully Paid ✓)</span>
                      ) : (
                        <span className="text-indigo-600">(Pending: ₹{remainingNewCycleDue.toLocaleString('en-IN')})</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isRenewing}
            className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmitRenewal}
            disabled={isRenewing}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-md hover:shadow-indigo-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <RotateCw className={`w-4 h-4 ${isRenewing ? 'animate-spin' : ''}`} />
            <span>
              {isRenewing
                ? 'Processing Renewal...'
                : collectedPayment > 0
                ? `Confirm Renewal & Collect ₹${collectedPayment.toLocaleString('en-IN')}`
                : `Confirm ${renewDays}-Day Renewal`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
