export interface Party {
  id: string;
  name: string;
  mobile: string;
  address: string;
  notes: string;
  platesWithParty: number;
  totalRent: number;
  paid: number;
  pending: number;
  status: 'active' | 'inactive';
  photoUrl?: string | null;
  aadhaarUrl?: string | null;
  chequeUrl?: string | null;
  customerNumber?: number;
}

export interface PlateStock {
  plateType: string;
  dailyRate: number;
  total: number;
  withParties: number;
  available: number;
  status: 'available' | 'low_stock' | 'out_of_stock';
}

export interface RentalItem {
  plateType: string;
  quantity: number;
  dailyRate: number;
  days: number;
}

export interface RentalCycle {
  id: string;
  rentalId: string;
  partyId: string;
  cycleNumber: number;
  startDate: string;
  expectedEndDate: string;
  actualEndDate?: string | null;
  days: number;
  extraDays: number;
  dailyRate: number;
  quantity: number;
  baseRent: number;
  extraAmount: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  status: 'active' | 'completed';
  notes?: string | null;
  items?: RentalItem[];
}

export interface Rental {
  id: string;
  partyId: string;
  partyName: string;
  plateType: string;
  quantity: number;
  dailyRate: number;
  issueDate: string;
  days: number;
  totalRent: number;
  paid: number;
  pending: number;
  paymentMode: 'Account 1' | 'Account 2' | 'Cash' | 'Outstanding' | 'Udhari';
  status: 'active' | 'returned' | 'overdue';
  items?: RentalItem[];
  currentCycleNumber?: number;
  currentCycleStartDate?: string;
  currentCycleEndDate?: string;
  cycles?: RentalCycle[];
  billNumber?: number;
  customerNumber?: number;
}

export interface ReturnLog {
  id: string;
  partyId: string;
  partyName: string;
  rentalId: string;
  plateType: string;
  issuedQuantity: number;
  returnedQuantity: number;
  remainingQuantity: number;
  returnDate: string;
  collectedAmount?: number;
  paymentMode?: string;
  penaltyAmount?: number;
}

export interface Payment {
  id: string;
  partyId: string;
  partyName: string;
  rentalId?: string | null;
  cycleId?: string | null;
  cycleNumber?: number | null;
  amount: number;
  date: string;
  paymentMode: 'Account 1' | 'Account 2' | 'Cash' | 'Outstanding';
  reference: string;
  notes: string;
  status: 'verified' | 'pending';
}

export interface LedgerEntry {
  id: string;
  partyId: string;
  date: string;
  description: string;
  debit: number; // Charges incurred
  credit: number; // Payments made
  balance: number; // Running balance
}

export interface AdminNotification {
  id: string;
  type: 'payment' | 'due' | 'return' | 'partial' | 'stock';
  title: string;
  message: string;
  date: string;
  isRead: boolean;
}

// Initial Mock Data
export const INITIAL_PARTIES: Party[] = [];

export const INITIAL_PLATES: PlateStock[] = [
  { plateType: '24×3', dailyRate: 1.50, total: 0, withParties: 0, available: 0, status: 'available' },
  { plateType: '21×3', dailyRate: 1.50, total: 0, withParties: 0, available: 0, status: 'available' },
  { plateType: '18×3', dailyRate: 1.50, total: 0, withParties: 0, available: 0, status: 'available' },
  { plateType: '15×3', dailyRate: 1.50, total: 0, withParties: 0, available: 0, status: 'available' },
  { plateType: '12×3', dailyRate: 1.50, total: 0, withParties: 0, available: 0, status: 'available' },
  { plateType: '9×3', dailyRate: 1.50, total: 0, withParties: 0, available: 0, status: 'available' },
  { plateType: '6×3', dailyRate: 1.50, total: 0, withParties: 0, available: 0, status: 'available' },
];

export const INITIAL_RENTALS: Rental[] = [];

export const INITIAL_RETURNS: ReturnLog[] = [];

export const INITIAL_PAYMENTS: Payment[] = [];

export const INITIAL_LEDGER: LedgerEntry[] = [];

export const INITIAL_NOTIFICATIONS: AdminNotification[] = [];
