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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
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
