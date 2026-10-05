import React, { useState, useEffect } from 'react';
import { X, Edit2, AlertCircle, Loader2, Check } from 'lucide-react';
import { STANDARD_PLATE_SIZES, getCustomPlateSizes } from '../../../lib/supabase';
import type { PlateSizeType, InventoryStockItem } from '../../../lib/supabase';
import { getStoredAppLanguage, type AppLanguage } from '../../../utils/appTranslations';

interface EditStockModalProps {
  isOpen: boolean;
  item: InventoryStockItem | null;
  onClose: () => void;
  onUpdateStock: (
    id: string,
    data: {
      plate_size: PlateSizeType;
      quantity: number;
      received_date: string;
      notes?: string;
    }
  ) => Promise<void> | void;
  // Stock validation map: plate_size -> { total: number, withParties: number }
  stockStatsMap: Record<PlateSizeType, { total: number; withParties: number }>;
  appLanguage?: AppLanguage;
}

export const EditStockModal: React.FC<EditStockModalProps> = ({
  isOpen,
  item,
  onClose,
  onUpdateStock,
  stockStatsMap,
  appLanguage,
}) => {
  const isMarathi = (appLanguage || getStoredAppLanguage()) === 'marathi';
  const allSizes = Array.from(new Set([...STANDARD_PLATE_SIZES, ...getCustomPlateSizes()]));
  const [plateSize, setPlateSize] = useState<PlateSizeType>('24×3');
  const [quantity, setQuantity] = useState<string>('');
  const [receivedDate, setReceivedDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (item) {
      setPlateSize(item.plate_size);
      setQuantity(item.quantity.toString());
      setReceivedDate(item.received_date);
      setNotes(item.notes || '');
      setError('');
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsedQty = parseInt(quantity, 10);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setError(
        isMarathi
          ? 'नग संख्या ० पेक्षा जास्त असणे आवश्यक आहे.'
          : 'Quantity must be a positive whole number greater than 0.'
      );
      return;
    }

    if (!receivedDate) {
      setError(isMarathi ? 'कृपया वैध दिनांक निवडा.' : 'Please select a valid date.');
      return;
    }

    // Safety validation against rented plates
    if (plateSize === item.plate_size) {
      const stats = stockStatsMap[plateSize] || { total: 0, withParties: 0 };
      const netTotalAfterChange = stats.total - item.quantity + parsedQty;
      if (netTotalAfterChange < stats.withParties) {
        setError(
          isMarathi
            ? `स्टॉक ${parsedQty} नग पर्यंत कमी करता येत नाही. सध्या ${stats.withParties} प्लेट्स ग्राहकांकडे भाड्याने आहेत. किमान आवश्यक एकूण ${stats.withParties} नग आहे.`
            : `Cannot reduce stock to ${parsedQty} plates. Currently ${stats.withParties} plates of size ${plateSize} are rented out to parties. Minimum required total is ${stats.withParties}.`
        );
        return;
      }
    } else {
      // Plate size changed: Check old size total after removal
      const oldStats = stockStatsMap[item.plate_size] || { total: 0, withParties: 0 };
      const oldNetTotal = oldStats.total - item.quantity;
      if (oldNetTotal < oldStats.withParties) {
        setError(
          isMarathi
            ? `माप बदलता येत नाही. ${item.plate_size} मापाच्या ${oldStats.withParties} प्लेट्स सध्या ग्राहकांकडे आहेत. ही नोंद बदलल्यास केवळ ${oldNetTotal} प्लेट्स शिल्लक राहतील.`
            : `Cannot change size. Size ${item.plate_size} has ${oldStats.withParties} plates rented out. Removing this batch would leave only ${oldNetTotal} plates.`
        );
        return;
      }
    }

    try {
      setIsSubmitting(true);
      await onUpdateStock(item.id, {
        plate_size: plateSize,
        quantity: parsedQty,
        received_date: receivedDate,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || (isMarathi ? 'नोंद अपडेट करता आली नाही.' : 'Failed to update stock entry.'));
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
            <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
              <Edit2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-bold text-charcoal">
                {isMarathi ? 'स्टॉक नोंद दुरुस्त करा' : 'Edit Stock Record'}
              </h4>
              <p className="text-[11px] text-slate-400 font-light">
                {isMarathi
                  ? 'या स्टॉक नोंदीची माहिती अपडेट करा'
                  : 'Update batch parameters for this stock entry'}
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

        {/* Form Body (Scrollable on small phones) */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-grow">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 p-3.5 rounded-xl text-xs sm:text-sm font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* Plate Size */}
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
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={isSubmitting}
              placeholder={isMarathi ? 'उदा. १००' : 'e.g. 100'}
              className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none px-4 py-3 rounded-xl text-sm font-semibold text-slate-800 min-h-[44px]"
            />
          </div>

          {/* Received Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
              {isMarathi ? 'स्टॉक आवक दिनांक *' : 'Stock Received Date *'}
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
              {isMarathi ? 'टीप / नोंद (पर्यायी)' : 'Notes (Optional)'}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              placeholder={isMarathi ? 'उदा. नवीन प्लेट्स खरेदी' : 'e.g. New fabrication batch'}
              className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none px-4 py-2.5 rounded-xl text-sm font-medium text-slate-800 resize-none"
            />
          </div>

          {/* Buttons: Stacked on mobile for easy thumb reach */}
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
                  <span>{isMarathi ? 'जतन होत आहे...' : 'Saving...'}</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{isMarathi ? 'बदल जतन करा' : 'Save Changes'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
