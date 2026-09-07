import React from 'react';
import {
  Layers,
  ShieldCheck,
  UserCheck,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  ClipboardList,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import type { Party, PlateStock, Rental, Payment, ReturnLog } from '../../../data/adminMockData';

interface DashboardTabProps {
  parties: Party[];
  plates: PlateStock[];
  rentals: Rental[];
  returns?: ReturnLog[];
  payments: Payment[];
  onTabChange: (tabName: string) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  parties,
  plates,
  rentals,
  returns = [],
  payments,
  onTabChange,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Core plate inventory calculations
  const totalPlates = plates.reduce((sum, p) => sum + p.total, 0);
  const availablePlates = plates.reduce((sum, p) => sum + p.available, 0);
  const platesWithParties = plates.reduce((sum, p) => sum + p.withParties, 0);
  const totalPendingAmount = parties.reduce((sum, p) => sum + p.pending, 0);

  // Today's operational flows
  const todayRentalsCount = rentals.filter((r) => r.issueDate === todayStr).length;
  const todayReturnsCount = returns.filter((r) => r.returnDate === todayStr).length;

  const activeRentals = rentals.filter((r) => r.status === 'active' || r.status === 'overdue');
  const overdueRentals = rentals.filter((r) => r.status === 'overdue');
  const recentPayments = [...payments]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8 text-left">
      {/* Upper Primary Stat Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Total Inventory */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Shuttering Stock
            </span>
            <h3 className="text-3xl font-black text-charcoal">{totalPlates.toLocaleString()}</h3>
            <p className="text-[10px] text-slate-400 font-light">Inventory across all sizes</p>
          </div>
          <div className="p-3.5 bg-slate-100 rounded-xl text-slate-700">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Available Inventory */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Available in Yard
            </span>
            <h3 className="text-3xl font-black text-emerald-600">
              {availablePlates.toLocaleString()}
            </h3>
            <p className="text-[10px] text-emerald-500 font-medium">Ready for dispatch</p>
          </div>
          <div className="p-3.5 bg-emerald-50 rounded-xl text-emerald-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: In Use Inventory */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Plates with Parties
            </span>
            <h3 className="text-3xl font-black text-primary">
              {platesWithParties.toLocaleString()}
            </h3>
            <p className="text-[10px] text-slate-400 font-light">Active construction sites</p>
          </div>
          <div className="p-3.5 bg-orange-50 rounded-xl text-primary">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Outstanding Dues */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Outstanding Dues
            </span>
            <h3 className="text-3xl font-black text-rose-600">
              ₹{totalPendingAmount.toLocaleString('en-IN')}
            </h3>
            <p className="text-[10px] text-rose-500 font-medium">Outstanding accounts receivable</p>
          </div>
          <div className="p-3.5 bg-rose-50 rounded-xl text-rose-600">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Daily Flow & Operational Status Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Today's Rentals
            </span>
            <p className="text-2xl font-black text-primary">{todayRentalsCount}</p>
            <p className="text-[10px] text-slate-400 font-light">Dispatches issued today</p>
          </div>
          <div className="p-3.5 bg-orange-50 rounded-xl text-primary">
            <ClipboardList className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Today's Returns
            </span>
            <p className="text-2xl font-black text-blue-600">{todayReturnsCount}</p>
            <p className="text-[10px] text-slate-400 font-light">Intakes received today</p>
          </div>
          <div className="p-3.5 bg-blue-50 rounded-xl text-blue-600">
            <RefreshCw className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Overdue Rentals
            </span>
            <p className="text-2xl font-black text-rose-600">{overdueRentals.length}</p>
            <p className="text-[10px] text-slate-400 font-light">Exceeding rental terms</p>
          </div>
          <div className="p-3.5 bg-rose-50 rounded-xl text-rose-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Data Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Recent Rentals and Overdue Alerts (7 Columns) */}
        <div className="lg:col-span-7 space-y-8">
          {/* Active / Overdue Rentals */}
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <h4 className="text-base font-bold text-charcoal flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" />
                Active Rentals & Overdues
              </h4>
              <span className="bg-rose-50 border border-rose-100 text-rose-700 text-xs px-2.5 py-0.5 rounded-full font-bold">
                {overdueRentals.length} Overdue
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                    <th className="px-6 py-4">Party</th>
                    <th className="px-6 py-4">Size</th>
                    <th className="px-6 py-4">Qty</th>
                    <th className="px-6 py-4">Issue Date</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeRentals.slice(0, 5).map((rent) => (
                    <tr key={rent.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">{rent.partyName}</td>
                      <td className="px-6 py-4 text-slate-500 font-mono">{rent.plateType}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">{rent.quantity}</td>
                      <td className="px-6 py-4 text-slate-500">{rent.issueDate}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            rent.status === 'overdue'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200/50'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                          }`}
                        >
                          {rent.status === 'overdue' ? 'Overdue' : 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {activeRentals.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-light italic">
                        No rentals yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Custom Visualization of Inventory Distribution (Safe from NaN%) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm">
            <h4 className="text-base font-bold text-charcoal mb-6">Inventory Stock Allocation</h4>
            <div className="space-y-4">
              {plates.map((plate) => {
                const inUsePercent =
                  plate.total > 0 ? (plate.withParties / plate.total) * 100 : 0;
                return (
                  <div key={plate.plateType} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-charcoal font-bold">Size: {plate.plateType}</span>
                      <span className="text-slate-500">
                        {plate.total === 0
                          ? '0 in stock (0% rented)'
                          : `${plate.withParties} / ${plate.total} rented (${inUsePercent.toFixed(0)}%)`}
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${Math.min(100, Math.max(0, inUsePercent))}%` }}
                        className="bg-primary h-full transition-all duration-500"
                      />
                      <div
                        style={{ width: `${Math.min(100, Math.max(0, 100 - inUsePercent))}%` }}
                        className="bg-emerald-500 h-full transition-all duration-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-6 text-xs font-medium justify-center border-t border-slate-100 pt-4">
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-3 h-3 rounded-full bg-primary" />
                With Parties
              </span>
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                Available in Stockyard
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Recent Payments and Account Stats (5 Columns) */}
        <div className="lg:col-span-5 space-y-8">
          {/* Recent Payments Log */}
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <h4 className="text-base font-bold text-charcoal">Recent Payments</h4>
              <button
                onClick={() => onTabChange('Payments')}
                className="text-xs text-primary hover:text-primary-dark font-bold transition-all"
              >
                View All
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {recentPayments.map((pay) => (
                <div
                  key={pay.id}
                  className="p-4 px-6 hover:bg-slate-50/50 transition-colors flex justify-between items-center text-left"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-slate-800">{pay.partyName}</p>
                    <p className="text-xs text-slate-400 font-light">
                      {pay.date} • {pay.paymentMode}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-emerald-600">
                      + ₹{pay.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ))}
              {recentPayments.length === 0 && (
                <div className="p-6 text-center text-slate-400 font-light italic">
                  No payments yet.
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-charcoal text-white p-6 rounded-3xl border border-slate-800/80 relative overflow-hidden shadow-lg">
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff03_1px,transparent_1px)] [background-size:16px_16px] opacity-15" />
            <h4 className="text-base font-bold text-white relative z-10">Quick Actions</h4>
            <div className="grid grid-cols-2 gap-4 mt-6 relative z-10">
              <button
                onClick={() => onTabChange('Rentals')}
                className="bg-slate-900 border border-slate-800 hover:border-primary/50 text-left p-4 rounded-2xl hover:bg-slate-850 transition-all flex flex-col justify-between h-24"
              >
                <span className="text-xs text-slate-400">Issue Shuttering</span>
                <span className="font-bold text-sm text-white flex items-center gap-1">
                  + New Rental <ArrowUpRight className="w-4 h-4 text-primary" />
                </span>
              </button>

              <button
                onClick={() => onTabChange('Returns')}
                className="bg-slate-900 border border-slate-800 hover:border-primary/50 text-left p-4 rounded-2xl hover:bg-slate-850 transition-all flex flex-col justify-between h-24"
              >
                <span className="text-xs text-slate-400">Receive Shuttering</span>
                <span className="font-bold text-sm text-white flex items-center gap-1">
                  + Add Return <ArrowDownRight className="w-4 h-4 text-primary" />
                </span>
              </button>

              <button
                onClick={() => onTabChange('Payments')}
                className="bg-slate-900 border border-slate-800 hover:border-primary/50 text-left p-4 rounded-2xl hover:bg-slate-850 transition-all flex flex-col justify-between h-24"
              >
                <span className="text-xs text-slate-400">Record Payments</span>
                <span className="font-bold text-sm text-white flex items-center gap-1">
                  + Add Payment <ArrowUpRight className="w-4 h-4 text-primary" />
                </span>
              </button>

              <button
                onClick={() => onTabChange('Plate Stock')}
                className="bg-slate-900 border border-slate-800 hover:border-primary/50 text-left p-4 rounded-2xl hover:bg-slate-850 transition-all flex flex-col justify-between h-24"
              >
                <span className="text-xs text-slate-400">Manage Stock</span>
                <span className="font-bold text-sm text-white flex items-center gap-1">
                  Plate Stock <ArrowRightIcon className="w-4 h-4 text-primary" />
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Small utility icons mapping helper
const ArrowRightIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);
