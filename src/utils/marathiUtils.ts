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
 * Translate payment mode to Marathi standard
 */
export function getMarathiPaymentMode(mode?: string): string {
  if (!mode) return 'बाकी (Outstanding)';
  const lower = mode.toLowerCase();
  if (lower === 'account 1' || lower.includes('bank')) return 'खाते १ (बँक)';
  if (lower === 'account 2' || lower.includes('upi') || lower.includes('digital')) return 'खाते २ (UPI / डिजिटल)';
  if (lower === 'cash' || lower.includes('रोख')) return 'रोख (Cash)';
  if (lower === 'outstanding' || lower === 'udhari' || lower.includes('बाकी')) return 'बाकी (Outstanding)';
  return mode;
}

/**
 * Translate rental / return status to Marathi
 */
export function getMarathiStatus(status?: string): { label: string; textClass: string; bgClass: string } {
  if (!status) return { label: 'सक्रिय', textClass: 'text-emerald-700', bgClass: 'bg-emerald-50 border-emerald-200' };
  const s = status.toLowerCase();
  if (s === 'overdue' || s.includes('थकबाकी') || s.includes('मुदत')) {
    return { label: 'मुदत संपली (Overdue)', textClass: 'text-rose-700', bgClass: 'bg-rose-100 border-rose-300' };
  }
  if (s === 'returned' || s === 'completed' || s.includes('जमा')) {
    return { label: 'साहित्य जमा (Returned)', textClass: 'text-slate-600', bgClass: 'bg-slate-100 border-slate-200' };
  }
  return { label: 'सक्रिय (Active)', textClass: 'text-emerald-700', bgClass: 'bg-emerald-50 border-emerald-200' };
}
