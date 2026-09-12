import React, { useState } from 'react';
import { Eye, EyeOff, ShieldAlert, KeyRound, Mail } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Field Validation
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setIsLoading(true);

    try {
      if (supabase) {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (authError) {
          setIsLoading(false);
          setError(authError.message || 'Invalid Admin credentials.');
          return;
        }

        if (data?.session) {
          setIsLoading(false);
          onLoginSuccess();
          return;
        }
      } else {
        // Offline / local storage resilience mode
        if (email.trim() && password.trim()) {
          setIsLoading(false);
          onLoginSuccess();
          return;
        }
      }

      setIsLoading(false);
      setError('Invalid Admin credentials. Please check your email and password.');
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'Login failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Visual background accents */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary filter blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-primary/40 filter blur-[120px]" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center space-y-4">
        {/* Logo */}
        <div className="inline-block bg-slate-900 p-4 rounded-3xl border border-slate-800 shadow-2xl">
          <img
            src="/logo.png"
            alt="ANAND BUILDERS & DEVELOPERS Logo"
            className="h-16 w-auto object-contain"
            style={{ maxHeight: '80px' }}
          />
        </div>
        
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Admin Control Panel</h2>
          <p className="text-slate-400 text-xs sm:text-sm font-light mt-1">
            ANAND BUILDERS & DEVELOPERS • आनंद बिल्डिंग मटेरियल
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900 border border-slate-800/80 py-8 px-4 shadow-2xl rounded-3xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            
            {/* Error Announcement */}
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-xs sm:text-sm flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 flex-shrink-0 text-rose-500" />
                <span className="leading-relaxed font-medium">{error}</span>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5 text-left">
              <label htmlFor="email" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Admin Email ID
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@anandplates.com"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-primary focus:ring-primary focus:outline-none focus:ring-1 pl-11 pr-4 py-3 rounded-xl text-sm text-white font-medium"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5 text-left">
              <label htmlFor="password" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Password
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <KeyRound className="w-5 h-5" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-primary focus:ring-primary focus:outline-none focus:ring-1 pl-11 pr-11 py-3 rounded-xl text-sm text-white font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary-dark disabled:bg-slate-800 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-orange-500/20 transform hover:-translate-y-0.5 transition-all duration-200 text-base flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <span>Login to Admin Panel</span>
              )}
            </button>
          </form>

          {/* Secure Admin Portal Notice */}
          <div className="mt-6 pt-6 border-t border-slate-800/80 text-[11px] text-slate-500 leading-relaxed font-light text-center">
            <p>
              Authorized Personnel Only • Anand Builders & Developers Management
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
