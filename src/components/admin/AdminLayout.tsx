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
  ChevronRight,
  Loader2
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
  fetchParties,
  insertParty,
  updateParty,
  deleteParty,
  fetchPlateTypes,
  updatePlateTypeRate,
  updatePlateTypeStatus,
  fetchStockItems,
  insertStockItem,
  updateStockItem,
  deleteStockItem,
  fetchRentals,
  insertRental,
  updateRentalStatus,
  fetchReturns,
  insertReturn,
  fetchPayments,
  insertPayment,
  fetchLedgerEntries,
  insertLedgerEntry,
  fetchNotifications,
  insertNotification,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  fetchRentalCycles,
  insertRentalCycle,
  updateRentalCycle,
  updateRentalCyclePointer,
  calculateExpectedCycleEndDate,
  calculateCycleFinances,
  determineRenewalStartDate,
  STANDARD_PLATE_SIZES,
  supabase,
} from '../../lib/supabase';
import type {
  PlateSizeType,
  InventoryStockItem,
  PlateTypeRecord,
  PartyRecord,
} from '../../lib/supabase';

import type {
  Party,
  PlateStock,
  Rental,
  RentalCycle,
  ReturnLog,
  Payment,
  LedgerEntry,
  AdminNotification,
} from '../../data/adminMockData';

interface AdminLayoutProps {
  onLogout: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [preselectedRentalId, setPreselectedRentalId] = useState<string | null>(null);

  // --- STATEFUL DB CONCEPT ---
  const [rawParties, setRawParties] = useState<PartyRecord[]>([]);
  const [plateSettings, setPlateSettings] = useState<PlateTypeRecord[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [rentalCycles, setRentalCycles] = useState<RentalCycle[]>([]);
  const [returns, setReturns] = useState<ReturnLog[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [stockItems, setStockItems] = useState<InventoryStockItem[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString().slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Load all records from Supabase on mount
  const loadAllData = React.useCallback(async (showLoadingSpinner = true) => {
    try {
      if (showLoadingSpinner) {
        setIsLoading(true);
      }
      const [
        loadedParties,
        loadedPlateTypes,
        loadedStock,
        loadedRentals,
        loadedCycles,
        loadedReturns,
        loadedPayments,
        loadedLedger,
        loadedNotifications,
      ] = await Promise.all([
        fetchParties(),
        fetchPlateTypes(),
        fetchStockItems(),
        fetchRentals(),
        fetchRentalCycles(),
        fetchReturns(),
        fetchPayments(),
        fetchLedgerEntries(),
        fetchNotifications(),
      ]);

      const todayStr = new Date().toISOString().split('T')[0];

      setRawParties(loadedParties);
      setPlateSettings(loadedPlateTypes);
      setStockItems(loadedStock);

      // Map loaded cycles
      const allCycles: RentalCycle[] = loadedCycles.map((c) => ({
        id: c.id,
        rentalId: c.rental_id,
        partyId: c.party_id,
        cycleNumber: c.cycle_number,
        startDate: c.start_date,
        expectedEndDate: c.expected_end_date,
        actualEndDate: c.actual_end_date,
        days: c.days,
        extraDays: c.extra_days,
        dailyRate: c.daily_rate,
        quantity: c.quantity,
        baseRent: c.base_rent,
        extraAmount: c.extra_amount,
        totalAmount: c.total_amount,
        paidAmount: c.paid_amount,
        pendingAmount: c.pending_amount,
        status: c.status,
        notes: c.notes,
      }));

      // Ensure every existing rental has at least a Cycle 1
      for (const r of loadedRentals) {
        if (!allCycles.some((c) => c.rentalId === r.id)) {
          const expectedEnd = r.current_cycle_end_date || calculateExpectedCycleEndDate(r.issue_date, r.days || 40);
          allCycles.push({
            id: `cyc-synth-${r.id}`,
            rentalId: r.id,
            partyId: r.party_id,
            cycleNumber: 1,
            startDate: r.issue_date,
            expectedEndDate: expectedEnd,
            actualEndDate: r.actual_return_date,
            days: r.days || 40,
            extraDays: 0,
            dailyRate: r.daily_rate,
            quantity: r.quantity,
            baseRent: r.total_rent,
            extraAmount: 0,
            totalAmount: r.total_rent,
            paidAmount: r.paid_amount,
            pendingAmount: r.pending_amount,
            status: r.status === 'returned' ? 'completed' : 'active',
          });
        }
      }
      setRentalCycles(allCycles);

      // Convert DB records to UI models with active cycle calculation
      setRentals(
        loadedRentals.map((r) => {
          const rCycles = allCycles.filter((c) => c.rentalId === r.id).sort((a, b) => a.cycleNumber - b.cycleNumber);
          const activeCycle = rCycles.find((c) => c.status === 'active') || rCycles[rCycles.length - 1];

          // Compute live finances for the active cycle
          const activeFinances = activeCycle
            ? calculateCycleFinances(
                {
                  startDate: activeCycle.startDate,
                  actualEndDate: activeCycle.actualEndDate,
                  quantity: activeCycle.quantity,
                  dailyRate: activeCycle.dailyRate,
                  baseRent: activeCycle.baseRent,
                  paidAmount: activeCycle.paidAmount,
                  items: r.items,
                },
                todayStr
              )
            : null;

          const totalRentSum = rCycles.reduce((sum, c) => {
            if (c.status === 'active' && activeFinances && c.id === activeCycle?.id) {
              return sum + activeFinances.totalAmount;
            }
            return sum + c.totalAmount;
          }, 0);

          const totalPaidSum = rCycles.reduce((sum, c) => sum + c.paidAmount, 0);

          const totalPendingSum = rCycles.reduce((sum, c) => {
            if (c.status === 'active' && activeFinances && c.id === activeCycle?.id) {
              return sum + activeFinances.pendingAmount;
            }
            return sum + c.pendingAmount;
          }, 0);

          return {
            id: r.id,
            partyId: r.party_id,
            partyName: r.party_name,
            plateType: r.plate_type,
            quantity: r.quantity,
            dailyRate: r.daily_rate,
            issueDate: r.issue_date,
            days: activeCycle ? (activeCycle.status === 'active' && activeFinances ? activeFinances.elapsedDays : activeCycle.days) : r.days,
            totalRent: totalRentSum || r.total_rent,
            paid: totalPaidSum || r.paid_amount,
            pending: totalPendingSum,
            paymentMode: r.payment_mode,
            status: r.status,
            items: r.items,
            currentCycleNumber: activeCycle?.cycleNumber || r.current_cycle_number || 1,
            currentCycleStartDate: activeCycle?.startDate || r.current_cycle_start_date || r.issue_date,
            currentCycleEndDate: activeCycle?.expectedEndDate || r.current_cycle_end_date,
            cycles: rCycles,
          };
        })
      );

      setReturns(
        loadedReturns.map((ret) => ({
          id: ret.id,
          rentalId: ret.rental_id || '',
          partyId: ret.party_id,
          partyName: ret.party_name,
          plateType: ret.plate_type,
          issuedQuantity: ret.issued_quantity,
          returnedQuantity: ret.returned_quantity,
          remainingQuantity: ret.remaining_quantity,
          returnDate: ret.return_date,
        }))
      );

      setPayments(
        loadedPayments.map((p) => ({
          id: p.id,
          partyId: p.party_id,
          partyName: p.party_name,
          rentalId: p.rental_id || null,
          cycleId: p.cycle_id || null,
          cycleNumber: p.cycle_number || null,
          amount: p.amount,
          date: p.payment_date,
          paymentMode: p.payment_mode === 'Udhari' ? 'Cash' : p.payment_mode,
          reference: p.reference || '',
          notes: p.notes || '',
          status: p.status,
        }))
      );

      setLedger(
        loadedLedger.map((l) => ({
          id: l.id,
          partyId: l.party_id,
          date: l.date,
          description: l.description,
          debit: l.debit,
          credit: l.credit,
          balance: l.balance,
        }))
      );

      setNotifications(
        loadedNotifications.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          date: n.date,
          isRead: n.is_read,
        }))
      );
    } catch (err: any) {
      console.error('Failed to load database state:', err);
      addToast('error', 'Error loading application data from Supabase.');
    } finally {
      if (showLoadingSpinner) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadAllData(true);
  }, [loadAllData]);

  // Real-time Supabase database synchronization
  useEffect(() => {
    const client = supabase;
    if (client) {
      const channel = client
        .channel('admin-realtime-sync')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public' },
          () => {
            loadAllData(false);
          }
        )
        .subscribe();

      return () => {
        client.removeChannel(channel);
      };
    }
  }, [loadAllData]);

