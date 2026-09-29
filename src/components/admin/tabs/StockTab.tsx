import React, { useState } from 'react';
import {
  Layers,
  ShieldCheck,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Search,
  Edit2,
  Trash2,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { STANDARD_PLATE_SIZES } from '../../../lib/supabase';
import type { PlateSizeType, InventoryStockItem } from '../../../lib/supabase';
import type { Rental, ReturnLog, PlateStock } from '../../../data/adminMockData';
import { AddStockModal } from '../modals/AddStockModal';
import { EditStockModal } from '../modals/EditStockModal';
import { DeleteStockConfirmModal } from '../modals/DeleteStockConfirmModal';

import { getStoredAppLanguage, type AppLanguage } from '../../../utils/appTranslations';
import { formatMarathiDate } from '../../../utils/marathiUtils';

interface StockTabProps {
  stockItems: InventoryStockItem[];
  rentals: Rental[];
  returns: ReturnLog[];
  plates: PlateStock[];
  onAddStock: (data: {
    plate_size: PlateSizeType;
    quantity: number;
    received_date: string;
    notes?: string;
  }) => Promise<void>;
  onUpdateStock: (
    id: string,
    data: {
      plate_size: PlateSizeType;
      quantity: number;
      received_date: string;
      notes?: string;
    }
  ) => Promise<void>;
  onDeleteStock: (id: string) => Promise<void>;
  appLanguage?: AppLanguage;
}

export const StockTab: React.FC<StockTabProps> = ({
  stockItems,
  rentals,
  returns,
  plates,
  onAddStock,
  onUpdateStock,
  onDeleteStock,
  appLanguage,
}) => {
  const isMarathi = (appLanguage || getStoredAppLanguage()) === 'marathi';
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryStockItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<InventoryStockItem | null>(null);

  // 1. Calculate With Parties count per plate size from active/overdue rentals and returns
  const calculateWithPartiesForSize = (size: string): number => {
    // Find all rentals that are active or overdue
    const activeRentals = rentals.filter(
      (r) => r.status === 'active' || r.status === 'overdue'
    );

    let count = 0;
    for (const rent of activeRentals) {
      if (rent.items && rent.items.length > 0) {
        const matchingItem = rent.items.find((it) => it.plateType === size);
        if (matchingItem) {
          const returnedForRental = returns
            .filter((ret) => ret.rentalId === rent.id && (ret.plateType === size || !ret.plateType))
            .reduce((sum, ret) => sum + ret.returnedQuantity, 0);
          count += Math.max(0, matchingItem.quantity - returnedForRental);
        }
      } else if (rent.plateType === size) {
        const returnedForRental = returns
          .filter((ret) => ret.rentalId === rent.id)
          .reduce((sum, ret) => sum + ret.returnedQuantity, 0);
        count += Math.max(0, rent.quantity - returnedForRental);
      }
    }
    return count;
  };

  // 2. Build per-size stock breakdown map from actual inventory stock records
  const allStockSizes: PlateSizeType[] = React.useMemo(() => {
    const list: string[] = [...STANDARD_PLATE_SIZES];
    plates.forEach((p) => {
      if (!list.includes(p.plateType)) list.push(p.plateType);
    });
    stockItems.forEach((s) => {
      if (!list.includes(s.plate_size)) list.push(s.plate_size);
    });
    return list as PlateSizeType[];
  }, [plates, stockItems]);

  const sizeBreakdown = allStockSizes.map((size) => {
    const totalStockForSize = stockItems
      .filter((item) => item.plate_size === size)
      .reduce((sum, item) => sum + item.quantity, 0);

    const withPartiesForSize = calculateWithPartiesForSize(size);
    const availableForSize = Math.max(0, totalStockForSize - withPartiesForSize);

    // Matching rate from plates if set
    const matchedPlate = plates.find((p) => p.plateType === size);
    const dailyRate = matchedPlate?.dailyRate || 1.5;

    return {
      plateType: size,
      total: totalStockForSize,
      withParties: withPartiesForSize,
      available: availableForSize,
      dailyRate,
    };
  });

  // Stock stats map for validation in modals
  const stockStatsMap: Record<PlateSizeType, { total: number; withParties: number }> =
    sizeBreakdown.reduce((acc, row) => {
      acc[row.plateType as PlateSizeType] = {
        total: row.total,
        withParties: row.withParties,
      };
      return acc;
    }, {} as Record<PlateSizeType, { total: number; withParties: number }>);

  // 3. Global aggregate stats
  const totalStock = sizeBreakdown.reduce((sum, p) => sum + p.total, 0);
  const totalWithParties = sizeBreakdown.reduce((sum, p) => sum + p.withParties, 0);
  const totalAvailable = Math.max(0, totalStock - totalWithParties);

  // 4. Combined Transaction History for Activity Feed
  interface ActivityEntry {
    id: string;
    date: string;
    plateSize: string;
    quantityChange: number;
    type: 'stock_add' | 'rental' | 'return';
    title: string;
    notes?: string;
    rawStockItem?: InventoryStockItem;
  }

  const stockActivities: ActivityEntry[] = stockItems.map((item) => ({
    id: item.id,
    date: item.received_date,
    plateSize: item.plate_size,
    quantityChange: item.quantity,
    type: 'stock_add',
    title: 'Stock Added',
    notes: item.notes || 'Batch received in yard',
    rawStockItem: item,
  }));

  const rentalActivities: ActivityEntry[] = rentals.map((r) => ({
    id: `rent-act-${r.id}`,
    date: r.issueDate,
    plateSize: r.plateType,
    quantityChange: -r.quantity,
    type: 'rental',
    title: `Rental • ${r.partyName}`,
    notes: `${r.days} Days @ ₹${r.dailyRate}/day`,
  }));

  const returnActivities: ActivityEntry[] = returns.map((ret) => ({
    id: `ret-act-${ret.id}`,
    date: ret.returnDate,
    plateSize: ret.plateType,
    quantityChange: ret.returnedQuantity,
    type: 'return',
    title: `Return • ${ret.partyName}`,
    notes: `Returned to stockyard`,
  }));

  const allActivities: ActivityEntry[] = [
    ...stockActivities,
    ...rentalActivities,
    ...returnActivities,
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredStockItems = stockItems.filter(
    (item) =>
      item.plate_size.includes(searchTerm) ||
      item.received_date.includes(searchTerm) ||
      (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8 text-left">
      {/* Top Action & Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-extrabold text-charcoal tracking-tight flex items-center gap-2">
            Plate Stock Management
            <span className="text-xs bg-orange-100 text-primary font-bold px-2.5 py-0.5 rounded-full">
              Live Database
            </span>
          </h3>
          <p className="text-xs text-slate-500 font-light mt-0.5">
            Real-time centering plates inventory and warehouse dispatch tracking
          </p>
        </div>

        {/* Add Stock Button */}
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-primary hover:bg-primary-dark text-white font-bold px-5 py-3 rounded-xl shadow-md hover:shadow-orange-500/10 flex items-center justify-center gap-2 text-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Stock</span>
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Total Inventory Stock */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between hover:border-slate-300 transition-all">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Inventory Stock
            </span>
            <h3 className="text-3xl font-black text-charcoal">{totalStock.toLocaleString()}</h3>
            <p className="text-[10px] text-slate-400 font-light">
              Centering plates in permanent stock
            </p>
          </div>
          <div className="p-3 bg-slate-100 rounded-xl text-slate-700">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Available in Yard */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between hover:border-emerald-200 transition-all">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Available in Yard
            </span>
            <h3 className="text-3xl font-black text-emerald-600">
              {totalAvailable.toLocaleString()}
            </h3>
            <p className="text-[10px] text-emerald-500 font-medium">Ready for dispatch</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        {/* With Parties */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between hover:border-orange-200 transition-all">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              With Parties
            </span>
            <h3 className="text-3xl font-black text-primary">
              {totalWithParties.toLocaleString()}
            </h3>
            <p className="text-[10px] text-slate-400 font-light">Active at customer sites</p>
          </div>
          <div className="p-3 bg-orange-50 rounded-xl text-primary">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Stock Breakdown by Plate Size Table */}
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div>
            <h4 className="text-base font-bold text-charcoal">
              Stock Breakdown by Plate Size
            </h4>
            <p className="text-[11px] text-slate-400 font-light">
              Current yard inventory and rental allocation per dimensions
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {sizeBreakdown.length} Total Sizes
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="px-6 py-4">Plate Size</th>
                <th className="px-6 py-4">Total Stock</th>
                <th className="px-6 py-4">With Parties</th>
                <th className="px-6 py-4">Available</th>
                <th className="px-6 py-4">Inventory Ratio</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-light">
              {sizeBreakdown.map((row) => {
                // Safe percentage calculation: Fix NaN% when total is 0
                const availablePercent =
                  row.total > 0 ? (row.available / row.total) * 100 : 0;
                const availabilityRatio = row.total > 0 ? row.available / row.total : 0;

                // Color and status calculation
                let meterColor = 'bg-emerald-500';
                let statusLabel = 'Good Stock';
                let statusIcon = <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
                let textClass = 'text-emerald-700';
                let bgClass = 'bg-emerald-50';

                if (row.total === 0) {
                  meterColor = 'bg-slate-200';
                  statusLabel = 'No Stock';
                  statusIcon = <XCircle className="w-4 h-4 text-slate-400" />;
                  textClass = 'text-slate-500';
                  bgClass = 'bg-slate-100';
                } else if (row.available === 0) {
                  meterColor = 'bg-rose-500';
                  statusLabel = 'Out of Stock';
                  statusIcon = <XCircle className="w-4 h-4 text-rose-500" />;
                  textClass = 'text-rose-700';
                  bgClass = 'bg-rose-50';
                } else if (availabilityRatio < 0.2) {
                  meterColor = 'bg-rose-500';
                  statusLabel = 'Low Stock';
                  statusIcon = <AlertTriangle className="w-4 h-4 text-rose-500" />;
                  textClass = 'text-rose-700';
                  bgClass = 'bg-rose-50';
                } else if (availabilityRatio < 0.4) {
                  meterColor = 'bg-amber-500';
                  statusLabel = 'Warning';
                  statusIcon = <AlertTriangle className="w-4 h-4 text-amber-500" />;
                  textClass = 'text-amber-700';
                  bgClass = 'bg-amber-50';
                }

                return (
                  <tr key={row.plateType} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800 font-mono">
                      {row.plateType}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">{row.total}</td>
                    <td className="px-6 py-4 text-slate-500">{row.withParties}</td>
                    <td className="px-6 py-4 font-bold text-emerald-600">{row.available}</td>

                    {/* Visual Meter Bar - Safe from NaN% */}
                    <td className="px-6 py-4 min-w-[170px]">
                      <div className="space-y-1">
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${Math.min(100, Math.max(0, availablePercent))}%` }}
                            className={`h-full ${meterColor} transition-all duration-300`}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {row.total === 0
                            ? 'No stock added yet'
                            : `${availablePercent.toFixed(0)}% available in yard`}
                        </span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${bgClass} ${textClass}`}
                        >
                          {statusIcon}
                          {statusLabel}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Transaction History & Recent Additions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Recent Stock Additions with Edit & Delete */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h4 className="text-base font-bold text-charcoal">Recent Stock Additions</h4>
              <p className="text-[11px] text-slate-400 font-light">
                Batches added into yard inventory (Manage & Edit)
              </p>
            </div>

            {/* Quick search input for additions */}
            <div className="relative w-full sm:w-48">
              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter additions..."
                className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none pl-8 pr-3 py-1.5 rounded-lg text-xs font-medium"
              />
            </div>
          </div>

          <div className="overflow-x-auto flex-grow">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                  <th className="px-6 py-3.5">{isMarathi ? 'दिनांक' : 'Date'}</th>
                  <th className="px-6 py-3.5">{isMarathi ? 'माप' : 'Size'}</th>
                  <th className="px-6 py-3.5">{isMarathi ? 'नग' : 'Quantity'}</th>
                  <th className="px-6 py-3.5">{isMarathi ? 'नोंद' : 'Notes'}</th>
                  <th className="px-6 py-3.5 text-center">{isMarathi ? 'कृती' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-light">
                {filteredStockItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3.5 text-slate-500 font-mono text-xs">
                      {formatMarathiDate(item.received_date)}
                    </td>
                    <td className="px-6 py-3.5 font-bold text-slate-800 font-mono text-xs">
                      {item.plate_size}
                    </td>
                    <td className="px-6 py-3.5 font-black text-emerald-600">
                      +{item.quantity}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 text-xs truncate max-w-[150px]">
                      {item.notes || '—'}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setEditingItem(item)}
                          className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"
                          title="Edit Stock Entry"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingItem(item)}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                          title="Delete Stock Entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {stockItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-light">
                      <div className="max-w-xs mx-auto space-y-2">
                        <Sparkles className="w-6 h-6 text-slate-300 mx-auto" />
                        <p className="text-xs">No stock records added yet.</p>
                        <button
                          onClick={() => setIsAddModalOpen(true)}
                          className="text-xs text-primary font-bold underline hover:text-primary-dark"
                        >
                          + Add your first stock batch
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : filteredStockItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400 text-xs italic">
                      No stock additions matching "{searchTerm}".
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Combined Transaction Activity Feed (Additions, Rentals, Returns) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <h4 className="text-base font-bold text-charcoal flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Stock Activity & Yard Flow
            </h4>
            <p className="text-[11px] text-slate-400 font-light">
              Combined ledger of additions, dispatches, and returns
            </p>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[380px] flex-grow">
            {allActivities.slice(0, 10).map((act) => {
              let badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-100';
              let icon = <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />;
              let qtyColor = 'text-emerald-600';

              if (act.type === 'rental') {
                badgeBg = 'bg-orange-50 text-primary border-orange-100';
                icon = <ArrowUpRight className="w-3.5 h-3.5 text-primary" />;
                qtyColor = 'text-primary';
              } else if (act.type === 'return') {
                badgeBg = 'bg-blue-50 text-blue-700 border-blue-100';
                icon = <RotateCcw className="w-3.5 h-3.5 text-blue-600" />;
                qtyColor = 'text-blue-600';
              }

              return (
                <div
                  key={act.id}
                  className="p-4 hover:bg-slate-50/50 transition-colors flex items-center justify-between text-left"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl border ${badgeBg} mt-0.5`}>{icon}</div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-800">{act.title}</p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {act.plateSize} • {act.notes}
                      </p>
                      <span className="text-[10px] text-slate-400 block font-mono">{formatMarathiDate(act.date)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-black ${qtyColor}`}>
                      {act.quantityChange > 0 ? `+${act.quantityChange}` : act.quantityChange}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-light">plates</span>
                  </div>
                </div>
              );
            })}

            {allActivities.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs italic">
                No activity recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Stock Modal */}
      <AddStockModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddStock={onAddStock}
      />

      {/* Edit Stock Modal */}
      <EditStockModal
        isOpen={Boolean(editingItem)}
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onUpdateStock={onUpdateStock}
        stockStatsMap={stockStatsMap}
      />

      {/* Delete Stock Confirmation Modal */}
      <DeleteStockConfirmModal
        isOpen={Boolean(deletingItem)}
        item={deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirmDelete={onDeleteStock}
        stockStatsMap={stockStatsMap}
      />
    </div>
  );
};
