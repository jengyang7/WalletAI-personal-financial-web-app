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
  Sparkles
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/context/AuthContext';
import ThemeToggle from './ThemeToggle';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Assets', href: '/assets', icon: Wallet },
  { name: 'Income', href: '/income', icon: DollarSign },
  { name: 'Expenses', href: '/expenses', icon: Receipt },
  { name: 'Budget', href: '/budget', icon: PiggyBank },
  { name: 'Goals', href: '/goals', icon: Target },
  { name: 'Investments', href: '/investments', icon: TrendingUp },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="glass-sidebar flex h-screen w-64 flex-col shadow-2xl animate-slide-in-right bg-white dark:bg-[#121212]">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-6 border-b border-[var(--glass-border)] bg-transparent">
        <div className="flex items-center">
          <div className="relative">
            <CreditCard className="h-8 w-8 text-[var(--accent-primary)]" />
            <Sparkles className="h-3 w-3 text-[var(--accent-success)] absolute -top-1 -right-1 animate-pulse" />
          </div>
          <span className="ml-3 text-xl font-semibold bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-success)] bg-clip-text text-transparent">
            FinAI
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 overflow-y-auto bg-transparent">
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
                  className={clsx(
                    'group flex items-center rounded-2xl px-4 py-3.5 text-base font-medium',
                    isActive
                      ? 'bg-gradient-to-r from-[#3b82f6] to-[#6366f1] text-white shadow-lg shadow-blue-500/30'
                      : 'sidebar-nav-hover text-[var(--text-secondary)]'
                  )}
                >
                  <item.icon className={clsx("mr-3.5 h-5 w-5", isActive ? "text-white" : "text-[var(--text-tertiary)] group-hover:text-white")} />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Theme Toggle */}
      <div className="px-4 pb-4 border-t border-[var(--glass-border)]">
        <div className="pt-4">
          <ThemeToggle />
        </div>
      </div>

      {/* User Profile */}
      <div className="border-t-2 border-[var(--glass-border)] p-4 bg-transparent">
        <div className="flex items-center mb-4">
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-success)] flex items-center justify-center shadow-lg">
              <span className="text-sm font-semibold text-white">
                {(user?.user_metadata?.display_name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
              </span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[var(--accent-success)] rounded-full border-2 border-[var(--background)]"></div>
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <div className="text-sm font-medium text-[var(--text-primary)] truncate">
              {user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User'}
            </div>
            <div className="text-xs text-[var(--text-secondary)] truncate">{user?.email}</div>
          </div>
        </div>

        <div className="space-y-1">
          <Link
            href="/settings"
            className="group flex items-center rounded-2xl px-4 py-3 text-sm font-medium sidebar-nav-hover text-[var(--text-secondary)]"
          >
            <Settings className="mr-3 h-4 w-4 text-[var(--text-tertiary)] group-hover:text-white" />
            Settings
          </Link>
          <button
            onClick={handleLogout}
            className="group w-full flex items-center rounded-2xl px-4 py-3 text-sm font-medium sidebar-nav-hover text-[var(--text-secondary)]"
          >
            <LogOut className="mr-3 h-4 w-4 text-[var(--text-tertiary)] group-hover:text-white" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}




