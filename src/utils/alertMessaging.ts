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

export function determineCycleAlertStatus(daysLeft: number, targetDays = 40): {
  statusType: CycleAlertStatusType;
  statusLabel: string;
  statusLabelMr: string;
  badgeColorClass: string;
  isCompleted40: boolean;
  isOverdue: boolean;
} {
  if (daysLeft < 0) {
    const extraDays = Math.abs(daysLeft);
    return {
      statusType: 'overdue',
      statusLabel: `Overdue (+${extraDays}d)`,
      statusLabelMr: `मुदत संपली (+${extraDays} दिवस)`,
      badgeColorClass: 'bg-rose-100 text-rose-800 border-rose-300 font-extrabold',
      isCompleted40: false,
      isOverdue: true,
    };
  }

  if (daysLeft === 0) {
    return {
      statusType: '40_completed',
      statusLabel: `${targetDays} Days Completed`,
      statusLabelMr: `${targetDays} दिवस पूर्ण (आज)`,
      badgeColorClass: 'bg-purple-100 text-purple-900 border-purple-300 font-extrabold',
      isCompleted40: true,
      isOverdue: false,
    };
  }

  if (daysLeft === 1) {
    return {
      statusType: '1_day',
      statusLabel: '1 Day Remaining',
      statusLabelMr: '१ दिवस बाकी',
      badgeColorClass: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
      isCompleted40: false,
      isOverdue: false,
    };
  }

  if (daysLeft <= 2) {
    return {
      statusType: '2_days',
      statusLabel: `${daysLeft} Days Remaining`,
      statusLabelMr: `${daysLeft} दिवस बाकी`,
      badgeColorClass: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
      isCompleted40: false,
      isOverdue: false,
    };
  }

  if (daysLeft <= 3) {
    return {
      statusType: '3_days',
      statusLabel: `${daysLeft} Days Remaining`,
      statusLabelMr: `${daysLeft} दिवस बाकी`,
      badgeColorClass: 'bg-amber-100 text-amber-800 border-amber-200 font-semibold',
      isCompleted40: false,
      isOverdue: false,
    };
  }

  if (daysLeft <= 5) {
    return {
      statusType: '5_days',
      statusLabel: `${daysLeft} Days Remaining`,
      statusLabelMr: `${daysLeft} दिवस बाकी`,
      badgeColorClass: 'bg-amber-50 text-amber-800 border-amber-200 font-semibold',
      isCompleted40: false,
      isOverdue: false,
    };
  }

  if (daysLeft <= 7) {
    return {
      statusType: '7_days',
      statusLabel: `${daysLeft} Days Remaining`,
      statusLabelMr: `${daysLeft} दिवस बाकी`,
      badgeColorClass: 'bg-blue-100 text-blue-800 border-blue-200 font-semibold',
      isCompleted40: false,
      isOverdue: false,
    };
  }

  return {
    statusType: '7_days',
    statusLabel: `${daysLeft} Days Remaining`,
    statusLabelMr: `${daysLeft} दिवस बाकी`,
    badgeColorClass: 'bg-emerald-100 text-emerald-800 border-emerald-200 font-normal',
    isCompleted40: false,
    isOverdue: false,
  };
}

export function buildWhatsAppMessage(
  partyName: string,
  cycleNumber: number,
  statusType: CycleAlertStatusType,
  daysLeft: number,
  extraDays: number,
  lang: 'marathi' | 'english' = 'marathi',
  targetDays = 40
): string {
  const daysPhraseMr = targetDays === 40 ? '४० दिवसांची भाडे मुदत' : `${targetDays} दिवसांची भाडे मुदत`;

  if (lang === 'marathi') {
    if (statusType === '40_completed') {
      return `नमस्कार ${partyName}जी, आनंद बिल्डर्स अँड डेव्हलपर्सकडून कळवण्यात येते की आपल्या सेन्टरिंग प्लेट्सची ${daysPhraseMr} (सायकल #${cycleNumber}) पूर्ण झाली आहे. कृपया साहित्य जमा किंवा नूतनीकरणासाठी आमच्याशी संपर्क साधावा. धन्यवाद!`;
    }
    if (statusType === 'overdue') {
      return `नमस्कार ${partyName}जी, आनंद बिल्डर्सकडून कळवण्यात येते की आपल्या सेन्टरिंग प्लेट्सच्या ${daysPhraseMr}नंतर +${extraDays} दिवस जादा झाले आहेत (सायकल #${cycleNumber}). कृपया साहित्य जमा किंवा नूतनीकरणासाठी त्वरित संपर्क साधावा. धन्यवाद!`;
    }
    const d = Math.max(1, daysLeft);
    return `नमस्कार ${partyName}जी, आनंद बिल्डर्सकडून नम्र स्मरण: आपल्या सेन्टरिंग प्लेट्सच्या चालू सायकलचे (${cycleNumber}) केवळ ${d} दिवस बाकी आहेत. कृपया नोंद घ्यावी. धन्यवाद!`;
  }

  if (statusType === '40_completed') {
    return `Hello ${partyName}, your shuttering plate rental cycle of ${targetDays} days has been completed. Please contact us regarding return or renewal of the plates. Thank you.`;
  }

  if (statusType === 'overdue') {
    return `Hello ${partyName}, your shuttering plate rental cycle (Cycle ${cycleNumber}) is overdue by ${extraDays} days past the ${targetDays}-day cycle term. Please contact us regarding return or renewal of the plates. Thank you.`;
  }

  const d = Math.max(1, daysLeft);
  return `Hello ${partyName}, your shuttering plate rental cycle (Cycle ${cycleNumber}) has ${d} day${d === 1 ? '' : 's'} remaining out of ${targetDays} days. Please contact us regarding return or renewal of the plates. Thank you.`;
}

export function buildWhatsAppUrl(
  mobile: string,
  partyName: string,
  cycleNumber: number,
  statusType: CycleAlertStatusType,
  daysLeft: number,
  extraDays: number,
  lang: 'marathi' | 'english' = 'marathi',
  targetDays = 40
): string {
  const { whatsappPhone } = getCleanPhoneNumber(mobile);
  const msg = buildWhatsAppMessage(partyName, cycleNumber, statusType, daysLeft, extraDays, lang, targetDays);
  if (!whatsappPhone) return '#';
  return `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(msg)}`;
}

export function buildGeneralPartyWhatsAppUrl(
  mobile: string,
  partyName: string,
  lang: 'marathi' | 'english' = 'marathi'
): string {
  const { whatsappPhone } = getCleanPhoneNumber(mobile);
  if (!whatsappPhone) return '#';
  const msg =
    lang === 'marathi'
      ? `नमस्कार ${partyName}जी, आनंद बिल्डर्स अँड डेव्हलपर्स सेन्टरिंग प्लेट्स सेवा. आपल्या भाडे खात्याच्या व साहित्याच्या माहितीसाठी संपर्क साधावा. धन्यवाद!`
      : `Hello ${partyName}, greeting from Anand Builders Shuttering Material Service. Please contact us regarding your rental account and shuttering plates. Thank you.`;
  return `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(msg)}`;
}
