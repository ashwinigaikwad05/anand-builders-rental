import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  X,
  Check,
  ClipboardList,
  Info,
  Trash2,
  History,
  RotateCw,
  RefreshCw,
  FileText,
  ArrowUpDown,
  Edit2,
  MessageSquare,
} from 'lucide-react';
import type { Party, PlateStock, Rental, RentalItem, RentalCycle, Payment, ReturnLog } from '../../../data/adminMockData';
import {
  calculateCycleFinances,
  calculateExpectedCycleEndDate,
} from '../../../lib/supabase';

import { RenewRentalModal } from '../modals/RenewRentalModal';
import { RentalBillModal } from '../modals/RentalBillModal';
import { getStoredAppLanguage, type AppLanguage } from '../../../utils/appTranslations';
import {
  formatMarathiDate,
  formatDateRange,
  matchRentalSearch,
  formatPartyName,
  formatPlateType,
  type RentalSearchTarget,
} from '../../../utils/marathiUtils';
import {
  buildBillWhatsAppUrl,
} from '../../../utils/billPdfShareUtils.ts';
import { useAccountNames } from '../../../utils/paymentAccountUtils';

interface PlateRowItem {
  id: string;
  plateType: string;
  quantity: number | string;
  dailyRate: number | string;
  days: number | string;
}

interface RentalsTabProps {
  rentals: Rental[];
  parties: Party[];
  plates: PlateStock[];
  rentalCycles?: RentalCycle[];
  payments?: Payment[];
  returns?: ReturnLog[];
  onAddRental: (newRental: Omit<Rental, 'id' | 'totalRent' | 'pending' | 'status'>) => void;
  onUpdateRentalStatus?: (rentalId: string, status: 'active' | 'returned' | 'overdue') => void;
  onUpdateBillNumber?: (rentalId: string, newBillNumber: number | string) => void;
  onInitiateReturn?: (rental: Rental) => void;
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
  appLanguage?: AppLanguage;
}

