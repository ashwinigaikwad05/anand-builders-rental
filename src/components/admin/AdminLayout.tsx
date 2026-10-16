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
  Loader2,
  Globe,
} from 'lucide-react';

import {
  getStoredAppLanguage,
  setStoredAppLanguage,
  t,
  type AppLanguage,
} from '../../utils/appTranslations';

// Imports Tab Components
import { DashboardTab } from './tabs/DashboardTab';
import { PartiesTab } from './tabs/PartiesTab';
import { PlateTypesTab } from './tabs/PlateTypesTab';
import { StockTab } from './tabs/StockTab';
import { RentalsTab } from './tabs/RentalsTab';
import { ReturnsTab, type ReturnInputPayload } from './tabs/ReturnsTab';
import { PaymentsTab } from './tabs/PaymentsTab';
import { OutstandingDuesTab } from './tabs/OutstandingDuesTab';
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
  insertPlateType,
  deletePlateType,
  updatePlateTypeRate,
  updatePlateTypeStatus,
  getCustomPlateSizes,
  saveCustomPlateSizes,
  fetchStockItems,
  insertStockItem,
  updateStockItem,
  deleteStockItem,
  fetchRentals,
  insertRental,
  updateRentalStatus,
  updateRentalOnReturn,
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
  updateRentalCyclePointerAndItems,
  calculateExpectedCycleEndDate,
  calculateCycleFinances,
  calculatePartialReturnsBreakdown,
  determineRenewalStartDate,
  STANDARD_PLATE_SIZES,
  supabase,
  isSupabaseConfigured,
  deduplicateAllStoredData,
  clearAllRentalsAndCycles,
  clearAllPayments,
  clearInactiveParties,
  clearAllParties,
  clearAllNotifications,
  factoryResetAllDatabase,
  restoreBackupData,
  type RentalItemRecord,
} from '../../lib/supabase';
import { googleDriveBackupService } from '../../lib/googleDriveBackupService';
import type { DeleteDataCategory } from './modals/DeleteDataConfirmModal';
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
import { getPenaltyTypeLabel } from '../../data/adminMockData';

export function getTabFromPath(path: string): string {
  const cleanPath = (path || (typeof window !== 'undefined' ? window.location.pathname : '')).toLowerCase().replace(/\/$/, '');
  if (cleanPath.endsWith('/parties')) return 'Parties';
  if (cleanPath.endsWith('/plate-types')) return 'Plate Types';
  if (cleanPath.endsWith('/plate-stock')) return 'Plate Stock';
  if (cleanPath.endsWith('/rentals')) return 'Rentals';
  if (cleanPath.endsWith('/returns')) return 'Returns';
  if (cleanPath.endsWith('/payments')) return 'Payments';
  if (cleanPath.endsWith('/outstanding-dues') || cleanPath.endsWith('/udhari')) return 'Outstanding Dues';
  if (cleanPath.endsWith('/ledger')) return 'Ledger';
  if (cleanPath.endsWith('/notifications')) return 'Notifications';
  if (cleanPath.endsWith('/reports')) return 'Reports';
  if (cleanPath.endsWith('/settings')) return 'Settings';
  return 'Dashboard';
}

export function getPathFromTab(tab: string): string {
  switch (tab) {
    case 'Parties': return '/admin/parties';
    case 'Plate Types': return '/admin/plate-types';
    case 'Plate Stock': return '/admin/plate-stock';
    case 'Rentals': return '/admin/rentals';
    case 'Returns': return '/admin/returns';
    case 'Payments': return '/admin/payments';
    case 'Outstanding Dues':
    case 'Udhari': return '/admin/outstanding-dues';
    case 'Ledger': return '/admin/ledger';
    case 'Notifications': return '/admin/notifications';
    case 'Reports': return '/admin/reports';
    case 'Settings': return '/admin/settings';
    default: return '/admin/dashboard';
  }
}

