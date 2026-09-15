import React, { useState } from 'react';
import { Search, UserPlus, Phone, MapPin, Eye, Edit2, Trash2, X, ArrowLeft, Star, Award, MessageSquare } from 'lucide-react';
import type { Party, Rental, Payment, LedgerEntry, RentalCycle, ReturnLog } from '../../../data/adminMockData';
import { calculatePartyBehaviour } from '../../../lib/partyBehaviour';
import { getCleanPhoneNumber, buildGeneralPartyWhatsAppUrl } from '../../../utils/alertMessaging';

interface PartiesTabProps {
  parties: Party[];
  rentals: Rental[];
  payments: Payment[];
  ledger: LedgerEntry[];
  rentalCycles?: RentalCycle[];
  returns?: ReturnLog[];
  onAddParty: (newParty: Omit<Party, 'id' | 'platesWithParty' | 'totalRent' | 'paid' | 'pending' | 'status'>) => void;
  onEditParty: (party: Party) => void;
  onDeleteParty: (partyId: string) => void;
}

export const PartiesTab: React.FC<PartiesTabProps> = ({
  parties,
  rentals,
  payments,
  ledger,
  rentalCycles = [],
  returns = [],
  onAddParty,
  onEditParty,
  onDeleteParty,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [editId, setEditId] = useState('');

  const filteredParties = parties.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.mobile.includes(searchTerm)
  );

  const handleOpenAdd = () => {
    setName('');
    setMobile('');
    setAddress('');
    setNotes('');
    setIsAddOpen(true);
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mobile.trim()) return;
    onAddParty({ name, mobile, address, notes });
    setIsAddOpen(false);
  };

  const handleOpenEdit = (party: Party) => {
    setEditId(party.id);
    setName(party.name);
    setMobile(party.mobile);
    setAddress(party.address);
    setNotes(party.notes);
    setIsEditOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mobile.trim()) return;
    const original = parties.find((p) => p.id === editId);
    if (original) {
      onEditParty({
        ...original,
        name,
        mobile,
        address,
        notes,
      });
    }
    setIsEditOpen(false);
  };

  const handleViewDetail = (party: Party) => {
    setSelectedParty(party);
    setIsDetailOpen(true);
  };

  // Get data filtered by selected party for Details View
  const partyRentals = rentals.filter((r) => r.partyId === selectedParty?.id);
  const partyPayments = payments.filter((p) => p.partyId === selectedParty?.id);
  const partyLedger = ledger.filter((l) => l.partyId === selectedParty?.id);

  // Selected party behavior rating
  const selectedPartyBehaviour = selectedParty
    ? calculatePartyBehaviour(selectedParty, rentalCycles, returns, payments)
    : null;

  return (
    <div className="space-y-6 text-left relative">
      {isDetailOpen && selectedParty ? (
        /* Party Profile / Details View */
        <div className="bg-white rounded-3xl border border-slate-200/60 p-6 sm:p-8 space-y-8 animate-fadeIn">
          
          {/* Header with Call & WhatsApp Buttons */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-100">
            <div className="space-y-2">
              <button
                onClick={() => setIsDetailOpen(false)}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-primary transition-all uppercase tracking-wider mb-1"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Parties
              </button>
              <h3 className="text-2xl font-black text-charcoal">{selectedParty.name}</h3>
              
              {/* Mobile Number & Call/WhatsApp Action Strip */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <span className="text-slate-600 font-mono text-sm font-semibold flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-xl">
                  <Phone className="w-3.5 h-3.5 text-slate-500" /> +91 {selectedParty.mobile}
                </span>

                <a
                  href={getCleanPhoneNumber(selectedParty.mobile).telLink}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-sm"
                  title={`Call +91 ${selectedParty.mobile}`}
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call</span>
                </a>

                <a
                  href={buildGeneralPartyWhatsAppUrl(selectedParty.mobile, selectedParty.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-sm"
                  title={`Open WhatsApp chat with +91 ${selectedParty.mobile}`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>

            <span className={`text-xs font-bold px-3.5 py-1.5 rounded-full uppercase tracking-wider ${
              selectedParty.status === 'active'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-slate-50 text-slate-500 border border-slate-200'
            }`}>
              {selectedParty.status}
            </span>
          </div>

          {/* Cards metrics + Behaviour Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150 text-left space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Shuttering Material Out</span>
              <h4 className="text-2xl font-black text-primary">{selectedParty.platesWithParty} Plates</h4>
              <p className="text-[9px] text-slate-400 font-light">Active stock on site</p>
            </div>
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150 text-left space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Accumulated Rent</span>
              <h4 className="text-2xl font-black text-charcoal">₹{selectedParty.totalRent.toLocaleString('en-IN')}</h4>
              <p className="text-[9px] text-slate-400 font-light">Accrued bill amount</p>
            </div>
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150 text-left space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outstanding Dues Balance</span>
              <h4 className={`text-2xl font-black ${selectedParty.pending > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                ₹{selectedParty.pending.toLocaleString('en-IN')}
              </h4>
              <p className="text-[9px] text-slate-400 font-light">Balance outstanding due</p>
            </div>

            {/* Performance & Behaviour Score Card */}
            {selectedPartyBehaviour && (
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl border border-slate-700 text-left space-y-2 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-400" /> Behaviour Rating
                  </span>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${selectedPartyBehaviour.badgeColorClass}`}>
                    {selectedPartyBehaviour.ratingText}
                  </span>
                </div>

                {selectedPartyBehaviour.isInsufficientHistory ? (
                  <p className="text-xs text-slate-300 font-medium pt-1">Not enough history</p>
                ) : (
                  <>
                    <div className="flex items-center gap-1 text-amber-400 text-lg tracking-widest font-black">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= selectedPartyBehaviour.starsCount
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-600'
                          }`}
                        />
                      ))}
                      <span className="text-xs text-slate-300 font-bold ml-1.5">
                        ({selectedPartyBehaviour.starsCount}/5)
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-700/80 space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Performance Breakdown:</p>
                      <ul className="text-[11px] text-slate-200 space-y-0.5 font-light">
                        {selectedPartyBehaviour.reasons.map((reason, idx) => (
                          <li key={idx} className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Core profile sections */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
            
            {/* Left Col: Info / Ledger */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Account statement Ledger */}
              <div className="border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm bg-white">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h4 className="text-sm font-bold text-charcoal">Party Statement Ledger</h4>
                </div>
                <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3">Debit (+)</th>
                        <th className="px-4 py-3">Credit (-)</th>
                        <th className="px-4 py-3 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-light">
                      {partyLedger.map((led) => (
                        <tr key={led.id} className="hover:bg-slate-50/40">
                          <td className="px-4 py-3 text-slate-500 font-mono">{led.date}</td>
                          <td className="px-4 py-3 text-slate-700 font-medium">{led.description}</td>
                          <td className="px-4 py-3 text-rose-600 font-bold">{led.debit > 0 ? `₹${led.debit}` : '-'}</td>
                          <td className="px-4 py-3 text-emerald-600 font-bold">{led.credit > 0 ? `₹${led.credit}` : '-'}</td>
                          <td className="px-4 py-3 text-right font-bold text-slate-800">₹{led.balance}</td>
                        </tr>
                      ))}
                      {partyLedger.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">
                            No ledger entries found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Rental History */}
              <div className="border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm bg-white">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                  <h4 className="text-sm font-bold text-charcoal">Rental Agreement Records</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider">
                        <th className="px-4 py-3">Issue Date</th>
                        <th className="px-4 py-3">Size</th>
                        <th className="px-4 py-3">Qty</th>
                        <th className="px-4 py-3">Rent Price</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-light">
                      {partyRentals.map((rent) => (
                        <tr key={rent.id}>
                          <td className="px-4 py-3 text-slate-500">{rent.issueDate}</td>
                          <td className="px-4 py-3 font-semibold text-slate-700">{rent.plateType}</td>
                          <td className="px-4 py-3 font-bold text-slate-800">{rent.quantity}</td>
                          <td className="px-4 py-3 font-medium">₹{rent.totalRent}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              rent.status === 'returned'
                                ? 'bg-slate-50 text-slate-500'
                                : rent.status === 'overdue'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}>
                              {rent.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {partyRentals.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">
                            No rental records.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Right Col: Details / Payments */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Address card */}
              <div className="bg-slate-50 border border-slate-150 p-5 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Site Details</h4>
                <div className="flex gap-2.5 text-xs text-slate-600 leading-relaxed font-light">
                  <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  <p>{selectedParty.address || 'No address logged.'}</p>
                </div>
                <div className="text-xs text-slate-500 italic font-light pt-2 border-t border-slate-200">
                  <strong className="text-slate-600 block mb-0.5 font-bold uppercase tracking-wider text-[9px]">Yard Notes:</strong>
                  {selectedParty.notes || 'No notes.'}
                </div>
              </div>

              {/* Payment History */}
              <div className="border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm bg-white">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <h4 className="text-sm font-bold text-charcoal">Receipts History</h4>
                </div>
                <div className="divide-y divide-slate-100 max-h-[250px] overflow-y-auto">
                  {partyPayments.map((pay) => (
                    <div key={pay.id} className="p-3.5 hover:bg-slate-50/50 transition flex justify-between items-center text-left">
                      <div>
                        <p className="text-xs font-bold text-slate-700">₹{pay.amount.toLocaleString('en-IN')}</p>
                        <p className="text-[10px] text-slate-400 font-light mt-0.5">{pay.date} • {pay.paymentMode}</p>
                      </div>
                      <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-bold uppercase">
                        Verified
                      </span>
                    </div>
                  ))}
                  {partyPayments.length === 0 && (
                    <div className="p-6 text-center text-slate-400 italic text-xs">
                      No payments recorded.
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>

        </div>
      ) : (
        /* Main Party Directory Grid / Table */
        <>
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
            {/* Search Input */}
            <div className="relative flex-grow max-w-md">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-5 h-5" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Party Name or Mobile..."
                className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-primary focus:outline-none pl-11 pr-4 py-3 rounded-xl text-sm font-medium"
              />
            </div>
            
            {/* Add Party Trigger */}
            <button
              onClick={handleOpenAdd}
              className="bg-primary hover:bg-primary-dark text-white font-bold px-5 py-3 rounded-xl shadow-md hover:shadow-orange-500/10 flex items-center justify-center gap-2 text-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Party</span>
            </button>
          </div>

          {/* Party Directory Table */}
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                    <th className="px-6 py-4">Party Name</th>
                    <th className="px-6 py-4">Mobile</th>
                    <th className="px-6 py-4">Behaviour Rating</th>
                    <th className="px-6 py-4">Plates Active</th>
                    <th className="px-6 py-4">Accum. Rent</th>
                    <th className="px-6 py-4">Paid</th>
                    <th className="px-6 py-4">Outstanding Dues</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-light">
                  {filteredParties.map((party) => {
                    const behaviour = calculatePartyBehaviour(party, rentalCycles, returns, payments);
                    const { telLink } = getCleanPhoneNumber(party.mobile);
                    const waUrl = buildGeneralPartyWhatsAppUrl(party.mobile, party.name);

                    return (
                      <tr key={party.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-800">{party.name}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-600 font-mono">{party.mobile}</span>
                            <div className="flex items-center gap-1">
                              <a
                                href={telLink}
                                className="p-1 text-emerald-700 hover:bg-emerald-50 rounded transition"
                                title={`Call +91 ${party.mobile}`}
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition"
                                title={`WhatsApp +91 ${party.mobile}`}
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>
                        </td>

                        {/* Behaviour Rating Badge & Stars */}
                        <td className="px-6 py-4">
                          {behaviour.isInsufficientHistory ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                              Not enough history
                            </span>
                          ) : (
                            <div className="space-y-0.5">
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border inline-block ${behaviour.badgeColorClass}`}
                              >
                                {behaviour.ratingText}
                              </span>
                              <div className="flex items-center text-amber-400 text-xs font-black">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`w-3 h-3 ${
                                      star <= behaviour.starsCount
                                        ? 'fill-amber-400 text-amber-400'
                                        : 'text-slate-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4 font-bold text-slate-800">{party.platesWithParty}</td>
                        <td className="px-6 py-4 text-slate-600">₹{party.totalRent}</td>
                        <td className="px-6 py-4 text-emerald-600 font-bold">₹{party.paid}</td>
                        <td className={`px-6 py-4 font-bold ${party.pending > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                          ₹{party.pending}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            party.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-slate-50 text-slate-500 border border-slate-100'
                          }`}>
                            {party.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <a
                              href={telLink}
                              className="p-1.5 hover:bg-emerald-50 text-emerald-700 rounded transition-all"
                              title="Call Party"
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded transition-all"
                              title="WhatsApp Party"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </a>
                            <button
                              onClick={() => handleViewDetail(party)}
                              className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-primary rounded transition-all"
                              title="View Profile Statement"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(party)}
                              className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded transition-all"
                              title="Edit Details"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onDeleteParty(party.id)}
                              className="p-1.5 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded transition-all"
                              title="Delete Party"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {parties.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-10 text-center text-slate-400 font-light italic">
                        No parties added yet.
                      </td>
                    </tr>
                  ) : filteredParties.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-10 text-center text-slate-400 font-light italic">
                        No parties found matching query.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Add Party Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full overflow-hidden shadow-2xl animate-scaleUp text-left">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h4 className="text-base font-bold text-charcoal flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                Add New Customer Party
              </h4>
              <button onClick={() => setIsAddOpen(false)} className="p-1 text-slate-400 hover:text-slate-800 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveAdd} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Party Name / Company *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Patil Construction"
                  className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-primary focus:outline-none focus:ring-1 px-4 py-3 rounded-xl text-sm font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Mobile Number (10 digits) *</label>
                <input
                  type="text"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="e.g. 9822001122"
                  className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-primary focus:outline-none focus:ring-1 px-4 py-3 rounded-xl text-sm font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Site / Delivery Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Near Shahu Maharaj Chowk, Kolhapur"
                  className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-primary focus:outline-none focus:ring-1 px-4 py-3 rounded-xl text-sm font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Yard notes / Preferences</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="e.g. Prefers flat steel plates of 24x3 only..."
                  className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-primary focus:outline-none focus:ring-1 px-4 py-3 rounded-xl text-sm font-medium"
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
                  className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl text-sm shadow-md transition-all"
                >
                  Add Party
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Party Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full overflow-hidden shadow-2xl animate-scaleUp text-left">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h4 className="text-base font-bold text-charcoal">Edit Party Details</h4>
              <button onClick={() => setIsEditOpen(false)} className="p-1 text-slate-400 hover:text-slate-800 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Party Name / Company *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-primary focus:outline-none focus:ring-1 px-4 py-3 rounded-xl text-sm font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Mobile Number *</label>
                <input
                  type="text"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-primary focus:outline-none focus:ring-1 px-4 py-3 rounded-xl text-sm font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Site / Delivery Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-primary focus:outline-none focus:ring-1 px-4 py-3 rounded-xl text-sm font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Yard notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-primary focus:outline-none focus:ring-1 px-4 py-3 rounded-xl text-sm font-medium"
                />
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100 justify-end">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl text-sm shadow-md transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
