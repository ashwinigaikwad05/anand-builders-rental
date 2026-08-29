import React from 'react';
import { Phone, MapPin, Clock } from 'lucide-react';
import { CONTACT_INFO } from '../data/mockData';

export const ContactSection: React.FC = () => {
  return (
    <section id="contact" className="py-20 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-primary font-bold text-xs uppercase tracking-wider bg-orange-100/60 px-3 py-1 rounded-full border border-orange-200/50">
            Get In Touch
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-charcoal mt-3 tracking-tight">
            Contact Details
          </h2>
          <p className="text-slate-600 mt-4 text-base sm:text-lg font-light leading-relaxed">
            Get in touch with our team for deliveries, stock availability, or price quotes. You can reach us directly via phone or visit our yard.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <h3 className="text-2xl font-extrabold text-charcoal tracking-tight mb-8 text-center">
            Direct Contact Details
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Phone Contact Card */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-start gap-4 h-full text-left">
              <div className="p-3 bg-primary/10 rounded-xl text-primary flex-shrink-0">
                <Phone className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Call for Delivery & Enquiries</h4>
                <div className="space-y-1">
                  {CONTACT_INFO.phones.map((phone) => (
                    <a
                      key={phone}
                      href={`tel:${phone}`}
                      className="block text-lg font-bold text-charcoal hover:text-primary transition-colors font-sans"
                    >
                      +91 {phone}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Address Contact Card */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-start gap-4 h-full text-left">
              <div className="p-3 bg-primary/10 rounded-xl text-primary flex-shrink-0">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Office & Stockyard</h4>
                <p className="text-charcoal font-semibold mt-1 italic text-slate-600">
                  {CONTACT_INFO.address}
                </p>
                <span className="text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded uppercase mt-2 inline-block font-medium">
                  Address to be confirmed
                </span>
              </div>
            </div>

            {/* Hours Contact Card */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-start gap-4 h-full text-left">
              <div className="p-3 bg-primary/10 rounded-xl text-primary flex-shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Business Hours</h4>
                <p className="text-charcoal font-bold mt-1">
                  {CONTACT_INFO.hours}
                </p>
                <p className="text-xs text-slate-400 mt-1 font-light">Open all days for loading & returns.</p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
