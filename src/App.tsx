import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Highlights } from './components/Highlights';
import { PlateCollection } from './components/PlateCollection';
import { WhyChooseUs } from './components/WhyChooseUs';
import { HowItWorks } from './components/HowItWorks';
import { PricingCalculator } from './components/PricingCalculator';
import { BusinessBenefits } from './components/BusinessBenefits';
import { CTA } from './components/CTA';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';

// Admin Components
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminLayout } from './components/admin/AdminLayout';

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(
    localStorage.getItem('admin_session') === 'authenticated_2026'
  );
  
  const [selectedPlateSize, setSelectedPlateSize] = useState<string>('');

  // Handle URL change detection (Back/Forward navigation)
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
      setIsAdminAuthenticated(localStorage.getItem('admin_session') === 'authenticated_2026');
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState(null, '', path);
    setCurrentPath(path);
    setIsAdminAuthenticated(localStorage.getItem('admin_session') === 'authenticated_2026');
  };

  const handleLoginSuccess = () => {
    setIsAdminAuthenticated(true);
    navigateTo('/admin/dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_session');
    setIsAdminAuthenticated(false);
    navigateTo('/admin/login');
  };

  // Public site scroll helper
  const scrollToSection = (sectionId: string) => {
    // If not on public site, navigate there first
    if (currentPath.startsWith('/admin')) {
      navigateTo('/');
      // Wait for rendering to complete, then scroll
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      return;
    }

    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleEnquire = (plateSize: string) => {
    setSelectedPlateSize(plateSize);
    scrollToSection('contact');
  };

  // --- ROUTING DISPATCHER ---
  const isUrlAdmin = currentPath.startsWith('/admin');

  if (isUrlAdmin) {
    if (!isAdminAuthenticated) {
      // Force render Login if not authenticated
      if (currentPath !== '/admin/login') {
        window.history.replaceState(null, '', '/admin/login');
        // Do not trigger state update directly during render, wait for useEffect or let it slide
      }
      return <AdminLogin onLoginSuccess={handleLoginSuccess} />;
    } else {
      // Logged in. If path is login, push to dashboard
      if (currentPath === '/admin/login') {
        window.history.replaceState(null, '', '/admin/dashboard');
      }
      return <AdminLayout onLogout={handleLogout} />;
    }
  }

  // Else: Render Public customer site (unchanged)
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col w-full text-slate-800 font-sans">
      {/* Sticky Navbar */}
      <Navbar
        onQuoteClick={() => scrollToSection('contact')}
        onNavigate={scrollToSection}
      />

      {/* Hero Section */}
      <Hero
        onExploreClick={() => scrollToSection('plates')}
        onQuoteClick={() => scrollToSection('contact')}
      />

      {/* Trust Stats / Highlights banner */}
      <Highlights />

      {/* Plate Collection (Product Cards Grid) */}
      <PlateCollection onEnquire={handleEnquire} />

      {/* Why Choose Us Features */}
      <WhyChooseUs />

      {/* How It Works Timeline */}
      <HowItWorks />

      {/* Pricing formula & cost simulation calculator */}
      <PricingCalculator />

      {/* Shuttering inventory & delivery benefits */}
      <BusinessBenefits />

      {/* Final Action CTA */}
      <CTA
        onContactClick={() => scrollToSection('contact')}
        onQuoteClick={() => scrollToSection('contact')}
      />

      {/* Contact info cards and enquiries form */}
      <ContactSection
        selectedPlateSize={selectedPlateSize}
        onClearSelectedSize={() => setSelectedPlateSize('')}
      />

      {/* Professional Footer */}
      <Footer onNavigate={scrollToSection} />
    </div>
  );
}

export default App;
