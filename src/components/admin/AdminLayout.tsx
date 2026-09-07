import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Ruler,
  Layers,
  ClipboardList,
  RefreshCw,
  DollarSign,
  AlertCircle,
  FileText,
  Bell,
  BarChart3,
  Sliders,
  LogOut,
  Menu,
  X,
  User,
  ChevronRight
} from 'lucide-react';

// Imports Tab Components
import { DashboardTab } from './tabs/DashboardTab';
import { PartiesTab } from './tabs/PartiesTab';
import { PlateTypesTab } from './tabs/PlateTypesTab';
import { StockTab } from './tabs/StockTab';
import { RentalsTab } from './tabs/RentalsTab';
import { ReturnsTab } from './tabs/ReturnsTab';
import { PaymentsTab } from './tabs/PaymentsTab';
import { UdhariTab } from './tabs/UdhariTab';
import { LedgerTab } from './tabs/LedgerTab';
import { NotificationsTab } from './tabs/NotificationsTab';
import { ReportsTab } from './tabs/ReportsTab';
import { SettingsTab } from './tabs/SettingsTab';
import { Toast } from './Toast';
import type { ToastMessage } from './Toast';

// Supabase & Types
import {
  fetchStockItems,
  insertStockItem,
  updateStockItem,
  deleteStockItem,
  STANDARD_PLATE_SIZES,
} from '../../lib/supabase';
import type { PlateSizeType, InventoryStockItem } from '../../lib/supabase';

// Initial Mock data
import {
  INITIAL_PARTIES,
  INITIAL_PLATES,
  INITIAL_RENTALS,
  INITIAL_RETURNS,
  INITIAL_PAYMENTS,
  INITIAL_LEDGER,
  INITIAL_NOTIFICATIONS
} from '../../data/adminMockData';

import type {
  Party,
  PlateStock,
  Rental,
  ReturnLog,
  Payment,
  LedgerEntry,
  AdminNotification
} from '../../data/adminMockData';

interface AdminLayoutProps {
  onLogout: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // --- STATEFUL DB CONCEPT ---
  const [parties, setParties] = useState<Party[]>(INITIAL_PARTIES);
  const [plateSettings, setPlateSettings] = useState<PlateStock[]>(INITIAL_PLATES);
  const [rentals, setRentals] = useState<Rental[]>(INITIAL_RENTALS);
  const [returns, setReturns] = useState<ReturnLog[]>(INITIAL_RETURNS);
  const [payments, setPayments] = useState<Payment[]>(INITIAL_PAYMENTS);
  const [ledger, setLedger] = useState<LedgerEntry[]>(INITIAL_LEDGER);
  const [notifications, setNotifications] = useState<AdminNotification[]>(INITIAL_NOTIFICATIONS);

