'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Mail, Lock, Eye, EyeOff, User, Check, X, ArrowLeft } from 'lucide-react';
import Image from 'next/image';

export default function Signup() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const { signUp, signIn } = useAuth();
    const router = useRouter();

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

    // Password validation
    const hasMinLength = password.length >= 8;
    const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
    const isPasswordValid = hasMinLength && hasNumberOrSymbol;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validate password requirements
        if (!isPasswordValid) {
            setError('Password must be at least 8 characters with at least one number or symbol.');
            return;
        }

        // Validate password confirmation
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);

        try {
            await signUp(email, password, displayName);
            setSuccess(true);
        } catch (error: unknown) {
            let errorMessage = 'Failed to create account';
            const err = error as { message?: string };

            if (err.message?.includes('already registered')) {
                errorMessage = 'This email is already registered. Please login instead.';
            } else if (err.message?.includes('password')) {
                errorMessage = 'Password must be at least 8 characters with at least one number or symbol.';
            } else if (err.message) {
                errorMessage = err.message;
            }

            setError(errorMessage);
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-[var(--background)] transition-colors duration-300 flex items-center justify-center p-6">
                <div className="w-full max-w-md relative z-10 animate-scale-in">
                    <div className="rounded-2xl p-8 border border-[var(--card-border)] bg-[var(--background-elevated)] text-center">
                        <div className="w-16 h-16 rounded-full bg-[var(--accent-success)] flex items-center justify-center mx-auto mb-6">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-4">Check Your Email</h2>
                        <p className="text-[var(--text-secondary)] mb-6">
                            We&apos;ve sent a verification link to <strong>{email}</strong>. Please click the link to verify your account.
                        </p>
                        <Link
                            href="/login"
                            className="inline-block px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors duration-200"
                        >
                            Go to Login
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--background)] transition-colors duration-300 flex items-center justify-center p-4 md:p-6">
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
                    <p className="text-sm md:text-base text-[var(--text-secondary)] mt-2">Create your free account</p>
                </div>

                {/* Signup Form */}
                <div className="rounded-2xl p-6 md:p-8 border border-[var(--card-border)] bg-[var(--background-elevated)]">
                    <h2 className="text-xl md:text-2xl font-semibold text-[var(--text-primary)] mb-6">Get Started</h2>

                    {error && (
                        <div className="bg-[var(--accent-error)]/10 border border-[var(--accent-error)]/30 rounded-xl p-3 mb-4 md:mb-6 animate-slide-in-up">
                            <p className="text-[var(--accent-error)] text-xs md:text-sm">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
                        <div>
                            <label htmlFor="displayName" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                Display Name
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 h-5 w-5 text-[var(--text-secondary)]" />
                                <input
                                    id="displayName"
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    className="w-full border border-[var(--card-border)] bg-[var(--background)] rounded-xl pl-10 pr-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] transition-colors duration-200"
                                    placeholder="Your name"
                                    required
                                />
                            </div>
                        </div>

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
                                    className="w-full border border-[var(--card-border)] bg-[var(--background)] rounded-xl pl-10 pr-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] transition-colors duration-200"
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
                                    className="w-full border border-[var(--card-border)] bg-[var(--background)] rounded-xl pl-10 pr-12 py-3 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] transition-colors duration-200"
                                    placeholder="Create a password"
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
                            {/* Password Requirements */}
                            {password.length > 0 && (
                                <div className="mt-2 space-y-1">
                                    <div className={`flex items-center text-xs ${hasMinLength ? 'text-[var(--accent-success)]' : 'text-[var(--text-tertiary)]'}`}>
                                        {hasMinLength ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                                        At least 8 characters
                                    </div>
                                    <div className={`flex items-center text-xs ${hasNumberOrSymbol ? 'text-[var(--accent-success)]' : 'text-[var(--text-tertiary)]'}`}>
                                        {hasNumberOrSymbol ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                                        At least one number or symbol
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-5 w-5 text-[var(--text-secondary)]" />
                                <input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={`w-full border bg-[var(--background)] rounded-xl pl-10 pr-12 py-3 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] transition-colors duration-200 ${confirmPassword.length > 0
                                        ? passwordsMatch
                                            ? 'border-[var(--accent-success)]'
                                            : 'border-[var(--accent-error)]'
                                        : 'border-[var(--card-border)]'
                                        }`}
                                    placeholder="Confirm your password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                                >
                                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                            {confirmPassword.length > 0 && !passwordsMatch && (
                                <p className="text-xs text-[var(--accent-error)] mt-1 flex items-center">
                                    <X className="h-3 w-3 mr-1" />
                                    Passwords do not match
                                </p>
                            )}
                            {passwordsMatch && (
                                <p className="text-xs text-[var(--accent-success)] mt-1 flex items-center">
                                    <Check className="h-3 w-3 mr-1" />
                                    Passwords match
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !isPasswordValid || !passwordsMatch}
                            className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition-colors duration-200"
                        >
                            {loading ? 'Creating Account...' : 'Create Account'}
                        </button>
                    </form>

                    {/* Demo Account Section */}
                    <div className="mt-6 pt-6 border-t border-[var(--card-border)]">
                        <p className="text-center text-[var(--text-secondary)] text-sm mb-3">
                            Just want to try the app?
                        </p>
                        <button
                            type="button"
                            onClick={handleDemoLogin}
                            disabled={loading}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2"
                        >
                            {loading ? 'Signing In...' : 'Use Demo Account'}
                        </button>
                    </div>

                    <div className="mt-6 text-center">
                        <p className="text-[var(--text-secondary)] text-sm">
                            Already have an account?{' '}
                            <Link href="/login" className="text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] font-semibold transition-colors">
                                Sign in
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
