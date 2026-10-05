import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Layers,
  ShieldCheck,
  UserCheck,
  DollarSign,
  Landmark,
  Smartphone,
  Banknote,
  ClipboardList,
  RefreshCw,
  AlertTriangle,
  Clock,
  Phone,
  MessageSquare,
  ArrowRight,
  RotateCw,
} from 'lucide-react';
import type { Party, PlateStock, Rental, Payment, ReturnLog, RentalCycle, RentalItem } from '../../../data/adminMockData';
import {
  calculateCalendarDays,
  calculateCycleFinances,
  calculateExpectedCycleEndDate,
} from '../../../lib/supabase';
import {
  getCleanPhoneNumber,
  determineCycleAlertStatus,
  buildWhatsAppUrl,
} from '../../../utils/alertMessaging';
import { t, type AppLanguage } from '../../../utils/appTranslations';
import { formatMarathiDate, formatPartyName } from '../../../utils/marathiUtils';

export type DashboardDetailField =
  | 'total_stock'
  | 'in_yard'
  | 'with_parties'
  | 'outstanding'
  | 'cycle_alerts'
  | 'account_1'
  | 'account_2'
  | 'cash'
  | 'today_rentals'
  | 'today_returns'
  | 'overdue_rentals';

interface DashboardDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  field: DashboardDetailField | null;
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
    renewDays?: number
  ) => Promise<void>;
  onInitiateReturn?: (rental: Rental) => void;
  appLanguage?: AppLanguage;
}

