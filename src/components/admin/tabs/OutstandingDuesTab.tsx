import React, { useState } from 'react';
import { Search, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { Party, Payment } from '../../../data/adminMockData';
import { getStoredAppLanguage, type AppLanguage } from '../../../utils/appTranslations';
import { formatMarathiDate } from '../../../utils/marathiUtils';

export interface OutstandingDuesTabProps {
  parties: Party[];
  payments: Payment[];
  appLanguage?: AppLanguage;
}

export const OutstandingDuesTab: React.FC<OutstandingDuesTabProps> = ({ parties, payments, appLanguage }) => {
  const isMarathi = (appLanguage || getStoredAppLanguage()) === 'marathi';
  const [searchTerm, setSearchTerm] = useState('');

  const filteredParties = parties.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate sum of outstanding dues
  const totalPending = parties.reduce((sum, p) => sum + p.pending, 0);

  // Helper to find the date of the last payment made by a party
  const getLastPaymentDate = (partyId: string) => {
    const partyPayments = payments
      .filter((p) => p.partyId === partyId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return partyPayments[0]?.date ? formatMarathiDate(partyPayments[0].date) : (isMarathi ? 'अद्याप जमा नाही' : 'No payment yet');
  };

  return (
    <div className="space-y-6 text-left">
      
      {/* Metrics Banner */}
      <div className="bg-rose-50 border border-rose-250 p-6 rounded-2xl flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-xs font-bold text-rose-500 uppercase tracking-wider">
            {isMarathi ? 'एकूण येणे शिल्लक थकबाकी' : 'Total Outstanding Accounts Receivable'}
          </span>
          <h3 className="text-3xl font-black text-rose-600">₹{totalPending.toLocaleString('en-IN')}</h3>
          <p className="text-[10px] text-rose-400 font-light">
            {isMarathi ? 'सक्रिय ग्राहकांकडील एकूण येणे बाकी रक्कम' : 'Outstanding dues balance across active customers'}
          </p>
        </div>
        <div className="p-4 bg-rose-500/10 rounded-2xl text-rose-600">
          <AlertCircle className="w-8 h-8" />
        </div>
      </div>

      {/* Filter and Search */}
      <div className="relative max-w-md">
        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-5 h-5" />
        </span>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={isMarathi ? 'ग्राहक नावाने शोधा...' : 'Filter Party by Name...'}
          className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none pl-11 pr-4 py-3 rounded-xl text-sm font-medium"
        />
      </div>

      {/* Dues List */}
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="px-6 py-4">{isMarathi ? 'ग्राहक नाव' : 'Customer Party'}</th>
                <th className="px-6 py-4">{isMarathi ? 'एकूण भाडे' : 'Total Accrued Rent'}</th>
                <th className="px-6 py-4">{isMarathi ? 'जमा रक्कम' : 'Paid Amount'}</th>
                <th className="px-6 py-4">{isMarathi ? 'शिल्लक बाकी' : 'Outstanding Dues'}</th>
                <th className="px-6 py-4">{isMarathi ? 'शेवटची जमा तारीख' : 'Last Payment Date'}</th>
                <th className="px-6 py-4 text-center">{isMarathi ? 'स्थिती' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-light">
              {filteredParties.map((party) => {
                const lastPay = getLastPaymentDate(party.id);
                
                // Color codes
                let textClass = 'text-slate-500';
                let bgClass = 'bg-slate-50';
                let statusLabel = 'Settled';
                let statusIcon = <CheckCircle2 className="w-4 h-4 text-emerald-500" />;

                if (party.pending > 5000) {
                  textClass = 'text-rose-700';
                  bgClass = 'bg-rose-50 border-rose-100';
                  statusLabel = 'Critical Overdue';
                } else if (party.pending > 0) {
                  textClass = 'text-amber-700';
                  bgClass = 'bg-amber-50 border-amber-100';
                  statusLabel = 'Active Dues';
                } else {
                  textClass = 'text-emerald-700';
                  bgClass = 'bg-emerald-50 border-emerald-100';
                }

                return (
                  <tr key={party.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                          #{party.customerNumber || 1}
                        </span>
                        <span className="font-bold text-slate-800">{party.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">₹{party.totalRent.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-emerald-600 font-bold">₹{party.paid.toLocaleString('en-IN')}</td>
                    <td className={`px-6 py-4 font-black ${party.pending > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                      ₹{party.pending.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-mono text-xs">{lastPay}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold border ${bgClass} ${textClass}`}>
                          {party.pending > 0 ? null : statusIcon}
                          {statusLabel}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {parties.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400 font-light italic">
                    No parties added yet.
                  </td>
                </tr>
              ) : filteredParties.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400 font-light italic">
                    No outstanding accounts found matching query.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export const UdhariTab = OutstandingDuesTab;
