import React, { useState } from 'react';
import {
  Edit2,
  Play,
  Square,
  Save,
  X,
  Plus,
  Ruler,
  Trash2,
  AlertCircle,
  Loader2,
  Layers,
} from 'lucide-react';
import type { PlateStock } from '../../../data/adminMockData';

interface PlateTypesTabProps {
  plates: PlateStock[];
  onUpdateRate: (plateType: string, newRate: number) => void;
  onUpdateStatus: (plateType: string, newStatus: 'available' | 'low_stock' | 'out_of_stock') => void;
  onAddPlateType?: (data: { plateType: string; dailyRate: number; initialStock?: number }) => Promise<void>;
  onDeletePlateType?: (plateType: string) => Promise<void>;
}

const STANDARD_SIZES = ['24×3', '21×3', '18×3', '15×3', '12×3', '9×3', '6×3'];

export const PlateTypesTab: React.FC<PlateTypesTabProps> = ({
  plates,
  onUpdateRate,
  onUpdateStatus,
  onAddPlateType,
  onDeletePlateType,
}) => {
  const [editingType, setEditingType] = useState<string | null>(null);
  const [tempRate, setTempRate] = useState<string>('');

  // Add Plate Size Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newPlateType, setNewPlateType] = useState('');
  const [newDailyRate, setNewDailyRate] = useState('1.50');
  const [initialStock, setInitialStock] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirmation
  const [deletingType, setDeletingType] = useState<string | null>(null);

  const handleStartEdit = (plate: PlateStock) => {
    setEditingType(plate.plateType);
    setTempRate(plate.dailyRate.toString());
  };

  const handleSaveEdit = (plateType: string) => {
    const parsed = parseFloat(tempRate);
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdateRate(plateType, parsed);
    }
    setEditingType(null);
  };

  const handleCancelEdit = () => {
    setEditingType(null);
  };

  const handleOpenAddModal = () => {
    setNewPlateType('');
    setNewDailyRate('1.50');
    setInitialStock('');
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    if (isSubmitting) return;
    setIsAddModalOpen(false);
    setFormError('');
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const trimmed = newPlateType.trim();
    if (!trimmed) {
      setFormError('Please enter a valid plate size / dimension.');
      return;
    }

    // Check if plate type already exists
    const exists = plates.some(
      (p) => p.plateType.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      setFormError(`Plate size "${trimmed}" already exists in the system.`);
      return;
    }

    const rateNum = parseFloat(newDailyRate);
    if (isNaN(rateNum) || rateNum < 0) {
      setFormError('Please enter a valid positive daily rate.');
      return;
    }

    const stockNum = initialStock.trim() ? parseInt(initialStock, 10) : 0;
    if (initialStock.trim() && (isNaN(stockNum) || stockNum < 0)) {
      setFormError('Initial stock quantity must be a non-negative number.');
      return;
    }

    if (!onAddPlateType) {
      setFormError('Add plate type feature is not configured.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onAddPlateType({
        plateType: trimmed,
        dailyRate: rateNum,
        initialStock: stockNum > 0 ? stockNum : undefined,
      });
      setIsAddModalOpen(false);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to add plate size.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async (plateType: string) => {
    if (!onDeletePlateType) return;
    try {
      await onDeletePlateType(plateType);
      setDeletingType(null);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete plate size.');
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Top Header with Add Plate Size Button */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-orange-100 text-primary rounded-xl font-bold">
              <Ruler className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-xl font-extrabold text-charcoal tracking-tight">
                Plate Type Settings (प्लेट प्रकार)
              </h3>
              <p className="text-xs text-slate-500 font-light mt-0.5">
                Manage shuttering plate dimensions, custom sizes & daily rental rates
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="bg-primary hover:bg-primary-dark text-white font-bold px-4 py-2.5 rounded-xl shadow-md hover:shadow-orange-500/20 text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Plate Size (नवीन साईझ जोडा)</span>
        </button>
      </div>

      {/* Grid of Plate Type configuration blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {plates.map((plate) => {
          const isStandard = STANDARD_SIZES.includes(plate.plateType);
          const canDelete =
            !isStandard &&
            onDeletePlateType &&
            plate.total === 0 &&
            plate.withParties === 0;

          return (
            <div
              key={plate.plateType}
              className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:border-primary/20 transition-all group relative"
            >
              <div>
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      {isStandard ? 'Standard' : 'Custom'}
                    </span>
                    {!isStandard && (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                        New
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                      plate.status === 'available'
                        ? 'bg-emerald-50 text-emerald-700'
                        : plate.status === 'low_stock'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {plate.status === 'available'
                      ? 'Active'
                      : plate.status === 'low_stock'
                      ? 'Low Stock'
                      : 'Deactivated'}
                  </span>
                </div>

                <h4 className="text-2xl font-black text-charcoal mt-1.5 flex items-baseline gap-1">
                  <span>{plate.plateType}</span>
                  <span className="text-sm font-semibold text-slate-400">Size</span>
                </h4>
                <p className="text-[10px] text-slate-400 font-light mt-0.5">
                  {isStandard
                    ? 'Standard 3-inch outer flat angle'
                    : 'Custom fabricated centering plate'}
                </p>

                {/* Stock Stats Preview */}
                <div className="mt-3 flex items-center justify-between text-[11px] bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 font-medium text-slate-600">
                  <span>
                    Total: <strong className="text-slate-900">{plate.total}</strong>
                  </span>
                  <span>
                    Rented: <strong className="text-amber-700">{plate.withParties}</strong>
                  </span>
                  <span>
                    Avail: <strong className="text-emerald-700">{plate.available}</strong>
                  </span>
                </div>
              </div>

              {/* Rate Section */}
              <div className="border-y border-slate-100 py-3 my-3">
                {editingType === plate.plateType ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">₹</span>
                    <input
                      type="number"
                      step="any"
                      value={tempRate}
                      onChange={(e) => setTempRate(e.target.value)}
                      className="w-20 bg-slate-50 border border-slate-250 px-2 py-1 rounded text-sm text-slate-800 font-bold focus:outline-none focus:border-primary"
                    />
                    <span className="text-xs text-slate-400">/day</span>

                    <button
                      onClick={() => handleSaveEdit(plate.plateType)}
                      className="p-1 hover:bg-emerald-50 text-emerald-600 rounded ml-auto cursor-pointer"
                      title="Save daily rate"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="p-1 hover:bg-slate-100 text-slate-400 rounded cursor-pointer"
                      title="Cancel edit"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Rental Rate</span>
                      <span className="text-lg font-extrabold text-charcoal">
                        ₹{Number(plate.dailyRate || 1.5).toFixed(2)}
                        <span className="text-xs text-slate-400 font-normal">/day</span>
                      </span>
                    </div>
                    <button
                      onClick={() => handleStartEdit(plate)}
                      className="p-2 hover:bg-slate-50 text-slate-500 hover:text-slate-850 rounded-xl transition cursor-pointer"
                      title="Edit rental rate"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Status change actions & optional delete */}
              <div className="flex gap-2 justify-between items-center">
                {canDelete ? (
                  <button
                    type="button"
                    onClick={() => setDeletingType(plate.plateType)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                    title={`Delete custom size ${plate.plateType}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : (
                  <div />
                )}

                <button
                  onClick={() =>
                    onUpdateStatus(
                      plate.plateType,
                      plate.status === 'available' ? 'out_of_stock' : 'available'
                    )
                  }
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                    plate.status === 'available'
                      ? 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                      : 'bg-primary text-white border-primary hover:bg-primary-dark'
                  }`}
                >
                  {plate.status === 'available' ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-current" /> Deactivate
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" /> Activate
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: ADD NEW PLATE SIZE */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full overflow-hidden shadow-2xl animate-scaleUp">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-orange-100 text-primary rounded-xl font-bold">
                  <Ruler className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Add New Plate Size
                  </h3>
                  <p className="text-[11px] text-slate-500">नवीन प्लेट साईझ / प्रकार जोडा</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseAddModal}
                disabled={isSubmitting}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Plate Size Dimension */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Plate Size / Dimensions (साईझ / नाव) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="उदा. 36×2, 30×3, 48×2, 36×3"
                  value={newPlateType}
                  onChange={(e) => setNewPlateType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:bg-white focus:outline-none px-4 py-3 rounded-xl text-sm font-bold text-slate-900"
                  autoFocus
                />
                <p className="text-[11px] text-slate-400">
                  Common shuttering sizes: 24×3, 21×3, 18×3, 15×3, 12×3, 9×3, 6×3, 36×2, 30×3.
                </p>
              </div>

              {/* Default Daily Rental Rate */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Daily Rental Rate (प्रतिदिन भाडे दर ₹/दिवस) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={newDailyRate}
                    onChange={(e) => setNewDailyRate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:bg-white focus:outline-none pl-8 pr-4 py-3 rounded-xl text-sm font-bold text-slate-900"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Standard baseline rate is ₹1.50/day per plate.
                </p>
              </div>

              {/* Initial Yard Stock Batch (Optional) */}
              <div className="space-y-1.5 bg-orange-50/50 border border-orange-200/60 p-3.5 rounded-2xl">
                <label className="text-xs font-bold text-orange-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-primary" />
                  <span>Initial Stock Quantity (सुरुवातीचा स्टॉक - ऐच्छिक)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0 (leave blank if no stock yet)"
                  value={initialStock}
                  onChange={(e) => setInitialStock(e.target.value)}
                  className="w-full bg-white border border-orange-200/80 focus:border-primary focus:outline-none px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-900"
                />
                <p className="text-[10px] text-orange-800/80">
                  Optional: If you already have physical stock of this size in the yard, enter the count to immediately add it to your inventory.
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={handleCloseAddModal}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-primary-dark text-white font-bold px-5 py-2.5 rounded-xl shadow-md hover:shadow-orange-500/20 text-xs flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Add Plate Size (साईझ जोडा)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingType && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl animate-scaleUp space-y-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
                <AlertCircle className="w-5 h-5" />
              </span>
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">
                  Delete Plate Size {deletingType}?
                </h4>
                <p className="text-xs text-slate-500">हा प्लेट प्रकार कायमचा काढायचा आहे का?</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to remove custom size <strong>{deletingType}</strong>? This action cannot be undone.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingType(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDelete(deletingType)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

