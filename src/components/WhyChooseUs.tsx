import React from 'react';
import { FEATURES_DATA } from '../data/mockData';
import * as Icons from 'lucide-react';

export const WhyChooseUs: React.FC = () => {
  return (
    <section id="why-us" className="py-20 bg-charcoal text-white relative overflow-hidden">
      {/* Decorative design elements */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-primary filter blur-[100px]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-primary font-bold text-xs uppercase tracking-wider bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
            Why Partner With Us
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-3 tracking-tight">
            Why Choose ANAND Builders & Developers
          </h2>
          <p className="text-slate-300 mt-4 text-base sm:text-lg font-light leading-relaxed">
            With years of experience in structural materials, we understand the stakes of construction delays. We supply reliable shuttering plates with focus on quality and customer service.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {FEATURES_DATA.map((feat) => {
            // Dynamically resolve icon from name
            const IconComponent = (Icons as any)[feat.iconName] || Icons.HelpCircle;

            return (
              <div
                key={feat.id}
                className="bg-charcoal-light/50 border border-slate-800/80 hover:border-primary/45 p-8 rounded-2xl transition-all duration-300 hover:shadow-xl hover:shadow-black/20 flex flex-col items-start text-left group"
              >
                <div className="p-3.5 bg-slate-900 border border-slate-850 rounded-xl mb-6 text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                  <IconComponent className="w-6 h-6" />
                </div>
                
                <h3 className="text-lg font-bold text-white mb-3 tracking-tight group-hover:text-primary transition-colors">
                  {feat.title}
                </h3>
                
                <p className="text-slate-400 text-sm font-light leading-relaxed">
                  {feat.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
