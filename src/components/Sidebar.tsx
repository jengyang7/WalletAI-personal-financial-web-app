'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Receipt,
  PiggyBank,
  Target,
  TrendingUp,
  Settings,
  LogOut,
  CreditCard,
  Wallet,
  DollarSign,
  Sparkles,
  Menu,
  X,
  ChevronUp,
  Sun,
  Moon
} from 'lucide-react';
import clsx from 'clsx'
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useState, useRef, useEffect } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, dividerAfter: true },
  { name: 'Assets', href: '/assets', icon: Wallet },
  { name: 'Income', href: '/income', icon: DollarSign },
  { name: 'Expenses', href: '/expenses', icon: Receipt, dividerAfter: true },
  { name: 'Budget', href: '/budget', icon: PiggyBank },
  { name: 'Goals', href: '/goals', icon: Target },
  { name: 'Investments', href: '/investments', icon: TrendingUp },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    try {
      await logout();
      setMobileMenuOpen(false);
      setProfileDropdownOpen(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      {/* Mobile Menu Button - Hamburger */}
      {!mobileMenuOpen && (
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 glass-card rounded-xl shadow-lg"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6 text-[var(--text-primary)]" />
        </button>
      )}

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={clsx(
        "glass-sidebar flex h-screen w-64 flex-col shadow-2xl bg-white dark:bg-[#121212] transition-transform duration-300 ease-in-out",
        "fixed lg:static z-40",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo */}
        <div className="flex h-28 items-center justify-start px-6 border-b bg-transparent relative" style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }}>
          <div className="flex flex-col items-start">
            <div className="flex items-center">
              <div className="relative">
                <CreditCard className="h-8 w-8 text-[var(--accent-primary)]" />
                <Sparkles className="h-4 w-4 text-[var(--accent-success)] absolute -top-1 -right-1 animate-pulse" />
              </div>
              <span className="ml-2 text-2xl font-semibold bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-success)] bg-clip-text text-transparent">
                WalletAI
              </span>
            </div>
            <span className="text-[13px] text-[var(--text-tertiary)] mt-1">AI-powered financial assistant</span>
          </div>
          {/* Close button for mobile */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-[var(--card-hover)] rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5 text-[var(--text-primary)]" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 pt-3 pb-4 overflow-y-auto bg-transparent">
          <ul className="space-y-1">
            {navigation.map((item, index) => {
              const isActive = pathname === item.href;
              return (
                <li
                  key={item.name}
                  style={{ animationDelay: `${index * 50}ms` }}
                  className="animate-slide-in-right"
                >
                  <Link
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={clsx(
                      'group flex items-center rounded-2xl px-4 py-3.5 text-base font-medium',
                      isActive
                        ? 'bg-gradient-to-r from-[#3b82f6] to-[#6366f1] text-white'
                        : 'sidebar-nav-hover text-[var(--text-secondary)]'
                    )}
                  >
                    <item.icon className={clsx("mr-3.5 h-5 w-5", isActive ? "text-white" : "text-[var(--text-tertiary)] group-hover:text-white")} />
                    {item.name}
                  </Link>
                  {item.dividerAfter && (
                    <div className="my-2 mx-2 border-t" style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }} />
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Theme Toggle with Label */}
        <div className="px-4 pb-4 border-t" style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }}>
          <div className="pt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {theme === 'dark' ? (
                <Moon className="h-5 w-5 text-[var(--text-tertiary)]" />
              ) : (
                <Sun className="h-5 w-5 text-[var(--text-tertiary)]" />
              )}
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </span>
            </div>
            {/* Theme Toggle Switch - Simple */}
            <button
              onClick={toggleTheme}
              className={clsx(
                "relative w-11 h-6 rounded-full transition-colors duration-300 focus:outline-none",
                theme === 'dark' ? 'bg-blue-500' : 'bg-gray-300'
              )}
              aria-label="Toggle theme"
            >
              <div
                className={clsx(
                  "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300",
                  theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>
        </div>

        {/* User Profile with Dropdown */}
        <div className="border-t p-4 bg-transparent relative" style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }} ref={dropdownRef}>
          {/* Dropdown Menu (appears above) - Solid background */}
          {profileDropdownOpen && (
            <div className="absolute bottom-full left-4 right-4 mb-2 rounded-xl shadow-xl overflow-hidden animate-slide-in-up" style={{ backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff' }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }}>
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  {user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User'}
                </div>
                <div className="text-xs text-[var(--text-secondary)] truncate">{user?.email}</div>
              </div>
              <Link
                href="/settings"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setProfileDropdownOpen(false);
                }}
                className="flex items-center px-4 py-3 text-sm font-medium text-[var(--text-secondary)] transition-colors"
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Settings className="mr-3 h-4 w-4 text-[var(--text-tertiary)]" />
                Settings
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-4 py-3 text-sm font-medium text-[var(--text-secondary)] transition-colors"
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <LogOut className="mr-3 h-4 w-4 text-[var(--text-tertiary)]" />
                Logout
              </button>
            </div>
          )}

          {/* Profile Row (clickable) */}
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="w-full flex items-center p-2 rounded-xl transition-colors focus:outline-none"
            style={{
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <div className="relative">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-success)] flex items-center justify-center shadow-lg">
                <span className="text-sm font-semibold text-white">
                  {(user?.user_metadata?.display_name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                </span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[var(--accent-success)] rounded-full border-2 border-[var(--background)]"></div>
            </div>
            <div className="ml-3 flex-1 min-w-0 text-left">
              <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                {user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User'}
              </div>
              <div className="text-xs text-[var(--text-secondary)]">View profile</div>
            </div>
            <ChevronUp className={clsx(
              "h-4 w-4 text-[var(--text-tertiary)] transition-transform duration-200",
              profileDropdownOpen ? "rotate-0" : "rotate-180"
            )} />
          </button>
        </div>
      </div>
    </>
  );
}




