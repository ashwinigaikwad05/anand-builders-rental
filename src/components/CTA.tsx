import React from 'react';
import { ArrowRight } from 'lucide-react';

interface CTAProps {
  onContactClick: () => void;
  onQuoteClick: () => void;
}

export const CTA: React.FC<CTAProps> = ({ onContactClick, onQuoteClick }) => {
  return (
    <section className="py-20 bg-white relative overflow-hidden">
      {/* Decorative orange circles */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute -bottom-24 right-10 w-80 h-80 rounded-full bg-primary filter blur-[80px]" />
        <div className="absolute -top-24 left-10 w-80 h-80 rounded-full bg-primary/40 filter blur-[80px]" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="bg-charcoal rounded-3xl border border-slate-800/80 p-8 sm:p-12 md:p-16 text-center space-y-6 shadow-2xl relative overflow-hidden group">
          {/* Subtle logo line design details in charcoal card */}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff03_1px,transparent_1px)] [background-size:20px_20px] opacity-20" />
          
          <span className="text-primary font-bold text-xs uppercase tracking-widest bg-primary/10 border border-primary/20 px-3 py-1 rounded-full relative z-10">
            Immediate Dispatch Support
          </span>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight relative z-10">
            Need Building Material Plates?
          </h2>

          <p className="text-slate-300 text-sm sm:text-base font-light leading-relaxed max-w-2xl mx-auto relative z-10">
            Tell us your shuttering plate requirements (sizes & quantity) and we will help you with stock availability, rates, delivery logistics, and returns.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4 relative z-10">
            <button
              onClick={onContactClick}
              className="bg-primary hover:bg-primary-dark text-white font-bold px-8 py-3.5 rounded-xl shadow-lg hover:shadow-orange-500/20 transform hover:-translate-y-0.5 transition-all duration-200 text-sm flex items-center justify-center gap-1.5 group"
            >
              <span>Contact Us</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>

            <button
              onClick={onQuoteClick}
              className="bg-slate-900 hover:bg-slate-850 text-slate-100 font-semibold px-8 py-3.5 rounded-xl border border-slate-800 hover:border-slate-750 transition-all duration-200 text-sm hover:shadow-md flex items-center justify-center"
            >
              Get a Quote
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
