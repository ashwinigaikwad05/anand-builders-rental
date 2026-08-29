import React, { useState } from 'react';
import { Calculator, Info, Calendar, ClipboardList } from 'lucide-react';

export const PricingCalculator: React.FC = () => {
  const [quantity, setQuantity] = useState<number>(100);
  const [days, setDays] = useState<number>(15);
  const baseRate = 1.50; // ₹1.50 per plate per day

  const totalCost = quantity * baseRate * days;

  return (
    <section id="pricing" className="py-20 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-primary font-bold text-xs uppercase tracking-wider bg-orange-100/60 px-3 py-1 rounded-full border border-orange-200/50">
            Transparent Billing
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-charcoal mt-3 tracking-tight">
            Rental Pricing Explanation
          </h2>
          <p className="text-slate-600 mt-4 text-base sm:text-lg font-light leading-relaxed">
            Our pricing is transparent and direct: **₹1.50 per plate per day**. You pay only for the exact duration your project needs.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Column: Pricing Formula Explanation */}
          <div className="text-left space-y-6">
            <h3 className="text-2xl font-extrabold text-charcoal tracking-tight">
              How Rental Amount is Calculated
            </h3>
            
            <p className="text-slate-600 text-sm sm:text-base font-light leading-relaxed">
              Rental charges are calculated strictly based on the quantity of shuttering plates and the rental duration. We do not charge hidden security deposits or additional overhead rates.
            </p>

            {/* Formula Block */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
              <p className="text-xs uppercase font-bold tracking-wider text-slate-400">Core Calculation Formula</p>
              
              <div className="flex flex-wrap items-center gap-2 text-charcoal font-black text-lg sm:text-xl py-2">
                <span className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">Quantity</span>
                <span className="text-primary">×</span>
                <span className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">₹1.50 Rate</span>
                <span className="text-primary">×</span>
                <span className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">Rental Days</span>
                <span className="text-primary">=</span>
                <span className="bg-orange-50 text-primary border border-primary/20 px-4 py-1.5 rounded-lg">Rental Amount</span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/40 text-xs sm:text-sm">
                <span className="font-bold text-slate-700 block mb-1">Standard Example:</span>
                <div className="text-slate-500 font-mono">
                  100 plates × ₹1.50 × 10 days = <span className="font-bold text-primary">₹1,500</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 text-left bg-orange-50/40 p-4 rounded-xl border border-orange-100/50">
              <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-500 leading-relaxed font-light">
                Minimum rental quantities or duration thresholds may apply for logistics. Deliveries and pickups can be managed directly by us (logistics charges confirmed during formal quote).
              </p>
            </div>
          </div>

          {/* Right Column: Interactive Cost Simulator */}
          <div className="bg-white rounded-3xl border border-slate-200/70 shadow-xl p-8 relative overflow-hidden">
            {/* Orange Corner Ribbon */}
            <div className="absolute top-0 right-0 bg-primary text-white text-[10px] uppercase font-bold px-3 py-1 rounded-bl-xl tracking-wider">
              Demo Calculator
            </div>

            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Calculator className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-charcoal tracking-tight">Interactive Cost Estimator</h4>
            </div>

            <div className="space-y-6">
              {/* Slider 1: Plate Quantity */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <ClipboardList className="w-4 h-4 text-slate-400" />
                    Plate Quantity
                  </span>
                  <span className="font-bold text-charcoal">{quantity} Plates</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="1000"
                  step="50"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>50</span>
                  <span>500</span>
                  <span>1000+</span>
                </div>
              </div>

              {/* Slider 2: Rental Days */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    Rental Duration
                  </span>
                  <span className="font-bold text-charcoal">{days} Days</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="90"
                  step="5"
                  value={days}
                  onChange={(e) => setDays(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>5 Days</span>
                  <span>45 Days</span>
                  <span>90 Days</span>
                </div>
              </div>

              {/* Rate Box */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">Standard Daily Rate</span>
                <span className="font-extrabold text-charcoal">₹{baseRate.toFixed(2)} / plate / day</span>
              </div>

              {/* Result Cost Box */}
              <div className="border-t border-slate-100 pt-6 mt-6 flex flex-col items-center">
                <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Estimated Rental Amount</p>
                <p className="text-4xl font-black text-charcoal mt-2 tracking-tight">
                  ₹{totalCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-slate-400 font-light mt-1 text-center">
                  *Excluding transport taxes. Final rates depend on actual quantity and lease contracts.
                </p>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
