import React, { useState } from 'react';
import { Plus, Search, RefreshCw, X, Check, Info } from 'lucide-react';
import type { Party, Rental, ReturnLog, RentalCycle } from '../../../data/adminMockData';
import { calculateCalendarDays, calculateCycleFinances } from '../../../lib/supabase';

interface ReturnsTabProps {
  returns: ReturnLog[];
  rentals: Rental[];
  parties: Party[];
  rentalCycles?: RentalCycle[];
  onAddReturn: (newReturn: Omit<ReturnLog, 'id' | 'partyName' | 'plateType' | 'issuedQuantity'>) => void;
  preselectedRentalId?: string | null;
  onClearPreselectedRental?: () => void;
}

export const ReturnsTab: React.FC<ReturnsTabProps> = ({
  returns,
  rentals,
  parties,
  rentalCycles = [],
  onAddReturn,
  preselectedRentalId,
  onClearPreselectedRental,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form states
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [selectedRentalId, setSelectedRentalId] = useState('');
  const [returnedQty, setReturnedQty] = useState<number>(0);
  const [returnDate, setReturnDate] = useState(todayStr);

  const [validationError, setValidationError] = useState('');

  // Handle preselected rental from other tabs
  React.useEffect(() => {
    if (preselectedRentalId) {
      const targetRental = rentals.find((r) => r.id === preselectedRentalId);
      if (targetRental) {
        const returnedSum = returns
          .filter((ret) => ret.rentalId === targetRental.id)
          .reduce((sum, ret) => sum + ret.returnedQuantity, 0);
        const remaining = Math.max(0, targetRental.quantity - returnedSum);

        setSelectedPartyId(targetRental.partyId);
        setSelectedRentalId(targetRental.id);
        setReturnedQty(remaining);
        setReturnDate(todayStr);
        setValidationError('');
        setIsAddOpen(true);
      }
      if (onClearPreselectedRental) {
        onClearPreselectedRental();
      }
    }
  }, [preselectedRentalId, rentals, returns, onClearPreselectedRental, todayStr]);

  const filteredReturns = returns.filter((r) =>
    r.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.plateType.includes(searchTerm)
  );

  const partyActiveRentals = rentals.filter(
    (r) => r.partyId === selectedPartyId && (r.status === 'active' || r.status === 'overdue')
  );

  const selectedRental = rentals.find((r) => r.id === selectedRentalId);

  // Find active cycle for selected rental
  const getActiveCycle = (rental: Rental): RentalCycle | null => {
    const list = rentalCycles.filter((c) => c.rentalId === rental.id);
    if (list.length > 0) {
      return list.find((c) => c.status === 'active') || list[list.length - 1];
    }
    return null;
  };

  const selectedActiveCycle = selectedRental ? getActiveCycle(selectedRental) : null;
  const cycleElapsed = selectedActiveCycle
    ? calculateCalendarDays(selectedActiveCycle.startDate, returnDate)
    : selectedRental
    ? calculateCalendarDays(selectedRental.issueDate, returnDate)
    : 0;

  const cycleFinances = selectedActiveCycle && selectedRental
    ? calculateCycleFinances(
        {
          startDate: selectedActiveCycle.startDate,
          actualEndDate: returnDate,
          quantity: selectedActiveCycle.quantity,
          dailyRate: selectedActiveCycle.dailyRate,
          baseRent: selectedActiveCycle.baseRent,
          paidAmount: selectedActiveCycle.paidAmount,
          items: selectedRental.items,
        },
        returnDate
      )
    : null;

  const getAlreadyReturned = (rental: Rental) => {
    return returns
      .filter((ret) => ret.rentalId === rental.id)
      .reduce((sum, ret) => sum + ret.returnedQuantity, 0);
  };

  const getRemainingToReturn = (rental: Rental) => {
    const returnedSum = getAlreadyReturned(rental);
    return Math.max(0, rental.quantity - returnedSum);
  };

  const handleOpenAdd = () => {
    setSelectedPartyId(parties[0]?.id || '');
    setSelectedRentalId('');
    setReturnedQty(0);
    setReturnDate(todayStr);
    setValidationError('');
    setIsAddOpen(true);
  };

  const handlePartyChange = (partyId: string) => {
    setSelectedPartyId(partyId);
    setSelectedRentalId('');
    setReturnedQty(0);
  };

  const handleRentalChange = (rentalId: string) => {
    setSelectedRentalId(rentalId);
    const rental = rentals.find((r) => r.id === rentalId);
    if (rental) {
      const remaining = getRemainingToReturn(rental);
      setReturnedQty(remaining);
    }
  };

  const handleReturnAll = () => {
    if (selectedRental) {
      const remaining = getRemainingToReturn(selectedRental);
      setReturnedQty(remaining);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!selectedPartyId || !selectedRentalId) {
      setValidationError('Please select a customer party and active rental agreement.');
      return;
    }

    if (returnedQty <= 0) {
      setValidationError('Please enter a return quantity greater than 0.');
      return;
    }

    if (selectedRental) {
      const remainingLimit = getRemainingToReturn(selectedRental);
      if (returnedQty > remainingLimit) {
        setValidationError(`You can return maximum ${remainingLimit} plates.`);
        return;
      }

      onAddReturn({
        partyId: selectedPartyId,
        rentalId: selectedRentalId,
        returnedQuantity: returnedQty,
        remainingQuantity: remainingLimit - returnedQty,
        returnDate,
      });

      setIsAddOpen(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
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
            placeholder="Search Returns by Party or Size..."
            className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-primary focus:outline-none pl-11 pr-4 py-3 rounded-xl text-sm font-medium"
          />
        </div>

        {/* Trigger Button */}
        <button
          onClick={handleOpenAdd}
          className="bg-primary hover:bg-primary-dark text-white font-bold px-5 py-3 rounded-xl shadow-md hover:shadow-orange-500/10 flex items-center justify-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Return Intake</span>
        </button>
      </div>

      {/* Grid of Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Returned Logs Table (7 Columns) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <h4 className="text-sm font-bold text-charcoal">Material Return Logs</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                  <th className="px-6 py-4">Return Date</th>
                  <th className="px-6 py-4">Party Name</th>
                  <th className="px-6 py-4">Size</th>
                  <th className="px-6 py-4">Returned Qty</th>
                  <th className="px-6 py-4">Remaining</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-light">
                {filteredReturns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-slate-500 font-mono">{ret.returnDate}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">{ret.partyName}</td>
                    <td className="px-6 py-4 font-mono text-slate-500">{ret.plateType}</td>
                    <td className="px-6 py-4 font-bold text-emerald-600">+{ret.returnedQuantity}</td>
                    <td className={`px-6 py-4 ${ret.remainingQuantity > 0 ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                      {ret.remainingQuantity > 0 ? `${ret.remainingQuantity} left` : 'Fully Cleaned'}
                    </td>
                  </tr>
                ))}
                {returns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-light italic">
                      No returns logged yet.
                    </td>
                  </tr>
                ) : filteredReturns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-light italic">
                      No return logs found matching query.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Active Dispatches Pending Return (5 Columns) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <h4 className="text-sm font-bold text-charcoal">Pending Return Allocations</h4>
          </div>
          <div className="divide-y divide-slate-100">
            {rentals.filter((r) => r.status === 'active' || r.status === 'overdue').length === 0 ? (
              <div className="p-6 text-center text-slate-400 font-light italic text-xs sm:text-sm">
                No active dispatches pending return.
              </div>
            ) : (
              rentals
                .filter((r) => r.status === 'active' || r.status === 'overdue')
                .map((rent) => {
                  const remaining = getRemainingToReturn(rent);
                  if (remaining <= 0) return null;
                  const cyc = getActiveCycle(rent);
                  return (
                    <div key={rent.id} className="p-4 hover:bg-slate-50/50 transition-colors flex justify-between items-center text-left text-xs sm:text-sm">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-slate-800">{rent.partyName}</p>
                          {cyc && (
                            <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded font-bold">
                              Cyc {cyc.cycleNumber}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-500 text-xs font-mono">{rent.plateType} • {remaining} plates outstanding</p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedPartyId(rent.partyId);
                          setSelectedRentalId(rent.id);
                          setReturnedQty(remaining);
                          setValidationError('');
                          setIsAddOpen(true);
                        }}
                        className="text-xs bg-orange-50 hover:bg-orange-100 text-primary border border-orange-200 px-3 py-1.5 rounded-lg font-bold"
                      >
                        Receive
                      </button>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>

      {/* Add Return Intake Dialog */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full overflow-hidden shadow-2xl animate-scaleUp text-left">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h4 className="text-base font-bold text-charcoal flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-primary" />
                Receive Shuttering Plates Intake
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

              {/* Step 1: Customer Party */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Customer Party *</label>
                <select
                  value={selectedPartyId}
                  onChange={(e) => handlePartyChange(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 px-4 py-3 rounded-xl text-sm font-medium"
                >
                  <option value="">-- Choose Party --</option>
                  {parties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Step 2: Choose active rental */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Active Rental Agreement *</label>
                <select
                  value={selectedRentalId}
                  onChange={(e) => handleRentalChange(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 px-4 py-3 rounded-xl text-sm font-medium"
                >
                  <option value="">-- Choose Dispatch Record --</option>
                  {partyActiveRentals.map((r) => {
                    const remaining = getRemainingToReturn(r);
                    const cyc = getActiveCycle(r);
                    return (
                      <option key={r.id} value={r.id}>
                        {r.plateType} Width {cyc ? `[Cycle ${cyc.cycleNumber}]` : ''} (Issued {r.quantity} • Remaining: {remaining} plates)
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedRental && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Issued Quantity:</span>
                    <span className="font-bold text-slate-800">{selectedRental.quantity} plates</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Already Returned:</span>
                    <span className="font-semibold text-slate-600">{getAlreadyReturned(selectedRental)} plates</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span className="text-slate-700 font-bold">Remaining on Site:</span>
                    <span className="font-black text-orange-600 text-sm">
                      {getRemainingToReturn(selectedRental)} plates
                    </span>
                  </div>

                  {/* Active Cycle Duration & Extra Days Breakdown */}
                  {selectedActiveCycle && cycleFinances && (
                    <div className="pt-2 border-t border-slate-200 space-y-1 bg-white/70 p-2.5 rounded-xl">
                      <div className="flex justify-between text-slate-700">
                        <span className="font-semibold">Active Cycle #{selectedActiveCycle.cycleNumber}:</span>
                        <span className="font-mono text-[11px]">{selectedActiveCycle.startDate} → {selectedActiveCycle.expectedEndDate}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Elapsed on Return:</span>
                        <span className="font-bold text-slate-800">{cycleElapsed} Days ({cycleFinances.standardDays} Std + {cycleFinances.extraDays} Extra)</span>
                      </div>
                      {cycleFinances.extraDays > 0 && (
                        <div className="flex justify-between text-amber-800 font-bold">
                          <span>Extra Charges for Return:</span>
                          <span>+₹{cycleFinances.extraAmount.toLocaleString('en-IN')} ({cycleFinances.extraDays} days past 40d)</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Quantities and Date with Return All button */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-500 uppercase">
                      Return Quantity (Plates Count) *
                    </label>
                    {selectedRental && (
                      <button
                        type="button"
                        onClick={handleReturnAll}
                        className="text-xs text-primary font-bold hover:text-primary-dark underline"
                      >
                        [ Return All ({getRemainingToReturn(selectedRental)}) ]
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    min="1"
                    required
                    value={returnedQty || ''}
                    onChange={(e) => setReturnedQty(Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="e.g. 100"
                    className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 px-4 py-3 rounded-xl text-sm font-semibold text-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Return Date *</label>
                  <input
                    type="date"
                    required
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 px-4 py-3 rounded-xl text-sm font-medium"
                  />
                </div>
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
                  <span>Confirm Return</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

