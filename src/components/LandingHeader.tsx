'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CreditCard, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function LandingHeader() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { user, logout } = useAuth();
    const router = useRouter();

    // Handle click on Login/Signup - logout first if user is already logged in
    const handleAuthClick = async (path: string) => {
        if (user) {
            await logout();
        }
        router.push(path);
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-50">
            <div className="mx-4 mt-4">
                <nav className="glass rounded-2xl px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
                    {/* Logo */}
                    <Link href="/" className="flex items-center space-x-3 group">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-success)] blur-lg opacity-50 rounded-xl group-hover:opacity-75 transition-opacity"></div>
                            <div className="relative bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-success)] p-2.5 rounded-xl shadow-lg">
                                <CreditCard className="h-6 w-6 text-white" />
                            </div>
                        </div>
                        <span className="text-2xl font-bold bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-success)] bg-clip-text text-transparent">
                            FinAI
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-8">
                        <a href="#features" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-medium">
                            Features
                        </a>
                        <a href="#ai" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-medium">
                            AI Advisor
                        </a>
                        <a href="#demo" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-medium">
                            Demo
                        </a>
                    </div>

                    {/* Auth Buttons */}
                    <div className="hidden md:flex items-center space-x-4">
                        <button
                            onClick={() => handleAuthClick('/login')}
                            className="px-5 py-2.5 text-[var(--text-primary)] font-medium hover:text-[var(--accent-primary)] transition-colors"
                        >
                            Login
                        </button>
                        <button
                            onClick={() => handleAuthClick('/signup')}
                            className="px-5 py-2.5 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 liquid-button"
                        >
                            Sign Up Free
                        </button>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden p-2 text-[var(--text-primary)]"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </nav>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden mt-2 glass rounded-2xl p-6 max-w-7xl mx-auto animate-scale-in">
                        <div className="flex flex-col space-y-4">
                            <a
                                href="#features"
                                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-medium py-2"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Features
                            </a>
                            <a
                                href="#ai"
                                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-medium py-2"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                AI Advisor
                            </a>
                            <a
                                href="#demo"
                                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-medium py-2"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Demo
                            </a>
                            <hr className="border-[var(--glass-border)]" />
                            <button
                                onClick={() => {
                                    setMobileMenuOpen(false);
                                    handleAuthClick('/login');
                                }}
                                className="text-[var(--text-primary)] font-medium py-2 text-left"
                            >
                                Login
                            </button>
                            <button
                                onClick={() => {
                                    setMobileMenuOpen(false);
                                    handleAuthClick('/signup');
                                }}
                                className="px-5 py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-semibold rounded-xl shadow-lg text-center"
                            >
                                Sign Up Free
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}
