import React, { useState } from 'react';
import { User } from 'lucide-react';
import type { Party, LedgerEntry } from '../../../data/adminMockData';

interface LedgerTabProps {
  parties: Party[];
  ledger: LedgerEntry[];
}

export const LedgerTab: React.FC<LedgerTabProps> = ({ parties, ledger }) => {
  const [selectedPartyId, setSelectedPartyId] = useState(parties[0]?.id || '');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const selectedParty = parties.find((p) => p.id === selectedPartyId);

  // Filter ledger list
  const filteredLedger = ledger.filter((item) => {
    if (item.partyId !== selectedPartyId) return false;
    
    if (fromDate && new Date(item.date) < new Date(fromDate)) return false;
    if (toDate && new Date(item.date) > new Date(toDate)) return false;
    
    return true;
  });

  const totalDebit = filteredLedger.reduce((sum, item) => sum + item.debit, 0);
  const totalCredit = filteredLedger.reduce((sum, item) => sum + item.credit, 0);
  const currentOutstanding = selectedParty ? selectedParty.pending : 0;

  return (
    <div className="space-y-6 text-left">
      
      {/* Filters Bar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-4">
        <h4 className="text-sm font-bold text-charcoal flex items-center gap-1.5">
          <User className="w-4 h-4 text-primary" />
          Filter Account Statement
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Party Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Customer Party *</label>
            <select
              value={selectedPartyId}
              onChange={(e) => setSelectedPartyId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:outline-none px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold"
            >
              <option value="">-- Choose Party --</option>
              {parties.map((p, idx) => (
                <option key={p.id} value={p.id}>Customer #{p.customerNumber || idx + 1} — {p.name}</option>
              ))}
            </select>
          </div>

          {/* From Date */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:outline-none px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold"
            />
          </div>

          {/* To Date */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:outline-none px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold"
            />
          </div>
        </div>
      </div>

      {/* Profile summary if party is selected */}
      {selectedParty && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {selectedParty.photoUrl ? (
              <img
                src={selectedParty.photoUrl}
                alt={selectedParty.name}
                className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-xs"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-black text-slate-600">
                {selectedParty.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h4 className="text-base font-black text-charcoal">{selectedParty.name}</h4>
              <p className="text-xs text-slate-500 font-mono">+91 {selectedParty.mobile} {selectedParty.address ? `• ${selectedParty.address}` : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
              selectedParty.status === 'active'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-slate-50 text-slate-500 border border-slate-200'
            }`}>
              {selectedParty.status}
            </span>
          </div>
        </div>
      )}

      {selectedParty && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Total Billed charges (Debits)</span>
            <h4 className="text-xl font-black text-rose-600">₹{totalDebit.toLocaleString('en-IN')}</h4>
            <p className="text-[9px] text-slate-400 font-light">Based on selected date filter</p>
          </div>
          
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Total Received Payments (Credits)</span>
            <h4 className="text-xl font-black text-emerald-600 font-bold">₹{totalCredit.toLocaleString('en-IN')}</h4>
            <p className="text-[9px] text-slate-400 font-light">Based on selected date filter</p>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Current Account Balance</span>
            <h4 className={`text-xl font-black ${currentOutstanding > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              ₹{currentOutstanding.toLocaleString('en-IN')}
            </h4>
            <p className="text-[9px] text-slate-400 font-light">Current ledger outstanding dues</p>
          </div>
        </div>
      )}

      {/* Ledger Table */}
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h4 className="text-sm font-bold text-charcoal">Account Statement Ledger Logs</h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="px-6 py-4">Transaction Date</th>
                <th className="px-6 py-4">Description Detail</th>
                <th className="px-6 py-4 text-rose-600">Debit (+)</th>
                <th className="px-6 py-4 text-emerald-600">Credit (-)</th>
                <th className="px-6 py-4 text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-light">
              {filteredLedger.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-slate-500 font-mono">{item.date}</td>
                  <td className="px-6 py-4 font-semibold text-slate-850">{item.description}</td>
                  <td className="px-6 py-4 text-rose-600 font-bold">
                    {item.debit > 0 ? `₹${item.debit.toLocaleString('en-IN')}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-emerald-600 font-bold">
                    {item.credit > 0 ? `₹${item.credit.toLocaleString('en-IN')}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-right font-black text-slate-850">
                    ₹{item.balance.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
              {filteredLedger.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-light italic">
                    Please select a party or modify date filters to view ledger records.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
