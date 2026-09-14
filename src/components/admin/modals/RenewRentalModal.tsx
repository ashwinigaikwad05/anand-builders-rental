import React, { useState } from 'react';
import { RotateCw, X, Plus, Trash2, Edit2, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import type { Rental, RentalCycle, PlateStock, RentalItem } from '../../../data/adminMockData';
import {
  calculateCycleFinances,
  determineRenewalStartDate,
  calculateExpectedCycleEndDate,
  STANDARD_PLATE_SIZES,
  type PlateSizeType,
} from '../../../lib/supabase';

interface RenewRentalModalProps {
  rental: Rental;
  activeCycle: RentalCycle;
  plates: PlateStock[];
  onClose: () => void;
  onConfirm: (
    rentalId: string,
    renewalConfirmationDate: string,
    newItems: RentalItem[]
  ) => Promise<void>;
}

export const RenewRentalModal: React.FC<RenewRentalModalProps> = ({
  rental,
  activeCycle,
  plates,
  onClose,
  onConfirm,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [renewDate, setRenewDate] = useState<string>(todayStr);
  const [isRenewing, setIsRenewing] = useState(false);
  const [validationError, setValidationError] = useState<string>('');

  // Extract initial plate items from rental.items or construct fallback from single plateType & quantity
  const initialItems: RentalItem[] = (() => {
    if (rental.items && rental.items.length > 0) {
      return rental.items.map((it) => ({
        plateType: it.plateType,
        quantity: it.quantity,
        dailyRate: it.dailyRate || plates.find((p) => p.plateType === it.plateType)?.dailyRate || 1.5,
        days: 40,
      }));
    }
    return [
      {
        plateType: rental.plateType as PlateSizeType,
        quantity: rental.quantity,
        dailyRate: rental.dailyRate || plates.find((p) => p.plateType === rental.plateType)?.dailyRate || 1.5,
        days: 40,
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
  const newExpectedEndDate = calculateExpectedCycleEndDate(newStartDate, 40);
  const finalizedEndDate = isOverdueRenewal ? renewDate : activeCycle.expectedEndDate;

  const prevFinances = calculateCycleFinances(
    {
      startDate: activeCycle.startDate,
      actualEndDate: finalizedEndDate,
      quantity: activeCycle.quantity,
      dailyRate: activeCycle.dailyRate,
      baseRent: activeCycle.baseRent,
      paidAmount: activeCycle.paidAmount,
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

  // Live recalculation of New Cycle 40-Day Base Rent using configurable rates
  const totalNewPlatesCount = renewItems.reduce((sum, it) => sum + Number(it.quantity || 0), 0);
  const newCycleBaseRent = renewItems.reduce(
    (sum, it) => sum + Number(it.quantity || 0) * Number(it.dailyRate || 1.5) * 40,
    0
  );

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
      // Update existing row quantity instead of creating duplicate row
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
          days: 40,
        },
      ]);
    }

    setIsAddingPlate(false);
    setNewPlateQty(10);
  };

  // Confirm Renewal execution with strict stock validation
  const handleSubmitRenewal = async () => {
    setValidationError('');

    if (renewItems.length === 0 || totalNewPlatesCount <= 0) {
      setValidationError('Must have at least one plate in the renewal cycle with quantity > 0.');
      return;
    }

    // Validate per-plate-type inventory availability and non-negative quantities
    for (const item of renewItems) {
      if (item.quantity <= 0) {
        setValidationError(`Quantity for ${item.plateType} must be greater than 0.`);
        return;
      }

      const prevQty = getPreviousQtyForPlateType(item.plateType);
      const diff = item.quantity - prevQty;

      // If additional plates are required, verify against available stockyard inventory
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
      await onConfirm(rental.id, renewDate, renewItems);
      onClose();
    } catch (err: any) {
      setValidationError(err?.message || 'Failed to complete renewal.');
    } finally {
      setIsRenewing(false);
    }
  };



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
                Start Cycle {activeCycle.cycleNumber + 1} for {rental.partyName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isRenewing}
            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-grow">
          {/* Validation Error Banner */}
          {validationError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-2xl text-xs flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span className="font-bold">{validationError}</span>
            </div>
          )}

          {/* Renewal Confirmation Date Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Renewal Confirmation Date *
            </label>
            <input
              type="date"
              required
              value={renewDate}
              onChange={(e) => {
                setRenewDate(e.target.value);
                setValidationError('');
              }}
              className="w-full bg-white border border-slate-200 focus:border-indigo-600 focus:outline-none px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-800"
            />
            <p className="text-[11px] text-slate-400">
              Rule: If renewed on/before cycle end ({activeCycle.expectedEndDate}), new cycle starts day after ({newStartDate}). If after, starts on confirmation date.
            </p>
          </div>

          {/* SECTION 1: NEW CYCLE PLATES (Edit / Add / Remove) */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/90 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                New Cycle Plates
              </span>
              <span className="text-[11px] text-slate-500 font-semibold">
                Total: {totalNewPlatesCount} Plates
              </span>
            </div>

            {/* List of Plate Rows */}
            <div className="space-y-2">
              {renewItems.map((item, idx) => {
                const prevQty = getPreviousQtyForPlateType(item.plateType);
                const diff = item.quantity - prevQty;
                const isEditing = editingIndex === idx;

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
                          <span className="font-bold text-slate-800">{item.quantity} Plates</span>
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
                          className="px-2.5 py-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingIndex(null)}
                          className="px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors"
                        >
                          Done
                        </button>
                      )}

                      {renewItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
                className="w-full py-2 bg-white hover:bg-indigo-50 border border-dashed border-indigo-300 hover:border-indigo-500 text-indigo-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Plate</span>
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
                      className="w-full bg-white border border-indigo-200 focus:border-indigo-600 focus:outline-none px-3 py-1.5 rounded-lg text-xs font-semibold"
                    >
                      {STANDARD_PLATE_SIZES.map((size) => {
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
                    className="px-3 py-1.5 bg-white text-slate-600 font-semibold rounded-lg text-xs hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmAddPlate}
                    className="px-4 py-1.5 bg-indigo-600 text-white font-bold rounded-lg text-xs hover:bg-indigo-700"
                  >
                    Add to Renewal
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: PREVIOUS CYCLE FINALIZATION CARD */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
            <div className="flex justify-between items-center text-xs font-bold text-slate-700 pb-2 border-b border-slate-200">
              <span>Cycle {activeCycle.cycleNumber} Finalization</span>
              <span className="text-slate-500 font-mono text-[11px]">
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

          {/* SECTION 3: NEW CYCLE SUMMARY CARD (Dynamic Base Rent Recalculation) */}
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
                <span className="text-indigo-600/80 block text-[10px] uppercase">Start Date</span>
                <span className="font-bold text-indigo-950 font-mono">{newStartDate}</span>
              </div>
              <div>
                <span className="text-indigo-600/80 block text-[10px] uppercase">Expected 40d End Date</span>
                <span className="font-bold text-indigo-950 font-mono">{newExpectedEndDate}</span>
              </div>
              <div>
                <span className="text-indigo-600/80 block text-[10px] uppercase">New 40-Day Base Rent</span>
                <span className="font-black text-indigo-950 text-base">₹{newCycleBaseRent.toLocaleString('en-IN')}</span>
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
            onClick={onClose}
            disabled={isRenewing}
            className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmitRenewal}
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
};
