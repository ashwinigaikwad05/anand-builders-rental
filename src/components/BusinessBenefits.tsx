import React from 'react';
import { CheckCircle2, Award } from 'lucide-react';

export const BusinessBenefits: React.FC = () => {
  const benefits = [
    {
      title: 'Full Plate Availability',
      description: 'We maintain massive reserves so you never have to pause casting due to material shortages.',
    },
    {
      title: 'Digital Rental Tracking',
      description: 'We issue structured receipt sheets detailing size-wise plate counts to prevent disputes during return loads.',
    },
    {
      title: 'Simple Returns Process',
      description: 'Call us to coordinate pickup or return directly to our yard. The daily rental billing stops immediately upon arrival.',
    },
    {
      title: 'Transparent Payment Records',
      description: 'Receive detailed statements mapping total days, quantity, returned scrap, and current balances.',
    },
  ];

  return (
    <section className="py-20 bg-charcoal text-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Side: Summary Content */}
          <div className="text-left space-y-6 lg:col-span-5">
            <span className="text-primary font-bold text-xs uppercase tracking-wider bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
              Seamless Shuttering Management
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Streamlined Rental Operations
            </h2>
            <p className="text-slate-300 text-sm sm:text-base font-light leading-relaxed">
              We eliminate the common headaches of centering plate rentals. Our workflow ensures you receive accurate quantities in clean condition, with clear accountability.
            </p>

            <div className="space-y-4 pt-4 border-t border-slate-800/80">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-sm font-medium text-slate-200">Bilingual Support (English & Marathi)</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-sm font-medium text-slate-200">Strictly Clean & Straight Steel Plates</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-sm font-medium text-slate-200">Digital ledger ready for audit</span>
              </div>
            </div>
          </div>

          {/* Right Side: Visual representation of Rental Management */}
          <div className="lg:col-span-7 w-full">
            <div className="bg-charcoal-light/45 border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] pointer-events-none" />
              
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400">Inventory Status Monitor</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">ID: ABD-MOCK-LEGER</span>
              </div>

              {/* Grid of the 4 key benefits styled like progress states */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {benefits.map((benefit, idx) => (
                  <div key={idx} className="bg-slate-900/60 p-5 rounded-2xl border border-slate-850 hover:border-primary/20 transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 w-6 h-6 rounded-full flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <h4 className="text-sm font-extrabold text-white">{benefit.title}</h4>
                    </div>
                    <p className="text-slate-400 text-xs font-light leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                ))}
              </div>

              {/* Status Note */}
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5 font-light">
                  <Award className="w-3.5 h-3.5 text-primary" />
                  Quality Checked Centering Sheets
                </span>
                <span className="text-primary font-bold">ANAND Standard</span>
              </div>

            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
};