export const RentalsTab: React.FC<RentalsTabProps> = ({
  rentals,
  parties,
  plates,
  rentalCycles = [],
  payments = [],
  returns = [],
  onAddRental,
  onUpdateRentalStatus: _onUpdateRentalStatus,
  onUpdateBillNumber,
  onInitiateReturn,
  onRenewRental,
  appLanguage,
}) => {
  const isMarathi = (appLanguage || getStoredAppLanguage()) === 'marathi';
  const todayStr = new Date().toISOString().split('T')[0];
  const [searchTerm, setSearchTerm] = useState('');
  const [editingBillRentalId, setEditingBillRentalId] = useState<string | null>(null);
  const [inlineBillNo, setInlineBillNo] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'active' | 'returned' | 'overdue'>('All');
  const [partyFilter, setPartyFilter] = useState<string>('All');
  const [plateFilter, setPlateFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'customer-serial' | 'bill-asc' | 'bill-desc' | 'date-desc'>('customer-serial');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [renewTarget, setRenewTarget] = useState<Rental | null>(null);
  const [historyTarget, setHistoryTarget] = useState<Rental | null>(null);
  const [billTarget, setBillTarget] = useState<Rental | null>(null);
  const [autoShareBillId, setAutoShareBillId] = useState<string | null>(null);
  const accountNames = useAccountNames();

  // Form states for Add Rental
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [issueDate, setIssueDate] = useState(todayStr);
  const [plateRows, setPlateRows] = useState<PlateRowItem[]>([
    { id: 'row-1', plateType: '24×3', quantity: 100, dailyRate: 1.5, days: 40 },
  ]);
  const [amountPaid, setAmountPaid] = useState<string>('0');
  const [paymentMode, setPaymentMode] = useState<'Account 1' | 'Account 2' | 'Cash' | 'Outstanding'>('Outstanding');
  const [validationError, setValidationError] = useState('');

  // Calculations across all plate rows
  const calculatedTotalRent = plateRows.reduce((sum, r) => {
    const q = parseInt(String(r.quantity), 10) || 0;
    const rate = parseFloat(String(r.dailyRate)) || 0;
    const d = parseInt(String(r.days), 10) || 0;
    return sum + q * rate * d;
  }, 0);
  const numericPaid = parseFloat(amountPaid) || 0;
  const calculatedPending = Math.max(0, calculatedTotalRent - numericPaid);

  const handleAmountPaidChange = (val: string) => {
    setAmountPaid(val);
    const num = parseFloat(val) || 0;
    if (num > 0) {
      if (paymentMode === 'Outstanding') {
        setPaymentMode('Cash');
      }
    } else {
      setPaymentMode('Outstanding');
    }
  };

  // Helper to fetch all cycles for a rental
  const getCyclesForRental = (rental: Rental): RentalCycle[] => {
    const list = rentalCycles.filter((c) => c.rentalId === rental.id);
    if (list.length > 0) {
      return [...list].sort((a, b) => a.cycleNumber - b.cycleNumber);
    }
    if (rental.cycles && rental.cycles.length > 0) {
      return [...rental.cycles].sort((a, b) => a.cycleNumber - b.cycleNumber);
    }
    // Fallback baseline cycle
    return [
      {
        id: `fallback-${rental.id}`,
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
      },
    ];
  };

  // Helper to get the active cycle of a rental
  const getActiveCycleForRental = (rental: Rental): RentalCycle => {
    const cycles = getCyclesForRental(rental);
    const active = cycles.find((c) => c.status === 'active');
    return active || cycles[cycles.length - 1];
  };

  // Helper to get live financial figures for the active cycle
  const getLiveCycleData = (rental: Rental) => {
    const activeCycle = getActiveCycleForRental(rental);
    if (rental.status === 'returned' || activeCycle.status === 'completed') {
      return {
        activeCycle,
        finances: {
          elapsedDays: activeCycle.days,
          standardDays: Math.min(activeCycle.days, 40),
          extraDays: activeCycle.extraDays,
          baseRent: activeCycle.baseRent,
          extraAmount: activeCycle.extraAmount,
          totalAmount: activeCycle.totalAmount,
          pendingAmount: activeCycle.pendingAmount,
        },
      };
    }

    const finances = calculateCycleFinances(
      {
        startDate: activeCycle.startDate,
        quantity: activeCycle.quantity,
        dailyRate: activeCycle.dailyRate,
        baseRent: activeCycle.baseRent,
        paidAmount: activeCycle.paidAmount,
        items: rental.items,
      },
      todayStr
    );

    return { activeCycle, finances };
  };

  // Helper to determine real-time effective status
  const getEffectiveRentalStatus = (rental: Rental): 'active' | 'returned' | 'overdue' => {
    if (rental.status === 'returned') return 'returned';
    const { activeCycle, finances } = getLiveCycleData(rental);
    if (
      rental.status === 'overdue' ||
      finances.extraDays > 0 ||
      Boolean(activeCycle.expectedEndDate && todayStr > activeCycle.expectedEndDate)
    ) {
      return 'overdue';
    }
    return 'active';
  };

  // Helper to find associated party for a rental
  const getPartyForRental = (rental: Rental): Party | undefined => {
    const normName = (rental.partyName || '').trim().toLowerCase().replace(/\s+/g, ' ');
    return parties.find(
      (p) =>
        (rental.partyId && p.id === rental.partyId) ||
        (p.name && p.name.trim().toLowerCase().replace(/\s+/g, ' ') === normName)
    );
  };

  // Helper to reliably look up a customer's sequential serial number across parties & rental records
  const getCustomerNumberForRental = (rental: Rental): number => {
    const matchedParty = getPartyForRental(rental);
    if (matchedParty?.customerNumber) {
      return matchedParty.customerNumber;
    }
    if (rental.customerNumber && Number(rental.customerNumber) > 0) {
      return Number(rental.customerNumber);
    }
    return 1;
  };

  const filteredRentals = rentals.filter((r) => {
    const matchedParty = getPartyForRental(r);
    const searchTarget: RentalSearchTarget = {
      ...r,
      party: matchedParty,
      customerNumber: getCustomerNumberForRental(r),
    };
    const matchesSearch = matchRentalSearch(searchTarget, searchTerm);

    const effectiveStatus = getEffectiveRentalStatus(r);
    const matchesStatus = statusFilter === 'All' || effectiveStatus === statusFilter;
    const matchesParty = partyFilter === 'All' || r.partyId === partyFilter;
    const matchesPlate = plateFilter === 'All' || r.plateType.includes(plateFilter);

    return matchesSearch && matchesStatus && matchesParty && matchesPlate;
  });

  const sortedRentals = useMemo(() => {
    return [...filteredRentals].sort((a, b) => {
      const custA = getCustomerNumberForRental(a);
      const custB = getCustomerNumberForRental(b);
      const numBillA = typeof a.billNumber === 'number' ? a.billNumber : parseFloat(String(a.billNumber || '0')) || 0;
      const numBillB = typeof b.billNumber === 'number' ? b.billNumber : parseFloat(String(b.billNumber || '0')) || 0;

      if (sortBy === 'customer-serial') {
        // Primary: Serial customer order (Cust #1, Cust #2...)
        if (custA !== custB) return custA - custB;
        // Secondary: Serial bills of that customer together (Bill #1, Bill #2, Bill #3...)
        if (numBillA !== numBillB) return numBillA - numBillB;
        return (a.issueDate || '').localeCompare(b.issueDate || '');
      }

      if (sortBy === 'bill-asc') {
        if (numBillA !== numBillB) return numBillA - numBillB;
        return (a.issueDate || '').localeCompare(b.issueDate || '');
      }

      if (sortBy === 'bill-desc') {
        if (numBillA !== numBillB) return numBillB - numBillA;
        return (b.issueDate || '').localeCompare(a.issueDate || '');
      }

      if (sortBy === 'date-desc') {
        const timeA = new Date(a.issueDate || 0).getTime();
        const timeB = new Date(b.issueDate || 0).getTime();
        if (timeA !== timeB) return timeB - timeA;
        return numBillB - numBillA;
      }

      return 0;
    });
  }, [filteredRentals, sortBy, parties]);

  const handleOpenAdd = () => {
    setSelectedPartyId(parties[0]?.id || '');
    setIssueDate(todayStr);
    const firstPlate = plates[0];
    const initialDailyRate =
      firstPlate && firstPlate.dailyRate && firstPlate.dailyRate > 0
        ? firstPlate.dailyRate
        : 1.5;
    setPlateRows([
      {
        id: `row-${Date.now()}-1`,
        plateType: firstPlate?.plateType || '24×3',
        quantity: 100,
        dailyRate: initialDailyRate,
        days: 40,
      },
    ]);
    setAmountPaid('0');
    setPaymentMode('Outstanding');
    setValidationError('');
    setIsAddOpen(true);
  };

  const handleAddPlateRow = () => {
    const unusedPlate = plates.find(
      (p) => !plateRows.some((r) => r.plateType === p.plateType)
    );
    const targetPlate = unusedPlate || plates[0];
    const targetDailyRate =
      targetPlate && targetPlate.dailyRate && targetPlate.dailyRate > 0
        ? targetPlate.dailyRate
        : 1.5;
    const newRow: PlateRowItem = {
      id: `row-${Date.now()}-${plateRows.length + 1}`,
      plateType: targetPlate?.plateType || '21×3',
      quantity: 50,
      dailyRate: targetDailyRate,
      days: plateRows[0]?.days || 40,
    };
    setPlateRows((prev) => [...prev, newRow]);
  };

  const handleRemovePlateRow = (id: string) => {
    setPlateRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdatePlateRow = (id: string, field: keyof PlateRowItem, value: any) => {
    setPlateRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: value };
        if (field === 'plateType') {
          const matched = plates.find((p) => p.plateType === value);
          if (matched) {
            updated.dailyRate =
              matched.dailyRate && matched.dailyRate > 0 ? matched.dailyRate : 1.5;
          }
        }
        return updated;
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!selectedPartyId || plateRows.length === 0) {
      setValidationError('Please select a customer party and at least one plate row.');
      return;
    }

    const selectedTypes = plateRows.map((r) => r.plateType);
    const hasDuplicates = new Set(selectedTypes).size !== selectedTypes.length;
    if (hasDuplicates) {
      setValidationError('This plate type is already added. Duplicate plate sizes are not allowed.');
      return;
    }

    for (const row of plateRows) {
      if (!row.plateType) {
        setValidationError('Please choose a valid plate size for all rows.');
        return;
      }
      const q = parseInt(String(row.quantity), 10) || 0;
      if (q < 1) {
        setValidationError(`Please enter a quantity of at least 1 for size ${row.plateType}.`);
        return;
      }
      const d = parseInt(String(row.days), 10) || 0;
      if (d < 1) {
        setValidationError(`Please enter rental term days of at least 1 for size ${row.plateType}.`);
        return;
      }
      const rate = parseFloat(String(row.dailyRate));
      if (isNaN(rate) || rate < 0) {
        setValidationError(`Please enter a valid daily rate for size ${row.plateType}.`);
        return;
      }

      const matchedPlate = plates.find((p) => p.plateType === row.plateType);
      const available = matchedPlate ? matchedPlate.available : 0;
      if (q > available) {
        setValidationError(`Only ${available} plates are available for size ${row.plateType}.`);
        return;
      }
    }

    const party = parties.find((p) => p.id === selectedPartyId);
    if (!party) return;

    const items: RentalItem[] = plateRows.map((r) => ({
      plateType: r.plateType,
      quantity: parseInt(String(r.quantity), 10) || 1,
      dailyRate: parseFloat(String(r.dailyRate)) || 0,
      days: parseInt(String(r.days), 10) || 1,
    }));

    const totalQuantity = plateRows.reduce(
      (sum, r) => sum + (parseInt(String(r.quantity), 10) || 1),
      0
    );
    const plateTypeSummary =
      plateRows.length === 1
        ? plateRows[0].plateType
        : plateRows
            .map((r) => `${r.plateType} (${parseInt(String(r.quantity), 10) || 1})`)
            .join(', ');

    const finalPaid = parseFloat(amountPaid) || 0;
    const finalPaymentMode: 'Account 1' | 'Account 2' | 'Cash' | 'Outstanding' =
      finalPaid > 0
        ? (paymentMode === 'Outstanding' ? 'Cash' : paymentMode)
        : 'Outstanding';

    onAddRental({
      partyId: selectedPartyId,
      partyName: party.name,
      plateType: plateTypeSummary,
      quantity: totalQuantity,
      dailyRate: parseFloat(String(plateRows[0]?.dailyRate)) || 1.5,
      issueDate,
      days: parseInt(String(plateRows[0]?.days), 10) || 40,
      paid: finalPaid,
      paymentMode: finalPaymentMode,
      items,
    });

    // Reset filters so the newly dispatched rental is guaranteed to be visible
    setSearchTerm('');
    setStatusFilter('All');
    setPartyFilter('All');
    setPlateFilter('All');

    setIsAddOpen(false);
  };

  // Open Renew Modal
  const handleOpenRenewModal = (rental: Rental) => {
    setRenewTarget(rental);
  };

  // Helper to generate direct WhatsApp chat link for a rental
  const getDirectWhatsAppUrl = (rent: Rental): string => {
    const party = parties.find(
      (p) =>
        (rent.partyId && p.id === rent.partyId) ||
        p.name.trim().toLowerCase() === rent.partyName?.trim().toLowerCase()
    );
    const mobile = party?.mobile || '';
    const liveData = getLiveCycleData(rent);
    return buildBillWhatsAppUrl({
      billNumber: rent.billNumber || 1,
      partyName: rent.partyName,
      partyMobile: mobile,
      partyAddress: party?.address || '',
      cycleStartDate: rent.issueDate,
      cycleDays: rent.days || 40,
      items:
        rent.items && rent.items.length > 0
          ? rent.items
          : [
              {
                plateType: rent.plateType,
                quantity: rent.quantity,
                dailyRate: rent.dailyRate,
                days: rent.days || 40,
              },
            ],
      totalRent: liveData.finances.totalAmount || rent.totalRent,
      paidAmount: rent.paid,
      pendingAmount: liveData.finances.pendingAmount || rent.pending,
      lang: isMarathi ? 'marathi' : 'english',
    });
  };



  return (
    <div className="space-y-6 text-left">
      {/* Search and Filters Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 flex-grow max-w-3xl">
          <div className="relative flex-grow">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                isMarathi
                  ? 'बिल नं., ग्राहक नाव किंवा साइटने शोधा...'
                  : 'Search by bill #, customer name, site...'
              }
              className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none pl-10 pr-9 py-2.5 rounded-xl text-xs sm:text-sm font-medium"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                title={isMarathi ? 'शोध साफ करा' : 'Clear search'}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-white border border-slate-200 focus:border-primary focus:outline-none px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700"
          >
            <option value="All">{isMarathi ? 'सर्व स्थिती' : 'All Statuses'}</option>
            <option value="active">{isMarathi ? 'सक्रिय' : 'Active'}</option>
            <option value="overdue">{isMarathi ? 'मुदत संपली' : 'Overdue'}</option>
            <option value="returned">{isMarathi ? 'जमा' : 'Returned'}</option>
          </select>

          {/* Party Filter */}
          <select
            value={partyFilter}
            onChange={(e) => setPartyFilter(e.target.value)}
            className="bg-white border border-slate-200 focus:border-primary focus:outline-none px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 max-w-[180px]"
          >
            <option value="All">{isMarathi ? 'सर्व ग्राहक' : 'All Parties'}</option>
            {parties.map((p) => (
              <option key={p.id} value={p.id}>
                {formatPartyName(p.name, isMarathi ? 'marathi' : 'english')}
              </option>
            ))}
          </select>

          {/* Plate Size Filter */}
          <select
            value={plateFilter}
            onChange={(e) => setPlateFilter(e.target.value)}
            className="bg-white border border-slate-200 focus:border-primary focus:outline-none px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700"
          >
            <option value="All">{isMarathi ? 'सर्व मापे' : 'All Sizes'}</option>
            {plates.map((p) => (
              <option key={p.plateType} value={p.plateType}>
                {p.plateType}
              </option>
            ))}
          </select>

          {/* Sort By Filter: Serial Customers & Bills */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl">
            <ArrowUpDown className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent focus:outline-none text-xs sm:text-sm font-semibold text-slate-700 cursor-pointer"
              title="Sort Rentals"
            >
              <option value="customer-serial">{isMarathi ? '👥 ग्राहक क्र. व सर्व बिले' : '👥 Customer Serial (Cust #1, #2... All Bills)'}</option>
              <option value="bill-asc">{isMarathi ? '🧾 बिल क्र. (१, २, ३... क्रमाने)' : '🧾 Bill # (Ascending 1, 2, 3...)'}</option>
              <option value="bill-desc">{isMarathi ? '🧾 नवीन बिले प्रथम' : '🧾 Bill # (Newest First)'}</option>
              <option value="date-desc">{isMarathi ? '📅 वाटप दिनांक (नवीन प्रथम)' : '📅 Issue Date (Newest First)'}</option>
            </select>
          </div>
        </div>

        {/* Trigger Button */}
        <button
          onClick={handleOpenAdd}
          className="bg-primary hover:bg-primary-dark text-white font-bold px-5 py-2.5 rounded-xl shadow-md hover:shadow-orange-500/10 flex items-center justify-center gap-2 text-sm transition-all flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{isMarathi ? '+ नवीन भाडे वाटप' : 'New Rental Dispatch'}</span>
        </button>
      </div>

      {/* Rentals Table */}
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="px-5 py-4 min-w-[160px]">{isMarathi ? 'ग्राहक व भाडे करार' : 'Party & Agreement'}</th>
                <th className="px-4 py-4 min-w-[100px]">{isMarathi ? 'माप व नग' : 'Size & Qty'}</th>
                <th className="px-4 py-4 min-w-[90px]">{isMarathi ? 'सायकल' : 'Cycle'}</th>
                <th className="px-4 py-4 min-w-[140px]">{isMarathi ? 'सायकल कालावधी' : 'Cycle Dates'}</th>
                <th className="px-4 py-4 min-w-[110px]">{isMarathi ? 'कालावधी' : 'Duration'}</th>
                <th className="px-4 py-4 min-w-[90px]">{isMarathi ? 'एकूण भाडे' : 'Total'}</th>
                <th className="px-4 py-4 min-w-[80px]">{isMarathi ? 'जमा रक्कम' : 'Paid'}</th>
                <th className="px-4 py-4 min-w-[100px]">{isMarathi ? 'येणे बाकी' : 'Due'}</th>
                <th className="px-4 py-4 min-w-[100px]">{isMarathi ? 'स्थिती' : 'Status'}</th>
                <th className="px-5 py-4 min-w-[270px] text-right">{isMarathi ? 'कृती' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-light">
              {sortedRentals.map((rent, idx) => {
                const { activeCycle, finances } = getLiveCycleData(rent);
                const allCycles = getCyclesForRental(rent);
                const hasExtra = finances.extraDays > 0;
                const isOverdue =
                  rent.status !== 'returned' &&
                  (rent.status === 'overdue' ||
                    hasExtra ||
                    Boolean(activeCycle.expectedEndDate && todayStr > activeCycle.expectedEndDate));
                const effectiveStatus: 'active' | 'returned' | 'overdue' =
                  rent.status === 'returned' ? 'returned' : isOverdue ? 'overdue' : 'active';

                const currentCustNum = getCustomerNumberForRental(rent);
                const matchedParty = getPartyForRental(rent);
                const partyAddress = matchedParty?.address?.trim();
                const prevCustNum = idx > 0 ? getCustomerNumberForRental(sortedRentals[idx - 1]) : null;
                const isNewCustomerGroup = sortBy === 'customer-serial' && currentCustNum !== prevCustNum;

                return (
                  <React.Fragment key={rent.id}>
                    {isNewCustomerGroup && (
                      <tr className="bg-slate-50/90 border-t-2 border-slate-200">
                        <td colSpan={10} className="px-5 py-2 text-xs font-bold text-slate-700 font-mono tracking-wide">
                          <span className="inline-flex items-center gap-2 bg-white border border-slate-200/90 px-3 py-1 rounded-lg shadow-2xs">
                            <span className="font-black text-primary">{isMarathi ? 'ग्राहक' : 'Customer'} #{currentCustNum}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-800 font-bold uppercase">{formatPartyName(rent.partyName, isMarathi ? 'marathi' : 'english')}</span>
                            {partyAddress && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="text-slate-500 font-normal font-sans text-[11px] inline-flex items-center gap-1" title={partyAddress}>
                                  <span className="text-slate-400">📍</span>
                                  <span className="max-w-[280px] truncate">{partyAddress}</span>
                                </span>
                              </>
                            )}
                          </span>
                        </td>
                      </tr>
                    )}
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      {/* Party & Agreement */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {editingBillRentalId === rent.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={inlineBillNo}
                                onChange={(e) => setInlineBillNo(e.target.value)}
                                className="w-16 bg-white border border-primary px-1.5 py-0.5 rounded text-xs font-mono font-bold text-slate-900 shadow-2xs"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (inlineBillNo.trim() && onUpdateBillNumber) {
                                    onUpdateBillNumber(rent.id, inlineBillNo.trim());
                                  }
                                  setEditingBillRentalId(null);
                                }}
                                className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 cursor-pointer"
                                title="Save Bill #"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingBillRentalId(null)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                                title="Cancel"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 group/bill">
                              <span className="font-mono font-black text-xs px-2 py-0.5 rounded-lg bg-orange-100 text-primary border border-orange-200 shadow-2xs">
                                {isMarathi ? 'बिल' : 'Bill'} #{rent.billNumber || 1}
                              </span>
                              {onUpdateBillNumber && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInlineBillNo(String(rent.billNumber || 1));
                                    setEditingBillRentalId(rent.id);
                                  }}
                                  className="opacity-0 group-hover/bill:opacity-100 p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-primary transition-opacity cursor-pointer"
                                  title={isMarathi ? 'बिल नंबर बदला' : 'Edit Bill Number'}
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                          <span className="font-bold text-slate-900 text-sm">{formatPartyName(rent.partyName, isMarathi ? 'marathi' : 'english')}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded text-[10px]">
                            {isMarathi ? 'ग्राहक' : 'Cust'} #{currentCustNum}
                          </span>
                          <span>•</span>
                          <span>{isMarathi ? 'वाटप' : 'Disp'}: {formatMarathiDate(rent.issueDate)}</span>
                          {partyAddress && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span
                                className="inline-flex items-center gap-1 text-[11px] font-sans font-medium text-slate-600 bg-slate-100/90 hover:bg-slate-200/70 transition-colors px-1.5 py-0.5 rounded max-w-[220px] truncate"
                                title={`${isMarathi ? 'कामाचे ठिकाण' : 'Delivery Address'}: ${partyAddress}`}
                              >
                                <span className="text-slate-400 text-[10px]">📍</span>
                                <span className="truncate">{partyAddress}</span>
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                    {/* Size & Qty */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                        {rent.plateType}
                      </span>
                      <div className="text-xs font-bold text-slate-700 mt-1">
                        {rent.quantity} Plates
                      </div>
                    </td>

                    {/* Active Cycle Badge */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold px-2.5 py-1 rounded-lg">
                        <span>{isMarathi ? 'सायकल' : 'Cycle'} {activeCycle.cycleNumber}</span>
                        {activeCycle.status === 'active' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                        )}
                      </span>
                      {allCycles.length > 1 && (
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          {allCycles.length} {isMarathi ? 'सायकल्स' : 'cyc total'}
                        </div>
                      )}
                    </td>

                    {/* Cycle Dates */}
                    <td className="px-4 py-4 text-xs font-mono text-slate-700 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{formatMarathiDate(activeCycle.startDate)}</div>
                      <div className="text-slate-400 text-[11px]">
                        → {formatMarathiDate(activeCycle.actualEndDate || activeCycle.expectedEndDate)}
                      </div>
                    </td>

                    {/* Duration & Extra */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="font-bold text-slate-800 text-xs">
                        {finances.elapsedDays} {isMarathi ? 'दिवस' : 'Days'}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {finances.standardDays} / {activeCycle.days || 40}d
                      </div>
                      {hasExtra && (
                        <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold rounded">
                          +{finances.extraDays} {isMarathi ? 'दिवस जादा' : 'd Overdue'}
                        </span>
                      )}
                    </td>

                    {/* Cycle Total */}
                    {(() => {
                      // Compute all-cycles aggregate figures
                      let allCyclesTotalAmount = 0;
                      let allCyclesPaidAmount = 0;
                      for (const cyc of allCycles) {
                        if (cyc.status === 'active' && rent.status !== 'returned') {
                          const cycFin = calculateCycleFinances(
                            {
                              startDate: cyc.startDate,
                              quantity: cyc.quantity,
                              dailyRate: cyc.dailyRate,
                              baseRent: cyc.baseRent,
                              paidAmount: cyc.paidAmount,
                              items: rent.items,
                            },
                            todayStr
                          );
                          allCyclesTotalAmount += cycFin.totalAmount;
                        } else {
                          allCyclesTotalAmount += cyc.totalAmount;
                        }
                        allCyclesPaidAmount += cyc.paidAmount;
                      }
                      const allCyclesPendingAmount = Math.max(0, allCyclesTotalAmount - allCyclesPaidAmount);
                      const hasMultipleCycles = allCycles.length > 1;

                      return (
                        <>
                          {/* Total */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="font-bold text-slate-900 text-sm">
                              ₹{allCyclesTotalAmount.toLocaleString('en-IN')}
                            </div>
                            {hasExtra && (
                              <div className="text-[10px] text-amber-700 font-medium">
                                +₹{finances.extraAmount.toLocaleString('en-IN')} extra
                              </div>
                            )}
                            {hasMultipleCycles && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                {allCycles.length} cycles
                              </div>
                            )}
                          </td>

                          {/* Paid */}
                          <td className="px-4 py-4 whitespace-nowrap text-emerald-600 font-bold text-sm">
                            ₹{allCyclesPaidAmount.toLocaleString('en-IN')}
                          </td>

                          {/* Due (All Cycles Pending) */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className={`font-black text-sm ${allCyclesPendingAmount > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                              ₹{allCyclesPendingAmount.toLocaleString('en-IN')}
                            </div>
                            {allCyclesPendingAmount === 0 && (
                              <span className="text-[10px] font-bold text-emerald-600">Settled ✓</span>
                            )}
                          </td>
                        </>
                      );
                    })()}

                    {/* Status */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            effectiveStatus === 'returned'
                              ? 'bg-slate-100 text-slate-500 border border-slate-200'
                              : effectiveStatus === 'overdue'
                              ? 'bg-rose-100 text-rose-700 border border-rose-300 font-black'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {isMarathi
                            ? effectiveStatus === 'overdue'
                              ? 'मुदत संपली'
                              : effectiveStatus === 'returned'
                              ? 'जमा'
                              : 'सक्रिय'
                            : effectiveStatus === 'overdue'
                            ? 'OVERDUE'
                            : effectiveStatus.toUpperCase()}
                        </span>
                        {effectiveStatus === 'overdue' && finances.extraDays > 0 && (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                            +{finances.extraDays}d
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {/* View & Print Rental Bill */}
                        <button
                          onClick={() => {
                            setBillTarget(rent);
                            setAutoShareBillId(null);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-all cursor-pointer"
                          title={`Generate / Print Rental Bill #${rent.billNumber || 1}`}
                        >
                          <FileText className="w-3.5 h-3.5 text-orange-400" />
                          <span>{isMarathi ? 'बिल' : 'Bill'} #{rent.billNumber || 1}</span>
                        </button>

                        {/* Quick WhatsApp Bill Share - opens WhatsApp directly */}
                        <a
                          href={getDirectWhatsAppUrl(rent)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-all cursor-pointer"
                          title={isMarathi ? 'ग्राहकाचे व्हॉट्सॲप चॅट थेट उघडा' : 'Open WhatsApp chat directly'}
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{isMarathi ? 'व्हॉट्सॲप' : 'WhatsApp'}</span>
                        </a>

                        {/* Return Action */}
                        {(effectiveStatus === 'active' || effectiveStatus === 'overdue') && onInitiateReturn && (
                          <button
                            onClick={() => onInitiateReturn(rent)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-orange-50 hover:bg-orange-100 text-primary border border-orange-200 transition-all cursor-pointer"
                            title="Record plate return and collect remaining balance"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>{isMarathi ? 'जमा' : 'Return'}</span>
                          </button>
                        )}

                        {/* Renew Cycle Button */}
                        {(effectiveStatus === 'active' || effectiveStatus === 'overdue') && onRenewRental && (
                          <button
                            onClick={() => handleOpenRenewModal(rent)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all cursor-pointer"
                            title="Renew rental for another 40-day cycle"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                            <span>{isMarathi ? 'नूतनीकरण' : 'Renew'}</span>
                          </button>
                        )}

                        {/* View Cycle History Modal Trigger */}
                        <button
                          onClick={() => setHistoryTarget(rent)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                          title="View Cycle Financial History"
                        >
                          <History className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  </React.Fragment>
                );
              })}
              {rentals.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-14 text-center">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3 text-amber-500 shadow-sm">
                        <ClipboardList className="w-7 h-7" />
                      </div>
                      <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">
                        {isMarathi ? 'कोणतेही भाडे वाटप नोंदी उपलब्ध नाहीत' : 'No Rental Dispatches Yet'}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
                        {isMarathi
                          ? 'नवीन प्लेट्स भाडे वाटप नोंदवण्यासाठी खालील बटणावर क्लिक करा.'
                          : 'Click the button below to register a new plate rental dispatch.'}
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => setIsAddOpen(true)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {isMarathi ? 'नवीन भाडे वाटप (+)' : 'New Rental Dispatch (+)'}
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : filteredRentals.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-10 text-center text-slate-400 font-light italic">
                    {isMarathi
                      ? 'शोध निकषांनुसार कोणतेही भाडे वाटप आढळले नाही (बिल क्र., ग्राहक नाव, किंवा साइट पत्ता तपासा).'
                      : 'No dispatches found matching query (check bill #, customer name, or site address).'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* RENEW CYCLE MODAL (Rule 1A/B/C) */}
      {renewTarget && (
        <RenewRentalModal
          rental={renewTarget}
          activeCycle={getActiveCycleForRental(renewTarget)}
          rentalCycles={getCyclesForRental(renewTarget)}
          party={parties.find((p) => p.id === renewTarget.partyId)}
          plates={plates}
          returns={returns}
          onClose={() => setRenewTarget(null)}
          onConfirm={async (rentalId, renewalDate, newItems, renewDays, payment, penalty) => {
            if (onRenewRental) {
              await onRenewRental(rentalId, renewalDate, newItems, renewDays, payment, penalty);
            }
          }}
        />
      )}

      {/* CYCLE HISTORY MODAL */}
      {historyTarget && (() => {
        const cycles = getCyclesForRental(historyTarget);
        const totalRentalAllCycles = cycles.reduce((sum, c) => sum + c.totalAmount, 0);
        const totalPaidAllCycles = cycles.reduce((sum, c) => sum + c.paidAmount, 0);
        const totalPendingAllCycles = cycles.reduce((sum, c) => sum + c.pendingAmount, 0);

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-scaleUp text-left">
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/60 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-charcoal">
                      Rental Cycle History — {historyTarget.partyName}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-light">
                      {historyTarget.plateType} • {historyTarget.quantity} Plates • Dispatched {formatMarathiDate(historyTarget.issueDate)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setHistoryTarget(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Cycles List */}
              <div className="p-6 space-y-4 overflow-y-auto flex-grow">
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                        <th className="px-4 py-3">Cycle #</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Dates (Start → End)</th>
                        <th className="px-4 py-3">Days</th>
                        <th className="px-4 py-3">Base Rent</th>
                        <th className="px-4 py-3">Extra Days Charge</th>
                        <th className="px-4 py-3">Total Rent</th>
                        <th className="px-4 py-3">Paid</th>
                        <th className="px-4 py-3">Pending</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cycles.map((cyc) => {
                        const isCycActive = cyc.status === 'active';
                        const liveData = isCycActive
                          ? calculateCycleFinances(
                              {
                                startDate: cyc.startDate,
                                quantity: cyc.quantity,
                                dailyRate: cyc.dailyRate,
                                baseRent: cyc.baseRent,
                                paidAmount: cyc.paidAmount,
                                items: historyTarget.items,
                              },
                              todayStr
                            )
                          : {
                              elapsedDays: cyc.days,
                              standardDays: Math.min(cyc.days, 40),
                              extraDays: cyc.extraDays,
                              extraAmount: cyc.extraAmount,
                              totalAmount: cyc.totalAmount,
                              pendingAmount: cyc.pendingAmount,
                            };

                        return (
                          <tr key={cyc.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-bold text-slate-800">
                              Cycle {cyc.cycleNumber}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  isCycActive
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {cyc.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-600">
                              {formatDateRange(cyc.startDate, cyc.actualEndDate || cyc.expectedEndDate)}
                            </td>
                            <td className="px-4 py-3 font-mono">
                              {liveData.elapsedDays}d ({liveData.standardDays} + {liveData.extraDays}ex)
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-700">
                              ₹{cyc.baseRent.toLocaleString('en-IN')}
                            </td>
                            <td className={`px-4 py-3 font-semibold ${liveData.extraAmount > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                              ₹{liveData.extraAmount.toLocaleString('en-IN')}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-800">
                              ₹{liveData.totalAmount.toLocaleString('en-IN')}
                            </td>
                            <td className="px-4 py-3 font-bold text-emerald-600">
                              ₹{cyc.paidAmount.toLocaleString('en-IN')}
                            </td>
                            <td className={`px-4 py-3 font-bold ${liveData.pendingAmount > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                              ₹{liveData.pendingAmount.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Overall Totals Summary Banner */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-bold">
                  <div className="text-slate-500">
                    Agreement Cumulative ({cycles.length} Cycles)
                  </div>
                  <div className="flex gap-6">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Total Cycle Rent</span>
                      <span className="text-slate-800 text-sm">₹{totalRentalAllCycles.toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Total Paid</span>
                      <span className="text-emerald-600 text-sm">₹{totalPaidAllCycles.toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Total Outstanding</span>
                      <span className="text-rose-600 text-sm">₹{totalPendingAllCycles.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setHistoryTarget(null)}
                  className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-xl text-sm transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* New Rental Dispatch Dialog */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-scaleUp text-left">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/60 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-orange-50 text-primary rounded-xl">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-charcoal">
                    {isMarathi ? 'साहित्य वाटप — नवीन भाडे नोंद (सायकल १)' : 'Dispatch Plates - New Rental Sheet (Cycle 1)'}
                  </h4>
                  <p className="text-[11px] text-slate-400 font-light">
                    {isMarathi ? 'सेन्टरिंग प्लेट्स द्या आणि ४० दिवसांचे भाडे चक्र निश्चित करा' : 'Issue centering plates and configure standard 40-day rental cycle'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-grow">
              {/* Validation alert */}
              {validationError && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Row 1: Party and Dispatch Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                    {isMarathi ? 'ग्राहक / पार्टी *' : 'Customer Party *'}
                  </label>
                  <select
                    value={selectedPartyId}
                    onChange={(e) => setSelectedPartyId(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary px-4 py-3 rounded-xl text-sm font-semibold text-slate-800"
                  >
                    <option value="">{isMarathi ? '-- पार्टी निवडा --' : '-- Choose Party --'}</option>
                    {parties.map((p, idx) => (
                      <option key={p.id} value={p.id}>
                        {isMarathi ? 'ग्राहक #' : 'Customer #'}{p.customerNumber || idx + 1} — {formatPartyName(p.name, isMarathi ? 'marathi' : 'english')} ({p.mobile})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                    {isMarathi ? 'वाटप दिनांक *' : 'Dispatch Issue Date *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary px-4 py-3 rounded-xl text-sm font-semibold text-slate-800"
                  />
                </div>
              </div>

              {/* Multi-Plate Rows Section */}
              <div className="space-y-3">
                <div className="hidden lg:grid grid-cols-12 gap-3 text-xs font-bold text-slate-600 uppercase tracking-wider px-1">
                  <div className="col-span-4">{isMarathi ? 'प्लेट साईझ *' : 'Shuttering Plate Size *'}</div>
                  <div className="col-span-3">{isMarathi ? 'वाटप संख्या *' : 'Dispatch Quantity *'}</div>
                  <div className="col-span-2">{isMarathi ? 'प्रतिदिन दर (₹) *' : 'Daily Rate (₹/day) *'}</div>
                  <div className="col-span-2">{isMarathi ? 'भाडे मुदत (दिवस) *' : 'Standard Term (Days) *'}</div>
                  <div className="col-span-1 text-center">{isMarathi ? 'क्रिया' : 'Action'}</div>
                </div>

                <div className="space-y-3">
                  {plateRows.map((row, index) => (
                    <div
                      key={row.id}
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center bg-slate-50/70 p-3 sm:p-3.5 rounded-2xl border border-slate-200/70"
                    >
                      {/* Plate Size */}
                      <div className="lg:col-span-4 space-y-1 sm:space-y-0">
                        <label className="lg:hidden text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                          {isMarathi ? 'प्लेट साईझ *' : 'Plate Size *'}
                        </label>
                        <select
                          value={row.plateType}
                          onChange={(e) => handleUpdatePlateRow(row.id, 'plateType', e.target.value)}
                          required
                          className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800"
                        >
                          <option value="">{isMarathi ? '-- साईझ निवडा --' : '-- Choose Width --'}</option>
                          {plates.map((p) => {
                            const isSelectedElsewhere = plateRows.some(
                              (r) => r.id !== row.id && r.plateType === p.plateType
                            );
                            return (
                              <option
                                key={p.plateType}
                                value={p.plateType}
                                disabled={isSelectedElsewhere}
                              >
                                {formatPlateType(p.plateType, isMarathi ? 'marathi' : 'english')} ({p.available} {isMarathi ? 'शिल्लक' : 'avail.'}){isSelectedElsewhere ? (isMarathi ? ' - आधीच जोडले' : ' - Already Added') : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="lg:col-span-3 space-y-1 sm:space-y-0">
                        <label className="lg:hidden text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                          {isMarathi ? 'वाटप संख्या *' : 'Dispatch Quantity *'}
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={row.quantity}
                          placeholder={isMarathi ? 'उदा. १००' : 'e.g. 100'}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleUpdatePlateRow(row.id, 'quantity', e.target.value)}
                          onBlur={() => {
                            const val = parseInt(String(row.quantity), 10);
                            if (!val || val < 1) {
                              handleUpdatePlateRow(row.id, 'quantity', 1);
                            } else {
                              handleUpdatePlateRow(row.id, 'quantity', val);
                            }
                          }}
                          className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800"
                        />
                      </div>

                      {/* Daily Rate */}
                      <div className="lg:col-span-2 space-y-1 sm:space-y-0">
                        <label className="lg:hidden text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                          {isMarathi ? 'प्रतिदिन दर (₹) *' : 'Daily Rate (₹/day) *'}
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          required
                          value={row.dailyRate}
                          placeholder="1.50"
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleUpdatePlateRow(row.id, 'dailyRate', e.target.value)}
                          onBlur={() => {
                            const strVal = String(row.dailyRate).trim();
                            if (strVal === '' || isNaN(parseFloat(strVal))) {
                              const defaultRate =
                                plates.find((p) => p.plateType === row.plateType)?.dailyRate || 1.5;
                              handleUpdatePlateRow(row.id, 'dailyRate', defaultRate);
                            } else {
                              handleUpdatePlateRow(row.id, 'dailyRate', Math.max(0, parseFloat(strVal)));
                            }
                          }}
                          className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800"
                        />
                      </div>

                      {/* Rental Term */}
                      <div className="lg:col-span-2 space-y-1 sm:space-y-0">
                        <label className="lg:hidden text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                          {isMarathi ? 'भाडे मुदत (दिवस) *' : 'Standard Term (Days) *'}
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="365"
                          required
                          value={row.days}
                          placeholder={isMarathi ? 'उदा. ४०' : 'e.g. 40'}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleUpdatePlateRow(row.id, 'days', e.target.value)}
                          onBlur={() => {
                            const val = parseInt(String(row.days), 10);
                            if (!val || val < 1) {
                              handleUpdatePlateRow(row.id, 'days', 1);
                            } else {
                              handleUpdatePlateRow(row.id, 'days', Math.min(365, val));
                            }
                          }}
                          className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800"
                        />
                      </div>

                      {/* Delete button */}
                      <div className="lg:col-span-1 flex items-center justify-center pt-1 sm:pt-0">
                        {index > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleRemovePlateRow(row.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            title={isMarathi ? 'ही प्लेट काढा' : 'Remove this plate'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <div className="hidden lg:block w-8" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* + Add Plate Button */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleAddPlateRow}
                    disabled={plateRows.length >= plates.length}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-primary bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ {isMarathi ? 'आणखी प्लेट जोडा' : 'Add Plate'}</span>
                  </button>
                </div>
              </div>

              {/* Total Rent & Financial Payment Summary Card */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-200/70">
                  <div className="space-y-1 text-left">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      {isMarathi ? `हिशोब केलेले ${plateRows[0]?.days ? `${plateRows[0].days} दिवसांचे ` : ''}भाडे` : `Calculated ${plateRows[0]?.days ? `${plateRows[0].days}-Day ` : ''}Base Rent`}
                    </span>
                    <div className="space-y-0.5 text-[11px] text-slate-500 font-mono">
                      {plateRows.map((r, idx) => {
                        const q = parseInt(String(r.quantity), 10) || 0;
                        const rate = parseFloat(String(r.dailyRate)) || 0;
                        const d = parseInt(String(r.days), 10) || 0;
                        return (
                          <div key={idx}>
                            {q} {isMarathi ? 'प्लेट्स' : 'plates'} ({formatPlateType(r.plateType, isMarathi ? 'marathi' : 'english')}) × ₹{rate.toFixed(2)}/{isMarathi ? 'दिवस' : 'day'} × {d} {isMarathi ? 'दिवस' : 'days'} = ₹{(q * rate * d).toLocaleString('en-IN')}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-charcoal">
                      ₹{calculatedTotalRent.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                      {isMarathi ? 'जमा रक्कम (₹) *' : 'Advance Amount Paid (₹) *'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={amountPaid}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleAmountPaidChange(e.target.value)}
                      onBlur={() => {
                        if (amountPaid.trim() === '') {
                          handleAmountPaidChange('0');
                        }
                      }}
                      className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-800"
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                      {isMarathi ? 'पेमेंट प्रकार *' : 'Dispatch Payment Mode *'}
                    </label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value as any)}
                      className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-800"
                    >
                      {numericPaid === 0 && (
                        <option value="Outstanding">{isMarathi ? 'बाकी' : 'Outstanding'}</option>
                      )}
                      <option value="Account 1">{accountNames.cleanAccount1}</option>
                      <option value="Account 2">{accountNames.cleanAccount2}</option>
                      <option value="Cash">{accountNames.cleanCash}</option>
                    </select>
                  </div>
                </div>

                {calculatedPending > 0 ? (
                  <div className="flex justify-between items-center pt-3 border-t border-slate-200 text-xs font-bold">
                    <span className="text-slate-500 uppercase tracking-wider">{isMarathi ? 'येणे बाकी:' : 'Outstanding Dues:'}</span>
                    <span className="text-base font-black text-rose-600">
                      ₹{calculatedPending.toLocaleString('en-IN')}
                    </span>
                  </div>
                ) : numericPaid > 0 ? (
                  <div className="flex justify-between items-center pt-3 border-t border-slate-200 text-xs font-bold">
                    <span className="text-emerald-700 uppercase tracking-wider">{isMarathi ? 'सर्व भाडे पूर्ण जमा:' : 'Full Payment Received:'}</span>
                    <span className="text-base font-black text-emerald-600">
                      {isMarathi ? 'काहीही बाकी नाही (₹०)' : 'No Dues (₹0)'}
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center pt-3 border-t border-slate-200 text-xs font-bold">
                    <span className="text-slate-500 uppercase tracking-wider">{isMarathi ? 'येणे बाकी:' : 'Outstanding Dues:'}</span>
                    <span className="text-base font-black text-rose-600">
                      ₹{calculatedPending.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-2 border-t border-slate-100 justify-end flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-all"
                >
                  {isMarathi ? 'रद्द करा' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl text-sm shadow-md hover:shadow-orange-500/20 transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isMarathi ? 'साहित्य वाटप पूर्ण करा' : 'Dispatch Material'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENTAL BILL / CHALLAN MODAL */}
      {billTarget && (
        <RentalBillModal
          rental={billTarget}
          activeCycle={getActiveCycleForRental(billTarget)}
          rentalCycles={getCyclesForRental(billTarget)}
          party={parties.find(
            (p) =>
              (billTarget.partyId && p.id === billTarget.partyId) ||
              p.name.trim().toLowerCase() === billTarget.partyName?.trim().toLowerCase()
          )}
          payments={payments.filter(
            (p) =>
              (p.rentalId && p.rentalId === billTarget.id) ||
              (p.partyId && p.partyId === billTarget.partyId)
          )}
          returns={returns?.filter(
            (r) =>
              (r.rentalId && r.rentalId === billTarget.id) ||
              (r.partyId && r.partyId === billTarget.partyId)
          ) || []}
          finances={getLiveCycleData(billTarget).finances}
          billNumber={billTarget.billNumber}
          customerNumber={getCustomerNumberForRental(billTarget)}
          autoShareWhatsApp={autoShareBillId === billTarget.id}
          onClose={() => {
            setBillTarget(null);
            setAutoShareBillId(null);
          }}
          onUpdateBillNumber={(rentalId, newBill) => {
            if (onUpdateBillNumber) {
              onUpdateBillNumber(rentalId, newBill);
            }
            setBillTarget((prev) => (prev ? { ...prev, billNumber: newBill } : null));
          }}
        />
      )}
    </div>
  );
};
