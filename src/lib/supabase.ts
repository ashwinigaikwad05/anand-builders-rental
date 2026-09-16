import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type PlateSizeType = '24×3' | '21×3' | '18×3' | '15×3' | '12×3' | '9×3' | '6×3';

export const STANDARD_PLATE_SIZES: PlateSizeType[] = [
  '24×3',
  '21×3',
  '18×3',
  '15×3',
  '12×3',
  '9×3',
  '6×3',
];

// ------------------------------------------------------------------------------
// DATABASE RECORD TYPES
// ------------------------------------------------------------------------------

export interface InventoryStockItem {
  id: string;
  plate_size: PlateSizeType;
  quantity: number;
  received_date: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PlateTypeRecord {
  id: string;
  plate_size: PlateSizeType;
  daily_rate: number;
  active: boolean;
  status: 'available' | 'low_stock' | 'out_of_stock';
  created_at?: string;
  updated_at?: string;
}

export interface PartyRecord {
  id: string;
  name: string;
  mobile: string;
  address?: string | null;
  notes?: string | null;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

export interface RentalItemRecord {
  plateType: string;
  quantity: number;
  dailyRate: number;
  days: number;
}

export interface RentalCycleRecord {
  id: string;
  rental_id: string;
  party_id: string;
  cycle_number: number;
  start_date: string;
  expected_end_date: string;
  actual_end_date?: string | null;
  days: number;
  extra_days: number;
  daily_rate: number;
  quantity: number;
  base_rent: number;
  extra_amount: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  status: 'active' | 'completed';
  notes?: string | null;
  items?: RentalItemRecord[];
  created_at?: string;
  updated_at?: string;
}

export interface RentalRecord {
  id: string;
  party_id: string;
  party_name: string;
  plate_type: string;
  quantity: number;
  daily_rate: number;
  issue_date: string;
  expected_return_date?: string | null;
  actual_return_date?: string | null;
  days: number;
  total_rent: number;
  paid_amount: number;
  pending_amount: number;
  payment_mode: 'Account 1' | 'Account 2' | 'Cash' | 'Udhari';
  payment_status: 'pending' | 'partial' | 'paid';
  status: 'active' | 'returned' | 'overdue';
  notes?: string | null;
  items?: RentalItemRecord[];
  current_cycle_number?: number;
  current_cycle_start_date?: string;
  current_cycle_end_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ReturnRecord {
  id: string;
  rental_id?: string | null;
  party_id: string;
  party_name: string;
  plate_type: string;
  issued_quantity: number;
  returned_quantity: number;
  remaining_quantity: number;
  return_date: string;
  notes?: string | null;
  created_at?: string;
}

export interface PaymentRecord {
  id: string;
  party_id: string;
  party_name: string;
  rental_id?: string | null;
  cycle_id?: string | null;
  cycle_number?: number | null;
  amount: number;
  payment_date: string;
  payment_mode: 'Account 1' | 'Account 2' | 'Cash' | 'Udhari';
  reference?: string | null;
  notes?: string | null;
  status: 'verified' | 'pending';
  created_at?: string;
}

export interface LedgerEntryRecord {
  id: string;
  party_id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  reference_type?: string | null;
  reference_id?: string | null;
  created_at?: string;
}

export interface NotificationRecord {
  id: string;
  party_id?: string | null;
  type: 'payment' | 'due' | 'return' | 'partial' | 'stock';
  title: string;
  message: string;
  date: string;
  is_read: boolean;
  created_at?: string;
}

// ------------------------------------------------------------------------------
// SUPABASE CLIENT CONFIGURATION
// ------------------------------------------------------------------------------

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const isPlaceholderKey = (key?: string) =>
  !key ||
  key === 'your-anon-public-key' ||
  key === 'your-publishable-key' ||
  key.startsWith('sb_anon_') ||
  key.includes('placeholder');

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  !isPlaceholderKey(supabaseAnonKey)
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

// Local fallback keys for graceful offline resilience
const STORAGE_PREFIX = 'anand_';
const getLocal = <T>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};
const setLocal = <T>(key: string, data: T[]) => {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
  } catch {}
};

// ------------------------------------------------------------------------------
// 1. PARTIES API
// ------------------------------------------------------------------------------

export async function fetchParties(): Promise<PartyRecord[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('parties')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Failed to fetch parties from Supabase:', error.message);
      return getLocal<PartyRecord>('parties');
    }
    if (data) {
      setLocal('parties', data);
      return data as PartyRecord[];
    }
  }
  return getLocal<PartyRecord>('parties');
}

