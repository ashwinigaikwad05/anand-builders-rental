import React, { useState } from 'react';
import { Save, Award, User, Settings } from 'lucide-react';

export const SettingsTab: React.FC = () => {
  const [businessName, setBusinessName] = useState('ANAND BUILDERS & DEVELOPERS');
  const [businessNameMr, setBusinessNameMr] = useState('आनंद बिल्डिंग मटेरियल सप्लायर');
  const [address, setAddress] = useState('[Business Address – To Be Confirmed]');
  const [phones, setPhones] = useState('7020914957, 9881985058, 9021519582');

  const [defaultRate, setDefaultRate] = useState<number>(1.50);
  const [rentalCycle, setRentalCycle] = useState<number>(40);

  const [account1Name, setAccount1Name] = useState('Account 1 (Bank Direct)');
  const [account2Name, setAccount2Name] = useState('Account 2 (UPI / Digital)');
  const [cashAccountName, setCashAccountName] = useState('Cash (Yard Drawer)');

  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
    }, 3000);
  };

  return (
    <div className="max-w-4xl mx-auto text-left space-y-6">
      
      <div>
        <h3 className="text-xl font-extrabold text-charcoal tracking-tight">System Settings</h3>
        <p className="text-xs text-slate-500 font-light mt-0.5">Configure default variables and parameters</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {isSaved && (
          <div className="bg-emerald-50 border border-emerald-250 text-emerald-800 p-4 rounded-xl text-sm font-semibold">
            System settings saved successfully! (Mock Action)
          </div>
        )}

        {/* Section 1: Business Information */}
        <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-charcoal border-b border-slate-100 pb-3 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-primary" />
            Business Branding & Info
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Business Name (English)</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:outline-none px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Business Name (Marathi)</label>
              <input
                type="text"
                value={businessNameMr}
                onChange={(e) => setBusinessNameMr(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:outline-none px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Business Address Placeholder</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:outline-none px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800 italic"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Contact Numbers (separated by commas)</label>
            <input
              type="text"
              value={phones}
              onChange={(e) => setPhones(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:outline-none px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800 font-mono"
            />
          </div>
        </div>

        {/* Section 2: Rental configurations */}
        <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-charcoal border-b border-slate-100 pb-3 flex items-center gap-1.5">
            <Settings className="w-4 h-4 text-primary" />
            Rental Parameters
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-slate-500 uppercase">Default Daily Rate (₹/plate/day)</label>
              <input
                type="number"
                step="0.05"
                value={defaultRate}
                onChange={(e) => setDefaultRate(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:outline-none px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800"
              />
            </div>
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-slate-500 uppercase">Normal Rental Cycle (Days)</label>
              <input
                type="number"
                value={rentalCycle}
                onChange={(e) => setRentalCycle(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:outline-none px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Ledger Payment accounts */}
        <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-charcoal border-b border-slate-100 pb-3 flex items-center gap-1.5">
            <User className="w-4 h-4 text-primary" />
            Payment Ledger Accounts
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Account 1 Name</label>
              <input
                type="text"
                value={account1Name}
                onChange={(e) => setAccount1Name(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:outline-none px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-800"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Account 2 Name</label>
              <input
                type="text"
                value={account2Name}
                onChange={(e) => setAccount2Name(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:outline-none px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-800"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Cash Ledger Name</label>
              <input
                type="text"
                value={cashAccountName}
                onChange={(e) => setCashAccountName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:outline-none px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-primary hover:bg-primary-dark text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-orange-500/10 transition-all flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings Changes</span>
          </button>
        </div>

      </form>
    </div>
  );
};
