import React, { useState, useEffect } from 'react';
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
import { DashboardDetailModal, type DashboardDetailField } from '../modals/DashboardDetailModal';
import {
  getCleanPhoneNumber,
  determineCycleAlertStatus,
  buildWhatsAppUrl,
} from '../../../utils/alertMessaging';
import {
  getStoredAppLanguage,
  t,
  type AppLanguage,
} from '../../../utils/appTranslations';

interface DashboardTabProps {
  parties: Party[];
  plates: PlateStock[];
  rentals: Rental[];
  rentalCycles?: RentalCycle[];
  returns?: ReturnLog[];
  payments: Payment[];
  onTabChange: (tabName: string) => void;
  onRenewRental?: (
    rentalId: string,
    renewalConfirmationDate?: string,
    newItems?: RentalItem[],
    renewDays?: number,
    payment?: {
      amount: number;
      paymentMode: 'Cash' | 'Account 1' | 'Account 2';
      date?: string;
      reference?: string;
      notes?: string;
    },
    penalty?: number
  ) => Promise<void>;
  onInitiateReturn?: (rental: Rental) => void;
  appLanguage?: AppLanguage;
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
  appLanguage,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Selected Language State
  const [currentLang, setCurrentLang] = useState<AppLanguage>(() => appLanguage || getStoredAppLanguage());

  useEffect(() => {
    if (appLanguage) {
      setCurrentLang(appLanguage);
    }
  }, [appLanguage]);

  useEffect(() => {
    const handleLangChange = (e: Event) => {
      const customEvent = e as CustomEvent<AppLanguage>;
      if (customEvent.detail) {
        setCurrentLang(customEvent.detail);
      }
    };
    window.addEventListener('anand_language_change', handleLangChange);
    return () => window.removeEventListener('anand_language_change', handleLangChange);
  }, []);

  const curT = t[currentLang] || t.marathi;