export async function insertParty(party: {
  name: string;
  mobile: string;
  address?: string;
  notes?: string;
}): Promise<PartyRecord> {
  const newRecord: PartyRecord = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `party-${Date.now()}`,
    name: party.name.trim(),
    mobile: party.mobile.trim(),
    address: party.address?.trim() || null,
    notes: party.notes?.trim() || null,
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (supabase) {
    const { data, error } = await supabase
      .from('parties')
      .insert([
        {
          name: newRecord.name,
          mobile: newRecord.mobile,
          address: newRecord.address,
          notes: newRecord.notes,
          status: 'active',
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }
    if (data) {
      const local = getLocal<PartyRecord>('parties');
      setLocal('parties', [data as PartyRecord, ...local.filter((p) => p.id !== data.id)]);
      return data as PartyRecord;
    }
  }

  const local = getLocal<PartyRecord>('parties');
  setLocal('parties', [newRecord, ...local]);
  return newRecord;
}

export async function updateParty(
  id: string,
  updates: {
    name?: string;
    mobile?: string;
    address?: string | null;
    notes?: string | null;
    status?: 'active' | 'inactive';
  }
): Promise<PartyRecord> {
  if (supabase) {
    const { data, error } = await supabase
      .from('parties')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }
    if (data) {
      const local = getLocal<PartyRecord>('parties');
      setLocal('parties', local.map((p) => (p.id === id ? (data as PartyRecord) : p)));
      return data as PartyRecord;
    }
  }

  const local = getLocal<PartyRecord>('parties');
  const existing = local.find((p) => p.id === id);
  const updated = { ...existing, ...updates, id } as PartyRecord;
  setLocal('parties', local.map((p) => (p.id === id ? updated : p)));
  return updated;
}

export async function deleteParty(id: string): Promise<boolean> {
  if (supabase) {
    const { error } = await supabase.from('parties').delete().eq('id', id);
    if (error) {
      throw new Error(error.message);
    }
  }
  const local = getLocal<PartyRecord>('parties');
  setLocal('parties', local.filter((p) => p.id !== id));
  return true;
}

// ------------------------------------------------------------------------------
// 2. PLATE TYPES API
// ------------------------------------------------------------------------------

export async function fetchPlateTypes(): Promise<PlateTypeRecord[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('plate_types')
      .select('*')
      .order('plate_size', { ascending: false });

    if (!error && data && data.length > 0) {
      setLocal('plate_types', data);
      return data as PlateTypeRecord[];
    }
  }
  return getLocal<PlateTypeRecord>('plate_types');
}

export async function updatePlateTypeRate(plateSize: PlateSizeType, newRate: number): Promise<void> {
  if (supabase) {
    const { error } = await supabase
      .from('plate_types')
      .update({ daily_rate: newRate, updated_at: new Date().toISOString() })
      .eq('plate_size', plateSize);

    if (error) {
      throw new Error(error.message);
    }
  }
  const local = getLocal<PlateTypeRecord>('plate_types');
  setLocal(
    'plate_types',
    local.map((p) => (p.plate_size === plateSize ? { ...p, daily_rate: newRate } : p))
  );
}

export async function updatePlateTypeStatus(
  plateSize: PlateSizeType,
  status: 'available' | 'low_stock' | 'out_of_stock'
): Promise<void> {
  if (supabase) {
    const { error } = await supabase
      .from('plate_types')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('plate_size', plateSize);

    if (error) {
      throw new Error(error.message);
    }
  }
  const local = getLocal<PlateTypeRecord>('plate_types');
  setLocal(
    'plate_types',
    local.map((p) => (p.plate_size === plateSize ? { ...p, status } : p))
  );
}

// ------------------------------------------------------------------------------
// 3. INVENTORY STOCK API
// ------------------------------------------------------------------------------

export async function fetchStockItems(): Promise<InventoryStockItem[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('inventory_stock')
      .select('*')
      .order('received_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Failed to fetch inventory stock from Supabase:', error.message);
      return getLocal<InventoryStockItem>('inventory_stock');
    }
    if (data) {
      setLocal('inventory_stock', data);
      return data as InventoryStockItem[];
    }
  }
  return getLocal<InventoryStockItem>('inventory_stock');
}

