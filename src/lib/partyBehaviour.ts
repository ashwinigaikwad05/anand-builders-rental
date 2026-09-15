import type { Party, RentalCycle, ReturnLog, Payment } from '../data/adminMockData';

export interface BehaviourRatingResult {
  ratingText: 'Excellent' | 'Good' | 'Average' | 'Needs Attention' | 'Poor' | 'Not enough history';
  starsCount: number; // 0 to 5
  starDisplay: string; // e.g. "★★★★★", "★★★★☆", etc.
  badgeColorClass: string;
  reasons: string[];
  isInsufficientHistory: boolean;
  metrics: {
    totalCycles: number;
    onTimeReturns: number;
    overdueReturns: number;
    onTimeRenewals: number;
    overdueRenewals: number;
    activeOverdueCycles: number;
    onTimePayments: number;
  };
}

export function calculatePartyBehaviour(
  party: Party,
  allCycles: RentalCycle[],
  allReturns: ReturnLog[],
  allPayments: Payment[]
): BehaviourRatingResult {
  const partyCycles = allCycles.filter((c) => c.partyId === party.id);
  const partyPayments = allPayments.filter((p) => p.partyId === party.id);
  const partyReturns = allReturns.filter((r) => r.partyId === party.id);

  const totalCycles = partyCycles.length;

  // Insufficient history check
  if (totalCycles === 0 && partyPayments.length === 0 && partyReturns.length === 0) {
    return {
      ratingText: 'Not enough history',
      starsCount: 0,
      starDisplay: 'Not enough history',
      badgeColorClass: 'bg-slate-100 text-slate-500 border-slate-200',
      reasons: ['No rental cycles or payment records logged yet.'],
      isInsufficientHistory: true,
      metrics: {
        totalCycles: 0,
        onTimeReturns: 0,
        overdueReturns: 0,
        onTimeRenewals: 0,
        overdueRenewals: 0,
        activeOverdueCycles: 0,
        onTimePayments: 0,
      },
    };
  }

  const todayStr = new Date().toISOString().split('T')[0];

  let onTimeReturns = 0;
  let overdueReturns = 0;
  let onTimeRenewals = 0;
  let overdueRenewals = 0;
  let activeOverdueCycles = 0;

  partyCycles.forEach((cycle) => {
    if (cycle.status === 'completed') {
      if (cycle.extraDays > 0) {
        overdueReturns++;
      } else {
        onTimeReturns++;
      }
    } else if (cycle.status === 'active') {
      const [y, m, d] = cycle.startDate.split('-').map(Number);
      const startUtc = Date.UTC(y, m - 1, d);
      const [ty, tm, td] = todayStr.split('-').map(Number);
      const todayUtc = Date.UTC(ty, tm - 1, td);
      const elapsed = Math.floor((todayUtc - startUtc) / (1000 * 60 * 60 * 24)) + 1;
      if (elapsed > 40) {
        activeOverdueCycles++;
      }
    }

    if (cycle.cycleNumber > 1) {
      if (cycle.extraDays === 0) {
        onTimeRenewals++;
      } else {
        overdueRenewals++;
      }
    }
  });

  const onTimePayments = partyPayments.filter((p) => p.status === 'verified').length;

  // Score starting at 100 points
  let score = 100;

  if (activeOverdueCycles > 0) {
    score -= activeOverdueCycles * 25;
  }
  if (overdueReturns > 0) {
    score -= overdueReturns * 20;
  }
  if (overdueRenewals > 0) {
    score -= overdueRenewals * 15;
  }
  if (party.pending > 0 && (activeOverdueCycles > 0 || overdueReturns > 0)) {
    score -= 15;
  } else if (party.pending > 5000) {
    score -= 10;
  }

  if (onTimeReturns > 0) {
    score += onTimeReturns * 10;
  }
  if (onTimeRenewals > 0) {
    score += onTimeRenewals * 8;
  }
  if (party.pending === 0 && partyPayments.length > 0) {
    score += 10;
  }

  score = Math.min(100, Math.max(10, score));

  let ratingText: 'Excellent' | 'Good' | 'Average' | 'Needs Attention' | 'Poor' = 'Good';
  let starsCount = 4;
  let starDisplay = '★★★★☆';
  let badgeColorClass = 'bg-blue-50 text-blue-700 border-blue-200';

  if (score >= 85) {
    ratingText = 'Excellent';
    starsCount = 5;
    starDisplay = '★★★★★';
    badgeColorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (score >= 65) {
    ratingText = 'Good';
    starsCount = 4;
    starDisplay = '★★★★☆';
    badgeColorClass = 'bg-blue-50 text-blue-700 border-blue-200';
  } else if (score >= 45) {
    ratingText = 'Average';
    starsCount = 3;
    starDisplay = '★★★☆☆';
    badgeColorClass = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (score >= 25) {
    ratingText = 'Needs Attention';
    starsCount = 2;
    starDisplay = '★★☆☆☆';
    badgeColorClass = 'bg-orange-50 text-orange-700 border-orange-200';
  } else {
    ratingText = 'Poor';
    starsCount = 1;
    starDisplay = '★☆☆☆☆';
    badgeColorClass = 'bg-rose-50 text-rose-700 border-rose-200';
  }

  const reasons: string[] = [];
  if (onTimeReturns > 0) {
    reasons.push(`${onTimeReturns} on-time return${onTimeReturns > 1 ? 's' : ''}`);
  }
  if (onTimeRenewals > 0) {
    reasons.push(`${onTimeRenewals} on-time renewal${onTimeRenewals > 1 ? 's' : ''}`);
  }
  if (overdueReturns > 0) {
    reasons.push(`${overdueReturns} overdue return${overdueReturns > 1 ? 's' : ''}`);
  }
  if (overdueRenewals > 0) {
    reasons.push(`${overdueRenewals} late renewal${overdueRenewals > 1 ? 's' : ''}`);
  }
  if (activeOverdueCycles > 0) {
    reasons.push(`${activeOverdueCycles} active overdue cycle${activeOverdueCycles > 1 ? 's' : ''}`);
  }
  if (party.pending === 0 && partyPayments.length > 0) {
    reasons.push('Payments on time');
  } else if (party.pending > 0) {
    reasons.push(`Outstanding balance of ₹${party.pending.toLocaleString('en-IN')}`);
  }

  if (reasons.length === 0) {
    reasons.push('Standard active account history');
  }

  return {
    ratingText,
    starsCount,
    starDisplay,
    badgeColorClass,
    reasons,
    isInsufficientHistory: false,
    metrics: {
      totalCycles,
      onTimeReturns,
      overdueReturns,
      onTimeRenewals,
      overdueRenewals,
      activeOverdueCycles,
      onTimePayments,
    },
  };
}
