import React, { useState } from 'react';
import { Edit2, Play, Square, Save, X, Info } from 'lucide-react';
import type { PlateStock } from '../../../data/adminMockData';

interface PlateTypesTabProps {
  plates: PlateStock[];
  onUpdateRate: (plateType: string, newRate: number) => void;
  onUpdateStatus: (plateType: string, newStatus: 'available' | 'low_stock' | 'out_of_stock') => void;
}

export const PlateTypesTab: React.FC<PlateTypesTabProps> = ({
  plates,
  onUpdateRate,
  onUpdateStatus,
}) => {
  const [editingType, setEditingType] = useState<string | null>(null);
  const [tempRate, setTempRate] = useState<string>('');

  const handleStartEdit = (plate: PlateStock) => {
    setEditingType(plate.plateType);
    setTempRate(plate.dailyRate.toString());
  };

  const handleSaveEdit = (plateType: string) => {
    const parsed = parseFloat(tempRate);
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdateRate(plateType, parsed);
    }
    setEditingType(null);
  };

  const handleCancelEdit = () => {
    setEditingType(null);
  };

  return (
    <div className="space-y-6 text-left">
      
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-extrabold text-charcoal tracking-tight">Plate Type Settings</h3>
          <p className="text-xs text-slate-500 font-light mt-0.5">Manage pricing indices and yard parameters</p>
        </div>
      </div>

      {/* Grid of Plate Type configuration blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {plates.map((plate) => (
          <div
            key={plate.plateType}
            className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-56 hover:border-primary/20 transition-all group"
          >
            <div>
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Width Variant</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                  plate.status === 'available'
                    ? 'bg-emerald-50 text-emerald-700'
                    : plate.status === 'low_stock'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-rose-50 text-rose-700'
                }`}>
                  {plate.status === 'available' ? 'Active' : plate.status === 'low_stock' ? 'Low Stock' : 'Deactivated'}
                </span>
              </div>
              
              <h4 className="text-2xl font-black text-charcoal mt-1">{plate.plateType} Size</h4>
              <p className="text-[10px] text-slate-400 font-light mt-0.5">Standard 3-inch outer flat angle</p>
            </div>

            {/* Rate Section */}
            <div className="border-y border-slate-100 py-3 my-3">
              {editingType === plate.plateType ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">₹</span>
                  <input
                    type="number"
                    step="0.05"
                    value={tempRate}
                    onChange={(e) => setTempRate(e.target.value)}
                    className="w-20 bg-slate-50 border border-slate-250 px-2 py-1 rounded text-sm text-slate-800 font-bold focus:outline-none focus:border-primary"
                  />
                  <span className="text-xs text-slate-400">/day</span>
                  
                  <button
                    onClick={() => handleSaveEdit(plate.plateType)}
                    className="p-1 hover:bg-emerald-50 text-emerald-600 rounded ml-auto"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="p-1 hover:bg-slate-100 text-slate-400 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Rental Rate</span>
                    <span className="text-lg font-extrabold text-charcoal">
                      ₹{plate.dailyRate.toFixed(2)}
                      <span className="text-xs text-slate-400 font-normal">/day</span>
                    </span>
                  </div>
                  <button
                    onClick={() => handleStartEdit(plate)}
                    className="p-2 hover:bg-slate-50 text-slate-500 hover:text-slate-850 rounded-xl transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Status change actions */}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() =>
                  onUpdateStatus(
                    plate.plateType,
                    plate.status === 'available' ? 'out_of_stock' : 'available'
                  )
                }
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1 ${
                  plate.status === 'available'
                    ? 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                    : 'bg-primary text-white border-primary hover:bg-primary-dark'
                }`}
              >
                {plate.status === 'available' ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" /> Deactivate
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" /> Activate
                  </>
                )}
              </button>
            </div>

          </div>
        ))}
      </div>

      <div className="p-4 bg-orange-50/50 border border-orange-100 text-xs sm:text-sm text-slate-600 rounded-2xl flex items-start gap-3 max-w-xl">
        <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed font-light">
          <strong>Frontend Settings:</strong> Changing pricing rates here will dynamically affect calculations in the **New Rental Form** and the **Dashboard Estimates**. When connected to Supabase in the next phase, these changes will persist securely in the database.
        </p>
      </div>

    </div>
  );
};
