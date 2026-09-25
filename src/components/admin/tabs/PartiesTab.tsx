import React, { useState } from 'react';
import {
  Search,
  UserPlus,
  Phone,
  MapPin,
  Eye,
  Edit2,
  Trash2,
  X,
  ArrowLeft,
  Star,
  Award,
  MessageSquare,
  Camera,
  FileBadge,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Package,
  IndianRupee,
} from 'lucide-react';
import type { Party, Rental, Payment, LedgerEntry, RentalCycle, ReturnLog } from '../../../data/adminMockData';
import { calculatePartyBehaviour } from '../../../lib/partyBehaviour';
import { getCleanPhoneNumber, buildGeneralPartyWhatsAppUrl } from '../../../utils/alertMessaging';
import { DocumentUploadCard } from '../DocumentUploadCard';
import { ImageLightboxModal } from '../ImageLightboxModal';

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

  // Delete safeguard & confirmation modal states
  const [partyToDelete, setPartyToDelete] = useState<Party | null>(null);
  const [deleteModalMode, setDeleteModalMode] = useState<'blocked' | 'confirm' | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [aadhaarUrl, setAadhaarUrl] = useState<string | null>(null);
  const [chequeUrl, setChequeUrl] = useState<string | null>(null);
  const [editId, setEditId] = useState('');
  const [validationError, setValidationError] = useState('');

  // Lightbox state for previewing documents
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState('');
  const [lightboxSubtitle, setLightboxSubtitle] = useState('');

  const handleOpenLightbox = (url: string, title: string, subtitle: string = '') => {
    setLightboxImage(url);
    setLightboxTitle(title);
    setLightboxSubtitle(subtitle);
    setLightboxOpen(true);
  };

  const filteredParties = parties
    .filter(
      (p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.mobile.includes(searchTerm)
    )
    .sort((a, b) => (a.customerNumber || 1) - (b.customerNumber || 1));

  // Compute live unreturned plates and dues for party being evaluated for deletion
  const partyToDeleteStats = React.useMemo(() => {
    if (!partyToDelete) return { pendingPlates: 0, pendingBalance: 0 };
    const partyRentals = rentals.filter((r) => r.partyId === partyToDelete.id);
    let remainingPlatesFromRentals = 0;
    partyRentals.forEach((rent) => {
      if (rent.status === 'active' || rent.status === 'overdue') {
        const returnedForRent = (returns || [])
          .filter((ret) => ret.rentalId === rent.id)
          .reduce((sum, ret) => sum + ret.returnedQuantity, 0);
        remainingPlatesFromRentals += Math.max(0, rent.quantity - returnedForRent);
      }
    });
    return {
      pendingPlates: Math.max(partyToDelete.platesWithParty || 0, remainingPlatesFromRentals),
      pendingBalance: Math.max(0, partyToDelete.pending || 0),
    };
  }, [partyToDelete, rentals, returns]);

  const handleInitiateDelete = (party: Party) => {
    const partyRentals = rentals.filter((r) => r.partyId === party.id);
    let remainingPlatesFromRentals = 0;
    partyRentals.forEach((rent) => {
      if (rent.status === 'active' || rent.status === 'overdue') {
        const returnedForRent = (returns || [])
          .filter((ret) => ret.rentalId === rent.id)
          .reduce((sum, ret) => sum + ret.returnedQuantity, 0);
        remainingPlatesFromRentals += Math.max(0, rent.quantity - returnedForRent);
      }
    });

    const pendingPlatesCount = Math.max(party.platesWithParty || 0, remainingPlatesFromRentals);
    const pendingBalanceAmount = Math.max(0, party.pending || 0);

    setPartyToDelete(party);
    if (pendingPlatesCount > 0 || pendingBalanceAmount > 0) {
      setDeleteModalMode('blocked');
    } else {
      setDeleteModalMode('confirm');
    }
  };

  const handleConfirmDelete = () => {
    if (partyToDelete) {
      onDeleteParty(partyToDelete.id);
      if (selectedParty?.id === partyToDelete.id) {
        setIsDetailOpen(false);
        setSelectedParty(null);
      }
      setPartyToDelete(null);
      setDeleteModalMode(null);
    }
  };

  const handleCloseDeleteModal = () => {
    setPartyToDelete(null);
    setDeleteModalMode(null);
  };

  const handleOpenAdd = () => {
    setName('');
    setMobile('');
    setAddress('');
    setNotes('');
    setPhotoUrl(null);
    setAadhaarUrl(null);
    setChequeUrl(null);
    setValidationError('');
    setIsAddOpen(true);
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    const trimmedName = name.trim();
    const trimmedMobile = mobile.trim();

    if (!trimmedName || !trimmedMobile) {
      setValidationError('Please enter customer party name and mobile number.');
      return;
    }

    const cleanMobile = trimmedMobile.replace(/\D/g, '').slice(-10);
    if (cleanMobile.length >= 10) {
      const existingByMobile = parties.find(
        (p) => p.mobile.replace(/\D/g, '').slice(-10) === cleanMobile
      );
      if (existingByMobile) {
        setValidationError(
          `A customer with this mobile number already exists ("${existingByMobile.name}"). Duplicate entries are not allowed.`
        );
        return;
      }
    }

    const existingByName = parties.find(
      (p) => p.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (existingByName) {
      setValidationError(
        `A customer with the name "${existingByName.name}" already exists. Duplicate customer names are not allowed.`
      );
      return;
    }

    onAddParty({
      name: trimmedName,
      mobile: trimmedMobile,
      address: address.trim(),
      notes: notes.trim(),
      photoUrl,
      aadhaarUrl,
      chequeUrl,
    });
    setIsAddOpen(false);
  };

  const handleOpenEdit = (party: Party) => {
    setEditId(party.id);
    setName(party.name);
    setMobile(party.mobile);
    setAddress(party.address);
    setNotes(party.notes);
    setPhotoUrl(party.photoUrl || null);
    setAadhaarUrl(party.aadhaarUrl || null);
    setChequeUrl(party.chequeUrl || null);
    setValidationError('');
    setIsEditOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    const trimmedName = name.trim();
    const trimmedMobile = mobile.trim();

    if (!trimmedName || !trimmedMobile) {
      setValidationError('Please enter customer party name and mobile number.');
      return;
    }

    const cleanMobile = trimmedMobile.replace(/\D/g, '').slice(-10);
    if (cleanMobile.length >= 10) {
      const existingByMobile = parties.find(
        (p) => p.id !== editId && p.mobile.replace(/\D/g, '').slice(-10) === cleanMobile
      );
      if (existingByMobile) {
        setValidationError(
          `Another customer with this mobile number already exists ("${existingByMobile.name}").`
        );
        return;
      }
    }

    const existingByName = parties.find(
      (p) => p.id !== editId && p.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (existingByName) {
      setValidationError(
        `Another customer with the name "${existingByName.name}" already exists.`
      );
      return;
    }

    const original = parties.find((p) => p.id === editId);
    if (original) {
      const updatedPartyObj = {
        ...original,
        name: trimmedName,
        mobile: trimmedMobile,
        address: address.trim(),
        notes: notes.trim(),
        photoUrl,
        aadhaarUrl,
        chequeUrl,
      };
      onEditParty(updatedPartyObj);
      if (selectedParty && selectedParty.id === editId) {
        setSelectedParty(updatedPartyObj);
      }
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
          
          {/* Header with Call, WhatsApp, Avatar & Verification Status */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-100">
            <div className="flex items-start gap-4">
              {/* Customer Face Avatar */}
              {selectedParty.photoUrl ? (
                <div className="relative group flex-shrink-0">
                  <img
                    src={selectedParty.photoUrl}
                    alt={selectedParty.name}
                    onClick={() => handleOpenLightbox(selectedParty.photoUrl!, selectedParty.name, 'Customer Face Photo')}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-primary/20 shadow-md cursor-pointer group-hover:opacity-90 transition"
                    title="Click to view full photo"
                  />
                  <div
                    onClick={() => handleOpenLightbox(selectedParty.photoUrl!, selectedParty.name, 'Customer Face Photo')}
                    className="absolute inset-0 rounded-2xl bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                  >
                    <Eye className="w-5 h-5 text-white" />
                  </div>
                </div>
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center text-xl sm:text-2xl font-black text-slate-500 shadow-sm flex-shrink-0">
                  {selectedParty.name.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="space-y-2">
                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-primary transition-all uppercase tracking-wider mb-1"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Parties
                </button>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono text-xs font-black px-2.5 py-1 rounded-xl bg-orange-100 text-primary border border-orange-200">
                    Customer #{selectedParty.customerNumber || 1}
                  </span>
                  <h3 className="text-2xl font-black text-charcoal">{selectedParty.name}</h3>

                  {/* KYC Verification Status Badge */}
                  {(() => {
                    const docsCount = [selectedParty.photoUrl, selectedParty.aadhaarUrl, selectedParty.chequeUrl].filter(Boolean).length;
                    if (docsCount === 3) {
                      return (
                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          KYC Verified (3/3)
                        </span>
                      );
                    }
                    if (docsCount > 0) {
                      return (
                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                          KYC Partial ({docsCount}/3)
                        </span>
                      );
                    }
                    return (
                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                        No Documents Uploaded
                      </span>
                    );
                  })()}
                </div>
                
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

                  <button
                    onClick={() => handleOpenEdit(selectedParty)}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-sm"
                    title="Edit Party & Documents"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Documents</span>
                  </button>

                  <button
                    onClick={() => handleInitiateDelete(selectedParty)}
                    className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                    title="Delete Customer Party"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Party</span>
                  </button>
                </div>
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

          {/* Customer KYC & Verification Documents Section */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-black text-charcoal flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Customer Verification & KYC Documents (ग्राहक पडताळणी दस्तऐवज)
                </h4>
                <p className="text-xs text-slate-500 font-light mt-0.5">
                  Uploaded identity documents: Customer Face Photo, Government Aadhaar Card, and Security Cheque.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleOpenEdit(selectedParty)}
                className="self-start sm:self-auto px-3.5 py-1.5 bg-white border border-slate-200 hover:border-primary text-slate-700 hover:text-primary font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-xs"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Upload / Change Documents</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Document 1: Face Photo */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                    <Camera className="w-3.5 h-3.5 text-primary" />
                    Customer Face Photo
                  </span>
                  {selectedParty.photoUrl ? (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Uploaded
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      Missing
                    </span>
                  )}
                </div>

                {selectedParty.photoUrl ? (
                  <div
                    onClick={() => handleOpenLightbox(selectedParty.photoUrl!, selectedParty.name, 'Customer Face Photo')}
                    className="relative group h-40 rounded-xl overflow-hidden bg-slate-100 cursor-pointer border border-slate-200"
                  >
                    <img
                      src={selectedParty.photoUrl}
                      alt="Customer Face"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5 text-white font-bold text-xs">
                      <Eye className="w-4 h-4" /> Click to Enlarge
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => handleOpenEdit(selectedParty)}
                    className="h-40 border-2 border-dashed border-slate-200 hover:border-primary/50 hover:bg-slate-50/60 rounded-xl flex flex-col items-center justify-center p-3 text-center cursor-pointer transition"
                  >
                    <Camera className="w-6 h-6 text-slate-300 mb-1" />
                    <span className="text-xs font-bold text-slate-500">No Photo Uploaded</span>
                    <span className="text-[10px] text-primary font-semibold mt-1">Click to Upload Now</span>
                  </div>
                )}
              </div>

              {/* Document 2: Aadhaar Card */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                    <FileBadge className="w-3.5 h-3.5 text-blue-600" />
                    Aadhaar Card Photo
                  </span>
                  {selectedParty.aadhaarUrl ? (
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Uploaded
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      Missing
                    </span>
                  )}
                </div>

                {selectedParty.aadhaarUrl ? (
                  <div
                    onClick={() => handleOpenLightbox(selectedParty.aadhaarUrl!, selectedParty.name, 'Aadhaar Card Document')}
                    className="relative group h-40 rounded-xl overflow-hidden bg-slate-100 cursor-pointer border border-slate-200"
                  >
                    <img
                      src={selectedParty.aadhaarUrl}
                      alt="Aadhaar Card"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5 text-white font-bold text-xs">
                      <Eye className="w-4 h-4" /> Click to Enlarge
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => handleOpenEdit(selectedParty)}
                    className="h-40 border-2 border-dashed border-slate-200 hover:border-primary/50 hover:bg-slate-50/60 rounded-xl flex flex-col items-center justify-center p-3 text-center cursor-pointer transition"
                  >
                    <FileBadge className="w-6 h-6 text-slate-300 mb-1" />
                    <span className="text-xs font-bold text-slate-500">No Aadhaar Uploaded</span>
                    <span className="text-[10px] text-primary font-semibold mt-1">Click to Upload Now</span>
                  </div>
                )}
              </div>

              {/* Document 3: Cheque Photo */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                    <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                    Security Cheque Photo
                  </span>
                  {selectedParty.chequeUrl ? (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Uploaded
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      Missing
                    </span>
                  )}
                </div>

                {selectedParty.chequeUrl ? (
                  <div
                    onClick={() => handleOpenLightbox(selectedParty.chequeUrl!, selectedParty.name, 'Security Cheque Photo')}
                    className="relative group h-40 rounded-xl overflow-hidden bg-slate-100 cursor-pointer border border-slate-200"
                  >
                    <img
                      src={selectedParty.chequeUrl}
                      alt="Security Cheque"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5 text-white font-bold text-xs">
                      <Eye className="w-4 h-4" /> Click to Enlarge
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => handleOpenEdit(selectedParty)}
                    className="h-40 border-2 border-dashed border-slate-200 hover:border-primary/50 hover:bg-slate-50/60 rounded-xl flex flex-col items-center justify-center p-3 text-center cursor-pointer transition"
                  >
                    <CreditCard className="w-6 h-6 text-slate-300 mb-1" />
                    <span className="text-xs font-bold text-slate-500">No Cheque Uploaded</span>
                    <span className="text-[10px] text-primary font-semibold mt-1">Click to Upload Now</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Core profile sections */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2">
            
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
                  <h4 className="text-sm font-bold text-charcoal">Payment History</h4>
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
                    <th className="px-4 py-4 text-center w-16">Cust #</th>
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
                        <td className="px-4 py-4 text-center whitespace-nowrap">
                          <span className="font-mono font-black text-xs px-2.5 py-1 rounded-xl bg-orange-50 text-primary border border-orange-200">
                            #{party.customerNumber || 1}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {/* Party Face Avatar */}
                            {party.photoUrl ? (
                              <img
                                src={party.photoUrl}
                                alt={party.name}
                                onClick={() => handleOpenLightbox(party.photoUrl!, party.name, 'Customer Face Photo')}
                                className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-xs cursor-pointer hover:opacity-85 transition flex-shrink-0"
                                title="Click to enlarge photo"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-black text-slate-600 flex-shrink-0">
                                {party.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-slate-800">{party.name}</div>
                              {/* Document Badges */}
                              <div className="flex items-center gap-1 mt-1">
                                <span
                                  className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                    party.photoUrl
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-slate-50 text-slate-400 border border-slate-200'
                                  }`}
                                  title={party.photoUrl ? 'Face Photo: Uploaded' : 'Face Photo: Not uploaded'}
                                >
                                  <Camera className="w-2.5 h-2.5" /> Photo
                                </span>
                                <span
                                  className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                    party.aadhaarUrl
                                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                      : 'bg-slate-50 text-slate-400 border border-slate-200'
                                  }`}
                                  title={party.aadhaarUrl ? 'Aadhaar Card: Uploaded' : 'Aadhaar Card: Not uploaded'}
                                >
                                  <FileBadge className="w-2.5 h-2.5" /> Aadhaar
                                </span>
                                <span
                                  className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                    party.chequeUrl
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : 'bg-slate-50 text-slate-400 border border-slate-200'
                                  }`}
                                  title={party.chequeUrl ? 'Cheque Photo: Uploaded' : 'Cheque Photo: Not uploaded'}
                                >
                                  <CreditCard className="w-2.5 h-2.5" /> Cheque
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
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
                              onClick={() => handleInitiateDelete(party)}
                              className="p-1.5 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded transition-all cursor-pointer"
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
                      <td colSpan={10} className="px-6 py-10 text-center text-slate-400 font-light italic">
                        No parties added yet.
                      </td>
                    </tr>
                  ) : filteredParties.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-10 text-center text-slate-400 font-light italic">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-scaleUp text-left my-auto">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-shrink-0">
              <h4 className="text-base font-bold text-charcoal flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                Add New Customer Party
              </h4>
              <button onClick={() => setIsAddOpen(false)} className="p-1 text-slate-400 hover:text-slate-800 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveAdd} className="p-6 space-y-5 overflow-y-auto flex-1">
              {validationError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                  <span>{validationError}</span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  rows={2}
                  placeholder="e.g. Prefers flat steel plates of 24x3 only..."
                  className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-primary focus:outline-none focus:ring-1 px-4 py-3 rounded-xl text-sm font-medium"
                />
              </div>

              {/* Customer Verification & KYC Documents Uploads */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Customer Verification Documents (ग्राहक पडताळणी दस्तऐवज)
                    </h5>
                    <p className="text-[11px] text-slate-400 font-light mt-0.5">
                      Upload face photo, Aadhaar card, and security cheque.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Recommended
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <DocumentUploadCard
                    label="Customer Face Photo"
                    sublabel="Selfie or face photo"
                    value={photoUrl}
                    onChange={setPhotoUrl}
                    icon={<Camera className="w-3.5 h-3.5 text-primary" />}
                    onPreview={(url, title) => handleOpenLightbox(url, title, `${name || 'New Party'} - Face Photo`)}
                  />
                  <DocumentUploadCard
                    label="Aadhaar Card"
                    sublabel="Front/full ID proof"
                    value={aadhaarUrl}
                    onChange={setAadhaarUrl}
                    icon={<FileBadge className="w-3.5 h-3.5 text-blue-600" />}
                    onPreview={(url, title) => handleOpenLightbox(url, title, `${name || 'New Party'} - Aadhaar Card`)}
                  />
                  <DocumentUploadCard
                    label="Security Cheque"
                    sublabel="Signed cheque copy"
                    value={chequeUrl}
                    onChange={setChequeUrl}
                    icon={<CreditCard className="w-3.5 h-3.5 text-amber-600" />}
                    onPreview={(url, title) => handleOpenLightbox(url, title, `${name || 'New Party'} - Security Cheque`)}
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100 justify-end flex-shrink-0">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-scaleUp text-left my-auto">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-shrink-0">
              <h4 className="text-base font-bold text-charcoal">Edit Party Details & Documents</h4>
              <button onClick={() => setIsEditOpen(false)} className="p-1 text-slate-400 hover:text-slate-800 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="p-6 space-y-5 overflow-y-auto flex-1">
              {validationError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                  <span>{validationError}</span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  rows={2}
                  className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-primary focus:outline-none focus:ring-1 px-4 py-3 rounded-xl text-sm font-medium"
                />
              </div>

              {/* Customer Verification & KYC Documents Uploads */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Verification Documents (ग्राहक पडताळणी दस्तऐवज)
                    </h5>
                    <p className="text-[11px] text-slate-400 font-light mt-0.5">
                      Manage customer face photo, Aadhaar card, and security cheque.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <DocumentUploadCard
                    label="Customer Face Photo"
                    sublabel="Selfie or face photo"
                    value={photoUrl}
                    onChange={setPhotoUrl}
                    icon={<Camera className="w-3.5 h-3.5 text-primary" />}
                    onPreview={(url, title) => handleOpenLightbox(url, title, `${name} - Face Photo`)}
                  />
                  <DocumentUploadCard
                    label="Aadhaar Card"
                    sublabel="Front/full ID proof"
                    value={aadhaarUrl}
                    onChange={setAadhaarUrl}
                    icon={<FileBadge className="w-3.5 h-3.5 text-blue-600" />}
                    onPreview={(url, title) => handleOpenLightbox(url, title, `${name} - Aadhaar Card`)}
                  />
                  <DocumentUploadCard
                    label="Security Cheque"
                    sublabel="Signed cheque copy"
                    value={chequeUrl}
                    onChange={setChequeUrl}
                    icon={<CreditCard className="w-3.5 h-3.5 text-amber-600" />}
                    onPreview={(url, title) => handleOpenLightbox(url, title, `${name} - Security Cheque`)}
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100 justify-end flex-shrink-0">
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

      {/* Lightbox Viewer Modal for Full Size Documents */}
      <ImageLightboxModal
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        imageUrl={lightboxImage}
        title={lightboxTitle}
        subtitle={lightboxSubtitle}
      />

      {/* 1. BLOCKED PARTY DELETION MODAL (Active Plates or Pending Balance) */}
      {deleteModalMode === 'blocked' && partyToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full overflow-hidden shadow-2xl animate-scaleUp text-left">
            <div className="px-6 py-5 border-b border-rose-100 flex justify-between items-center bg-rose-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-xs">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">Cannot Delete Customer</h4>
                  <p className="text-[11px] font-semibold text-rose-700">ग्राहक पार्टी हटवता येणार नाही (Unsettled)</p>
                </div>
              </div>
              <button
                onClick={handleCloseDeleteModal}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Customer <strong className="text-slate-900 font-bold font-mono">"{partyToDelete.name}"</strong> cannot be deleted because there are unsettled transactions linked to this party:
              </p>

              <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                {partyToDeleteStats.pendingPlates > 0 && (
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-rose-200/80 shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Pending Return Plates</p>
                        <p className="text-[10px] text-slate-500 font-medium">प्लेट्स अजून साइटवर शिल्लक आहेत</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 font-mono">
                      {partyToDeleteStats.pendingPlates} Plates
                    </span>
                  </div>
                )}

                {partyToDeleteStats.pendingBalance > 0 && (
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-amber-200/80 shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                        <IndianRupee className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Outstanding Balance Due</p>
                        <p className="text-[10px] text-slate-500 font-medium">येणे बाकी भाडे रक्कम</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 font-mono">
                      ₹{partyToDeleteStats.pendingBalance.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>

              <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl text-xs text-rose-900 font-medium leading-relaxed">
                ℹ️ All plates must be returned and all outstanding payments must be settled before a party can be deleted. This ensures stock and ledger integrity.
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleCloseDeleteModal}
                  className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
                >
                  Understood / ठीक आहे
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. CONFIRM PARTY DELETION MODAL (All Settled) */}
      {deleteModalMode === 'confirm' && partyToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full overflow-hidden shadow-2xl animate-scaleUp text-left">
            <div className="px-6 py-5 border-b border-rose-100 flex justify-between items-center bg-rose-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-xs">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">Delete Customer Party</h4>
                  <p className="text-[11px] font-semibold text-slate-500">ग्राहक पार्टी कायमस्वरूपी हटवा</p>
                </div>
              </div>
              <button
                onClick={handleCloseDeleteModal}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Are you sure you want to permanently delete customer party <strong className="text-slate-900 font-bold font-mono">"{partyToDelete.name}"</strong>?
              </p>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Customer:</span>
                  <span className="font-bold text-slate-900">{partyToDelete.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Mobile:</span>
                  <span className="font-mono font-bold text-slate-800">+91 {partyToDelete.mobile}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Plates on Site:</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200">
                    0 Plates (All Returned ✓)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Pending Balance:</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200">
                    ₹0 (Fully Settled ✓)
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-rose-600 font-bold bg-rose-50/70 p-2.5 rounded-xl border border-rose-200/80">
                ⚠️ Warning: This will delete this party profile and any associated KYC documents. This action cannot be undone.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseDeleteModal}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Yes, Delete Party</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
