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
  aadhaarBackUrl?: string | null;
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
  billNumber?: number | string;
  customerNumber?: number | string;
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
  refundAmount?: number;
  paymentMode?: string;
  penaltyAmount?: number;
  penaltyType?: string;
  daysKept?: number;
  batchRent?: number;
}

export interface PenaltyTypeOption {
  id: string;
  labelMr: string;
  labelEn: string;
  icon: string;
  descMr: string;
  descEn: string;
}

export const PENALTY_TYPES: PenaltyTypeOption[] = [
  {
    id: 'damage',
    labelMr: 'तुटफूट / नुकसान',
    labelEn: 'Damage / Broken',
    icon: '🔨',
    descMr: 'साहित्य तुटफूट किंवा नुकसान भरपाई',
    descEn: 'Damaged or broken shuttering material',
  },
  {
    id: 'lost',
    labelMr: 'साहित्य गहाळ / हरवणे',
    labelEn: 'Lost / Missing',
    icon: '❌',
    descMr: 'साईटवरून साहित्य चोरी किंवा हरवणे',
    descEn: 'Missing or lost items from site',
  },
  {
    id: 'late',
    labelMr: 'लेट फी / विलंब दंड',
    labelEn: 'Late Return Fee',
    icon: '⏱️',
    descMr: 'मुदतीपेक्षा जास्त दिवस विलंबाचा दंड',
    descEn: 'Overdue return penalty fee',
  },
  {
    id: 'bent',
    labelMr: 'बेंडिंग / दुरुस्ती खर्च',
    labelEn: 'Bent / Repair',
    icon: '🔧',
    descMr: 'प्लेट वाकणे किंवा सरळ करण्याचा दुरुस्ती खर्च',
    descEn: 'Bent plates straightening repair charges',
  },
  {
    id: 'cleaning',
    labelMr: 'सिमेंट सफाई / स्क्रॅपिंग',
    labelEn: 'Cleaning / Scraping',
    icon: '🧹',
    descMr: 'प्लेट्सवर सिमेंट साचल्यामुळे सफाई खर्च',
    descEn: 'Concrete scraping and cleaning charges',
  },
  {
    id: 'transport',
    labelMr: 'वाहतूक / हमाली दंड',
    labelEn: 'Transport / Labor',
    icon: '🚚',
    descMr: 'अतिरिक्त वाहतूक किंवा लेबर आकारणी',
    descEn: 'Additional transport or handling charges',
  },
  {
    id: 'other',
    labelMr: 'इतर आकारणी',
    labelEn: 'Other Penalty',
    icon: '📝',
    descMr: 'इतर कोणताही अतिरिक्त दंड किंवा शुल्क',
    descEn: 'Other penalty or custom surcharge',
  },
];

export const getPenaltyTypeLabel = (typeId?: string, isMarathi = true): string => {
  if (!typeId) return isMarathi ? 'दंड आकारणी' : 'Penalty';
  const found = PENALTY_TYPES.find((p) => p.id === typeId || p.labelMr === typeId || p.labelEn === typeId);
  if (found) {
    return isMarathi ? found.labelMr : found.labelEn;
  }
  return typeId;
};

export interface Payment {
  id: string;
  partyId: string;
  partyName: string;
  rentalId?: string | null;
  cycleId?: string | null;
  cycleNumber?: number | null;
  amount: number;
  penaltyAmount?: number;
  penaltyType?: string;
  date: string;
  paymentMode: 'Account 1' | 'Account 2' | 'Cash' | 'Outstanding';
  reference: string;
  notes: string;
  status: 'verified' | 'pending';
  type?: 'payment' | 'refund';
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