  const handleInitiateReturn = (rental: Rental) => {
    setPreselectedRentalId(rental.id);
    setActiveTab('Returns');
  };

  // Compute live derived party metrics from database transactions and isolated cycles
  const parties: Party[] = rawParties.map((p) => {
    const partyRentals = rentals.filter((r) => r.partyId === p.id);
    const partyReturns = returns.filter((ret) => ret.partyId === p.id);
    const partyPayments = payments.filter((pay) => pay.partyId === p.id);
    const partyCycles = rentalCycles.filter((c) => c.partyId === p.id);
    const todayDateStr = new Date().toISOString().split('T')[0];

    const totalRent = partyCycles.length > 0
      ? partyCycles.reduce((sum, c) => {
          if (c.status === 'active') {
            const fin = calculateCycleFinances(c, todayDateStr);
            return sum + fin.totalAmount;
          }
          return sum + c.totalAmount;
        }, 0)
      : partyRentals.reduce((sum, r) => sum + r.totalRent, 0);

    const totalPaid = partyPayments.reduce((sum, pay) => sum + pay.amount, 0);

    const pending = partyCycles.length > 0
      ? partyCycles.reduce((sum, c) => {
          if (c.status === 'active') {
            const fin = calculateCycleFinances(c, todayDateStr);
            return sum + fin.pendingAmount;
          }
          return sum + c.pendingAmount;
        }, 0)
      : Math.max(0, totalRent - totalPaid);

    // Active plates currently with this party
    let platesWithParty = 0;
    const activePartyRentals = partyRentals.filter((r) => r.status === 'active' || r.status === 'overdue');
    for (const rent of activePartyRentals) {
      const returnedForRent = partyReturns
        .filter((ret) => ret.rentalId === rent.id)
        .reduce((sum, ret) => sum + ret.returnedQuantity, 0);
      platesWithParty += Math.max(0, rent.quantity - returnedForRent);
    }

    return {
      id: p.id,
      name: p.name,
      mobile: p.mobile,
      address: p.address || '',
      notes: p.notes || '',
      platesWithParty,
      totalRent,
      paid: totalPaid,
      pending,
      status: p.status,
    };
  });

