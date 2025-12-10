'use client';

import Link from 'next/link';
import {
    CreditCard,
    Sparkles,
    Brain,
    MessageSquare,
    TrendingUp,
    PieChart,
    Wallet,
    Globe,
    BarChart3,
    LineChart,
    Shield,
    Zap,
    Target,
    ArrowRight,
    Play,
    CheckCircle2,
    Bot,
    Lightbulb,
    DollarSign
} from 'lucide-react';
import LandingHeader from '@/components/LandingHeader';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-[var(--background)] transition-colors duration-300">
            <LandingHeader />

            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24 pb-16 px-6">
                {/* Animated Background */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-[var(--accent-primary)]/30 to-[var(--accent-success)]/30 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute top-40 right-20 w-96 h-96 bg-gradient-to-tl from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                    <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
                </div>

                {/* Hero Content */}
                <div className="relative z-10 text-center max-w-5xl mx-auto">
                    {/* Badge */}
                    <div className="inline-flex items-center space-x-2 glass-card rounded-full px-5 py-2.5 mb-8 animate-slide-in-up">
                        <Sparkles className="h-4 w-4 text-[var(--accent-warning)]" />
                        <span className="text-sm font-medium text-[var(--text-primary)]">AI-Powered Personal Finance</span>
                    </div>

                    {/* Headline */}
                    <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-slide-in-up" style={{ animationDelay: '100ms' }}>
                        <span className="text-[var(--text-primary)]">Your Money, </span>
                        <span className="bg-gradient-to-r from-[var(--accent-primary)] via-purple-500 to-[var(--accent-success)] bg-clip-text text-transparent">
                            Smarter
                        </span>
                    </h1>

                    {/* Subheadline */}
                    <p className="text-xl md:text-2xl text-[var(--text-secondary)] mb-10 max-w-3xl mx-auto animate-slide-in-up" style={{ animationDelay: '200ms' }}>
                        Meet your AI financial advisor. Track expenses, manage investments, and get personalized insights—all in one beautiful dashboard.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-in-up" style={{ animationDelay: '300ms' }}>
                        <Link
                            href="/signup"
                            className="group px-8 py-4 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-semibold text-lg rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center space-x-2 liquid-button"
                        >
                            <span>Get Started Free</span>
                            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link
                            href="/login"
                            className="px-8 py-4 glass-card text-[var(--text-primary)] font-semibold text-lg rounded-2xl hover:bg-[var(--card-hover)] transition-all duration-300 flex items-center space-x-2"
                        >
                            <span>Login</span>
                        </Link>
                    </div>

                    {/* Stats */}
                    <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto animate-slide-in-up" style={{ animationDelay: '400ms' }}>
                        <div className="text-center">
                            <p className="text-3xl md:text-4xl font-bold text-[var(--text-primary)]">100%</p>
                            <p className="text-sm text-[var(--text-secondary)] mt-1">Free to Use</p>
                        </div>
                        <div className="text-center">
                            <p className="text-3xl md:text-4xl font-bold text-[var(--text-primary)]">AI</p>
                            <p className="text-sm text-[var(--text-secondary)] mt-1">Powered</p>
                        </div>
                        <div className="text-center">
                            <p className="text-3xl md:text-4xl font-bold text-[var(--text-primary)]">24/7</p>
                            <p className="text-sm text-[var(--text-secondary)] mt-1">Available</p>
                        </div>
                    </div>
                </div>

                {/* Scroll Indicator */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
                    <div className="w-6 h-10 rounded-full border-2 border-[var(--text-tertiary)] flex items-start justify-center p-2">
                        <div className="w-1 h-2 bg-[var(--text-tertiary)] rounded-full animate-pulse"></div>
                    </div>
                </div>
            </section>

            {/* AI Features Section - Primary Emphasis */}
            <section id="ai" className="py-24 px-6 relative">
                <div className="max-w-7xl mx-auto">
                    {/* Section Header */}
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center space-x-2 glass-card rounded-full px-5 py-2.5 mb-6 animate-slide-in-up">
                            <Brain className="h-4 w-4 text-[var(--accent-primary)]" />
                            <span className="text-sm font-medium text-[var(--text-primary)]">Artificial Intelligence</span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] mb-4">
                            Your Personal <span className="gradient-text">AI Financial Advisor</span>
                        </h2>
                        <p className="text-xl text-[var(--text-secondary)] max-w-2xl mx-auto">
                            Powered by advanced AI, get personalized financial insights, budget recommendations, and investment advice—all just a conversation away.
                        </p>
                    </div>

                    {/* AI Feature Cards */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                        {/* AI Chat */}
                        <div className="glass-card rounded-3xl p-8 group hover:scale-105 transition-all duration-500">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)] to-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                                <MessageSquare className="h-7 w-7 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">AI Chat Assistant</h3>
                            <p className="text-[var(--text-secondary)] leading-relaxed">
                                Have natural conversations about your finances. Ask questions, get explanations, and receive personalized advice in real-time.
                            </p>
                        </div>

                        {/* Smart Insights */}
                        <div className="glass-card rounded-3xl p-8 group hover:scale-105 transition-all duration-500">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--accent-success)] to-emerald-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                                <Lightbulb className="h-7 w-7 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">Smart Insights</h3>
                            <p className="text-[var(--text-secondary)] leading-relaxed">
                                AI analyzes your spending patterns and identifies trends, unusual expenses, and opportunities to save more money.
                            </p>
                        </div>

                        {/* Budget AI */}
                        <div className="glass-card rounded-3xl p-8 group hover:scale-105 transition-all duration-500">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                                <Target className="h-7 w-7 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">Budget Recommendations</h3>
                            <p className="text-[var(--text-secondary)] leading-relaxed">
                                Get intelligent budget suggestions based on your income, expenses, and financial goals. AI learns and adapts to your habits.
                            </p>
                        </div>

                        {/* Investment Ideas */}
                        <div className="glass-card rounded-3xl p-8 group hover:scale-105 transition-all duration-500">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--accent-warning)] to-orange-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                                <TrendingUp className="h-7 w-7 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">Investment Insights</h3>
                            <p className="text-[var(--text-secondary)] leading-relaxed">
                                Receive AI-powered analysis of your portfolio performance with actionable suggestions to optimize your investments.
                            </p>
                        </div>

                        {/* Automated Actions */}
                        <div className="glass-card rounded-3xl p-8 group hover:scale-105 transition-all duration-500">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                                <Zap className="h-7 w-7 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">Automated Actions</h3>
                            <p className="text-[var(--text-secondary)] leading-relaxed">
                                Let AI handle routine financial tasks—from categorizing expenses to adjusting budgets and tracking recurring payments.
                            </p>
                        </div>

                        {/* 24/7 Availability */}
                        <div className="glass-card rounded-3xl p-8 group hover:scale-105 transition-all duration-500">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                                <Bot className="h-7 w-7 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">Always Available</h3>
                            <p className="text-[var(--text-secondary)] leading-relaxed">
                                Your AI advisor is available 24/7 to answer questions, provide guidance, and help you make smarter financial decisions.
                            </p>
                        </div>
                    </div>

                    {/* AI Demo Preview */}
                    <div className="glass-card rounded-3xl p-8 md:p-12 bg-gradient-to-br from-[var(--accent-primary)]/10 to-[var(--accent-success)]/10">
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="flex-1">
                                <h3 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-4">
                                    &quot;How can I save more this month?&quot;
                                </h3>
                                <p className="text-[var(--text-secondary)] text-lg mb-6">
                                    Just ask your AI advisor. Get instant, personalized recommendations based on your actual spending data and financial goals.
                                </p>
                                <div className="space-y-3">
                                    <div className="flex items-center space-x-3">
                                        <CheckCircle2 className="h-5 w-5 text-[var(--accent-success)]" />
                                        <span className="text-[var(--text-primary)]">Analyzes your spending patterns</span>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <CheckCircle2 className="h-5 w-5 text-[var(--accent-success)]" />
                                        <span className="text-[var(--text-primary)]">Finds opportunities to reduce expenses</span>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <CheckCircle2 className="h-5 w-5 text-[var(--accent-success)]" />
                                        <span className="text-[var(--text-primary)]">Creates actionable saving strategies</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 flex justify-center">
                                <div className="glass-card rounded-2xl p-6 max-w-sm w-full">
                                    <div className="flex items-start space-x-3 mb-4">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-success)] flex items-center justify-center flex-shrink-0">
                                            <Sparkles className="h-5 w-5 text-white" />
                                        </div>
                                        <div className="glass-card rounded-2xl rounded-tl-none p-4">
                                            <p className="text-[var(--text-primary)] text-sm">
                                                Based on your spending, I found 3 ways to save $420 this month: Reduce dining out by 30%, switch to a cheaper streaming bundle, and...
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Other Features Section */}
            <section id="features" className="py-24 px-6 bg-gradient-to-b from-transparent to-[var(--background-elevated)]/30">
                <div className="max-w-7xl mx-auto">
                    {/* Section Header */}
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] mb-4">
                            Everything You Need to <span className="gradient-text">Master Your Finances</span>
                        </h2>
                        <p className="text-xl text-[var(--text-secondary)] max-w-2xl mx-auto">
                            Powerful features designed to give you complete control over your financial life.
                        </p>
                    </div>

                    {/* Feature Grid */}
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Multi-Currency */}
                        <div className="glass-card rounded-3xl p-8 flex items-start space-x-6 group hover:scale-[1.02] transition-all duration-500">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                                <Globe className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-3">Multi-Currency Support</h3>
                                <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
                                    Track your finances in any currency. Automatic conversion keeps everything in sync, perfect for travelers and international investors.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <span className="px-3 py-1 glass-card rounded-full text-sm text-[var(--text-primary)]">SGD</span>
                                    <span className="px-3 py-1 glass-card rounded-full text-sm text-[var(--text-primary)]">MYR</span>
                                    <span className="px-3 py-1 glass-card rounded-full text-sm text-[var(--text-primary)]">USD</span>
                                    <span className="px-3 py-1 glass-card rounded-full text-sm text-[var(--text-primary)]">EUR</span>
                                    <span className="px-3 py-1 glass-card rounded-full text-sm text-[var(--text-primary)]">GBP</span>
                                    <span className="px-3 py-1 glass-card rounded-full text-sm text-[var(--text-primary)]">JPY</span>
                                    <span className="px-3 py-1 glass-card rounded-full text-sm text-[var(--text-primary)]">CNY</span>
                                </div>
                            </div>
                        </div>

                        {/* Data Analysis */}
                        <div className="glass-card rounded-3xl p-8 flex items-start space-x-6 group hover:scale-[1.02] transition-all duration-500">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                                <BarChart3 className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-3">Beautiful Data Analysis</h3>
                                <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
                                    Stunning charts and visualizations bring your financial data to life. Understand spending patterns, income trends, and net worth at a glance.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <span className="px-3 py-1 glass-card rounded-full text-sm text-[var(--text-primary)]">Pie Charts</span>
                                    <span className="px-3 py-1 glass-card rounded-full text-sm text-[var(--text-primary)]">Line Graphs</span>
                                    <span className="px-3 py-1 glass-card rounded-full text-sm text-[var(--text-primary)]">Bar Charts</span>
                                </div>
                            </div>
                        </div>

                        {/* Portfolio Tracker */}
                        <div className="glass-card rounded-3xl p-8 flex items-start space-x-6 group hover:scale-[1.02] transition-all duration-500">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent-warning)] to-amber-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                                <LineChart className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-3">Real-Time Portfolio Tracker</h3>
                                <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
                                    Track your investments with live market data. Monitor stocks, ETFs, and crypto all in one place with real-time price updates.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <span className="px-3 py-1 glass-card rounded-full text-sm text-[var(--text-primary)]">Live Prices</span>
                                    <span className="px-3 py-1 glass-card rounded-full text-sm text-[var(--text-primary)]">P&L Tracking</span>
                                    <span className="px-3 py-1 glass-card rounded-full text-sm text-[var(--text-primary)]">Holdings View</span>
                                </div>
                            </div>
                        </div>

                        {/* Expense Tracking */}
                        <div className="glass-card rounded-3xl p-8 flex items-start space-x-6 group hover:scale-[1.02] transition-all duration-500">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-400 to-red-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                                <DollarSign className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-3">Smart Expense Tracking</h3>
                                <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
                                    Categorize and track every expense effortlessly. Set budgets, monitor spending limits, and get alerts before you overspend.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <span className="px-3 py-1 glass-card rounded-full text-sm text-[var(--text-primary)]">Categories</span>
                                    <span className="px-3 py-1 glass-card rounded-full text-sm text-[var(--text-primary)]">Budgets</span>
                                    <span className="px-3 py-1 glass-card rounded-full text-sm text-[var(--text-primary)]">Alerts</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Additional Features */}
                    <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="glass-card rounded-2xl p-6 text-center group hover:scale-105 transition-all duration-300">
                            <Shield className="h-8 w-8 text-[var(--accent-primary)] mx-auto mb-3 group-hover:scale-110 transition-transform" />
                            <p className="font-semibold text-[var(--text-primary)]">Bank-Level Security</p>
                        </div>
                        <div className="glass-card rounded-2xl p-6 text-center group hover:scale-105 transition-all duration-300">
                            <Target className="h-8 w-8 text-[var(--accent-success)] mx-auto mb-3 group-hover:scale-110 transition-transform" />
                            <p className="font-semibold text-[var(--text-primary)]">Goal Tracking</p>
                        </div>
                        <div className="glass-card rounded-2xl p-6 text-center group hover:scale-105 transition-all duration-300">
                            <Wallet className="h-8 w-8 text-purple-500 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                            <p className="font-semibold text-[var(--text-primary)]">Asset Management</p>
                        </div>
                        <div className="glass-card rounded-2xl p-6 text-center group hover:scale-105 transition-all duration-300">
                            <PieChart className="h-8 w-8 text-[var(--accent-warning)] mx-auto mb-3 group-hover:scale-110 transition-transform" />
                            <p className="font-semibold text-[var(--text-primary)]">Net Worth Tracking</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Product Video Section */}
            <section id="demo" className="py-24 px-6">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] mb-4">
                            See FinAI in Action
                        </h2>
                        <p className="text-xl text-[var(--text-secondary)]">
                            Watch how easy it is to take control of your finances
                        </p>
                    </div>

                    {/* Video Placeholder */}
                    <div className="relative group">
                        <div className="glass-card rounded-3xl overflow-hidden aspect-video flex items-center justify-center bg-gradient-to-br from-[var(--accent-primary)]/20 to-[var(--accent-success)]/20">
                            {/* Placeholder Content */}
                            <div className="text-center">
                                <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 cursor-pointer">
                                    <Play className="h-12 w-12 text-white ml-1" />
                                </div>
                                <p className="text-[var(--text-secondary)] text-lg">Product Demo Video</p>
                                <p className="text-[var(--text-tertiary)] text-sm mt-2">Coming Soon</p>
                            </div>

                            {/* Decorative Elements */}
                            <div className="absolute top-4 left-4 glass-card rounded-xl p-3 animate-slide-in-right" style={{ animationDelay: '200ms' }}>
                                <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 rounded-full bg-[var(--accent-success)]"></div>
                                    <span className="text-xs text-[var(--text-primary)] font-medium">Live Preview</span>
                                </div>
                            </div>
                            <div className="absolute bottom-4 right-4 glass-card rounded-xl p-3 animate-slide-in-right" style={{ animationDelay: '400ms' }}>
                                <div className="flex items-center space-x-2">
                                    <CreditCard className="w-4 h-4 text-[var(--accent-primary)]" />
                                    <span className="text-xs text-[var(--text-primary)] font-medium">FinAI Dashboard</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA Section */}
            <section className="py-24 px-6 relative overflow-hidden">
                {/* Background */}
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-success)] opacity-10"></div>
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--accent-primary)]/30 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[var(--accent-success)]/30 rounded-full blur-3xl"></div>

                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <h2 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] mb-6">
                        Ready to Transform Your <span className="gradient-text">Financial Life?</span>
                    </h2>
                    <p className="text-xl text-[var(--text-secondary)] mb-10 max-w-2xl mx-auto">
                        Join thousands of users who are already mastering their money with AI-powered insights.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            href="/signup"
                            className="group px-10 py-5 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-bold text-xl rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center space-x-3 liquid-button"
                        >
                            <span>Start for Free</span>
                            <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                    <p className="text-sm text-[var(--text-tertiary)] mt-6">
                        No credit card required • Free forever for personal use
                    </p>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-6 border-t border-[var(--glass-border)]">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        {/* Logo */}
                        <div className="flex items-center space-x-3">
                            <div className="bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-success)] p-2 rounded-xl">
                                <CreditCard className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-[var(--text-primary)]">FinAI</span>
                        </div>

                        {/* Links */}
                        <div className="flex items-center space-x-8">
                            <a href="#features" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm">
                                Features
                            </a>
                            <a href="#ai" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm">
                                AI Advisor
                            </a>
                            <a href="#demo" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm">
                                Demo
                            </a>
                        </div>

                        {/* Copyright */}
                        <p className="text-[var(--text-tertiary)] text-sm">
                            © {new Date().getFullYear()} FinAI. Made with ❤️
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
