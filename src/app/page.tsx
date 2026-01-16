'use client';

import Link from 'next/link';
import {
    Brain,
    Play,
    Github,
    Zap,
    Database,
    Code2,
    Cpu
} from 'lucide-react';
import Image from 'next/image';
import LandingHeader from '@/components/LandingHeader';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-[var(--background)] transition-colors duration-300">
            <LandingHeader />

            {/* Hero Section - Asymmetric Layout */}
            <section id="demo" className="relative pt-28 md:pt-36 pb-12 md:pb-20 px-4 md:px-6">
                <div className="relative z-10 max-w-6xl mx-auto">
                    {/* Desktop: Asymmetric two-column, Mobile: Stacked */}
                    <div className="grid md:grid-cols-5 gap-8 md:gap-12 items-center">
                        {/* Left Column - Text Content */}
                        <div className="md:col-span-2 text-center md:text-left">
                            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 leading-tight">
                                <span className="text-[var(--logo-wallet)]">Wallet</span><span className="text-[var(--logo-ai)]">AI</span>
                            </h1>
                            <p className="text-base sm:text-lg text-[var(--text-secondary)] mb-3">
                                A personal finance app you can talk to.
                            </p>
                            <p className="text-sm text-[var(--text-tertiary)] mb-6">
                                Track your money using natural language and get instant financial insights — no spreadsheets required.
                            </p>

                            {/* CTA Buttons */}
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                                <Link
                                    href="/login?demo=true"
                                    className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl shadow-md transition-colors duration-200 flex items-center gap-2"
                                >
                                    <Play className="h-4 w-4" />
                                    <span>Try Demo</span>
                                </Link>
                                <a
                                    href="https://github.com/jengyang7/WalletAI-personal-financial-web-app"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-6 py-3 border border-[var(--card-border)] text-[var(--text-primary)] font-medium rounded-xl hover:bg-[var(--card-hover)] transition-colors duration-200 flex items-center gap-2"
                                >
                                    <Github className="h-4 w-4" />
                                    <span>Source</span>
                                </a>
                            </div>
                        </div>

                        {/* Right Column - Demo Video */}
                        <div className="md:col-span-3">
                            <div className="rounded-2xl overflow-hidden aspect-video border border-[var(--card-border)] shadow-lg bg-[var(--background-elevated)]">
                                <iframe
                                    className="w-full h-full"
                                    src="https://www.youtube.com/embed/q61iecM_Gro?autoplay=1&mute=1&loop=1&playlist=q61iecM_Gro"
                                    title="WalletAI Demo Video"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section - Varied Layout */}
            <section id="features" className="py-16 md:py-24 px-4 md:px-6 border-t border-[var(--card-border)]">
                <div className="max-w-5xl mx-auto">
                    {/* Section Header */}
                    <div className="mb-12">
                        <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-2">
                            App features
                        </h2>
                        <p className="text-[var(--text-secondary)]">
                            Built with AI to help you track spending, uncover insights, and truly understand your money effortlessly.
                        </p>
                    </div>

                    {/* Featured: AI Chat - Full Width */}
                    <div className="mb-8 rounded-2xl overflow-hidden border border-[var(--card-border)] bg-[var(--background-elevated)]">
                        <div className="grid md:grid-cols-2">
                            <div className="aspect-[4/3] md:aspect-auto overflow-hidden">
                                <img
                                    src="/screenshots/ai-chat.png"
                                    alt="AI Chat Interface"
                                    className="w-full h-full object-cover object-top"
                                />
                            </div>
                            <div className="p-6 md:p-8 flex flex-col justify-center">
                                <div className="flex items-center gap-2 mb-3">
                                    <Brain className="h-5 w-5 text-[var(--accent-primary)]" />
                                    <span className="text-xs font-medium text-[var(--accent-primary)] uppercase tracking-wide">Core Feature</span>
                                </div>
                                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">AI Assistant</h3>
                                <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-4">
                                    Ask questions in human language. &quot;How much did I spend on coffee last month?&quot; or &quot;Compare my grocery and dining expenses for past 6 months.&quot; The AI queries your data and responds with insights within seconds.
                                </p>
                                <ul className="text-sm text-[var(--text-tertiary)] space-y-1">
                                    <li>• Discover your spending habits and gain actionable insights</li>
                                    <li>• Instantly generate charts from your text requirement</li>
                                    <li>• Supports multiple languages </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Two-column grid for remaining features */}
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Dashboard */}
                        <div className="rounded-2xl overflow-hidden border border-[var(--card-border)] bg-[var(--background-elevated)]">
                            <div className="aspect-[16/10] overflow-hidden">
                                <img
                                    src="/screenshots/dashboard.png"
                                    alt="Dashboard Overview"
                                    className="w-full h-full object-cover object-top"
                                />
                            </div>
                            <div className="p-5">
                                <h3 className="font-semibold text-[var(--text-primary)] mb-1">Dashboard</h3>
                                <p className="text-[var(--text-secondary)] text-sm">AI insights reveal abnormalities in your finances, with beautiful charts showing cash flow, net worth, and spending habits — all in one view.
                                </p>
                            </div>
                        </div>

                        {/* Smart Input */}
                        <div className="rounded-2xl overflow-hidden border border-[var(--card-border)] bg-[var(--background-elevated)]">
                            <div className="aspect-[16/10] overflow-hidden">
                                <img
                                    src="/screenshots/expense-input.png"
                                    alt="Smart Expense Input"
                                    className="w-full h-full object-cover object-top"
                                />
                            </div>
                            <div className="p-5">
                                <h3 className="font-semibold text-[var(--text-primary)] mb-1">Smart Input</h3>
                                <p className="text-[var(--text-secondary)] text-sm">
                                    Enter multiple expenses in natural language — like “coffee $5, lunch $12” — and AI will auto-categorize them. You can also scan receipts to add expenses instantly.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Additional capabilities - Simple list */}
                    <div className="mt-10 pt-8 border-t border-[var(--card-border)]">
                        <p className="text-sm font-medium text-[var(--text-primary)] mb-4">Also includes:</p>
                        <div className="flex flex-wrap gap-3">
                            <span className="px-3 py-1.5 text-sm text-[var(--text-secondary)] bg-[var(--background-elevated)] rounded-lg border border-[var(--card-border)]">Multi-currency (7+)</span>
                            <span className="px-3 py-1.5 text-sm text-[var(--text-secondary)] bg-[var(--background-elevated)] rounded-lg border border-[var(--card-border)]">Portfolio tracking</span>
                            <span className="px-3 py-1.5 text-sm text-[var(--text-secondary)] bg-[var(--background-elevated)] rounded-lg border border-[var(--card-border)]">Receipt OCR</span>
                            <span className="px-3 py-1.5 text-sm text-[var(--text-secondary)] bg-[var(--background-elevated)] rounded-lg border border-[var(--card-border)]">Budget tracking</span>
                            <span className="px-3 py-1.5 text-sm text-[var(--text-secondary)] bg-[var(--background-elevated)] rounded-lg border border-[var(--card-border)]">Semantic search</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Technical Writeup Section - Comprehensive for Recruiters */}
            <section id="tech" className="py-16 md:py-20 px-4 md:px-6 border-t border-[var(--card-border)]">
                <div className="max-w-5xl mx-auto">
                    {/* Section Header */}
                    <div className="mb-10">
                        <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-2">
                            Technical Writeup
                        </h2>
                        <p className="text-[var(--text-secondary)]">
                            A breakdown of the architecture, technologies, and engineering decisions behind WalletAI.
                        </p>
                    </div>

                    {/* Tech Stack Grid */}
                    <div className="mb-12">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                            <Code2 className="h-5 w-5 text-[var(--accent-primary)]" />
                            Tech Stack
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--background-elevated)]">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="w-6 h-6 rounded bg-black flex items-center justify-center text-white text-xs font-bold">N</span>
                                    <span className="font-medium text-[var(--text-primary)] text-sm">Next.js 15</span>
                                </div>
                                <p className="text-xs text-[var(--text-tertiary)]">App Router, Server Actions</p>
                            </div>
                            <div className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--background-elevated)]">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[#61DAFB] text-lg">⚛</span>
                                    <span className="font-medium text-[var(--text-primary)] text-sm">React 19</span>
                                </div>
                                <p className="text-xs text-[var(--text-tertiary)]">Hooks, Context API</p>
                            </div>
                            <div className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--background-elevated)]">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[#3178C6] font-bold text-sm">TS</span>
                                    <span className="font-medium text-[var(--text-primary)] text-sm">TypeScript</span>
                                </div>
                                <p className="text-xs text-[var(--text-tertiary)]">Strict type safety</p>
                            </div>
                            <div className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--background-elevated)]">
                                <div className="flex items-center gap-2 mb-1">
                                    <Database className="h-5 w-5 text-[#3ECF8E]" />
                                    <span className="font-medium text-[var(--text-primary)] text-sm">Supabase</span>
                                </div>
                                <p className="text-xs text-[var(--text-tertiary)]">PostgreSQL, Auth, RLS</p>
                            </div>
                            <div className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--background-elevated)]">
                                <div className="flex items-center gap-2 mb-1">
                                    <Cpu className="h-5 w-5 text-[#4285F4]" />
                                    <span className="font-medium text-[var(--text-primary)] text-sm">Gemini 2.5 Flash</span>
                                </div>
                                <p className="text-xs text-[var(--text-tertiary)]">Function calling, Vision</p>
                            </div>
                            <div className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--background-elevated)]">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[#38BDF8] font-bold text-sm">◆</span>
                                    <span className="font-medium text-[var(--text-primary)] text-sm">Tailwind CSS 4</span>
                                </div>
                                <p className="text-xs text-[var(--text-tertiary)]">CSS variables, Dark mode</p>
                            </div>
                            <div className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--background-elevated)]">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[#FF6384] font-bold text-sm">📊</span>
                                    <span className="font-medium text-[var(--text-primary)] text-sm">Recharts</span>
                                </div>
                                <p className="text-xs text-[var(--text-tertiary)]">Dynamic data viz</p>
                            </div>
                            <div className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--background-elevated)]">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-emerald-500">▲</span>
                                    <span className="font-medium text-[var(--text-primary)] text-sm">Vercel</span>
                                </div>
                                <p className="text-xs text-[var(--text-tertiary)]">Edge deployment</p>
                            </div>
                        </div>
                    </div>

                    {/* AI Function Calling */}
                    <div className="mb-12">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                            <Brain className="h-5 w-5 text-[var(--accent-primary)]" />
                            AI Function Calling (14 Functions)
                        </h3>
                        <p className="text-sm text-[var(--text-secondary)] mb-4">
                            The AI assistant uses Gemini&apos;s function calling to execute structured database queries from natural language. Each function has typed parameters and returns formatted data.
                        </p>
                        <div className="grid md:grid-cols-2 gap-3">
                            <div className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--background-elevated)]">
                                <p className="font-medium text-[var(--text-primary)] text-sm mb-2">Data Retrieval</p>
                                <div className="space-y-1 text-xs text-[var(--text-secondary)]">
                                    <p><code className="text-[var(--accent-primary)]">get_expenses</code> — Query with date/category filters</p>
                                    <p><code className="text-[var(--accent-primary)]">get_income</code> — Income by source and period</p>
                                    <p><code className="text-[var(--accent-primary)]">get_budget</code> — Budget status and limits</p>
                                    <p><code className="text-[var(--accent-primary)]">get_subscriptions</code> — Recurring payments</p>
                                    <p><code className="text-[var(--accent-primary)]">get_portfolio</code> — Investment summary</p>
                                    <p><code className="text-[var(--accent-primary)]">get_holdings</code> — Stock/crypto positions</p>
                                    <p><code className="text-[var(--accent-primary)]">get_assets</code> — Net worth calculation</p>
                                </div>
                            </div>
                            <div className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--background-elevated)]">
                                <p className="font-medium text-[var(--text-primary)] text-sm mb-2">Actions & Analysis</p>
                                <div className="space-y-1 text-xs text-[var(--text-secondary)]">
                                    <p><code className="text-[var(--accent-primary)]">create_expense</code> — Add from natural language</p>
                                    <p><code className="text-[var(--accent-primary)]">create_budget</code> — Set spending limits</p>
                                    <p><code className="text-[var(--accent-primary)]">delete_expenses</code> — Remove transactions</p>
                                    <p><code className="text-[var(--accent-primary)]">get_spending_summary</code> — Period analysis</p>
                                    <p><code className="text-[var(--accent-primary)]">search_transactions</code> — Full-text search</p>
                                    <p><code className="text-[var(--accent-primary)]">semantic_search</code> — AI-powered fuzzy search</p>
                                    <p><code className="text-[var(--accent-primary)]">generate_chart</code> — Dynamic visualizations</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* System Architecture */}
                    <div className="mb-12">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                            <Zap className="h-5 w-5 text-[var(--accent-warning)]" />
                            System Architecture
                        </h3>
                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--background-elevated)]">
                                <p className="font-medium text-[var(--text-primary)] text-sm mb-2">Security</p>
                                <ul className="text-xs text-[var(--text-secondary)] space-y-1">
                                    <li>• Row-Level Security (RLS) — Data isolation at DB level</li>
                                    <li>• JWT Auth — Supabase session management</li>
                                    <li>• Service role keys — Server-only operations</li>
                                </ul>
                            </div>
                            <div className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--background-elevated)]">
                                <p className="font-medium text-[var(--text-primary)] text-sm mb-2">Performance</p>
                                <ul className="text-xs text-[var(--text-secondary)] space-y-1">
                                    <li>• Edge caching — Stock prices cached 15min</li>
                                    <li>• Optimistic UI — Instant feedback</li>
                                    <li>• Lazy loading — Charts render on demand</li>
                                </ul>
                            </div>
                            <div className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--background-elevated)]">
                                <p className="font-medium text-[var(--text-primary)] text-sm mb-2">AI Features</p>
                                <ul className="text-xs text-[var(--text-secondary)] space-y-1">
                                    <li>• Chart generation — Retrieve and visualize data</li>
                                    <li>• Receipt OCR — Extracts data from receipt</li>
                                    <li>• Auto-categorization — Expenses type classification</li>

                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Database Schema */}
                    <div>
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                            <Database className="h-5 w-5 text-[var(--accent-success)]" />
                            Database Design
                        </h3>
                        <div className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--background-elevated)]">
                            <div className="flex flex-wrap gap-2 text-xs">
                                <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">users</span>
                                <span className="px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20">expenses</span>
                                <span className="px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20">income</span>
                                <span className="px-2 py-1 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">budgets</span>
                                <span className="px-2 py-1 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">subscriptions</span>
                                <span className="px-2 py-1 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">wallets</span>
                                <span className="px-2 py-1 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">assets</span>
                                <span className="px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20">holdings</span>
                                <span className="px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20">transactions</span>
                                <span className="px-2 py-1 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">goals</span>
                                <span className="px-2 py-1 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">monthly_stats</span>
                            </div>
                            <p className="text-xs text-[var(--text-tertiary)] mt-3">
                                All tables enforce RLS policies. Foreign keys link to user_id from Supabase Auth.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section - Clean */}
            <section className="py-16 md:py-20 px-4 md:px-6 border-t border-[var(--card-border)]">
                <div className="max-w-2xl mx-auto text-center">
                    <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mb-3">
                        Try it yourself
                    </h2>
                    <p className="text-[var(--text-secondary)] mb-6">
                        Demo account has sample data to explore. Or grab the source and run it locally.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        <Link
                            href="/login?demo=true"
                            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors duration-200 flex items-center gap-2"
                        >
                            <Play className="h-4 w-4" />
                            <span>Try Demo</span>
                        </Link>
                        <a
                            href="https://github.com/jengyang7/WalletAI-personal-financial-web-app"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-6 py-3 border border-[var(--card-border)] text-[var(--text-primary)] font-medium rounded-xl hover:bg-[var(--card-hover)] transition-colors duration-200 flex items-center gap-2"
                        >
                            <Github className="h-4 w-4" />
                            <span>View Source</span>
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
                                Tech Writeup
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
