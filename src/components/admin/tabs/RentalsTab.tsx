import React, { useState } from 'react';
import { Plus, Search, X, Check, ClipboardList, Info, HelpCircle, Trash2 } from 'lucide-react';
import type { Party, PlateStock, Rental, RentalItem } from '../../../data/adminMockData';

interface PlateRowItem {
  id: string;
  plateType: string;
  quantity: number;
  dailyRate: number;
  days: number;
}

interface RentalsTabProps {
  rentals: Rental[];
  parties: Party[];
  plates: PlateStock[];
  onAddRental: (newRental: Omit<Rental, 'id' | 'totalRent' | 'pending' | 'status'>) => void;
  onUpdateRentalStatus: (rentalId: string, status: 'active' | 'returned' | 'overdue') => void;
}

export const RentalsTab: React.FC<RentalsTabProps> = ({
  rentals,
  parties,
  plates,
  onAddRental,
  onUpdateRentalStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form states
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [plateRows, setPlateRows] = useState<PlateRowItem[]>([
    { id: 'row-1', plateType: '24×3', quantity: 100, dailyRate: 1.50, days: 40 },
  ]);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<'Account 1' | 'Account 2' | 'Cash' | 'Udhari'>('Udhari');
  
  const [validationError, setValidationError] = useState('');

  // Calculations across all plate rows
  const calculatedTotalRent = plateRows.reduce(
    (sum, r) => sum + r.quantity * r.dailyRate * r.days,
    0
  );
  const calculatedPending = Math.max(0, calculatedTotalRent - amountPaid);

  const filteredRentals = rentals.filter((r) =>
    r.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.plateType.includes(searchTerm)
  );

  const handleOpenAdd = () => {
    setSelectedPartyId(parties[0]?.id || '');
    setIssueDate(new Date().toISOString().split('T')[0]);
    const firstPlate = plates[0];
    setPlateRows([
      {
        id: `row-${Date.now()}-1`,
        plateType: firstPlate?.plateType || '24×3',
        quantity: 100,
        dailyRate: firstPlate?.dailyRate || 1.50,
        days: 40,
      },
    ]);
    setAmountPaid(0);
    setPaymentMode('Udhari');
    setValidationError('');
    setIsAddOpen(true);
  };

  const handleAddPlateRow = () => {
    // Find first plate type that is not yet added in the rows
    const unusedPlate = plates.find(
      (p) => !plateRows.some((r) => r.plateType === p.plateType)
    );
    const targetPlate = unusedPlate || plates[0];
    const newRow: PlateRowItem = {
      id: `row-${Date.now()}-${plateRows.length + 1}`,
      plateType: targetPlate?.plateType || '21×3',
      quantity: 50,
      dailyRate: targetPlate?.dailyRate || 1.50,
      days: plateRows[0]?.days || 40,
    };
    setPlateRows((prev) => [...prev, newRow]);
  };

  const handleRemovePlateRow = (id: string) => {
    setPlateRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdatePlateRow = (id: string, field: keyof PlateRowItem, value: any) => {
    setPlateRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: value };
        if (field === 'plateType') {
          const matched = plates.find((p) => p.plateType === value);
          if (matched) {
            updated.dailyRate = matched.dailyRate;
          }
        }
        return updated;
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!selectedPartyId || plateRows.length === 0) {
      setValidationError('Please select a customer party and at least one plate row.');
      return;
    }

    // Validate duplicate plate types
    const selectedTypes = plateRows.map((r) => r.plateType);
    const hasDuplicates = new Set(selectedTypes).size !== selectedTypes.length;
    if (hasDuplicates) {
      setValidationError('This plate type is already added. Duplicate plate sizes are not allowed.');
      return;
    }

    // Validate quantities and availability for every row
    for (const row of plateRows) {
      if (!row.plateType) {
        setValidationError('Please choose a valid plate size for all rows.');
        return;
      }
      if (row.quantity <= 0) {
        setValidationError(`Please enter a quantity greater than 0 for size ${row.plateType}.`);
        return;
      }
      if (row.days <= 0) {
        setValidationError(`Please enter rental term days greater than 0 for size ${row.plateType}.`);
        return;
      }

      const matchedPlate = plates.find((p) => p.plateType === row.plateType);
      const available = matchedPlate ? matchedPlate.available : 0;
      if (row.quantity > available) {
        setValidationError(`Only ${available} plates are available for size ${row.plateType}.`);
        return;
      }
    }

    const party = parties.find((p) => p.id === selectedPartyId);
    if (!party) return;

    const items: RentalItem[] = plateRows.map((r) => ({
      plateType: r.plateType,
      quantity: r.quantity,
      dailyRate: r.dailyRate,
      days: r.days,
    }));

    const totalQuantity = plateRows.reduce((sum, r) => sum + r.quantity, 0);
    const plateTypeSummary =
      plateRows.length === 1
        ? plateRows[0].plateType
        : plateRows.map((r) => `${r.plateType} (${r.quantity})`).join(', ');

    onAddRental({
      partyId: selectedPartyId,
      partyName: party.name,
      plateType: plateTypeSummary,
      quantity: totalQuantity,
      dailyRate: plateRows[0]?.dailyRate || 1.50,
      issueDate,
      days: plateRows[0]?.days || 40,
      paid: amountPaid,
      paymentMode,
      items,
    });

    setIsAddOpen(false);
  };

  return (
    <div className="space-y-6 text-left">
      
      {/* Header bar */}
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
            placeholder="Search Rental by Party Name or Size..."
            className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-primary focus:outline-none pl-11 pr-4 py-3 rounded-xl text-sm font-medium"
          />
        </div>

        {/* Trigger Button */}
        <button
          onClick={handleOpenAdd}
          className="bg-primary hover:bg-primary-dark text-white font-bold px-5 py-3 rounded-xl shadow-md hover:shadow-orange-500/10 flex items-center justify-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Rental Dispatch</span>
        </button>
      </div>

      {/* Rentals Table */}
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="px-6 py-4">Party Name</th>
                <th className="px-6 py-4">Size</th>
                <th className="px-6 py-4">Qty</th>
                <th className="px-6 py-4">Dispatch Date</th>
                <th className="px-6 py-4">Rental Term</th>
                <th className="px-6 py-4">Total Rental</th>
                <th className="px-6 py-4">Paid</th>
                <th className="px-6 py-4">Outstanding</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-light">
              {filteredRentals.map((rent) => (
                <tr key={rent.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-800">{rent.partyName}</td>
                  <td className="px-6 py-4 font-mono text-slate-500">{rent.plateType}</td>
                  <td className="px-6 py-4 font-bold text-slate-800">{rent.quantity}</td>
                  <td className="px-6 py-4 text-slate-500">{rent.issueDate}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {rent.days} Days
                    {rent.days >= 40 && (
                      <span className="relative group/tooltip cursor-help ml-1">
                        <HelpCircle className="w-3.5 h-3.5 text-slate-400 inline" />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-900 text-white text-[10px] p-2 rounded-lg opacity-0 pointer-events-none group-hover/tooltip:opacity-100 transition-opacity duration-200 shadow-xl leading-normal text-center z-30">
                          Rental cycles extending past 40 days transition to a per-day billing extension logic.
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-800">₹{rent.totalRent}</td>
                  <td className="px-6 py-4 text-emerald-600 font-bold">₹{rent.paid}</td>
                  <td className={`px-6 py-4 font-bold ${rent.pending > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                    ₹{rent.pending}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                      rent.status === 'returned'
                        ? 'bg-slate-50 text-slate-500 border border-slate-200'
                        : rent.status === 'overdue'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {rent.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-2">
                      {rent.status === 'active' && (
                        <button
                          onClick={() => onUpdateRentalStatus(rent.id, 'overdue')}
                          className="text-xs bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-700 font-semibold px-2 py-1 rounded"
                        >
                          Mark Overdue
                        </button>
                      )}
                      {rent.status === 'overdue' && (
                        <button
                          onClick={() => onUpdateRentalStatus(rent.id, 'active')}
                          className="text-xs bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 text-emerald-700 font-semibold px-2 py-1 rounded"
                        >
                          Activate
                        </button>
                      )}
                      {rent.status === 'returned' && (
                        <span className="text-xs text-slate-400 italic">Discharged</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {rentals.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-10 text-center text-slate-400 font-light italic">
                    No rentals yet.
                  </td>
                </tr>
              ) : filteredRentals.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-10 text-center text-slate-400 font-light italic">
                    No dispatches found matching query.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Rental Dispatch Dialog */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-scaleUp text-left">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/60 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-orange-50 text-primary rounded-xl">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-charcoal">
                    Dispatch Plates - New Rental Sheet
                  </h4>
                  <p className="text-[11px] text-slate-400 font-light">
                    Issue centering plates and configure rental agreement parameters
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-grow">
              {/* Validation alert */}
              {validationError && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Row 1: Party and Dispatch Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                    Customer Party *
                  </label>
                  <select
                    value={selectedPartyId}
                    onChange={(e) => setSelectedPartyId(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary px-4 py-3 rounded-xl text-sm font-semibold text-slate-800"
                  >
                    <option value="">-- Choose Party --</option>
                    {parties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.mobile})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                    Dispatch Issue Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary px-4 py-3 rounded-xl text-sm font-semibold text-slate-800"
                  />
                </div>
              </div>

              {/* Multi-Plate Rows Section */}
              <div className="space-y-3">
                {/* Column Headers for larger screens */}
                <div className="hidden lg:grid grid-cols-12 gap-3 text-xs font-bold text-slate-600 uppercase tracking-wider px-1">
                  <div className="col-span-4">Shuttering Plate Size *</div>
                  <div className="col-span-3">Dispatch Quantity *</div>
                  <div className="col-span-2">Daily Rate (₹/day) *</div>
                  <div className="col-span-2">Rental Term (Days) *</div>
                  <div className="col-span-1 text-center">Action</div>
                </div>

                {/* Rows List */}
                <div className="space-y-3">
                  {plateRows.map((row, index) => (
                    <div
                      key={row.id}
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center bg-slate-50/70 p-3 sm:p-3.5 rounded-2xl border border-slate-200/70"
                    >
                      {/* Plate Size */}
                      <div className="lg:col-span-4 space-y-1 sm:space-y-0">
                        <label className="lg:hidden text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                          Plate Size *
                        </label>
                        <select
                          value={row.plateType}
                          onChange={(e) => handleUpdatePlateRow(row.id, 'plateType', e.target.value)}
                          required
                          className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800"
                        >
                          <option value="">-- Choose Width --</option>
                          {plates.map((p) => {
                            const isSelectedElsewhere = plateRows.some(
                              (r) => r.id !== row.id && r.plateType === p.plateType
                            );
                            return (
                              <option
                                key={p.plateType}
                                value={p.plateType}
                                disabled={isSelectedElsewhere}
                              >
                                {p.plateType} ({p.available} avail.){isSelectedElsewhere ? ' - Already Added' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="lg:col-span-3 space-y-1 sm:space-y-0">
                        <label className="lg:hidden text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                          Dispatch Quantity *
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={row.quantity || ''}
                          onChange={(e) =>
                            handleUpdatePlateRow(row.id, 'quantity', Math.max(0, parseInt(e.target.value) || 0))
                          }
                          placeholder="e.g. 100"
                          className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800"
                        />
                      </div>

                      {/* Daily Rate */}
                      <div className="lg:col-span-2 space-y-1 sm:space-y-0">
                        <label className="lg:hidden text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                          Daily Rate (₹/day) *
                        </label>
                        <input
                          type="number"
                          step="0.05"
                          min="0"
                          required
                          value={row.dailyRate}
                          onChange={(e) =>
                            handleUpdatePlateRow(row.id, 'dailyRate', Math.max(0, parseFloat(e.target.value) || 0))
                          }
                          className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800"
                        />
                      </div>

                      {/* Rental Term */}
                      <div className="lg:col-span-2 space-y-1 sm:space-y-0">
                        <label className="lg:hidden text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                          Rental Term (Days) *
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={row.days}
                          onChange={(e) =>
                            handleUpdatePlateRow(row.id, 'days', Math.max(1, parseInt(e.target.value) || 1))
                          }
                          className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800"
                        />
                      </div>

                      {/* Delete button (only for index > 0) */}
                      <div className="lg:col-span-1 flex items-center justify-center pt-1 sm:pt-0">
                        {index > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleRemovePlateRow(row.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            title="Remove this plate"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <div className="hidden lg:block w-8" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* + Add Plate Button */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleAddPlateRow}
                    disabled={plateRows.length >= plates.length}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-primary bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add Plate</span>
                  </button>
                </div>
              </div>

              {/* Row 3: Total Rent & Financial Payment Summary Card */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-200/70">
                  <div className="space-y-1 text-left">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      Calculated Accumulated Rent
                    </span>
                    <div className="space-y-0.5 text-[11px] text-slate-500 font-mono">
                      {plateRows.map((r, idx) => (
                        <div key={idx}>
                          {r.quantity} plates ({r.plateType}) × ₹{r.dailyRate.toFixed(2)}/day × {r.days} days = ₹{(r.quantity * r.dailyRate * r.days).toLocaleString('en-IN')}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-charcoal">
                      ₹{calculatedTotalRent.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                      Advance Amount Paid (₹) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-800"
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                      Dispatch Payment Mode *
                    </label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value as any)}
                      className="w-full bg-white border border-slate-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-800"
                    >
                      <option value="Udhari">Udhari / Outstanding</option>
                      <option value="Account 1">Account 1 (Bank)</option>
                      <option value="Account 2">Account 2 (Digital)</option>
                      <option value="Cash">Yard Drawer Cash</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-200 text-xs font-bold">
                  <span className="text-slate-500 uppercase tracking-wider">Outstanding Balance (Udhari):</span>
                  <span className={`text-base font-black ${calculatedPending > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    ₹{calculatedPending.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-2 border-t border-slate-100 justify-end flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl text-sm shadow-md hover:shadow-orange-500/20 transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Dispatch Material</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
