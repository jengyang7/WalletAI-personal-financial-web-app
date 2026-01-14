'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import Image from 'next/image';

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Demo account credentials (hidden from UI)
  const DEMO_EMAIL = 'walletai.demoacc@gmail.com';
  const DEMO_PASSWORD = 'Demo1234!';

  // Handle demo login
  const handleDemoLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signIn(DEMO_EMAIL, DEMO_PASSWORD);
      router.push('/dashboard');
    } catch (error: unknown) {
      const err = error as { message?: string };
      setError(err.message || 'Failed to sign in with demo account');
      setLoading(false);
    }
  };

  // Auto-login when ?demo=true is in the URL
  useEffect(() => {
    if (searchParams.get('demo') === 'true') {
      handleDemoLogin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signIn(email, password);
      router.push('/dashboard');
    } catch (error: unknown) {
      // Handle specific Supabase auth errors
      let errorMessage = 'Failed to sign in';
      const err = error as { message?: string };

      if (err.message?.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (err.message?.includes('Email not confirmed')) {
        errorMessage = 'Please check your email and click the verification link before signing in.';
      } else if (err.message?.includes('Too many requests')) {
        errorMessage = 'Too many login attempts. Please wait a moment before trying again.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setLoading(false); // Stop loading on error
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] transition-colors duration-300 flex items-center justify-center p-4 md:p-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-[var(--accent-primary)]/20 to-[var(--accent-success)]/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="w-full max-w-md relative z-10 animate-scale-in px-4 sm:px-0">
        {/* Logo */}
        <div className="text-center mb-6 md:mb-8">
          <div className="flex items-center justify-center mb-4">
            <Image
              src="/wallet-ai-logo.png"
              alt="WalletAI Logo"
              width={70}
              height={70}
              className="logo"
            />
          </div>
          <h1 className="text-3xl md:text-4xl">
            <span className="font-bold text-[var(--logo-wallet)]">Wallet</span>
            <span className="font-bold text-[var(--logo-ai)]">AI</span>
          </h1>
          <p className="text-sm md:text-base text-[var(--text-secondary)] mt-2">Your AI-powered financial assistant</p>
        </div>

        {/* Login Form */}
        <div className="glass-card rounded-2xl p-6 md:p-8 shadow-2xl">
          <h2 className="text-xl md:text-2xl font-semibold text-[var(--text-primary)] mb-6">Welcome Back</h2>

          {error && (
            <div className="bg-[var(--accent-error)]/10 border border-[var(--accent-error)]/30 rounded-xl p-3 mb-4 md:mb-6 animate-slide-in-up">
              <p className="text-[var(--accent-error)] text-xs md:text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-[var(--text-secondary)]" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full glass-card border border-[var(--card-border)] rounded-xl pl-10 pr-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] transition-all duration-300"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-[var(--text-secondary)]" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full glass-card border border-[var(--card-border)] rounded-xl pl-10 pr-12 py-3 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] transition-all duration-300"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <Link
                href="/forgot-password"
                className="text-sm text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] font-medium transition-colors"
              >
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 shadow-lg liquid-button"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          {/* Demo Account Section */}
          <div className="mt-6 pt-6 border-t border-[var(--card-border)]">
            <p className="text-center text-[var(--text-secondary)] text-sm mb-3">
              Try the app instantly!
            </p>
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? 'Signing In...' : 'Use Demo Account'}
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-[var(--text-secondary)] text-sm">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] font-semibold transition-colors">
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Back to Home Link */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Landing Page
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-primary)]"></div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

