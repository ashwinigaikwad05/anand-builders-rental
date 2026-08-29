import React from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';

interface HeroProps {
  onExploreClick: () => void;
  onQuoteClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onExploreClick, onQuoteClick }) => {
  return (
    <section id="home" className="relative bg-charcoal-dark min-h-[90vh] flex items-center pt-24 overflow-hidden">
      {/* Background Decorative Graphic */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary filter blur-[120px]"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-primary/40 filter blur-[120px]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-10"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Text Content */}
          <div className="text-left space-y-6 max-w-xl md:max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>Premium Shuttering Material</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight">
              Reliable Plate Rental for <br />
              <span className="text-primary">Every Project</span>
            </h1>
            
            <p className="text-slate-300 text-base sm:text-lg lg:text-xl font-light leading-relaxed">
              Quality shuttering plates, transparent daily rental pricing, easy returns and reliable service tailored for your structural construction requirements.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                onClick={onExploreClick}
                className="bg-primary hover:bg-primary-dark text-white font-bold px-8 py-4 rounded-xl shadow-lg hover:shadow-orange-500/20 transform hover:-translate-y-0.5 transition-all duration-200 text-base flex items-center justify-center gap-2 group"
              >
                <span>Explore Our Plates</span>
                <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
              </button>
              
              <button
                onClick={onQuoteClick}
                className="bg-slate-800/80 hover:bg-slate-800 text-slate-100 font-semibold px-8 py-4 rounded-xl border border-slate-700/85 hover:border-slate-600/90 transition-all duration-200 text-base hover:shadow-md flex items-center justify-center"
              >
                Get a Quote
              </button>
            </div>

            {/* Quick trust bullet points */}
            <div className="grid grid-cols-3 gap-4 pt-8 border-t border-slate-800/80 text-xs sm:text-sm text-slate-400 font-medium">
              <div>
                <span className="text-primary font-bold text-lg block mb-0.5">7 Sizes</span>
                6" to 24" Width
              </div>
              <div className="border-x border-slate-800/80 px-4">
                <span className="text-primary font-bold text-lg block mb-0.5">₹1.50/Day</span>
                Demo Daily Rate
              </div>
              <div className="pl-4">
                <span className="text-primary font-bold text-lg block mb-0.5">Immediate</span>
                Site Delivery Support
              </div>
            </div>
          </div>

          {/* Right Column: Hero Visual Image */}
          <div className="relative w-full h-[350px] sm:h-[450px] lg:h-[500px] rounded-3xl overflow-hidden shadow-2xl shadow-black/40 border border-slate-800/80 group">
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-slate-900/20 to-transparent z-10"></div>
            
            {/* Orange corner accent */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/20 rounded-bl-[100px] z-20 pointer-events-none flex items-center justify-center pl-6 pb-6">
              <div className="w-3 h-3 rounded-full bg-primary animate-pulse"></div>
            </div>

            {/* High-quality construction shuttering / scaffolding steel plates image */}
            <img
              src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1200&q=80"
              alt="Steel scaffolding and concrete shuttering plates on a construction site"
              className="w-full h-full object-cover transform scale-100 group-hover:scale-105 transition-transform duration-700 ease-out"
            />
            
            {/* Floating Info card */}
            <div className="absolute bottom-6 left-6 right-6 glass-effect p-4 sm:p-5 rounded-2xl border border-slate-800/90 z-20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-primary font-bold uppercase tracking-wider">Premium Shuttering Plates</p>
                  <h4 className="text-white text-base sm:text-lg font-bold mt-0.5">High Tensile Cast Steel Plates</h4>
                </div>
                <div className="bg-primary/20 text-primary border border-primary/30 rounded-lg px-2.5 py-1 text-xs font-bold">
                  Demo ₹1.50/day
                </div>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm mt-2 font-light leading-relaxed">
                Coated to prevent rust, reinforced framing, and perfectly flat surfaces for immaculate concrete curing.
              </p>
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
};