export async function insertStockItem(item: {
  plate_size: PlateSizeType;
  quantity: number;
  received_date: string;
  notes?: string;
}): Promise<InventoryStockItem> {
  const newRecord: InventoryStockItem = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `stock-${Date.now()}`,
    plate_size: item.plate_size,
    quantity: Math.floor(Number(item.quantity)),
    received_date: item.received_date,
    notes: item.notes?.trim() || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (supabase) {
    const { data, error } = await supabase
      .from('inventory_stock')
      .insert([
        {
          plate_size: item.plate_size,
          quantity: Math.floor(Number(item.quantity)),
          received_date: item.received_date,
          notes: item.notes?.trim() || null,
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }
    if (data) {
      const local = getLocal<InventoryStockItem>('inventory_stock');
      setLocal('inventory_stock', [data as InventoryStockItem, ...local.filter((i) => i.id !== data.id)]);
      return data as InventoryStockItem;
    }
  }

  const local = getLocal<InventoryStockItem>('inventory_stock');
  setLocal('inventory_stock', [newRecord, ...local]);
  return newRecord;
}

export async function updateStockItem(
  id: string,
  updates: {
    plate_size: PlateSizeType;
    quantity: number;
    received_date: string;
    notes?: string;
  }
): Promise<InventoryStockItem> {
  const cleanUpdates = {
    plate_size: updates.plate_size,
    quantity: Math.floor(Number(updates.quantity)),
    received_date: updates.received_date,
    notes: updates.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  if (supabase) {
    const { data, error } = await supabase
      .from('inventory_stock')
      .update(cleanUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }
    if (data) {
      const local = getLocal<InventoryStockItem>('inventory_stock');
      setLocal('inventory_stock', local.map((i) => (i.id === id ? (data as InventoryStockItem) : i)));
      return data as InventoryStockItem;
    }
  }

  const local = getLocal<InventoryStockItem>('inventory_stock');
  const updated = { ...local.find((i) => i.id === id), ...cleanUpdates, id } as InventoryStockItem;
  setLocal('inventory_stock', local.map((i) => (i.id === id ? updated : i)));
  return updated;
}

export async function deleteStockItem(id: string): Promise<boolean> {
  if (supabase) {
    const { error } = await supabase.from('inventory_stock').delete().eq('id', id);
    if (error) {
      throw new Error(error.message);
    }
  }
  const local = getLocal<InventoryStockItem>('inventory_stock');
  setLocal('inventory_stock', local.filter((i) => i.id !== id));
  return true;
}

// ------------------------------------------------------------------------------
// CALENDAR DURATION & 40-DAY CYCLE CALCULATION HELPERS
// ------------------------------------------------------------------------------

/**
 * Add calendar days to a YYYY-MM-DD date string safely.
 */
export function addDaysToDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Calculate actual calendar duration between two dates (inclusive of start date).
 * Example: 2026-08-01 to 2026-08-01 = 1 day.
 * 2026-08-01 to 2026-09-09 = 40 days.
 */
export function calculateCalendarDays(startDateStr: string, endDateStr: string): number {
  if (!startDateStr || !endDateStr) return 0;
  const [sy, sm, sd] = startDateStr.split('-').map(Number);
  const [ey, em, ed] = endDateStr.split('-').map(Number);
  const startUtc = Date.UTC(sy, sm - 1, sd);
  const endUtc = Date.UTC(ey, em - 1, ed);
  const diffMs = endUtc - startUtc;
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Given cycle start date (Day 1) and standard cycle length (40 days),
 * returns the 40th calendar day.
 * Example: Start = 2026-08-01 -> 40th day = 2026-09-09.
 */
export function calculateExpectedCycleEndDate(startDateStr: string, cycleDays = 40): string {
  return addDaysToDate(startDateStr, cycleDays - 1);
}

/**
 * Calculates extra days and finances for a 40-day rental cycle up to an evaluation date.
 * If actual elapsed days <= 40: extraDays = 0, extraAmount = 0.
 * If actual elapsed days > 40: extraDays = elapsed - 40, extraAmount = quantity * dailyRate * extraDays.
 */
export function calculateCycleFinances(
  cycle: {
    startDate: string;
    actualEndDate?: string | null;
    quantity: number;
    dailyRate: number;
    baseRent: number;
    paidAmount: number;
    items?: Array<{ quantity: number; dailyRate: number; plateType?: string }>;
  },
  asOfDateStr = new Date().toISOString().split('T')[0]
) {
  const effectiveEndDate = cycle.actualEndDate || asOfDateStr;
  const elapsedDays = calculateCalendarDays(cycle.startDate, effectiveEndDate);
  const standardDays = Math.min(elapsedDays, 40);
  const extraDays = Math.max(0, elapsedDays - 40);

  let extraAmount = 0;
  if (extraDays > 0) {
    if (cycle.items && cycle.items.length > 0) {
      extraAmount = cycle.items.reduce(
        (sum, it) => sum + it.quantity * it.dailyRate * extraDays,
        0
      );
    } else {
      extraAmount = cycle.quantity * cycle.dailyRate * extraDays;
    }
  }

  const totalAmount = cycle.baseRent + extraAmount;
  const pendingAmount = Math.max(0, totalAmount - cycle.paidAmount);

  return {
    elapsedDays,
    standardDays,
    extraDays,
    extraAmount,
    totalAmount,
    pendingAmount,
  };
}

/**
 * Renewal Date Rules:
 * A) If renewal is confirmed BEFORE the current 40-day cycle ends:
 *    New Cycle Start Date = Current Cycle Expected End Date + 1 day.
 * B) If renewal is confirmed ON the cycle end date:
 *    New Cycle Start Date = Next Day.
 * C) If renewal is confirmed AFTER the 40-day cycle has ended:
 *    First finalize previous cycle using the actual renewal confirmation date (calculate extra days).
 *    Then start the new 40-day cycle from the renewal confirmation date.
 */
export function determineRenewalStartDate(
  currentExpectedEndDateStr: string,
  confirmationDateStr = new Date().toISOString().split('T')[0]
): {
  newStartDate: string;
  isOverdueRenewal: boolean;
} {
  if (confirmationDateStr > currentExpectedEndDateStr) {
    return {
      newStartDate: confirmationDateStr,
      isOverdueRenewal: true,
    };
  } else {
    return {
      newStartDate: addDaysToDate(currentExpectedEndDateStr, 1),
      isOverdueRenewal: false,
    };
  }
}

// ------------------------------------------------------------------------------
// 4. RENTALS & RENTAL CYCLES API
// ------------------------------------------------------------------------------

export async function fetchRentalCycles(): Promise<RentalCycleRecord[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('rental_cycles')
      .select('*')
      .order('start_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Failed to fetch rental cycles from Supabase:', error.message);
      return getLocal<RentalCycleRecord>('rental_cycles');
    }
    if (data) {
      setLocal('rental_cycles', data);
      return data as RentalCycleRecord[];
    }
  }
  return getLocal<RentalCycleRecord>('rental_cycles');
}

export async function insertRentalCycle(cycle: {
  rental_id: string;
  party_id: string;
  cycle_number: number;
  start_date: string;
  expected_end_date: string;
  actual_end_date?: string | null;
  days?: number;
  extra_days?: number;
  daily_rate: number;
  quantity: number;
  base_rent: number;
  extra_amount?: number;
  total_amount: number;
  paid_amount?: number;
  pending_amount: number;
  status?: 'active' | 'completed';
  notes?: string | null;
  items?: RentalItemRecord[];
}): Promise<RentalCycleRecord> {
  const newRecord: RentalCycleRecord = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cyc-${Date.now()}-${Math.random().toString().slice(2, 6)}`,
    rental_id: cycle.rental_id,
    party_id: cycle.party_id,
    cycle_number: cycle.cycle_number,
    start_date: cycle.start_date,
    expected_end_date: cycle.expected_end_date,
    actual_end_date: cycle.actual_end_date || null,
    days: cycle.days || 40,
    extra_days: cycle.extra_days || 0,
    daily_rate: Number(cycle.daily_rate),
    quantity: Math.floor(Number(cycle.quantity)),
    base_rent: Number(cycle.base_rent),
    extra_amount: Number(cycle.extra_amount || 0),
    total_amount: Number(cycle.total_amount),
    paid_amount: Number(cycle.paid_amount || 0),
    pending_amount: Number(cycle.pending_amount),
    status: cycle.status || 'active',
    notes: cycle.notes?.trim() || null,
    items: cycle.items || [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (supabase) {
    const { data, error } = await supabase
      .from('rental_cycles')
      .insert([
        {
          rental_id: newRecord.rental_id,
          party_id: newRecord.party_id,
          cycle_number: newRecord.cycle_number,
          start_date: newRecord.start_date,
          expected_end_date: newRecord.expected_end_date,
          actual_end_date: newRecord.actual_end_date,
          days: newRecord.days,
          extra_days: newRecord.extra_days,
          daily_rate: newRecord.daily_rate,
          quantity: newRecord.quantity,
          base_rent: newRecord.base_rent,
          extra_amount: newRecord.extra_amount,
          total_amount: newRecord.total_amount,
          paid_amount: newRecord.paid_amount,
          pending_amount: newRecord.pending_amount,
          status: newRecord.status,
          notes: newRecord.notes,
          items: newRecord.items,
        },
      ])
      .select()
      .single();

    if (error) {
      console.warn('insertRentalCycle Supabase error:', error.message);
    } else if (data) {
      const local = getLocal<RentalCycleRecord>('rental_cycles');
      setLocal('rental_cycles', [data as RentalCycleRecord, ...local.filter((c) => c.id !== data.id)]);
      return data as RentalCycleRecord;
    }
  }

  const local = getLocal<RentalCycleRecord>('rental_cycles');
  setLocal('rental_cycles', [newRecord, ...local]);
  return newRecord;
}

export async function updateRentalCycle(
  id: string,
  updates: Partial<RentalCycleRecord>
): Promise<RentalCycleRecord> {
  const cleanUpdates = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  if (supabase) {
    const { data, error } = await supabase
      .from('rental_cycles')
      .update(cleanUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.warn('updateRentalCycle Supabase error:', error.message);
    } else if (data) {
      const local = getLocal<RentalCycleRecord>('rental_cycles');
      setLocal('rental_cycles', local.map((c) => (c.id === id ? (data as RentalCycleRecord) : c)));
      return data as RentalCycleRecord;
    }
  }

  const local = getLocal<RentalCycleRecord>('rental_cycles');
  const existing = local.find((c) => c.id === id);
  const updated = { ...existing, ...cleanUpdates, id } as RentalCycleRecord;
  setLocal('rental_cycles', local.map((c) => (c.id === id ? updated : c)));
  return updated;
}

export async function fetchRentals(): Promise<RentalRecord[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('rentals')
      .select('*')
      .order('issue_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Failed to fetch rentals from Supabase:', error.message);
      return getLocal<RentalRecord>('rentals');
    }
    if (data) {
      setLocal('rentals', data);
      return data as RentalRecord[];
    }
  }
  return getLocal<RentalRecord>('rentals');
}

export async function insertRental(rental: {
  party_id: string;
  party_name: string;
  plate_type: string;
  quantity: number;
  daily_rate: number;
  issue_date: string;
  days: number;
  total_rent: number;
  paid_amount: number;
  pending_amount: number;
  payment_mode: 'Account 1' | 'Account 2' | 'Cash' | 'Udhari';
  status?: 'active' | 'returned' | 'overdue';
  notes?: string;
  items?: RentalItemRecord[];
}): Promise<RentalRecord> {
  const expectedEndDate = calculateExpectedCycleEndDate(rental.issue_date, rental.days || 40);

  const newRecord: RentalRecord = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `rent-${Date.now()}`,
    party_id: rental.party_id,
    party_name: rental.party_name,
    plate_type: rental.plate_type,
    quantity: Math.floor(Number(rental.quantity)),
    daily_rate: Number(rental.daily_rate),
    issue_date: rental.issue_date,
    expected_return_date: expectedEndDate,
    days: Math.floor(Number(rental.days)),
    total_rent: Number(rental.total_rent),
    paid_amount: Number(rental.paid_amount),
    pending_amount: Number(rental.pending_amount),
    payment_mode: rental.payment_mode,
    payment_status: rental.paid_amount >= rental.total_rent ? 'paid' : rental.paid_amount > 0 ? 'partial' : 'pending',
    status: rental.status || 'active',
    notes: rental.notes?.trim() || null,
    items: rental.items || [],
    current_cycle_number: 1,
    current_cycle_start_date: rental.issue_date,
    current_cycle_end_date: expectedEndDate,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (supabase) {
    const { data, error } = await supabase
      .from('rentals')
      .insert([
        {
          party_id: newRecord.party_id,
          party_name: newRecord.party_name,
          plate_type: newRecord.plate_type,
          quantity: newRecord.quantity,
          daily_rate: newRecord.daily_rate,
          issue_date: newRecord.issue_date,
          expected_return_date: newRecord.expected_return_date,
          days: newRecord.days,
          total_rent: newRecord.total_rent,
          paid_amount: newRecord.paid_amount,
          pending_amount: newRecord.pending_amount,
          payment_mode: newRecord.payment_mode,
          payment_status: newRecord.payment_status,
          status: newRecord.status,
          notes: newRecord.notes,
          items: newRecord.items,
          current_cycle_number: 1,
          current_cycle_start_date: newRecord.issue_date,
          current_cycle_end_date: expectedEndDate,
        },
      ])
      .select()
      .single();

    if (error) {
      console.warn('insertRental Supabase insert error:', error.message);
      throw new Error(error.message);
    } else if (data) {
      const local = getLocal<RentalRecord>('rentals');
      setLocal('rentals', [data as RentalRecord, ...local.filter((r) => r.id !== data.id)]);

      // Create Cycle 1 record in rental_cycles
      await insertRentalCycle({
        rental_id: data.id,
        party_id: data.party_id,
        cycle_number: 1,
        start_date: data.issue_date,
        expected_end_date: expectedEndDate,
        days: data.days || 40,
        extra_days: 0,
        daily_rate: data.daily_rate,
        quantity: data.quantity,
        base_rent: data.total_rent,
        extra_amount: 0,
        total_amount: data.total_rent,
        paid_amount: data.paid_amount,
        pending_amount: data.pending_amount,
        status: 'active',
        items: data.items,
      });

      return data as RentalRecord;
    }
  }

  const local = getLocal<RentalRecord>('rentals');
  setLocal('rentals', [newRecord, ...local]);

  // Fallback local Cycle 1 record
  await insertRentalCycle({
    rental_id: newRecord.id,
    party_id: newRecord.party_id,
    cycle_number: 1,
    start_date: newRecord.issue_date,
    expected_end_date: expectedEndDate,
    days: newRecord.days || 40,
    extra_days: 0,
    daily_rate: newRecord.daily_rate,
    quantity: newRecord.quantity,
    base_rent: newRecord.total_rent,
    extra_amount: 0,
    total_amount: newRecord.total_rent,
    paid_amount: newRecord.paid_amount,
    pending_amount: newRecord.pending_amount,
    status: 'active',
  });

  return newRecord;
}

export async function updateRentalStatus(
  id: string,
  status: 'active' | 'returned' | 'overdue'
): Promise<void> {
  if (supabase) {
    const { error } = await supabase
      .from('rentals')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.warn('updateRentalStatus error:', error.message);
    }
  }
  const local = getLocal<RentalRecord>('rentals');
  setLocal('rentals', local.map((r) => (r.id === id ? { ...r, status } : r)));
}

export async function updateRentalOnReturn(
  id: string,
  totalRent: number,
  returnDate: string
): Promise<void> {
  const cleanUpdates = {
    status: 'returned' as const,
    total_rent: totalRent,
    paid_amount: totalRent,
    pending_amount: 0,
    actual_return_date: returnDate,
    updated_at: new Date().toISOString(),
  };

  if (supabase) {
    const { error } = await supabase
      .from('rentals')
      .update(cleanUpdates)
      .eq('id', id);

    if (error) {
      console.warn('updateRentalOnReturn error:', error.message);
    }
  }
  const local = getLocal<RentalRecord>('rentals');
  setLocal('rentals', local.map((r) => (r.id === id ? { ...r, ...cleanUpdates } : r)));
}

export async function updateRentalCyclePointer(
  rentalId: string,
  cycleNumber: number,
  cycleStartDate: string,
  cycleEndDate: string
): Promise<void> {
  if (supabase) {
    const { error } = await supabase
      .from('rentals')
      .update({
        current_cycle_number: cycleNumber,
        current_cycle_start_date: cycleStartDate,
        current_cycle_end_date: cycleEndDate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', rentalId);

    if (error) {
      console.warn('updateRentalCyclePointer error:', error.message);
    }
  }
  const local = getLocal<RentalRecord>('rentals');
  setLocal(
    'rentals',
    local.map((r) =>
      r.id === rentalId
        ? {
            ...r,
            current_cycle_number: cycleNumber,
            current_cycle_start_date: cycleStartDate,
            current_cycle_end_date: cycleEndDate,
          }
        : r
    )
  );
}

export async function updateRentalCyclePointerAndItems(
  rentalId: string,
  cycleNumber: number,
  cycleStartDate: string,
  cycleEndDate: string,
  plateType: string,
  quantity: number,
  dailyRate: number,
  items: RentalItemRecord[]
): Promise<void> {
  if (supabase) {
    const { error } = await supabase
      .from('rentals')
      .update({
        current_cycle_number: cycleNumber,
        current_cycle_start_date: cycleStartDate,
        current_cycle_end_date: cycleEndDate,
        plate_type: plateType,
        quantity: quantity,
        daily_rate: dailyRate,
        items: items,
        updated_at: new Date().toISOString(),
      })
      .eq('id', rentalId);

    if (error) {
      console.warn('updateRentalCyclePointerAndItems error:', error.message);
    }
  }
  const local = getLocal<RentalRecord>('rentals');
  setLocal(
    'rentals',
    local.map((r) =>
      r.id === rentalId
        ? {
            ...r,
            current_cycle_number: cycleNumber,
            current_cycle_start_date: cycleStartDate,
            current_cycle_end_date: cycleEndDate,
            plateType: plateType,
            quantity: quantity,
            dailyRate: dailyRate,
            items: items,
          }
        : r
    )
  );
}

// ------------------------------------------------------------------------------
// 5. RETURNS API
// ------------------------------------------------------------------------------

export async function fetchReturns(): Promise<ReturnRecord[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('returns')
      .select('*')
      .order('return_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Failed to fetch returns from Supabase:', error.message);
      return getLocal<ReturnRecord>('returns');
    }
    if (data) {
      setLocal('returns', data);
      return data as ReturnRecord[];
    }
  }
  return getLocal<ReturnRecord>('returns');
}

export async function insertReturn(returnLog: {
  party_id: string;
  party_name: string;
  rental_id?: string;
  plate_type: string;
  issued_quantity: number;
  returned_quantity: number;
  remaining_quantity: number;
  return_date: string;
  notes?: string;
}): Promise<ReturnRecord> {
  const newRecord: ReturnRecord = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ret-${Date.now()}`,
    party_id: returnLog.party_id,
    party_name: returnLog.party_name,
    rental_id: returnLog.rental_id || null,
    plate_type: returnLog.plate_type,
    issued_quantity: Math.floor(Number(returnLog.issued_quantity)),
    returned_quantity: Math.floor(Number(returnLog.returned_quantity)),
    remaining_quantity: Math.floor(Number(returnLog.remaining_quantity)),
    return_date: returnLog.return_date,
    notes: returnLog.notes?.trim() || null,
    created_at: new Date().toISOString(),
  };

  if (supabase) {
    const { data, error } = await supabase
      .from('returns')
      .insert([
        {
          party_id: newRecord.party_id,
          party_name: newRecord.party_name,
          rental_id: newRecord.rental_id,
          plate_type: newRecord.plate_type,
          issued_quantity: newRecord.issued_quantity,
          returned_quantity: newRecord.returned_quantity,
          remaining_quantity: newRecord.remaining_quantity,
          return_date: newRecord.return_date,
          notes: newRecord.notes,
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }
    if (data) {
      const local = getLocal<ReturnRecord>('returns');
      setLocal('returns', [data as ReturnRecord, ...local.filter((r) => r.id !== data.id)]);
      return data as ReturnRecord;
    }
  }

  const local = getLocal<ReturnRecord>('returns');
  setLocal('returns', [newRecord, ...local]);
  return newRecord;
}

// ------------------------------------------------------------------------------
// 6. PAYMENTS API
// ------------------------------------------------------------------------------

export async function fetchPayments(): Promise<PaymentRecord[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('payment_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Failed to fetch payments from Supabase:', error.message);
      return getLocal<PaymentRecord>('payments');
    }
    if (data) {
      setLocal('payments', data);
      return data as PaymentRecord[];
    }
  }
  return getLocal<PaymentRecord>('payments');
}

export async function insertPayment(payment: {
  party_id: string;
  party_name: string;
  rental_id?: string;
  cycle_id?: string;
  cycle_number?: number;
  amount: number;
  payment_date: string;
  payment_mode: 'Account 1' | 'Account 2' | 'Cash' | 'Udhari';
  reference?: string;
  notes?: string;
  status?: 'verified' | 'pending';
}): Promise<PaymentRecord> {
  const newRecord: PaymentRecord = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `pay-${Date.now()}`,
    party_id: payment.party_id,
    party_name: payment.party_name,
    rental_id: payment.rental_id || null,
    cycle_id: payment.cycle_id || null,
    cycle_number: payment.cycle_number || null,
    amount: Number(payment.amount),
    payment_date: payment.payment_date,
    payment_mode: payment.payment_mode,
    reference: payment.reference?.trim() || `PAY-${Date.now().toString().slice(-4)}`,
    notes: payment.notes?.trim() || null,
    status: payment.status || 'verified',
    created_at: new Date().toISOString(),
  };

  if (supabase) {
    const { data, error } = await supabase
      .from('payments')
      .insert([
        {
          party_id: newRecord.party_id,
          party_name: newRecord.party_name,
          rental_id: newRecord.rental_id,
          amount: newRecord.amount,
          payment_date: newRecord.payment_date,
          payment_mode: newRecord.payment_mode,
          reference: newRecord.reference,
          notes: newRecord.notes,
          status: newRecord.status,
        },
      ])
      .select()
      .single();

    if (error) {
      console.warn('insertPayment Supabase error:', error.message);
    } else if (data) {
      const local = getLocal<PaymentRecord>('payments');
      setLocal('payments', [data as PaymentRecord, ...local.filter((p) => p.id !== data.id)]);
      return data as PaymentRecord;
    }
  }

  const local = getLocal<PaymentRecord>('payments');
  setLocal('payments', [newRecord, ...local]);
  return newRecord;
}

