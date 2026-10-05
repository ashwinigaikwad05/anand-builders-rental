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
  Sparkles,
  Calendar,
} from 'lucide-react';
import { STANDARD_PLATE_SIZES } from '../../../lib/supabase';
import type { PlateSizeType, InventoryStockItem } from '../../../lib/supabase';
import type { Rental, ReturnLog, PlateStock } from '../../../data/adminMockData';
import { AddStockModal } from '../modals/AddStockModal';
import { EditStockModal } from '../modals/EditStockModal';
import { DeleteStockConfirmModal } from '../modals/DeleteStockConfirmModal';

import { getStoredAppLanguage, type AppLanguage } from '../../../utils/appTranslations';
import { formatMarathiDate, formatPartyName, formatPlateType } from '../../../utils/marathiUtils';

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

  // Overall totals across all sizes
  const totalStock = sizeBreakdown.reduce((sum, item) => sum + item.total, 0);
  const totalWithParties = sizeBreakdown.reduce((sum, item) => sum + item.withParties, 0);
  const totalAvailable = sizeBreakdown.reduce((sum, item) => sum + item.available, 0);

  // Safety stats map passed to Edit and Delete modals to prevent reducing stock below rented count
  const stockStatsMap = React.useMemo(() => {
    const map: Record<PlateSizeType, { total: number; withParties: number }> = {} as any;
    sizeBreakdown.forEach((s) => {
      map[s.plateType] = { total: s.total, withParties: s.withParties };
    });
    return map;
  }, [sizeBreakdown]);

  // Combined audit feed of additions, rentals, and returns
  const allActivities = React.useMemo(() => {
    interface ActivityItem {
      id: string;
      date: string;
      type: 'addition' | 'rental' | 'return';
      plateSize: string;
      quantity: number;
      label: string;
      details?: string;
    }

    const list: ActivityItem[] = [];

    stockItems.forEach((item) => {
      list.push({
        id: `stock-${item.id}`,
        date: item.received_date,
        type: 'addition',
        plateSize: item.plate_size,
        quantity: item.quantity,
        label: isMarathi ? 'स्टॉक आवक' : 'Stock Batch Added',
        details: item.notes || (isMarathi ? 'यार्डमध्ये भर' : 'Yard inventory receipt'),
      });
    });

    rentals.forEach((r) => {
      if (r.items && r.items.length > 0) {
        r.items.forEach((it, idx) => {
          list.push({
            id: `rent-${r.id}-${idx}`,
            date: r.issueDate,
            type: 'rental',
            plateSize: formatPlateType(it.plateType, isMarathi ? 'marathi' : 'english'),
            quantity: it.quantity,
            label: isMarathi ? `भाड्याने दिले (${formatPartyName(r.partyName, 'marathi')})` : `Dispatched to ${formatPartyName(r.partyName, 'english')}`,
            details: `Bill #${r.billNumber || r.id.slice(0, 6)}`,
          });
        });
      } else {
        list.push({
          id: `rent-${r.id}`,
          date: r.issueDate,
          type: 'rental',
          plateSize: formatPlateType(r.plateType, isMarathi ? 'marathi' : 'english'),
          quantity: r.quantity,
          label: isMarathi ? `भाड्याने दिले (${formatPartyName(r.partyName, 'marathi')})` : `Dispatched to ${formatPartyName(r.partyName, 'english')}`,
          details: `Bill #${r.billNumber || r.id.slice(0, 6)}`,
        });
      }
    });

    returns.forEach((ret) => {
      list.push({
        id: `ret-${ret.id}`,
        date: ret.returnDate,
        type: 'return',
        plateSize: formatPlateType(ret.plateType || 'Centering Plate', isMarathi ? 'marathi' : 'english'),
        quantity: ret.returnedQuantity,
        label: isMarathi ? 'यार्डमध्ये जमा' : 'Returned to Yard',
        details: isMarathi ? `${formatPartyName(ret.partyName, 'marathi')} कडून परत` : `Received back from ${formatPartyName(ret.partyName, 'english')}`,
      });
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [stockItems, rentals, returns, isMarathi]);

  // Filtered stock additions for left column
  const filteredStockItems = stockItems.filter(
    (item) =>
      item.plate_size.includes(searchTerm) ||
      item.received_date.includes(searchTerm) ||
      (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 sm:space-y-8 text-left">
      {/* Top Action & Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-4">
        <div>
          <h3 className="text-lg sm:text-xl font-extrabold text-charcoal tracking-tight flex items-center gap-2">
            {isMarathi ? 'प्लेट स्टॉक व्यवस्थापन' : 'Plate Stock Management'}
            <span className="text-[10px] sm:text-xs bg-orange-100 text-primary font-bold px-2.5 py-0.5 rounded-full">
              {isMarathi ? 'थेट डेटाबेस' : 'Live Database'}
            </span>
          </h3>
          <p className="text-xs text-slate-500 font-light mt-0.5">
            {isMarathi
              ? 'सेन्टरिंग प्लेट्सची अचूक इन्व्हेंटरी आणि यार्डमधील साहित्याचा हिशोब'
              : 'Real-time centering plates inventory and warehouse dispatch tracking'}
          </p>
        </div>

        {/* Add Stock Button */}
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-primary hover:bg-primary-dark text-white font-bold px-5 py-2.5 sm:py-3 rounded-xl shadow-md hover:shadow-orange-500/10 flex items-center justify-center gap-2 text-sm transition-all min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>{isMarathi ? '+ स्टॉक जमा करा' : '+ Add Stock'}</span>
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
        {/* Total Inventory Stock */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/60 shadow-xs flex items-center justify-between hover:border-slate-300 transition-all">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {isMarathi ? 'एकूण इन्व्हेंटरी स्टॉक' : 'Total Inventory Stock'}
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-charcoal">
              {totalStock.toLocaleString()}
            </h3>
            <p className="text-[10px] text-slate-400 font-light">
              {isMarathi ? 'कायमस्वरूपी नोंद असलेला एकूण साठा' : 'Centering plates in permanent stock'}
            </p>
          </div>
          <div className="p-3 bg-slate-100 rounded-xl text-slate-700">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Available in Yard */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/60 shadow-xs flex items-center justify-between hover:border-emerald-200 transition-all">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {isMarathi ? 'यार्डमध्ये उपलब्ध' : 'Available in Yard'}
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-emerald-600">
              {totalAvailable.toLocaleString()}
            </h3>
            <p className="text-[10px] text-emerald-500 font-medium">
              {isMarathi ? 'भाड्याने देण्यासाठी तयार' : 'Ready for dispatch'}
            </p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        {/* With Parties */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/60 shadow-xs flex items-center justify-between hover:border-orange-200 transition-all">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {isMarathi ? 'ग्राहकांकडे भाड्याने' : 'With Parties'}
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-primary">
              {totalWithParties.toLocaleString()}
            </h3>
            <p className="text-[10px] text-slate-400 font-light">
              {isMarathi ? 'चालू साइट्सवर भाड्याने' : 'Active at customer sites'}
            </p>
          </div>
          <div className="p-3 bg-orange-50 rounded-xl text-primary">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Stock Breakdown by Plate Size */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/60 shadow-xs overflow-hidden">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div>
            <h4 className="text-sm sm:text-base font-bold text-charcoal">
              {isMarathi ? 'मापानुसार स्टॉक विभागणी' : 'Stock Breakdown by Plate Size'}
            </h4>
            <p className="text-[11px] text-slate-400 font-light">
              {isMarathi
                ? 'प्रत्येक मापाच्या प्लेट्सची यार्डमधील उपलब्धता व भाड्याचे प्रमाण'
                : 'Current yard inventory and rental allocation per dimensions'}
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
            {sizeBreakdown.length} {isMarathi ? 'मापे' : 'Sizes'}
          </span>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="px-6 py-4">{isMarathi ? 'प्लेट माप' : 'Plate Size'}</th>
                <th className="px-6 py-4">{isMarathi ? 'एकूण स्टॉक' : 'Total Stock'}</th>
                <th className="px-6 py-4">{isMarathi ? 'पार्टींकडे' : 'With Parties'}</th>
                <th className="px-6 py-4">{isMarathi ? 'उपलब्ध' : 'Available'}</th>
                <th className="px-6 py-4">{isMarathi ? 'उपलब्धता प्रमाण' : 'Inventory Ratio'}</th>
                <th className="px-6 py-4 text-center">{isMarathi ? 'स्थिती' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-light">
              {sizeBreakdown.map((row) => {
                const availablePercent =
                  row.total > 0 ? (row.available / row.total) * 100 : 0;
                const availabilityRatio = row.total > 0 ? row.available / row.total : 0;

                let meterColor = 'bg-emerald-500';
                let statusLabel = isMarathi ? 'उत्तम साठा' : 'Good Stock';
                let statusIcon = <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
                let textClass = 'text-emerald-700';
                let bgClass = 'bg-emerald-50';

                if (row.total === 0) {
                  meterColor = 'bg-slate-200';
                  statusLabel = isMarathi ? 'स्टॉक नाही' : 'No Stock';
                  statusIcon = <XCircle className="w-4 h-4 text-slate-400" />;
                  textClass = 'text-slate-500';
                  bgClass = 'bg-slate-100';
                } else if (row.available === 0) {
                  meterColor = 'bg-rose-500';
                  statusLabel = isMarathi ? 'संपलेला स्टॉक' : 'Out of Stock';
                  statusIcon = <XCircle className="w-4 h-4 text-rose-500" />;
                  textClass = 'text-rose-700';
                  bgClass = 'bg-rose-50';
                } else if (availabilityRatio < 0.2) {
                  meterColor = 'bg-rose-500';
                  statusLabel = isMarathi ? 'कमी साठा' : 'Low Stock';
                  statusIcon = <AlertTriangle className="w-4 h-4 text-rose-500" />;
                  textClass = 'text-rose-700';
                  bgClass = 'bg-rose-50';
                } else if (availabilityRatio < 0.4) {
                  meterColor = 'bg-amber-500';
                  statusLabel = isMarathi ? 'सावध' : 'Warning';
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

                    {/* Visual Meter Bar */}
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
                            ? (isMarathi ? 'स्टॉक जोडलेला नाही' : 'No stock added yet')
                            : isMarathi
                            ? `${availablePercent.toFixed(0)}% यार्डमध्ये शिल्लक`
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

        {/* Mobile Size Cards View (visible on < 768px) */}
        <div className="md:hidden divide-y divide-slate-100">
          {sizeBreakdown.map((row) => {
            const availablePercent = row.total > 0 ? (row.available / row.total) * 100 : 0;
            const availabilityRatio = row.total > 0 ? row.available / row.total : 0;

            let meterColor = 'bg-emerald-500';
            let statusLabel = isMarathi ? 'उत्तम साठा' : 'Good Stock';
            let statusIcon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
            let textClass = 'text-emerald-700';
            let bgClass = 'bg-emerald-50 border-emerald-200';

            if (row.total === 0) {
              meterColor = 'bg-slate-300';
              statusLabel = isMarathi ? 'स्टॉक नाही' : 'No Stock';
              statusIcon = <XCircle className="w-3.5 h-3.5 text-slate-400" />;
              textClass = 'text-slate-500';
              bgClass = 'bg-slate-100 border-slate-200';
            } else if (row.available === 0) {
              meterColor = 'bg-rose-500';
              statusLabel = isMarathi ? 'संपलेला स्टॉक' : 'Out of Stock';
              statusIcon = <XCircle className="w-3.5 h-3.5 text-rose-500" />;
              textClass = 'text-rose-700';
              bgClass = 'bg-rose-50 border-rose-200';
            } else if (availabilityRatio < 0.2) {
              meterColor = 'bg-rose-500';
              statusLabel = isMarathi ? 'कमी साठा' : 'Low Stock';
              statusIcon = <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />;
              textClass = 'text-rose-700';
              bgClass = 'bg-rose-50 border-rose-200';
            } else if (availabilityRatio < 0.4) {
              meterColor = 'bg-amber-500';
              statusLabel = isMarathi ? 'सावध' : 'Warning';
              statusIcon = <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
              textClass = 'text-amber-700';
              bgClass = 'bg-amber-50 border-amber-200';
            }

            return (
              <div key={row.plateType} className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 font-mono text-base bg-slate-100 px-2.5 py-1 rounded-lg">
                    {row.plateType}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold border ${bgClass} ${textClass}`}
                  >
                    {statusIcon}
                    {statusLabel}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, Math.max(0, availablePercent))}%` }}
                      className={`h-full ${meterColor} transition-all duration-300`}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>
                      {isMarathi ? 'उपलब्धता:' : 'Available:'} {availablePercent.toFixed(0)}%
                    </span>
                    <span>
                      {row.available} / {row.total} {isMarathi ? 'नग' : 'plates'}
                    </span>
                  </div>
                </div>

                {/* 3 mini stats */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2 rounded-xl text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      {isMarathi ? 'एकूण' : 'Total'}
                    </span>
                    <span className="text-xs font-bold text-slate-800">{row.total}</span>
                  </div>
                  <div className="border-x border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      {isMarathi ? 'पार्टींकडे' : 'Rented'}
                    </span>
                    <span className="text-xs font-bold text-primary">{row.withParties}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-600 uppercase font-semibold block">
                      {isMarathi ? 'उपलब्ध' : 'Yard'}
                    </span>
                    <span className="text-xs font-black text-emerald-600">{row.available}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stock Transaction History & Recent Additions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        {/* Left Column: Recent Stock Additions with Edit & Delete */}
        <div className="lg:col-span-7 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/60 shadow-xs overflow-hidden flex flex-col">
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h4 className="text-sm sm:text-base font-bold text-charcoal">
                {isMarathi ? 'नुकतीच झालेली स्टॉक आवक' : 'Recent Stock Additions'}
              </h4>
              <p className="text-[11px] text-slate-400 font-light">
                {isMarathi
                  ? 'यार्डमध्ये जोडलेल्या बॅचेस (व्यवस्थापन व संपादन)'
                  : 'Batches added into yard inventory (Manage & Edit)'}
              </p>
            </div>

            {/* Quick search input */}
            <div className="relative w-full sm:w-48">
              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={isMarathi ? 'शोधा...' : 'Filter additions...'}
                className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none pl-8 pr-3 py-1.5 rounded-lg text-xs font-medium"
              />
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto flex-grow">
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
                          title={isMarathi ? 'दुरुस्त करा' : 'Edit Stock Entry'}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingItem(item)}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                          title={isMarathi ? 'हटवा' : 'Delete Stock Entry'}
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
                        <p className="text-xs">
                          {isMarathi ? 'अद्याप कोणताही स्टॉक जोडलेला नाही.' : 'No stock records added yet.'}
                        </p>
                        <button
                          onClick={() => setIsAddModalOpen(true)}
                          className="text-xs text-primary font-bold underline hover:text-primary-dark"
                        >
                          {isMarathi ? '+ पहिली स्टॉक बॅच जोडा' : '+ Add your first stock batch'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : filteredStockItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400 text-xs italic">
                      {isMarathi
                        ? `"${searchTerm}" शी जुळणारा स्टॉक सापडला नाही.`
                        : `No stock additions matching "${searchTerm}".`}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View (visible on < 768px) */}
          <div className="md:hidden divide-y divide-slate-100 flex-grow">
            {filteredStockItems.map((item) => (
              <div key={item.id} className="p-3.5 flex items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 font-mono text-xs px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                      {item.plate_size}
                    </span>
                    <span className="font-black text-emerald-600 text-xs font-mono">
                      +{item.quantity} नग
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <Calendar className="w-3 h-3" />
                    <span>{formatMarathiDate(item.received_date)}</span>
                    {item.notes && <span className="truncate italic">· {item.notes}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setEditingItem(item)}
                    className="p-2 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                    title={isMarathi ? 'दुरुस्त करा' : 'Edit'}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingItem(item)}
                    className="p-2 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                    title={isMarathi ? 'हटवा' : 'Delete'}
                  >
                    <Trash2 className="w-4 h-4 text-rose-500" />
                  </button>
                </div>
              </div>
            ))}

            {stockItems.length === 0 ? (
              <div className="p-6 text-center text-slate-400 space-y-2">
                <Sparkles className="w-6 h-6 text-slate-300 mx-auto" />
                <p className="text-xs">
                  {isMarathi ? 'कोणताही स्टॉक जोडलेला नाही.' : 'No stock records added yet.'}
                </p>
              </div>
            ) : filteredStockItems.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs italic">
                {isMarathi ? 'कोणतीही नोंद सापडली नाही.' : 'No stock additions found.'}
              </div>
            ) : null}
          </div>
        </div>

        {/* Right Column: Combined Transaction Activity Feed */}
        <div className="lg:col-span-5 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/60 shadow-xs overflow-hidden flex flex-col">
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 bg-slate-50/50">
            <h4 className="text-sm sm:text-base font-bold text-charcoal flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              {isMarathi ? 'यार्ड स्टॉक हालचालींचा हिशोब' : 'Stock Activity & Yard Flow'}
            </h4>
            <p className="text-[11px] text-slate-400 font-light">
              {isMarathi
                ? 'आवक, भाड्याने जाणे व परत येण्याची एकत्रित नोंद'
                : 'Combined ledger of additions, dispatches, and returns'}
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
                  className="px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-xl border shrink-0 ${badgeBg}`}>{icon}</div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{act.label}</p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {formatMarathiDate(act.date)} {act.details ? `· ${act.details}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`text-xs font-black font-mono block ${qtyColor}`}>
                      {act.type === 'rental' ? '-' : '+'}
                      {act.quantity}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{act.plateSize}</span>
                  </div>
                </div>
              );
            })}

            {allActivities.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs italic">
                {isMarathi ? 'कोणतीही हालचाल नोंदलेली नाही.' : 'No activity recorded yet.'}
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
        appLanguage={appLanguage}
      />

      {/* Edit Stock Modal */}
      <EditStockModal
        isOpen={Boolean(editingItem)}
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onUpdateStock={onUpdateStock}
        stockStatsMap={stockStatsMap}
        appLanguage={appLanguage}
      />

      {/* Delete Stock Confirmation Modal */}
      <DeleteStockConfirmModal
        isOpen={Boolean(deletingItem)}
        item={deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirmDelete={onDeleteStock}
        stockStatsMap={stockStatsMap}
        appLanguage={appLanguage}
      />
    </div>
  );
};
