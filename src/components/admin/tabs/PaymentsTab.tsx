import React, { useState } from 'react';
import { Plus, Search, Wallet, X, Check, Info } from 'lucide-react';
import type { Party, Payment, Rental, RentalCycle } from '../../../data/adminMockData';

import { getStoredAppLanguage, type AppLanguage } from '../../../utils/appTranslations';
import { formatMarathiDate } from '../../../utils/marathiUtils';

interface PaymentsTabProps {
  payments: Payment[];
  parties: Party[];
  rentals?: Rental[];
  rentalCycles?: RentalCycle[];
  onAddPayment: (newPayment: {
    partyId: string;
    amount: number;
    date: string;
    paymentMode: 'Account 1' | 'Account 2' | 'Cash';
    rentalId?: string;
    cycleId?: string;
    cycleNumber?: number;
    reference?: string;
    notes?: string;
  }) => void;
  appLanguage?: AppLanguage;
}

export const PaymentsTab: React.FC<PaymentsTabProps> = ({
  payments,
  parties,
  rentals = [],
  rentalCycles = [],
  onAddPayment,
  appLanguage,
}) => {
  const isMarathi = (appLanguage || getStoredAppLanguage()) === 'marathi';
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form states
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<'Account 1' | 'Account 2' | 'Cash'>('Cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const [validationError, setValidationError] = useState('');

  const [modeFilter, setModeFilter] = useState<'All' | 'Account 1' | 'Account 2' | 'Cash'>('All');
  const [partyFilter, setPartyFilter] = useState<string>('All');

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.paymentMode.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesMode = modeFilter === 'All' || p.paymentMode === modeFilter;
    const matchesParty = partyFilter === 'All' || p.partyId === partyFilter;

    return matchesSearch && matchesMode && matchesParty;
  });

  // Fetch pending cycles for selected party
  const partyPendingCycles = rentalCycles.filter(
    (c) => c.partyId === selectedPartyId && c.pendingAmount > 0
  );

  const handleOpenAdd = () => {
    const firstParty = parties[0];
    setSelectedPartyId(firstParty?.id || '');
    setSelectedCycleId('');
    setAmount(0);
    setPaymentMode('Account 1');
    setReference('');
    setNotes('');
    setValidationError('');
    setIsAddOpen(true);
  };

  const handlePartyChange = (partyId: string) => {
    setSelectedPartyId(partyId);
    setSelectedCycleId('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!selectedPartyId || amount <= 0) {
      setValidationError('Please select a valid party and enter an amount greater than zero.');
      return;
    }

    if (!paymentMode) {
      setValidationError('Payment destination (Account 1 / Account 2 / Cash) is required.');
      return;
    }

    const party = parties.find((p) => p.id === selectedPartyId);
    if (!party) return;

    const targetCycle = selectedCycleId
      ? rentalCycles.find((c) => c.id === selectedCycleId)
      : undefined;

    onAddPayment({
      partyId: selectedPartyId,
      amount,
      date: payDate,
      paymentMode,
      rentalId: targetCycle?.rentalId,
      cycleId: targetCycle?.id,
      cycleNumber: targetCycle?.cycleNumber,
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    setIsAddOpen(false);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Search and Filters Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
        {/* Search & Select Filters */}
        <div className="flex flex-col sm:flex-row gap-3 flex-grow max-w-2xl">
          <div className="relative flex-grow">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by party, voucher, mode..."
              className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium"
            />
          </div>

          {/* Mode Filter */}
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value as any)}
            className="bg-white border border-slate-200 focus:border-primary focus:outline-none px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700"
          >
            <option value="All">All Payment Accounts</option>
            <option value="Account 1">Account 1 (Bank)</option>
            <option value="Account 2">Account 2 (Digital)</option>
            <option value="Cash">Cash</option>
          </select>

          {/* Party Filter */}
          <select
            value={partyFilter}
            onChange={(e) => setPartyFilter(e.target.value)}
            className="bg-white border border-slate-200 focus:border-primary focus:outline-none px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 max-w-[200px]"
          >
            <option value="All">All Parties</option>
            {parties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Trigger Button */}
        <button
          onClick={handleOpenAdd}
          className="bg-primary hover:bg-primary-dark text-white font-bold px-5 py-2.5 rounded-xl shadow-md hover:shadow-orange-500/10 flex items-center justify-center gap-2 text-sm transition-all flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Record Payment</span>
        </button>
      </div>

      {/* Payments Logs List */}
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="px-6 py-4">{isMarathi ? 'जमा दिनांक' : 'Payment Date'}</th>
                <th className="px-6 py-4">{isMarathi ? 'ग्राहकाचे नाव' : 'Customer Party'}</th>
                <th className="px-6 py-4">{isMarathi ? 'सायकल' : 'Cycle Target'}</th>
                <th className="px-6 py-4">{isMarathi ? 'रक्कम' : 'Amount'}</th>
                <th className="px-6 py-4">{isMarathi ? 'जमा खाते' : 'Received In'}</th>
                <th className="px-6 py-4">{isMarathi ? 'पावती / संदर्भ' : 'Ref. Voucher'}</th>
                <th className="px-6 py-4 text-center">{isMarathi ? 'स्थिती' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-light">
              {filteredPayments.map((pay) => (
                <tr key={pay.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-slate-500 font-mono text-xs">{formatMarathiDate(pay.date)}</td>
                  <td className="px-6 py-4 font-bold text-slate-800">{pay.partyName}</td>
                  <td className="px-6 py-4">
                    {pay.cycleNumber ? (
                      <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold px-2 py-0.5 rounded-lg">
                        Cycle {pay.cycleNumber}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">General Party Allocation</span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-black text-emerald-600">
                    ₹{pay.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                        pay.paymentMode === 'Account 1'
                          ? 'bg-blue-50 text-blue-700 border border-blue-100'
                          : pay.paymentMode === 'Account 2'
                          ? 'bg-purple-50 text-purple-700 border border-purple-100'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      }`}
                    >
                      {pay.paymentMode}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 font-mono text-xs">{pay.reference || '—'}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase tracking-wider">
                        {pay.status}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400 font-light italic">
                    No payments recorded yet.
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400 font-light italic">
                    No payment logs found matching filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Dialog */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full overflow-hidden shadow-2xl animate-scaleUp text-left">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h4 className="text-base font-bold text-charcoal flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                Record Customer Payment
              </h4>
              <button onClick={() => setIsAddOpen(false)} className="p-1 text-slate-400 hover:text-slate-800 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {validationError && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2">
                  <Info className="w-4 h-4" /> {validationError}
                </div>
              )}

              {/* Party selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Customer Party *</label>
                <select
                  value={selectedPartyId}
                  onChange={(e) => handlePartyChange(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 px-4 py-3 rounded-xl text-sm font-medium"
                >
                  <option value="">-- Choose Party --</option>
                  {parties.map((p, idx) => (
                    <option key={p.id} value={p.id}>
                      Customer #{p.customerNumber || idx + 1} — {p.name} (Outstanding: ₹{p.pending.toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>

              {/* Cycle allocation option */}
              {partyPendingCycles.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    Allocate to Specific Cycle (Optional)
                  </label>
                  <select
                    value={selectedCycleId}
                    onChange={(e) => {
                      setSelectedCycleId(e.target.value);
                      const cyc = rentalCycles.find((c) => c.id === e.target.value);
                      if (cyc && (!amount || amount === 0)) {
                        setAmount(cyc.pendingAmount);
                      }
                    }}
                    className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    <option value="">General Balance (Auto-clears oldest pending cycle)</option>
                    {partyPendingCycles.map((c) => {
                      const rent = rentals.find((r) => r.id === c.rentalId);
                      return (
                        <option key={c.id} value={c.id}>
                          {rent ? `${rent.plateType} Width • ` : ''}Cycle {c.cycleNumber} ({formatMarathiDate(c.startDate)} to {formatMarathiDate(c.expectedEndDate)}) — Pending: ₹{c.pendingAmount.toLocaleString('en-IN')}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Amount and Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Amount Received (₹) *</label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    required
                    value={amount || ''}
                    onChange={(e) => setAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="e.g. 5000"
                    className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 px-4 py-3 rounded-xl text-sm font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 px-4 py-3 rounded-xl text-sm font-medium"
                  />
                </div>
              </div>

              {/* Payment Destination: Account 1 / Account 2 / Cash */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase block">
                  Received In (Payment Destination) *
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('Account 1')}
                    className={`py-3 px-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                      paymentMode === 'Account 1'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500/20 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-sm">🏦</span>
                    <span>Account 1</span>
                    <span className="text-[10px] text-slate-400 font-normal">Bank Direct</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode('Account 2')}
                    className={`py-3 px-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                      paymentMode === 'Account 2'
                        ? 'bg-purple-50 border-purple-500 text-purple-700 ring-2 ring-purple-500/20 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-sm">📱</span>
                    <span>Account 2</span>
                    <span className="text-[10px] text-slate-400 font-normal">UPI / Digital</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode('Cash')}
                    className={`py-3 px-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                      paymentMode === 'Cash'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-sm">💵</span>
                    <span>Cash</span>
                    <span className="text-[10px] text-slate-400 font-normal">In-Hand Cash</span>
                  </button>
                </div>
              </div>

              {/* Reference ID input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase block">
                  Transaction Reference ID (Optional)
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. UPI Ref / Cheque No / Voucher ID"
                  className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 px-4 py-2.5 rounded-xl text-sm font-medium font-mono"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Advance payment for site shuttering..."
                  className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 px-4 py-2.5 rounded-xl text-sm font-medium resize-none"
                />
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100 justify-end">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Verify & Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
