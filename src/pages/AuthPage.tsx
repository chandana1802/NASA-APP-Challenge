import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, Lock, MailCheck, ShieldCheck, UserCheck } from 'lucide-react';
import { KARNATAKA_DISTRICTS } from '../data/karnatakaData';
import { SUPABASE_STAGE_STATUS } from '../lib/supabase';
import {
  resetPasswordInSupabase,
  signInWithSupabase,
  signUpWithSupabase,
} from '../services/supabaseData';
import type { LanguageCode, UserRole, UserSession } from '../types/fieldShift';
import type { PublicRoute } from './LandingPage';

interface AuthPageProps {
  mode: 'login' | 'register' | 'forgot-password';
  onNavigate: (route: PublicRoute) => void;
  onAuthenticated: (session: UserSession, schemaMissing?: boolean) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  mode,
  onNavigate,
  onAuthenticated,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [requestedRole, setRequestedRole] = useState<UserRole>('farmer');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState(KARNATAKA_DISTRICTS[0].name);
  const [stateName, setStateName] = useState('Karnataka');
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [error, setError] = useState<string | null>(null);
  const [confirmationMsg, setConfirmationMsg] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const supabaseReady = SUPABASE_STAGE_STATUS.configured;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setConfirmationMsg(null);

    if (!email.includes('@') || password.length < 6) {
      setError('Enter a valid email address and a password of at least 6 characters.');
      return;
    }

