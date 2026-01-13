'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { CreditCard, Lock, Eye, EyeOff, Check, X } from 'lucide-react';

export default function ResetPassword() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Password validation
    const hasMinLength = password.length >= 8;
    const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
    const isPasswordValid = hasMinLength && hasNumberOrSymbol;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!isPasswordValid) {
            setError('Password must be at least 8 characters with at least one number or symbol.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;

            // Sign out the user so they must login again with new password
            await supabase.auth.signOut();
            setSuccess(true);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to reset password';
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
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-4">Password Reset Complete</h2>
                        <p className="text-[var(--text-secondary)] mb-6">
                            Your password has been successfully reset. You can now login with your new password.
                        </p>
                        <Link
                            href="/login"
                            className="inline-block px-6 py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-semibold rounded-xl transition-all duration-300"
                        >
                            Go to Login
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
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-success)] bg-clip-text text-transparent">WalletAI</h1>
                    <p className="text-[var(--text-secondary)] mt-2">Create a new password</p>
                </div>

                {/* Reset Password Form */}
                <div className="glass-card rounded-2xl p-8 shadow-2xl">
                    <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">Reset Password</h2>
                    <p className="text-[var(--text-secondary)] text-sm mb-6">
                        Enter your new password below.
                    </p>

                    {error && (
                        <div className="bg-[var(--accent-error)]/10 border border-[var(--accent-error)]/30 rounded-xl p-3 mb-6 animate-slide-in-up">
                            <p className="text-[var(--accent-error)] text-sm">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                New Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-5 w-5 text-[var(--text-secondary)]" />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full glass-card border border-[var(--card-border)] rounded-xl pl-10 pr-12 py-3 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] transition-all duration-300"
                                    placeholder="Enter new password"
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
                                Confirm New Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-5 w-5 text-[var(--text-secondary)]" />
                                <input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={`w-full glass-card border rounded-xl pl-10 pr-12 py-3 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] transition-all duration-300 ${confirmPassword.length > 0
                                        ? passwordsMatch
                                            ? 'border-[var(--accent-success)]'
                                            : 'border-[var(--accent-error)]'
                                        : 'border-[var(--card-border)]'
                                        }`}
                                    placeholder="Confirm new password"
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
                            className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 shadow-lg liquid-button"
                        >
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
