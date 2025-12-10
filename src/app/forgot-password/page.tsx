'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { CreditCard, Mail, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) throw error;
            setSuccess(true);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to send reset email';
            setError(errorMessage);
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-[var(--background)] transition-colors duration-300 flex items-center justify-center p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-[var(--accent-primary)]/20 to-[var(--accent-success)]/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

                <div className="w-full max-w-md relative z-10 animate-scale-in">
                    <div className="glass-card rounded-2xl p-8 shadow-2xl text-center">
                        <div className="w-16 h-16 rounded-full bg-[var(--accent-success)] flex items-center justify-center mx-auto mb-6">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-4">Check Your Email</h2>
                        <p className="text-[var(--text-secondary)] mb-6">
                            We&apos;ve sent a password reset link to <strong>{email}</strong>. Please check your inbox and follow the instructions.
                        </p>
                        <Link
                            href="/login"
                            className="inline-block px-6 py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-semibold rounded-xl transition-all duration-300"
                        >
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--background)] transition-colors duration-300 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-[var(--accent-primary)]/20 to-[var(--accent-success)]/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

            <div className="w-full max-w-md relative z-10 animate-scale-in">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center mb-4">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-success)] blur-xl opacity-50 rounded-full"></div>
                            <div className="relative bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-success)] p-3 rounded-2xl shadow-2xl">
                                <CreditCard className="h-10 w-10 text-white" />
                            </div>
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-success)] bg-clip-text text-transparent">FinAI</h1>
                    <p className="text-[var(--text-secondary)] mt-2">Reset your password</p>
                </div>

                {/* Forgot Password Form */}
                <div className="glass-card rounded-2xl p-8 shadow-2xl">
                    <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">Forgot Password?</h2>
                    <p className="text-[var(--text-secondary)] text-sm mb-6">
                        Enter your email address and we&apos;ll send you a link to reset your password.
                    </p>

                    {error && (
                        <div className="bg-[var(--accent-error)]/10 border border-[var(--accent-error)]/30 rounded-xl p-3 mb-6 animate-slide-in-up">
                            <p className="text-[var(--accent-error)] text-sm">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
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

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 shadow-lg liquid-button"
                        >
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <Link
                            href="/login"
                            className="inline-flex items-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