export const DashboardDetailModal: React.FC<DashboardDetailModalProps> = ({
  isOpen,
  onClose,
  field,
  parties,
  plates,
  rentals,
  rentalCycles = [],
  returns = [],
  payments,
  onTabChange,
  onRenewRental,
  onInitiateReturn,
  appLanguage = 'marathi',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const todayStr = new Date().toISOString().split('T')[0];
  const curT = t[appLanguage] || t.marathi;
  const isMr = appLanguage === 'marathi';

  // Clear search on field change or open
  useEffect(() => {
    setSearchTerm('');
  }, [field, isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Active cycle finder helper
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
      expectedEndDate: rental.currentCycleEndDate || calculateExpectedCycleEndDate(rental.issueDate, rental.days || 40),
      days: rental.days || 40,
      extraDays: 0,
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

  // Precomputed calculations
  const totalPlatesCount = plates.reduce((sum, p) => sum + p.total, 0);
  const availablePlatesCount = plates.reduce((sum, p) => sum + p.available, 0);
  const platesWithPartiesCount = plates.reduce((sum, p) => sum + p.withParties, 0);
  const totalPendingAmount = parties.reduce((sum, p) => sum + p.pending, 0);

  const account1Balance = payments
    .filter((p) => p.paymentMode === 'Account 1')
    .reduce((sum, p) => sum + p.amount, 0);
  const account2Balance = payments
    .filter((p) => p.paymentMode === 'Account 2')
    .reduce((sum, p) => sum + p.amount, 0);
  const cashBalance = payments
    .filter((p) => p.paymentMode === 'Cash')
    .reduce((sum, p) => sum + p.amount, 0);

  const activeRentals = rentals.filter((r) => r.status === 'active' || r.status === 'overdue');
  const overdueRentals = rentals.filter((r) => {
    if (r.status === 'overdue') return true;
    if (r.status === 'active') {
      const cycle = getActiveCycle(r);
      const targetDays = Number(cycle.days || r.days || 40) || 40;
      const elapsed = calculateCalendarDays(cycle.startDate, todayStr);
      return elapsed > targetDays;
    }
    return false;
  });

  const todayRentals = rentals.filter((r) => r.issueDate === todayStr);
  const todayReturns = returns.filter((r) => r.returnDate === todayStr);

  // All rental cycle alerts evaluation across all durations
  const cycleAlerts = activeRentals
    .map((rent) => {
      const activeCycle = getActiveCycle(rent);
      const targetDays = Number(
        activeCycle.days ||
        rent.days ||
        (activeCycle.expectedEndDate ? calculateCalendarDays(activeCycle.startDate, activeCycle.expectedEndDate) : 40)
      ) || 40;
      const elapsedDays = calculateCalendarDays(activeCycle.startDate, todayStr);
      const daysLeft = targetDays - elapsedDays;
      const extraDays = Math.max(0, elapsedDays - targetDays);
      const party = parties.find((p) => p.id === rent.partyId);
      const partyMobile = party?.mobile || '';

      const finances = calculateCycleFinances(
        {
          startDate: activeCycle.startDate,
          quantity: activeCycle.quantity,
          dailyRate: activeCycle.dailyRate,
          baseRent: activeCycle.baseRent,
          paidAmount: activeCycle.paidAmount,
          days: targetDays,
          items: rent.items,
        },
        todayStr
      );

      const alertStatus = determineCycleAlertStatus(daysLeft, targetDays);
      const plateSummary =
        rent.items && rent.items.length > 0
          ? rent.items.map((it) => `${it.plateType} (${it.quantity})`).join(', ')
          : `${rent.plateType} (${rent.quantity})`;

      const { telLink } = getCleanPhoneNumber(partyMobile);
      const whatsappUrl = buildWhatsAppUrl(
        partyMobile,
        formatPartyName(rent.partyName, isMr ? 'marathi' : 'english'),
        activeCycle.cycleNumber,
        alertStatus.statusType,
        daysLeft,
        extraDays,
        isMr ? 'marathi' : 'english',
        targetDays
      );

      return {
        rental: rent,
        party,
        partyMobile,
        activeCycle,
        targetDays,
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
    .sort((a, b) => a.daysLeft - b.daysLeft);

  if (!isOpen || !field) return null;

  // View configuration based on selected field
  const config = {
    total_stock: {
      title: isMr ? 'एकूण सेंट्रिंग स्टॉक तपशील' : 'Total Shuttering Stock Inventory',
      subtitle: isMr
        ? 'सर्व मापांच्या सेंट्रिंग प्लेट्सची उपलब्ध व वाटप स्थिती'
        : 'Complete breakdown of plate stock across all sizes',
      icon: Layers,
      badgeText: `${totalPlatesCount.toLocaleString()} ${isMr ? 'नग' : 'Pcs'}`,
      targetTab: 'Plate Stock',
      tabButtonText: isMr ? 'स्टॉक व्यवस्थापन उघडा' : 'Manage Plate Stock',
    },
    in_yard: {
      title: isMr ? 'गोदामात शिल्लक साहित्याचा तपशील' : 'Available in Stockyard (Ready to Rent)',
      subtitle: isMr
        ? 'गोदामात शिल्लक व नवीन वाटपासाठी उपलब्ध सेंट्रिंग प्लेट्स'
        : 'Plates currently in stockyard ready for immediate dispatch',
      icon: ShieldCheck,
      badgeText: `${availablePlatesCount.toLocaleString()} ${isMr ? 'उपलब्ध' : 'Available'}`,
      targetTab: 'Rentals',
      tabButtonText: isMr ? '+ नवीन भाडे वाटप करा' : '+ New Rental Dispatch',
    },
    with_parties: {
      title: isMr ? 'ग्राहकांकडे भाड्याने असलेल्या प्लेट्स' : 'Active Plates With Parties (On Sites)',
      subtitle: isMr
        ? 'सध्या बांधकाम साइट्सवर चालू असलेल्या सर्व भाडे नोंदी'
        : 'List of customers and construction sites holding shuttering plates',
      icon: UserCheck,
      badgeText: `${platesWithPartiesCount.toLocaleString()} ${isMr ? 'नग बाहेर' : 'Plates Out'}`,
      targetTab: 'Rentals',
      tabButtonText: isMr ? 'भाडे नोंदी पाहा' : 'View All Rentals',
    },
    outstanding: {
      title: isMr ? 'एकूण येणे बाकी तपशील' : 'Total Outstanding Accounts Receivable',
      subtitle: isMr
        ? 'ग्राहकांकडील बाकी रकमेचा हिशोब व थेट संपर्क'
        : 'Detailed pending payments balance across all customer parties',
      icon: DollarSign,
      badgeText: `₹${totalPendingAmount.toLocaleString('en-IN')}`,
      targetTab: 'Payments',
      tabButtonText: isMr ? '+ नवीन पेमेंट जमा नोंदवा' : '+ Record New Payment',
    },
    cycle_alerts: {
      title: isMr ? 'सर्व भाडे मुदत समाप्ती इशारे' : 'Rental Expiration & Overdue Alerts',
      subtitle: isMr
        ? 'मुदत संपलेल्या व समाप्तीकडे असलेल्या सर्व नोंदींचे रिअल-टाइम ट्रॅकिंग'
        : 'Agreements expiring within 7 days or overdue across all rental terms',
      icon: Clock,
      badgeText: `${cycleAlerts.filter((a) => a.daysLeft <= 7 || a.rental.status === 'overdue' || a.elapsedDays >= a.targetDays).length} ${isMr ? 'लक्ष आवश्यक' : 'Required'}`,
      targetTab: 'Rentals',
      tabButtonText: isMr ? 'सर्व भाडे नोंदी' : 'View All Rentals',
    },
    account_1: {
      title: isMr ? 'खाते १ (बँक डायरेक्ट) जमा व्यवहार' : 'Account 1 (Bank Direct) Collections',
      subtitle: isMr
        ? 'मुख्य बँक खात्यात थेट जमा झालेली सर्व पेमेंट्स'
        : 'Primary bank account direct transfers and deposits',
      icon: Landmark,
      badgeText: `₹${account1Balance.toLocaleString('en-IN')}`,
      targetTab: 'Payments',
      tabButtonText: isMr ? '+ पेमेंट नोंदवा' : '+ Record Payment',
    },
    account_2: {
      title: isMr ? 'खाते २ (डिजिटल) जमा व्यवहार' : 'Account 2 (UPI / Digital) Collections',
      subtitle: isMr
        ? 'फोनपे, गुगलपे व डिजिटल माध्यमातून जमा झालेली पेमेंट्स'
        : 'UPI, QR and secondary digital payment collections',
      icon: Smartphone,
      badgeText: `₹${account2Balance.toLocaleString('en-IN')}`,
      targetTab: 'Payments',
      tabButtonText: isMr ? '+ पेमेंट नोंदवा' : '+ Record Payment',
    },
    cash: {
      title: isMr ? 'रोख रक्कम जमा व्यवहार' : 'Cash on Hand Collections Log',
      subtitle: isMr
        ? 'गोदामात रोख स्वरूपात जमा झालेली सर्व पेमेंट्स'
        : 'Physical cash received and currently in cash register',
      icon: Banknote,
      badgeText: `₹${cashBalance.toLocaleString('en-IN')}`,
      targetTab: 'Payments',
      tabButtonText: isMr ? '+ रोख पेमेंट नोंदवा' : '+ Record Cash Payment',
    },
    today_rentals: {
      title: isMr ? 'आजचे भाडे वाटप नोंदी' : "Today's Rental Dispatches",
      subtitle: isMr
        ? `दिनांक ${todayStr} रोजी दिलेले नवीन भाडे साहित्य`
        : `All rentals dispatched today on ${todayStr}`,
      icon: ClipboardList,
      badgeText: `${todayRentals.length} ${isMr ? 'वाटप' : 'Dispatched'}`,
      targetTab: 'Rentals',
      tabButtonText: isMr ? '+ नवीन वाटप करा' : '+ New Rental Dispatch',
    },
    today_returns: {
      title: isMr ? 'आजचे साहित्य जमा नोंदी' : "Today's Return Intakes",
      subtitle: isMr
        ? `दिनांक ${todayStr} रोजी गोदामात परत आलेले साहित्य`
        : `All returned shuttering materials received today on ${todayStr}`,
      icon: RefreshCw,
      badgeText: `${todayReturns.length} ${isMr ? 'जमा' : 'Intakes'}`,
      targetTab: 'Returns',
      tabButtonText: isMr ? '+ साहित्य जमा करा' : '+ Add Return Intake',
    },
    overdue_rentals: {
      title: isMr ? 'मुदत संपलेल्या भाडे नोंदी (थकबाकी)' : 'Overdue Rentals Past Agreed Term',
      subtitle: isMr
        ? 'ठरवून दिलेल्या मुदतीपेक्षा जास्त दिवस झालेल्या भाडे नोंदी व दंड आकारणी'
        : 'Agreements past agreed rental term requiring cycle renewal or return',
      icon: AlertTriangle,
      badgeText: `${overdueRentals.length} ${isMr ? 'नोंदी' : 'Agreements'}`,
      targetTab: 'Rentals',
      tabButtonText: isMr ? 'भाडे नोंदी पाहा' : 'Manage Rentals',
    },
  }[field];

  const IconComponent = config.icon;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
      <div
        className="bg-white w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/80 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white border border-slate-200/70 shadow-xs text-primary">
              <IconComponent className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black text-slate-800">{config.title}</h3>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {config.badgeText}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-light mt-0.5">{config.subtitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-full transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Action Bar */}
        <div className="p-4 sm:px-6 bg-slate-50/40 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between flex-shrink-0">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={isMr ? 'तपशीलामध्ये शोधा...' : 'Search within details...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick context action */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onTabChange(config.targetTab);
            }}
            className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <span>{config.tabButtonText}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-4 flex-1">
          {/* VIEW: TOTAL SHUTTERING STOCK */}
          {field === 'total_stock' && (
            <TotalStockDetailView
              plates={plates}
              searchTerm={searchTerm}
              isMr={isMr}
              curT={curT}
            />
          )}

          {/* VIEW: AVAILABLE IN YARD */}
          {field === 'in_yard' && (
            <InYardDetailView
              plates={plates}
              searchTerm={searchTerm}
              isMr={isMr}
              curT={curT}
              onTabChange={onTabChange}
              onClose={onClose}
            />
          )}

          {/* VIEW: PLATES WITH PARTIES */}
          {field === 'with_parties' && (
            <WithPartiesDetailView
              rentals={activeRentals}
              parties={parties}
              searchTerm={searchTerm}
              isMr={isMr}
              curT={curT}
              todayStr={todayStr}
              getActiveCycle={getActiveCycle}
            />
          )}

          {/* VIEW: TOTAL OUTSTANDING DUES */}
          {field === 'outstanding' && (
            <OutstandingDuesDetailView
              parties={parties}
              rentals={rentals}
              searchTerm={searchTerm}
              isMr={isMr}
              curT={curT}
              onTabChange={onTabChange}
              onClose={onClose}
            />
          )}

          {/* VIEW: 40-DAY CYCLE ALERTS */}
          {field === 'cycle_alerts' && (
            <CycleAlertsDetailView
              alerts={cycleAlerts}
              searchTerm={searchTerm}
              isMr={isMr}
              curT={curT}
              onRenewRental={onRenewRental}
              onInitiateReturn={onInitiateReturn}
              onClose={onClose}
            />
          )}

          {/* VIEW: ACCOUNT 1 (BANK DIRECT) */}
          {field === 'account_1' && (
            <AccountPaymentsDetailView
              accountName="Account 1"
              accountTitle={isMr ? 'खाते १ (बँक डायरेक्ट)' : 'Account 1 (Bank Direct)'}
              payments={payments.filter((p) => p.paymentMode === 'Account 1')}
              searchTerm={searchTerm}
              isMr={isMr}
              curT={curT}
              colorClass="text-blue-600"
            />
          )}

          {/* VIEW: ACCOUNT 2 (UPI / DIGITAL) */}
          {field === 'account_2' && (
            <AccountPaymentsDetailView
              accountName="Account 2"
              accountTitle={isMr ? 'खाते २ (डिजिटल)' : 'Account 2 (UPI / Digital)'}
              payments={payments.filter((p) => p.paymentMode === 'Account 2')}
              searchTerm={searchTerm}
              isMr={isMr}
              curT={curT}
              colorClass="text-purple-600"
            />
          )}

          {/* VIEW: CASH */}
          {field === 'cash' && (
            <AccountPaymentsDetailView
              accountName="Cash"
              accountTitle={isMr ? 'रोख रक्कम' : 'Cash Collections'}
              payments={payments.filter((p) => p.paymentMode === 'Cash')}
              searchTerm={searchTerm}
              isMr={isMr}
              curT={curT}
              colorClass="text-emerald-600"
            />
          )}

          {/* VIEW: TODAY'S RENTALS */}
          {field === 'today_rentals' && (
            <TodayRentalsDetailView
              todayRentals={todayRentals}
              parties={parties}
              searchTerm={searchTerm}
              isMr={isMr}
              curT={curT}
            />
          )}

          {/* VIEW: TODAY'S RETURNS */}
          {field === 'today_returns' && (
            <TodayReturnsDetailView
              todayReturns={todayReturns}
              searchTerm={searchTerm}
              isMr={isMr}
              curT={curT}
            />
          )}

          {/* VIEW: OVERDUE RENTALS */}
          {field === 'overdue_rentals' && (
            <OverdueRentalsDetailView
              overdueRentals={overdueRentals}
              parties={parties}
              searchTerm={searchTerm}
              isMr={isMr}
              curT={curT}
              todayStr={todayStr}
              getActiveCycle={getActiveCycle}
              onRenewRental={onRenewRental}
              onInitiateReturn={onInitiateReturn}
              onClose={onClose}
            />
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 flex-shrink-0">
          <span>{isMr ? 'आनंद बिल्डर्स डॅशबोर्ड नियंत्रण' : 'Anand Builders Dashboard Details'}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition cursor-pointer"
          >
            {isMr ? 'बंद करा' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// SUB-VIEWS FOR EACH DASHBOARD FIELD
// =========================================================================

/** 1. TOTAL STOCK BREAKDOWN VIEW */
const TotalStockDetailView: React.FC<{
  plates: PlateStock[];
  searchTerm: string;
  isMr: boolean;
  curT: any;
}> = ({ plates, searchTerm, isMr }) => {
  const filtered = plates.filter((p) =>
    p.plateType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalAll = plates.reduce((sum, p) => sum + p.total, 0);
  const yardAll = plates.reduce((sum, p) => sum + p.available, 0);
  const outAll = plates.reduce((sum, p) => sum + p.withParties, 0);

  return (
    <div className="space-y-4">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70">
          <span className="text-[10px] text-slate-400 font-bold uppercase">{isMr ? 'एकूण स्टॉक' : 'Total Stock'}</span>
          <p className="text-xl font-black text-slate-800">{totalAll.toLocaleString()} {isMr ? 'नग' : 'Pcs'}</p>
        </div>
        <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200/60">
          <span className="text-[10px] text-emerald-600 font-bold uppercase">{isMr ? 'गोदामात शिल्लक' : 'In Yard'}</span>
          <p className="text-xl font-black text-emerald-700">{yardAll.toLocaleString()} {isMr ? 'नग' : 'Pcs'}</p>
        </div>
        <div className="bg-orange-50/60 p-3.5 rounded-2xl border border-orange-200/60">
          <span className="text-[10px] text-primary font-bold uppercase">{isMr ? 'ग्राहकांकडे भाड्याने' : 'With Parties'}</span>
          <p className="text-xl font-black text-primary">{outAll.toLocaleString()} {isMr ? 'नग' : 'Pcs'}</p>
        </div>
      </div>

      {/* Table */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">{isMr ? 'प्लेट प्रकार / साईझ' : 'Plate Type / Size'}</th>
              <th className="px-4 py-3 text-right">{isMr ? 'एकूण नग' : 'Total'}</th>
              <th className="px-4 py-3 text-right">{isMr ? 'गोदामात' : 'In Yard'}</th>
              <th className="px-4 py-3 text-right">{isMr ? 'ग्राहकांकडे' : 'With Parties'}</th>
              <th className="px-4 py-3 text-right">{isMr ? 'दर / दिवस' : 'Daily Rate'}</th>
              <th className="px-4 py-3">{isMr ? 'वाटप टक्केवारी' : 'Allocation'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((p) => {
              const utilPercent = p.total > 0 ? (p.withParties / p.total) * 100 : 0;
              return (
                <tr key={p.plateType} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-800 font-mono text-sm">{p.plateType}</td>
                  <td className="px-4 py-3 font-black text-slate-700 text-right">{p.total}</td>
                  <td className="px-4 py-3 font-bold text-emerald-600 text-right">{p.available}</td>
                  <td className="px-4 py-3 font-bold text-primary text-right">{p.withParties}</td>
                  <td className="px-4 py-3 text-slate-600 text-right font-medium">₹{p.dailyRate}</td>
                  <td className="px-4 py-3">
                    <div className="w-32">
                      <div className="flex justify-between text-[10px] text-slate-400 mb-0.5 font-semibold">
                        <span>{utilPercent.toFixed(0)}% {isMr ? 'बाहेर' : 'out'}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                        <div style={{ width: `${utilPercent}%` }} className="bg-primary h-full" />
                        <div style={{ width: `${100 - utilPercent}%` }} className="bg-emerald-500 h-full" />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                  {isMr ? 'कोणतेही साहित्य सापडले नाही' : 'No plate types found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/** 2. AVAILABLE IN YARD VIEW */
const InYardDetailView: React.FC<{
  plates: PlateStock[];
  searchTerm: string;
  isMr: boolean;
  curT: any;
  onTabChange: (tab: string) => void;
  onClose: () => void;
}> = ({ plates, searchTerm, isMr, onTabChange, onClose }) => {
  const filtered = plates.filter((p) =>
    p.plateType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const availableTotal = plates.reduce((sum, p) => sum + p.available, 0);

  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
            {isMr ? 'नवीन भाडे वाटपासाठी गोदामात सज्ज' : 'Ready For Dispatch in Yard'}
          </span>
          <p className="text-2xl font-black text-emerald-700 mt-0.5">
            {availableTotal.toLocaleString()} {isMr ? 'नग उपलब्ध' : 'Plates Available'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            onClose();
            onTabChange('Rentals');
          }}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
        >
          {isMr ? '+ नवीन भाडे द्या' : '+ Issue Rental'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {filtered.map((p) => (
          <div
            key={p.plateType}
            className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-xs transition"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs text-slate-400 font-semibold">{isMr ? 'माप' : 'Size'}</span>
                <h4 className="text-base font-black text-slate-800 font-mono">{p.plateType}</h4>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {isMr ? 'सज्ज' : 'Ready'}
              </span>
            </div>
            <div className="mt-3 flex justify-between items-baseline pt-2 border-t border-slate-100">
              <div>
                <span className="text-[10px] text-slate-400 block">{isMr ? 'गोदाम शिल्लक' : 'In Yard'}</span>
                <span className="text-xl font-black text-emerald-600">{p.available}</span>
                <span className="text-xs text-slate-400 font-light"> / {p.total}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">{isMr ? 'दर / दिवस' : 'Rate/day'}</span>
                <span className="text-sm font-bold text-slate-700">₹{p.dailyRate}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/** 3. PLATES WITH PARTIES VIEW */
const WithPartiesDetailView: React.FC<{
  rentals: Rental[];
  parties: Party[];
  searchTerm: string;
  isMr: boolean;
  curT: any;
  todayStr: string;
  getActiveCycle: (rental: Rental) => RentalCycle;
}> = ({ rentals, parties, searchTerm, isMr, todayStr, getActiveCycle }) => {
  const activeRentalsWithPlates = rentals.filter((r) => r.quantity > 0);

  const filtered = activeRentalsWithPlates.filter((r) => {
    const q = searchTerm.toLowerCase();
    const party = parties.find((p) => p.id === r.partyId);
    return (
      r.partyName.toLowerCase().includes(q) ||
      (party?.mobile && party.mobile.includes(q)) ||
      (r.plateType && r.plateType.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-3">
      {filtered.map((rent) => {
        const party = parties.find((p) => p.id === rent.partyId);
        const mobile = party?.mobile || '';
        const { telLink, whatsappPhone } = getCleanPhoneNumber(mobile);
        const cycle = getActiveCycle(rent);
        const elapsed = calculateCalendarDays(cycle.startDate, todayStr);
        const itemsSummary =
          rent.items && rent.items.length > 0
            ? rent.items.map((it) => `${it.plateType} (${it.quantity} ${isMr ? 'नग' : 'pcs'})`).join(', ')
            : `${rent.plateType} (${rent.quantity} ${isMr ? 'नग' : 'pcs'})`;

        const whatsappText = isMr
          ? `*आनंद सेंट्रिंग प्लेट्स - साहित्य वाटप*\n` +
            `ग्राहक: ${formatPartyName(rent.partyName, 'marathi')}\n` +
            `दिनांक: ${formatMarathiDate(rent.issueDate)}\n` +
            `साहित्य: ${itemsSummary}\n` +
            `एकूण भाडे: ₹${rent.totalRent.toLocaleString('en-IN')} | जमा: ₹${rent.paid.toLocaleString('en-IN')} | बाकी: ₹${rent.pending.toLocaleString('en-IN')}`
          : `*Anand Centring Plates - Rental Dispatch*\n` +
            `Customer: ${formatPartyName(rent.partyName, 'english')}\n` +
            `Date: ${formatMarathiDate(rent.issueDate)}\n` +
            `Items: ${itemsSummary}\n` +
            `Total Rent: ₹${rent.totalRent.toLocaleString('en-IN')} | Paid: ₹${rent.paid.toLocaleString('en-IN')} | Due: ₹${rent.pending.toLocaleString('en-IN')}`;

        const whatsappMsg = encodeURIComponent(whatsappText);

        return (
          <div
            key={rent.id}
            className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-primary/40 transition shadow-xs space-y-2.5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-extrabold text-sm text-slate-800">{formatPartyName(rent.partyName, isMr ? 'marathi' : 'english')}</h4>
                <p className="text-xs text-slate-400 font-mono flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {mobile ? `+91 ${mobile}` : isMr ? 'मोबाईल नोंद नाही' : 'No phone'}
                  {party?.address && <span className="ml-2 text-slate-500">• {party.address}</span>}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {mobile && (
                  <>
                    <a
                      href={telLink}
                      className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-xs"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{isMr ? 'कॉल' : 'Call'}</span>
                    </a>
                    <a
                      href={`https://wa.me/${whatsappPhone}?text=${whatsappMsg}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-xs"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>{isMr ? 'व्हॉट्सॲप' : 'WhatsApp'}</span>
                    </a>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] font-semibold">{isMr ? 'साहित्य व नग' : 'Plates Held'}</span>
                <span className="font-black text-slate-800 font-mono">
                  {rent.items && rent.items.length > 0
                    ? rent.items.map((it) => `${it.plateType} (${it.quantity})`).join(', ')
                    : `${rent.plateType} (${rent.quantity})`}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-semibold">{isMr ? 'वाटप दिनांक' : 'Issue Date'}</span>
                <span className="font-semibold text-slate-700 font-mono text-xs">{formatMarathiDate(rent.issueDate)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-semibold">{isMr ? 'वापरलेले दिवस' : 'Days Used'}</span>
                <span className="font-black text-amber-600">{elapsed} {isMr ? 'दिवस' : 'Days'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-semibold">{isMr ? 'सध्याची बाकी' : 'Pending Rent'}</span>
                <span className="font-black text-rose-600">₹{rent.pending.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="p-8 text-center text-slate-400 italic bg-slate-50 rounded-2xl">
          {isMr ? 'कोणतेही वाटप साहित्य सापडले नाही' : 'No active rentals found with parties.'}
        </div>
      )}
    </div>
  );
};

/** 4. TOTAL OUTSTANDING DUES VIEW */
const OutstandingDuesDetailView: React.FC<{
  parties: Party[];
  rentals: Rental[];
  searchTerm: string;
  isMr: boolean;
  curT: any;
  onTabChange: (tab: string) => void;
  onClose: () => void;
}> = ({ parties, searchTerm, isMr, onTabChange, onClose }) => {
  const duesParties = parties.filter((p) => p.pending > 0);

  const filtered = duesParties.filter((p) => {
    const q = searchTerm.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.mobile && p.mobile.includes(q));
  });

  const totalOutstanding = duesParties.reduce((sum, p) => sum + p.pending, 0);

  return (
    <div className="space-y-4">
      {/* Alert Header Banner */}
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold text-rose-800 uppercase tracking-wide">
            {isMr ? 'एकूण येणे बाकी रक्कम' : 'Total Accounts Receivable'}
          </span>
          <p className="text-2xl font-black text-rose-600 mt-0.5">
            ₹{totalOutstanding.toLocaleString('en-IN')}
          </p>
          <span className="text-xs text-rose-700/80">
            {duesParties.length} {isMr ? 'ग्राहकांकडे रक्कम बाकी आहे' : 'parties have pending balance'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            onClose();
            onTabChange('Payments');
          }}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
        >
          {isMr ? '+ पेमेंट जमा करा' : '+ Record Payment'}
        </button>
      </div>

      {/* Dues List */}
      <div className="space-y-2.5">
        {filtered.map((party) => {
          const { telLink, whatsappPhone } = getCleanPhoneNumber(party.mobile);
          const whatsappMsg = encodeURIComponent(
            `नमस्कार ${formatPartyName(party.name, 'marathi')}, आनंद सेंट्रिंग प्लेट्स कडून: आपले एकूण भाडे बाकी ₹${party.pending.toLocaleString('en-IN')} येणे बाकी आहे. कृपया लवकरात लवकर जमा करावे.`
          );

          return (
            <div
              key={party.id}
              className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-rose-300 transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-sm text-slate-800">{formatPartyName(party.name, isMr ? 'marathi' : 'english')}</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                    {isMr ? 'बाकी' : 'Due'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono">
                  {party.mobile ? `+91 ${party.mobile}` : isMr ? 'फोन नाही' : 'No phone'}
                </p>
                <div className="flex gap-4 text-[11px] text-slate-500 pt-1">
                  <span>{isMr ? 'एकूण भाडे:' : 'Billed:'} <strong>₹{party.totalRent?.toLocaleString('en-IN') || 0}</strong></span>
                  <span>{isMr ? 'जमा:' : 'Paid:'} <strong className="text-emerald-600">₹{party.paid?.toLocaleString('en-IN') || 0}</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">{isMr ? 'येणे बाकी' : 'Balance Due'}</span>
                  <span className="text-lg font-black text-rose-600">₹{party.pending.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {party.mobile && (
                    <>
                      <a
                        href={telLink}
                        className="p-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-xs transition"
                        title="Call party"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                      <a
                        href={`https://wa.me/${whatsappPhone}?text=${whatsappMsg}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition"
                        title="Send WhatsApp payment reminder"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </a>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onTabChange('Payments');
                    }}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    {isMr ? 'पेमेंट घ्या' : 'Pay'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="p-8 text-center text-slate-400 italic bg-slate-50 rounded-2xl">
            {isMr ? 'कोणतीही बाकी रक्कम नाही!' : 'No pending dues found!'}
          </div>
        )}
      </div>
    </div>
  );
};

/** 5. ALL RENTAL CYCLE EXPIRATION ALERTS VIEW */
const CycleAlertsDetailView: React.FC<{
  alerts: any[];
  searchTerm: string;
  isMr: boolean;
  curT: any;
  onRenewRental?: any;
  onInitiateReturn?: any;
  onClose: () => void;
}> = ({ alerts, searchTerm, isMr, curT, onRenewRental, onInitiateReturn, onClose }) => {
  const [detailFilter, setDetailFilter] = useState<'all_expires' | 'overdue' | 'due_soon' | 'all_active'>('all_expires');

  const expiringAlerts = alerts.filter(
    (a) => a.daysLeft <= 7 || a.alertStatus.isOverdue || a.rental.status === 'overdue' || a.elapsedDays >= a.targetDays
  );
  const overdueAlerts = alerts.filter(
    (a) => a.daysLeft <= 0 || a.alertStatus.isOverdue || a.rental.status === 'overdue'
  );
  const dueSoonAlerts = alerts.filter(
    (a) => a.daysLeft > 0 && a.daysLeft <= 7
  );

  const selectedPool =
    detailFilter === 'overdue'
      ? overdueAlerts
      : detailFilter === 'due_soon'
      ? dueSoonAlerts
      : detailFilter === 'all_active'
      ? alerts
      : expiringAlerts;

  const filtered = selectedPool.filter((a) => {
    const q = searchTerm.toLowerCase();
    return a.rental.partyName.toLowerCase().includes(q) || (a.partyMobile && a.partyMobile.includes(q));
  });

  return (
    <div className="space-y-4">
      {/* Quick Filter Pill Buttons */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-2xl text-xs">
        <button
          type="button"
          onClick={() => setDetailFilter('all_expires')}
          className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
            detailFilter === 'all_expires'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {isMr ? 'समाप्ती इशारे' : 'All Expirations'} ({expiringAlerts.length})
        </button>
        <button
          type="button"
          onClick={() => setDetailFilter('overdue')}
          className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
            detailFilter === 'overdue'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-rose-700 hover:text-rose-900'
          }`}
        >
          {isMr ? 'मुदत संपलेले (थकबाकी)' : 'Overdue'} ({overdueAlerts.length})
        </button>
        <button
          type="button"
          onClick={() => setDetailFilter('due_soon')}
          className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
            detailFilter === 'due_soon'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-amber-700 hover:text-amber-900'
          }`}
        >
          {isMr ? 'लवकरच संपणारे (≤७ दिवस)' : 'Due in ≤7 Days'} ({dueSoonAlerts.length})
        </button>
        <button
          type="button"
          onClick={() => setDetailFilter('all_active')}
          className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
            detailFilter === 'all_active'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {isMr ? 'सर्व सक्रिय नोंदी' : 'All Active Cycles'} ({alerts.length})
        </button>
      </div>

      <div className="space-y-3">
        {filtered.map((item) => {
          const {
            rental,
            partyMobile,
            activeCycle,
            finances,
            alertStatus,
            plateSummary,
            telLink,
            whatsappUrl,
          } = item;

          return (
            <div
              key={rental.id}
              className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-purple-300 transition shadow-xs space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-extrabold text-sm text-slate-800">{formatPartyName(rental.partyName, isMr ? 'marathi' : 'english')}</h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${alertStatus.badgeColorClass}`}>
                      {isMr ? alertStatus.statusLabelMr : alertStatus.statusLabel}
                    </span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                      {item.targetDays} {curT.cycleAlerts.days}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {partyMobile ? `+91 ${partyMobile}` : 'No phone'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={telLink}
                    className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-xs"
                  >
                    <Phone className="w-3 h-3" />
                    <span>{curT.cycleAlerts.callParty}</span>
                  </a>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-xs"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>{curT.cycleAlerts.whatsapp}</span>
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-purple-50/60 p-3 rounded-xl text-xs border border-purple-100/70">
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold">{curT.cycleAlerts.plateAndQty}</span>
                  <span className="font-bold text-slate-800">{plateSummary}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold">{curT.cycleAlerts.activeCycle}</span>
                  <span className="font-bold text-slate-800">{curT.cycleAlerts.cycle} {activeCycle.cycleNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold">{curT.cycleAlerts.daysUsed}</span>
                  <span className="font-black text-amber-600">
                    {item.elapsedDays} / {item.targetDays} {curT.cycleAlerts.days}
                    {item.daysLeft < 0
                      ? (isMr ? ` (+${item.extraDays} दिवस जादा)` : ` (+${item.extraDays} days extra)`)
                      : item.daysLeft === 0
                      ? (isMr ? ' (आज समाप्त)' : ' (Ends today)')
                      : (isMr ? ` (${item.daysLeft} दिवस बाकी)` : ` (${item.daysLeft} days left)`)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold">{curT.cycleAlerts.currentPending}</span>
                  <span className="font-black text-rose-600">₹{finances.pendingAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Action buttons inside alert */}
              <div className="flex gap-2 justify-end pt-1">
                {onRenewRental && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onRenewRental(rental.id);
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 transition cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>{curT.cycleAlerts.renewCycle}</span>
                  </button>
                )}
                {onInitiateReturn && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onInitiateReturn(rental);
                    }}
                    className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{curT.cycleAlerts.returnIntake}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="p-8 text-center text-slate-400 italic bg-slate-50 rounded-2xl">
            {isMr ? 'कोणतेही इशारे नाहीत, सर्व भाडे नियमित आहेत.' : 'No active alerts matching the selected filter.'}
          </div>
        )}
      </div>
    </div>
  );
};

/** 6/7/8. ACCOUNT PAYMENTS VIEW (Account 1, Account 2, Cash) */
const AccountPaymentsDetailView: React.FC<{
  accountName: string;
  accountTitle: string;
  payments: Payment[];
  searchTerm: string;
  isMr: boolean;
  curT: any;
  colorClass: string;
}> = ({ accountTitle, payments, searchTerm, isMr, colorClass }) => {
  const filtered = payments.filter((p) => {
    const q = searchTerm.toLowerCase();
    return (
      p.partyName.toLowerCase().includes(q) ||
      p.date.includes(q) ||
      (p.reference && p.reference.toLowerCase().includes(q)) ||
      (p.notes && p.notes.toLowerCase().includes(q))
    );
  });

  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-4">
      {/* Metric banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
            {accountTitle} {isMr ? 'एकूण जमा रक्कम' : 'Total Collected'}
          </span>
          <p className={`text-2xl font-black ${colorClass} mt-0.5`}>
            ₹{totalCollected.toLocaleString('en-IN')}
          </p>
        </div>
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-600">
          {payments.length} {isMr ? 'व्यवहार' : 'Transactions'}
        </span>
      </div>

      {/* Transactions Table */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">{isMr ? 'दिनांक' : 'Date'}</th>
              <th className="px-4 py-3">{isMr ? 'ग्राहक नाव' : 'Customer Name'}</th>
              <th className="px-4 py-3 text-right">{isMr ? 'रक्कम' : 'Amount'}</th>
              <th className="px-4 py-3">{isMr ? 'सायकल' : 'Cycle'}</th>
              <th className="px-4 py-3">{isMr ? 'तपशील / संदर्भ' : 'Notes / Ref'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((pay) => (
              <tr key={pay.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{formatMarathiDate(pay.date)}</td>
                <td className="px-4 py-3 font-bold text-slate-800">{formatPartyName(pay.partyName, isMr ? 'marathi' : 'english')}</td>
                <td className="px-4 py-3 font-black text-right text-emerald-600 text-sm">
                  +₹{pay.amount.toLocaleString('en-IN')}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {pay.cycleNumber ? `#${pay.cycleNumber}` : '-'}
                </td>
                <td className="px-4 py-3 text-slate-400 max-w-xs truncate">
                  {pay.reference || pay.notes || '-'}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">
                  {isMr ? 'कोणतेही पेमेंट आढळले नाही' : 'No payment records found for this account.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/** 9. TODAY'S RENTALS VIEW */
const TodayRentalsDetailView: React.FC<{
  todayRentals: Rental[];
  parties: Party[];
  searchTerm: string;
  isMr: boolean;
  curT: any;
}> = ({ todayRentals, parties, searchTerm, isMr }) => {
  const filtered = todayRentals.filter((r) => {
    const q = searchTerm.toLowerCase();
    return r.partyName.toLowerCase().includes(q) || (r.plateType && r.plateType.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-3">
      {filtered.map((rent) => {
        const party = parties.find((p) => p.id === rent.partyId);
        const mobile = party?.mobile || '';
        const { telLink, whatsappPhone } = getCleanPhoneNumber(mobile);

        const itemsSummary =
          rent.items && rent.items.length > 0
            ? rent.items.map((it) => `${it.plateType} (${it.quantity} ${isMr ? 'नग' : 'pcs'})`).join(', ')
            : `${rent.plateType} (${rent.quantity} ${isMr ? 'नग' : 'pcs'})`;

        const whatsappText = isMr
          ? `*आनंद सेंट्रिंग प्लेट्स - साहित्य वाटप*\n` +
            `ग्राहक: ${formatPartyName(rent.partyName, 'marathi')}\n` +
            `दिनांक: ${formatMarathiDate(rent.issueDate)}\n` +
            `साहित्य: ${itemsSummary}\n` +
            `एकूण भाडे: ₹${rent.totalRent.toLocaleString('en-IN')} | जमा: ₹${rent.paid.toLocaleString('en-IN')} | बाकी: ₹${rent.pending.toLocaleString('en-IN')}`
          : `*Anand Centring Plates - Rental Dispatch*\n` +
            `Customer: ${formatPartyName(rent.partyName, 'english')}\n` +
            `Date: ${formatMarathiDate(rent.issueDate)}\n` +
            `Items: ${itemsSummary}\n` +
            `Total Rent: ₹${rent.totalRent.toLocaleString('en-IN')} | Paid: ₹${rent.paid.toLocaleString('en-IN')} | Due: ₹${rent.pending.toLocaleString('en-IN')}`;

        const whatsappMsg = encodeURIComponent(whatsappText);

        return (
          <div
            key={rent.id}
            className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-orange-300 transition shadow-xs space-y-2.5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-extrabold text-sm text-slate-800">{formatPartyName(rent.partyName, isMr ? 'marathi' : 'english')}</h4>
                <p className="text-xs text-slate-400 font-mono">
                  {mobile ? `+91 ${mobile}` : isMr ? 'फोन नाही' : 'No phone'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="bg-orange-100 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {isMr ? 'आजचे वाटप' : 'Today Dispatch'}
                </span>
                {mobile && (
                  <>
                    <a
                      href={telLink}
                      className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-xs"
                      title="Call party"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{isMr ? 'कॉल' : 'Call'}</span>
                    </a>
                    <a
                      href={`https://wa.me/${whatsappPhone}?text=${whatsappMsg}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-xs"
                      title="Send WhatsApp dispatch details"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>{isMr ? 'व्हॉट्सॲप' : 'WhatsApp'}</span>
                    </a>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] font-semibold">{isMr ? 'साहित्य' : 'Plates'}</span>
                <span className="font-bold text-slate-800">{rent.plateType}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-semibold">{isMr ? 'नग' : 'Quantity'}</span>
                <span className="font-black text-slate-800">{rent.quantity}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-semibold">{isMr ? 'एकूण भाडे' : 'Total Rent'}</span>
                <span className="font-bold text-slate-700">₹{rent.totalRent.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-semibold">{isMr ? 'जमा ॲडव्हान्स' : 'Paid Advance'}</span>
                <span className="font-black text-emerald-600">₹{rent.paid.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="p-8 text-center text-slate-400 italic bg-slate-50 rounded-2xl">
          {isMr ? 'आज कोणतीही भाडे नोंद झालेली नाही.' : 'No rental dispatches recorded today.'}
        </div>
      )}
    </div>
  );
};

/** 10. TODAY'S RETURNS VIEW */
const TodayReturnsDetailView: React.FC<{
  todayReturns: ReturnLog[];
  searchTerm: string;
  isMr: boolean;
  curT: any;
}> = ({ todayReturns, searchTerm, isMr }) => {
  const filtered = todayReturns.filter((r) => {
    const q = searchTerm.toLowerCase();
    return r.partyName.toLowerCase().includes(q) || (r.plateType && r.plateType.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-3">
      {filtered.map((ret) => (
        <div
          key={ret.id}
          className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 transition shadow-xs space-y-2.5"
        >
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-extrabold text-sm text-slate-800">{formatPartyName(ret.partyName, isMr ? 'marathi' : 'english')}</h4>
              <p className="text-xs text-slate-400 font-mono">{formatMarathiDate(ret.returnDate)}</p>
            </div>
            <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {isMr ? 'आज जमा' : 'Today Return'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] font-semibold">{isMr ? 'साहित्य' : 'Plate Type'}</span>
              <span className="font-bold text-slate-800 font-mono">{ret.plateType}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-semibold">{isMr ? 'जमा नग' : 'Returned Qty'}</span>
              <span className="font-black text-blue-600">{ret.returnedQuantity}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-semibold">{isMr ? 'शिल्लक नग' : 'Remaining'}</span>
              <span className="font-bold text-slate-700">{ret.remainingQuantity}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-semibold">{isMr ? 'जमा रक्कम' : 'Collected'}</span>
              <span className="font-black text-emerald-600">
                {ret.collectedAmount ? `₹${ret.collectedAmount}` : '-'}
              </span>
            </div>
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="p-8 text-center text-slate-400 italic bg-slate-50 rounded-2xl">
          {isMr ? 'आज कोणतेही साहित्य जमा झालेले नाही.' : 'No return intakes logged today.'}
        </div>
      )}
    </div>
  );
};

/** 11. OVERDUE RENTALS VIEW */
const OverdueRentalsDetailView: React.FC<{
  overdueRentals: Rental[];
  parties: Party[];
  searchTerm: string;
  isMr: boolean;
  curT: any;
  todayStr: string;
  getActiveCycle: (rental: Rental) => RentalCycle;
  onRenewRental?: any;
  onInitiateReturn?: any;
  onClose: () => void;
}> = ({
  overdueRentals,
  parties,
  searchTerm,
  isMr,
  curT,
  todayStr,
  getActiveCycle,
  onRenewRental,
  onInitiateReturn,
  onClose,
}) => {
  const filtered = overdueRentals.filter((r) => {
    const q = searchTerm.toLowerCase();
    const party = parties.find((p) => p.id === r.partyId);
    return r.partyName.toLowerCase().includes(q) || (party?.mobile && party.mobile.includes(q));
  });

  return (
    <div className="space-y-3">
      {filtered.map((rent) => {
        const party = parties.find((p) => p.id === rent.partyId);
        const mobile = party?.mobile || '';
        const { telLink, whatsappPhone } = getCleanPhoneNumber(mobile);
        const cycle = getActiveCycle(rent);
        const targetDays = Number(cycle.days || rent.days || 40) || 40;
        const elapsed = calculateCalendarDays(cycle.startDate, todayStr);
        const overdueDays = Math.max(0, elapsed - targetDays);
        const whatsappMsg = encodeURIComponent(
          `नमस्कार ${formatPartyName(rent.partyName, 'marathi')}, आनंद सेंट्रिंग प्लेट्स कडून: आपल्या ${targetDays} दिवस भाडे कराराची मुदत संपली आहे (${overdueDays} दिवस जास्त झाले). कृपया साहित्य जमा करावे किंवा मुदत वाढवून घ्यावी.`
        );

        return (
          <div
            key={rent.id}
            className="p-4 rounded-2xl border border-rose-200 bg-rose-50/30 hover:border-rose-300 transition shadow-xs space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-sm text-slate-800">{formatPartyName(rent.partyName, isMr ? 'marathi' : 'english')}</h4>
                  <span className="bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                    {isMr ? `${overdueDays} दिवस मुदत संपली` : `${overdueDays} Days Overdue`}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {mobile ? `+91 ${mobile}` : 'No phone'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {mobile && (
                  <>
                    <a
                      href={telLink}
                      className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-xs"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{curT.cycleAlerts.callParty}</span>
                    </a>
                    <a
                      href={`https://wa.me/${whatsappPhone}?text=${whatsappMsg}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-xs"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>{curT.cycleAlerts.whatsapp}</span>
                    </a>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-2.5 rounded-xl text-xs border border-rose-100">
              <div>
                <span className="text-slate-400 block text-[10px] font-semibold">{isMr ? 'साहित्य' : 'Plates'}</span>
                <span className="font-bold text-slate-800">{rent.plateType} ({rent.quantity})</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-semibold">{isMr ? 'एकूण दिवस' : 'Total Days'}</span>
                <span className="font-black text-rose-600">{elapsed} {isMr ? 'दिवस' : 'Days'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-semibold">{isMr ? 'मुदत संपले' : 'Overdue'}</span>
                <span className="font-bold text-rose-700">+{overdueDays} {isMr ? 'दिवस' : 'Days'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-semibold">{isMr ? 'बाकी रक्कम' : 'Pending'}</span>
                <span className="font-black text-rose-600">₹{rent.pending.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-1">
              {onRenewRental && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRenewRental(rent.id);
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 transition cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>{curT.cycleAlerts.renewCycle}</span>
                </button>
              )}
              {onInitiateReturn && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onInitiateReturn(rent);
                  }}
                  className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{curT.cycleAlerts.returnIntake}</span>
                </button>
              )}
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="p-8 text-center text-slate-400 italic bg-slate-50 rounded-2xl">
          {isMr ? 'कोणतीही भाडे नोंद मुदत संपलेली नाही.' : 'No overdue rentals exceeding agreed terms.'}
        </div>
      )}
    </div>
  );
};
