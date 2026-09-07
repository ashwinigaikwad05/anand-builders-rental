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
  plateType: PlateSizeType;
  quantity: number;
  dailyRate: number;
  days: number;
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
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  supabaseAnonKey !== 'your-anon-public-key'
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
// 4. RENTALS API
// ------------------------------------------------------------------------------

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
  const newRecord: RentalRecord = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `rent-${Date.now()}`,
    party_id: rental.party_id,
    party_name: rental.party_name,
    plate_type: rental.plate_type,
    quantity: Math.floor(Number(rental.quantity)),
    daily_rate: Number(rental.daily_rate),
    issue_date: rental.issue_date,
    days: Math.floor(Number(rental.days)),
    total_rent: Number(rental.total_rent),
    paid_amount: Number(rental.paid_amount),
    pending_amount: Number(rental.pending_amount),
    payment_mode: rental.payment_mode,
    payment_status: rental.paid_amount >= rental.total_rent ? 'paid' : rental.paid_amount > 0 ? 'partial' : 'pending',
    status: rental.status || 'active',
    notes: rental.notes?.trim() || null,
    items: rental.items || [],
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
          days: newRecord.days,
          total_rent: newRecord.total_rent,
          paid_amount: newRecord.paid_amount,
          pending_amount: newRecord.pending_amount,
          payment_mode: newRecord.payment_mode,
          payment_status: newRecord.payment_status,
          status: newRecord.status,
          notes: newRecord.notes,
          items: newRecord.items,
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }
    if (data) {
      const local = getLocal<RentalRecord>('rentals');
      setLocal('rentals', [data as RentalRecord, ...local.filter((r) => r.id !== data.id)]);
      return data as RentalRecord;
    }
  }

  const local = getLocal<RentalRecord>('rentals');
  setLocal('rentals', [newRecord, ...local]);
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
      throw new Error(error.message);
    }
  }
  const local = getLocal<RentalRecord>('rentals');
  setLocal('rentals', local.map((r) => (r.id === id ? { ...r, status } : r)));
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
      throw new Error(error.message);
    }
    if (data) {
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
