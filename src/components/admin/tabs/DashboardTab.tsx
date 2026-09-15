import React, { useState } from 'react';
import {
  Layers,
  ShieldCheck,
  UserCheck,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  ClipboardList,
  RefreshCw,
  AlertTriangle,
  Landmark,
  Smartphone,
  Banknote,
  RotateCw,
  Clock,
  CheckCircle2,
  Phone,
  MessageSquare,
  AlertCircle,
  X,
} from 'lucide-react';
import type { Party, PlateStock, Rental, Payment, ReturnLog, RentalCycle, RentalItem } from '../../../data/adminMockData';
import {
  calculateCalendarDays,
  calculateCycleFinances,
  calculateExpectedCycleEndDate,
} from '../../../lib/supabase';
import { RenewRentalModal } from '../modals/RenewRentalModal';
import {
  getCleanPhoneNumber,
  determineCycleAlertStatus,
  buildWhatsAppUrl,
} from '../../../utils/alertMessaging';

interface DashboardTabProps {
  parties: Party[];
  plates: PlateStock[];
  rentals: Rental[];
  rentalCycles?: RentalCycle[];
  returns?: ReturnLog[];
  payments: Payment[];
  onTabChange: (tabName: string) => void;
  onRenewRental?: (rentalId: string, renewalConfirmationDate?: string, newItems?: RentalItem[]) => Promise<void>;
  onInitiateReturn?: (rental: Rental) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  parties,
  plates,
  rentals,
  rentalCycles = [],
  returns = [],
  payments,
  onTabChange,
  onRenewRental,
  onInitiateReturn,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Quick Renew Modal state
  const [renewTarget, setRenewTarget] = useState<Rental | null>(null);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(true);

  // Core plate inventory calculations
  const totalPlates = plates.reduce((sum, p) => sum + p.total, 0);
  const availablePlates = plates.reduce((sum, p) => sum + p.available, 0);
  const platesWithParties = plates.reduce((sum, p) => sum + p.withParties, 0);
  const totalPendingAmount = parties.reduce((sum, p) => sum + p.pending, 0);

  // Financial account balances derived dynamically from verified payments
  const account1Balance = payments
    .filter((p) => p.paymentMode === 'Account 1')
    .reduce((sum, p) => sum + p.amount, 0);
  const account2Balance = payments
    .filter((p) => p.paymentMode === 'Account 2')
    .reduce((sum, p) => sum + p.amount, 0);
  const cashBalance = payments
    .filter((p) => p.paymentMode === 'Cash')
    .reduce((sum, p) => sum + p.amount, 0);

  // Today's operational flows
  const todayRentalsCount = rentals.filter((r) => r.issueDate === todayStr).length;
  const todayReturnsCount = returns.filter((r) => r.returnDate === todayStr).length;

  const activeRentals = rentals.filter((r) => r.status === 'active' || r.status === 'overdue');
  const overdueRentals = rentals.filter((r) => r.status === 'overdue');
  const recentPayments = [...payments]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // Helper to find active cycle for a rental
  const getActiveCycle = (rental: Rental): RentalCycle => {
    const cycles = rentalCycles.filter((c) => c.rentalId === rental.id);
    if (cycles.length > 0) {
      const act = cycles.find((c) => c.status === 'active');
      return act || cycles[cycles.length - 1];
    }
    if (rental.cycles && rental.cycles.length > 0) {
      const act = rental.cycles.find((c) => c.status === 'active');
      return act || rental.cycles[rental.cycles.length - 1];
    }
    return {
      id: `dash-cyc-${rental.id}`,
      rentalId: rental.id,
      partyId: rental.partyId,
      cycleNumber: rental.currentCycleNumber || 1,
      startDate: rental.currentCycleStartDate || rental.issueDate,
      expectedEndDate: rental.currentCycleEndDate || calculateExpectedCycleEndDate(rental.issueDate, 40),
      days: rental.days || 40,
      extraDays: Math.max(0, (rental.days || 40) - 40),
      dailyRate: rental.dailyRate,
      quantity: rental.quantity,
      baseRent: rental.totalRent,
      extraAmount: 0,
      totalAmount: rental.totalRent,
      paidAmount: rental.paid,
      pendingAmount: rental.pending,
      status: rental.status === 'returned' ? 'completed' : 'active',
    };
  };

