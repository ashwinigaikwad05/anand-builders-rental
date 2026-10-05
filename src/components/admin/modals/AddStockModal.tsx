import React, { useState } from 'react';
import { X, Plus, Layers, AlertCircle, Loader2 } from 'lucide-react';
import { STANDARD_PLATE_SIZES, getCustomPlateSizes } from '../../../lib/supabase';
import type { PlateSizeType } from '../../../lib/supabase';
import { getStoredAppLanguage, type AppLanguage } from '../../../utils/appTranslations';

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStock: (data: {
    plate_size: PlateSizeType;
    quantity: number;
    received_date: string;
    notes?: string;
  }) => Promise<void> | void;
  appLanguage?: AppLanguage;
}

export const AddStockModal: React.FC<AddStockModalProps> = ({
  isOpen,
  onClose,
  onAddStock,
  appLanguage,
}) => {
  const isMarathi = (appLanguage || getStoredAppLanguage()) === 'marathi';
  const allSizes = Array.from(new Set([...STANDARD_PLATE_SIZES, ...getCustomPlateSizes()]));
  const [plateSize, setPlateSize] = useState<PlateSizeType>(allSizes[0] || '24×3');
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
      setError(isMarathi ? 'कृपया प्लेट माप निवडा.' : 'Please select a plate size.');
      return;
    }

    const parsedQty = parseInt(quantity, 10);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setError(
        isMarathi
          ? 'संख्या (नग) ० पेक्षा जास्त असणे आवश्यक आहे.'
          : 'Quantity must be a positive whole number greater than 0.'
      );
      return;
    }

    if (!receivedDate) {
      setError(isMarathi ? 'कृपया वैध तारीख निवडा.' : 'Please select a valid stock received date.');
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
      setError(err?.message || (isMarathi ? 'स्टॉक जोडण्यात अडचण आली.' : 'Failed to add stock to database.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-scaleUp text-left">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-orange-50 rounded-xl text-primary">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-bold text-charcoal">
                {isMarathi ? 'नवीन स्टॉक आवक नोंदवा' : 'Add Shuttering Stock'}
              </h4>
              <p className="text-[11px] text-slate-400 font-light">
                {isMarathi
                  ? 'यार्डमध्ये नवीन सेन्टरिंग प्लेट्सची भर टाका'
                  : 'Add new centering plates batch to yard inventory'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body (Scrollable on small mobile screens) */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-grow">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 p-3.5 rounded-xl text-xs sm:text-sm font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* Plate Size Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
              {isMarathi ? 'प्लेट माप (साईझ) *' : 'Plate Size *'}
            </label>
            <select
              value={plateSize}
              onChange={(e) => setPlateSize(e.target.value as PlateSizeType)}
              required
              disabled={isSubmitting}
              className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none px-4 py-3 rounded-xl text-sm font-semibold text-slate-800 min-h-[44px]"
            >
              {allSizes.map((size) => (
                <option key={size} value={size}>
                  {size} {isMarathi ? 'प्लेट' : 'Width Plate'}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
              {isMarathi ? 'संख्या (नग) *' : 'Quantity (Plates Count) *'}
            </label>
            <input
              type="number"
              min="1"
              step="1"
              required
              placeholder={isMarathi ? 'उदा. ५०' : 'e.g. 50'}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none px-4 py-3 rounded-xl text-sm font-semibold text-slate-800 min-h-[44px]"
            />
          </div>

          {/* Received Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
              {isMarathi ? 'आवक दिनांक *' : 'Stock Received Date *'}
            </label>
            <input
              type="date"
              required
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none px-4 py-3 rounded-xl text-sm font-semibold text-slate-800 min-h-[44px]"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
              {isMarathi ? 'टीप / तपशील (पर्यायी)' : 'Notes / Vendor / Invoice (Optional)'}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              placeholder={
                isMarathi
                  ? 'उदा. साई एंटरप्रायझेसकडून खरेदी किंवा रिपेअर झालेला स्टॉक'
                  : 'e.g. Purchased new stock from vendor, batch lot #102'
              }
              className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none px-4 py-2.5 rounded-xl text-sm font-medium text-slate-800 resize-none"
            />
          </div>

          {/* Action Buttons: Full width on mobile for thumb accessibility */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-all min-h-[44px] flex items-center justify-center"
            >
              {isMarathi ? 'रद्द करा' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl text-sm shadow-md hover:shadow-orange-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isMarathi ? 'जतन होत आहे...' : 'Saving Stock...'}</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>{isMarathi ? 'स्टॉक जोडा' : 'Add Stock'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
