import React, { useState } from 'react';
import { FileText, Printer } from 'lucide-react';
import type { Party, PlateStock, Rental, ReturnLog, Payment } from '../../../data/adminMockData';

interface ReportsTabProps {
  parties: Party[];
  plates: PlateStock[];
  rentals: Rental[];
  returns: ReturnLog[];
  payments: Payment[];
}

export const ReportsTab: React.FC<ReportsTabProps> = ({
  parties,
  plates,
  rentals,
  returns,
  payments,
}) => {
  const [reportType, setReportType] = useState('rental');
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [selectedPlateType, setSelectedPlateType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const handleReset = () => {
    setSelectedPartyId('');
    setSelectedPlateType('');
    setFromDate('');
    setToDate('');
  };

  // Compile data based on selected parameters
  const getFilteredData = () => {
    switch (reportType) {
      case 'rental':
        return rentals.filter((r) => {
          if (selectedPartyId && r.partyId !== selectedPartyId) return false;
          if (selectedPlateType && r.plateType !== selectedPlateType) return false;
          if (fromDate && new Date(r.issueDate) < new Date(fromDate)) return false;
          if (toDate && new Date(r.issueDate) > new Date(toDate)) return false;
          return true;
        });
      case 'return':
        return returns.filter((r) => {
          if (selectedPartyId && r.partyId !== selectedPartyId) return false;
          if (selectedPlateType && r.plateType !== selectedPlateType) return false;
          if (fromDate && new Date(r.returnDate) < new Date(fromDate)) return false;
          if (toDate && new Date(r.returnDate) > new Date(toDate)) return false;
          return true;
        });
      case 'payment':
        return payments.filter((p) => {
          if (selectedPartyId && p.partyId !== selectedPartyId) return false;
          if (fromDate && new Date(p.date) < new Date(fromDate)) return false;
          if (toDate && new Date(p.date) > new Date(toDate)) return false;
          return true;
        });
      case 'udhari':
        return parties.filter((p) => {
          if (selectedPartyId && p.id !== selectedPartyId) return false;
          if (p.pending <= 0) return false;
          return true;
        });
      default:
        return [];
    }
  };

  const filteredData = getFilteredData();

  return (
    <div className="space-y-6 text-left">
      
      {/* Reports controls */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-5">
        <h4 className="text-sm font-bold text-charcoal flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Compile Statement Report
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* Report Type */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Select Report</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:outline-none px-3 py-2.5 rounded-xl text-xs font-semibold"
            >
              <option value="rental">Rental Dispatch Report</option>
              <option value="return">Return Intake Report</option>
              <option value="payment">Received Payments Report</option>
              <option value="udhari">Outstanding Dues Report</option>
            </select>
          </div>

          {/* Customer Party */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Customer Party</label>
            <select
              value={selectedPartyId}
              onChange={(e) => setSelectedPartyId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:outline-none px-3 py-2.5 rounded-xl text-xs font-semibold"
            >
              <option value="">All Parties</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Plate Size */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Plate Width Variant</label>
            <select
              value={selectedPlateType}
              onChange={(e) => setSelectedPlateType(e.target.value)}
              disabled={reportType === 'payment' || reportType === 'udhari'}
              className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:outline-none px-3 py-2.5 rounded-xl text-xs font-semibold disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">All Sizes</option>
              {plates.map((p) => (
                <option key={p.plateType} value={p.plateType}>{p.plateType}</option>
              ))}
            </select>
          </div>

          {/* Date from */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              disabled={reportType === 'udhari'}
              className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:outline-none px-3 py-2.5 rounded-xl text-xs font-semibold"
            />
          </div>

          {/* Date to */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              disabled={reportType === 'udhari'}
              className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:outline-none px-3 py-2.5 rounded-xl text-xs font-semibold"
            />
          </div>

        </div>

        <div className="flex gap-4 border-t border-slate-100 pt-4 justify-end">
          <button
            onClick={handleReset}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-xl transition"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Reports preview */}
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden animate-fadeIn">
        
        {/* Header block */}
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h4 className="text-sm font-bold text-charcoal uppercase tracking-wider">
              {reportType} Report Preview
            </h4>
            <p className="text-[10px] text-slate-400 font-light mt-0.5">
              Matches {filteredData.length} records. Filter parameters loaded.
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => alert('Print preview loaded. (Demo Trigger)')}
              className="p-2 hover:bg-slate-100 text-slate-500 rounded-lg border border-slate-200"
              title="Print Report"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Table display */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            
            {/* Type 1: Rental report columns */}
            {reportType === 'rental' && (
              <>
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-xs font-bold border-b border-slate-100 uppercase tracking-wider">
                    <th className="px-6 py-4">Issue Date</th>
                    <th className="px-6 py-4">Party Name</th>
                    <th className="px-6 py-4">Plate Size</th>
                    <th className="px-6 py-4">Quantity</th>
                    <th className="px-6 py-4">Rent Accrued</th>
                    <th className="px-6 py-4">Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-light">
                  {(filteredData as Rental[]).map((r) => (
                    <tr key={r.id}>
                      <td className="px-6 py-4 text-slate-500 font-mono">{r.issueDate}</td>
                      <td className="px-6 py-4 font-bold text-slate-850">{r.partyName}</td>
                      <td className="px-6 py-4 text-slate-500 font-mono">{r.plateType}</td>
                      <td className="px-6 py-4 font-bold">{r.quantity}</td>
                      <td className="px-6 py-4 font-semibold text-slate-800">₹{r.totalRent}</td>
                      <td className="px-6 py-4 text-emerald-600 font-semibold">₹{r.paid}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {/* Type 2: Return report columns */}
            {reportType === 'return' && (
              <>
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-xs font-bold border-b border-slate-100 uppercase tracking-wider">
                    <th className="px-6 py-4">Return Date</th>
                    <th className="px-6 py-4">Party Name</th>
                    <th className="px-6 py-4">Plate Size</th>
                    <th className="px-6 py-4">Returned Qty</th>
                    <th className="px-6 py-4">Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-light">
                  {(filteredData as ReturnLog[]).map((r) => (
                    <tr key={r.id}>
                      <td className="px-6 py-4 text-slate-500 font-mono">{r.returnDate}</td>
                      <td className="px-6 py-4 font-bold text-slate-850">{r.partyName}</td>
                      <td className="px-6 py-4 text-slate-500 font-mono">{r.plateType}</td>
                      <td className="px-6 py-4 text-emerald-600 font-bold">+{r.returnedQuantity}</td>
                      <td className="px-6 py-4 text-slate-400">{r.remainingQuantity}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {/* Type 3: Payment report columns */}
            {reportType === 'payment' && (
              <>
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-xs font-bold border-b border-slate-100 uppercase tracking-wider">
                    <th className="px-6 py-4">Receipt Date</th>
                    <th className="px-6 py-4">Party Name</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Channel Mode</th>
                    <th className="px-6 py-4">Voucher Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-light">
                  {(filteredData as Payment[]).map((p) => (
                    <tr key={p.id}>
                      <td className="px-6 py-4 text-slate-500 font-mono">{p.date}</td>
                      <td className="px-6 py-4 font-bold text-slate-850">{p.partyName}</td>
                      <td className="px-6 py-4 text-emerald-600 font-black">₹{p.amount}</td>
                      <td className="px-6 py-4 font-medium">{p.paymentMode}</td>
                      <td className="px-6 py-4 text-slate-400 font-mono">{p.reference}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {/* Type 4: Udhari report columns */}
            {reportType === 'udhari' && (
              <>
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-xs font-bold border-b border-slate-100 uppercase tracking-wider">
                    <th className="px-6 py-4">Party Name</th>
                    <th className="px-6 py-4">Mobile</th>
                    <th className="px-6 py-4">Total Billed</th>
                    <th className="px-6 py-4">Total Paid</th>
                    <th className="px-6 py-4">Outstanding Dues</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-light">
                  {(filteredData as Party[]).map((p) => (
                    <tr key={p.id}>
                      <td className="px-6 py-4 font-bold text-slate-855">{p.name}</td>
                      <td className="px-6 py-4 font-mono text-slate-500">{p.mobile}</td>
                      <td className="px-6 py-4">₹{p.totalRent}</td>
                      <td className="px-6 py-4 text-emerald-600">₹{p.paid}</td>
                      <td className="px-6 py-4 text-rose-600 font-black">₹{p.pending}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

          </table>
          
          {filteredData.length === 0 && (
            <div className="p-12 text-center text-slate-400 italic">
              No matching logs found in select criteria.
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
