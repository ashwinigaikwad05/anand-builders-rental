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

export interface InventoryStockItem {
  id: string;
  plate_size: PlateSizeType;
  quantity: number;
  received_date: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  supabaseAnonKey !== 'your-anon-public-key'
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Local persistent cache helper for offline resilience and smooth initial setup
const LOCAL_STORAGE_KEY = 'anand_inventory_stock_data';

const getLocalStock = (): InventoryStockItem[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed reading local stock storage', err);
    return [];
  }
};

const setLocalStock = (items: InventoryStockItem[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed writing local stock storage', err);
  }
};

/**
 * Fetch all inventory stock additions.
 */
export async function fetchStockItems(): Promise<InventoryStockItem[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('inventory_stock')
        .select('*')
        .order('received_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase fetch error, using local fallback:', error.message);
        return getLocalStock();
      }

      // Sync to local cache
      if (data) {
        setLocalStock(data as InventoryStockItem[]);
        return data as InventoryStockItem[];
      }
    } catch (err) {
      console.warn('Supabase query error, fallback to local cache', err);
      return getLocalStock();
    }
  }

  return getLocalStock();
}

/**
 * Insert a new stock addition into Supabase.
 */
export async function insertStockItem(item: {
  plate_size: PlateSizeType;
  quantity: number;
  received_date: string;
  notes?: string;
}): Promise<InventoryStockItem> {
  const newItem: InventoryStockItem = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `stock-${Date.now()}`,
    plate_size: item.plate_size,
    quantity: Math.floor(Number(item.quantity)),
    received_date: item.received_date,
    notes: item.notes?.trim() || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (supabase) {
    try {
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
        const local = getLocalStock();
        setLocalStock([data as InventoryStockItem, ...local.filter((i) => i.id !== data.id)]);
        return data as InventoryStockItem;
      }
    } catch (err: any) {
      console.error('Supabase insert failed:', err);
      // Fallback local update if network is unavailable
      const local = getLocalStock();
      setLocalStock([newItem, ...local]);
      return newItem;
    }
  }

  // Standalone/Local storage fallback
  const local = getLocalStock();
  setLocalStock([newItem, ...local]);
  return newItem;
}

/**
 * Update an existing stock entry in Supabase.
 */
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
    try {
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
        const local = getLocalStock();
        setLocalStock(local.map((i) => (i.id === id ? (data as InventoryStockItem) : i)));
        return data as InventoryStockItem;
      }
    } catch (err: any) {
      console.error('Supabase update failed:', err);
      const local = getLocalStock();
      const updated = { ...local.find((i) => i.id === id), ...cleanUpdates, id } as InventoryStockItem;
      setLocalStock(local.map((i) => (i.id === id ? updated : i)));
      return updated;
    }
  }

  const local = getLocalStock();
  const updated = { ...local.find((i) => i.id === id), ...cleanUpdates, id } as InventoryStockItem;
  setLocalStock(local.map((i) => (i.id === id ? updated : i)));
  return updated;
}

/**
 * Delete a stock entry from Supabase.
 */
export async function deleteStockItem(id: string): Promise<boolean> {
  if (supabase) {
    try {
      const { error } = await supabase.from('inventory_stock').delete().eq('id', id);
      if (error) {
        throw new Error(error.message);
      }
    } catch (err: any) {
      console.error('Supabase delete failed:', err);
    }
  }

  const local = getLocalStock();
  setLocalStock(local.filter((i) => i.id !== id));
  return true;
}
