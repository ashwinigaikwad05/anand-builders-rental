import React, { useState } from 'react';
import { X, Plus, Layers, AlertCircle, Loader2 } from 'lucide-react';
import { STANDARD_PLATE_SIZES } from '../../../lib/supabase';
import type { PlateSizeType } from '../../../lib/supabase';

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStock: (data: {
    plate_size: PlateSizeType;
    quantity: number;
    received_date: string;
    notes?: string;
  }) => Promise<void> | void;
}

export const AddStockModal: React.FC<AddStockModalProps> = ({
  isOpen,
  onClose,
  onAddStock,
}) => {
  const [plateSize, setPlateSize] = useState<PlateSizeType>('24×3');
  const [quantity, setQuantity] = useState<string>('');
  const [receivedDate, setReceivedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!plateSize) {
      setError('Please select a plate size.');
      return;
    }

    const parsedQty = parseInt(quantity, 10);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setError('Quantity must be a positive whole number greater than 0.');
      return;
    }

    if (!receivedDate) {
      setError('Please select a valid stock received date.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onAddStock({
        plate_size: plateSize,
        quantity: parsedQty,
        received_date: receivedDate,
        notes: notes.trim() || undefined,
      });

      // Reset form on success
      setPlateSize('24×3');
      setQuantity('');
      setReceivedDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setError('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to add stock to database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full overflow-hidden shadow-2xl animate-scaleUp text-left">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-orange-50 rounded-xl text-primary">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-charcoal">Add Shuttering Stock</h4>
              <p className="text-[11px] text-slate-400 font-light">
                Add new centering plates batch to yard inventory
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 p-3.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Plate Size Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
              Plate Size *
            </label>
            <select
              value={plateSize}
              onChange={(e) => setPlateSize(e.target.value as PlateSizeType)}
              required
              disabled={isSubmitting}
              className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none px-4 py-3 rounded-xl text-sm font-semibold text-slate-800"
            >
              {STANDARD_PLATE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size} Width Plate
                </option>
              ))}
            </select>
          </div>

          {/* Quantity Number Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
              Quantity (Plates Count) *
            </label>
            <input
              type="number"
              min="1"
              step="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 500"
              disabled={isSubmitting}
              className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none px-4 py-3 rounded-xl text-sm font-semibold text-slate-800"
            />
            <p className="text-[11px] text-slate-400 font-light">
              Must be a positive whole number.
            </p>
          </div>

          {/* Received Date Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
              Stock Received Date *
            </label>
            <input
              type="date"
              required
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none px-4 py-3 rounded-xl text-sm font-semibold text-slate-800"
            />
          </div>

          {/* Optional Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Purchased from Steel Works, Batch #2"
              disabled={isSubmitting}
              className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none px-4 py-2.5 rounded-xl text-sm font-medium text-slate-800 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl text-sm shadow-md hover:shadow-orange-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Stock...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Add Stock</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
