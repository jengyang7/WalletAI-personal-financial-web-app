'use client';

import Link from 'next/link';
import {
    Sparkles,
    Brain,
    MessageSquare,
    TrendingUp,
    PieChart,
    Wallet,
    Globe,
    BarChart3,
    LineChart,
    Play,
    Github,
    ExternalLink,
    Zap,
    Database,
    Code2,
    Cpu,
    Search,
    Receipt,
    Image as ImageIcon
} from 'lucide-react';
import Image from 'next/image';
import LandingHeader from '@/components/LandingHeader';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-[var(--background)] transition-colors duration-300">
            <LandingHeader />

            {/* Hero Section - Compact with Demo Video Focus */}
            <section id="demo" className="relative pt-28 md:pt-32 pb-8 md:pb-12 px-4 md:px-6">
                {/* Subtle Background */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-[var(--accent-primary)]/20 to-[var(--accent-success)]/20 rounded-full blur-3xl"></div>
                    <div className="absolute top-40 right-20 w-96 h-96 bg-gradient-to-tl from-purple-500/10 to-pink-500/10 rounded-full blur-3xl"></div>
                </div>

                {/* Hero Content */}
                <div className="relative z-10 max-w-5xl mx-auto">
                    {/* Headline */}
                    <div className="text-center mb-6 md:mb-8">
                        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
                            <span className="text-[var(--logo-wallet)]">Wallet</span><span className="text-[var(--logo-ai)]">AI</span>
                        </h1>
                        <p className="text-lg sm:text-xl md:text-2xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-6">
                            AI-powered personal finance assistant with natural language insights
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
                            <Link
                                href="/login?demo=true"
                                className="group px-6 md:px-8 py-3 md:py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-base md:text-lg rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center gap-2"
                            >
                                <Play className="h-5 w-5" />
                                <span>Try Demo</span>
                            </Link>
                            <a
                                href="https://github.com/jengyang7/WalletAI-personal-financial-web-app"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-6 md:px-8 py-3 md:py-4 glass-card text-[var(--text-primary)] font-semibold text-base md:text-lg rounded-2xl hover:bg-[var(--card-hover)] transition-all duration-300 flex items-center gap-2"
                            >
                                <Github className="h-5 w-5" />
                                <span>GitHub</span>
                                <ExternalLink className="h-4 w-4 opacity-50" />
                            </a>
                        </div>
                    </div>

                    {/* Demo Video Placeholder */}
                    <div className="relative group mt-8">
                        <div className="glass-card rounded-3xl overflow-hidden aspect-video flex items-center justify-center bg-gradient-to-br from-[var(--accent-primary)]/10 to-[var(--accent-success)]/10 border border-[var(--glass-border)]">
                            <div className="text-center p-8">
                                <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 cursor-pointer border border-white/30">
                                    <Play className="h-10 w-10 text-[var(--text-primary)] ml-1" />
                                </div>
                                <p className="text-[var(--text-secondary)] text-lg font-medium">Demo Video</p>
                                <p className="text-[var(--text-tertiary)] text-sm mt-1">Video placeholder - Add your recording here</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features with Screenshots - Bento Grid */}
            <section id="features" className="py-12 md:py-20 px-4 md:px-6">
                <div className="max-w-6xl mx-auto">
                    {/* Section Header */}
                    <div className="text-center mb-10 md:mb-14">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-3">
                            Key Features
                        </h2>
                        <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
                            Explore the core capabilities of WalletAI
                        </p>
                    </div>

                    {/* Bento Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        {/* AI Chat Interface */}
                        <div className="glass-card rounded-3xl overflow-hidden group hover:scale-[1.02] transition-all duration-500">
                            {/* Screenshot Placeholder */}
                            <div className="aspect-[16/10] bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border-b border-[var(--glass-border)]">
                                <div className="text-center p-6">
                                    <MessageSquare className="h-12 w-12 text-[var(--accent-primary)] mx-auto mb-3 opacity-50" />
                                    <p className="text-[var(--text-tertiary)] text-sm">AI Chat Screenshot</p>
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-blue-600 flex items-center justify-center">
                                        <Brain className="h-5 w-5 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold text-[var(--text-primary)]">AI Agent</h3>
                                </div>
                                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                                    Autonomous AI that auto-creates expenses from natural language, generates charts on request, and answers financial questions instantly.
                                </p>
                            </div>
                        </div>

                        {/* Dashboard Overview */}
                        <div className="glass-card rounded-3xl overflow-hidden group hover:scale-[1.02] transition-all duration-500">
                            <div className="aspect-[16/10] bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center border-b border-[var(--glass-border)]">
                                <div className="text-center p-6">
                                    <PieChart className="h-12 w-12 text-[var(--accent-success)] mx-auto mb-3 opacity-50" />
                                    <p className="text-[var(--text-tertiary)] text-sm">Dashboard Screenshot</p>
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-success)] to-emerald-600 flex items-center justify-center">
                                        <BarChart3 className="h-5 w-5 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold text-[var(--text-primary)]">Dashboard & Analytics</h3>
                                </div>
                                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                                    Beautiful visualizations of your finances. Track net worth, spending trends, and budget progress at a glance.
                                </p>
                            </div>
                        </div>

                        {/* Smart Expense Input */}
                        <div className="glass-card rounded-3xl overflow-hidden group hover:scale-[1.02] transition-all duration-500">
                            <div className="aspect-[16/10] bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center border-b border-[var(--glass-border)]">
                                <div className="text-center p-6">
                                    <Zap className="h-12 w-12 text-[var(--accent-warning)] mx-auto mb-3 opacity-50" />
                                    <p className="text-[var(--text-tertiary)] text-sm">Expense Input Screenshot</p>
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-warning)] to-orange-600 flex items-center justify-center">
                                        <Sparkles className="h-5 w-5 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold text-[var(--text-primary)]">Smart Expense Entry</h3>
                                </div>
                                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                                    Type &quot;dinner $30 yesterday&quot; and AI auto-fills amount, date, currency, and category. 75% faster than manual entry.
                                </p>
                            </div>
                        </div>

                        {/* Investment Tracking */}
                        <div className="glass-card rounded-3xl overflow-hidden group hover:scale-[1.02] transition-all duration-500">
                            <div className="aspect-[16/10] bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center border-b border-[var(--glass-border)]">
                                <div className="text-center p-6">
                                    <LineChart className="h-12 w-12 text-purple-500 mx-auto mb-3 opacity-50" />
                                    <p className="text-[var(--text-tertiary)] text-sm">Portfolio Screenshot</p>
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                                        <TrendingUp className="h-5 w-5 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold text-[var(--text-primary)]">Portfolio Tracking</h3>
                                </div>
                                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                                    Track stocks, crypto, and other assets with real-time prices. Multi-currency support with automatic conversion.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Additional Features Row */}
                    <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                        <div className="glass-card rounded-2xl p-5 text-center group hover:scale-105 transition-all duration-300">
                            <Globe className="h-7 w-7 text-[var(--accent-primary)] mx-auto mb-2" />
                            <p className="font-semibold text-[var(--text-primary)] text-sm">Multi-Currency</p>
                            <p className="text-[var(--text-tertiary)] text-xs mt-1">7+ currencies</p>
                        </div>
                        <div className="glass-card rounded-2xl p-5 text-center group hover:scale-105 transition-all duration-300">
                            <Receipt className="h-7 w-7 text-[var(--accent-success)] mx-auto mb-2" />
                            <p className="font-semibold text-[var(--text-primary)] text-sm">Receipt OCR</p>
                            <p className="text-[var(--text-tertiary)] text-xs mt-1">Scan receipts</p>
                        </div>
                        <div className="glass-card rounded-2xl p-5 text-center group hover:scale-105 transition-all duration-300">
                            <Wallet className="h-7 w-7 text-purple-500 mx-auto mb-2" />
                            <p className="font-semibold text-[var(--text-primary)] text-sm">Budgets</p>
                            <p className="text-[var(--text-tertiary)] text-xs mt-1">Category limits</p>
                        </div>
                        <div className="glass-card rounded-2xl p-5 text-center group hover:scale-105 transition-all duration-300">
                            <Search className="h-7 w-7 text-[var(--accent-warning)] mx-auto mb-2" />
                            <p className="font-semibold text-[var(--text-primary)] text-sm">Semantic Search</p>
                            <p className="text-[var(--text-tertiary)] text-xs mt-1">RAG-powered</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Tech Stack Section */}
            <section id="tech" className="py-12 md:py-20 px-4 md:px-6 bg-gradient-to-b from-transparent to-[var(--background-elevated)]/30">
                <div className="max-w-5xl mx-auto">
                    {/* Section Header */}
                    <div className="text-center mb-10 md:mb-14">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-3">
                            Tech Stack
                        </h2>
                        <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
                            Built with modern technologies for performance and developer experience
                        </p>
                    </div>

                    {/* Tech Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Frontend */}
                        <div className="glass-card rounded-2xl p-5 text-center hover:scale-105 transition-all duration-300">
                            <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center mx-auto mb-3">
                                <span className="text-white font-bold text-lg">N</span>
                            </div>
                            <p className="font-bold text-[var(--text-primary)]">Next.js 15</p>
                            <p className="text-[var(--text-tertiary)] text-xs mt-1">App Router + Turbopack</p>
                        </div>

                        <div className="glass-card rounded-2xl p-5 text-center hover:scale-105 transition-all duration-300">
                            <div className="w-12 h-12 rounded-xl bg-[#61DAFB]/20 flex items-center justify-center mx-auto mb-3">
                                <span className="text-[#61DAFB] font-bold text-lg">⚛</span>
                            </div>
                            <p className="font-bold text-[var(--text-primary)]">React 19</p>
                            <p className="text-[var(--text-tertiary)] text-xs mt-1">Latest with RSC</p>
                        </div>

                        <div className="glass-card rounded-2xl p-5 text-center hover:scale-105 transition-all duration-300">
                            <div className="w-12 h-12 rounded-xl bg-[#3178C6]/20 flex items-center justify-center mx-auto mb-3">
                                <Code2 className="h-6 w-6 text-[#3178C6]" />
                            </div>
                            <p className="font-bold text-[var(--text-primary)]">TypeScript</p>
                            <p className="text-[var(--text-tertiary)] text-xs mt-1">End-to-end type safety</p>
                        </div>

                        <div className="glass-card rounded-2xl p-5 text-center hover:scale-105 transition-all duration-300">
                            <div className="w-12 h-12 rounded-xl bg-[#06B6D4]/20 flex items-center justify-center mx-auto mb-3">
                                <span className="text-[#06B6D4] font-bold text-lg">T</span>
                            </div>
                            <p className="font-bold text-[var(--text-primary)]">Tailwind CSS 4</p>
                            <p className="text-[var(--text-tertiary)] text-xs mt-1">Utility-first styling</p>
                        </div>

                        {/* Backend & AI */}
                        <div className="glass-card rounded-2xl p-5 text-center hover:scale-105 transition-all duration-300">
                            <div className="w-12 h-12 rounded-xl bg-[#3ECF8E]/20 flex items-center justify-center mx-auto mb-3">
                                <Database className="h-6 w-6 text-[#3ECF8E]" />
                            </div>
                            <p className="font-bold text-[var(--text-primary)]">Supabase</p>
                            <p className="text-[var(--text-tertiary)] text-xs mt-1">PostgreSQL + Auth</p>
                        </div>

                        <div className="glass-card rounded-2xl p-5 text-center hover:scale-105 transition-all duration-300">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-3">
                                <Cpu className="h-6 w-6 text-[var(--accent-primary)]" />
                            </div>
                            <p className="font-bold text-[var(--text-primary)]">Gemini 2.5 Flash</p>
                            <p className="text-[var(--text-tertiary)] text-xs mt-1">AI + Function Calling</p>
                        </div>

                        <div className="glass-card rounded-2xl p-5 text-center hover:scale-105 transition-all duration-300">
                            <div className="w-12 h-12 rounded-xl bg-[#FF6384]/20 flex items-center justify-center mx-auto mb-3">
                                <BarChart3 className="h-6 w-6 text-[#FF6384]" />
                            </div>
                            <p className="font-bold text-[var(--text-primary)]">Recharts</p>
                            <p className="text-[var(--text-tertiary)] text-xs mt-1">Data visualization</p>
                        </div>

                        <div className="glass-card rounded-2xl p-5 text-center hover:scale-105 transition-all duration-300">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mx-auto mb-3">
                                <ImageIcon className="h-6 w-6 text-purple-500" />
                            </div>
                            <p className="font-bold text-[var(--text-primary)]">Lucide Icons</p>
                            <p className="text-[var(--text-tertiary)] text-xs mt-1">Beautiful icons</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Technical Highlights Section */}
            <section id="highlights" className="py-12 md:py-20 px-4 md:px-6">
                <div className="max-w-5xl mx-auto">
                    {/* Section Header */}
                    <div className="text-center mb-10 md:mb-14">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-3">
                            Technical Highlights
                        </h2>
                        <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
                            Engineering achievements and implementation details
                        </p>
                    </div>

                    {/* Highlights Grid */}
                    <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                        <div className="glass-card rounded-2xl p-6">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/20 flex items-center justify-center flex-shrink-0">
                                    <Brain className="h-5 w-5 text-[var(--accent-primary)]" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-[var(--text-primary)] mb-1">AI Function Calling</h3>
                                    <p className="text-[var(--text-secondary)] text-sm">
                                        8 custom financial functions with Gemini AI. Natural language queries execute database operations and return formatted responses.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card rounded-2xl p-6">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-[var(--accent-success)]/20 flex items-center justify-center flex-shrink-0">
                                    <Search className="h-5 w-5 text-[var(--accent-success)]" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-[var(--text-primary)] mb-1">RAG Semantic Search</h3>
                                    <p className="text-[var(--text-secondary)] text-sm">
                                        Vector embeddings with pgvector for semantic transaction search. Search &quot;coffee&quot; finds Starbucks entries.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card rounded-2xl p-6">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                    <Zap className="h-5 w-5 text-purple-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-[var(--text-primary)] mb-1">Smart NLP Parser</h3>
                                    <p className="text-[var(--text-secondary)] text-sm">
                                        Hybrid keyword + AI parsing for expense input. &lt;2ms for simple inputs, AI fallback for complex natural language.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card rounded-2xl p-6">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-[var(--accent-warning)]/20 flex items-center justify-center flex-shrink-0">
                                    <Globe className="h-5 w-5 text-[var(--accent-warning)]" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-[var(--text-primary)] mb-1">Multi-Currency Engine</h3>
                                    <p className="text-[var(--text-secondary)] text-sm">
                                        7 currencies with automatic conversion. Symbol detection ($, RM, €, £) and unified reporting in preferred currency.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card rounded-2xl p-6">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center flex-shrink-0">
                                    <TrendingUp className="h-5 w-5 text-rose-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-[var(--text-primary)] mb-1">Real-time Portfolio</h3>
                                    <p className="text-[var(--text-secondary)] text-sm">
                                        Live stock/crypto prices via API. Historical price caching with smart staleness detection and auto-refresh.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card rounded-2xl p-6">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                                    <Database className="h-5 w-5 text-cyan-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-[var(--text-primary)] mb-1">PostgreSQL + RLS</h3>
                                    <p className="text-[var(--text-secondary)] text-sm">
                                        Row-level security policies for data isolation. Automated monthly stats recording via pg_cron.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Simple CTA Section */}
            <section className="py-12 md:py-20 px-4 md:px-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-primary)]/5 to-[var(--accent-success)]/5"></div>

                <div className="max-w-3xl mx-auto text-center relative z-10">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4">
                        See It In Action
                    </h2>
                    <p className="text-base sm:text-lg text-[var(--text-secondary)] mb-8 max-w-xl mx-auto">
                        Try the demo account to explore all features, or view the source code on GitHub.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-4">
                        <Link
                            href="/login?demo=true"
                            className="group px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center gap-2"
                        >
                            <Play className="h-5 w-5" />
                            <span>Try Demo</span>
                        </Link>
                        <a
                            href="https://github.com/jengyang7/WalletAI-personal-financial-web-app"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-8 py-4 glass-card text-[var(--text-primary)] font-bold text-lg rounded-2xl hover:bg-[var(--card-hover)] transition-all duration-300 flex items-center gap-2"
                        >
                            <Github className="h-5 w-5" />
                            <span>GitHub</span>
                            <ExternalLink className="h-4 w-4 opacity-50" />
                        </a>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 md:py-12 px-4 md:px-6 border-t border-[var(--glass-border)]">
                <div className="max-w-5xl mx-auto">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 md:gap-6">
                        {/* Logo */}
                        <div className="flex items-end">
                            <Image
                                src="/wallet-ai-logo.png"
                                alt="WalletAI Logo"
                                width={34}
                                height={34}
                                className="logo relative top-[4px]"
                            />
                            <span className="ml-1 text-xl font-bold leading-none"><span className="text-[var(--logo-wallet)]">Wallet</span><span className="text-[var(--logo-ai)]">AI</span></span>
                        </div>

                        {/* Links */}
                        <div className="flex items-center space-x-6">
                            <a href="#features" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm">
                                Features
                            </a>
                            <a href="#tech" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm">
                                Tech Stack
                            </a>
                            <a
                                href="https://github.com/jengyang7/WalletAI-personal-financial-web-app"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm flex items-center gap-1"
                            >
                                <Github className="h-4 w-4" />
                                GitHub
                            </a>
                        </div>

                        {/* Copyright */}
                        <p className="text-[var(--text-tertiary)] text-sm">
                            © {new Date().getFullYear()} WalletAI
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
