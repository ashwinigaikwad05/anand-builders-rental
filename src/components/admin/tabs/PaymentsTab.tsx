import React, { useState } from 'react';
import { Plus, Search, Wallet, X, Check, Info } from 'lucide-react';
import type { Party, Payment } from '../../../data/adminMockData';

interface PaymentsTabProps {
  payments: Payment[];
  parties: Party[];
  onAddPayment: (newPayment: Omit<Payment, 'id' | 'partyName' | 'reference' | 'status'>) => void;
}

export const PaymentsTab: React.FC<PaymentsTabProps> = ({
  payments,
  parties,
  onAddPayment,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form states
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<'Account 1' | 'Account 2' | 'Cash'>('Cash');
  const [notes, setNotes] = useState('');

  const [validationError, setValidationError] = useState('');



  const filteredPayments = payments.filter((p) =>
    p.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.paymentMode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    setSelectedPartyId(parties[0]?.id || '');
    setAmount(0);
    setPaymentMode('Cash');
    setNotes('');
    setValidationError('');
    setIsAddOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!selectedPartyId || amount <= 0) {
      setValidationError('Please select a valid party and enter an amount greater than zero.');
      return;
    }

    const party = parties.find((p) => p.id === selectedPartyId);
    if (!party) return;

    if (amount > party.pending) {
      setValidationError(`Amount exceeds customer outstanding balance (Udhari) of ₹${party.pending}.`);
      // We can allow overpayments if required, but in general showing a warning is very useful.
      // Let's make it a warning but allow it, or restrict it. Restricting or warning is fine. Let's show warning but allow to proceed (as customer might pay advance). Actually, outstanding can support advance, so we will warn but let it save.
    }

    onAddPayment({
      partyId: selectedPartyId,
      amount,
      date: payDate,
      paymentMode,
      notes,
    });

    setIsAddOpen(false);
  };

  return (
    <div className="space-y-8 text-left">

      {/* Search and Trigger */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        {/* Search */}
        <div className="relative flex-grow max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Payments by Party or Mode..."
            className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-primary focus:outline-none pl-11 pr-4 py-3 rounded-xl text-sm font-medium"
          />
        </div>

        {/* Trigger Button */}
        <button
          onClick={handleOpenAdd}
          className="bg-primary hover:bg-primary-dark text-white font-bold px-5 py-3 rounded-xl shadow-md hover:shadow-orange-500/10 flex items-center justify-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Payment Receipt</span>
        </button>
      </div>

      {/* Payments Logs List */}
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="px-6 py-4">Receipt Date</th>
                <th className="px-6 py-4">Customer Party</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Payment Mode</th>
                <th className="px-6 py-4">Ref. Voucher</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-light">
              {filteredPayments.map((pay) => (
                <tr key={pay.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-slate-500 font-mono">{pay.date}</td>
                  <td className="px-6 py-4 font-bold text-slate-800">{pay.partyName}</td>
                  <td className="px-6 py-4 font-black text-emerald-600">₹{pay.amount.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4 text-slate-500 font-medium">{pay.paymentMode}</td>
                  <td className="px-6 py-4 text-slate-400 font-mono">{pay.reference}</td>
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
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400 font-light italic">
                    No payments yet.
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400 font-light italic">
                    No payment logs found matching query.
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
                Record Customer Payment Receipt
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
                  onChange={(e) => setSelectedPartyId(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 px-4 py-3 rounded-xl text-sm font-medium"
                >
                  <option value="">-- Choose Party --</option>
                  {parties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Outstanding: ₹{p.pending})
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount and Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Amount Received (₹) *</label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="e.g. 5000"
                    className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 px-4 py-3 rounded-xl text-sm font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Receipt Date *</label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 px-4 py-3 rounded-xl text-sm font-medium"
                  />
                </div>
              </div>

              {/* Payment mode selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Payment Channel / Mode *</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 px-4 py-3 rounded-xl text-sm font-medium"
                >
                  <option value="Cash">Cash (Yard Drawer)</option>
                  <option value="Account 1">Account 1 (Bank Direct)</option>
                  <option value="Account 2">Account 2 (UPI / Digital)</option>
                </select>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Reference Voucher / Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. UPI Transaction ID or cheque number reference..."
                  className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 px-4 py-3 rounded-xl text-sm font-medium"
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
