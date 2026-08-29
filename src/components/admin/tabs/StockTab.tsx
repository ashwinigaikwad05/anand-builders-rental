import React from 'react';
import { Layers, ShieldCheck, UserCheck, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import type { PlateStock } from '../../../data/adminMockData';

interface StockTabProps {
  plates: PlateStock[];
}

export const StockTab: React.FC<StockTabProps> = ({ plates }) => {
  // Global stats
  const totalStock = plates.reduce((sum, p) => sum + p.total, 0);
  const availableStock = plates.reduce((sum, p) => sum + p.available, 0);
  const withPartiesStock = plates.reduce((sum, p) => sum + p.withParties, 0);

  return (
    <div className="space-y-8 text-left">
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Inventory Stock</span>
            <h3 className="text-3xl font-black text-charcoal">{totalStock.toLocaleString()}</h3>
            <p className="text-[10px] text-slate-400 font-light">Centering plates in ledger</p>
          </div>
          <div className="p-3 bg-slate-100 rounded-xl text-slate-700">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Available in Yard</span>
            <h3 className="text-3xl font-black text-emerald-600">{availableStock.toLocaleString()}</h3>
            <p className="text-[10px] text-emerald-500 font-medium">Ready to load</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">With Parties</span>
            <h3 className="text-3xl font-black text-primary">{withPartiesStock.toLocaleString()}</h3>
            <p className="text-[10px] text-slate-400 font-light">On customer sites</p>
          </div>
          <div className="p-3 bg-orange-50 rounded-xl text-primary">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Stock Allocation Table */}
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <h4 className="text-base font-bold text-charcoal">Stock Breakdown by Plate Size</h4>
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
              {plates.map((plate) => {
                const availabilityRatio = plate.available / plate.total;
                const availablePercent = availabilityRatio * 100;
                
                // Color mapping
                let meterColor = 'bg-emerald-500';
                let statusLabel = 'Good Stock';
                let statusIcon = <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
                let textClass = 'text-emerald-700';
                let bgClass = 'bg-emerald-50';

                if (plate.status === 'out_of_stock') {
                  meterColor = 'bg-slate-300';
                  statusLabel = 'Deactivated';
                  statusIcon = <XCircle className="w-4 h-4 text-slate-400" />;
                  textClass = 'text-slate-500';
                  bgClass = 'bg-slate-50';
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
                  <tr key={plate.plateType} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800 font-mono">{plate.plateType}</td>
                    <td className="px-6 py-4 font-semibold text-slate-800">{plate.total}</td>
                    <td className="px-6 py-4 text-slate-500">{plate.withParties}</td>
                    <td className="px-6 py-4 font-bold text-emerald-600">{plate.available}</td>
                    
                    {/* Visual Meter Bar */}
                    <td className="px-6 py-4 min-w-[150px]">
                      <div className="space-y-1">
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${availablePercent}%` }}
                            className={`h-full ${meterColor} transition-all duration-300`}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {availablePercent.toFixed(0)}% available in yard
                        </span>
                      </div>
                    </td>
                    
                    {/* Status badge */}
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${bgClass} ${textClass}`}>
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

    </div>
  );
};