  // 40-Day Cycle Alerts Evaluation
  const cycleAlerts = activeRentals
    .map((rent) => {
      const activeCycle = getActiveCycle(rent);
      const elapsedDays = calculateCalendarDays(activeCycle.startDate, todayStr);
      const daysLeft = 40 - elapsedDays;
      const extraDays = Math.max(0, elapsedDays - 40);
      const party = parties.find((p) => p.id === rent.partyId);
      const partyMobile = party?.mobile || '';

      const finances = calculateCycleFinances(
        {
          startDate: activeCycle.startDate,
          quantity: activeCycle.quantity,
          dailyRate: activeCycle.dailyRate,
          baseRent: activeCycle.baseRent,
          paidAmount: activeCycle.paidAmount,
          items: rent.items,
        },
        todayStr
      );

      const alertStatus = determineCycleAlertStatus(daysLeft);

      // Plate items summary string
      const plateSummary =
        rent.items && rent.items.length > 0
          ? rent.items.map((it) => `${it.plateType} (${it.quantity})`).join(', ')
          : `${rent.plateType} (${rent.quantity})`;

      const { telLink } = getCleanPhoneNumber(partyMobile);
      const whatsappUrl = buildWhatsAppUrl(
        partyMobile,
        rent.partyName,
        activeCycle.cycleNumber,
        alertStatus.statusType,
        daysLeft,
        extraDays
      );

      return {
        rental: rent,
        party,
        partyMobile,
        activeCycle,
        elapsedDays,
        daysLeft,
        extraDays,
        finances,
        alertStatus,
        plateSummary,
        telLink,
        whatsappUrl,
      };
    })
    .filter((alert) => alert.daysLeft <= 7)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const completed40Alerts = cycleAlerts.filter(
    (a) => a.alertStatus.isCompleted40 || a.alertStatus.isOverdue
  );

