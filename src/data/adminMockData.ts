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
}

export interface PlateStock {
  plateType: string;
  dailyRate: number;
  total: number;
  withParties: number;
  available: number;
  status: 'available' | 'low_stock' | 'out_of_stock';
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
  paymentMode: 'Account 1' | 'Account 2' | 'Cash' | 'Udhari';
  status: 'active' | 'returned' | 'overdue';
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
}

export interface Payment {
  id: string;
  partyId: string;
  partyName: string;
  amount: number;
  date: string;
  paymentMode: 'Account 1' | 'Account 2' | 'Cash';
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
export const INITIAL_PARTIES: Party[] = [
  {
    id: 'party-1',
    name: 'Patil Construction',
    mobile: '9822001122',
    address: 'Near Shahu Maharaj Chowk, Kolhapur',
    notes: 'Premium developer. Prefers 24x3 and 18x3 plates.',
    platesWithParty: 400,
    totalRent: 18000,
    paid: 15000,
    pending: 3000,
    status: 'active',
  },
  {
    id: 'party-2',
    name: 'Kamble Builders',
    mobile: '7798003344',
    address: 'Opp. Railway Station, Miraj',
    notes: 'Requires delivery support. Rent cycles are usually 40 days.',
    platesWithParty: 250,
    totalRent: 11250,
    paid: 11250,
    pending: 0,
    status: 'active',
  },
  {
    id: 'party-3',
    name: 'Deshmukh & Sons',
    mobile: '9011223344',
    address: 'Rajendra Nagar, Kolhapur',
    notes: 'Ongoing commercial slab. Outstanding dues cleared monthly.',
    platesWithParty: 600,
    totalRent: 27000,
    paid: 20000,
    pending: 7000,
    status: 'active',
  },
  {
    id: 'party-4',
    name: 'Shinde Developers',
    mobile: '8888991122',
    address: 'Tarabai Park, Kolhapur',
    notes: 'Requires plates for small residential layouts.',
    platesWithParty: 0,
    totalRent: 8000,
    paid: 7250,
    pending: 750,
    status: 'active',
  },
];

export const INITIAL_PLATES: PlateStock[] = [
  { plateType: '24×3', dailyRate: 1.50, total: 1500, withParties: 450, available: 1050, status: 'available' },
  { plateType: '21×3', dailyRate: 1.50, total: 1200, withParties: 300, available: 900, status: 'available' },
  { plateType: '18×3', dailyRate: 1.50, total: 1000, withParties: 250, available: 750, status: 'available' },
  { plateType: '15×3', dailyRate: 1.50, total: 800, withParties: 150, available: 650, status: 'available' },
  { plateType: '12×3', dailyRate: 1.50, total: 600, withParties: 100, available: 500, status: 'available' },
  { plateType: '9×3', dailyRate: 1.50, total: 500, withParties: 0, available: 500, status: 'available' },
  { plateType: '6×3', dailyRate: 1.50, total: 400, withParties: 0, available: 400, status: 'available' },
];

export const INITIAL_RENTALS: Rental[] = [
  {
    id: 'rent-1',
    partyId: 'party-1',
    partyName: 'Patil Construction',
    plateType: '24×3',
    quantity: 300,
    dailyRate: 1.50,
    issueDate: '2026-08-01',
    days: 40,
    totalRent: 18000,
    paid: 15000,
    pending: 3000,
    paymentMode: 'Account 1',
    status: 'active',
  },
  {
    id: 'rent-2',
    partyId: 'party-2',
    partyName: 'Kamble Builders',
    plateType: '18×3',
    quantity: 250,
    dailyRate: 1.50,
    issueDate: '2026-08-10',
    days: 30,
    totalRent: 11250,
    paid: 11250,
    pending: 0,
    paymentMode: 'Cash',
    status: 'active',
  },
  {
    id: 'rent-3',
    partyId: 'party-3',
    partyName: 'Deshmukh & Sons',
    plateType: '21×3',
    quantity: 600,
    dailyRate: 1.50,
    issueDate: '2026-07-15',
    days: 45, // normal cycle is 40, 5 days extra
    totalRent: 40500, // 600 * 1.5 * 45
    paid: 30000,
    pending: 10500,
    paymentMode: 'Udhari',
    status: 'overdue',
  },
  {
    id: 'rent-4',
    partyId: 'party-4',
    partyName: 'Shinde Developers',
    plateType: '12×3',
    quantity: 100,
    dailyRate: 1.50,
    issueDate: '2026-06-01',
    days: 20,
    totalRent: 3000,
    paid: 3000,
    pending: 0,
    paymentMode: 'Account 2',
    status: 'returned',
  },
];

export const INITIAL_RETURNS: ReturnLog[] = [
  {
    id: 'ret-1',
    partyId: 'party-4',
    partyName: 'Shinde Developers',
    rentalId: 'rent-4',
    plateType: '12×3',
    issuedQuantity: 100,
    returnedQuantity: 100,
    remainingQuantity: 0,
    returnDate: '2026-06-21',
  },
];

export const INITIAL_PAYMENTS: Payment[] = [
  {
    id: 'pay-1',
    partyId: 'party-1',
    partyName: 'Patil Construction',
    amount: 15000,
    date: '2026-08-05',
    paymentMode: 'Account 1',
    reference: 'TXN88992019',
    notes: 'Initial advance payment for 300 plates of 24x3',
    status: 'verified',
  },
  {
    id: 'pay-2',
    partyId: 'party-2',
    partyName: 'Kamble Builders',
    amount: 11250,
    date: '2026-08-11',
    paymentMode: 'Cash',
    reference: 'CASH-9921',
    notes: 'Paid fully in cash at loading yard.',
    status: 'verified',
  },
  {
    id: 'pay-3',
    partyId: 'party-3',
    partyName: 'Deshmukh & Sons',
    amount: 20000,
    date: '2026-07-20',
    paymentMode: 'Account 2',
    reference: 'UPI90291029',
    notes: 'Partial payment on UPI.',
    status: 'verified',
  },
];

export const INITIAL_LEDGER: LedgerEntry[] = [
  // Party 1 Patil Construction Ledger
  {
    id: 'led-1',
    partyId: 'party-1',
    date: '2026-08-01',
    description: 'Rental Issued: 300 Plates of 24×3 for 40 days',
    debit: 18000,
    credit: 0,
    balance: 18000,
  },
  {
    id: 'led-2',
    partyId: 'party-1',
    date: '2026-08-05',
    description: 'Payment Received - Account 1 (Ref: TXN88992019)',
    debit: 0,
    credit: 15000,
    balance: 3000,
  },
  // Party 2 Kamble Builders Ledger
  {
    id: 'led-3',
    partyId: 'party-2',
    date: '2026-08-10',
    description: 'Rental Issued: 250 Plates of 18×3 for 30 days',
    debit: 11250,
    credit: 0,
    balance: 11250,
  },
  {
    id: 'led-4',
    partyId: 'party-2',
    date: '2026-08-11',
    description: 'Payment Received - Cash (Ref: CASH-9921)',
    debit: 0,
    credit: 11250,
    balance: 0,
  },
];

export const INITIAL_NOTIFICATIONS: AdminNotification[] = [
  {
    id: 'not-1',
    type: 'payment',
    title: 'Payment Outstanding',
    message: '🔴 Deshmukh & Sons — ₹10,500 rental payment is pending.',
    date: '2026-08-26 10:30',
    isRead: false,
  },
  {
    id: 'not-2',
    type: 'due',
    title: 'Rental Cycle Due',
    message: '🟠 Patil Construction — Shuttering plates cycle approaching 40 days.',
    date: '2026-08-27 08:15',
    isRead: false,
  },
  {
    id: 'not-3',
    type: 'return',
    title: 'Plates Return Alert',
    message: '🟡 Kamble Builders — 250 plates pending for return schedule.',
    date: '2026-08-27 12:00',
    isRead: true,
  },
  {
    id: 'not-4',
    type: 'stock',
    title: 'Stock Warning',
    message: '⚠️ 18×3 Plates — Available stock is less than 30%.',
    date: '2026-08-25 14:00',
    isRead: false,
  },
];