    if (supabaseReady) {
      setSubmitting(true);
      const res = await signInWithSupabase(email.trim(), password);
      setSubmitting(false);
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.session) {
        onAuthenticated(res.session, res.schemaMissing);
      }
      return;
    }

    const inferredRole: UserRole = email.toLowerCase().includes('research')
      ? 'researcher'
      : email.toLowerCase().includes('admin')
      ? 'admin'
      : 'farmer';

    onAuthenticated({
      id: 'demo-user-' + Date.now(),
      fullName:
        inferredRole === 'researcher'
          ? 'Dr. Kavitha Rao'
          : inferredRole === 'admin'
          ? 'System Administrator'
          : 'Basavaraj Gowda',
      email,
      role: inferredRole,
      district: 'Mandya',
      state: 'Karnataka',
      preferredLanguage: language,
      isDemoSession: true,
    });
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setConfirmationMsg(null);

    if (fullName.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (supabaseReady) {
      setSubmitting(true);
      const res = await signUpWithSupabase({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        requestedRole,
        phone: phone.trim() || undefined,
        district,
        state: stateName,
        preferredLanguage: language,
      });
      setSubmitting(false);

      if (res.error) {
        setError(res.error);
        return;
      }

      if (res.needsEmailConfirmation) {
        setConfirmationMsg(
          `Account created in Supabase Auth for ${email.trim()}. Please check your inbox and confirm your email address, then Sign In.`
        );
        return;
      }

      if (res.session) {
        onAuthenticated(res.session, res.schemaMissing);
      }
      return;
    }

    onAuthenticated({
      id: 'demo-reg-' + Date.now(),
      fullName: fullName.trim(),
      email: email.trim(),
      role: requestedRole,
      phone: phone.trim() || undefined,
      district,
      state: stateName,
      preferredLanguage: language,
      isDemoSession: true,
    });
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.includes('@')) {
      setError('Enter the email address associated with your Field Shift account.');
      return;
    }

    if (supabaseReady) {
      setSubmitting(true);
      const res = await resetPasswordInSupabase(email.trim());
      setSubmitting(false);
      if (res.error) {
        setError(res.error);
        return;
      }
    }
    setResetSent(true);
  };

  const handleQuickDemo = (role: UserRole) => {
    onAuthenticated({
      id: `demo-${role}`,
      fullName:
        role === 'farmer'
          ? 'Basavaraj Gowda (Demo Preview)'
          : role === 'researcher'
          ? 'Dr. Kavitha Rao (Demo Preview)'
          : 'KVK Admin Reviewer (Demo Preview)',
      email: `${role}.demo@fieldshift.org`,
      role,
      district: 'Mandya',
      state: 'Karnataka',
      preferredLanguage: language,
      isDemoSession: true,
    });
  };

  return (
    <div className="min-h-screen bg-[#F6F4EF] flex flex-col justify-between">
      <header className="bg-white border-b border-[#E2DDD3]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigate('landing')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#1B4332] hover:underline cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Field Shift</span>
          </button>
          <span className="text-xs font-mono text-[#1B4332]">
            {supabaseReady ? 'Supabase Connected (Live Auth & PostgreSQL)' : 'Stage 1 Demo Mode'}
          </span>
        </div>
      </header>

      <main className="max-w-xl w-full mx-auto px-6 py-10 space-y-6">
        <div
          className={`rounded-xl p-4 flex items-start gap-3 text-xs border ${
            supabaseReady
              ? 'bg-[#EDF5F0] border-[#C5DEC9] text-[#1B4332]'
              : 'bg-[#FAF6EE] border-[#DFD5C3] text-[#6B4F35]'
          }`}
        >
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold">
              {supabaseReady
                ? 'Live Supabase Backend Connected'
                : 'Stage 1 Frontend Demonstration Mode'}
            </div>
            <p>
              {supabaseReady
                ? 'Registrations, logins, farms, soil profiles, priorities, and rotation decisions save directly to your Supabase project under Row Level Security.'
                : 'Configure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env to enable live persistence.'}
            </p>
          </div>
        </div>

        <div className="bg-white border border-[#E2DDD3] rounded-xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-[#EFECE6] pb-4">
            <div>
              <h1 className="text-2xl font-display font-bold text-[#1B4332]">
                {mode === 'login'
                  ? 'Sign In to Field Shift'
                  : mode === 'register'
                  ? 'Create Field Shift Account'
                  : 'Reset Password'}
              </h1>
              <p className="text-xs text-[#526058] mt-1">
                {mode === 'login'
                  ? 'Access your saved farms, soil profiles, and rotation strategies.'
                  : mode === 'register'
                  ? 'Register to save your Karnataka farm & crop rotation data to Supabase.'
                  : 'Request a Supabase authentication recovery email.'}
              </p>
            </div>
            <Lock className="w-5 h-5 text-[#2D6A4F]" />
          </div>

          {error && (
            <div className="text-xs text-[#991B1B] bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-3.5 py-2.5">
              {error}
            </div>
          )}

          {confirmationMsg && (
            <div className="text-xs text-[#166534] bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg p-4 flex items-start gap-2.5">
              <MailCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p>{confirmationMsg}</p>
                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="font-semibold underline cursor-pointer"
                >
                  Go to Sign In →
                </button>
              </div>
            </div>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="farmer@example.org"
                  className="w-full px-3 py-2 text-sm border border-[#D4CEC3] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3 py-2 text-sm border border-[#D4CEC3] rounded-lg"
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => onNavigate('forgot-password')}
                  className="text-[#2D6A4F] hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('register')}
                  className="text-[#1B4332] font-semibold hover:underline cursor-pointer"
                >
                  Need an account? Register
                </button>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 text-sm font-semibold rounded-lg bg-[#1B4332] text-white hover:bg-[#143326] transition-colors cursor-pointer disabled:opacity-60"
              >
                {submitting ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#374151] mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g., Siddharth Patil"
                    className="w-full px-3 py-2 text-sm border border-[#D4CEC3] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#374151] mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@domain.org"
                    className="w-full px-3 py-2 text-sm border border-[#D4CEC3] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#374151] mb-1">Account Role *</label>
                  <select
                    value={requestedRole}
                    onChange={(e) => setRequestedRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-sm border border-[#D4CEC3] rounded-lg bg-white"
                  >
                    <option value="farmer">Farmer</option>
                    <option value="researcher">Agricultural Researcher</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#374151] mb-1">Phone (Optional)</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98XXXXXXXX"
                    className="w-full px-3 py-2 text-sm border border-[#D4CEC3] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#374151] mb-1">District *</label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#D4CEC3] rounded-lg bg-white"
                  >
                    {KARNATAKA_DISTRICTS.map((d) => (
                      <option key={d.name} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#374151] mb-1">State *</label>
                  <input
                    type="text"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#D4CEC3] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#374151] mb-1">Preferred Language *</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                    className="w-full px-3 py-2 text-sm border border-[#D4CEC3] rounded-lg bg-white"
                  >
                    <option value="en">English</option>
                    <option value="kn">ಕನ್ನಡ (Kannada)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#374151] mb-1">Password (min 8 chars) *</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#D4CEC3] rounded-lg"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#374151] mb-1">Confirm Password *</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#D4CEC3] rounded-lg"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 text-sm font-semibold rounded-lg bg-[#1B4332] text-white hover:bg-[#143326] transition-colors cursor-pointer disabled:opacity-60"
              >
                {submitting ? 'Creating Account in Supabase...' : 'Create Account'}
              </button>

              <div className="text-center text-xs">
                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="text-[#2D6A4F] font-semibold hover:underline cursor-pointer"
                >
                  Already registered? Sign In
                </button>
              </div>
            </form>
          )}

          {mode === 'forgot-password' && (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              {resetSent ? (
                <div className="text-xs text-[#166534] bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg p-4 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Password recovery email dispatched via Supabase Auth if an account exists for {email}.
                  </span>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-[#374151] mb-1">Registered Email *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@domain.org"
                      className="w-full px-3 py-2 text-sm border border-[#D4CEC3] rounded-lg"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 px-4 text-sm font-semibold rounded-lg bg-[#1B4332] text-white hover:bg-[#143326] cursor-pointer disabled:opacity-60"
                  >
                    {submitting ? 'Sending...' : 'Send Password Reset Link'}
                  </button>
                </>
              )}
              <div className="text-center text-xs">
                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="text-[#2D6A4F] font-semibold hover:underline cursor-pointer"
                >
                  Return to Sign In
                </button>
              </div>
            </form>
          )}

          <div className="pt-5 border-t border-[#EFECE6] space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#526058]">
              <UserCheck className="w-4 h-4" />
              <span>Local Preview Mode (Unsaved Demonstration Data)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => handleQuickDemo('farmer')}
                className="py-2 px-3 text-xs font-semibold rounded-lg border border-[#C5DEC9] bg-[#EDF5F0] text-[#1B4332] hover:bg-[#DCECE1] cursor-pointer"
              >
                Farmer Preview
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('researcher')}
                className="py-2 px-3 text-xs font-semibold rounded-lg border border-[#DFD5C3] bg-[#FAF6EE] text-[#6B4F35] hover:bg-[#F1E8D5] cursor-pointer"
              >
                Researcher Preview
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('admin')}
                className="py-2 px-3 text-xs font-semibold rounded-lg border border-[#D4CEC3] bg-[#FAF9F6] text-[#374151] hover:bg-[#EAE5DA] cursor-pointer"
              >
                Admin Preview
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
