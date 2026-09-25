import {
  supabase,
  type PartyRecord,
  type InventoryStockItem,
  type PlateTypeRecord,
  type RentalRecord,
  type RentalCycleRecord,
  type ReturnRecord,
  type PaymentRecord,
  type LedgerEntryRecord,
  type NotificationRecord,
} from './supabase';

const STORAGE_PREFIX = 'anand_';

const getLocal = <T>(key: string): T[] => {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_PREFIX + key) : null;
    return raw ? JSON.parse(raw) : [];
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

export interface DeduplicationReport {
  totalRemoved: number;
  counts: {
    parties: number;
    stock: number;
    plateTypes: number;
    rentals: number;
    rentalCycles: number;
    returns: number;
    payments: number;
    ledgerEntries: number;
    notifications: number;
  };
  details: string[];
}

/**
 * Normalizes phone numbers for duplicate comparison.
 * Extracts only digits and takes the last 10 digits.
 */
export function normalizePhoneNumber(mobile?: string | null): string {
  if (!mobile) return '';
  const digits = mobile.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

/**
 * 1. PARTIES DEDUPLICATION
 * Detects duplicate parties by normalized 10-digit mobile number OR exact trimmed name.
 * Merges missing fields into the canonical record and builds an ID redirect map.
 */
export function deduplicateParties(parties: PartyRecord[]): {
  cleanParties: PartyRecord[];
  removedIds: string[];
  idRedirectMap: Map<string, string>;
} {
  const cleanParties: PartyRecord[] = [];
  const removedIds: string[] = [];
  const idRedirectMap = new Map<string, string>();
  const seenGroup = new Map<string, PartyRecord>();

  for (const p of parties) {
    const cleanMobile = normalizePhoneNumber(p.mobile);
    const cleanName = (p.name || '').trim().toLowerCase();
    const groupKey = cleanMobile.length >= 10 ? `m:${cleanMobile}` : `n:${cleanName}`;

    if (!seenGroup.has(groupKey)) {
      const canonicalRecord = { ...p };
      seenGroup.set(groupKey, canonicalRecord);
      cleanParties.push(canonicalRecord);
    } else {
      const canonical = seenGroup.get(groupKey)!;
      idRedirectMap.set(p.id, canonical.id);
      removedIds.push(p.id);

      // Merge missing fields into canonical record if duplicate has them
      if (!canonical.photo_url && p.photo_url) canonical.photo_url = p.photo_url;
      if (!canonical.aadhaar_url && p.aadhaar_url) canonical.aadhaar_url = p.aadhaar_url;
      if (!canonical.cheque_url && p.cheque_url) canonical.cheque_url = p.cheque_url;
      if (!canonical.address && p.address) canonical.address = p.address;
      if (!canonical.notes && p.notes) canonical.notes = p.notes;
    }
  }

  return { cleanParties, removedIds, idRedirectMap };
}

/**
 * 2. PLATE TYPES DEDUPLICATION
 * Keeps exactly 1 entry per standard plate size.
 */
export function deduplicatePlateTypes(types: PlateTypeRecord[]): {
  cleanTypes: PlateTypeRecord[];
  removedIds: string[];
} {
  const cleanTypes: PlateTypeRecord[] = [];
  const removedIds: string[] = [];
  const seenSizes = new Set<string>();

  for (const pt of types) {
    if (!seenSizes.has(pt.plate_size)) {
      seenSizes.add(pt.plate_size);
      cleanTypes.push(pt);
    } else {
      removedIds.push(pt.id);
    }
  }

  return { cleanTypes, removedIds };
}

/**
 * 3. INVENTORY STOCK DEDUPLICATION
 * Removes duplicate IDs and identical batch additions (same size, quantity, date, notes).
 */
export function deduplicateStockItems(items: InventoryStockItem[]): {
  cleanItems: InventoryStockItem[];
  removedIds: string[];
} {
  const cleanItems: InventoryStockItem[] = [];
  const removedIds: string[] = [];
  const seenIds = new Set<string>();
  const seenSignatures = new Set<string>();

  for (const it of items) {
    if (seenIds.has(it.id)) {
      removedIds.push(it.id);
      continue;
    }
    const sig = `${it.plate_size}_${it.quantity}_${it.received_date}_${(it.notes || '').trim()}`;
    if (seenSignatures.has(sig)) {
      removedIds.push(it.id);
    } else {
      seenIds.add(it.id);
      seenSignatures.add(sig);
      cleanItems.push(it);
    }
  }

  return { cleanItems, removedIds };
}

/**
 * 4. RENTALS DEDUPLICATION
 * Updates redirected party IDs, deduplicates by ID, and merges fast-click duplicate rentals.
 */
export function deduplicateRentals(
  rentals: RentalRecord[],
  partyRedirectMap?: Map<string, string>
): {
  cleanRentals: RentalRecord[];
  removedIds: string[];
  rentalRedirectMap: Map<string, string>;
} {
  const cleanRentals: RentalRecord[] = [];
  const removedIds: string[] = [];
  const rentalRedirectMap = new Map<string, string>();
  const seenIds = new Set<string>();
  const seenSignatures = new Map<string, RentalRecord>();

  for (const r of rentals) {
    const effectivePartyId = partyRedirectMap?.get(r.party_id) || r.party_id;
    const normalizedRental: RentalRecord = { ...r, party_id: effectivePartyId };

    if (seenIds.has(r.id)) {
      removedIds.push(r.id);
      continue;
    }

    const sig = `${effectivePartyId}_${r.issue_date}_${r.total_rent}_${r.quantity}_${r.plate_type}`;
    if (seenSignatures.has(sig)) {
      const canonical = seenSignatures.get(sig)!;
      rentalRedirectMap.set(r.id, canonical.id);
      removedIds.push(r.id);
    } else {
      seenIds.add(r.id);
      seenSignatures.set(sig, normalizedRental);
      cleanRentals.push(normalizedRental);
    }
  }

  return { cleanRentals, removedIds, rentalRedirectMap };
}

/**
 * 5. RENTAL CYCLES DEDUPLICATION
 * Removes duplicate cycles for the same rental_id and cycle_number.
 */
export function deduplicateRentalCycles(
  cycles: RentalCycleRecord[],
  partyRedirectMap?: Map<string, string>,
  rentalRedirectMap?: Map<string, string>
): {
  cleanCycles: RentalCycleRecord[];
  removedIds: string[];
} {
  const cleanCycles: RentalCycleRecord[] = [];
  const removedIds: string[] = [];
  const seenIds = new Set<string>();
  const seenSignatures = new Set<string>();

  for (const c of cycles) {
    const effectivePartyId = partyRedirectMap?.get(c.party_id) || c.party_id;
    const effectiveRentalId = rentalRedirectMap?.get(c.rental_id) || c.rental_id;
    const normalizedCycle: RentalCycleRecord = {
      ...c,
      party_id: effectivePartyId,
      rental_id: effectiveRentalId,
    };

    if (seenIds.has(c.id)) {
      removedIds.push(c.id);
      continue;
    }

    const sig = `${effectiveRentalId}_cycle_${c.cycle_number}`;
    if (seenSignatures.has(sig)) {
      removedIds.push(c.id);
    } else {
      seenIds.add(c.id);
      seenSignatures.add(sig);
      cleanCycles.push(normalizedCycle);
    }
  }

  return { cleanCycles, removedIds };
}

/**
 * 6. RETURNS DEDUPLICATION
 */
export function deduplicateReturns(
  returns: ReturnRecord[],
  partyRedirectMap?: Map<string, string>,
  rentalRedirectMap?: Map<string, string>
): {
  cleanReturns: ReturnRecord[];
  removedIds: string[];
} {
  const cleanReturns: ReturnRecord[] = [];
  const removedIds: string[] = [];
  const seenIds = new Set<string>();
  const seenSignatures = new Set<string>();

  for (const ret of returns) {
    const effectivePartyId = partyRedirectMap?.get(ret.party_id) || ret.party_id;
    const effectiveRentalId = ret.rental_id
      ? rentalRedirectMap?.get(ret.rental_id) || ret.rental_id
      : ret.rental_id;
    const normalized: ReturnRecord = {
      ...ret,
      party_id: effectivePartyId,
      rental_id: effectiveRentalId,
    };

    if (seenIds.has(ret.id)) {
      removedIds.push(ret.id);
      continue;
    }

    const sig = `${effectivePartyId}_${effectiveRentalId}_${ret.return_date}_${ret.returned_quantity}_${ret.plate_type}`;
    if (seenSignatures.has(sig)) {
      removedIds.push(ret.id);
    } else {
      seenIds.add(ret.id);
      seenSignatures.add(sig);
      cleanReturns.push(normalized);
    }
  }

  return { cleanReturns, removedIds };
}

/**
 * 7. PAYMENTS DEDUPLICATION
 */
export function deduplicatePayments(
  payments: PaymentRecord[],
  partyRedirectMap?: Map<string, string>,
  rentalRedirectMap?: Map<string, string>
): {
  cleanPayments: PaymentRecord[];
  removedIds: string[];
} {
  const cleanPayments: PaymentRecord[] = [];
  const removedIds: string[] = [];
  const seenIds = new Set<string>();
  const seenSignatures = new Set<string>();

  for (const p of payments) {
    const effectivePartyId = partyRedirectMap?.get(p.party_id) || p.party_id;
    const effectiveRentalId = p.rental_id
      ? rentalRedirectMap?.get(p.rental_id) || p.rental_id
      : p.rental_id;
    const normalized: PaymentRecord = {
      ...p,
      party_id: effectivePartyId,
      rental_id: effectiveRentalId,
    };

    if (seenIds.has(p.id)) {
      removedIds.push(p.id);
      continue;
    }

    const ref = (p.reference || '').trim();
    const sig =
      ref && !ref.startsWith('PAY-') && !ref.startsWith('ADV-')
        ? `ref:${ref}`
        : `${effectivePartyId}_${p.amount}_${p.payment_date}_${p.payment_mode}_${effectiveRentalId || ''}`;

    if (seenSignatures.has(sig)) {
      removedIds.push(p.id);
    } else {
      seenIds.add(p.id);
      seenSignatures.add(sig);
      cleanPayments.push(normalized);
    }
  }

  return { cleanPayments, removedIds };
}

/**
 * 8. LEDGER ENTRIES DEDUPLICATION
 */
export function deduplicateLedgerEntries(
  entries: LedgerEntryRecord[],
  partyRedirectMap?: Map<string, string>
): {
  cleanEntries: LedgerEntryRecord[];
  removedIds: string[];
} {
  const cleanEntries: LedgerEntryRecord[] = [];
  const removedIds: string[] = [];
  const seenIds = new Set<string>();
  const seenSignatures = new Set<string>();

  for (const l of entries) {
    const effectivePartyId = partyRedirectMap?.get(l.party_id) || l.party_id;
    const normalized: LedgerEntryRecord = { ...l, party_id: effectivePartyId };

    if (seenIds.has(l.id)) {
      removedIds.push(l.id);
      continue;
    }

    const sig = `${effectivePartyId}_${l.date}_${l.debit}_${l.credit}_${l.description.trim()}`;
    if (seenSignatures.has(sig)) {
      removedIds.push(l.id);
    } else {
      seenIds.add(l.id);
      seenSignatures.add(sig);
      cleanEntries.push(normalized);
    }
  }

  return { cleanEntries, removedIds };
}

/**
 * 9. NOTIFICATIONS DEDUPLICATION
 */
export function deduplicateNotifications(
  notifications: NotificationRecord[]
): {
  cleanNotifications: NotificationRecord[];
  removedIds: string[];
} {
  const cleanNotifications: NotificationRecord[] = [];
  const removedIds: string[] = [];
  const seenIds = new Set<string>();
  const seenSignatures = new Set<string>();

  for (const n of notifications) {
    if (seenIds.has(n.id)) {
      removedIds.push(n.id);
      continue;
    }

    const sig = `${n.type}_${n.title.trim()}_${n.message.trim()}_${n.date}`;
    if (seenSignatures.has(sig)) {
      removedIds.push(n.id);
    } else {
      seenIds.add(n.id);
      seenSignatures.add(sig);
      cleanNotifications.push(n);
    }
  }

  return { cleanNotifications, removedIds };
}

/**
 * 10. GLOBAL DEDUPLICATION RUNNER
 * Processes all 9 datasets in database and localStorage.
 * Updates foreign keys, rewrites clean caches, and removes duplicate rows in Supabase.
 */
export async function deduplicateAllStoredData(): Promise<DeduplicationReport> {
  const rawParties = getLocal<PartyRecord>('parties');
  const rawStock = getLocal<InventoryStockItem>('inventory_stock');
  const rawTypes = getLocal<PlateTypeRecord>('plate_types');
  const rawRentals = getLocal<RentalRecord>('rentals');
  const rawCycles = getLocal<RentalCycleRecord>('rental_cycles');
  const rawReturns = getLocal<ReturnRecord>('returns');
  const rawPayments = getLocal<PaymentRecord>('payments');
  const rawLedger = getLocal<LedgerEntryRecord>('ledger_entries');
  const rawNotifs = getLocal<NotificationRecord>('notifications');

  // 1. Deduplicate Parties first to obtain Party ID Redirect Map
  const partyRes = deduplicateParties(rawParties);
  const typeRes = deduplicatePlateTypes(rawTypes);
  const stockRes = deduplicateStockItems(rawStock);

  // 2. Deduplicate Rentals with Party Redirects to obtain Rental ID Redirect Map
  const rentalRes = deduplicateRentals(rawRentals, partyRes.idRedirectMap);

  // 3. Deduplicate dependent records
  const cycleRes = deduplicateRentalCycles(rawCycles, partyRes.idRedirectMap, rentalRes.rentalRedirectMap);
  const returnRes = deduplicateReturns(rawReturns, partyRes.idRedirectMap, rentalRes.rentalRedirectMap);
  const payRes = deduplicatePayments(rawPayments, partyRes.idRedirectMap, rentalRes.rentalRedirectMap);
  const ledgerRes = deduplicateLedgerEntries(rawLedger, partyRes.idRedirectMap);
  const notifRes = deduplicateNotifications(rawNotifs);

  // Persist cleaned deduplicated data to localStorage
  setLocal('parties', partyRes.cleanParties);
  setLocal('plate_types', typeRes.cleanTypes);
  setLocal('inventory_stock', stockRes.cleanItems);
  setLocal('rentals', rentalRes.cleanRentals);
  setLocal('rental_cycles', cycleRes.cleanCycles);
  setLocal('returns', returnRes.cleanReturns);
  setLocal('payments', payRes.cleanPayments);
  setLocal('ledger_entries', ledgerRes.cleanEntries);
  setLocal('notifications', notifRes.cleanNotifications);

  // If Supabase is connected, delete removed rows from remote tables
  if (supabase) {
    try {
      if (partyRes.removedIds.length > 0) {
        await supabase.from('parties').delete().in('id', partyRes.removedIds);
      }
      if (typeRes.removedIds.length > 0) {
        await supabase.from('plate_types').delete().in('id', typeRes.removedIds);
      }
      if (stockRes.removedIds.length > 0) {
        await supabase.from('inventory_stock').delete().in('id', stockRes.removedIds);
      }
      if (rentalRes.removedIds.length > 0) {
        await supabase.from('rentals').delete().in('id', rentalRes.removedIds);
      }
      if (cycleRes.removedIds.length > 0) {
        await supabase.from('rental_cycles').delete().in('id', cycleRes.removedIds);
      }
      if (returnRes.removedIds.length > 0) {
        await supabase.from('returns').delete().in('id', returnRes.removedIds);
      }
      if (payRes.removedIds.length > 0) {
        await supabase.from('payments').delete().in('id', payRes.removedIds);
      }
      if (ledgerRes.removedIds.length > 0) {
        await supabase.from('ledger_entries').delete().in('id', ledgerRes.removedIds);
      }
      if (notifRes.removedIds.length > 0) {
        await supabase.from('notifications').delete().in('id', notifRes.removedIds);
      }
    } catch (err) {
      console.warn('Supabase remote deduplication warning:', err);
    }
  }

  const counts = {
    parties: partyRes.removedIds.length,
    stock: stockRes.removedIds.length,
    plateTypes: typeRes.removedIds.length,
    rentals: rentalRes.removedIds.length,
    rentalCycles: cycleRes.removedIds.length,
    returns: returnRes.removedIds.length,
    payments: payRes.removedIds.length,
    ledgerEntries: ledgerRes.removedIds.length,
    notifications: notifRes.removedIds.length,
  };

  const totalRemoved = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const details: string[] = [];

  if (counts.parties > 0) details.push(`Merged ${counts.parties} duplicate parties`);
  if (counts.stock > 0) details.push(`Removed ${counts.stock} duplicate stock entries`);
  if (counts.plateTypes > 0) details.push(`Removed ${counts.plateTypes} duplicate plate types`);
  if (counts.rentals > 0) details.push(`Removed ${counts.rentals} duplicate rental records`);
  if (counts.rentalCycles > 0) details.push(`Removed ${counts.rentalCycles} duplicate rental cycles`);
  if (counts.returns > 0) details.push(`Removed ${counts.returns} duplicate return entries`);
  if (counts.payments > 0) details.push(`Removed ${counts.payments} duplicate payment vouchers`);
  if (counts.ledgerEntries > 0) details.push(`Removed ${counts.ledgerEntries} duplicate ledger postings`);
  if (counts.notifications > 0) details.push(`Removed ${counts.notifications} duplicate notifications`);

  return { totalRemoved, counts, details };
}
