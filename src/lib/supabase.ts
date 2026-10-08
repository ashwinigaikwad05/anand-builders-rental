import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type PlateSizeType =
  | '24×3'
  | '21×3'
  | '18×3'
  | '15×3'
  | '12×3'
  | '9×3'
  | '6×3'
  | (string & {});

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
  photo_url?: string | null;
  aadhaar_url?: string | null;
  aadhaar_back_url?: string | null;
  cheque_url?: string | null;
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
  payment_mode: 'Account 1' | 'Account 2' | 'Cash' | 'Outstanding' | 'Udhari';
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
  collected_amount?: number | null;
  refund_amount?: number | null;
  payment_mode?: string | null;
  penalty_amount?: number | null;
  days_kept?: number | null;
  batch_rent?: number | null;
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
  payment_mode: 'Account 1' | 'Account 2' | 'Cash' | 'Outstanding' | 'Udhari';
  reference?: string | null;
  notes?: string | null;
  status: 'verified' | 'pending';
  type?: 'payment' | 'refund';
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
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_PREFIX + key) : null;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};
const setLocal = <T>(key: string, data: T[]) => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
    }
  } catch {}
};

// ------------------------------------------------------------------------------
// 1. PARTIES API
// ------------------------------------------------------------------------------

export async function fetchParties(): Promise<PartyRecord[]> {
  if (supabase) {
    try {
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
    } catch (err: any) {
      console.warn('Network error in fetchParties, using local:', err?.message || err);
      return getLocal<PartyRecord>('parties');
    }
  }
  return getLocal<PartyRecord>('parties');
}

