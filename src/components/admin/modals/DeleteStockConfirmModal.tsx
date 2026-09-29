import React, { useState } from 'react';
import { Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';
import type { PlateSizeType, InventoryStockItem } from '../../../lib/supabase';
import { formatMarathiDate } from '../../../utils/marathiUtils';

interface DeleteStockConfirmModalProps {
  isOpen: boolean;
  item: InventoryStockItem | null;
  onClose: () => void;
  onConfirmDelete: (id: string) => Promise<void> | void;
  stockStatsMap: Record<PlateSizeType, { total: number; withParties: number }>;
}

export const DeleteStockConfirmModal: React.FC<DeleteStockConfirmModalProps> = ({
  isOpen,
  item,
  onClose,
  onConfirmDelete,
  stockStatsMap,
}) => {
  const [error, setError] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  if (!isOpen || !item) return null;

  const stats = stockStatsMap[item.plate_size] || { total: 0, withParties: 0 };
  const wouldViolate = stats.total - item.quantity < stats.withParties;

  const handleDelete = async () => {
    setError('');

    if (wouldViolate) {
      setError(
        `Cannot delete this stock entry. Currently ${stats.withParties} plates of size ${item.plate_size} are rented to parties. Deleting this ${item.quantity}-plate batch would leave only ${stats.total - item.quantity} total plates in stock.`
      );
      return;
    }

    try {
      setIsDeleting(true);
      await onConfirmDelete(item.id);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete stock entry.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full overflow-hidden shadow-2xl animate-scaleUp text-left">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-rose-50/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-100 text-rose-600 rounded-xl">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-charcoal">Delete Stock Batch</h4>
              <p className="text-[11px] text-slate-400 font-light">Confirm stock deletion</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            Are you sure you want to delete this stock batch from your inventory ledger?
          </p>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Plate Size:</span>
              <span className="font-bold text-slate-800 font-mono">{item.plate_size}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Quantity to Remove:</span>
              <span className="font-extrabold text-rose-600">-{item.quantity} plates</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Received Date:</span>
              <span className="font-semibold text-slate-700 font-mono text-xs">{formatMarathiDate(item.received_date)}</span>
            </div>
            {item.notes && (
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-slate-500 font-medium">Notes:</span>
                <span className="text-slate-700 italic truncate max-w-[200px]">{item.notes}</span>
              </div>
            )}
          </div>

          {wouldViolate && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Deletion Blocked:</strong> Deleting this entry would reduce total stock below the {stats.withParties} plates currently rented out.
              </span>
            </div>
          )}

          {error && !wouldViolate && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 p-3.5 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || wouldViolate}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-sm shadow-md hover:shadow-rose-600/20 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Confirm Delete</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
