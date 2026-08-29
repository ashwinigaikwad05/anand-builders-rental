import React from 'react';
import { PLATES_DATA } from '../data/mockData';
import type { PlateProduct } from '../data/mockData';
import { Info, HelpCircle } from 'lucide-react';

interface PlateCollectionProps {
  onEnquire: (plateSize: string) => void;
}

export const PlateCollection: React.FC<PlateCollectionProps> = ({ onEnquire }) => {
  return (
    <section id="plates" className="py-20 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-primary font-bold text-xs uppercase tracking-wider bg-orange-100/60 px-3 py-1 rounded-full border border-orange-200/50">
            Premium Steel Inventory
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-charcoal mt-3 tracking-tight">
            Our Plate Collection
          </h2>
          <p className="text-slate-600 mt-4 text-base sm:text-lg font-light leading-relaxed">
            We supply high-grade mild steel centering plates (shuttering plates) in standard sizes. All plates are manufactured with robust outer flat angles and internal stiffeners to withstand heavy concrete loads.
          </p>
        </div>

        {/* Plate Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {PLATES_DATA.map((plate: PlateProduct) => (
            <div
              key={plate.id}
              className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden plate-card-shadow transition-all duration-300 flex flex-col h-full group"
            >
              {/* Product Image */}
              <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                <img
                  src={plate.image}
                  alt={`ANAND Shuttering Plate Size ${plate.plateType}`}
                  className="w-full h-full object-cover transform scale-100 group-hover:scale-105 transition-transform duration-500 ease-out"
                />
                
                {/* Status Badge */}
                <div className="absolute top-3 left-3 z-10">
                  <span className={`text-[10px] font-bold tracking-wider px-2 py-1 rounded-md border shadow-sm ${
                    plate.status === 'available'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                      : plate.status === 'low_stock'
                      ? 'bg-amber-50 text-amber-700 border-amber-200/60'
                      : 'bg-rose-50 text-rose-700 border-rose-200/60'
                  }`}>
                    {plate.status === 'available' ? 'In Stock' : plate.status === 'low_stock' ? 'Low Stock' : 'Out of Stock'}
                  </span>
                </div>

                {/* Dimension Overlay Badge */}
                <div className="absolute bottom-3 right-3 bg-charcoal/90 text-white border border-slate-700/60 px-3 py-1 rounded-lg text-xs font-bold shadow-md">
                  Size: {plate.plateType}
                </div>
              </div>

              {/* Card Content */}
              <div className="p-6 flex-grow flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-charcoal group-hover:text-primary transition-colors duration-200">
                    Steel Centering Plate ({plate.plateType})
                  </h3>
                  
                  <p className="text-slate-500 text-xs sm:text-sm font-light mt-2 leading-relaxed h-16 overflow-hidden">
                    {plate.description}
                  </p>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="text-slate-400 text-xs flex items-center gap-1 font-medium">
                      Daily Rental Rate
                      <span className="relative group/tooltip cursor-help">
                        <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-slate-500" />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-900 text-white text-[10px] p-2 rounded-lg opacity-0 pointer-events-none group-hover/tooltip:opacity-100 transition-opacity duration-200 shadow-xl leading-normal text-center z-30">
                          This is a demo pricing reference. Final commercial quote depends on duration and volume.
                        </span>
                      </span>
                    </span>
                    <span className="text-slate-900 font-extrabold text-lg">
                      ₹{plate.dailyRate.toFixed(2)}
                      <span className="text-xs text-slate-500 font-normal"> / day</span>
                    </span>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    onClick={() => onEnquire(plate.plateType)}
                    disabled={plate.status === 'out_of_stock'}
                    className={`w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200 border flex items-center justify-center gap-1.5 ${
                      plate.status === 'out_of_stock'
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-primary hover:bg-orange-50/30'
                    }`}
                  >
                    <span>Enquire Now</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Dynamic Database Notice */}
        <div className="mt-12 p-4 rounded-xl bg-orange-50/50 border border-orange-100 text-center max-w-2xl mx-auto flex items-start gap-3 text-left">
          <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-600 leading-relaxed font-light">
            <strong>Future Integration Note:</strong> Shuttering plate rates, inventory availability, and stock statuses are currently loaded from mock data models and can be dynamically connected to a Supabase database in the next phase without changing the UI layout.
          </p>
        </div>
      </div>
    </section>
  );
};