  return (
    <div className="space-y-8 text-left">
      {/* 40-Day Completion Top Notification Popup Alert */}
      {isAlertModalOpen && completed40Alerts.length > 0 && (
        <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-rose-950 text-white p-5 rounded-3xl border border-purple-800 shadow-xl relative animate-fadeIn">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/20 text-purple-300 rounded-2xl border border-purple-500/30">
                <AlertCircle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-white flex items-center gap-2">
                  <span>40-Day Rental Cycle Completion Alert</span>
                  <span className="bg-purple-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black">
                    {completed40Alerts.length} Active
                  </span>
                </h4>
                <p className="text-xs text-purple-200 font-light mt-0.5">
                  {completed40Alerts.length} party rental cycle{completed40Alerts.length > 1 ? 's have' : ' has'} completed 40 days and {completed40Alerts.length > 1 ? 'are' : 'is'} ready for Return or Renewal.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsAlertModalOpen(false)}
              className="p-1.5 text-purple-300 hover:text-white hover:bg-purple-800/40 rounded-xl transition"
              title="Dismiss banner"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {completed40Alerts.slice(0, 3).map((item) => (
              <div
                key={item.rental.id}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 space-y-2.5 text-xs text-left"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-bold text-white text-sm">{item.rental.partyName}</h5>
                    <p className="text-[11px] text-purple-200 font-mono font-semibold">+91 {item.partyMobile}</p>
                  </div>
                  <span className="bg-purple-400/20 text-purple-200 border border-purple-400/30 text-[9px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                    {item.alertStatus.statusLabel}
                  </span>
                </div>
                <div className="text-[11px] text-slate-200 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Cycle Number:</span>
                    <span className="font-bold text-white">Cycle {item.activeCycle.cycleNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Days Used:</span>
                    <span className="font-bold text-amber-300">{item.elapsedDays} Days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Plates:</span>
                    <span className="font-semibold text-white">{item.plateSummary}</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <a
                    href={item.telLink}
                    className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
                  >
                    <Phone className="w-3.5 h-3.5" /> 📞 Call Party
                  </a>
                  <a
                    href={item.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> 💬 WhatsApp
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* 40-DAY RENTAL CYCLE EXPIRATION ALERTS WIDGET */}
      <div className="bg-white rounded-3xl border border-slate-200/70 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-charcoal">
                40-Day Rental Cycle Expiration Alerts
              </h4>
              <p className="text-[11px] text-slate-400 font-light">
                Real-time tracking of active 40-day cycles with instant Call and WhatsApp party actions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100/70 text-amber-800">
              {cycleAlerts.length} Attention Required
            </span>
          </div>
        </div>

        <div className="p-6">
          {cycleAlerts.length === 0 ? (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-emerald-800 text-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <span className="font-bold block">All Cycles Within Normal 40-Day Term</span>
                <span className="text-emerald-700/90 text-[11px]">
                  No active rental agreements are currently overdue or expiring within 7 days.
                </span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cycleAlerts.map((alert) => {
                const {
                  rental,
                  partyMobile,
                  activeCycle,
                  finances,
                  alertStatus,
                  plateSummary,
                  telLink,
                  whatsappUrl,
                } = alert;

                const cardBorderColor = alertStatus.isOverdue
                  ? 'border-rose-300 bg-rose-50/40'
                  : alertStatus.isCompleted40
                  ? 'border-purple-300 bg-purple-50/40'
                  : 'border-amber-300 bg-amber-50/40';

                return (
                  <div
                    key={rental.id}
                    className={`rounded-2xl border p-4.5 flex flex-col justify-between space-y-4 shadow-xs transition-all ${cardBorderColor}`}
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h5 className="font-bold text-slate-900 text-sm">{rental.partyName}</h5>
                          <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {partyMobile ? `+91 ${partyMobile}` : 'No phone logged'}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider ${alertStatus.badgeColorClass}`}
                        >
                          {alertStatus.statusLabel}
                        </span>
                      </div>

                      <div className="bg-white/90 rounded-xl p-3 border border-slate-200/60 space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span className="font-semibold text-slate-500">Plate Variant & Qty:</span>
                          <span className="font-bold text-slate-800">{plateSummary}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span className="font-semibold text-slate-500">Active Cycle:</span>
                          <span className="font-bold text-slate-800">Cycle {activeCycle.cycleNumber}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span className="font-semibold text-slate-500">Days Used:</span>
                          <span className="font-bold text-amber-600">{alert.elapsedDays} Days</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span className="font-semibold text-slate-500">Term Dates:</span>
                          <span className="font-mono text-[11px] text-slate-700">
                            {activeCycle.startDate} → {activeCycle.expectedEndDate}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span className="font-semibold text-slate-500">Action Status:</span>
                          <span className="font-extrabold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px]">
                            Ready for Return or Renewal
                          </span>
                        </div>
                        {finances.extraAmount > 0 && (
                          <div className="pt-1 border-t border-slate-100 flex justify-between text-amber-800 font-bold text-[11px]">
                            <span>Extra Charges Added:</span>
                            <span>+₹{finances.extraAmount.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-slate-700 font-bold text-xs pt-1 border-t border-slate-100">
                          <span>Current Pending:</span>
                          <span className={finances.pendingAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                            ₹{finances.pendingAmount.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Communication Actions: Call & WhatsApp */}
                    <div className="space-y-2 pt-1 border-t border-slate-200/60">
                      <div className="grid grid-cols-2 gap-2">
                        <a
                          href={telLink}
                          className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
                          title={`Call ${rental.partyName}`}
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call Party</span>
                        </a>

                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
                          title={`Open WhatsApp chat with pre-filled message`}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      </div>

                      {/* Operation Actions: Renew & Return */}
                      <div className="grid grid-cols-2 gap-2">
                        {onRenewRental && (
                          <button
                            onClick={() => {
                              setRenewTarget(rental);
                            }}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded-xl transition-all flex items-center justify-center gap-1"
                          >
                            <RotateCw className="w-3 h-3" />
                            <span>Renew Cycle</span>
                          </button>
                        )}

                        {onInitiateReturn && (
                          <button
                            onClick={() => onInitiateReturn(rental)}
                            className="px-3 py-1.5 bg-white hover:bg-orange-50 border border-orange-200 text-primary font-bold text-[11px] rounded-xl transition-all flex items-center justify-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Return Intake</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Account Balances Strip: Account 1, Account 2, Cash */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Account 1 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between hover:border-blue-200 transition-all">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Account 1 (Bank Direct)
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-blue-600">
              ₹{account1Balance.toLocaleString('en-IN')}
            </h3>
            <p className="text-[10px] text-slate-400 font-light">Primary Bank Account</p>
          </div>
          <div className="p-3.5 bg-blue-50 rounded-xl text-blue-600">
            <Landmark className="w-6 h-6" />
          </div>
        </div>

        {/* Account 2 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between hover:border-purple-200 transition-all">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Account 2 (UPI / Digital)
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-purple-600">
              ₹{account2Balance.toLocaleString('en-IN')}
            </h3>
            <p className="text-[10px] text-slate-400 font-light">Secondary Digital Account</p>
          </div>
          <div className="p-3.5 bg-purple-50 rounded-xl text-purple-600">
            <Smartphone className="w-6 h-6" />
          </div>
        </div>

        {/* Cash Account */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between hover:border-emerald-200 transition-all">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Cash (Yard Drawer)
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-emerald-600">
              ₹{cashBalance.toLocaleString('en-IN')}
            </h3>
            <p className="text-[10px] text-slate-400 font-light">Physical Cash on hand</p>
          </div>
          <div className="p-3.5 bg-emerald-50 rounded-xl text-emerald-600">
            <Banknote className="w-6 h-6" />
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

          {/* Quick Custom Visualization of Inventory Distribution */}
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
                      {pay.date} • {pay.paymentMode} {pay.cycleNumber ? `(Cycle ${pay.cycleNumber})` : ''}
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

      {/* QUICK RENEW MODAL */}
      {renewTarget && (
        <RenewRentalModal
          rental={renewTarget}
          activeCycle={getActiveCycle(renewTarget)}
          plates={plates}
          onClose={() => setRenewTarget(null)}
          onConfirm={async (rentalId, renewalDate, newItems) => {
            if (onRenewRental) {
              await onRenewRental(rentalId, renewalDate, newItems);
            }
          }}
        />
      )}
    </div>
  );
};

// Small utility icons mapping helper
const ArrowRightIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);
