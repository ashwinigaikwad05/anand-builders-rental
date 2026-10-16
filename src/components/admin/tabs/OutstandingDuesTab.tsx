import React, { useState, useMemo } from 'react';
import {
  Search,
  AlertCircle,
  CheckCircle2,
  Phone,
  MessageCircle,
  X,
  Filter,
  Calendar,
  Users,
  AlertTriangle,
} from 'lucide-react';
import type { Party, Payment } from '../../../data/adminMockData';
import { getStoredAppLanguage, type AppLanguage } from '../../../utils/appTranslations';
import { formatMarathiDate, formatPartyName } from '../../../utils/marathiUtils';
import {
  getCleanPhoneNumber,
  buildOutstandingDuesWhatsAppUrl,
} from '../../../utils/alertMessaging';

export interface OutstandingDuesTabProps {
  parties: Party[];
  payments: Payment[];
  appLanguage?: AppLanguage;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
}

type DuesFilterType = 'all' | 'pending' | 'critical' | 'settled';

export const OutstandingDuesTab: React.FC<OutstandingDuesTabProps> = ({
  parties,
  payments,
  appLanguage,
  searchTerm: externalSearchTerm,
  onSearchChange,
}) => {
  const isMarathi = (appLanguage || getStoredAppLanguage()) === 'marathi';
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  const searchTerm = externalSearchTerm !== undefined ? externalSearchTerm : internalSearchTerm;
  const setSearchTerm = (val: string) => {
    setInternalSearchTerm(val);
    onSearchChange?.(val);
  };
  const [filterType, setFilterType] = useState<DuesFilterType>('all');

  // Calculate sum of outstanding dues and stats
  const totalPending = useMemo(() => parties.reduce((sum, p) => sum + p.pending, 0), [parties]);
  const pendingCount = useMemo(() => parties.filter((p) => p.pending > 0).length, [parties]);
  const criticalCount = useMemo(() => parties.filter((p) => p.pending > 5000).length, [parties]);
  const settledCount = useMemo(() => parties.filter((p) => p.pending <= 0).length, [parties]);

  // Helper to find the date of the last payment made by a party
  const getLastPaymentDate = (partyId: string) => {
    const partyPayments = payments
      .filter((p) => p.partyId === partyId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return partyPayments[0]?.date
      ? formatMarathiDate(partyPayments[0].date)
      : isMarathi
      ? 'अद्याप जमा नाही'
      : 'No payment yet';
  };

  const filteredParties = useMemo(() => {
    return parties.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        formatPartyName(p.name, 'marathi').toLowerCase().includes(searchTerm.toLowerCase()) ||
        formatPartyName(p.name, 'english').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.mobile && p.mobile.includes(searchTerm)) ||
        (p.customerNumber && p.customerNumber.toString().includes(searchTerm));

      if (!matchesSearch) return false;

      if (filterType === 'pending') return p.pending > 0;
      if (filterType === 'critical') return p.pending > 5000;
      if (filterType === 'settled') return p.pending <= 0;
      return true;
    });
  }, [parties, searchTerm, filterType]);

  return (
    <div className="space-y-4 sm:space-y-6 text-left">
      {/* Metrics Banner */}
      <div className="bg-rose-50 border border-rose-200/80 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-rose-500 uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              {isMarathi ? 'एकूण येणे शिल्लक थकबाकी' : 'Total Outstanding Accounts Receivable'}
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight">
              ₹{totalPending.toLocaleString('en-IN')}
            </h3>
            <p className="text-[11px] text-rose-500/80 font-normal">
              {isMarathi
                ? 'सक्रिय ग्राहकांकडील एकूण येणे बाकी रक्कम'
                : 'Outstanding balance across all active customers'}
            </p>
          </div>

          {/* Quick Counter Pills on banner */}
          <div className="flex flex-wrap sm:flex-col items-end gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-rose-200/60 text-xs shadow-2xs">
              <Users className="w-3.5 h-3.5 text-rose-500" />
              <span className="text-slate-600 font-medium">
                {isMarathi ? 'बाकीदार ग्राहक:' : 'Parties with Dues:'}
              </span>
              <span className="font-black text-rose-600">{pendingCount}</span>
            </div>
            {criticalCount > 0 && (
              <div className="flex items-center gap-2 bg-rose-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-2xs">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
                <span>{isMarathi ? 'गंभीर थकबाकी (>₹५,०००):' : 'Critical (>₹5,000):'}</span>
                <span>{criticalCount}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-grow max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              isMarathi ? 'ग्राहक नाव किंवा नंबरने शोधा...' : 'Search by name or number...'
            }
            className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none pl-10 pr-9 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-medium"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick Filter Pills (Mobile friendly swipe/wrap) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              filterType === 'all'
                ? 'bg-charcoal text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>{isMarathi ? 'सर्व' : 'All'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200/50 text-inherit font-mono">
              {parties.length}
            </span>
          </button>

          <button
            onClick={() => setFilterType('pending')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              filterType === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>{isMarathi ? 'बाकीदार' : 'Pending'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-900 font-mono">
              {pendingCount}
            </span>
          </button>

          {criticalCount > 0 && (
            <button
              onClick={() => setFilterType('critical')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                filterType === 'critical'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{isMarathi ? 'गंभीर' : 'Critical'}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-900 font-mono">
                {criticalCount}
              </span>
            </button>
          )}

          <button
            onClick={() => setFilterType('settled')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              filterType === 'settled'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>{isMarathi ? 'हिशोब पूर्ण' : 'Settled'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-900 font-mono">
              {settledCount}
            </span>
          </button>
        </div>
      </div>

      {/* Desktop Table View (hidden on screens < 768px) */}
      <div className="hidden md:block bg-white rounded-3xl border border-slate-200/60 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="px-6 py-4">{isMarathi ? 'ग्राहक नाव' : 'Customer Party'}</th>
                <th className="px-6 py-4">{isMarathi ? 'एकूण भाडे' : 'Total Rent'}</th>
                <th className="px-6 py-4">{isMarathi ? 'जमा रक्कम' : 'Paid Amount'}</th>
                <th className="px-6 py-4">{isMarathi ? 'शिल्लक बाकी' : 'Outstanding Dues'}</th>
                <th className="px-6 py-4">{isMarathi ? 'शेवटची जमा' : 'Last Payment'}</th>
                <th className="px-6 py-4 text-center">{isMarathi ? 'स्थिती' : 'Status'}</th>
                <th className="px-6 py-4 text-center">{isMarathi ? 'संपर्क / स्मरण' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-light">
              {filteredParties.map((party) => {
                const lastPay = getLastPaymentDate(party.id);
                const { telLink, whatsappPhone } = getCleanPhoneNumber(party.mobile);
                const whatsappUrl = buildOutstandingDuesWhatsAppUrl(
                  party.mobile,
                  party.name,
                  party.pending,
                  isMarathi ? 'marathi' : 'english'
                );

                let textClass = 'text-emerald-700';
                let bgClass = 'bg-emerald-50 border-emerald-100';
                let statusLabel = isMarathi ? 'हिशोब पूर्ण' : 'Settled';
                let statusIcon = <CheckCircle2 className="w-4 h-4 text-emerald-500" />;

                if (party.pending > 5000) {
                  textClass = 'text-rose-700';
                  bgClass = 'bg-rose-50 border-rose-200';
                  statusLabel = isMarathi ? 'गंभीर बाकी' : 'Critical Overdue';
                  statusIcon = <AlertCircle className="w-4 h-4 text-rose-500" />;
                } else if (party.pending > 0) {
                  textClass = 'text-amber-700';
                  bgClass = 'bg-amber-50 border-amber-200';
                  statusLabel = isMarathi ? 'शिल्लक बाकी' : 'Active Dues';
                  statusIcon = <AlertCircle className="w-4 h-4 text-amber-500" />;
                }

                return (
                  <tr key={party.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                          #{party.customerNumber || 1}
                        </span>
                        <div>
                          <span className="font-bold text-slate-800 block">{formatPartyName(party.name, isMarathi ? 'marathi' : 'english')}</span>
                          {party.mobile && (
                            <span className="text-xs text-slate-400 font-mono block">
                              {party.mobile}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      ₹{party.totalRent.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-emerald-600 font-bold">
                      ₹{party.paid.toLocaleString('en-IN')}
                    </td>
                    <td
                      className={`px-6 py-4 font-black ${
                        party.pending > 0 ? 'text-rose-600' : 'text-slate-500'
                      }`}
                    >
                      ₹{party.pending.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-mono text-xs">{lastPay}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold border ${bgClass} ${textClass}`}
                        >
                          {statusIcon}
                          {statusLabel}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {party.mobile && (
                          <a
                            href={telLink}
                            className="p-1.5 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-lg transition-colors"
                            title={isMarathi ? 'कॉल करा' : 'Call Party'}
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {party.pending > 0 && whatsappPhone && (
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all shadow-2xs"
                            title={isMarathi ? 'व्हॉट्सॲप स्मरण पाठवा' : 'Send WhatsApp Reminder'}
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>{isMarathi ? 'स्मरण' : 'Remind'}</span>
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {parties.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-light">
                    {isMarathi ? 'कोणतेही ग्राहक जोडलेले नाहीत.' : 'No parties added yet.'}
                  </td>
                </tr>
              ) : filteredParties.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-light">
                    {isMarathi
                      ? 'शोधलेल्या निकषांनुसार कोणतेही खाते सापडले नाही.'
                      : 'No outstanding accounts found matching query.'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card List View (visible on screens < 768px) */}
      <div className="md:hidden space-y-3">
        {filteredParties.map((party) => {
          const lastPay = getLastPaymentDate(party.id);
          const { telLink, whatsappPhone } = getCleanPhoneNumber(party.mobile);
          const whatsappUrl = buildOutstandingDuesWhatsAppUrl(
            party.mobile,
            party.name,
            party.pending,
            isMarathi ? 'marathi' : 'english'
          );

          let textClass = 'text-emerald-700';
          let bgClass = 'bg-emerald-50 border-emerald-200';
          let statusLabel = isMarathi ? 'हिशोब पूर्ण' : 'Settled';
          let statusIcon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;

          if (party.pending > 5000) {
            textClass = 'text-rose-700';
            bgClass = 'bg-rose-50 border-rose-200';
            statusLabel = isMarathi ? 'गंभीर बाकी' : 'Critical Overdue';
            statusIcon = <AlertCircle className="w-3.5 h-3.5 text-rose-500" />;
          } else if (party.pending > 0) {
            textClass = 'text-amber-700';
            bgClass = 'bg-amber-50 border-amber-200';
            statusLabel = isMarathi ? 'शिल्लक बाकी' : 'Active Dues';
            statusIcon = <AlertCircle className="w-3.5 h-3.5 text-amber-500" />;
          }

          return (
            <div
              key={party.id}
              className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3"
            >
              {/* Top Row: Customer badge, Name, Status */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                    #{party.customerNumber || 1}
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{formatPartyName(party.name, isMarathi ? 'marathi' : 'english')}</h4>
                    {party.mobile && (
                      <span className="text-xs text-slate-400 font-mono">{party.mobile}</span>
                    )}
                  </div>
                </div>

                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${bgClass} ${textClass} shrink-0`}
                >
                  {statusIcon}
                  {statusLabel}
                </span>
              </div>

              {/* 3-Column Financial Metrics Box */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">
                    {isMarathi ? 'एकूण भाडे' : 'Rent'}
                  </span>
                  <span className="text-xs font-semibold text-slate-700">
                    ₹{party.totalRent.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="space-y-0.5 border-x border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">
                    {isMarathi ? 'जमा रक्कम' : 'Paid'}
                  </span>
                  <span className="text-xs font-bold text-emerald-600">
                    ₹{party.paid.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-rose-500 font-bold uppercase block">
                    {isMarathi ? 'शिल्लक बाकी' : 'Dues'}
                  </span>
                  <span
                    className={`text-xs font-black ${
                      party.pending > 0 ? 'text-rose-600' : 'text-slate-500'
                    }`}
                  >
                    ₹{party.pending.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Footer row: Last payment + Call / WhatsApp actions */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {isMarathi ? 'शेवटची जमा:' : 'Last Pay:'} {lastPay}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {party.mobile && (
                    <a
                      href={telLink}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors min-h-[36px]"
                    >
                      <Phone className="w-3.5 h-3.5 text-blue-600" />
                      <span>{isMarathi ? 'कॉल' : 'Call'}</span>
                    </a>
                  )}

                  {party.pending > 0 && whatsappPhone && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs transition-colors min-h-[36px] shadow-2xs"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>{isMarathi ? 'व्हॉट्सॲप' : 'Remind'}</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {parties.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 space-y-2">
            <Users className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-medium">
              {isMarathi ? 'कोणतेही ग्राहक जोडलेले नाहीत.' : 'No parties added yet.'}
            </p>
          </div>
        ) : filteredParties.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 space-y-2">
            <Filter className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-medium">
              {isMarathi
                ? 'शोधलेल्या निकषांनुसार कोणतेही खाते सापडले नाही.'
                : 'No outstanding accounts found matching query.'}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const UdhariTab = OutstandingDuesTab;
