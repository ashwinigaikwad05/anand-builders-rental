import React from 'react';
import { Layers, Ruler, DollarSign, Truck } from 'lucide-react';

export const Highlights: React.FC = () => {
  const highlights = [
    {
      id: 'high-1',
      icon: <Layers className="w-8 h-8 text-primary" />,
      value: '5000+ Plates',
      label: 'Inventory Capacity',
      description: 'Extensive inventory to support multiple concurrent concrete slabs.',
      isDemo: true
    },
    {
      id: 'high-2',
      icon: <Ruler className="w-8 h-8 text-primary" />,
      value: '7 Sizes Available',
      label: 'Width Variants',
      description: 'Custom dimensions ranging from 6" to 24" (all with standard 3" height).',
      isDemo: true
    },
    {
      id: 'high-3',
      icon: <DollarSign className="w-8 h-8 text-primary" />,
      value: '₹1.50 / Day',
      label: 'Flat Daily Rental Rate',
      description: 'Clean billing calculated strictly per plate per day. No hidden margins.',
      isDemo: true
    },
    {
      id: 'high-4',
      icon: <Truck className="w-8 h-8 text-primary" />,
      value: 'Site Delivery',
      label: 'Reliable Shuttering Delivery',
      description: 'On-time logistics support to dispatch and collect plates directly from sites.',
      isDemo: true
    }
  ];

  return (
    <section className="bg-white border-y border-slate-200 py-12 relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {highlights.map((item) => (
            <div
              key={item.id}
              className="flex flex-col items-center md:items-start text-center md:text-left p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all duration-300 relative group overflow-hidden"
            >
              {/* Demo Badge */}
              {item.isDemo && (
                <span className="absolute top-3 right-3 text-[9px] font-bold tracking-widest text-slate-400 bg-slate-200/60 rounded px-1.5 py-0.5 uppercase select-none">
                  Demo
                </span>
              )}
              
              <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 mb-4 group-hover:scale-105 transition-transform duration-300">
                {item.icon}
              </div>
              
              <h3 className="text-2xl font-extrabold text-charcoal tracking-tight">
                {item.value}
              </h3>
              
              <p className="text-sm font-semibold text-primary/95 mt-1">
                {item.label}
              </p>
              
              <p className="text-slate-500 text-xs mt-2 leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
