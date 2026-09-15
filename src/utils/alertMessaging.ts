export type CycleAlertStatusType =
  | '7_days'
  | '5_days'
  | '3_days'
  | '2_days'
  | '1_day'
  | '40_completed'
  | 'overdue';

export function getCleanPhoneNumber(mobile: string): { telLink: string; whatsappPhone: string } {
  const digits = (mobile || '').replace(/\D/g, '');
  const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
  const whatsappPhone = last10 ? `91${last10}` : '';
  const telLink = last10 ? `tel:+91${last10}` : `tel:${mobile}`;
  return { telLink, whatsappPhone };
}

export function determineCycleAlertStatus(daysLeft: number): {
  statusType: CycleAlertStatusType;
  statusLabel: string;
  badgeColorClass: string;
  isCompleted40: boolean;
  isOverdue: boolean;
} {
  if (daysLeft < 0) {
    const extraDays = Math.abs(daysLeft);
    return {
      statusType: 'overdue',
      statusLabel: `Overdue after 40 days (+${extraDays}d)`,
      badgeColorClass: 'bg-rose-100 text-rose-800 border-rose-200',
      isCompleted40: false,
      isOverdue: true,
    };
  }

  if (daysLeft === 0) {
    return {
      statusType: '40_completed',
      statusLabel: '40 Days Completed',
      badgeColorClass: 'bg-purple-100 text-purple-900 border-purple-300 font-extrabold',
      isCompleted40: true,
      isOverdue: false,
    };
  }

  if (daysLeft === 1) {
    return {
      statusType: '1_day',
      statusLabel: '1 Day Remaining',
      badgeColorClass: 'bg-amber-100 text-amber-900 border-amber-300',
      isCompleted40: false,
      isOverdue: false,
    };
  }

  if (daysLeft <= 2) {
    return {
      statusType: '2_days',
      statusLabel: '2 Days Remaining',
      badgeColorClass: 'bg-amber-100 text-amber-900 border-amber-300',
      isCompleted40: false,
      isOverdue: false,
    };
  }

  if (daysLeft <= 3) {
    return {
      statusType: '3_days',
      statusLabel: '3 Days Remaining',
      badgeColorClass: 'bg-amber-100 text-amber-800 border-amber-200',
      isCompleted40: false,
      isOverdue: false,
    };
  }

  if (daysLeft <= 5) {
    return {
      statusType: '5_days',
      statusLabel: '5 Days Remaining',
      badgeColorClass: 'bg-amber-50 text-amber-800 border-amber-200',
      isCompleted40: false,
      isOverdue: false,
    };
  }

  return {
    statusType: '7_days',
    statusLabel: '7 Days Remaining',
    badgeColorClass: 'bg-blue-100 text-blue-800 border-blue-200',
    isCompleted40: false,
    isOverdue: false,
  };
}

export function buildWhatsAppMessage(
  partyName: string,
  cycleNumber: number,
  statusType: CycleAlertStatusType,
  daysLeft: number,
  extraDays: number
): string {
  if (statusType === '40_completed') {
    return `Hello ${partyName}, your shuttering plate rental cycle of 40 days has been completed. Please contact us regarding return or renewal of the plates. Thank you.`;
  }

  if (statusType === 'overdue') {
    return `Hello ${partyName}, your shuttering plate rental cycle (Cycle ${cycleNumber}) is overdue by ${extraDays} days past the 40-day cycle term. Please contact us regarding return or renewal of the plates. Thank you.`;
  }

  const d = Math.max(1, daysLeft);
  return `Hello ${partyName}, your shuttering plate rental cycle (Cycle ${cycleNumber}) has ${d} day${d === 1 ? '' : 's'} remaining out of 40 days. Please contact us regarding return or renewal of the plates. Thank you.`;
}

export function buildWhatsAppUrl(
  mobile: string,
  partyName: string,
  cycleNumber: number,
  statusType: CycleAlertStatusType,
  daysLeft: number,
  extraDays: number
): string {
  const { whatsappPhone } = getCleanPhoneNumber(mobile);
  const msg = buildWhatsAppMessage(partyName, cycleNumber, statusType, daysLeft, extraDays);
  if (!whatsappPhone) return '#';
  return `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(msg)}`;
}

export function buildGeneralPartyWhatsAppUrl(mobile: string, partyName: string): string {
  const { whatsappPhone } = getCleanPhoneNumber(mobile);
  if (!whatsappPhone) return '#';
  const msg = `Hello ${partyName}, greeting from Anand Builders Shuttering Material Service. Please contact us regarding your rental account and shuttering plates. Thank you.`;
  return `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(msg)}`;
}
