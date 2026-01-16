'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, X, Sun, Moon } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

export default function LandingHeader() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const router = useRouter();

    // Detect scroll position
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };

        window.addEventListener('scroll', handleScroll);
        handleScroll(); // Check initial position

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

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
                <nav className={`rounded-2xl px-4 md:px-6 py-3 md:py-4 flex items-center justify-between w-full transition-all duration-300 border border-transparent ${isScrolled
                    ? 'glass shadow-lg !border-[var(--glass-border)]'
                    : 'bg-transparent'
                    }`}>
                    {/* Logo - hidden initially, shown on scroll */}
                    <Link href="/" className={`flex items-center group flex-shrink-0 transition-opacity duration-300 ${isScrolled ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                        <Image
                            src="/wallet-ai-logo.png"
                            alt="WalletAI Logo"
                            width={36}
                            height={36}
                            className="logo group-hover:scale-105 transition-transform duration-300 relative -top-[2px]"
                        />
                        <span className="ml-1 text-2xl leading-none">
                            <span className="font-bold text-[var(--logo-wallet)]">Wallet</span>
                            <span className="font-bold text-[var(--logo-ai)]">AI</span>
                        </span>
                    </Link>

                    {/* Desktop Navigation - Centered */}
                    <div className="hidden md:flex items-center space-x-8 absolute left-1/2 transform -translate-x-1/2">
                        <a href="#demo" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-medium">
                            Demo
                        </a>
                        <a href="#features" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-medium">
                            Features
                        </a>
                        <a href="#tech" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-medium">
                            Tech Writeup
                        </a>
                    </div>

                    {/* Auth Buttons & Theme Toggle */}
                    <div className="hidden md:flex items-center space-x-4 flex-shrink-0">
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-2.5 rounded-xl hover:bg-[var(--card-hover)] hover:scale-110 transition-all duration-300"
                            aria-label="Toggle theme"
                        >
                            {theme === 'light' ? (
                                <Moon className="h-5 w-5 text-[var(--text-primary)]" />
                            ) : (
                                <Sun className="h-5 w-5 text-[var(--text-primary)]" />
                            )}
                        </button>

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
                            Sign Up
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
                    <div className="md:hidden mt-2 glass rounded-2xl p-6 animate-scale-in">
                        <div className="flex flex-col space-y-4">
                            <a
                                href="#demo"
                                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-medium py-2"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Demo
                            </a>
                            <a
                                href="#features"
                                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-medium py-2"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Features
                            </a>
                            <a
                                href="#tech"
                                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-medium py-2"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Tech Writeup
                            </a>
                            <hr className="border-[var(--glass-border)]" />

                            {/* Theme Toggle - Mobile */}
                            <button
                                onClick={toggleTheme}
                                className="flex items-center space-x-3 text-[var(--text-primary)] font-medium py-2"
                            >
                                {theme === 'light' ? (
                                    <>
                                        <Moon className="h-5 w-5" />
                                        <span>Dark Mode</span>
                                    </>
                                ) : (
                                    <>
                                        <Sun className="h-5 w-5" />
                                        <span>Light Mode</span>
                                    </>
                                )}
                            </button>

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
                                Sign Up
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}
