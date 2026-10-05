import React, { useState } from 'react';
import { Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';
import type { PlateSizeType, InventoryStockItem } from '../../../lib/supabase';
import { formatMarathiDate } from '../../../utils/marathiUtils';
import { getStoredAppLanguage, type AppLanguage } from '../../../utils/appTranslations';

interface DeleteStockConfirmModalProps {
  isOpen: boolean;
  item: InventoryStockItem | null;
  onClose: () => void;
  onConfirmDelete: (id: string) => Promise<void> | void;
  stockStatsMap: Record<PlateSizeType, { total: number; withParties: number }>;
  appLanguage?: AppLanguage;
}

export const DeleteStockConfirmModal: React.FC<DeleteStockConfirmModalProps> = ({
  isOpen,
  item,
  onClose,
  onConfirmDelete,
  stockStatsMap,
  appLanguage,
}) => {
  const isMarathi = (appLanguage || getStoredAppLanguage()) === 'marathi';
  const [error, setError] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  if (!isOpen || !item) return null;

  const stats = stockStatsMap[item.plate_size] || { total: 0, withParties: 0 };
  const wouldViolate = stats.total - item.quantity < stats.withParties;

  const handleDelete = async () => {
    setError('');

    if (wouldViolate) {
      setError(
        isMarathi
          ? `ही स्टॉक नोंद हटवता येत नाही. सध्या ${stats.withParties} प्लेट्स ग्राहकांकडे भाड्याने आहेत. ही ${item.quantity} प्लेट्सची नोंद हटवल्यास केवळ ${stats.total - item.quantity} शिल्लक राहतील.`
          : `Cannot delete this stock entry. Currently ${stats.withParties} plates of size ${item.plate_size} are rented to parties. Deleting this ${item.quantity}-plate batch would leave only ${stats.total - item.quantity} total plates in stock.`
      );
      return;
    }

    try {
      setIsDeleting(true);
      await onConfirmDelete(item.id);
      onClose();
    } catch (err: any) {
      setError(err?.message || (isMarathi ? 'स्टॉक नोंद हटवता आली नाही.' : 'Failed to delete stock entry.'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 max-w-md w-full overflow-hidden shadow-2xl animate-scaleUp text-left">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-rose-50/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-100 text-rose-600 rounded-xl">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-bold text-charcoal">
                {isMarathi ? 'स्टॉक नोंद हटवा' : 'Delete Stock Batch'}
              </h4>
              <p className="text-[11px] text-slate-400 font-light">
                {isMarathi ? 'नोंद हटवण्याची खात्री करा' : 'Confirm stock deletion'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4">
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {isMarathi
              ? 'तुम्हाला खात्री आहे का की ही स्टॉक नोंद तुमच्या इन्व्हेंटरीमधून कायमची हटवायची आहे?'
              : 'Are you sure you want to delete this stock batch from your inventory ledger?'}
          </p>

          <div className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">
                {isMarathi ? 'प्लेट माप:' : 'Plate Size:'}
              </span>
              <span className="font-bold text-slate-800 font-mono text-sm">{item.plate_size}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">
                {isMarathi ? 'कमी होणारी संख्या:' : 'Quantity to Remove:'}
              </span>
              <span className="font-extrabold text-rose-600 font-mono">-{item.quantity} नग</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">
                {isMarathi ? 'आवक दिनांक:' : 'Received Date:'}
              </span>
              <span className="font-semibold text-slate-700 font-mono">
                {formatMarathiDate(item.received_date)}
              </span>
            </div>
            {item.notes && (
              <div className="flex justify-between items-center border-t border-slate-200 pt-2">
                <span className="text-slate-500 font-medium">
                  {isMarathi ? 'टीप:' : 'Notes:'}
                </span>
                <span className="text-slate-700 italic truncate max-w-[200px]">{item.notes}</span>
              </div>
            )}
          </div>

          {wouldViolate && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 sm:p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>{isMarathi ? 'हटवणे अवरोधित:' : 'Deletion Blocked:'}</strong>{' '}
                {isMarathi
                  ? `सध्या ${stats.withParties} प्लेट्स ग्राहकांकडे भाड्याने असल्याने ही नोंद हटवता येत नाही.`
                  : `Deleting this entry would reduce total stock below the ${stats.withParties} plates currently rented out.`}
              </span>
            </div>
          )}

          {error && !wouldViolate && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 p-3.5 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Action buttons: mobile stacked */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-all min-h-[44px] flex items-center justify-center"
            >
              {isMarathi ? 'रद्द करा' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || wouldViolate}
              className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-sm shadow-md hover:shadow-rose-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isMarathi ? 'हटवत आहे...' : 'Deleting...'}</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>{isMarathi ? 'नोंद हटवा' : 'Confirm Delete'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
