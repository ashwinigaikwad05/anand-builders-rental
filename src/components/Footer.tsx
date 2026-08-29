import React from 'react';
import { Phone, MapPin, ArrowUp } from 'lucide-react';
import { CONTACT_INFO } from '../data/mockData';

interface FooterProps {
  onNavigate: (sectionId: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-charcoal-dark text-slate-400 border-t border-slate-800 pt-16 pb-8 relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 pb-12 border-b border-slate-800/80">
          
          {/* Logo & Bilingual Brand Info (5 Columns) */}
          <div className="lg:col-span-5 text-left space-y-5">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="ANAND Builders & Developers Logo"
                className="h-12 w-auto bg-slate-900/60 p-1.5 rounded-lg border border-slate-800"
              />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-white text-lg font-bold tracking-tight">ANAND BUILDERS & DEVELOPERS</h3>
              <p className="text-primary text-sm font-semibold tracking-wide">आनंद बिल्डिंग मटेरियल सप्लायर</p>
            </div>

            <p className="text-slate-500 text-xs sm:text-sm font-light leading-relaxed max-w-sm">
              Premium centering plates and shuttering material rental service. Dedicated to offering flat rates, quality stock, and transparent calculations across construction projects.
            </p>
          </div>

          {/* Quick Links (3 Columns) */}
          <div className="lg:col-span-3 text-left space-y-4">
            <h4 className="text-white text-sm font-bold uppercase tracking-wider">Quick Navigation</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  onClick={() => onNavigate('home')}
                  className="hover:text-primary transition-colors text-slate-400 font-light"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('plates')}
                  className="hover:text-primary transition-colors text-slate-400 font-light"
                >
                  Our Plates
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('how-it-works')}
                  className="hover:text-primary transition-colors text-slate-400 font-light"
                >
                  How It Works
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('why-us')}
                  className="hover:text-primary transition-colors text-slate-400 font-light"
                >
                  About Us
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('contact')}
                  className="hover:text-primary transition-colors text-slate-400 font-light"
                >
                  Contact
                </button>
              </li>
            </ul>
          </div>

          {/* Direct Support Info (4 Columns) */}
          <div className="lg:col-span-4 text-left space-y-4">
            <h4 className="text-white text-sm font-bold uppercase tracking-wider">Stockyard Hotline</h4>
            
            <div className="space-y-3 text-sm font-light">
              <div className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  {CONTACT_INFO.phones.map((phone) => (
                    <a
                      key={phone}
                      href={`tel:${phone}`}
                      className="block text-slate-300 hover:text-white font-bold transition-colors font-sans"
                    >
                      +91 {phone}
                    </a>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-slate-300 italic">{CONTACT_INFO.address}</p>
                  <span className="text-[9px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded uppercase mt-1 inline-block">
                    TBC
                  </span>
                </div>
              </div>


            </div>
          </div>

        </div>

        {/* Footer Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-light text-slate-600">
          <p>© {new Date().getFullYear()} Anand Builders & Developers. All rights reserved.</p>
          
          <div className="flex items-center gap-6">
            <span>Bilingual Demo Site</span>
            <button
              onClick={handleScrollToTop}
              className="p-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-primary rounded-lg transition-all"
              aria-label="Scroll to top"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
};