export async function insertParty(party: {
  name: string;
  mobile: string;
  address?: string;
  notes?: string;
  photo_url?: string | null;
  aadhaar_url?: string | null;
  aadhaar_back_url?: string | null;
  cheque_url?: string | null;
}): Promise<PartyRecord> {
  const newRecord: PartyRecord = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `party-${Date.now()}`,
    name: party.name.trim(),
    mobile: party.mobile.trim(),
    address: party.address?.trim() || null,
    notes: party.notes?.trim() || null,
    status: 'active',
    photo_url: party.photo_url || null,
    aadhaar_url: party.aadhaar_url || null,
    aadhaar_back_url: party.aadhaar_back_url || null,
    cheque_url: party.cheque_url || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (supabase) {
    const insertPayload: any = {
      name: newRecord.name,
      mobile: newRecord.mobile,
      address: newRecord.address,
      notes: newRecord.notes,
      status: 'active',
      photo_url: newRecord.photo_url,
      aadhaar_url: newRecord.aadhaar_url,
      aadhaar_back_url: newRecord.aadhaar_back_url,
      cheque_url: newRecord.cheque_url,
    };

    try {
      const { data, error } = await supabase
        .from('parties')
        .insert([insertPayload])
        .select()
        .single();

      if (error) {
        if (error.message.includes('aadhaar_back_url')) {
          // Schema fallback if column not created yet in remote DB
          delete insertPayload.aadhaar_back_url;
          const { data: retryData, error: retryErr } = await supabase
            .from('parties')
            .insert([insertPayload])
            .select()
            .single();
          if (retryErr) throw new Error(retryErr.message);
          if (retryData) {
            const local = getLocal<PartyRecord>('parties');
            setLocal('parties', [{ ...retryData, aadhaar_back_url: newRecord.aadhaar_back_url } as PartyRecord, ...local.filter((p) => p.id !== retryData.id)]);
            return { ...retryData, aadhaar_back_url: newRecord.aadhaar_back_url } as PartyRecord;
          }
        } else {
          throw new Error(error.message);
        }
      }

      if (data) {
        const local = getLocal<PartyRecord>('parties');
        setLocal('parties', [data as PartyRecord, ...local.filter((p) => p.id !== data.id)]);
        return data as PartyRecord;
      }
    } catch (err: any) {
      console.warn('Network or schema fallback for insertParty:', err?.message || err);
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
    photo_url?: string | null;
    aadhaar_url?: string | null;
    aadhaar_back_url?: string | null;
    cheque_url?: string | null;
  }
): Promise<PartyRecord> {
  if (supabase) {
    const updatePayload: any = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    try {
      const { data, error } = await supabase
        .from('parties')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error && error.message.includes('aadhaar_back_url')) {
        delete updatePayload.aadhaar_back_url;
        const { data: retryData, error: retryErr } = await supabase
          .from('parties')
          .update(updatePayload)
          .eq('id', id)
          .select()
          .single();
        if (!retryErr && retryData) {
          const local = getLocal<PartyRecord>('parties');
          const merged = { ...retryData, aadhaar_back_url: updates.aadhaar_back_url } as PartyRecord;
          setLocal('parties', local.map((p) => (p.id === id ? merged : p)));
          return merged;
        }
      } else if (error) {
        throw new Error(error.message);
      }

      if (data) {
        const local = getLocal<PartyRecord>('parties');
        setLocal('parties', local.map((p) => (p.id === id ? (data as PartyRecord) : p)));
        return data as PartyRecord;
      }
    } catch (err: any) {
      console.warn('Network or schema fallback for updateParty:', err?.message || err);
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
    try {
      const { data, error } = await supabase
        .from('plate_types')
        .select('*')
        .order('plate_size', { ascending: false });

      if (!error && data && data.length > 0) {
        setLocal('plate_types', data);
        return data as PlateTypeRecord[];
      }
    } catch (err: any) {
      console.warn('Network error in fetchPlateTypes, using local:', err?.message || err);
      return getLocal<PlateTypeRecord>('plate_types');
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

export async function insertPlateType(
  plateSize: string,
  dailyRate: number = 1.5,
  status: 'available' | 'low_stock' | 'out_of_stock' = 'available'
): Promise<PlateTypeRecord> {
  const newRecord: PlateTypeRecord = {
    id: `pt-${Date.now()}-${Math.random().toString().slice(2, 6)}`,
    plate_size: plateSize as PlateSizeType,
    daily_rate: Number(dailyRate) || 1.5,
    active: status !== 'out_of_stock',
    status,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('plate_types')
        .insert([
          {
            plate_size: plateSize,
            daily_rate: newRecord.daily_rate,
            active: newRecord.active,
            status: newRecord.status,
          },
        ])
        .select()
        .single();

      if (!error && data) {
        newRecord.id = data.id;
      }
    } catch (err) {
      console.warn('Supabase insertPlateType fallback to local:', err);
    }
  }

  const local = getLocal<PlateTypeRecord>('plate_types');
  const filtered = local.filter((p) => p.plate_size !== plateSize);
  setLocal('plate_types', [...filtered, newRecord]);

  // Persist custom plate size into localStorage
  const custom = getCustomPlateSizes();
  if (!custom.includes(plateSize) && !STANDARD_PLATE_SIZES.includes(plateSize as any)) {
    saveCustomPlateSizes([...custom, plateSize]);
  }

  return newRecord;
}

export async function deletePlateType(plateSize: string): Promise<void> {
  if (supabase) {
    try {
      await supabase.from('plate_types').delete().eq('plate_size', plateSize);
    } catch (err) {
      console.warn('Supabase deletePlateType error:', err);
    }
  }
  const local = getLocal<PlateTypeRecord>('plate_types');
  setLocal('plate_types', local.filter((p) => p.plate_size !== plateSize));

  const custom = getCustomPlateSizes();
  saveCustomPlateSizes(custom.filter((s) => s !== plateSize));
}

export const CUSTOM_PLATE_SIZES_KEY = 'anand_custom_plate_sizes';

export function getCustomPlateSizes(): string[] {
  try {
    const raw = localStorage.getItem(CUSTOM_PLATE_SIZES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomPlateSizes(sizes: string[]): void {
  try {
    localStorage.setItem(CUSTOM_PLATE_SIZES_KEY, JSON.stringify(sizes));
  } catch (err) {
    console.error('Failed to save custom plate sizes:', err);
  }
}

// ------------------------------------------------------------------------------
// 3. INVENTORY STOCK API
// ------------------------------------------------------------------------------

export async function fetchStockItems(): Promise<InventoryStockItem[]> {
  if (supabase) {
    try {
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
    } catch (err: any) {
      console.warn('Network error in fetchStockItems, using local:', err?.message || err);
      return getLocal<InventoryStockItem>('inventory_stock');
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
  if (!dateStr || typeof dateStr !== 'string' || !dateStr.includes('-')) {
    dateStr = new Date().toISOString().split('T')[0];
  }
  const parts = dateStr.split('-').map(Number);
  const y = parts[0] || 2026;
  const m = parts[1] || 1;
  const d = parts[2] || 1;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (isNaN(date.getTime())) {
    return new Date().toISOString().split('T')[0];
  }
  date.setUTCDate(date.getUTCDate() + (days || 0));
  return date.toISOString().split('T')[0];
}

/**
 * Calculate actual calendar duration between two dates (inclusive of start date).
 * Example: 2026-08-01 to 2026-08-01 = 1 day.
 * 2026-08-01 to 2026-09-09 = 40 days.
 */
export function calculateCalendarDays(startDateStr: string, endDateStr: string): number {
  if (!startDateStr || !endDateStr || typeof startDateStr !== 'string' || typeof endDateStr !== 'string') return 1;
  const sParts = startDateStr.split('-').map(Number);
  const eParts = endDateStr.split('-').map(Number);
  const sy = sParts[0], sm = sParts[1], sd = sParts[2];
  const ey = eParts[0], em = eParts[1], ed = eParts[2];
  if (isNaN(sy) || isNaN(sm) || isNaN(sd) || isNaN(ey) || isNaN(em) || isNaN(ed)) return 1;
  const startUtc = Date.UTC(sy, sm - 1, sd);
  const endUtc = Date.UTC(ey, em - 1, ed);
  if (isNaN(startUtc) || isNaN(endUtc)) return 1;
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
  const safeDays = typeof cycleDays === 'number' && !isNaN(cycleDays) && cycleDays > 0 ? cycleDays : 40;
  return addDaysToDate(startDateStr, safeDays - 1);
}

/**
 * Calculates day-wise rental amount: Quantity × Daily Rate × Number of Days.
 * If multiple items, sum of (item.quantity * item.dailyRate * days).
 */
export function calculateDayWiseRent(
  days: number,
  quantity: number,
  dailyRate: number,
  items?: Array<{ quantity: number; dailyRate: number; plateType?: string }>
): number {
  if (days <= 0) return 0;
  if (items && items.length > 0) {
    const totalDaily = items.reduce((sum, it) => sum + (it.quantity || 0) * (it.dailyRate || 0), 0);
    return Math.round(totalDaily * days * 100) / 100;
  }
  return Math.round((quantity || 0) * (dailyRate || 0) * days * 100) / 100;
}

export interface ReturnedBatchDetail {
  id?: string;
  returnedQuantity: number;
  returnDate: string;
  elapsedDays: number;
  dailyRate: number;
  rentAmount: number;
  collectedAmount?: number;
  refundAmount?: number;
  penaltyAmount?: number;
  paymentMode?: string;
}

export interface PartialReturnsBreakdownResult {
  initialQuantity: number;
  dailyRate: number;
  cycleDays: number;
  startDate: string;
  returnedBatches: ReturnedBatchDetail[];
  totalReturnedQuantity: number;
  remainingQuantity: number;
  returnedBatchesRentTotal: number;
  remainingPlatesDays: number;
  remainingPlatesRent: number;
  totalRent: number;
  totalPaid: number;
  netBalance: number;
  refundDue: number;
  pendingDue: number;
  isFullyReturned: boolean;
}

/**
 * Calculates continuous day-wise finances for partial returns and remaining plates:
 * - Each returned batch of Q_i plates returned on Day D_i is charged: Q_i * dailyRate * D_i
 * - Remaining plates (initialQuantity - sum(Q_i)) continue running on the 40-day cycle (or elapsed days)
 * - If advance/total paid > total rent: Admin refunds remaining excess amount to customer
 * - If total rent > advance/total paid: Customer owes remaining dues
 */
export function calculatePartialReturnsBreakdown(params: {
  startDate: string;
  initialQuantity: number;
  dailyRate: number;
  cycleDays?: number;
  paidAmount?: number;
  items?: Array<{ plateType?: string; quantity: number; dailyRate: number }>;
  returns?: Array<{
    id?: string;
    returnedQuantity: number;
    returnDate: string;
    collectedAmount?: number;
    refundAmount?: number;
    penaltyAmount?: number;
    paymentMode?: string;
    daysKept?: number;
    batchRent?: number;
  }>;
  currentReturn?: {
    returnedQuantity: number;
    returnDate: string;
    penaltyAmount?: number;
  };
  asOfDate?: string;
}): PartialReturnsBreakdownResult {
  const startDate = params.startDate;
  const initialQuantity = Number(params.initialQuantity || 0);
  const cycleDays = params.cycleDays && params.cycleDays > 0 ? Number(params.cycleDays) : 40;
  const asOfDate = params.asOfDate || new Date().toISOString().split('T')[0];

  let effectiveDailyRate = Number(params.dailyRate || 0);
  if (params.items && params.items.length > 0) {
    const totalQty = params.items.reduce((s, it) => s + (it.quantity || 0), 0);
    const totalRate = params.items.reduce((s, it) => s + (it.quantity || 0) * (it.dailyRate || 0), 0);
    if (totalQty > 0) {
      effectiveDailyRate = totalRate / totalQty;
    }
  }

  const allReturnsToProcess: Array<{
    id?: string;
    returnedQuantity: number;
    returnDate: string;
    collectedAmount?: number;
    refundAmount?: number;
    penaltyAmount?: number;
    paymentMode?: string;
  }> = [];

  if (params.returns && params.returns.length > 0) {
    params.returns.forEach((r) => {
      allReturnsToProcess.push({
        id: r.id,
        returnedQuantity: Number(r.returnedQuantity || 0),
        returnDate: r.returnDate,
        collectedAmount: r.collectedAmount ? Number(r.collectedAmount) : undefined,
        refundAmount: r.refundAmount ? Number(r.refundAmount) : undefined,
        penaltyAmount: r.penaltyAmount ? Number(r.penaltyAmount) : undefined,
        paymentMode: r.paymentMode,
      });
    });
  }

  if (params.currentReturn && params.currentReturn.returnedQuantity > 0) {
    allReturnsToProcess.push({
      id: 'current-pending-return',
      returnedQuantity: Number(params.currentReturn.returnedQuantity),
      returnDate: params.currentReturn.returnDate,
      penaltyAmount: params.currentReturn.penaltyAmount ? Number(params.currentReturn.penaltyAmount) : undefined,
    });
  }

  let totalReturnedQuantity = 0;
  let returnedBatchesRentTotal = 0;
  let totalPenalties = 0;
  const returnedBatches: ReturnedBatchDetail[] = [];

  for (const ret of allReturnsToProcess) {
    const qty = ret.returnedQuantity;
    if (qty <= 0) continue;
    const elapsedDays = Math.max(1, calculateCalendarDays(startDate, ret.returnDate));
    const rentAmount = Math.round(qty * effectiveDailyRate * elapsedDays * 100) / 100;
    const penalty = ret.penaltyAmount ? Number(ret.penaltyAmount) : 0;

    totalReturnedQuantity += qty;
    returnedBatchesRentTotal += rentAmount;
    totalPenalties += penalty;

    returnedBatches.push({
      id: ret.id,
      returnedQuantity: qty,
      returnDate: ret.returnDate,
      elapsedDays,
      dailyRate: effectiveDailyRate,
      rentAmount,
      collectedAmount: ret.collectedAmount,
      refundAmount: ret.refundAmount,
      penaltyAmount: ret.penaltyAmount,
      paymentMode: ret.paymentMode,
    });
  }

  const remainingQuantity = Math.max(0, initialQuantity - totalReturnedQuantity);
  const isFullyReturned = remainingQuantity === 0;

  let remainingPlatesDays = 0;
  let remainingPlatesRent = 0;

  if (remainingQuantity > 0) {
    const elapsedSinceStart = calculateCalendarDays(startDate, asOfDate);
    const extraDays = Math.max(0, elapsedSinceStart - cycleDays);
    remainingPlatesDays = cycleDays + extraDays;
    remainingPlatesRent = Math.round(remainingQuantity * effectiveDailyRate * remainingPlatesDays * 100) / 100;
  }

  const totalRent = Math.round((returnedBatchesRentTotal + remainingPlatesRent + totalPenalties) * 100) / 100;
  const totalPaid = Number(params.paidAmount || 0);
  const netBalance = Math.round((totalRent - totalPaid) * 100) / 100;

  const refundDue = netBalance < 0 ? Math.round(Math.abs(netBalance) * 100) / 100 : 0;
  const pendingDue = netBalance > 0 ? Math.round(netBalance * 100) / 100 : 0;

  return {
    initialQuantity,
    dailyRate: effectiveDailyRate,
    cycleDays,
    startDate,
    returnedBatches,
    totalReturnedQuantity,
    remainingQuantity,
    returnedBatchesRentTotal,
    remainingPlatesDays,
    remainingPlatesRent,
    totalRent,
    totalPaid,
    netBalance,
    refundDue,
    pendingDue,
    isFullyReturned,
  };
}

/**
 * Calculates day-wise finances for a rental cycle up to an evaluation or return date.
 * If partial returns exist: accounts for returned batches day-wise and remaining plates continuing.
 * If returned (actualEndDate provided): strictly charges for actual days kept (elapsedDays * dailyRate).
 * If active: charges base rent or accrued day-wise rent beyond cycle term.
 */
export function calculateCycleFinances(
  cycle: {
    startDate?: string;
    actualEndDate?: string | null;
    quantity?: number;
    dailyRate?: number;
    baseRent?: number;
    paidAmount?: number;
    days?: number;
    items?: Array<{ quantity: number; dailyRate: number; plateType?: string }>;
    returns?: Array<{
      id?: string;
      returnedQuantity: number;
      returnDate: string;
      collectedAmount?: number;
      refundAmount?: number;
      penaltyAmount?: number;
      paymentMode?: string;
      daysKept?: number;
      batchRent?: number;
    }>;
  },
  asOfDateStr = new Date().toISOString().split('T')[0]
) {
  if (!cycle) {
    return {
      elapsedDays: 1,
      standardDays: 1,
      extraDays: 0,
      extraAmount: 0,
      dailyRateTotal: 0,
      dayWiseRent: 0,
      totalAmount: 0,
      pendingAmount: 0,
    };
  }
  const startDate = cycle.startDate || asOfDateStr;
  const effectiveEndDate = cycle.actualEndDate || asOfDateStr;
  const elapsedDays = Math.max(1, calculateCalendarDays(startDate, effectiveEndDate));
  const cycleTermDays = cycle.days && cycle.days > 0 ? cycle.days : 40;

  // Compute daily rate total across all itemized plates or single item
  let dailyRateTotal = 0;
  if (cycle.items && cycle.items.length > 0) {
    dailyRateTotal = cycle.items.reduce(
      (sum, it) => sum + (it.quantity || 0) * (it.dailyRate || 0),
      0
    );
  } else {
    dailyRateTotal = (cycle.quantity || 0) * (cycle.dailyRate || 0);
  }

  // If partial returns exist for this cycle, integrate them into the calculation
  if (cycle.returns && cycle.returns.length > 0) {
    const breakdown = calculatePartialReturnsBreakdown({
      startDate: startDate,
      initialQuantity: cycle.quantity || 0,
      dailyRate: cycle.dailyRate || 0,
      cycleDays: cycleTermDays,
      paidAmount: cycle.paidAmount || 0,
      items: cycle.items,
      returns: cycle.returns,
      asOfDate: effectiveEndDate,
    });

    const standardDays = Math.min(elapsedDays, cycleTermDays);
    const extraDays = Math.max(0, elapsedDays - cycleTermDays);
    const dayWiseRent = Math.round(dailyRateTotal * elapsedDays * 100) / 100;

    return {
      elapsedDays,
      standardDays,
      extraDays,
      extraAmount: 0,
      dailyRateTotal,
      dayWiseRent,
      totalAmount: breakdown.totalRent,
      pendingAmount: breakdown.pendingDue,
      refundAmount: breakdown.refundDue,
      partialBreakdown: breakdown,
    };
  }

  let standardDays = 0;
  let extraDays = 0;
  let extraAmount = 0;
  let totalAmount = 0;

  if (cycle.actualEndDate) {
    // Pure Day-Wise calculation upon return: strictly charge for actual days kept
    standardDays = elapsedDays;
    totalAmount = Math.round(dailyRateTotal * elapsedDays * 100) / 100;
  } else {
    // Active ongoing cycle
    standardDays = Math.min(elapsedDays, cycleTermDays);
    extraDays = Math.max(0, elapsedDays - cycleTermDays);
    if (extraDays > 0) {
      extraAmount = Math.round(dailyRateTotal * extraDays * 100) / 100;
      totalAmount = Math.round((cycle.baseRent || dailyRateTotal * cycleTermDays) + extraAmount);
    } else {
      totalAmount = typeof cycle.baseRent === 'number' && cycle.baseRent > 0 ? cycle.baseRent : Math.round(dailyRateTotal * cycleTermDays * 100) / 100;
    }
  }

  const pendingAmount = Math.max(0, totalAmount - (cycle.paidAmount || 0));
  const dayWiseRent = Math.round(dailyRateTotal * elapsedDays * 100) / 100;

  return {
    elapsedDays,
    standardDays,
    extraDays,
    extraAmount,
    dailyRateTotal,
    dayWiseRent,
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
    try {
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
    } catch (err: any) {
      console.warn('Network error in fetchRentalCycles, using local:', err?.message || err);
      return getLocal<RentalCycleRecord>('rental_cycles');
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
    try {
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
    } catch (err: any) {
      console.warn('Network error in fetchRentals, using local:', err?.message || err);
      return getLocal<RentalRecord>('rentals');
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
  payment_mode: 'Account 1' | 'Account 2' | 'Cash' | 'Outstanding' | 'Udhari';
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
  returnDate: string,
  paidAmount?: number,
  pendingAmount?: number
): Promise<void> {
  const cleanUpdates = {
    status: 'returned' as const,
    total_rent: totalRent,
    paid_amount: paidAmount !== undefined ? paidAmount : totalRent,
    pending_amount: pendingAmount !== undefined ? pendingAmount : 0,
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
    try {
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
    } catch (err: any) {
      console.warn('Network error in fetchReturns, using local:', err?.message || err);
      return getLocal<ReturnRecord>('returns');
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
  collected_amount?: number;
  refund_amount?: number;
  payment_mode?: string;
  penalty_amount?: number;
  days_kept?: number;
  batch_rent?: number;
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
    collected_amount: returnLog.collected_amount !== undefined ? Number(returnLog.collected_amount) : null,
    refund_amount: returnLog.refund_amount !== undefined ? Number(returnLog.refund_amount) : null,
    payment_mode: returnLog.payment_mode || null,
    penalty_amount: returnLog.penalty_amount !== undefined ? Number(returnLog.penalty_amount) : null,
    days_kept: returnLog.days_kept !== undefined ? Number(returnLog.days_kept) : null,
    batch_rent: returnLog.batch_rent !== undefined ? Number(returnLog.batch_rent) : null,
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
    try {
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
    } catch (err: any) {
      console.warn('Network error in fetchPayments, using local:', err?.message || err);
      return getLocal<PaymentRecord>('payments');
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
  payment_mode: 'Account 1' | 'Account 2' | 'Cash' | 'Outstanding' | 'Udhari';
  reference?: string;
  notes?: string;
  status?: 'verified' | 'pending';
  type?: 'payment' | 'refund';
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
    type: payment.type || 'payment',
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
    try {
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
    } catch (err: any) {
      console.warn('Network error in fetchLedgerEntries, using local:', err?.message || err);
      return getLocal<LedgerEntryRecord>('ledger_entries');
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
    try {
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
    } catch (err: any) {
      console.warn('Network error in fetchNotifications, using local:', err?.message || err);
      return getLocal<NotificationRecord>('notifications');
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

// ------------------------------------------------------------------------------
// DATA RESET & PURGE HELPERS
// ------------------------------------------------------------------------------

/**
 * Safely clears all rows from a Supabase table in batches of 200
 */
async function clearSupabaseTable(tableName: string): Promise<number> {
  if (!supabase) return 0;
  try {
    const { data, error } = await supabase.from(tableName).select('id');
    if (error) {
      console.warn(`Could not query ids for ${tableName}:`, error.message);
      return 0;
    }
    if (!data || data.length === 0) return 0;
    const ids = data.map((d: any) => d.id).filter(Boolean);
    if (ids.length === 0) return 0;
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200);
      const { error: delErr } = await supabase.from(tableName).delete().in('id', chunk);
      if (delErr) {
        console.warn(`Error deleting batch from ${tableName}:`, delErr.message);
      }
    }
    return ids.length;
  } catch (err) {
    console.warn(`Exception clearing ${tableName}:`, err);
    return 0;
  }
}

/**
 * Clears all rentals, rental cycles, return records, and rental-related custom bill mappings
 */
export async function clearAllRentalsAndCycles(): Promise<void> {
  await clearSupabaseTable('returns');
  await clearSupabaseTable('rental_cycles');
  await clearSupabaseTable('rentals');

  try {
    localStorage.removeItem('anand_rentals');
    localStorage.removeItem('anand_rental_cycles');
    localStorage.removeItem('anand_returns');
    localStorage.removeItem('anand_custom_bill_numbers');
  } catch {}
}

/**
 * Clears all payment records
 */
export async function clearAllPayments(): Promise<void> {
  await clearSupabaseTable('payments');
  try {
    localStorage.removeItem('anand_payments');
  } catch {}
}

/**
 * Clears specified inactive parties (customers with 0 plates on site and 0 dues)
 */
export async function clearInactiveParties(partyIds: string[]): Promise<number> {
  if (!partyIds || partyIds.length === 0) return 0;
  if (supabase) {
    for (let i = 0; i < partyIds.length; i += 200) {
      const chunk = partyIds.slice(i, i + 200);
      await supabase.from('parties').delete().in('id', chunk);
    }
  }
  const localParties = getLocal<PartyRecord>('parties');
  setLocal(
    'parties',
    localParties.filter((p) => !partyIds.includes(p.id))
  );
  return partyIds.length;
}

/**
 * Clears all customer parties
 */
export async function clearAllParties(): Promise<void> {
  await clearSupabaseTable('parties');
  try {
    localStorage.removeItem('anand_parties');
  } catch {}
}

/**
 * Clears all notifications
 */
export async function clearAllNotifications(): Promise<void> {
  await clearSupabaseTable('notifications');
  try {
    localStorage.removeItem('anand_notifications');
  } catch {}
}

/**
 * Complete factory reset: wipes returns, cycles, rentals, payments, ledger, notifications, and parties
 */
export async function factoryResetAllDatabase(): Promise<void> {
  await clearSupabaseTable('returns');
  await clearSupabaseTable('rental_cycles');
  await clearSupabaseTable('rentals');
  await clearSupabaseTable('payments');
  await clearSupabaseTable('ledger_entries');
  await clearSupabaseTable('notifications');
  await clearSupabaseTable('parties');

  try {
    localStorage.removeItem('anand_rentals');
    localStorage.removeItem('anand_rental_cycles');
    localStorage.removeItem('anand_returns');
    localStorage.removeItem('anand_payments');
    localStorage.removeItem('anand_ledger');
    localStorage.removeItem('anand_notifications');
    localStorage.removeItem('anand_parties');
    localStorage.removeItem('anand_custom_bill_numbers');
  } catch {}
}

/**
 * Seeds sample starter data (plates, stock, customers, rentals, payments)
 * Useful when starting on a fresh database or testing a new deployment.
 */
export async function seedSampleStarterData(): Promise<void> {
  const dateTenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0];
  const dateTwentyDaysAgo = new Date(Date.now() - 20 * 86400000).toISOString().split('T')[0];

  // 1. Plate types
  const samplePlateTypes: PlateTypeRecord[] = STANDARD_PLATE_SIZES.map((size) => ({
    id: `pt-${size.replace('×', 'x')}`,
    plate_size: size,
    daily_rate: 1.5,
    active: true,
    status: 'available',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  // 2. Inventory stock (Total 830 plates owned)
  const sampleStock: InventoryStockItem[] = [
    { id: 'stock-1', plate_size: '24×3', quantity: 200, received_date: dateTwentyDaysAgo, notes: 'Initial Yard Stock Batch 1' },
    { id: 'stock-2', plate_size: '21×3', quantity: 150, received_date: dateTwentyDaysAgo, notes: 'Initial Yard Stock Batch 1' },
    { id: 'stock-3', plate_size: '18×3', quantity: 150, received_date: dateTwentyDaysAgo, notes: 'Initial Yard Stock Batch 1' },
    { id: 'stock-4', plate_size: '15×3', quantity: 100, received_date: dateTwentyDaysAgo, notes: 'Initial Yard Stock Batch 1' },
    { id: 'stock-5', plate_size: '12×3', quantity: 100, received_date: dateTwentyDaysAgo, notes: 'Initial Yard Stock Batch 1' },
    { id: 'stock-6', plate_size: '9×3', quantity: 80, received_date: dateTwentyDaysAgo, notes: 'Initial Yard Stock Batch 1' },
    { id: 'stock-7', plate_size: '6×3', quantity: 50, received_date: dateTwentyDaysAgo, notes: 'Initial Yard Stock Batch 1' },
  ];

  // 3. Parties
  const party1Id = 'party-ramesh-patil';
  const party2Id = 'party-ganesh-shinde';
  const party3Id = 'party-mauli-const';

  const sampleParties: PartyRecord[] = [
    {
      id: party1Id,
      name: 'रमेश पाटील',
      mobile: '9881985058',
      address: 'प्लॉट क्र. १२, जुना विडी घरकुल, सोलापूर',
      notes: 'विश्वसनीय ग्राहक, नियमित बांधकाम कंत्राटदार',
      status: 'active',
      created_at: dateTwentyDaysAgo + 'T10:00:00Z',
    },
    {
      id: party2Id,
      name: 'गणेश शिंदे',
      mobile: '9021519582',
      address: 'जुळे सोलापूर, डी-मार्ट जवळ',
      notes: 'स्लॅब कामासाठी सेंट्रिंग साहित्य',
      status: 'active',
      created_at: dateTenDaysAgo + 'T11:00:00Z',
    },
    {
      id: party3Id,
      name: 'माउली कन्स्ट्रक्शन',
      mobile: '7020914957',
      address: 'होटगी रोड, विमानतळ जवळ, सोलापूर',
      notes: 'कमर्शियल कॉम्प्लेक्स साईट',
      status: 'active',
      created_at: dateTwentyDaysAgo + 'T09:30:00Z',
    },
  ];

  // 4. Rentals and cycles
  const rental1Id = 'rent-sample-01';
  const rental2Id = 'rent-sample-02';
  const rental3Id = 'rent-sample-03';

  const cycle1End = calculateExpectedCycleEndDate(dateTwentyDaysAgo, 40);
  const sampleRentals: RentalRecord[] = [
    {
      id: rental1Id,
      party_id: party1Id,
      party_name: 'रमेश पाटील',
      plate_type: '24×3',
      quantity: 120,
      daily_rate: 1.5,
      issue_date: dateTwentyDaysAgo,
      days: 40,
      total_rent: 7200,
      paid_amount: 2000,
      pending_amount: 5200,
      payment_mode: 'Cash',
      payment_status: 'partial',
      status: 'active',
      items: [
        { plateType: '24×3', quantity: 80, dailyRate: 1.5, days: 40 },
        { plateType: '18×3', quantity: 40, dailyRate: 1.5, days: 40 },
      ],
      current_cycle_number: 1,
      current_cycle_start_date: dateTwentyDaysAgo,
      current_cycle_end_date: cycle1End,
      created_at: dateTwentyDaysAgo + 'T10:15:00Z',
    },
    {
      id: rental2Id,
      party_id: party2Id,
      party_name: 'गणेश शिंदे',
      plate_type: '21×3',
      quantity: 50,
      daily_rate: 1.5,
      issue_date: dateTenDaysAgo,
      days: 40,
      total_rent: 3000,
      paid_amount: 1500,
      pending_amount: 1500,
      payment_mode: 'Account 1',
      payment_status: 'partial',
      status: 'active',
      items: [
        { plateType: '21×3', quantity: 50, dailyRate: 1.5, days: 40 },
      ],
      current_cycle_number: 1,
      current_cycle_start_date: dateTenDaysAgo,
      current_cycle_end_date: calculateExpectedCycleEndDate(dateTenDaysAgo, 40),
      created_at: dateTenDaysAgo + 'T11:20:00Z',
    },
    {
      id: rental3Id,
      party_id: party3Id,
      party_name: 'माउली कन्स्ट्रक्शन',
      plate_type: '24×3',
      quantity: 100,
      daily_rate: 1.5,
      issue_date: dateTwentyDaysAgo,
      days: 40,
      total_rent: 6000,
      paid_amount: 3000,
      pending_amount: 3000,
      payment_mode: 'Account 2',
      payment_status: 'partial',
      status: 'active',
      items: [
        { plateType: '24×3', quantity: 100, dailyRate: 1.5, days: 40 },
      ],
      current_cycle_number: 1,
      current_cycle_start_date: dateTwentyDaysAgo,
      current_cycle_end_date: cycle1End,
      created_at: dateTwentyDaysAgo + 'T09:45:00Z',
    },
  ];

  const sampleCycles: RentalCycleRecord[] = sampleRentals.map((r) => ({
    id: `cyc-${r.id}-1`,
    rental_id: r.id,
    party_id: r.party_id,
    cycle_number: 1,
    start_date: r.issue_date,
    expected_end_date: r.current_cycle_end_date || calculateExpectedCycleEndDate(r.issue_date, 40),
    days: 40,
    extra_days: 0,
    daily_rate: r.daily_rate,
    quantity: r.quantity,
    base_rent: r.total_rent,
    extra_amount: 0,
    total_amount: r.total_rent,
    paid_amount: r.paid_amount,
    pending_amount: r.pending_amount,
    status: 'active',
    items: r.items,
    created_at: r.created_at,
  }));

  // 5. Payments
  const samplePayments: PaymentRecord[] = [
    {
      id: 'pay-sample-01',
      party_id: party1Id,
      party_name: 'रमेश पाटील',
      rental_id: rental1Id,
      cycle_id: `cyc-${rental1Id}-1`,
      cycle_number: 1,
      amount: 2000,
      payment_date: dateTwentyDaysAgo,
      payment_mode: 'Cash',
      reference: 'रोख ॲडव्हान्स जमा',
      notes: 'नवीन भाडे वाटप ॲडव्हान्स',
      status: 'verified',
      type: 'payment',
      created_at: dateTwentyDaysAgo + 'T10:16:00Z',
    },
    {
      id: 'pay-sample-02',
      party_id: party2Id,
      party_name: 'गणेश शिंदे',
      rental_id: rental2Id,
      cycle_id: `cyc-${rental2Id}-1`,
      cycle_number: 1,
      amount: 1500,
      payment_date: dateTenDaysAgo,
      payment_mode: 'Account 1',
      reference: 'NEFT-8849102',
      notes: 'बँक ट्रान्सफर ॲडव्हान्स',
      status: 'verified',
      type: 'payment',
      created_at: dateTenDaysAgo + 'T11:25:00Z',
    },
    {
      id: 'pay-sample-03',
      party_id: party3Id,
      party_name: 'माउली कन्स्ट्रक्शन',
      rental_id: rental3Id,
      cycle_id: `cyc-${rental3Id}-1`,
      cycle_number: 1,
      amount: 3000,
      payment_date: dateTwentyDaysAgo,
      payment_mode: 'Account 2',
      reference: 'UPI-994827104',
      notes: 'गुगल पे ॲडव्हान्स जमा',
      status: 'verified',
      type: 'payment',
      created_at: dateTwentyDaysAgo + 'T09:50:00Z',
    },
  ];

  // 6. Ledger entries
  const sampleLedger: LedgerEntryRecord[] = [
    {
      id: 'led-1',
      party_id: party1Id,
      date: dateTwentyDaysAgo,
      description: 'भाडे वाटप (पावती क्र. १) - १२० सेंट्रिंग प्लेट्स (४० दिवस)',
      debit: 7200,
      credit: 0,
      balance: 7200,
    },
    {
      id: 'led-2',
      party_id: party1Id,
      date: dateTwentyDaysAgo,
      description: 'ॲडव्हान्स रोख जमा',
      debit: 0,
      credit: 2000,
      balance: 5200,
    },
    {
      id: 'led-3',
      party_id: party2Id,
      date: dateTenDaysAgo,
      description: 'भाडे वाटप (पावती क्र. २) - ५० सेंट्रिंग प्लेट्स (४० दिवस)',
      debit: 3000,
      credit: 0,
      balance: 3000,
    },
    {
      id: 'led-4',
      party_id: party2Id,
      date: dateTenDaysAgo,
      description: 'ॲडव्हान्स बँक जमा',
      debit: 0,
      credit: 1500,
      balance: 1500,
    },
    {
      id: 'led-5',
      party_id: party3Id,
      date: dateTwentyDaysAgo,
      description: 'भाडे वाटप (पावती क्र. ३) - १०० सेंट्रिंग प्लेट्स (४० दिवस)',
      debit: 6000,
      credit: 0,
      balance: 6000,
    },
    {
      id: 'led-6',
      party_id: party3Id,
      date: dateTwentyDaysAgo,
      description: 'ॲडव्हान्स डिजिटल जमा',
      debit: 0,
      credit: 3000,
      balance: 3000,
    },
  ];

  // 7. Notifications
  const sampleNotifications: NotificationRecord[] = [
    {
      id: 'notif-1',
      party_id: party1Id,
      type: 'payment',
      title: 'नवीन पेमेंट नोंद',
      message: 'रमेश पाटील यांच्याकडून ₹२,००० रोख जमा झाले.',
      date: dateTwentyDaysAgo,
      is_read: false,
    },
    {
      id: 'notif-2',
      party_id: party3Id,
      type: 'due',
      title: 'भाडे वाटप नोंद',
      message: 'माउली कन्स्ट्रक्शन यांना १०० प्लेट्स (४० दिवस) वितरित करण्यात आल्या.',
      date: dateTwentyDaysAgo,
      is_read: false,
    },
  ];

  // Save all to localStorage
  setLocal('plate_types', samplePlateTypes);
  setLocal('inventory_stock', sampleStock);
  setLocal('parties', sampleParties);
  setLocal('rentals', sampleRentals);
  setLocal('rental_cycles', sampleCycles);
  setLocal('returns', []);
  setLocal('payments', samplePayments);
  setLocal('ledger_entries', sampleLedger);
  setLocal('notifications', sampleNotifications);

  // If Supabase is connected, insert them into remote tables too
  if (supabase) {
    try {
      await supabase.from('plate_types').upsert(samplePlateTypes);
      await supabase.from('inventory_stock').upsert(sampleStock);
      await supabase.from('parties').upsert(sampleParties);
      await supabase.from('rentals').upsert(sampleRentals);
      await supabase.from('rental_cycles').upsert(sampleCycles);
      await supabase.from('payments').upsert(samplePayments);
      await supabase.from('ledger_entries').upsert(sampleLedger);
      await supabase.from('notifications').upsert(sampleNotifications);
    } catch (remoteErr) {
      console.warn('Could not sync sample data to remote Supabase:', remoteErr);
    }
  }
}

/**
 * Restores all database data from a JSON backup object.
 */
export async function restoreBackupData(backupData: any): Promise<{ success: boolean; message: string }> {
  if (!backupData || typeof backupData !== 'object') {
    throw new Error('Invalid backup file format');
  }

  const parties = Array.isArray(backupData.parties) ? backupData.parties : [];
  const rentals = Array.isArray(backupData.rentals) ? backupData.rentals : [];
  const rentalCycles = Array.isArray(backupData.rentalCycles) ? backupData.rentalCycles : [];
  const returns = Array.isArray(backupData.returns) ? backupData.returns : [];
  const payments = Array.isArray(backupData.payments) ? backupData.payments : [];
  const stockItems = Array.isArray(backupData.stockItems)
    ? backupData.stockItems
    : Array.isArray(backupData.inventory_stock)
    ? backupData.inventory_stock
    : [];
  const plateTypes = Array.isArray(backupData.plateTypes)
    ? backupData.plateTypes
    : Array.isArray(backupData.plate_types)
    ? backupData.plate_types
    : [];
  const ledgerEntries = Array.isArray(backupData.ledgerEntries)
    ? backupData.ledgerEntries
    : Array.isArray(backupData.ledger_entries)
    ? backupData.ledger_entries
    : [];
  const notifications = Array.isArray(backupData.notifications) ? backupData.notifications : [];

  if (parties.length > 0) setLocal('parties', parties);
  if (rentals.length > 0) setLocal('rentals', rentals);
  if (rentalCycles.length > 0) setLocal('rental_cycles', rentalCycles);
  if (returns.length > 0) setLocal('returns', returns);
  if (payments.length > 0) setLocal('payments', payments);
  if (stockItems.length > 0) setLocal('inventory_stock', stockItems);
  if (plateTypes.length > 0) setLocal('plate_types', plateTypes);
  if (ledgerEntries.length > 0) setLocal('ledger_entries', ledgerEntries);
  if (notifications.length > 0) setLocal('notifications', notifications);

  if (backupData.billConfig) {
    try {
      localStorage.setItem('anand_bill_template_config', JSON.stringify(backupData.billConfig));
    } catch {}
  }

  // If Supabase client is connected, upsert records to remote database
  if (supabase) {
    try {
      if (plateTypes.length > 0) await supabase.from('plate_types').upsert(plateTypes);
      if (stockItems.length > 0) await supabase.from('inventory_stock').upsert(stockItems);
      if (parties.length > 0) await supabase.from('parties').upsert(parties);
      if (rentals.length > 0) await supabase.from('rentals').upsert(rentals);
      if (rentalCycles.length > 0) await supabase.from('rental_cycles').upsert(rentalCycles);
      if (returns.length > 0) await supabase.from('returns').upsert(returns);
      if (payments.length > 0) await supabase.from('payments').upsert(payments);
      if (ledgerEntries.length > 0) await supabase.from('ledger_entries').upsert(ledgerEntries);
      if (notifications.length > 0) await supabase.from('notifications').upsert(notifications);
    } catch (err: any) {
      console.warn('Failed syncing restored backup to Supabase:', err);
    }
  }

  return {
    success: true,
    message: `Restored ${parties.length} parties, ${rentals.length} rentals, and ${payments.length} payments.`,
  };
}

// Re-export deduplication engine
export * from './deduplication';

