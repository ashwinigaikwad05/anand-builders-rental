/**
 * MARATHI LOCALIZATION & FORMATTING UTILITIES
 * Specifically designed for Anand Builders & Developers Centering Plates System.
 */

// Devanagari numerals mapping (0-9 -> ०-९)
export const DEVANAGARI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

/**
 * Converts Western digits (0-9) to Devanagari Marathi digits (०-९)
 */
export function toMarathiDigits(input: number | string): string {
  if (input === null || input === undefined) return '';
  return String(input).replace(/[0-9]/g, (digit) => DEVANAGARI_DIGITS[Number(digit)] || digit);
}

/**
 * Converts Devanagari digits (०-९) to Western digits (0-9)
 */
export function fromMarathiDigits(input: string): string {
  if (!input) return '';
  return input.replace(/[०-९]/g, (char) => {
    const idx = DEVANAGARI_DIGITS.indexOf(char);
    return idx !== -1 ? String(idx) : char;
  });
}

/**
 * Format Indian Currency in Marathi format
 * e.g. 12000 -> "₹12,000" or with Devanagari digits "₹१२,०००"
 */
export function formatMarathiCurrency(amount: number, useDevanagari = false): string {
  const num = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  const formatted = num.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: num % 1 !== 0 ? 2 : 0,
  });
  const res = `₹${formatted}`;
  return useDevanagari ? toMarathiDigits(res) : res;
}

/**
 * Format Date to Marathi standard format (DD/MM/YYYY)
 */