// ------------------------------------------------------------------------------
// 7. LEDGER ENTRIES API
// ------------------------------------------------------------------------------

export async function fetchLedgerEntries(): Promise<LedgerEntryRecord[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('ledger_entries')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Failed to fetch ledger entries from Supabase:', error.message);
      return getLocal<LedgerEntryRecord>('ledger_entries');
    }
    if (data) {
      setLocal('ledger_entries', data);
      return data as LedgerEntryRecord[];
    }
  }
  return getLocal<LedgerEntryRecord>('ledger_entries');
}

export async function insertLedgerEntry(entry: {
  party_id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  reference_type?: string;
  reference_id?: string;
}): Promise<LedgerEntryRecord> {
  const newRecord: LedgerEntryRecord = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `led-${Date.now()}`,
    party_id: entry.party_id,
    date: entry.date,
    description: entry.description,
    debit: Number(entry.debit),
    credit: Number(entry.credit),
    balance: Number(entry.balance),
    reference_type: entry.reference_type || null,
    reference_id: entry.reference_id || null,
    created_at: new Date().toISOString(),
  };

  if (supabase) {
    const { data, error } = await supabase
      .from('ledger_entries')
      .insert([
        {
          party_id: newRecord.party_id,
          date: newRecord.date,
          description: newRecord.description,
          debit: newRecord.debit,
          credit: newRecord.credit,
          balance: newRecord.balance,
          reference_type: newRecord.reference_type,
          reference_id: newRecord.reference_id,
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }
    if (data) {
      const local = getLocal<LedgerEntryRecord>('ledger_entries');
      setLocal('ledger_entries', [data as LedgerEntryRecord, ...local.filter((l) => l.id !== data.id)]);
      return data as LedgerEntryRecord;
    }
  }

  const local = getLocal<LedgerEntryRecord>('ledger_entries');
  setLocal('ledger_entries', [newRecord, ...local]);
  return newRecord;
}

// ------------------------------------------------------------------------------
// 8. NOTIFICATIONS API
// ------------------------------------------------------------------------------

export async function fetchNotifications(): Promise<NotificationRecord[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Failed to fetch notifications from Supabase:', error.message);
      return getLocal<NotificationRecord>('notifications');
    }
    if (data) {
      setLocal('notifications', data);
      return data as NotificationRecord[];
    }
  }
  return getLocal<NotificationRecord>('notifications');
}

