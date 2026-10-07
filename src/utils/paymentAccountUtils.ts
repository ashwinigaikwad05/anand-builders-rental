import { useState, useEffect } from 'react';

export interface StoredAccountNames {
  account1: string;
  account2: string;
  cash: string;
  cleanAccount1: string;
  cleanAccount2: string;
  cleanCash: string;
}

/**
 * Strips legacy 'Account 1', 'Account 2', 'Acc 1', 'Acc 2', 'खाते १', 'खाते २' prefixes
 * so custom names like "Account 1 Ravi" or "Ravi" display cleanly as "Ravi" everywhere.
 */
export function cleanAccountName(name: string, fallback: string): string {
  if (!name || !name.trim()) return fallback;
  const trimmed = name.trim();
  // Legacy system default placeholders
  if (
    trimmed === 'Account 1 (Main Bank)' ||
    trimmed === 'Account 1 (Bank Direct)' ||
    trimmed.toLowerCase() === 'account 1' ||
    trimmed.toLowerCase() === 'acc 1' ||
    trimmed.toLowerCase() === 'acc1' ||
    trimmed === 'खाते १' ||
    trimmed === 'खाते १ (मुख्य बँक)'
  ) {
    return fallback;
  }
  if (
    trimmed === 'Account 2 (UPI / Digital)' ||
    trimmed === 'Account 2 (Digital)' ||
    trimmed.toLowerCase() === 'account 2' ||
    trimmed.toLowerCase() === 'acc 2' ||
    trimmed.toLowerCase() === 'acc2' ||
    trimmed === 'खाते २' ||
    trimmed === 'खाते २ (डिजिटल)'
  ) {
    return fallback;
  }
  if (trimmed === 'Cash (Yard Drawer)' || trimmed === 'Yard Drawer Cash') return 'Cash';

  // Strip prefix e.g. "Account 1 Ravi" -> "Ravi", "Account 2 Nilesh" -> "Nilesh", "खाते १ रवी" -> "रवी"
  const stripped = trimmed
    .replace(/^(Account\s*[12]\s*[:\-–]?\s*|खाते\s*[१२]\s*[:\-–]?\s*|acc\s*[12]\s*[:\-–]?\s*)/i, '')
    .trim();

  if (stripped.length > 0) {
    return stripped;
  }
  return fallback;
}

export function getStoredAccountNames(): StoredAccountNames {
  let raw1 = '';
  let raw2 = '';
  let rawCash = '';

  if (typeof window !== 'undefined') {
    raw1 = localStorage.getItem('anand_acc1_name') || '';
    raw2 = localStorage.getItem('anand_acc2_name') || '';
    rawCash = localStorage.getItem('anand_cash_name') || '';
  }

  // Fallback to bankName from bill template if available
  let defaultBank1 = 'बँक १';
  if (typeof window !== 'undefined') {
    try {
      const rawBill = localStorage.getItem('anand_bill_config');
      if (rawBill) {
        const parsed = JSON.parse(rawBill);
        if (parsed.bankName && typeof parsed.bankName === 'string' && parsed.bankName.trim()) {
          defaultBank1 = parsed.bankName.trim();
        }
      }
    } catch {
      // Ignore JSON error
    }
  }

  const clean1 = cleanAccountName(raw1, defaultBank1);
  const clean2 = cleanAccountName(raw2, 'बँक २');
  const cleanC = cleanAccountName(rawCash, 'कॅश');

  // Sanitize stored values in localStorage if they contained prefixes like "Account 1 Ravi"
  if (typeof window !== 'undefined') {
    if (raw1 && raw1 !== clean1) {
      localStorage.setItem('anand_acc1_name', clean1);
    }
    if (raw2 && raw2 !== clean2) {
      localStorage.setItem('anand_acc2_name', clean2);
    }
  }

  return {
    account1: clean1,
    account2: clean2,
    cash: cleanC,
    cleanAccount1: clean1,
    cleanAccount2: clean2,
    cleanCash: cleanC,
  };
}

export function saveStoredAccountNames(account1: string, account2: string, cash: string) {
  const clean1 = cleanAccountName(account1, 'बँक १');
  const clean2 = cleanAccountName(account2, 'बँक २');
  const cleanC = cleanAccountName(cash, 'कॅश');

  localStorage.setItem('anand_acc1_name', clean1);
  localStorage.setItem('anand_acc2_name', clean2);
  localStorage.setItem('anand_cash_name', cleanC);
  window.dispatchEvent(new Event('anand_accounts_updated'));
}

export function getDisplayAccountName(mode?: string, lang: 'marathi' | 'english' = 'marathi'): string {
  if (!mode) return '';
  const names = getStoredAccountNames();
  const lower = mode.toLowerCase();
  if (lower === 'account 1' || lower === 'acc 1' || lower === 'acc1' || lower.includes('account 1') || lower.includes('खाते १')) {
    if (names.cleanAccount1 && names.cleanAccount1 !== 'बँक १') {
      return names.cleanAccount1;
    }
    return typeof window !== 'undefined'
      ? names.cleanAccount1 || 'बँक १'
      : (lang === 'marathi' ? 'खाते १ (मुख्य बँक)' : 'Account 1 (Main Bank)');
  }
  if (lower === 'account 2' || lower === 'acc 2' || lower === 'acc2' || lower.includes('account 2') || lower.includes('खाते २')) {
    if (names.cleanAccount2 && names.cleanAccount2 !== 'बँक २') {
      return names.cleanAccount2;
    }
    return typeof window !== 'undefined'
      ? names.cleanAccount2 || 'बँक २'
      : (lang === 'marathi' ? 'खाते २ (डिजिटल)' : 'Account 2 (UPI / Digital)');
  }
  if (lower === 'cash' || lower.includes('रोख') || lower.includes('कॅश')) {
    if (typeof window !== 'undefined' && names.cleanCash) {
      return names.cleanCash;
    }
    return lang === 'marathi' ? 'रोख' : 'Cash';
  }
  return mode;
}

export function useAccountNames(): StoredAccountNames {
  const [names, setNames] = useState<StoredAccountNames>(getStoredAccountNames);

  useEffect(() => {
    const handleUpdate = () => {
      setNames(getStoredAccountNames());
    };
    window.addEventListener('anand_accounts_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('anand_accounts_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  return names;
}
