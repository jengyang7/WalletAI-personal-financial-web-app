'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import AIAdvisor from '@/components/AIAdvisor';
import { FinanceProvider } from '@/context/FinanceContext';

const publicRoutes = ['/login', '/signup', '/verify-email'];

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicRoute = publicRoutes.includes(pathname);

  useEffect(() => {
    if (!loading) {
      if (!user && !isPublicRoute) {
        // Redirect to login if not authenticated and not on public route
        router.push('/login');
      } else if (user && isPublicRoute) {
        // Redirect to dashboard if authenticated and on public route
        router.push('/');
      }
    }
  }, [user, loading, isPublicRoute, router]);

  // Show loading spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center transition-colors duration-300">
        <div className="text-center animate-scale-in">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-success)] rounded-full blur-xl opacity-50 animate-pulse"></div>
            <div className="relative spinner rounded-full h-16 w-16 border-4 border-transparent border-t-[var(--accent-primary)] border-r-[var(--accent-success)]"></div>
          </div>
          <p className="text-[var(--text-secondary)] font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Show public routes (login/signup) without sidebar
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Show protected routes with sidebar (only if authenticated)
  if (user) {
    return (
      <FinanceProvider>
        <div className="flex h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
          <div className="w-96">
            <AIAdvisor />
          </div>
        </div>
      </FinanceProvider>
    );
  }

  // Fallback (shouldn't reach here due to useEffect redirect)
  return null;
}