interface AdminLayoutProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
  onLogout: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ currentPath, onNavigate, onLogout }) => {
  const [activeTab, setActiveTab] = useState(() => getTabFromPath(currentPath || (typeof window !== 'undefined' ? window.location.pathname : '')));

  useEffect(() => {
    if (currentPath) {
      setActiveTab(getTabFromPath(currentPath));
    }
  }, [currentPath]);

  const handleTabChange = (tabName: string) => {
    setActiveTab(tabName);
    const targetPath = getPathFromTab(tabName);
    if (onNavigate) {
      onNavigate(targetPath);
    } else if (typeof window !== 'undefined') {
      window.history.pushState(null, '', targetPath);
    }
  };
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [preselectedRentalId, setPreselectedRentalId] = useState<string | null>(null);

  // Display Language State (Marathi / English)
  const [appLanguage, setAppLanguage] = useState<AppLanguage>(getStoredAppLanguage);

  useEffect(() => {
    const handleLang = (e: Event) => {
      const ce = e as CustomEvent<AppLanguage>;
      if (ce.detail) {
        setAppLanguage(ce.detail);
      }
    };
    window.addEventListener('anand_language_change', handleLang);
    return () => window.removeEventListener('anand_language_change', handleLang);
  }, []);

  const handleLanguageChange = (lang: AppLanguage) => {
    setAppLanguage(lang);
    setStoredAppLanguage(lang);
  };

  const curT = t[appLanguage] || t.marathi;
  const isMarathi = appLanguage === 'marathi';

  // --- STATEFUL DB CONCEPT ---
  const [rawParties, setRawParties] = useState<PartyRecord[]>([]);
  const [plateSettings, setPlateSettings] = useState<PlateTypeRecord[]>([]);
  const [customPlateSizes, setCustomPlateSizes] = useState<string[]>(getCustomPlateSizes);
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
  const loadAllData = React.useCallback(async (showLoadingSpinner = false) => {
    let spinnerTimer: any = null;
    try {
      if (showLoadingSpinner) {
        setIsLoading(true);
        spinnerTimer = setTimeout(() => {
          setIsLoading(false);
        }, 3500);
      }

      // Automatically scan and deduplicate stored data on load
      try {
        await deduplicateAllStoredData();
      } catch (dedupErr) {
        console.warn('Auto-deduplication check error:', dedupErr);
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

      const safeParties = Array.isArray(loadedParties) ? loadedParties : [];
      const safePlateTypes = Array.isArray(loadedPlateTypes) ? loadedPlateTypes : [];
      const safeStock = Array.isArray(loadedStock) ? loadedStock : [];
      const safeRentals = Array.isArray(loadedRentals) ? loadedRentals : [];
      const safeCycles = Array.isArray(loadedCycles) ? loadedCycles : [];
      const safeReturns = Array.isArray(loadedReturns) ? loadedReturns : [];
      const safePayments = Array.isArray(loadedPayments) ? loadedPayments : [];
      const safeLedger = Array.isArray(loadedLedger) ? loadedLedger : [];
      const safeNotifications = Array.isArray(loadedNotifications) ? loadedNotifications : [];

      const todayStr = new Date().toISOString().split('T')[0];

      setRawParties(safeParties);
      setPlateSettings(safePlateTypes);
      setStockItems(safeStock);

      // Map loaded cycles
      const allCycles: RentalCycle[] = safeCycles.filter(Boolean).map((c: any) => ({
        id: c.id || `cyc-${Math.random()}`,
        rentalId: c.rental_id || c.rentalId || '',
        partyId: c.party_id || c.partyId || '',
        cycleNumber: c.cycle_number || c.cycleNumber || 1,
        startDate: c.start_date || c.startDate || todayStr,
        expectedEndDate: c.expected_end_date || c.expectedEndDate || calculateExpectedCycleEndDate(c.start_date || c.startDate || todayStr, c.days || 40),
        actualEndDate: c.actual_end_date || c.actualEndDate,
        days: c.days || 40,
        extraDays: c.extra_days !== undefined ? c.extra_days : (c.extraDays !== undefined ? c.extraDays : 0),
        dailyRate: c.daily_rate !== undefined ? c.daily_rate : (c.dailyRate !== undefined ? c.dailyRate : 0),
        quantity: c.quantity || 0,
        baseRent: c.base_rent !== undefined ? c.base_rent : (c.baseRent !== undefined ? c.baseRent : 0),
        extraAmount: c.extra_amount !== undefined ? c.extra_amount : (c.extraAmount !== undefined ? c.extraAmount : 0),
        totalAmount: c.total_amount !== undefined ? c.total_amount : (c.totalAmount !== undefined ? c.totalAmount : 0),
        paidAmount: c.paid_amount !== undefined ? c.paid_amount : (c.paidAmount !== undefined ? c.paidAmount : 0),
        pendingAmount: c.pending_amount !== undefined ? c.pending_amount : (c.pendingAmount !== undefined ? c.pendingAmount : 0),
        status: c.status || 'active',
        notes: c.notes,
        items: Array.isArray(c.items) ? (c.items as any) : [],
      }));

      // Ensure every existing rental has at least a Cycle 1
      for (const r of safeRentals) {
        if (!r) continue;
        const rId = r.id;
        const rPartyId = r.party_id || (r as any).partyId || '';
        const rIssueDate = r.issue_date || (r as any).issueDate || (r.created_at ? r.created_at.split('T')[0] : todayStr);
        const rCycleEndDate = r.current_cycle_end_date || (r as any).currentCycleEndDate;
        const rDays = r.days || 40;
        const rDailyRate = r.daily_rate !== undefined ? r.daily_rate : ((r as any).dailyRate !== undefined ? (r as any).dailyRate : 0);
        const rQuantity = r.quantity || 0;
        const rTotalRent = r.total_rent !== undefined ? r.total_rent : ((r as any).totalRent !== undefined ? (r as any).totalRent : 0);
        const rPaid = r.paid_amount !== undefined ? r.paid_amount : ((r as any).paid !== undefined ? (r as any).paid : 0);
        const rPending = r.pending_amount !== undefined ? r.pending_amount : ((r as any).pending !== undefined ? (r as any).pending : 0);

        if (!allCycles.some((c) => c.rentalId === rId)) {
          const expectedEnd = rCycleEndDate || calculateExpectedCycleEndDate(rIssueDate, rDays);
          allCycles.push({
            id: `cyc-synth-${rId}`,
            rentalId: rId,
            partyId: rPartyId,
            cycleNumber: 1,
            startDate: rIssueDate,
            expectedEndDate: expectedEnd,
            actualEndDate: r.actual_return_date || (r as any).actualReturnDate,
            days: rDays,
            extraDays: 0,
            dailyRate: rDailyRate,
            quantity: rQuantity,
            baseRent: rTotalRent,
            extraAmount: 0,
            totalAmount: rTotalRent,
            paidAmount: rPaid,
            pendingAmount: rPending,
            status: r.status === 'returned' ? 'completed' : 'active',
            items: Array.isArray(r.items) ? r.items : [],
          });
        }
      }
      setRentalCycles(allCycles);

      // Deterministically sort loaded rentals chronologically so Bill #1, Bill #2, Bill #3 are assigned sequentially
      const chronologicalRentals = [...safeRentals].filter(Boolean).sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : (a.issue_date ? new Date(a.issue_date).getTime() : 0);
        const timeB = b.created_at ? new Date(b.created_at).getTime() : (b.issue_date ? new Date(b.issue_date).getTime() : 0);
        return timeA - timeB;
      });

      // Map party customer numbers 1, 2, 3... based on registration / first dispatch order
      const partyCustNumberMap = new Map<string, number>();
      const partyNameToNumberMap = new Map<string, number>();

      // Collect all distinct parties from safeParties AND safeRentals
      const allUniquePartyMetas: { id: string; name: string; earliestDate: string }[] = [];
      const seenPartyIds = new Set<string>();
      const seenPartyNames = new Set<string>();

      for (const p of safeParties) {
        if (!p) continue;
        const pName = (p.name || '').trim();
        const normName = pName.toLowerCase();
        if (p.id) seenPartyIds.add(p.id);
        if (normName) seenPartyNames.add(normName);
        const pRentals = safeRentals.filter(
          (r) => (r && r.party_id === p.id) || (r && r.party_name && (r.party_name || '').trim().toLowerCase() === normName)
        );
        const earliestRentDate = pRentals.reduce((earliest, r) => {
          const d = r.issue_date || (r.created_at ? r.created_at.split('T')[0] : '');
          return d && (!earliest || d < earliest) ? d : earliest;
        }, '');
        const pCreatedDate = p.created_at ? p.created_at.split('T')[0] : '';
        const earliestDate = [pCreatedDate, earliestRentDate].filter(Boolean).sort()[0] || '2026-01-01';
        allUniquePartyMetas.push({ id: p.id || `party-${Math.random()}`, name: pName || 'ग्राहक', earliestDate });
      }

      for (const r of safeRentals) {
        if (!r) continue;
        const rPartyName = (r.party_name || '').trim();
        const normName = rPartyName.toLowerCase();
        if (normName && !seenPartyNames.has(normName)) {
          seenPartyNames.add(normName);
          if (r.party_id) seenPartyIds.add(r.party_id);
          const earliestDate = r.issue_date || (r.created_at ? r.created_at.split('T')[0] : '2026-01-01');
          allUniquePartyMetas.push({ id: r.party_id || `party-${normName}`, name: rPartyName || 'ग्राहक', earliestDate });
        }
      }

      allUniquePartyMetas.sort((a, b) => {
        if (a.earliestDate !== b.earliestDate) {
          return (a.earliestDate || '').localeCompare(b.earliestDate || '');
        }
        return (a.name || '').localeCompare(b.name || '');
      });

      allUniquePartyMetas.forEach((p, idx) => {
        const custNum = idx + 1;
        if (p.id) partyCustNumberMap.set(p.id, custNum);
        if (p.name) partyNameToNumberMap.set((p.name || '').toLowerCase(), custNum);
      });

      // Convert DB records to UI models with active cycle calculation
      setRentals(
        safeRentals.filter(Boolean).map((r) => {
          const rCycles = allCycles.filter((c) => c.rentalId === r.id).sort((a, b) => a.cycleNumber - b.cycleNumber);
          const activeCycle = rCycles.find((c) => c.status === 'active') || rCycles[rCycles.length - 1];

          // Compute live finances for the active cycle
          let activeFinances = null;
          if (activeCycle) {
            try {
              activeFinances = calculateCycleFinances(
                {
                  startDate: activeCycle.startDate,
                  actualEndDate: activeCycle.actualEndDate,
                  quantity: activeCycle.quantity,
                  dailyRate: activeCycle.dailyRate,
                  baseRent: activeCycle.baseRent,
                  paidAmount: activeCycle.paidAmount,
                  items: Array.isArray(r.items) ? r.items : [],
                },
                todayStr
              );
            } catch (finErr) {
              console.warn('Finance calculation warning:', finErr);
            }
          }

          const totalRentSum = rCycles.reduce((sum, c) => {
            if (c.status === 'active' && activeFinances && c.id === activeCycle?.id) {
              return sum + (activeFinances.totalAmount || 0);
            }
            return sum + (c.totalAmount || 0);
          }, 0);

          // Compute true payments received from payments table matching this rental/party
          const rPartyId = r.party_id || (r as any).partyId || '';
          const rPartyName = (r.party_name || (r as any).partyName || '').trim();
          const rMatchedPayments = safePayments.filter((p: any) =>
            (p.rental_id && p.rental_id === r.id) ||
            (p.rentalId && p.rentalId === r.id) ||
            (!p.rental_id && !p.rentalId && (
              (p.party_id && p.party_id === rPartyId) ||
              (p.partyId && p.partyId === rPartyId) ||
              (p.party_name && (p.party_name || '').trim().toLowerCase() === rPartyName.toLowerCase())
            ))
          );
          const rPaymentsPaid = rMatchedPayments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
          const totalPaidFromCycles = rCycles.reduce((sum, c) => sum + (c.paidAmount || 0), 0);
          const effectivePaidSum = rPaymentsPaid > 0 ? rPaymentsPaid : (totalPaidFromCycles || r.paid_amount || (r as any).paid || 0);
          const effectivePendingSum = Math.max(0, totalRentSum - effectivePaidSum);

          // Update active cycle's paid/pending if payments table has more accurate amount
          if (activeCycle && rPaymentsPaid > 0) {
            activeCycle.paidAmount = effectivePaidSum;
            activeCycle.pendingAmount = effectivePendingSum;
          }

          // Auto-overdue detection:
          const isOverdue =
            r.status !== 'returned' &&
            (r.status === 'overdue' ||
              (activeFinances ? activeFinances.extraDays > 0 : false) ||
              Boolean(activeCycle?.expectedEndDate && todayStr > activeCycle.expectedEndDate));

          const computedStatus: 'active' | 'returned' | 'overdue' =
            r.status === 'returned' ? 'returned' : isOverdue ? 'overdue' : 'active';

          let savedCustomBillNumbers: Record<string, number | string> = {};
          try {
            savedCustomBillNumbers = JSON.parse(localStorage.getItem('anand_custom_bill_numbers') || '{}');
          } catch {
            savedCustomBillNumbers = {};
          }
          const customBillNum = savedCustomBillNumbers[r.id];
          const rentalBillNumber = customBillNum !== undefined
            ? customBillNum
            : chronologicalRentals.findIndex((x) => x.id === r.id) + 1 || 1;
          const rentalCustomerNumber =
            (rPartyId ? partyCustNumberMap.get(rPartyId) : undefined) ||
            (rPartyName ? partyNameToNumberMap.get(rPartyName.toLowerCase()) : undefined) ||
            1;

          return {
            id: r.id,
            partyId: rPartyId,
            partyName: rPartyName || 'ग्राहक',
            plateType: r.plate_type || (r as any).plateType || '24×3',
            quantity: r.quantity || 0,
            dailyRate: r.daily_rate !== undefined ? r.daily_rate : ((r as any).dailyRate !== undefined ? (r as any).dailyRate : 1.5),
            issueDate: r.issue_date || (r as any).issueDate || todayStr,
            days: activeCycle ? (activeCycle.status === 'active' && activeFinances ? activeFinances.elapsedDays : activeCycle.days) : (r.days || 40),
            totalRent: totalRentSum || r.total_rent || (r as any).totalRent || 0,
            paid: effectivePaidSum,
            pending: effectivePendingSum,
            paymentMode: r.payment_mode || (r as any).paymentMode || 'Cash',
            status: computedStatus,
            items: Array.isArray(r.items) ? r.items : [],
            currentCycleNumber: activeCycle?.cycleNumber || r.current_cycle_number || (r as any).currentCycleNumber || 1,
            currentCycleStartDate: activeCycle?.startDate || r.current_cycle_start_date || (r as any).currentCycleStartDate || r.issue_date || (r as any).issueDate || todayStr,
            currentCycleEndDate: activeCycle?.expectedEndDate || r.current_cycle_end_date || (r as any).currentCycleEndDate,
            cycles: rCycles,
            billNumber: rentalBillNumber,
            customerNumber: rentalCustomerNumber,
          };
        })
      );

      setReturns(
        safeReturns.filter(Boolean).map((ret: any) => ({
          id: ret.id,
          rentalId: ret.rental_id || ret.rentalId || '',
          partyId: ret.party_id || ret.partyId || '',
          partyName: ret.party_name || ret.partyName || 'ग्राहक',
          plateType: ret.plate_type || ret.plateType || '24×3',
          issuedQuantity: ret.issued_quantity !== undefined ? ret.issued_quantity : (ret.issuedQuantity !== undefined ? ret.issuedQuantity : 0),
          returnedQuantity: ret.returned_quantity !== undefined ? ret.returned_quantity : (ret.returnedQuantity !== undefined ? ret.returnedQuantity : 0),
          remainingQuantity: ret.remaining_quantity !== undefined ? ret.remaining_quantity : (ret.remainingQuantity !== undefined ? ret.remainingQuantity : 0),
          returnDate: ret.return_date || ret.returnDate || todayStr,
          penaltyAmount: ret.penalty_amount !== undefined ? Number(ret.penalty_amount) : (ret.penaltyAmount !== undefined ? Number(ret.penaltyAmount) : undefined),
          penaltyType: ret.penalty_type || ret.penaltyType || undefined,
          collectedAmount: ret.collected_amount !== undefined ? Number(ret.collected_amount) : (ret.collectedAmount !== undefined ? Number(ret.collectedAmount) : undefined),
          refundAmount: ret.refund_amount !== undefined ? Number(ret.refund_amount) : (ret.refundAmount !== undefined ? Number(ret.refundAmount) : undefined),
          paymentMode: ret.payment_mode || ret.paymentMode || undefined,
          daysKept: ret.days_kept !== undefined ? Number(ret.days_kept) : (ret.daysKept !== undefined ? Number(ret.daysKept) : undefined),
          batchRent: ret.batch_rent !== undefined ? Number(ret.batch_rent) : (ret.batchRent !== undefined ? Number(ret.batchRent) : undefined),
        }))
      );

      setPayments(
        safePayments.filter(Boolean).map((p: any) => ({
          id: p.id,
          partyId: p.party_id || p.partyId || '',
          partyName: p.party_name || p.partyName || 'ग्राहक',
          rentalId: p.rental_id || p.rentalId || null,
          cycleId: p.cycle_id || p.cycleId || null,
          cycleNumber: p.cycle_number || p.cycleNumber || null,
          amount: Number(p.amount) || 0,
          penaltyAmount: p.penalty_amount !== undefined ? Number(p.penalty_amount) : (p.penaltyAmount !== undefined ? Number(p.penaltyAmount) : undefined),
          penaltyType: p.penalty_type || p.penaltyType || undefined,
          date: p.payment_date || p.date || p.paymentDate || todayStr,
          paymentMode: (p.payment_mode || p.paymentMode) === 'Udhari' ? 'Outstanding' : (p.payment_mode || p.paymentMode || 'Cash'),
          reference: p.reference || '',
          notes: p.notes || '',
          status: p.status || 'verified',
        }))
      );

      setLedger(
        safeLedger.filter(Boolean).map((l: any) => ({
          id: l.id,
          partyId: l.party_id || l.partyId || '',
          date: l.date || todayStr,
          description: l.description || '',
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
          balance: Number(l.balance) || 0,
        }))
      );

      setNotifications(
        safeNotifications.filter(Boolean).map((n: any) => ({
          id: n.id,
          type: n.type || 'general',
          title: n.title || '',
          message: n.message || '',
          date: n.date || todayStr,
          isRead: n.is_read !== undefined ? n.is_read : (n.isRead !== undefined ? n.isRead : false),
        }))
      );
    } catch (err: any) {
      console.error('Failed to load database state:', err);
      if (isSupabaseConfigured) {
        addToast(
          'error',
          appLanguage === 'marathi'
            ? 'सर्व्हर डेटा लोड करताना अडचण आली. स्थानिक डेटा वापरत आहे.'
            : 'Error connecting to Supabase database. Falling back to local offline storage.'
        );
      }
    } finally {
      if (spinnerTimer) {
        clearTimeout(spinnerTimer);
      }
      if (showLoadingSpinner) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadAllData(false);
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
  // Build unified customer registry from BOTH rawParties and rentals so every distinct customer is assigned serial Cust #1, #2...
  const allCustomerMetas: {
    id: string;
    name: string;
    mobile: string;
    address: string;
    notes: string;
    status: 'active' | 'inactive';
    photo_url?: string | null;
    aadhaar_url?: string | null;
    aadhaar_back_url?: string | null;
    cheque_url?: string | null;
    earliestDate: string;
  }[] = [];

  const registeredCustomerIds = new Set<string>();
  const registeredCustomerNames = new Set<string>();

  for (const p of rawParties) {
    if (!p) continue;
    const pName = (p.name || '').trim();
    const normName = pName.toLowerCase();
    if (p.id) registeredCustomerIds.add(p.id);
    if (normName) registeredCustomerNames.add(normName);
    const pRentals = rentals.filter(
      (r) => (r && r.partyId === p.id) || (r && r.partyName && (r.partyName || '').trim().toLowerCase() === normName)
    );
    const earliestRentDate = pRentals.reduce((earliest, r) => {
      const d = r.issueDate || r.currentCycleStartDate;
      return d && (!earliest || d < earliest) ? d : earliest;
    }, '');
    const pCreatedDate = p.created_at ? p.created_at.split('T')[0] : '';
    const earliestDate = [pCreatedDate, earliestRentDate].filter(Boolean).sort()[0] || '2026-01-01';

    allCustomerMetas.push({
      id: p.id || `party-${Math.random()}`,
      name: pName || 'ग्राहक',
      mobile: p.mobile || '',
      address: p.address || '',
      notes: p.notes || '',
      status: p.status || 'active',
      photo_url: p.photo_url,
      aadhaar_url: p.aadhaar_url,
      aadhaar_back_url: p.aadhaar_back_url,
      cheque_url: p.cheque_url,
      earliestDate,
    });
  }

  for (const r of rentals) {
    if (!r) continue;
    const rPartyName = (r.partyName || '').trim();
    const normName = rPartyName.toLowerCase();
    if (normName && !registeredCustomerNames.has(normName) && (!r.partyId || !registeredCustomerIds.has(r.partyId))) {
      registeredCustomerNames.add(normName);
      if (r.partyId) registeredCustomerIds.add(r.partyId);
      allCustomerMetas.push({
        id: r.partyId || `party-${normName.replace(/[^a-z0-9]/g, '-')}`,
        name: rPartyName || 'ग्राहक',
        mobile: '',
        address: '',
        notes: '',
        status: 'active',
        earliestDate: r.issueDate || '2026-01-01',
      });
    }
  }

  // Sort all customers chronologically so Customer #1, Customer #2, Customer #3... are deterministic
  allCustomerMetas.sort((a, b) => {
    if (a.earliestDate !== b.earliestDate) {
      return (a.earliestDate || '').localeCompare(b.earliestDate || '');
    }
    return (a.name || '').localeCompare(b.name || '');
  });

  const customerNumberMap = new Map<string, number>();
  const customerNameNumberMap = new Map<string, number>();

  allCustomerMetas.forEach((p, idx) => {
    const num = idx + 1;
    if (p.id) customerNumberMap.set(p.id, num);
    if (p.name) customerNameNumberMap.set((p.name || '').toLowerCase(), num);
  });

  const parties: Party[] = allCustomerMetas.map((p) => {
    const normName = (p.name || '').trim().toLowerCase();
    const partyRentals = rentals.filter(
      (r) => (r && r.partyId === p.id) || (r && r.partyName && (r.partyName || '').trim().toLowerCase() === normName)
    );
    const partyReturns = returns.filter(
      (ret) => (ret && ret.partyId === p.id) || (ret && ret.partyName && (ret.partyName || '').trim().toLowerCase() === normName)
    );
    const partyPayments = payments.filter((pay) => pay && pay.partyId === p.id);
    const partyCycles = rentalCycles.filter((c) => c && c.partyId === p.id);
    const todayDateStr = new Date().toISOString().split('T')[0];

    const totalRent = partyCycles.length > 0
      ? partyCycles.reduce((sum, c) => {
          if (c.status === 'active') {
            try {
              const fin = calculateCycleFinances(c, todayDateStr);
              return sum + (fin.totalAmount || 0);
            } catch {
              return sum + (c.totalAmount || 0);
            }
          }
          return sum + (c.totalAmount || 0);
        }, 0)
      : partyRentals.reduce((sum, r) => sum + (r.totalRent || 0), 0);

    const totalPaid = partyPayments.reduce((sum, pay) => sum + (pay.type === 'refund' ? -pay.amount : pay.amount), 0);

    const pending = partyCycles.length > 0
      ? partyCycles.reduce((sum, c) => {
          if (c.status === 'active') {
            try {
              const fin = calculateCycleFinances(c, todayDateStr);
              return sum + (fin.pendingAmount || 0);
            } catch {
              return sum + (c.pendingAmount || 0);
            }
          }
          return sum + (c.pendingAmount || 0);
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
      photoUrl: p.photo_url || null,
      aadhaarUrl: p.aadhaar_url || null,
      aadhaarBackUrl: p.aadhaar_back_url || null,
      chequeUrl: p.cheque_url || null,
      customerNumber: customerNumberMap.get(p.id) || (p.name ? customerNameNumberMap.get(p.name.trim().toLowerCase()) : undefined) || 1,
    };
  });

  // Combine standard 7 certified sizes with custom plate sizes and DB settings
  const allPlateSizes: PlateSizeType[] = React.useMemo(() => {
    const list: string[] = [...STANDARD_PLATE_SIZES];
    customPlateSizes.forEach((s) => {
      if (!list.includes(s)) list.push(s);
    });
    plateSettings.forEach((p) => {
      if (!list.includes(p.plate_size)) list.push(p.plate_size);
    });
    stockItems.forEach((s) => {
      if (!list.includes(s.plate_size)) list.push(s.plate_size);
    });
    return list as PlateSizeType[];
  }, [customPlateSizes, plateSettings, stockItems]);

  // Compute live synchronized plates data derived from Supabase stock additions, rentals, and returns
  const derivedPlates: PlateStock[] = allPlateSizes.map((size) => {
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
    const dailyRate =
      existingSetting?.daily_rate && existingSetting.daily_rate > 0
        ? existingSetting.daily_rate
        : 1.5;

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

  // Google Drive background auto-backup check (runs automatically every 2 days if enabled)
  useEffect(() => {
    if (!isLoading && rentals.length > 0) {
      const getBackupData = () => {
        let billConfig: any = null;
        try {
          billConfig = JSON.parse(localStorage.getItem('anand_bill_template_config') || 'null');
        } catch {}

        return {
          appName: localStorage.getItem('anand_business_name') || 'ANAND BUILDERS & DEVELOPERS',
          appNameMarathi: localStorage.getItem('anand_business_name_mr') || 'आनंद बिल्डिंग मटेरियल सप्लायर',
          exportTimestamp: new Date().toISOString(),
          exportDateFormatted: new Date().toLocaleString(),
          stats: {
            totalRentals: rentals.length,
            totalCycles: rentalCycles.length,
            totalReturns: returns.length,
            totalPayments: payments.length,
            totalParties: parties.length,
            totalStock: stockItems.length,
          },
          rentals,
          rentalCycles,
          returns,
          payments,
          parties,
          stockItems,
          plateSettings,
          plateTypes: plateSettings,
          ledgerEntries: ledger,
          notifications,
          billConfig,
        };
      };

      googleDriveBackupService.maybeAutoBackup(getBackupData);
    }
  }, [isLoading, rentals, rentalCycles, returns, payments, parties, stockItems, plateSettings, ledger, notifications]);

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
  const handleAddParty = async (newParty: {
    name: string;
    mobile: string;
    address?: string;
    notes?: string;
    photoUrl?: string | null;
    aadhaarUrl?: string | null;
    aadhaarBackUrl?: string | null;
    chequeUrl?: string | null;
  }) => {
    try {
      const created = await insertParty({
        name: newParty.name,
        mobile: newParty.mobile,
        address: newParty.address,
        notes: newParty.notes,
        photo_url: newParty.photoUrl,
        aadhaar_url: newParty.aadhaarUrl,
        aadhaar_back_url: newParty.aadhaarBackUrl,
        cheque_url: newParty.chequeUrl,
      });
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
        photo_url: updatedParty.photoUrl,
        aadhaar_url: updatedParty.aadhaarUrl,
        aadhaar_back_url: updatedParty.aadhaarBackUrl,
        cheque_url: updatedParty.chequeUrl,
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
      const targetParty = parties.find((p) => p.id === partyId);
      const targetRaw = rawParties.find((p) => p.id === partyId);
      const partyName = targetParty?.name || targetRaw?.name || 'Customer';

      if (targetParty) {
        if (targetParty.platesWithParty > 0) {
          addToast('error', `Cannot delete "${partyName}": ${targetParty.platesWithParty} plates are still on site (pending return).`);
          return;
        }
        if (targetParty.pending > 0) {
          addToast('error', `Cannot delete "${partyName}": Outstanding dues of ₹${targetParty.pending.toLocaleString('en-IN')} must be cleared first.`);
          return;
        }
      }

      await deleteParty(partyId);
      setRawParties((prev) => prev.filter((p) => p.id !== partyId));
      addToast('success', `Party "${partyName}" removed.`);
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

  const handleAddPlateType = async (data: {
    plateType: string;
    dailyRate: number;
    initialStock?: number;
  }) => {
    try {
      const trimmed = data.plateType.trim();
      if (!trimmed) return;

      const created = await insertPlateType(trimmed, data.dailyRate, 'available');
      setPlateSettings((prev) => [
        ...prev.filter((p) => p.plate_size !== trimmed),
        created,
      ]);

      setCustomPlateSizes((prev) => {
        if (!prev.includes(trimmed)) {
          const next = [...prev, trimmed];
          saveCustomPlateSizes(next);
          return next;
        }
        return prev;
      });

      if (data.initialStock && data.initialStock > 0) {
        await handleAddStock({
          plate_size: trimmed as PlateSizeType,
          quantity: data.initialStock,
          received_date: new Date().toISOString().split('T')[0],
          notes: `Initial stock added with new plate size ${trimmed}`,
        });
      }

      addToast(
        'success',
        `Plate size "${trimmed}" added successfully at ₹${Number(data.dailyRate).toFixed(2)}/day.`
      );
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to add plate size.');
      throw err;
    }
  };

  const handleDeletePlateType = async (plateType: string) => {
    try {
      await deletePlateType(plateType);
      setPlateSettings((prev) => prev.filter((p) => p.plate_size !== plateType));
      setCustomPlateSizes((prev) => {
        const next = prev.filter((s) => s !== plateType);
        saveCustomPlateSizes(next);
        return next;
      });
      addToast('info', `Plate size "${plateType}" deleted.`);
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to delete plate size.');
      throw err;
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

      const maxBill = rentals.reduce((max, r) => Math.max(max, Number(r.billNumber) || 0), 0);
      const nextBillNumber = maxBill + 1;
      const normPartyName = (newRental.partyName || '').trim().toLowerCase().replace(/\s+/g, ' ');
      const matchedParty = parties.find(
        (p) =>
          (newRental.partyId && p.id === newRental.partyId) ||
          p.name.trim().toLowerCase().replace(/\s+/g, ' ') === normPartyName
      );
      const nextCustNumber = matchedParty?.customerNumber || (parties.length > 0 ? parties.length + 1 : 1);

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
        billNumber: nextBillNumber,
        customerNumber: nextCustNumber,
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
          paymentMode: newRental.paymentMode === 'Udhari' ? 'Outstanding' : (newRental.paymentMode as any),
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
    renewalConfirmationDate = new Date().toISOString().split('T')[0],
    newItems?: RentalItemRecord[],
    renewDays = 40,
    payment?: {
      amount: number;
      paymentMode: 'Account 1' | 'Account 2' | 'Cash';
      date?: string;
      reference?: string;
      notes?: string;
    },
    penalty = 0
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

      const renewalDays = renewDays && renewDays > 0 ? Number(renewDays) : 40;

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
          days: activeCycle.days || 40,
          items: rental.items,
        },
        finalizedEndDate
      );

      // Allocation of payment collected at renewal time
      const penaltyAmount = penalty && penalty > 0 ? Number(penalty) : 0;
      const paymentAmount = payment && payment.amount > 0 ? Number(payment.amount) : 0;

      // Calculate all previous cycles pending dues
      const earlierCycles = existingCycles.filter(
        (c) => c.id !== activeCycle.id && c.cycleNumber < activeCycle.cycleNumber
      );
      const earlierDues = earlierCycles.reduce((sum, c) => {
        const d = typeof c.pendingAmount === 'number'
          ? c.pendingAmount
          : Math.max(0, (c.totalAmount || c.baseRent || 0) - (c.paidAmount || 0));
        return sum + Math.max(0, d);
      }, 0);
      const activePrevDue = Math.max(0, previousFinances.pendingAmount);
      const allPrevDue = earlierDues + activePrevDue;

      // Payment allocations
      const prevPaidFromPayment = Math.min(paymentAmount, allPrevDue);
      const remainingAfterPrev = Math.max(0, paymentAmount - prevPaidFromPayment);
      const penaltyPaidFromPayment = Math.min(remainingAfterPrev, penaltyAmount);
      const newCycleAdvance = Math.max(0, remainingAfterPrev - penaltyPaidFromPayment);

      const activeCyclePayment = Math.min(prevPaidFromPayment, activePrevDue);

      const finalPrevCyclePaid = (activeCycle.paidAmount || 0) + activeCyclePayment;
      const finalPrevCyclePending = Math.max(0, previousFinances.totalAmount - finalPrevCyclePaid);

      // 1. Finalize previous cycle (with updated paid/pending if payment was made)
      await updateRentalCycle(activeCycle.id, {
        actual_end_date: finalizedEndDate,
        days: isOverdueRenewal ? previousFinances.elapsedDays : (activeCycle.days || 40),
        extra_days: previousFinances.extraDays,
        extra_amount: previousFinances.extraAmount,
        total_amount: previousFinances.totalAmount,
        paid_amount: finalPrevCyclePaid,
        pending_amount: finalPrevCyclePending,
        status: 'completed',
      });

      // 2. Determine plate configuration for new cycle
      const baseNewItems: RentalItemRecord[] =
        newItems && newItems.length > 0
          ? newItems
          : rental.items && rental.items.length > 0
          ? rental.items
          : [
              {
                plateType: rental.plateType,
                quantity: rental.quantity,
                dailyRate: rental.dailyRate,
                days: renewalDays,
              },
            ];

      const finalNewItems: RentalItemRecord[] = baseNewItems.map((it) => ({
        ...it,
        days: renewalDays,
      }));

      const newQuantity = finalNewItems.reduce((sum, it) => sum + Number(it.quantity || 0), 0);
      const newDailyRate = finalNewItems[0]?.dailyRate || rental.dailyRate || 1.5;
      const newPlateTypeSummary =
        finalNewItems.length === 1
          ? finalNewItems[0].plateType
          : finalNewItems.map((it) => `${it.plateType} (${it.quantity})`).join(', ');

      const newBaseRent = finalNewItems.reduce(
        (sum, it) => sum + Number(it.quantity || 0) * Number(it.dailyRate || 1.5) * renewalDays,
        0
      );

      const newCycleNumber = activeCycle.cycleNumber + 1;
      const newExpectedEndDate = calculateExpectedCycleEndDate(newStartDate, renewalDays);
      const newCyclePending = Math.max(0, newBaseRent - newCycleAdvance);

      // 3. Start new fresh cycle (Cycle N+1) with isolated financials and configured days
      const createdNewCycle = await insertRentalCycle({
        rental_id: rental.id,
        party_id: rental.partyId,
        cycle_number: newCycleNumber,
        start_date: newStartDate,
        expected_end_date: newExpectedEndDate,
        days: renewalDays,
        extra_days: 0,
        daily_rate: newDailyRate,
        quantity: newQuantity,
        base_rent: newBaseRent,
        extra_amount: 0,
        total_amount: newBaseRent,
        paid_amount: newCycleAdvance,
        pending_amount: newCyclePending,
        status: 'active',
        items: finalNewItems,
      });

      // Update local cycle state
      const updatedCycleList = [
        ...rentalCycles.map((c) =>
          c.id === activeCycle.id
            ? {
                ...c,
                actualEndDate: finalizedEndDate,
                days: isOverdueRenewal ? previousFinances.elapsedDays : (activeCycle.days || 40),
                extraDays: previousFinances.extraDays,
                extraAmount: previousFinances.extraAmount,
                totalAmount: previousFinances.totalAmount,
                paidAmount: finalPrevCyclePaid,
                pendingAmount: finalPrevCyclePending,
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
          days: renewalDays,
          extraDays: 0,
          dailyRate: newDailyRate,
          quantity: newQuantity,
          baseRent: newBaseRent,
          extraAmount: 0,
          totalAmount: newBaseRent,
          paidAmount: newCycleAdvance,
          pendingAmount: newCyclePending,
          status: 'active' as const,
          items: finalNewItems,
        },
      ];
      setRentalCycles(updatedCycleList);

      // 4. Update rentals table pointer and plate items
      await updateRentalCyclePointerAndItems(
        rental.id,
        newCycleNumber,
        newStartDate,
        newExpectedEndDate,
        newPlateTypeSummary,
        newQuantity,
        newDailyRate,
        finalNewItems
      );

      // 5. Update rentals state with new active cycle
      setRentals((prev) =>
        prev.map((r) =>
          r.id === rental.id
            ? {
                ...r,
                days: renewalDays,
                currentCycleNumber: newCycleNumber,
                currentCycleStartDate: newStartDate,
                currentCycleEndDate: newExpectedEndDate,
                plateType: newPlateTypeSummary,
                quantity: newQuantity,
                dailyRate: newDailyRate,
                items: finalNewItems,
                paid: r.paid + paymentAmount,
                pending: earlierDues + finalPrevCyclePending + newCyclePending + Math.max(0, penaltyAmount - penaltyPaidFromPayment),
                cycles: updatedCycleList.filter((c) => c.rentalId === r.id),
              }
            : r
        )
      );

      // 6. Ledger postings & Payment Creation
      const currentPartyPending =
        parties.find((p) => p.id === rental.partyId)?.pending || 0;

      // If previous cycle incurred extra charges, debit it
      if (previousFinances.extraAmount > 0) {
        const ledExtra = await insertLedgerEntry({
          party_id: rental.partyId,
          date: renewalConfirmationDate,
          description: `Rental Cycle ${activeCycle.cycleNumber} Overdue: ${previousFinances.extraDays} extra days beyond ${activeCycle.days || 40}-day cycle`,
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

      // If penalty was added on renewal, debit it
      if (penaltyAmount > 0) {
        const ledPenalty = await insertLedgerEntry({
          party_id: rental.partyId,
          date: renewalConfirmationDate,
          description: `Penalty / Late Fee on Renewal (Rental #${rental.billNumber || rental.id.slice(-4)})`,
          debit: penaltyAmount,
          credit: 0,
          balance: currentPartyPending + (previousFinances.extraAmount || 0) + penaltyAmount,
          reference_type: 'rental_penalty',
          reference_id: activeCycle.id,
        });
        setLedger((prev) => [
          {
            id: ledPenalty.id,
            partyId: ledPenalty.party_id,
            date: ledPenalty.date,
            description: ledPenalty.description,
            debit: ledPenalty.debit,
            credit: ledPenalty.credit,
            balance: ledPenalty.balance,
          },
          ...prev,
        ]);
      }

      // Debit for new cycle standard rent
      const ledRenewal = await insertLedgerEntry({
        party_id: rental.partyId,
        date: newStartDate,
        description: `Rental Renewed (Cycle ${newCycleNumber}): ${newPlateTypeSummary} (${newQuantity} Plates) for ${renewalDays} days`,
        debit: newBaseRent,
        credit: 0,
        balance:
          currentPartyPending +
          newBaseRent +
          (previousFinances.extraAmount > 0 ? previousFinances.extraAmount : 0) +
          penaltyAmount,
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

      // If payment collected at renewal, record payments and credit ledger
      if (payment && payment.amount > 0) {
        const payDate = payment.date || renewalConfirmationDate;
        const payMode = payment.paymentMode || 'Cash';
        const newPaymentsCreated: Payment[] = [];

        // Previous cycle payment record
        if (prevPaidFromPayment > 0) {
          const ref = payment.reference?.trim() || `REN-CYC${activeCycle.cycleNumber}-${Date.now().toString().slice(-4)}`;
          const notes = payment.notes?.trim() || `Renewal settlement for Cycle ${activeCycle.cycleNumber}`;
          const ins = await insertPayment({
            party_id: rental.partyId,
            party_name: rental.partyName,
            rental_id: rental.id,
            cycle_id: activeCycle.id,
            cycle_number: activeCycle.cycleNumber,
            amount: prevPaidFromPayment,
            payment_date: payDate,
            payment_mode: payMode,
            reference: ref,
            notes,
            status: 'verified',
          });
          newPaymentsCreated.push({
            id: ins.id,
            partyId: rental.partyId,
            partyName: rental.partyName,
            rentalId: rental.id,
            cycleId: activeCycle.id,
            cycleNumber: activeCycle.cycleNumber,
            amount: prevPaidFromPayment,
            date: payDate,
            paymentMode: payMode,
            reference: ins.reference || ref,
            notes,
            status: 'verified',
          });

          // Ledger credit for previous cycle settlement
          const ledPayment = await insertLedgerEntry({
            party_id: rental.partyId,
            date: payDate,
            description: `Payment Received - Cycle ${activeCycle.cycleNumber} Renewal Settlement - ${payMode} (Ref: ${ins.reference || ref})`,
            debit: 0,
            credit: prevPaidFromPayment,
            balance: Math.max(0, currentPartyPending - prevPaidFromPayment),
            reference_type: 'payment',
            reference_id: ins.id,
          });
          setLedger((prev) => [
            {
              id: ledPayment.id,
              partyId: ledPayment.party_id,
              date: ledPayment.date,
              description: ledPayment.description,
              debit: ledPayment.debit,
              credit: ledPayment.credit,
              balance: ledPayment.balance,
            },
            ...prev,
          ]);
        }

        // Penalty payment record
        if (penaltyPaidFromPayment > 0) {
          const ref = payment.reference?.trim()
            ? `${payment.reference.trim()}-PEN`
            : `REN-PEN-CYC${activeCycle.cycleNumber}-${Date.now().toString().slice(-4)}`;
          const notes = `Penalty / Fine payment collected on Renewal`;
          const insPen = await insertPayment({
            party_id: rental.partyId,
            party_name: rental.partyName,
            rental_id: rental.id,
            cycle_id: activeCycle.id,
            cycle_number: activeCycle.cycleNumber,
            amount: penaltyPaidFromPayment,
            payment_date: payDate,
            payment_mode: payMode,
            reference: ref,
            notes,
            status: 'verified',
          });
          newPaymentsCreated.push({
            id: insPen.id,
            partyId: rental.partyId,
            partyName: rental.partyName,
            rentalId: rental.id,
            cycleId: activeCycle.id,
            cycleNumber: activeCycle.cycleNumber,
            amount: penaltyPaidFromPayment,
            date: payDate,
            paymentMode: payMode,
            reference: insPen.reference || ref,
            notes,
            status: 'verified',
          });

          const ledPenPayment = await insertLedgerEntry({
            party_id: rental.partyId,
            date: payDate,
            description: `Payment Received - Penalty Settlement - ${payMode} (Ref: ${insPen.reference || ref})`,
            debit: 0,
            credit: penaltyPaidFromPayment,
            balance: Math.max(0, currentPartyPending - penaltyPaidFromPayment),
            reference_type: 'payment',
            reference_id: insPen.id,
          });
          setLedger((prev) => [
            {
              id: ledPenPayment.id,
              partyId: ledPenPayment.party_id,
              date: ledPenPayment.date,
              description: ledPenPayment.description,
              debit: ledPenPayment.debit,
              credit: ledPenPayment.credit,
              balance: ledPenPayment.balance,
            },
            ...prev,
          ]);
        }

        // New cycle advance payment record
        if (newCycleAdvance > 0) {
          const ref = payment.reference?.trim()
            ? `${payment.reference.trim()}-ADV`
            : `REN-ADV-CYC${newCycleNumber}-${Date.now().toString().slice(-4)}`;
          const notes = payment.notes?.trim() || `Advance payment for Renewal Cycle ${newCycleNumber}`;
          const ins = await insertPayment({
            party_id: rental.partyId,
            party_name: rental.partyName,
            rental_id: rental.id,
            cycle_id: createdNewCycle.id,
            cycle_number: newCycleNumber,
            amount: newCycleAdvance,
            payment_date: payDate,
            payment_mode: payMode,
            reference: ref,
            notes,
            status: 'verified',
          });
          newPaymentsCreated.push({
            id: ins.id,
            partyId: rental.partyId,
            partyName: rental.partyName,
            rentalId: rental.id,
            cycleId: createdNewCycle.id,
            cycleNumber: newCycleNumber,
            amount: newCycleAdvance,
            date: payDate,
            paymentMode: payMode,
            reference: ins.reference || ref,
            notes,
            status: 'verified',
          });

          // Ledger credit for advance payment
          const ledPayment = await insertLedgerEntry({
            party_id: rental.partyId,
            date: payDate,
            description: `Advance Payment Received - Cycle ${newCycleNumber} Renewal - ${payMode} (Ref: ${ins.reference || ref})`,
            debit: 0,
            credit: newCycleAdvance,
            balance: Math.max(0, currentPartyPending - paymentAmount),
            reference_type: 'payment',
            reference_id: ins.id,
          });
          setLedger((prev) => [
            {
              id: ledPayment.id,
              partyId: ledPayment.party_id,
              date: ledPayment.date,
              description: ledPayment.description,
              debit: ledPayment.debit,
              credit: ledPayment.credit,
              balance: ledPayment.balance,
            },
            ...prev,
          ]);
        }

        if (newPaymentsCreated.length > 0) {
          setPayments((prev) => [...newPaymentsCreated, ...prev]);
        }
      }


      if (payment && payment.amount > 0) {
        addToast(
          'success',
          `Rental renewed for ${rental.partyName} (Cycle ${newCycleNumber}) & payment of ₹${payment.amount.toLocaleString('en-IN')} received!`
        );
      } else {
        addToast(
          'success',
          `Rental renewed for ${rental.partyName}! Cycle ${newCycleNumber} started (${newStartDate} to ${newExpectedEndDate}).`
        );
      }
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

  const handleUpdateBillNumber = (rentalId: string, newBillNumber: number | string) => {
    try {
      let saved: Record<string, number | string> = {};
      try {
        saved = JSON.parse(localStorage.getItem('anand_custom_bill_numbers') || '{}');
      } catch {
        saved = {};
      }
      saved[rentalId] = newBillNumber;
      localStorage.setItem('anand_custom_bill_numbers', JSON.stringify(saved));

      setRentals((prev) =>
        prev.map((r) =>
          r.id === rentalId
            ? { ...r, billNumber: newBillNumber }
            : r
        )
      );
      addToast('success', `Bill number updated to #${newBillNumber} successfully!`);
    } catch {
      addToast('error', 'Failed to update bill number.');
    }
  };

  // 4. Returns: Finalizes active cycle, marks rental returned, collects remaining balance or refunds excess advance, and restores physical inventory
  const handleAddReturn = async (newReturn: ReturnInputPayload) => {
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
        collected_amount: newReturn.collectedAmount,
        refund_amount: newReturn.refundAmount,
        payment_mode: newReturn.paymentMode,
        penalty_amount: newReturn.penaltyAmount,
        penalty_type: newReturn.penaltyType,
        days_kept: newReturn.daysKept,
        batch_rent: newReturn.batchRent,
      });

      const created: ReturnLog = {
        ...newReturn,
        id: inserted.id,
        partyName: party.name,
        plateType: matchedRental.plateType,
        issuedQuantity: matchedRental.quantity,
        collectedAmount: newReturn.collectedAmount,
        refundAmount: newReturn.refundAmount,
        paymentMode: newReturn.paymentMode,
        penaltyAmount: newReturn.penaltyAmount,
        penaltyType: newReturn.penaltyType,
        daysKept: newReturn.daysKept,
        batchRent: newReturn.batchRent,
      };

      setReturns((prev) => [created, ...prev]);

      // Locate active cycle for this rental
      const existingCycles = rentalCycles.filter((c) => c.rentalId === newReturn.rentalId);
      const activeCycle =
        existingCycles.find((c) => c.status === 'active') ||
        existingCycles[existingCycles.length - 1];

      // Prior returns for this rental before this current return
      const priorReturns = returns.filter((r) => r.rentalId === newReturn.rentalId);

      const dailyRate = activeCycle?.dailyRate || 
        (matchedRental.items && matchedRental.items.length > 0 && matchedRental.items[0].dailyRate 
          ? matchedRental.items[0].dailyRate 
          : 1.5);

      const partialBreakdown = calculatePartialReturnsBreakdown({
        startDate: activeCycle?.startDate || matchedRental.currentCycleStartDate || matchedRental.issueDate,
        initialQuantity: matchedRental.quantity,
        dailyRate: dailyRate,
        cycleDays: 40,
        returns: priorReturns.map((r) => ({ returnDate: r.returnDate, returnedQuantity: r.returnedQuantity })),
        currentReturn: { returnDate: newReturn.returnDate, returnedQuantity: newReturn.returnedQuantity },
      });

      const isFullReturn = newReturn.remainingQuantity === 0;
      const finalCycleTotal = partialBreakdown.totalRent;

      // If penalty was charged on return, post ledger debit for penalty
      const returnPenalty = Number(newReturn.penaltyAmount || 0);
      if (returnPenalty > 0) {
        const partyPending = parties.find((p) => p.id === newReturn.partyId)?.pending || 0;
        const ledPenalty = await insertLedgerEntry({
          party_id: newReturn.partyId,
          date: newReturn.returnDate,
          description: `साहित्य वापसी दंड आकारणी (${getPenaltyTypeLabel(newReturn.penaltyType, true)}) [${newReturn.returnedQuantity} प्लेट्स] [पावती: ${inserted.id}]`,
          debit: returnPenalty,
          credit: 0,
          balance: partyPending + returnPenalty,
          reference_type: 'rental_penalty',
          reference_id: inserted.id,
        });

        setLedger((prev) => [
          {
            id: ledPenalty.id,
            partyId: ledPenalty.party_id,
            date: ledPenalty.date,
            description: ledPenalty.description,
            debit: ledPenalty.debit,
            credit: ledPenalty.credit,
            balance: ledPenalty.balance,
          },
          ...prev,
        ]);
      }

      // Amounts collected or refunded upon return
      const amountCollected = Number(newReturn.collectedAmount || 0);
      const amountRefunded = Number(newReturn.refundAmount || 0);
      const previousPaid = activeCycle ? activeCycle.paidAmount : matchedRental.paid;
      const newPaidAmount = previousPaid + amountCollected - amountRefunded;
      const newPendingAmount = Math.max(0, finalCycleTotal - newPaidAmount);

      // 1. If payment was collected upon return, record verified Payment voucher and ledger credit entry
      if (amountCollected > 0) {
        const mode = newReturn.paymentMode || 'Cash';
        const ref = newReturn.paymentReference || `RET-${Date.now().toString().slice(-4)}`;
        const notes = newReturn.paymentNotes || `Payment collected on plate return (${newReturn.returnedQuantity} plates)`;

        const insertedPayment = await insertPayment({
          party_id: newReturn.partyId,
          party_name: party.name,
          rental_id: newReturn.rentalId,
          cycle_id: activeCycle?.id || undefined,
          cycle_number: activeCycle?.cycleNumber || 1,
          amount: amountCollected,
          payment_date: newReturn.returnDate,
          payment_mode: mode,
          reference: ref,
          notes: notes,
          status: 'verified',
          type: 'payment',
        });

        const pay: Payment = {
          id: insertedPayment.id,
          partyId: newReturn.partyId,
          partyName: party.name,
          rentalId: newReturn.rentalId,
          cycleId: activeCycle?.id || null,
          cycleNumber: activeCycle?.cycleNumber || 1,
          amount: amountCollected,
          date: newReturn.returnDate,
          paymentMode: mode,
          reference: ref,
          notes: notes,
          status: 'verified',
          type: 'payment',
        };
        setPayments((prev) => [pay, ...prev]);

        // Ledger credit voucher
        const partyPendingBeforePay = parties.find((p) => p.id === newReturn.partyId)?.pending || 0;
        const ledEntryPay = await insertLedgerEntry({
          party_id: newReturn.partyId,
          date: newReturn.returnDate,
          description: `Payment Received on Plate Return - ${mode} (Ref: ${ref})`,
          debit: 0,
          credit: amountCollected,
          balance: Math.max(0, partyPendingBeforePay - amountCollected),
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

        // Notification
        const insertedNot = await insertNotification({
          party_id: newReturn.partyId,
          type: 'payment',
          title: 'Return Settlement Payment Received',
          message: `₹${amountCollected.toLocaleString('en-IN')} collected in ${mode} upon plate return from ${party.name}. Ref: ${ref}`,
          date: newReturn.returnDate,
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
      }

      // 2. If excess advance was refunded to customer, record verified Refund payment voucher and ledger debit entry
      if (amountRefunded > 0) {
        const mode = newReturn.paymentMode || 'Cash';
        const ref = newReturn.paymentReference || `REF-${Date.now().toString().slice(-4)}`;
        const notes = newReturn.paymentNotes || `Advance excess refund returned to customer on plate return (${newReturn.returnedQuantity} plates)`;

        const insertedRefund = await insertPayment({
          party_id: newReturn.partyId,
          party_name: party.name,
          rental_id: newReturn.rentalId,
          cycle_id: activeCycle?.id || undefined,
          cycle_number: activeCycle?.cycleNumber || 1,
          amount: amountRefunded,
          payment_date: newReturn.returnDate,
          payment_mode: mode,
          reference: ref,
          notes: notes,
          status: 'verified',
          type: 'refund',
        });

        const payRefund: Payment = {
          id: insertedRefund.id,
          partyId: newReturn.partyId,
          partyName: party.name,
          rentalId: newReturn.rentalId,
          cycleId: activeCycle?.id || null,
          cycleNumber: activeCycle?.cycleNumber || 1,
          amount: amountRefunded,
          date: newReturn.returnDate,
          paymentMode: mode,
          reference: ref,
          notes: notes,
          status: 'verified',
          type: 'refund',
        };
        setPayments((prev) => [payRefund, ...prev]);

        // Ledger debit voucher (cash paid out to customer as excess advance refund)
        const partyPendingBeforeRef = parties.find((p) => p.id === newReturn.partyId)?.pending || 0;
        const ledEntryRef = await insertLedgerEntry({
          party_id: newReturn.partyId,
          date: newReturn.returnDate,
          description: `Advance Excess Refund Paid to Customer - ${mode} (Ref: ${ref}) [ग्राहकाला परतावा]`,
          debit: amountRefunded,
          credit: 0,
          balance: partyPendingBeforeRef + amountRefunded,
          reference_type: 'payment',
          reference_id: insertedRefund.id,
        });

        setLedger((prev) => [
          {
            id: ledEntryRef.id,
            partyId: ledEntryRef.party_id,
            date: ledEntryRef.date,
            description: ledEntryRef.description,
            debit: ledEntryRef.debit,
            credit: ledEntryRef.credit,
            balance: ledEntryRef.balance,
          },
          ...prev,
        ]);

        // Notification for refund
        const insertedNotRef = await insertNotification({
          party_id: newReturn.partyId,
          type: 'payment',
          title: 'Advance Excess Refund Returned to Customer',
          message: `₹${amountRefunded.toLocaleString('en-IN')} refunded in ${mode} to ${party.name} upon plate return. Ref: ${ref}`,
          date: newReturn.returnDate,
        });

        setNotifications((prev) => [
          {
            id: insertedNotRef.id,
            type: insertedNotRef.type,
            title: insertedNotRef.title,
            message: insertedNotRef.message,
            date: insertedNotRef.date,
            isRead: insertedNotRef.is_read,
          },
          ...prev,
        ]);
      }

      // Update cycle financial state
      if (activeCycle) {
        await updateRentalCycle(activeCycle.id, {
          ...(isFullReturn ? {
            actual_end_date: newReturn.returnDate,
            days: partialBreakdown.returnedBatches.reduce((max, b) => Math.max(max, b.elapsedDays), 0),
            extra_days: 0,
            extra_amount: 0,
            base_rent: finalCycleTotal,
            total_amount: finalCycleTotal,
            status: 'completed',
          } : {
            base_rent: finalCycleTotal,
            total_amount: finalCycleTotal,
          }),
          paid_amount: newPaidAmount,
          pending_amount: newPendingAmount,
        });

        setRentalCycles((prev) =>
          prev.map((c) =>
            c.id === activeCycle.id
              ? {
                  ...c,
                  ...(isFullReturn ? {
                    actualEndDate: newReturn.returnDate,
                    days: partialBreakdown.returnedBatches.reduce((max, b) => Math.max(max, b.elapsedDays), 0),
                    extraDays: 0,
                    extraAmount: 0,
                    baseRent: finalCycleTotal,
                    totalAmount: finalCycleTotal,
                    status: 'completed' as const,
                  } : {
                    baseRent: finalCycleTotal,
                    totalAmount: finalCycleTotal,
                  }),
                  paidAmount: newPaidAmount,
                  pendingAmount: newPendingAmount,
                }
              : c
          )
        );
      }

      // Update rental status and totals
      if (isFullReturn) {
        await updateRentalOnReturn(newReturn.rentalId, finalCycleTotal, newReturn.returnDate, newPaidAmount, newPendingAmount);
        setRentals((prev) =>
          prev.map((r) =>
            r.id === newReturn.rentalId
              ? {
                  ...r,
                  status: 'returned',
                  totalRent: finalCycleTotal,
                  paid: newPaidAmount,
                  pending: newPendingAmount,
                }
              : r
          )
        );
      } else {
        // Continuous integration: update rental's running totalRent to reflect prorated returned plates + remaining continuing plates
        setRentals((prev) =>
          prev.map((r) =>
            r.id === newReturn.rentalId
              ? {
                  ...r,
                  totalRent: finalCycleTotal,
                  paid: newPaidAmount,
                  pending: newPendingAmount,
                }
              : r
          )
        );
      }

      // Ledger Entry for Return Intake
      const actionText = amountRefunded > 0
        ? ` [Refunded ₹${amountRefunded.toLocaleString('en-IN')}]`
        : amountCollected > 0
        ? ` [Collected ₹${amountCollected.toLocaleString('en-IN')}]`
        : '';

      const ledEntry = await insertLedgerEntry({
        party_id: newReturn.partyId,
        date: newReturn.returnDate,
        description: `Material Return Intake: ${newReturn.returnedQuantity} Plates of ${matchedRental.plateType} returned${isFullReturn ? ' (Cycle Completed)' : ''}${actionText}`,
        debit: 0,
        credit: 0,
        balance: Math.max(0, (parties.find((p) => p.id === newReturn.partyId)?.pending || 0) - amountCollected),
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

      addToast(
        'success',
        `Received ${newReturn.returnedQuantity} plates of ${matchedRental.plateType} from ${party.name}.${returnPenalty > 0 ? ` Penalty: ₹${returnPenalty.toLocaleString('en-IN')}.` : ''}${amountRefunded > 0 ? ` Refunded ₹${amountRefunded.toLocaleString('en-IN')} (${newReturn.paymentMode || 'Cash'}).` : ''}${amountCollected > 0 ? ` Collected ₹${amountCollected.toLocaleString('en-IN')} (${newReturn.paymentMode || 'Cash'}).` : ''}`
      );
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to record return.');
      throw err;
    }
  };

  // 5. Payments: Cycle-level isolated payment recording
  const handleAddPayment = async (newPayment: {
    partyId: string;
    amount: number;
    penaltyAmount?: number;
    penaltyType?: string;
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
        penalty_amount: newPayment.penaltyAmount,
        penalty_type: newPayment.penaltyType,
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
        penaltyAmount: newPayment.penaltyAmount,
        penaltyType: newPayment.penaltyType,
        date: newPayment.date,
        paymentMode: newPayment.paymentMode,
        reference: inserted.reference || paymentRef,
        notes: newPayment.notes || '',
        status: 'verified',
      };

      setPayments((prev) => [created, ...prev]);

      // If penalty was charged, record ledger debit for penalty
      if (newPayment.penaltyAmount && newPayment.penaltyAmount > 0) {
        const partyPending = parties.find((p) => p.id === newPayment.partyId)?.pending || 0;
        const ledPenalty = await insertLedgerEntry({
          party_id: newPayment.partyId,
          date: newPayment.date,
          description: `दंड आकारणी (${getPenaltyTypeLabel(newPayment.penaltyType, true)}) [पावती: ${paymentRef}]`,
          debit: newPayment.penaltyAmount,
          credit: 0,
          balance: partyPending + newPayment.penaltyAmount,
          reference_type: 'payment_penalty',
          reference_id: inserted.id,
        });
        setLedger((prev) => [
          {
            id: ledPenalty.id,
            partyId: ledPenalty.party_id,
            date: ledPenalty.date,
            description: ledPenalty.description,
            debit: ledPenalty.debit,
            credit: ledPenalty.credit,
            balance: ledPenalty.balance,
          },
          ...prev,
        ]);
      }

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
          setRentals((prev) =>
            prev.map((r) =>
              r.id === targetCycle.rentalId
                ? {
                    ...r,
                    paid: (r.paid || 0) + newPayment.amount,
                    pending: Math.max(0, (r.pending || 0) - newPayment.amount),
                  }
                : r
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
          setRentals((prev) =>
            prev.map((r) =>
              r.id === cyc.rentalId
                ? {
                    ...r,
                    paid: (r.paid || 0) + applyAmt,
                    pending: Math.max(0, (r.pending || 0) - applyAmt),
                  }
                : r
            )
          );
          remainingToApply -= applyAmt;
        }

        if (newPayment.rentalId) {
          setRentals((prev) =>
            prev.map((r) =>
              r.id === newPayment.rentalId
                ? {
                    ...r,
                    paid: (r.paid || 0) + newPayment.amount,
                    pending: Math.max(0, (r.pending || 0) - newPayment.amount),
                  }
                : r
            )
          );
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

  const handleDeduplicateData = async () => {
    try {
      const report = await deduplicateAllStoredData();
      await loadAllData(false);
      if (report.totalRemoved > 0) {
        addToast(
          'success',
          `Deduplication completed! Removed ${report.totalRemoved} duplicate records (${report.details.join(', ')}).`
        );
      } else {
        addToast('info', 'No duplicate records found. Your database is completely clean!');
      }
      return report;
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to deduplicate records.');
      throw err;
    }
  };

  const handleDeleteData = async (category: DeleteDataCategory) => {
    try {
      setIsLoading(true);
      const isMarathi = appLanguage === 'marathi';
      let detailsMessage = '';

      if (category === 'all_rentals') {
        await clearAllRentalsAndCycles();
        detailsMessage = isMarathi
          ? 'सर्व भाडे वाटप, सायकल्स व जमा नोंदी यशस्वीरीत्या हटवण्यात आल्या.'
          : 'All rental agreements, cycles, and returns successfully deleted.';
      } else if (category === 'all_payments') {
        await clearAllPayments();
        detailsMessage = isMarathi
          ? 'सर्व पेमेंट नोंदी व पावत्या यशस्वीरीत्या हटवण्यात आल्या.'
          : 'All payment records and receipts successfully deleted.';
      } else if (category === 'inactive_customers') {
        const inactiveIds = parties
          .filter((p) => (p.platesWithParty || 0) === 0 && (p.pending || 0) === 0)
          .map((p) => p.id);
        const removedCount = await clearInactiveParties(inactiveIds);
        detailsMessage = isMarathi
          ? `${removedCount} शून्य बाकी असलेले निष्क्रिय ग्राहक हटवण्यात आले.`
          : `${removedCount} inactive customers successfully removed.`;
      } else if (category === 'all_customers') {
        await clearAllParties();
        detailsMessage = isMarathi
          ? 'सर्व ग्राहक प्रोफाइल्स यशस्वीरीत्या हटवण्यात आल्या.'
          : 'All customer profiles successfully deleted.';
      } else if (category === 'all_notifications') {
        await clearAllNotifications();
        detailsMessage = isMarathi
          ? 'सर्व सूचना व नोटिफिकेशन्स साफ करण्यात आल्या.'
          : 'All notifications cleared.';
      } else if (category === 'factory_reset') {
        await factoryResetAllDatabase();
        detailsMessage = isMarathi
          ? 'फॅक्टरी रिसेट यशस्वी! संपूर्ण डेटाबेस पूर्णपणे स्वच्छ केला गेला आहे.'
          : 'Factory reset complete! All data has been cleanly wiped.';
      }

      await loadAllData(false);
      addToast('success', detailsMessage);
    } catch (err: any) {
      console.error('Data deletion failed:', err);
      addToast('error', err?.message || (isMarathi ? 'डेटा हटवताना अडचण आली.' : 'Failed to delete data.'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreBackup = async (backupJson: any) => {
    try {
      setIsLoading(true);
      const res = await restoreBackupData(backupJson);
      await loadAllData(false);
      addToast(
        'success',
        appLanguage === 'marathi'
          ? 'डेटा बॅकअप यशस्वीरीत्या रिस्टोअर झाला!'
          : res.message || 'Backup restored successfully!'
      );
    } catch (err: any) {
      console.error('Failed to restore backup:', err);
      addToast('error', err?.message || 'Failed to restore backup.');
    } finally {
      setIsLoading(false);
    }
  };

  // Render Page Content based on selected Active tab
  const renderTabContent = () => {
    if (isLoading && rawParties.length === 0 && rentals.length === 0 && payments.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-sm text-slate-500 font-semibold">{isMarathi ? 'माहिती लोड होत आहे...' : 'Loading data...'}</p>
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
            onTabChange={handleTabChange}
            onRenewRental={handleRenewRental}
            onInitiateReturn={handleInitiateReturn}
            appLanguage={appLanguage}
          />
        );
      case 'Parties':
        return (
          <PartiesTab
            parties={parties}
            rentals={rentals}
            payments={payments}
            ledger={ledger}
            rentalCycles={rentalCycles}
            returns={returns}
            onAddParty={handleAddParty}
            onEditParty={handleEditParty}
            onDeleteParty={handleDeleteParty}
            appLanguage={appLanguage}
          />
        );
      case 'Plate Types':
        return (
          <PlateTypesTab
            plates={derivedPlates}
            onUpdateRate={handleUpdatePlateRate}
            onUpdateStatus={handleUpdatePlateStatus}
            onAddPlateType={handleAddPlateType}
            onDeletePlateType={handleDeletePlateType}
            appLanguage={appLanguage}
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
            appLanguage={appLanguage}
          />
        );
      case 'Rentals':
        return (
          <RentalsTab
            rentals={rentals}
            parties={parties}
            plates={derivedPlates}
            rentalCycles={rentalCycles}
            payments={payments}
            returns={returns}
            onAddRental={handleAddRental}
            onRenewRental={handleRenewRental}
            onUpdateRentalStatus={handleUpdateRentalStatus}
            onUpdateBillNumber={handleUpdateBillNumber}
            onInitiateReturn={handleInitiateReturn}
            appLanguage={appLanguage}
          />
        );
      case 'Returns':
        return (
          <ReturnsTab
            returns={returns}
            rentals={rentals}
            rentalCycles={rentalCycles}
            parties={parties}
            payments={payments}
            onAddReturn={handleAddReturn}
            preselectedRentalId={preselectedRentalId}
            onClearPreselectedRental={() => setPreselectedRentalId(null)}
            appLanguage={appLanguage}
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
            appLanguage={appLanguage}
          />
        );
      case 'Outstanding Dues':
      case 'Udhari':
        return <OutstandingDuesTab parties={parties} payments={payments} appLanguage={appLanguage} />;
      case 'Ledger':
        return <LedgerTab parties={parties} ledger={ledger} appLanguage={appLanguage} />;
      case 'Notifications':
        return (
          <NotificationsTab
            notifications={notifications}
            onMarkRead={handleMarkRead}
            onClearNotification={handleClearNotification}
            onMarkAllRead={handleMarkAllRead}
            appLanguage={appLanguage}
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
            rentalCycles={rentalCycles}
            appLanguage={appLanguage}
          />
        );
      case 'Settings':
        return (
          <SettingsTab
            rentals={rentals}
            parties={parties}
            rentalCycles={rentalCycles}
            payments={payments}
            returns={returns}
            stockItems={stockItems}
            plateSettings={plateSettings}
            ledger={ledger}
            notifications={notifications}
            onDeduplicate={handleDeduplicateData}
            onDeleteData={handleDeleteData}
            onRestoreBackup={handleRestoreBackup}
            appLanguage={appLanguage}
          />
        );
      default:
        return <div className="p-8 text-center text-slate-400">Section to be added.</div>;
    }
  };

  const navItems = [
    { name: 'Dashboard', label: curT.nav.Dashboard, icon: LayoutDashboard },
    { name: 'Parties', label: curT.nav.Parties, icon: Users },
    { name: 'Plate Types', label: curT.nav['Plate Types'], icon: Ruler },
    { name: 'Plate Stock', label: curT.nav['Plate Stock'], icon: Layers },
    { name: 'Rentals', label: curT.nav.Rentals, icon: ClipboardList },
    { name: 'Returns', label: curT.nav.Returns, icon: RefreshCw },
    { name: 'Payments', label: curT.nav.Payments, icon: DollarSign },
    { name: 'Outstanding Dues', label: curT.nav['Outstanding Dues'], icon: AlertCircle },
    { name: 'Ledger', label: curT.nav.Ledger, icon: FileText },
    { name: 'Notifications', label: curT.nav.Notifications, icon: Bell, badgeCount: unreadAlertsCount },
    { name: 'Reports', label: curT.nav.Reports, icon: BarChart3 },
    { name: 'Settings', label: curT.nav.Settings, icon: Sliders },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row w-full font-sans text-slate-800">
      {/* 1. Mobile Top Header Bar */}
      <div className="md:hidden w-full bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between text-white sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="ANAND Logo" className="h-9 w-auto object-contain" />
          <div className="text-left leading-none">
            <span className="text-xs font-bold block">{appLanguage === 'marathi' ? 'आनंद प्लेट्स' : 'ANAND PLATES'}</span>
            <span className="text-[9px] text-primary font-bold">{appLanguage === 'marathi' ? 'आनंद मटेरियल' : 'Anand Rental'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile language selector */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 rounded-lg px-2 py-1 text-xs">
            <Globe className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <select
              id="mobile-language-select"
              value={appLanguage}
              onChange={(e) => handleLanguageChange(e.target.value as AppLanguage)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
              title="Select Language"
              aria-label="Select Language"
            >
              <option value="marathi" className="bg-slate-900 text-white font-semibold">मराठी</option>
              <option value="english" className="bg-slate-900 text-white font-semibold">English</option>
            </select>
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-850"
          >
            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
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
              <h1 className="text-white font-extrabold text-sm tracking-wide">{appLanguage === 'marathi' ? 'आनंद प्लेट्स' : 'ANAND PLATES'}</h1>
              <p className="text-[10px] text-primary font-bold">{appLanguage === 'marathi' ? 'आनंद बिल्डिंग मटेरियल' : 'Anand Building Materials'}</p>
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
                    handleTabChange(item.name);
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-primary text-white font-bold shadow-md shadow-orange-500/10'
                      : 'hover:bg-slate-850 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="truncate whitespace-nowrap">{item.label || item.name}</span>
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
                <p className="text-xs font-bold text-white">{curT.header.adminUser}</p>
                <p className="text-[10px] text-slate-500 font-light">{curT.header.adminRole}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-rose-500 rounded-lg transition-all"
              title={curT.header.logout}
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
        <header className="hidden md:flex bg-white border-b border-slate-200/80 px-8 py-4 items-center justify-between sticky top-0 z-30">
          <div className="text-left">
            <h2 className="text-xl font-black text-charcoal">
              {curT.nav[activeTab as keyof typeof curT.nav] || activeTab} {curT.header.controls}
            </h2>
            <p className="text-[11px] text-slate-400 font-light">{curT.header.subtitle}</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick Header Language Switcher as Select Option */}
            <div className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200/70 border border-slate-200/80 hover:border-slate-300 rounded-xl px-2.5 py-1.5 transition-all text-xs font-semibold shadow-2xs">
              <Globe className="w-4 h-4 text-primary flex-shrink-0" />
              <select
                id="header-language-select"
                value={appLanguage}
                onChange={(e) => handleLanguageChange(e.target.value as AppLanguage)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-1"
                aria-label={isMarathi ? 'भाषा निवडा' : 'Select Language'}
                title={isMarathi ? 'भाषा निवडा' : 'Select Language'}
              >
                <option value="marathi" className="font-bold text-slate-800 bg-white">मराठी</option>
                <option value="english" className="font-bold text-slate-800 bg-white">English</option>
              </select>
            </div>

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
                placeholder={curT.header.searchPlaceholder}
                className="w-full bg-slate-50 border border-slate-250/60 focus:border-primary focus:outline-none pl-9 pr-3 py-1.5 rounded-lg text-xs font-semibold"
              />
            </div>

            {/* Quick Notifications bell icon button */}
            <button
              onClick={() => handleTabChange('Notifications')}
              className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              {unreadAlertsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
              )}
            </button>
          </div>
        </header>

        {/* Tab Content Display Area */}
        <main className="flex-grow p-3 sm:p-5 lg:p-6 max-w-[1600px] w-full mx-auto overflow-y-auto">
          {renderTabContent()}
        </main>
      </div>

      {/* Toast notifications container */}
      <Toast toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};