export function formatMarathiDate(dateStr?: string | null, useDevanagari = false): string {
  if (!dateStr || dateStr.trim() === '' || dateStr === '-') return '-';
  try {
    // If it contains 'T' or space, take only the date portion
    const cleanDate = dateStr.trim().split(/[T ]/)[0];
    const parts = cleanDate.split(/[-/]/);
    if (parts.length === 3) {
      let [p1, p2, p3] = parts;
      let d = p3;
      let m = p2;
      let y = p1;
      // If it is already in DD/MM/YYYY or DD-MM-YYYY format
      if (p1.length <= 2 && p3.length === 4) {
        d = p1;
        m = p2;
        y = p3;
      }
      const formatted = `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
      return useDevanagari ? toMarathiDigits(formatted) : formatted;
    }
    const dObj = new Date(dateStr);
    if (!isNaN(dObj.getTime())) {
      const day = String(dObj.getDate()).padStart(2, '0');
      const month = String(dObj.getMonth() + 1).padStart(2, '0');
      const year = dObj.getFullYear();
      const formatted = `${day}/${month}/${year}`;
      return useDevanagari ? toMarathiDigits(formatted) : formatted;
    }
  } catch {
    // fallback
  }
  return dateStr;
}

/**
 * Format Date Range (e.g. "29/09/2026 → 08/11/2026")
 */
export function formatDateRange(
  startDate?: string | null,
  endDate?: string | null,
  useDevanagari = false
): string {
  if (!startDate && !endDate) return '-';
  return `${formatMarathiDate(startDate, useDevanagari)} → ${formatMarathiDate(endDate, useDevanagari)}`;
}

/**
 * Format Indian Phone number cleanly (e.g. "9876543210" -> "98765 43210")
 */
export function formatPhoneNumber(mobile?: string): string {
  if (!mobile) return '';
  const digits = mobile.replace(/\D/g, '').slice(-10);
  if (digits.length === 10) {
    return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return mobile;
}

/**
 * Format duration in Marathi
 * e.g. 40 -> "४० दिवस" (or "40 दिवस")
 */
export function formatMarathiDuration(days: number, useDevanagari = false): string {
  const d = Math.max(0, days || 0);
  return `${useDevanagari ? toMarathiDigits(d) : d} दिवस`;
}

/**
 * Format plate quantity in Marathi
 * e.g. 100 -> "१०० नग" (or "100 नग")
 */
export function formatMarathiQuantity(qty: number, useDevanagari = false): string {
  const q = Math.max(0, qty || 0);
  return `${useDevanagari ? toMarathiDigits(q) : q} नग`;
}

/**
 * Format Serial Customer Number in Marathi
 * e.g. 1 -> "ग्राहक #१" (or "ग्राहक #1")
 */
export function formatMarathiCustomer(custNum: number, useDevanagari = false): string {
  return `ग्राहक #${useDevanagari ? toMarathiDigits(custNum) : custNum}`;
}

/**
 * Format Serial Bill Number in Marathi
 * e.g. 3 -> "बिल #३" (or "बिल #3")
 */
export function formatMarathiBill(billNum: number, useDevanagari = false): string {
  return `बिल #${useDevanagari ? toMarathiDigits(billNum) : billNum}`;
}

/**
 * Format Cycle Number in Marathi
 * e.g. 4 -> "सायकल ४" (or "सायकल 4")
 */
export function formatMarathiCycle(cycleNum: number, useDevanagari = false): string {
  return `सायकल ${useDevanagari ? toMarathiDigits(cycleNum) : cycleNum}`;
}

/**
 * Translate payment mode to pure Marathi or pure English
 */
export function getMarathiPaymentMode(mode?: string, lang: 'marathi' | 'english' = 'marathi'): string {
  if (!mode) return lang === 'marathi' ? 'बाकी' : 'Outstanding';
  const lower = mode.toLowerCase();
  if (lower === 'account 1' || lower.includes('bank') || lower.includes('बँक')) {
    return lang === 'marathi' ? 'खाते १ (मुख्य बँक)' : 'Account 1 (Main Bank)';
  }
  if (lower === 'account 2' || lower.includes('upi') || lower.includes('digital') || lower.includes('डिजिटल')) {
    return lang === 'marathi' ? 'खाते २ (UPI / डिजिटल)' : 'Account 2 (UPI / Digital)';
  }
  if (lower === 'cash' || lower.includes('रोख')) {
    return lang === 'marathi' ? 'रोख' : 'Cash';
  }
  if (lower === 'cheque' || lower.includes('चेक')) {
    return lang === 'marathi' ? 'चेक' : 'Cheque';
  }
  if (lower === 'outstanding' || lower === 'udhari' || lower.includes('बाकी')) {
    return lang === 'marathi' ? 'बाकी' : 'Outstanding';
  }
  return mode;
}

/**
 * Translate rental / return status to pure Marathi or pure English
 */
export function getMarathiStatus(status?: string, lang: 'marathi' | 'english' = 'marathi'): { label: string; textClass: string; bgClass: string } {
  if (!status) return { label: lang === 'marathi' ? 'सक्रिय' : 'Active', textClass: 'text-emerald-700', bgClass: 'bg-emerald-50 border-emerald-200' };
  const s = status.toLowerCase();
  if (s === 'overdue' || s.includes('थकबाकी') || s.includes('मुदत')) {
    return { label: lang === 'marathi' ? 'मुदत संपली' : 'Overdue', textClass: 'text-rose-700', bgClass: 'bg-rose-100 border-rose-300' };
  }
  if (s === 'returned' || s === 'completed' || s.includes('जमा')) {
    return { label: lang === 'marathi' ? 'साहित्य जमा' : 'Returned', textClass: 'text-slate-600', bgClass: 'bg-slate-100 border-slate-200' };
  }
  return { label: lang === 'marathi' ? 'सक्रिय' : 'Active', textClass: 'text-emerald-700', bgClass: 'bg-emerald-50 border-emerald-200' };
}

export interface RentalSearchTarget {
  id?: string;
  billNumber?: number | string | null;
  customerNumber?: number | string | null;
  partyName?: string | null;
  plateType?: string | null;
  quantity?: number;
  items?: Array<{ plateType: string }>;
  notes?: string | null;
  party?: {
    id?: string;
    name?: string | null;
    mobile?: string | null;
    address?: string | null;
    notes?: string | null;
    customerNumber?: number | null;
  } | null;
}

/**
 * Searches and matches a rental record across:
 * 1. Bill Number (exact number, #number, bill number, बिल नंबर, Marathi digits १, alphanumeric)
 * 2. Customer Name & Serial (partyName, customer number, phone)
 * 3. Site Name / Delivery Address (party address, notes, site location)
 * 4. Plate Size / Item types (24x3, 21x3)
 */
export function matchRentalSearch(rental: RentalSearchTarget, queryRaw?: string): boolean {
  if (!queryRaw || !queryRaw.trim()) return true;

  const raw = queryRaw.trim();
  const lower = raw.toLowerCase();
  const western = fromMarathiDigits(lower);

  const billStr = rental.billNumber !== undefined && rental.billNumber !== null ? String(rental.billNumber).trim() : '';
  const billLower = billStr.toLowerCase();

  const custNum =
    rental.party?.customerNumber !== undefined && rental.party?.customerNumber !== null
      ? rental.party.customerNumber
      : rental.customerNumber && Number(rental.customerNumber) > 0
      ? Number(rental.customerNumber)
      : null;
  const custNumStr = custNum !== null ? String(custNum) : '';

  const partyName = (rental.partyName || '').trim().toLowerCase();
  const officialName = (rental.party?.name || '').trim().toLowerCase();
  const siteAddress = (rental.party?.address || '').trim().toLowerCase();
  const mobile = (rental.party?.mobile || '').replace(/\D/g, '');
  const allNotes = `${rental.notes || ''} ${rental.party?.notes || ''}`.trim().toLowerCase();

  const plateType = (rental.plateType || '').trim().toLowerCase();
  const itemSizes = (rental.items || []).map((i) => (i.plateType || '').trim().toLowerCase());
  const normPlate = plateType.replace(/[*×]/g, 'x');
  const normItemSizes = itemSizes.map((s) => s.replace(/[*×]/g, 'x'));

  // 1. Check for Explicit Bill-specific queries: e.g. "bill 4", "bill #4", "बिल 4", "बिल #4", "#4"
  const isExplicitBillQuery = /^(बिल\s*(नं|क्र)?\.?|bill|b\b|#)/i.test(western);
  const cleanedBillQuery = western
    .replace(/^(बिल\s*(नं|क्र)?\.?|bill|b)\s*#?\s*/i, '')
    .replace(/^#\s*/, '')
    .trim();

  if (isExplicitBillQuery && cleanedBillQuery) {
    if (
      billLower === cleanedBillQuery ||
      (cleanedBillQuery.length >= 2 && billLower.startsWith(cleanedBillQuery)) ||
      billLower.includes(cleanedBillQuery)
    ) {
      return true;
    }
    return false;
  }

  // 2. Explicit Customer-specific query: e.g. "ग्राहक 1", "cust #1", "cust 1", "customer 1"
  const isExplicitCustQuery = /^(ग्राहक|cust(omer)?|c\b)\s*#?\s*/i.test(western);
  const cleanedCustQuery = western
    .replace(/^(ग्राहक|cust(omer)?|c)\s*#?\s*/i, '')
    .replace(/^#\s*/, '')
    .trim();

  if (isExplicitCustQuery && cleanedCustQuery) {
    if (custNumStr === cleanedCustQuery) {
      return true;
    }
    return false;
  }

  // 3. Explicit Site-specific query: e.g. "site kolhapur", "साइट कोल्हापूर"
  const isExplicitSiteQuery = /^(site|साइट|ठिकाण)\s*[:\-]?\s*/i.test(lower);
  const cleanedSiteQuery = lower.replace(/^(site|साइट|ठिकाण)\s*[:\-]?\s*/i, '').trim();

  if (isExplicitSiteQuery && cleanedSiteQuery) {
    if (siteAddress.includes(cleanedSiteQuery) || siteAddress.includes(fromMarathiDigits(cleanedSiteQuery))) {
      return true;
    }
    return false;
  }

  // 4. Bill Number match (numeric, alphanumeric, e.g. "AN-2026/05", "101", "4")
  if (
    billLower &&
    (billLower === lower ||
      billLower === western ||
      billLower.startsWith(lower) ||
      billLower.startsWith(western) ||
      billLower.includes(lower) ||
      billLower.includes(western))
  ) {
    return true;
  }

  // 5. Customer Number / Serial match (e.g. "1", "2")
  if (custNumStr && (custNumStr === lower || custNumStr === western)) {
    return true;
  }

  // 6. Mobile number match
  if (western.length >= 3 && /^\d+$/.test(western) && mobile.includes(western)) {
    return true;
  }

  // 7. Customer Name match: e.g. "Patil", "Sai"
  if (
    partyName.includes(lower) ||
    partyName.includes(western) ||
    officialName.includes(lower) ||
    officialName.includes(western)
  ) {
    return true;
  }

  // 6. Site Name / Address match: e.g. "Kolhapur", "Kadamwadi", "Site 1"
  if (siteAddress.includes(lower) || siteAddress.includes(western)) {
    return true;
  }

  // 7. Notes match
  if (allNotes.includes(lower) || allNotes.includes(western)) {
    return true;
  }

  // 8. Plate Size / Item type match: e.g. "24x3", "21x3", "24*3", "24×3"
  const normSizeQuery = lower.replace(/[*×]/g, 'x');
  if (lower.includes('x') || lower.includes('*') || lower.includes('×')) {
    if (normPlate.includes(normSizeQuery) || normItemSizes.some((s) => s.includes(normSizeQuery))) {
      return true;
    }
  } else if (normPlate === normSizeQuery || normItemSizes.includes(normSizeQuery)) {
    return true;
  }

  // 9. Multi-token match: If user typed multiple words e.g. "patil 4", "patil kolhapur", "bill 3 patil"
  const tokens = western.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    const allTokensMatch = tokens.every((tok) => {
      const cleanTokBill = tok.replace(/^(बिल\s*(नं|क्र)?\.?|bill|b)\s*#?\s*/i, '').replace(/^#\s*/, '').trim();
      const cleanTokCust = tok.replace(/^(ग्राहक|cust(omer)?|c)\s*#?\s*/i, '').replace(/^#\s*/, '').trim();

      if (
        tok === 'bill' ||
        tok === 'बिल' ||
        tok === 'b' ||
        tok === 'ग्राहक' ||
        tok === 'cust' ||
        tok === 'customer' ||
        tok === 'site' ||
        tok === 'साइट'
      ) {
        return true;
      }
      if (cleanTokBill && (billLower === cleanTokBill || billLower.startsWith(cleanTokBill))) {
        return true;
      }
      if (cleanTokCust && custNumStr === cleanTokCust) {
        return true;
      }
      if (partyName.includes(tok) || officialName.includes(tok)) {
        return true;
      }
      if (siteAddress.includes(tok)) {
        return true;
      }
      const isPlateTok = tok.includes('x') || tok.includes('*') || tok.includes('×');
      const normTokSize = tok.replace(/[*×]/g, 'x');
      if (isPlateTok) {
        if (normPlate.includes(normTokSize) || normItemSizes.some((s) => s.includes(normTokSize))) {
          return true;
        }
      } else if (normPlate === normTokSize || normItemSizes.includes(normTokSize)) {
        return true;
      }
      if (allNotes.includes(tok)) {
        return true;
      }
      if (tok.length >= 3 && mobile.includes(tok)) {
        return true;
      }
      return false;
    });

    if (allTokensMatch) return true;
  }

  return false;
}

