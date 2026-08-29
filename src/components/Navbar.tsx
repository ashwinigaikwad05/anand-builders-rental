import React, { useState, useEffect } from 'react';
import { Menu, X, PhoneCall } from 'lucide-react';

interface NavbarProps {
  onQuoteClick: () => void;
  onNavigate: (sectionId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onQuoteClick, onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLinkClick = (sectionId: string) => {
    setIsOpen(false);
    onNavigate(sectionId);
  };

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-lg py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo Area */}
          <div className="flex-shrink-0 flex items-center cursor-pointer" onClick={() => handleLinkClick('home')}>
            <img
              src="/logo.png"
              alt="ANAND Builders & Developers Logo"
              className="h-12 w-auto sm:h-14 object-contain transition-all duration-300"
              style={{ maxHeight: '60px' }}
            />
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => handleLinkClick('home')}
              className="text-slate-300 hover:text-primary font-medium text-sm transition-colors duration-200"
            >
              Home
            </button>
            <button
              onClick={() => handleLinkClick('plates')}
              className="text-slate-300 hover:text-primary font-medium text-sm transition-colors duration-200"
            >
              Our Plates
            </button>
            <button
              onClick={() => handleLinkClick('how-it-works')}
              className="text-slate-300 hover:text-primary font-medium text-sm transition-colors duration-200"
            >
              How It Works
            </button>
            <button
              onClick={() => handleLinkClick('why-us')}
              className="text-slate-300 hover:text-primary font-medium text-sm transition-colors duration-200"
            >
              About Us
            </button>
            <button
              onClick={() => handleLinkClick('contact')}
              className="text-slate-300 hover:text-primary font-medium text-sm transition-colors duration-200"
            >
              Contact
            </button>
          </div>

          {/* Get a Quote Button */}
          <div className="hidden md:flex items-center">
            <button
              onClick={onQuoteClick}
              className="bg-primary hover:bg-primary-dark text-white font-semibold px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg hover:shadow-orange-500/20 transform hover:-translate-y-0.5 transition-all duration-200 text-sm"
            >
              Get a Quote
            </button>
          </div>

          {/* Mobile hamburger menu button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-500"
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden absolute top-full left-0 w-full bg-slate-900 border-b border-slate-800 transition-all duration-300 ease-in-out ${
          isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        <div className="px-4 pt-2 pb-6 space-y-3 sm:px-3 shadow-2xl">
          <button
            onClick={() => handleLinkClick('home')}
            className="block w-full text-left px-3 py-2.5 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
          >
            Home
          </button>
          <button
            onClick={() => handleLinkClick('plates')}
            className="block w-full text-left px-3 py-2.5 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
          >
            Our Plates
          </button>
          <button
            onClick={() => handleLinkClick('how-it-works')}
            className="block w-full text-left px-3 py-2.5 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
          >
            How It Works
          </button>
          <button
            onClick={() => handleLinkClick('why-us')}
            className="block w-full text-left px-3 py-2.5 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
          >
            About Us
          </button>
          <button
            onClick={() => handleLinkClick('contact')}
            className="block w-full text-left px-3 py-2.5 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
          >
            Contact
          </button>
          <div className="pt-4 border-t border-slate-800">
            <button
              onClick={() => {
                setIsOpen(false);
                onQuoteClick();
              }}
              className="w-full bg-primary hover:bg-primary-dark text-white font-semibold px-4 py-3 rounded-lg shadow-md flex items-center justify-center space-x-2 text-base transition-all"
            >
              <PhoneCall className="h-5 w-5" />
              <span>Get a Quote</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
