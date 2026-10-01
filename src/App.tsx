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

import { supabase } from './lib/supabase';

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  // Initialize and listen to Supabase Auth state safely
  useEffect(() => {
    let isCancelled = false;

    // 1. Subscribe to Auth state changes
    let authSubscription: { unsubscribe: () => void } | null = null;
    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (isCancelled) return;
        if (session) {
          setIsAdminAuthenticated(true);
        } else if (event === 'SIGNED_OUT') {
          setIsAdminAuthenticated(false);
        }
      });
      authSubscription = data.subscription;
    }

    // 2. Perform initial session check via getSession()
    async function checkInitialSession() {
      try {
        const localAuth = localStorage.getItem('anand_admin_authenticated');
        if (supabase) {
          const { data, error } = await supabase.auth.getSession();
          if (!isCancelled) {
            if (error) {
              console.warn('Error fetching Supabase session:', error.message);
              setIsAdminAuthenticated(localAuth === 'true');
            } else {
              setIsAdminAuthenticated(Boolean(data?.session) || localAuth === 'true');
            }
          }
        } else {
          // Fallback resilience mode if Supabase is not configured
          if (!isCancelled) {
            setIsAdminAuthenticated(localAuth === 'true');
          }
        }
      } catch (err) {
        console.error('Error verifying auth session:', err);
        const localAuth = localStorage.getItem('anand_admin_authenticated');
        if (!isCancelled) {
          setIsAdminAuthenticated(localAuth === 'true');
        }
      } finally {
        if (!isCancelled) {
          setIsAuthChecking(false);
        }
      }
    }

    checkInitialSession();

    return () => {
      isCancelled = true;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  // Handle URL change detection (Back/Forward navigation)
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState(null, '', path);
    setCurrentPath(path);
  };

  const handleLoginSuccess = () => {
    setIsAdminAuthenticated(true);
    localStorage.setItem('anand_admin_authenticated', 'true');
    navigateTo('/admin/dashboard');
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('anand_admin_authenticated');
      localStorage.removeItem('admin_session');
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
      setIsAdminAuthenticated(false);
      navigateTo('/admin/login');
    }
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

  const handleEnquire = () => {
    scrollToSection('contact');
  };

  // --- ROUTING DISPATCHER ---
  const isUrlAdmin = currentPath.startsWith('/admin');

  if (isUrlAdmin) {
    if (isAuthChecking) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium tracking-wide">Authenticating Admin Session...</p>
        </div>
      );
    }

    if (!isAdminAuthenticated) {
      // Force render Login if not authenticated
      if (currentPath !== '/admin/login') {
        window.history.replaceState(null, '', '/admin/login');
      }
      return <AdminLogin onLoginSuccess={handleLoginSuccess} />;
    } else {
      // Logged in. If path is login or bare /admin, route to dashboard
      if (currentPath === '/admin/login' || currentPath === '/admin' || currentPath === '/admin/') {
        window.history.replaceState(null, '', '/admin/dashboard');
      }
      return (
        <AdminLayout
          currentPath={currentPath}
          onNavigate={navigateTo}
          onLogout={handleLogout}
        />
      );
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

      {/* Contact info cards */}
      <ContactSection />

      {/* Professional Footer */}
      <Footer onNavigate={scrollToSection} />
    </div>
  );
}

export default App;