  // Compute live synchronized plates data derived from Supabase stock additions, rentals, and returns
  const derivedPlates: PlateStock[] = STANDARD_PLATE_SIZES.map((size) => {
    const totalForSize = stockItems
      .filter((s) => s.plate_size === size)
      .reduce((sum, s) => sum + s.quantity, 0);

    // Calculate active plates currently with parties (rented minus returned)
    const activeRentals = rentals.filter(
      (r) => r.status === 'active' || r.status === 'overdue'
    );
    let withPartiesForSize = 0;
    for (const rent of activeRentals) {
      if (rent.items && rent.items.length > 0) {
        const matchingItem = rent.items.find((it) => it.plateType === size);
        if (matchingItem) {
          const returnedForRent = returns
            .filter((ret) => ret.rentalId === rent.id && (ret.plateType === size || !ret.plateType))
            .reduce((sum, ret) => sum + ret.returnedQuantity, 0);
          withPartiesForSize += Math.max(0, matchingItem.quantity - returnedForRent);
        }
      } else if (rent.plateType === size) {
        const returnedForRent = returns
          .filter((ret) => ret.rentalId === rent.id)
          .reduce((sum, ret) => sum + ret.returnedQuantity, 0);
        withPartiesForSize += Math.max(0, rent.quantity - returnedForRent);
      }
    }

    const availableForSize = Math.max(0, totalForSize - withPartiesForSize);

    // Rate from plateSettings if configured
    const existingSetting = plateSettings.find((p) => p.plate_size === size);
    const dailyRate = existingSetting?.daily_rate ?? 1.5;

    let status: 'available' | 'low_stock' | 'out_of_stock' = 'available';
    if (existingSetting?.status === 'out_of_stock') {
      status = 'out_of_stock';
    } else if (totalForSize === 0 || availableForSize === 0) {
      status = 'out_of_stock';
    } else if (totalForSize > 0 && availableForSize / totalForSize < 0.2) {
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

  // Stock CRUD Operations
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

  // 1. Parties CRUD
  const handleAddParty = async (newParty: { name: string; mobile: string; address?: string; notes?: string }) => {
    try {
      const created = await insertParty(newParty);
      setRawParties((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
      addToast('success', `Party "${created.name}" registered.`);
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to register party.');
      throw err;
    }
  };

  const handleEditParty = async (updatedParty: Party) => {
    try {
      const updated = await updateParty(updatedParty.id, {
        name: updatedParty.name,
        mobile: updatedParty.mobile,
        address: updatedParty.address,
        notes: updatedParty.notes,
        status: updatedParty.status,
      });
      setRawParties((prev) => prev.map((p) => (p.id === updatedParty.id ? updated : p)));
      addToast('success', `Party "${updatedParty.name}" updated.`);
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to update party.');
      throw err;
    }
  };

  const handleDeleteParty = async (partyId: string) => {
    try {
      const target = rawParties.find((p) => p.id === partyId);
      await deleteParty(partyId);
      setRawParties((prev) => prev.filter((p) => p.id !== partyId));
      addToast('success', `Party "${target?.name || ''}" removed.`);
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to delete party.');
      throw err;
    }
  };

  // 2. Plate settings (Rate & Status)
  const handleUpdatePlateRate = async (plateType: string, newRate: number) => {
    try {
      await updatePlateTypeRate(plateType as PlateSizeType, newRate);
      setPlateSettings((prev) =>
        prev.map((p) => (p.plate_size === plateType ? { ...p, daily_rate: newRate } : p))
      );
      addToast('success', `Updated daily rate for ${plateType} to ₹${newRate.toFixed(2)}/day.`);
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to update rate.');
    }
  };

  const handleUpdatePlateStatus = async (plateType: string, newStatus: 'available' | 'low_stock' | 'out_of_stock') => {
    try {
      await updatePlateTypeStatus(plateType as PlateSizeType, newStatus);
      setPlateSettings((prev) =>
        prev.map((p) => (p.plate_size === plateType ? { ...p, status: newStatus } : p))
      );
      addToast('info', `Set status of ${plateType} to ${newStatus}.`);
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to update plate status.');
    }
  };

  // 3. Rentals
  const handleAddRental = async (newRental: Omit<Rental, 'id' | 'totalRent' | 'pending' | 'status'>) => {
    try {
      const totalRent =
        newRental.items && newRental.items.length > 0
          ? newRental.items.reduce((sum, it) => sum + it.quantity * it.dailyRate * it.days, 0)
          : newRental.quantity * newRental.dailyRate * newRental.days;
      const pending = Math.max(0, totalRent - newRental.paid);
      const expectedEndDate = calculateExpectedCycleEndDate(newRental.issueDate, newRental.days || 40);

      const inserted = await insertRental({
        party_id: newRental.partyId,
        party_name: newRental.partyName,
        plate_type: newRental.plateType,
        quantity: newRental.quantity,
        daily_rate: newRental.dailyRate,
        issue_date: newRental.issueDate,
        days: newRental.days,
        total_rent: totalRent,
        paid_amount: newRental.paid,
        pending_amount: pending,
        payment_mode: newRental.paymentMode,
        status: 'active',
        items: (newRental.items as any) || [],
      });

      const initialCycle: RentalCycle = {
        id: `cyc-init-${inserted.id}`,
        rentalId: inserted.id,
        partyId: newRental.partyId,
        cycleNumber: 1,
        startDate: newRental.issueDate,
        expectedEndDate: expectedEndDate,
        days: newRental.days || 40,
        extraDays: 0,
        dailyRate: newRental.dailyRate,
        quantity: newRental.quantity,
        baseRent: totalRent,
        extraAmount: 0,
        totalAmount: totalRent,
        paidAmount: newRental.paid,
        pendingAmount: pending,
        status: 'active',
      };

      setRentalCycles((prev) => [initialCycle, ...prev]);

      const createdRental: Rental = {
        ...newRental,
        id: inserted.id,
        totalRent,
        paid: newRental.paid,
        pending,
        status: 'active',
        currentCycleNumber: 1,
        currentCycleStartDate: newRental.issueDate,
        currentCycleEndDate: expectedEndDate,
        cycles: [initialCycle],
      };

      setRentals((prev) => [createdRental, ...prev]);

      // Append to Ledger
      const itemsDescription =
        newRental.items && newRental.items.length > 0
          ? newRental.items.map((it) => `${it.quantity} Plates of ${it.plateType}`).join(', ')
          : `${newRental.quantity} Plates of ${newRental.plateType}`;

      const currentPartyPending = parties.find((p) => p.id === newRental.partyId)?.pending || 0;
      const ledEntry = await insertLedgerEntry({
        party_id: newRental.partyId,
        date: newRental.issueDate,
        description: `Rental Issued: ${itemsDescription} for ${newRental.days} days`,
        debit: totalRent,
        credit: 0,
        balance: currentPartyPending + pending,
        reference_type: 'rental',
        reference_id: inserted.id,
      });

      setLedger((prev) => [
        {
          id: ledEntry.id,
          partyId: ledEntry.party_id,
          date: ledEntry.date,
          description: ledEntry.description,
          debit: ledEntry.debit,
          credit: ledEntry.credit,
          balance: ledEntry.balance,
        },
        ...prev,
      ]);

      // If advance payment was made, add payment voucher log
      if (newRental.paid > 0) {
        const insertedPayment = await insertPayment({
          party_id: newRental.partyId,
          party_name: newRental.partyName,
          rental_id: inserted.id,
          cycle_id: initialCycle.id,
          cycle_number: 1,
          amount: newRental.paid,
          payment_date: newRental.issueDate,
          payment_mode: newRental.paymentMode,
          reference: `ADV-${Date.now().toString().slice(-4)}`,
          notes: 'Advance payment for rental dispatch sheet (Cycle 1)',
          status: 'verified',
        });

        const pay: Payment = {
          id: insertedPayment.id,
          partyId: newRental.partyId,
          partyName: newRental.partyName,
          rentalId: inserted.id,
          cycleId: initialCycle.id,
          cycleNumber: 1,
          amount: newRental.paid,
          date: newRental.issueDate,
          paymentMode: newRental.paymentMode === 'Udhari' ? 'Cash' : (newRental.paymentMode as any),
          reference: insertedPayment.reference || '',
          notes: 'Advance payment for rental dispatch sheet (Cycle 1)',
          status: 'verified',
        };
        setPayments((prev) => [pay, ...prev]);

        const ledEntryPay = await insertLedgerEntry({
          party_id: newRental.partyId,
          date: newRental.issueDate,
          description: `Advance Payment Received - Cycle 1 - ${pay.paymentMode} (Ref: ${pay.reference})`,
          debit: 0,
          credit: newRental.paid,
          balance: ledEntry.balance - newRental.paid,
          reference_type: 'payment',
          reference_id: insertedPayment.id,
        });

        setLedger((prev) => [
          {
            id: ledEntryPay.id,
            partyId: ledEntryPay.party_id,
            date: ledEntryPay.date,
            description: ledEntryPay.description,
            debit: ledEntryPay.debit,
            credit: ledEntryPay.credit,
            balance: ledEntryPay.balance,
          },
          ...prev,
        ]);
      }

      addToast('success', `Dispatched ${newRental.quantity} plates of ${newRental.plateType} to ${newRental.partyName}.`);
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to dispatch rental.');
      throw err;
    }
  };

  // Renewal Handler: Starts a new 40-day cycle without modifying inventory stock
  const handleRenewRental = async (
    rentalId: string,
    renewalConfirmationDate = new Date().toISOString().split('T')[0]
  ) => {
    try {
      const rental = rentals.find((r) => r.id === rentalId);
      if (!rental) return;

      const existingCycles = rentalCycles
        .filter((c) => c.rentalId === rentalId)
        .sort((a, b) => a.cycleNumber - b.cycleNumber);

      const activeCycle =
        existingCycles.find((c) => c.status === 'active') ||
        existingCycles[existingCycles.length - 1];

      if (!activeCycle) return;

      // Apply strict Renewal Date Rules:
      // A) If renewed BEFORE or ON cycle expected end date:
      //    New Cycle Start Date = Expected End Date + 1 day
      // B) If renewed AFTER cycle expected end date:
      //    Finalize previous cycle on renewalConfirmationDate (with extra days)
      //    New Cycle Start Date = renewalConfirmationDate
      const { newStartDate, isOverdueRenewal } = determineRenewalStartDate(
        activeCycle.expectedEndDate,
        renewalConfirmationDate
      );

      const finalizedEndDate = isOverdueRenewal
        ? renewalConfirmationDate
        : activeCycle.expectedEndDate;

      // Calculate finances for the finalized previous cycle
      const previousFinances = calculateCycleFinances(
        {
          startDate: activeCycle.startDate,
          actualEndDate: finalizedEndDate,
          quantity: activeCycle.quantity,
          dailyRate: activeCycle.dailyRate,
          baseRent: activeCycle.baseRent,
          paidAmount: activeCycle.paidAmount,
          items: rental.items,
        },
        finalizedEndDate
      );

      // 1. Finalize previous cycle
      await updateRentalCycle(activeCycle.id, {
        actual_end_date: finalizedEndDate,
        days: isOverdueRenewal ? previousFinances.elapsedDays : 40,
        extra_days: previousFinances.extraDays,
        extra_amount: previousFinances.extraAmount,
        total_amount: previousFinances.totalAmount,
        pending_amount: previousFinances.pendingAmount,
        status: 'completed',
      });

      // 2. Start new fresh 40-day cycle (Cycle N+1)
      const newCycleNumber = activeCycle.cycleNumber + 1;
      const newExpectedEndDate = calculateExpectedCycleEndDate(newStartDate, 40);

      const newBaseRent =
        rental.items && rental.items.length > 0
          ? rental.items.reduce((sum, it) => sum + it.quantity * it.dailyRate * 40, 0)
          : rental.quantity * rental.dailyRate * 40;

      const createdNewCycle = await insertRentalCycle({
        rental_id: rental.id,
        party_id: rental.partyId,
        cycle_number: newCycleNumber,
        start_date: newStartDate,
        expected_end_date: newExpectedEndDate,
        days: 40,
        extra_days: 0,
        daily_rate: rental.dailyRate,
        quantity: rental.quantity,
        base_rent: newBaseRent,
        extra_amount: 0,
        total_amount: newBaseRent,
        paid_amount: 0, // Isolated zero paid amount for new cycle
        pending_amount: newBaseRent,
        status: 'active',
      });

      // Update local cycle state
      const updatedCycleList = [
        ...rentalCycles.map((c) =>
          c.id === activeCycle.id
            ? {
                ...c,
                actualEndDate: finalizedEndDate,
                days: isOverdueRenewal ? previousFinances.elapsedDays : 40,
                extraDays: previousFinances.extraDays,
                extraAmount: previousFinances.extraAmount,
                totalAmount: previousFinances.totalAmount,
                pendingAmount: previousFinances.pendingAmount,
                status: 'completed' as const,
              }
            : c
        ),
        {
          id: createdNewCycle.id,
          rentalId: rental.id,
          partyId: rental.partyId,
          cycleNumber: newCycleNumber,
          startDate: newStartDate,
          expectedEndDate: newExpectedEndDate,
          days: 40,
          extraDays: 0,
          dailyRate: rental.dailyRate,
          quantity: rental.quantity,
          baseRent: newBaseRent,
          extraAmount: 0,
          totalAmount: newBaseRent,
          paidAmount: 0,
          pendingAmount: newBaseRent,
          status: 'active' as const,
        },
      ];
      setRentalCycles(updatedCycleList);

      // 3. Update rentals table pointer (stock remains 100% invariant)
      await updateRentalCyclePointer(
        rental.id,
        newCycleNumber,
        newStartDate,
        newExpectedEndDate
      );

      // 4. Update rentals state with new active cycle
      setRentals((prev) =>
        prev.map((r) =>
          r.id === rental.id
            ? {
                ...r,
                currentCycleNumber: newCycleNumber,
                currentCycleStartDate: newStartDate,
                currentCycleEndDate: newExpectedEndDate,
                cycles: updatedCycleList.filter((c) => c.rentalId === r.id),
              }
            : r
        )
      );

      // 5. Ledger postings
      const currentPartyPending =
        parties.find((p) => p.id === rental.partyId)?.pending || 0;

      // If previous cycle incurred extra charges, debit it
      if (previousFinances.extraAmount > 0) {
        const ledExtra = await insertLedgerEntry({
          party_id: rental.partyId,
          date: renewalConfirmationDate,
          description: `Rental Cycle ${activeCycle.cycleNumber} Overdue: ${previousFinances.extraDays} extra days beyond 40-day cycle`,
          debit: previousFinances.extraAmount,
          credit: 0,
          balance: currentPartyPending + previousFinances.extraAmount,
          reference_type: 'rental_extra',
          reference_id: activeCycle.id,
        });
        setLedger((prev) => [
          {
            id: ledExtra.id,
            partyId: ledExtra.party_id,
            date: ledExtra.date,
            description: ledExtra.description,
            debit: ledExtra.debit,
            credit: ledExtra.credit,
            balance: ledExtra.balance,
          },
          ...prev,
        ]);
      }

      // Debit for new cycle standard 40-day rent
      const ledRenewal = await insertLedgerEntry({
        party_id: rental.partyId,
        date: newStartDate,
        description: `Rental Renewed (Cycle ${newCycleNumber}): ${rental.plateType} for 40 days`,
        debit: newBaseRent,
        credit: 0,
        balance:
          currentPartyPending +
          newBaseRent +
          (previousFinances.extraAmount > 0 ? previousFinances.extraAmount : 0),
        reference_type: 'rental_renewal',
        reference_id: createdNewCycle.id,
      });
      setLedger((prev) => [
        {
          id: ledRenewal.id,
          partyId: ledRenewal.party_id,
          date: ledRenewal.date,
          description: ledRenewal.description,
          debit: ledRenewal.debit,
          credit: ledRenewal.credit,
          balance: ledRenewal.balance,
        },
        ...prev,
      ]);

      addToast(
        'success',
        `Rental renewed for ${rental.partyName}! Cycle ${newCycleNumber} started (${newStartDate} to ${newExpectedEndDate}).`
      );
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to renew rental.');
      throw err;
    }
  };

  const handleUpdateRentalStatus = async (rentalId: string, status: 'active' | 'returned' | 'overdue') => {
    try {
      await updateRentalStatus(rentalId, status);
      setRentals((prev) => prev.map((r) => (r.id === rentalId ? { ...r, status } : r)));
      addToast('info', `Rental status updated to ${status}.`);
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to update rental status.');
    }
  };

  // 4. Returns: Finalizes active cycle, marks rental returned, and restores physical inventory
  const handleAddReturn = async (newReturn: Omit<ReturnLog, 'id' | 'partyName' | 'plateType' | 'issuedQuantity'>) => {
    try {
      const matchedRental = rentals.find((r) => r.id === newReturn.rentalId);
      const party = rawParties.find((p) => p.id === newReturn.partyId);
      if (!matchedRental || !party) return;

      const inserted = await insertReturn({
        party_id: newReturn.partyId,
        party_name: party.name,
        rental_id: newReturn.rentalId,
        plate_type: matchedRental.plateType,
        issued_quantity: matchedRental.quantity,
        returned_quantity: newReturn.returnedQuantity,
        remaining_quantity: newReturn.remainingQuantity,
        return_date: newReturn.returnDate,
      });

      const created: ReturnLog = {
        ...newReturn,
        id: inserted.id,
        partyName: party.name,
        plateType: matchedRental.plateType,
        issuedQuantity: matchedRental.quantity,
      };

      setReturns((prev) => [created, ...prev]);

      // If remaining quantity becomes zero, mark rental agreement as fully returned in DB
      if (newReturn.remainingQuantity === 0) {
        // Finalize the active cycle for this rental
        const existingCycles = rentalCycles.filter((c) => c.rentalId === newReturn.rentalId);
        const activeCycle =
          existingCycles.find((c) => c.status === 'active') ||
          existingCycles[existingCycles.length - 1];

        if (activeCycle) {
          const activeFinances = calculateCycleFinances(
            {
              startDate: activeCycle.startDate,
              actualEndDate: newReturn.returnDate,
              quantity: activeCycle.quantity,
              dailyRate: activeCycle.dailyRate,
              baseRent: activeCycle.baseRent,
              paidAmount: activeCycle.paidAmount,
              items: matchedRental.items,
            },
            newReturn.returnDate
          );

          await updateRentalCycle(activeCycle.id, {
            actual_end_date: newReturn.returnDate,
            days: activeFinances.elapsedDays,
            extra_days: activeFinances.extraDays,
            extra_amount: activeFinances.extraAmount,
            total_amount: activeFinances.totalAmount,
            pending_amount: activeFinances.pendingAmount,
            status: 'completed',
          });

          setRentalCycles((prev) =>
            prev.map((c) =>
              c.id === activeCycle.id
                ? {
                    ...c,
                    actualEndDate: newReturn.returnDate,
                    days: activeFinances.elapsedDays,
                    extraDays: activeFinances.extraDays,
                    extraAmount: activeFinances.extraAmount,
                    totalAmount: activeFinances.totalAmount,
                    pendingAmount: activeFinances.pendingAmount,
                    status: 'completed' as const,
                  }
                : c
            )
          );

          // If extra days occurred, post ledger debit for extra charges
          if (activeFinances.extraAmount > 0) {
            const partyPending = parties.find((p) => p.id === newReturn.partyId)?.pending || 0;
            const ledExtra = await insertLedgerEntry({
              party_id: newReturn.partyId,
              date: newReturn.returnDate,
              description: `Rental Cycle ${activeCycle.cycleNumber} Return Extra: ${activeFinances.extraDays} days past 40-day cycle`,
              debit: activeFinances.extraAmount,
              credit: 0,
              balance: partyPending + activeFinances.extraAmount,
              reference_type: 'rental_extra',
              reference_id: activeCycle.id,
            });

            setLedger((prev) => [
              {
                id: ledExtra.id,
                partyId: ledExtra.party_id,
                date: ledExtra.date,
                description: ledExtra.description,
                debit: ledExtra.debit,
                credit: ledExtra.credit,
                balance: ledExtra.balance,
              },
              ...prev,
            ]);
          }
        }

        await updateRentalStatus(newReturn.rentalId, 'returned');
        setRentals((prev) =>
          prev.map((r) => (r.id === newReturn.rentalId ? { ...r, status: 'returned' } : r))
        );
      }

      // Ledger Entry for Return Intake
      const partyPending = parties.find((p) => p.id === newReturn.partyId)?.pending || 0;
      const ledEntry = await insertLedgerEntry({
        party_id: newReturn.partyId,
        date: newReturn.returnDate,
        description: `Material Return Intake: ${newReturn.returnedQuantity} Plates of ${matchedRental.plateType} returned`,
        debit: 0,
        credit: 0,
        balance: partyPending,
        reference_type: 'return',
        reference_id: inserted.id,
      });

      setLedger((prev) => [
        {
          id: ledEntry.id,
          partyId: ledEntry.party_id,
          date: ledEntry.date,
          description: ledEntry.description,
          debit: ledEntry.debit,
          credit: ledEntry.credit,
          balance: ledEntry.balance,
        },
        ...prev,
      ]);

      addToast('success', `Received ${newReturn.returnedQuantity} plates of ${matchedRental.plateType} from ${party.name}.`);
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to record return.');
      throw err;
    }
  };

  // 5. Payments: Cycle-level isolated payment recording
  const handleAddPayment = async (newPayment: {
    partyId: string;
    amount: number;
    date: string;
    paymentMode: 'Account 1' | 'Account 2' | 'Cash';
    rentalId?: string;
    cycleId?: string;
    cycleNumber?: number;
    reference?: string;
    notes?: string;
  }) => {
    try {
      const party = rawParties.find((p) => p.id === newPayment.partyId);
      if (!party) return;

      const paymentRef = newPayment.reference?.trim() || `PAY-${Date.now().toString().slice(-4)}`;

      const inserted = await insertPayment({
        party_id: newPayment.partyId,
        party_name: party.name,
        rental_id: newPayment.rentalId,
        cycle_id: newPayment.cycleId,
        cycle_number: newPayment.cycleNumber,
        amount: newPayment.amount,
        payment_date: newPayment.date,
        payment_mode: newPayment.paymentMode,
        reference: paymentRef,
        notes: newPayment.notes,
        status: 'verified',
      });

      const created: Payment = {
        id: inserted.id,
        partyId: newPayment.partyId,
        partyName: party.name,
        rentalId: newPayment.rentalId || null,
        cycleId: newPayment.cycleId || null,
        cycleNumber: newPayment.cycleNumber || null,
        amount: newPayment.amount,
        date: newPayment.date,
        paymentMode: newPayment.paymentMode,
        reference: inserted.reference || paymentRef,
        notes: newPayment.notes || '',
        status: 'verified',
      };

      setPayments((prev) => [created, ...prev]);

      // If payment targets a specific cycle, update that cycle in isolation
      if (newPayment.cycleId) {
        const targetCycle = rentalCycles.find((c) => c.id === newPayment.cycleId);
        if (targetCycle) {
          const newCyclePaid = targetCycle.paidAmount + newPayment.amount;
          const newCyclePending = Math.max(0, targetCycle.totalAmount - newCyclePaid);
          await updateRentalCycle(targetCycle.id, {
            paid_amount: newCyclePaid,
            pending_amount: newCyclePending,
          });
          setRentalCycles((prev) =>
            prev.map((c) =>
              c.id === targetCycle.id
                ? { ...c, paidAmount: newCyclePaid, pendingAmount: newCyclePending }
                : c
            )
          );
        }
      } else {
        // If general party payment, allocate to oldest pending cycle of this party
        let remainingToApply = newPayment.amount;
        const partyPendingCycles = rentalCycles
          .filter((c) => c.partyId === newPayment.partyId && c.pendingAmount > 0)
          .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

        for (const cyc of partyPendingCycles) {
          if (remainingToApply <= 0) break;
          const applyAmt = Math.min(cyc.pendingAmount, remainingToApply);
          const newCyclePaid = cyc.paidAmount + applyAmt;
          const newCyclePending = Math.max(0, cyc.totalAmount - newCyclePaid);
          await updateRentalCycle(cyc.id, {
            paid_amount: newCyclePaid,
            pending_amount: newCyclePending,
          });
          setRentalCycles((prev) =>
            prev.map((c) =>
              c.id === cyc.id
                ? { ...c, paidAmount: newCyclePaid, pendingAmount: newCyclePending }
                : c
            )
          );
          remainingToApply -= applyAmt;
        }
      }

      // Ledger Voucher credit entry
      const partyData = parties.find((p) => p.id === newPayment.partyId);
      const currentPending = partyData ? partyData.pending : 0;
      const newPending = Math.max(0, currentPending - newPayment.amount);

      const desc = newPayment.cycleNumber
        ? `Payment Received - Cycle ${newPayment.cycleNumber} - ${newPayment.paymentMode} (Ref: ${created.reference})`
        : `Payment Received - ${newPayment.paymentMode} (Ref: ${created.reference})`;

      const ledEntry = await insertLedgerEntry({
        party_id: newPayment.partyId,
        date: newPayment.date,
        description: desc,
        debit: 0,
        credit: newPayment.amount,
        balance: newPending,
        reference_type: 'payment',
        reference_id: inserted.id,
      });

      setLedger((prev) => [
        {
          id: ledEntry.id,
          partyId: ledEntry.party_id,
          date: ledEntry.date,
          description: ledEntry.description,
          debit: ledEntry.debit,
          credit: ledEntry.credit,
          balance: ledEntry.balance,
        },
        ...prev,
      ]);

      // System notification
      const insertedNot = await insertNotification({
        party_id: newPayment.partyId,
        type: 'payment',
        title: 'Payment Received',
        message: `₹${newPayment.amount.toLocaleString('en-IN')} received in ${newPayment.paymentMode} from ${party.name}. Ref: ${created.reference}`,
        date: newPayment.date,
      });

      setNotifications((prev) => [
        {
          id: insertedNot.id,
          type: insertedNot.type,
          title: insertedNot.title,
          message: insertedNot.message,
          date: insertedNot.date,
          isRead: insertedNot.is_read,
        },
        ...prev,
      ]);

      addToast(
        'success',
        `Payment of ₹${newPayment.amount.toLocaleString('en-IN')} recorded in ${newPayment.paymentMode}.`
      );
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to record payment.');
      throw err;
    }
  };

  // 6. Notifications Alerts
  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch (err: any) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const handleClearNotification = async (id: string) => {
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err: any) {
      console.error('Failed to clear notification:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err: any) {
      console.error('Failed to mark all notifications read:', err);
    }
  };

  const unreadAlertsCount = notifications.filter((n) => !n.isRead).length;

  // Render Page Content based on selected Active tab
  const renderTabContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-sm text-slate-500 font-semibold">Loading data from Supabase...</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'Dashboard':
        return (
          <DashboardTab
            parties={parties}
            plates={derivedPlates}
            rentals={rentals}
            rentalCycles={rentalCycles}
            returns={returns}
            payments={payments}
            onTabChange={setActiveTab}
            onRenewRental={handleRenewRental}
            onInitiateReturn={handleInitiateReturn}
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
            rentalCycles={rentalCycles}
            onAddRental={handleAddRental}
            onRenewRental={handleRenewRental}
            onUpdateRentalStatus={handleUpdateRentalStatus}
            onInitiateReturn={handleInitiateReturn}
          />
        );
      case 'Returns':
        return (
          <ReturnsTab
            returns={returns}
            rentals={rentals}
            rentalCycles={rentalCycles}
            parties={parties}
            onAddReturn={handleAddReturn}
            preselectedRentalId={preselectedRentalId}
            onClearPreselectedRental={() => setPreselectedRentalId(null)}
          />
        );
      case 'Payments':
        return (
          <PaymentsTab
            payments={payments}
            parties={parties}
            rentals={rentals}
            rentalCycles={rentalCycles}
            onAddPayment={handleAddPayment}
          />
        );
      case 'Outstanding Dues':
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
    { name: 'Outstanding Dues', icon: AlertCircle },
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

      {/* 2. Desktop Navigation Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-slate-900 text-slate-400 flex flex-col justify-between z-50 transition-transform duration-300 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Brand header */}
          <div className="p-6 border-b border-slate-850 flex items-center gap-3">
            <img src="/logo.png" alt="ANAND Logo" className="h-10 w-auto object-contain" />
            <div className="text-left">
              <h1 className="text-white font-extrabold text-sm tracking-wide">ANAND PLATES</h1>
              <p className="text-[10px] text-primary font-bold">आनंद बिल्डिंग मटेरियल</p>
            </div>
          </div>

          {/* Navigation Menu Links */}
          <nav className="flex-grow p-4 space-y-1 overflow-y-auto custom-scrollbar">
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

            {/* Quick Notifications bell icon button */}
            <button
              onClick={() => setActiveTab('Notifications')}
              className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadAlertsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
              )}
            </button>
          </div>
        </header>

        {/* Tab Content Display Area */}
        <main className="flex-grow p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          {renderTabContent()}
        </main>
      </div>

      {/* Toast notifications container */}
      <Toast toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};