  // Quick Renew Modal state
  const [renewTarget, setRenewTarget] = useState<Rental | null>(null);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(true);
  const [selectedDetailField, setSelectedDetailField] = useState<DashboardDetailField | null>(null);

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
                  <span>{curT.cycleAlerts.title}</span>
                  <span className="bg-purple-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black">
                    {completed40Alerts.length} {curT.cycleAlerts.attentionRequired}
                  </span>
                </h4>
                <p className="text-xs text-purple-200 font-light mt-0.5">
                  {completed40Alerts.length} {curT.cycleAlerts.subtitle}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsAlertModalOpen(false)}
              className="p-1.5 text-purple-300 hover:text-white hover:bg-purple-800/40 rounded-xl transition cursor-pointer"
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
                    <span>{curT.cycleAlerts.activeCycle}</span>
                    <span className="font-bold text-white">{curT.cycleAlerts.cycle} {item.activeCycle.cycleNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{curT.cycleAlerts.daysUsed}</span>
                    <span className="font-bold text-amber-300">{item.elapsedDays} {curT.cycleAlerts.days}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{curT.cycleAlerts.plateAndQty}</span>
                    <span className="font-semibold text-white">{item.plateSummary}</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <a
                    href={item.telLink}
                    className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
                  >
                    <Phone className="w-3.5 h-3.5" /> 📞 {curT.cycleAlerts.callParty}
                  </a>
                  <a
                    href={item.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> 💬 {curT.cycleAlerts.whatsapp}
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
        <div
          onClick={() => setSelectedDetailField('total_stock')}
          className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5 transition-all group select-none"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setSelectedDetailField('total_stock');
          }}
          title={currentLang === 'marathi' ? 'तपशील पाहण्यासाठी क्लिक करा' : 'Click to view stock breakdown'}
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {curT.stats.totalStock}
            </span>
            <h3 className="text-3xl font-black text-charcoal">{totalPlates.toLocaleString()}</h3>
            <p className="text-[10px] text-slate-400 font-light">{curT.stats.totalStockSub}</p>
            <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 group-hover:text-primary transition-colors pt-1">
              <span>{currentLang === 'marathi' ? 'तपशील पाहा' : 'Click for details'}</span>
              <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>
          <div className="p-3.5 bg-slate-100 rounded-xl text-slate-700 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Available Inventory */}
        <div
          onClick={() => setSelectedDetailField('in_yard')}
          className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:border-emerald-300 hover:-translate-y-0.5 transition-all group select-none"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setSelectedDetailField('in_yard');
          }}
          title={currentLang === 'marathi' ? 'गोदाम साहित्याचा तपशील पाहण्यासाठी क्लिक करा' : 'Click to view yard availability'}
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {curT.stats.inYard}
            </span>
            <h3 className="text-3xl font-black text-emerald-600">
              {availablePlates.toLocaleString()}
            </h3>
            <p className="text-[10px] text-emerald-500 font-medium">{curT.stats.inYardSub}</p>
            <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 group-hover:text-emerald-600 transition-colors pt-1">
              <span>{currentLang === 'marathi' ? 'तपशील पाहा' : 'Click for details'}</span>
              <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>
          <div className="p-3.5 bg-emerald-50 rounded-xl text-emerald-600 group-hover:bg-emerald-100 transition-colors">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: In Use Inventory */}
        <div
          onClick={() => setSelectedDetailField('with_parties')}
          className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:border-orange-300 hover:-translate-y-0.5 transition-all group select-none"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setSelectedDetailField('with_parties');
          }}
          title={currentLang === 'marathi' ? 'ग्राहकांकडील साहित्याचा तपशील पाहण्यासाठी क्लिक करा' : 'Click to view rented plates list'}
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {curT.stats.withParties}
            </span>
            <h3 className="text-3xl font-black text-primary">
              {platesWithParties.toLocaleString()}
            </h3>
            <p className="text-[10px] text-slate-400 font-light">{curT.stats.withPartiesSub}</p>
            <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 group-hover:text-primary transition-colors pt-1">
              <span>{currentLang === 'marathi' ? 'तपशील पाहा' : 'Click for details'}</span>
              <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>
          <div className="p-3.5 bg-orange-50 rounded-xl text-primary group-hover:bg-orange-100 transition-colors">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Outstanding Dues */}
        <div
          onClick={() => setSelectedDetailField('outstanding')}
          className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:border-rose-300 hover:-translate-y-0.5 transition-all group select-none"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setSelectedDetailField('outstanding');
          }}
          title={currentLang === 'marathi' ? 'बाकी रकमेचा तपशील पाहण्यासाठी क्लिक करा' : 'Click to view outstanding dues breakdown'}
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {curT.stats.outstanding}
            </span>
            <h3 className="text-3xl font-black text-rose-600">
              ₹{totalPendingAmount.toLocaleString('en-IN')}
            </h3>
            <p className="text-[10px] text-rose-500 font-medium">{curT.stats.outstandingSub}</p>
            <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 group-hover:text-rose-600 transition-colors pt-1">
              <span>{currentLang === 'marathi' ? 'तपशील पाहा' : 'Click for details'}</span>
              <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>
          <div className="p-3.5 bg-rose-50 rounded-xl text-rose-600 group-hover:bg-rose-100 transition-colors">
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
                {curT.cycleAlerts.title}
              </h4>
              <p className="text-[11px] text-slate-400 font-light">
                {curT.cycleAlerts.subtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedDetailField('cycle_alerts')}
              className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-200 rounded-full text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <span>{currentLang === 'marathi' ? 'सर्व तपशील पाहा' : 'View Full Details'}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100/70 text-amber-800">
              {cycleAlerts.length} {curT.cycleAlerts.attentionRequired}
            </span>
          </div>
        </div>

        <div className="p-6">
          {cycleAlerts.length === 0 ? (
            <div
              onClick={() => setSelectedDetailField('cycle_alerts')}
              className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-emerald-800 text-xs cursor-pointer hover:bg-emerald-100/60 transition group select-none"
              title={currentLang === 'marathi' ? 'तपशील पाहण्यासाठी क्लिक करा' : 'Click to view cycle status'}
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div>
                  <span className="font-bold block">{curT.cycleAlerts.allGoodTitle}</span>
                  <span className="text-emerald-700/90 text-[11px]">
                    {curT.cycleAlerts.allGoodSub}
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 group-hover:underline">
                {currentLang === 'marathi' ? 'तपशील पाहा' : 'View details'} <ArrowUpRight className="w-3 h-3" />
              </span>
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
                          <span className="font-semibold text-slate-500">{curT.cycleAlerts.plateAndQty}</span>
                          <span className="font-bold text-slate-800">{plateSummary}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span className="font-semibold text-slate-500">{curT.cycleAlerts.activeCycle}</span>
                          <span className="font-bold text-slate-800">{curT.cycleAlerts.cycle} {activeCycle.cycleNumber}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span className="font-semibold text-slate-500">{curT.cycleAlerts.daysUsed}</span>
                          <span className="font-bold text-amber-600">{alert.elapsedDays} {curT.cycleAlerts.days}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span className="font-semibold text-slate-500">{curT.cycleAlerts.termDates}</span>
                          <span className="font-mono text-[11px] text-slate-700">
                            {activeCycle.startDate} → {activeCycle.expectedEndDate}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span className="font-semibold text-slate-500">{curT.cycleAlerts.actionStatus}</span>
                          <span className="font-extrabold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px]">
                            {curT.cycleAlerts.readyAction}
                          </span>
                        </div>
                        {finances.extraAmount > 0 && (
                          <div className="pt-1 border-t border-slate-100 flex justify-between text-amber-800 font-bold text-[11px]">
                            <span>{curT.cycleAlerts.extraCharges}</span>
                            <span>+₹{finances.extraAmount.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-slate-700 font-bold text-xs pt-1 border-t border-slate-100">
                          <span>{curT.cycleAlerts.currentPending}</span>
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
                          className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          title={`Call ${rental.partyName}`}
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>{curT.cycleAlerts.callParty}</span>
                        </a>

                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          title="Open WhatsApp chat with pre-filled message"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{curT.cycleAlerts.whatsapp}</span>
                        </a>
                      </div>

                      {/* Operation Actions: Renew & Return */}
                      <div className="grid grid-cols-2 gap-2">
                        {onRenewRental && (
                          <button
                            type="button"
                            onClick={() => {
                              setRenewTarget(rental);
                            }}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <RotateCw className="w-3 h-3" />
                            <span>{curT.cycleAlerts.renewCycle}</span>
                          </button>
                        )}

                        {onInitiateReturn && (
                          <button
                            type="button"
                            onClick={() => onInitiateReturn(rental)}
                            className="px-3 py-1.5 bg-white hover:bg-orange-50 border border-orange-200 text-primary font-bold text-[11px] rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>{curT.cycleAlerts.returnIntake}</span>
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
        <div
          onClick={() => setSelectedDetailField('account_1')}
          className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:border-blue-300 hover:-translate-y-0.5 transition-all group select-none"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setSelectedDetailField('account_1');
          }}
          title={currentLang === 'marathi' ? 'खाते १ चे व्यवहार पाहण्यासाठी क्लिक करा' : 'Click to view Account 1 transactions'}
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              {curT.accounts.acc1Title}
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-blue-600">
              ₹{account1Balance.toLocaleString('en-IN')}
            </h3>
            <p className="text-[10px] text-slate-400 font-light">{curT.accounts.acc1Sub}</p>
            <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 group-hover:text-blue-600 transition-colors pt-1">
              <span>{currentLang === 'marathi' ? 'व्यवहार पाहा' : 'View Transactions'}</span>
              <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>
          <div className="p-3.5 bg-blue-50 rounded-xl text-blue-600 group-hover:bg-blue-100 transition-colors">
            <Landmark className="w-6 h-6" />
          </div>
        </div>

        {/* Account 2 */}
        <div
          onClick={() => setSelectedDetailField('account_2')}
          className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:border-purple-300 hover:-translate-y-0.5 transition-all group select-none"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setSelectedDetailField('account_2');
          }}
          title={currentLang === 'marathi' ? 'खाते २ चे व्यवहार पाहण्यासाठी क्लिक करा' : 'Click to view Account 2 transactions'}
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              {curT.accounts.acc2Title}
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-purple-600">
              ₹{account2Balance.toLocaleString('en-IN')}
            </h3>
            <p className="text-[10px] text-slate-400 font-light">{curT.accounts.acc2Sub}</p>
            <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 group-hover:text-purple-600 transition-colors pt-1">
              <span>{currentLang === 'marathi' ? 'व्यवहार पाहा' : 'View Transactions'}</span>
              <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>
          <div className="p-3.5 bg-purple-50 rounded-xl text-purple-600 group-hover:bg-purple-100 transition-colors">
            <Smartphone className="w-6 h-6" />
          </div>
        </div>

        {/* Cash Account */}
        <div
          onClick={() => setSelectedDetailField('cash')}
          className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:border-emerald-300 hover:-translate-y-0.5 transition-all group select-none"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setSelectedDetailField('cash');
          }}
          title={currentLang === 'marathi' ? 'रोख व्यवहार पाहण्यासाठी क्लिक करा' : 'Click to view cash transactions'}
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              {curT.accounts.cashTitle}
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-emerald-600">
              ₹{cashBalance.toLocaleString('en-IN')}
            </h3>
            <p className="text-[10px] text-slate-400 font-light">{curT.accounts.cashSub}</p>
            <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 group-hover:text-emerald-600 transition-colors pt-1">
              <span>{currentLang === 'marathi' ? 'व्यवहार पाहा' : 'View Transactions'}</span>
              <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>
          <div className="p-3.5 bg-emerald-50 rounded-xl text-emerald-600 group-hover:bg-emerald-100 transition-colors">
            <Banknote className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Daily Flow & Operational Status Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Today's Rentals */}
        <div
          onClick={() => setSelectedDetailField('today_rentals')}
          className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:border-orange-300 hover:-translate-y-0.5 transition-all group select-none"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setSelectedDetailField('today_rentals');
          }}
          title={currentLang === 'marathi' ? 'आजचे वाटप पाहण्यासाठी क्लिक करा' : "Click to view today's dispatches"}
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              {curT.daily.todayRentals}
            </span>
            <p className="text-2xl font-black text-primary">{todayRentalsCount}</p>
            <p className="text-[10px] text-slate-400 font-light">{curT.daily.todayRentalsSub}</p>
            <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 group-hover:text-primary transition-colors pt-1">
              <span>{currentLang === 'marathi' ? 'तपशील पाहा' : 'View Details'}</span>
              <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>
          <div className="p-3.5 bg-orange-50 rounded-xl text-primary group-hover:bg-orange-100 transition-colors">
            <ClipboardList className="w-6 h-6" />
          </div>
        </div>

        {/* Today's Returns */}
        <div
          onClick={() => setSelectedDetailField('today_returns')}
          className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:border-blue-300 hover:-translate-y-0.5 transition-all group select-none"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setSelectedDetailField('today_returns');
          }}
          title={currentLang === 'marathi' ? 'आजचे साहित्य जमा पाहण्यासाठी क्लिक करा' : "Click to view today's return intakes"}
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              {curT.daily.todayReturns}
            </span>
            <p className="text-2xl font-black text-blue-600">{todayReturnsCount}</p>
            <p className="text-[10px] text-slate-400 font-light">{curT.daily.todayReturnsSub}</p>
            <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 group-hover:text-blue-600 transition-colors pt-1">
              <span>{currentLang === 'marathi' ? 'तपशील पाहा' : 'View Details'}</span>
              <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>
          <div className="p-3.5 bg-blue-50 rounded-xl text-blue-600 group-hover:bg-blue-100 transition-colors">
            <RefreshCw className="w-6 h-6" />
          </div>
        </div>

        {/* Overdue Rentals */}
        <div
          onClick={() => setSelectedDetailField('overdue_rentals')}
          className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:border-rose-300 hover:-translate-y-0.5 transition-all group select-none"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setSelectedDetailField('overdue_rentals');
          }}
          title={currentLang === 'marathi' ? 'मुदत संपलेल्या नोंदी पाहण्यासाठी क्लिक करा' : 'Click to view overdue rentals list'}
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              {curT.daily.overdueRentals}
            </span>
            <p className="text-2xl font-black text-rose-600">{overdueRentals.length}</p>
            <p className="text-[10px] text-slate-400 font-light">{curT.daily.overdueRentalsSub}</p>
            <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 group-hover:text-rose-600 transition-colors pt-1">
              <span>{currentLang === 'marathi' ? 'तपशील पाहा' : 'View Details'}</span>
              <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>
          <div className="p-3.5 bg-rose-50 rounded-xl text-rose-600 group-hover:bg-rose-100 transition-colors">
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
                {curT.tables.activeRentalsTitle}
              </h4>
              <span className="bg-rose-50 border border-rose-100 text-rose-700 text-xs px-2.5 py-0.5 rounded-full font-bold">
                {overdueRentals.length} {curT.tables.overdueCount}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                    <th className="px-6 py-4">{curT.tables.partyCol}</th>
                    <th className="px-6 py-4">{curT.tables.sizeCol}</th>
                    <th className="px-6 py-4">{curT.tables.qtyCol}</th>
                    <th className="px-6 py-4">{curT.tables.issueDateCol}</th>
                    <th className="px-6 py-4">{curT.tables.statusCol}</th>
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
                          {rent.status === 'overdue' ? curT.tables.overdueStatus : curT.tables.activeStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {activeRentals.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-light italic">
                        {curT.tables.noRentals}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Custom Visualization of Inventory Distribution */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm">
            <h4 className="text-base font-bold text-charcoal mb-6">{curT.tables.stockAllocation}</h4>
            <div className="space-y-4">
              {plates.map((plate) => {
                const inUsePercent =
                  plate.total > 0 ? (plate.withParties / plate.total) * 100 : 0;
                return (
                  <div key={plate.plateType} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-charcoal font-bold">{plate.plateType}</span>
                      <span className="text-slate-500">
                        {plate.total === 0
                          ? '0'
                          : `${plate.withParties} / ${plate.total} ${curT.tables.rentedRatio} (${inUsePercent.toFixed(0)}%)`}
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
                {curT.tables.withPartiesLegend}
              </span>
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                {curT.tables.inStockyardLegend}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Recent Payments and Account Stats (5 Columns) */}
        <div className="lg:col-span-5 space-y-8">
          {/* Recent Payments Log */}
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <h4 className="text-base font-bold text-charcoal">{curT.tables.recentPayments}</h4>
              <button
                type="button"
                onClick={() => onTabChange('Payments')}
                className="text-xs text-primary hover:text-primary-dark font-bold transition-all cursor-pointer"
              >
                {curT.tables.viewAll}
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
                      {pay.date} • {pay.paymentMode} {pay.cycleNumber ? `(${curT.cycleAlerts.cycle} ${pay.cycleNumber})` : ''}
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
                  {curT.tables.noPayments}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-charcoal text-white p-6 rounded-3xl border border-slate-800/80 relative overflow-hidden shadow-lg">
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff03_1px,transparent_1px)] [background-size:16px_16px] opacity-15" />
            <h4 className="text-base font-bold text-white relative z-10">{curT.tables.quickActions}</h4>
            <div className="grid grid-cols-2 gap-4 mt-6 relative z-10">
              <button
                type="button"
                onClick={() => onTabChange('Rentals')}
                className="bg-slate-900 border border-slate-800 hover:border-primary/50 text-left p-4 rounded-2xl hover:bg-slate-850 transition-all flex flex-col justify-between h-24 cursor-pointer"
              >
                <span className="text-xs text-slate-400">{curT.tables.issueShuttering}</span>
                <span className="font-bold text-sm text-white flex items-center gap-1">
                  {curT.tables.newRentalBtn} <ArrowUpRight className="w-4 h-4 text-primary" />
                </span>
              </button>

              <button
                type="button"
                onClick={() => onTabChange('Returns')}
                className="bg-slate-900 border border-slate-800 hover:border-primary/50 text-left p-4 rounded-2xl hover:bg-slate-850 transition-all flex flex-col justify-between h-24 cursor-pointer"
              >
                <span className="text-xs text-slate-400">{curT.tables.receiveShuttering}</span>
                <span className="font-bold text-sm text-white flex items-center gap-1">
                  {curT.tables.addReturnBtn} <ArrowDownRight className="w-4 h-4 text-primary" />
                </span>
              </button>

              <button
                type="button"
                onClick={() => onTabChange('Payments')}
                className="bg-slate-900 border border-slate-800 hover:border-primary/50 text-left p-4 rounded-2xl hover:bg-slate-850 transition-all flex flex-col justify-between h-24 cursor-pointer"
              >
                <span className="text-xs text-slate-400">{curT.tables.recordPayments}</span>
                <span className="font-bold text-sm text-white flex items-center gap-1">
                  {curT.tables.addPaymentBtn} <ArrowUpRight className="w-4 h-4 text-primary" />
                </span>
              </button>

              <button
                type="button"
                onClick={() => onTabChange('Plate Stock')}
                className="bg-slate-900 border border-slate-800 hover:border-primary/50 text-left p-4 rounded-2xl hover:bg-slate-850 transition-all flex flex-col justify-between h-24 cursor-pointer"
              >
                <span className="text-xs text-slate-400">{curT.tables.manageStock}</span>
                <span className="font-bold text-sm text-white flex items-center gap-1">
                  {curT.tables.plateStockBtn} <ArrowRightIcon className="w-4 h-4 text-primary" />
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
          rentalCycles={rentalCycles ? rentalCycles.filter((c) => c.rentalId === renewTarget.id) : (renewTarget.cycles || [])}
          party={parties.find((p) => p.id === renewTarget.partyId)}
          plates={plates}
          onClose={() => setRenewTarget(null)}
          onConfirm={async (rentalId, renewalDate, newItems, renewDays, payment, penalty) => {
            if (onRenewRental) {
              await onRenewRental(rentalId, renewalDate, newItems, renewDays, payment, penalty);
            }
          }}
        />
      )}

      {/* DASHBOARD DRILL-DOWN DETAIL MODAL */}
      <DashboardDetailModal
        isOpen={selectedDetailField !== null}
        onClose={() => setSelectedDetailField(null)}
        field={selectedDetailField}
        parties={parties}
        plates={plates}
        rentals={rentals}
        rentalCycles={rentalCycles}
        returns={returns}
        payments={payments}
        onTabChange={onTabChange}
        onRenewRental={onRenewRental}
        onInitiateReturn={onInitiateReturn}
        appLanguage={currentLang}
      />
    </div>
  );
};

// Small utility icons mapping helper
const ArrowRightIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