  // Live Supabase inventory stock items
  const [stockItems, setStockItems] = useState<InventoryStockItem[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString().slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Load stock records from Supabase on mount
  useEffect(() => {
    let isMounted = true;
    const loadStock = async () => {
      try {
        const items = await fetchStockItems();
        if (isMounted) {
          setStockItems(items);
        }
      } catch (err: any) {
        console.error('Failed to load stock from Supabase:', err);
      }
    };
    loadStock();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute live synchronized plates data derived from Supabase stock additions, rentals, and returns
  const derivedPlates: PlateStock[] = STANDARD_PLATE_SIZES.map((size) => {
    const totalForSize = stockItems
      .filter((s) => s.plate_size === size)
      .reduce((sum, s) => sum + s.quantity, 0);

    // Calculate active plates currently with parties (rented minus returned)
    const activeRentalsForSize = rentals.filter(
      (r) => r.plateType === size && (r.status === 'active' || r.status === 'overdue')
    );
    let withPartiesForSize = 0;
    for (const rent of activeRentalsForSize) {
      const returnedForRent = returns
        .filter((ret) => ret.rentalId === rent.id)
        .reduce((sum, ret) => sum + ret.returnedQuantity, 0);
      withPartiesForSize += Math.max(0, rent.quantity - returnedForRent);
    }

    const availableForSize = Math.max(0, totalForSize - withPartiesForSize);

    // Preserve customized rate or manual status from plateSettings if any
    const existingSetting = plateSettings.find((p) => p.plateType === size);
    const dailyRate = existingSetting?.dailyRate ?? 1.5;

    let status: 'available' | 'low_stock' | 'out_of_stock' = 'available';
    if (existingSetting?.status === 'out_of_stock') {
      status = 'out_of_stock';
    } else if (totalForSize === 0 || availableForSize === 0) {
      status = 'out_of_stock';
    } else if (availableForSize / totalForSize < 0.2) {
      status = 'low_stock';
    }

    return {
      plateType: size,
      dailyRate,
      total: totalForSize,
      withParties: withPartiesForSize,
      available: availableForSize,
      status,
    };
  });

  // --- OPERATIONS CALLBACKS ---

  // Stock CRUD Operations (Admin website as single point of operation)
  const handleAddStock = async (data: {
    plate_size: PlateSizeType;
    quantity: number;
    received_date: string;
    notes?: string;
  }) => {
    try {
      const created = await insertStockItem(data);
      setStockItems((prev) => [created, ...prev.filter((i) => i.id !== created.id)]);
      addToast('success', `Added ${data.quantity} plates of size ${data.plate_size} to stock.`);
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to add stock batch.');
      throw err;
    }
  };

  const handleUpdateStock = async (
    id: string,
    data: {
      plate_size: PlateSizeType;
      quantity: number;
      received_date: string;
      notes?: string;
    }
  ) => {
    try {
      const updated = await updateStockItem(id, data);
      setStockItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
      addToast('success', `Updated stock record for size ${data.plate_size}.`);
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to update stock record.');
      throw err;
    }
  };

  const handleDeleteStock = async (id: string) => {
    try {
      const target = stockItems.find((s) => s.id === id);
      await deleteStockItem(id);
      setStockItems((prev) => prev.filter((item) => item.id !== id));
      addToast(
        'success',
        `Deleted ${target ? `${target.quantity} plates of ${target.plate_size}` : 'stock entry'} from inventory.`
      );
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to delete stock entry.');
      throw err;
    }
  };

  // 1. Parties
  const handleAddParty = (newParty: Omit<Party, 'id' | 'platesWithParty' | 'totalRent' | 'paid' | 'pending' | 'status'>) => {
    const created: Party = {
      ...newParty,
      id: `party-${Date.now()}`,
      platesWithParty: 0,
      totalRent: 0,
      paid: 0,
      pending: 0,
      status: 'active',
    };
    setParties((prev) => [...prev, created]);
    addToast('success', `Party "${created.name}" registered.`);
  };

  const handleEditParty = (updatedParty: Party) => {
    setParties((prev) => prev.map((p) => (p.id === updatedParty.id ? updatedParty : p)));
    addToast('success', `Party "${updatedParty.name}" updated.`);
  };

  const handleDeleteParty = (partyId: string) => {
    const target = parties.find((p) => p.id === partyId);
    setParties((prev) => prev.filter((p) => p.id !== partyId));
    addToast('success', `Party "${target?.name || ''}" removed.`);
  };

  // 2. Plate settings (Rate & Status)
  const handleUpdatePlateRate = (plateType: string, newRate: number) => {
    setPlateSettings((prev) =>
      prev.map((p) => (p.plateType === plateType ? { ...p, dailyRate: newRate } : p))
    );
    addToast('success', `Updated daily rate for ${plateType} to ₹${newRate.toFixed(2)}/day.`);
  };

  const handleUpdatePlateStatus = (plateType: string, newStatus: 'available' | 'low_stock' | 'out_of_stock') => {
    setPlateSettings((prev) =>
      prev.map((p) => (p.plateType === plateType ? { ...p, status: newStatus } : p))
    );
    addToast('info', `Set status of ${plateType} to ${newStatus}.`);
  };

  // 3. Rentals
  const handleAddRental = (newRental: Omit<Rental, 'id' | 'totalRent' | 'pending' | 'status'>) => {
    const totalRent = newRental.quantity * newRental.dailyRate * newRental.days;
    const pending = totalRent - newRental.paid;

    const created: Rental = {
      ...newRental,
      id: `rent-${Date.now()}`,
      totalRent,
      pending,
      status: 'active',
    };

    // Update Rentals
    setRentals((prev) => [created, ...prev]);

    // Update Party balance and items
    setParties((prev) =>
      prev.map((p) =>
        p.id === newRental.partyId
          ? {
              ...p,
              platesWithParty: p.platesWithParty + newRental.quantity,
              totalRent: p.totalRent + totalRent,
              paid: p.paid + newRental.paid,
              pending: p.pending + pending,
            }
          : p
      )
    );

    // Append to Ledger
    const ledEntry: LedgerEntry = {
      id: `led-${Date.now()}`,
      partyId: newRental.partyId,
      date: newRental.issueDate,
      description: `Rental Issued: ${newRental.quantity} Plates of ${newRental.plateType} for ${newRental.days} days`,
      debit: totalRent,
      credit: 0,
      balance: (parties.find((p) => p.id === newRental.partyId)?.pending || 0) + pending,
    };
    setLedger((prev) => [...prev, ledEntry]);

    // If advance payment was made, add payment voucher log
    if (newRental.paid > 0) {
      const pay: Payment = {
        id: `pay-advance-${Date.now()}`,
        partyId: newRental.partyId,
        partyName: newRental.partyName,
        amount: newRental.paid,
        date: newRental.issueDate,
        paymentMode: newRental.paymentMode === 'Udhari' ? 'Cash' : (newRental.paymentMode as any),
        reference: `ADV-${Date.now().toString().slice(-4)}`,
        notes: 'Advance payment for rental dispatch sheet',
        status: 'verified',
      };
      setPayments((prev) => [pay, ...prev]);

      const ledEntryPay: LedgerEntry = {
        id: `led-pay-${Date.now()}`,
        partyId: newRental.partyId,
        date: newRental.issueDate,
        description: `Advance Payment Received - ${pay.paymentMode} (Ref: ${pay.reference})`,
        debit: 0,
        credit: newRental.paid,
        balance: ledEntry.balance - newRental.paid,
      };
      setLedger((prev) => [...prev, ledEntryPay]);
    }

    addToast('success', `Dispatched ${newRental.quantity} plates of ${newRental.plateType} to ${newRental.partyName}.`);
  };

  const handleUpdateRentalStatus = (rentalId: string, status: 'active' | 'returned' | 'overdue') => {
    setRentals((prev) => prev.map((r) => (r.id === rentalId ? { ...r, status } : r)));
    addToast('info', `Rental status updated to ${status}.`);
  };

  // 4. Returns
  const handleAddReturn = (newReturn: Omit<ReturnLog, 'id' | 'partyName' | 'plateType' | 'issuedQuantity'>) => {
    const matchedRental = rentals.find((r) => r.id === newReturn.rentalId);
    if (!matchedRental) return;

    const created: ReturnLog = {
      ...newReturn,
      id: `ret-${Date.now()}`,
      partyName: matchedRental.partyName,
      plateType: matchedRental.plateType,
      issuedQuantity: matchedRental.quantity,
    };

    setReturns((prev) => [created, ...prev]);

    // Update Party plates out count
    setParties((prev) =>
      prev.map((p) =>
        p.id === newReturn.partyId
          ? {
              ...p,
              platesWithParty: Math.max(0, p.platesWithParty - newReturn.returnedQuantity),
            }
          : p
      )
    );

    // If remaining quantity becomes zero, mark rental agreement as fully returned
    if (newReturn.remainingQuantity === 0) {
      setRentals((prev) =>
        prev.map((r) => (r.id === newReturn.rentalId ? { ...r, status: 'returned' } : r))
      );
    }

    // Ledger Entry for Return Intake
    const ledEntry: LedgerEntry = {
      id: `led-ret-${Date.now()}`,
      partyId: newReturn.partyId,
      date: newReturn.returnDate,
      description: `Material Return Intake: ${newReturn.returnedQuantity} Plates of ${matchedRental.plateType} returned`,
      debit: 0,
      credit: 0,
      balance: parties.find((p) => p.id === newReturn.partyId)?.pending || 0,
    };
    setLedger((prev) => [...prev, ledEntry]);

    addToast('success', `Received ${newReturn.returnedQuantity} plates of ${matchedRental.plateType} from ${matchedRental.partyName}.`);
  };

  // 5. Payments
  const handleAddPayment = (newPayment: Omit<Payment, 'id' | 'partyName' | 'reference' | 'status'>) => {
    const party = parties.find((p) => p.id === newPayment.partyId);
    if (!party) return;

    const created: Payment = {
      ...newPayment,
      id: `pay-${Date.now()}`,
      partyName: party.name,
      reference: `PAY-${Date.now().toString().slice(-4)}`,
      status: 'verified',
    };

    setPayments((prev) => [created, ...prev]);

    // Reduce Party outstanding balance
    setParties((prev) =>
      prev.map((p) =>
        p.id === newPayment.partyId
          ? {
              ...p,
              paid: p.paid + newPayment.amount,
              pending: Math.max(0, p.pending - newPayment.amount),
            }
          : p
      )
    );

    // Ledger Voucher credit entry
    const ledEntry: LedgerEntry = {
      id: `led-pay-${Date.now()}`,
      partyId: newPayment.partyId,
      date: newPayment.date,
      description: `Payment Received - ${newPayment.paymentMode} (Ref: ${created.reference})`,
      debit: 0,
      credit: newPayment.amount,
      balance: Math.max(0, party.pending - newPayment.amount),
    };
    setLedger((prev) => [...prev, ledEntry]);

    // Append a notification confirming receipt
    const alertNot: AdminNotification = {
      id: `not-pay-${Date.now()}`,
      type: 'payment',
      title: 'Payment Confirmed',
      message: `💸 Received ₹${newPayment.amount.toLocaleString('en-IN')} from ${party.name} (${newPayment.paymentMode}).`,
      date: newPayment.date,
      isRead: false,
    };
    setNotifications((prev) => [alertNot, ...prev]);
    addToast('success', `Payment of ₹${newPayment.amount.toLocaleString('en-IN')} recorded.`);
  };

  // 6. Notifications Alerts
  const handleMarkRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const handleClearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const unreadAlertsCount = notifications.filter((n) => !n.isRead).length;

  // Render Page Content based on selected Active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'Dashboard':
        return (
          <DashboardTab
            parties={parties}
            plates={derivedPlates}
            rentals={rentals}
            returns={returns}
            payments={payments}
            onTabChange={setActiveTab}
          />
        );
      case 'Parties':
        return (
          <PartiesTab
            parties={parties}
            rentals={rentals}
            payments={payments}
            ledger={ledger}
            onAddParty={handleAddParty}
            onEditParty={handleEditParty}
            onDeleteParty={handleDeleteParty}
          />
        );
      case 'Plate Types':
        return (
          <PlateTypesTab
            plates={derivedPlates}
            onUpdateRate={handleUpdatePlateRate}
            onUpdateStatus={handleUpdatePlateStatus}
          />
        );
      case 'Plate Stock':
        return (
          <StockTab
            stockItems={stockItems}
            rentals={rentals}
            returns={returns}
            plates={derivedPlates}
            onAddStock={handleAddStock}
            onUpdateStock={handleUpdateStock}
            onDeleteStock={handleDeleteStock}
          />
        );
      case 'Rentals':
        return (
          <RentalsTab
            rentals={rentals}
            parties={parties}
            plates={derivedPlates}
            onAddRental={handleAddRental}
            onUpdateRentalStatus={handleUpdateRentalStatus}
          />
        );
      case 'Returns':
        return (
          <ReturnsTab
            returns={returns}
            rentals={rentals}
            parties={parties}
            onAddReturn={handleAddReturn}
          />
        );
      case 'Payments':
        return (
          <PaymentsTab
            payments={payments}
            parties={parties}
            onAddPayment={handleAddPayment}
          />
        );
      case 'Udhari':
        return <UdhariTab parties={parties} payments={payments} />;
      case 'Ledger':
        return <LedgerTab parties={parties} ledger={ledger} />;
      case 'Notifications':
        return (
          <NotificationsTab
            notifications={notifications}
            onMarkRead={handleMarkRead}
            onClearNotification={handleClearNotification}
            onMarkAllRead={handleMarkAllRead}
          />
        );
      case 'Reports':
        return (
          <ReportsTab
            parties={parties}
            plates={derivedPlates}
            rentals={rentals}
            returns={returns}
            payments={payments}
          />
        );
      case 'Settings':
        return <SettingsTab />;
      default:
        return <div className="p-8 text-center text-slate-400">Section to be added.</div>;
    }
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Parties', icon: Users },
    { name: 'Plate Types', icon: Ruler },
    { name: 'Plate Stock', icon: Layers },
    { name: 'Rentals', icon: ClipboardList },
    { name: 'Returns', icon: RefreshCw },
    { name: 'Payments', icon: DollarSign },
    { name: 'Udhari', icon: AlertCircle },
    { name: 'Ledger', icon: FileText },
    { name: 'Notifications', icon: Bell, badgeCount: unreadAlertsCount },
    { name: 'Reports', icon: BarChart3 },
    { name: 'Settings', icon: Sliders },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row w-full font-sans text-slate-800">
      {/* 1. Mobile Top Header Bar */}
      <div className="md:hidden w-full bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between text-white sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="ANAND Logo" className="h-9 w-auto object-contain" />
          <div className="text-left leading-none">
            <span className="text-xs font-bold block">ANAND PLATES</span>
            <span className="text-[9px] text-primary font-bold">आनंद मटेरियल</span>
          </div>
        </div>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-850"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* 2. Sidebar Container (Sticky on desktop, drawer overlay on mobile) */}
      <aside
        className={`fixed inset-y-0 left-0 bg-slate-900 text-slate-400 w-64 transform z-45 md:z-20 md:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col justify-between border-r border-slate-850 md:sticky md:top-0 md:h-screen ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Logo Branding */}
          <div className="hidden md:flex items-center gap-3 p-6 border-b border-slate-850">
            <img src="/logo.png" alt="ANAND Logo" className="h-10 w-auto object-contain" />
            <div className="text-left leading-none space-y-0.5">
              <h1 className="text-white text-xs font-black tracking-wider uppercase">ANAND BUILDERS</h1>
              <p className="text-primary text-[9px] font-bold">आनंद मटेरियल सप्लायर</p>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="flex-grow py-6 px-4 space-y-1 text-left">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    setActiveTab(item.name);
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-primary text-white font-bold shadow-md shadow-orange-500/10'
                      : 'hover:bg-slate-850 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span>{item.name}</span>
                  </span>

                  {/* Badges indicators */}
                  {item.badgeCount !== undefined && item.badgeCount > 0 ? (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
                        isActive ? 'bg-white text-primary' : 'bg-rose-500 text-white'
                      }`}
                    >
                      {item.badgeCount}
                    </span>
                  ) : (
                    !isActive && (
                      <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User logout panel */}
        <div className="p-4 border-t border-slate-850 bg-slate-950/40">
          <div className="flex items-center justify-between bg-slate-900 border border-slate-850 p-3 rounded-2xl">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                <User className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white">Anand Admin</p>
                <p className="text-[10px] text-slate-500 font-light">Lead Manager</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-rose-500 rounded-lg transition-all"
              title="Logout session"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Background shadow click-overlay (Mobile only when side drawer is open) */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 md:hidden animate-fadeIn"
        />
      )}

