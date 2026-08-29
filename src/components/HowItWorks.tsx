import React from 'react';
import { HOW_IT_WORKS_DATA } from '../data/mockData';
import { ChevronRight } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  return (
    <section id="how-it-works" className="py-20 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-primary font-bold text-xs uppercase tracking-wider bg-orange-100/60 px-3 py-1 rounded-full border border-orange-200/50">
            Workflow Overview
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-charcoal mt-3 tracking-tight">
            How Shuttering Rental Works
          </h2>
          <p className="text-slate-600 mt-4 text-base sm:text-lg font-light leading-relaxed">
            We've simplified the plate rental cycle to keep your site running smoothly. From request to return, the process is structured and transparent.
          </p>
        </div>

        {/* Timeline Layout */}
        <div className="relative">
          {/* Desktop connecting horizontal line */}
          <div className="hidden lg:block absolute top-1/2 left-[12.5%] right-[12.5%] h-0.5 bg-slate-200 -translate-y-[80px]" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 relative z-10">
            {HOW_IT_WORKS_DATA.map((item, idx) => (
              <div key={item.step} className="flex flex-col items-center text-center group">
                
                {/* Step Circle */}
                <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 border border-slate-200 text-charcoal font-black text-xl mb-6 shadow-sm group-hover:border-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                  {item.step}
                  
                  {/* Arrow Indicator between steps (Desktop only) */}
                  {idx < 3 && (
                    <div className="hidden lg:flex absolute left-[120%] top-1/2 -translate-y-1/2 text-slate-300">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  )}
                </div>

                <h3 className="text-lg font-bold text-charcoal mb-2 tracking-tight group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                
                <p className="text-slate-500 text-sm font-light leading-relaxed max-w-[260px]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};