export async function insertNotification(notification: {
  party_id?: string;
  type: 'payment' | 'due' | 'return' | 'partial' | 'stock';
  title: string;
  message: string;
  date?: string;
}): Promise<NotificationRecord> {
  const newRecord: NotificationRecord = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `not-${Date.now()}`,
    party_id: notification.party_id || null,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    date: notification.date || new Date().toISOString().split('T')[0],
    is_read: false,
    created_at: new Date().toISOString(),
  };

  if (supabase) {
    const { data, error } = await supabase
      .from('notifications')
      .insert([
        {
          party_id: newRecord.party_id,
          type: newRecord.type,
          title: newRecord.title,
          message: newRecord.message,
          date: newRecord.date,
          is_read: false,
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }
    if (data) {
      const local = getLocal<NotificationRecord>('notifications');
      setLocal('notifications', [data as NotificationRecord, ...local.filter((n) => n.id !== data.id)]);
      return data as NotificationRecord;
    }
  }

  const local = getLocal<NotificationRecord>('notifications');
  setLocal('notifications', [newRecord, ...local]);
  return newRecord;
}

export async function markNotificationRead(id: string): Promise<void> {
  if (supabase) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  }
  const local = getLocal<NotificationRecord>('notifications');
  setLocal('notifications', local.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
}

export async function markAllNotificationsRead(): Promise<void> {
  if (supabase) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('is_read', false);

    if (error) {
      throw new Error(error.message);
    }
  }
  const local = getLocal<NotificationRecord>('notifications');
  setLocal('notifications', local.map((n) => ({ ...n, is_read: true })));
}

export async function deleteNotification(id: string): Promise<boolean> {
  if (supabase) {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) {
      throw new Error(error.message);
    }
  }
  const local = getLocal<NotificationRecord>('notifications');
  setLocal('notifications', local.filter((n) => n.id !== id));
  return true;
}