      {/* 3. Main content frame */}
      <div className="flex-grow flex flex-col overflow-hidden min-h-screen">
        {/* Top Header Panel (Desktop only) */}
        <header className="hidden md:flex bg-white border-b border-slate-200/80 px-8 py-5 items-center justify-between sticky top-0 z-30">
          <div className="text-left">
            <h2 className="text-xl font-black text-charcoal">{activeTab} Controls</h2>
            <p className="text-[11px] text-slate-400 font-light">Anand Builders Administrative Console</p>
          </div>

          <div className="flex items-center gap-6">
            {/* Quick search input */}
            <div className="relative w-64">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Global searching..."
                className="w-full bg-slate-50 border border-slate-250/60 focus:border-primary focus:outline-none pl-9 pr-3 py-1.5 rounded-lg text-xs font-semibold"
              />
            </div>

            {/* Notification alert counter bell */}
            <button
              onClick={() => setActiveTab('Notifications')}
              className="p-2 hover:bg-slate-50 text-slate-500 rounded-lg relative transition"
            >
              <Bell className="w-5 h-5" />
              {unreadAlertsCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
              )}
            </button>

            {/* User credentials */}
            <div className="flex items-center gap-2 border-l border-slate-200 pl-6 text-left">
              <div className="text-right leading-none">
                <span className="text-xs font-bold block text-slate-800">Admin Account</span>
                <span className="text-[9px] text-primary font-bold">Manager Mode</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
                AD
              </div>
            </div>
          </div>
        </header>

        {/* Page Tab Core Body */}
        <main className="flex-grow p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {renderTabContent()}
        </main>
      </div>

      {/* Global Toast Notifications */}
      <Toast toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};
