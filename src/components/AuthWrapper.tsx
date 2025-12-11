'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import AIAdvisor from '@/components/AIAdvisor';
import { FinanceProvider } from '@/context/FinanceContext';

const publicRoutes = ['/', '/login', '/signup', '/verify-email', '/forgot-password', '/reset-password'];

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  // Floating AI Assistant state
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  const isPublicRoute = publicRoutes.includes(pathname);

  useEffect(() => {
    if (!loading) {
      if (!user && !isPublicRoute) {
        // Redirect to login if not authenticated and not on public route
        router.push('/login');
      } else if (user && (pathname === '/login' || pathname === '/signup')) {
        // Only redirect to dashboard from login/signup pages when authenticated
        router.push('/dashboard');
      }
    }
  }, [user, loading, isPublicRoute, pathname, router]);

  // Show loading spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center transition-colors duration-300">
        <div className="text-center animate-scale-in">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="relative spinner rounded-full h-16 w-16 border-4 border-[var(--text-tertiary)] border-t-transparent"></div>
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
          <main className="flex-1 overflow-auto relative">
            {children}
            
            {/* Floating AI Assistant Button - Only show when popup is closed */}
            {!isAssistantOpen && (
              <button
                onClick={() => setIsAssistantOpen(true)}
                className="fixed bottom-6 right-6 md:bottom-8 md:right-8 text-white px-4 py-3 md:px-6 md:py-4 rounded-full shadow-2xl hover:shadow-blue-500/50 hover:scale-105 transition-all duration-300 flex items-center gap-2 font-semibold z-40 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-success)] text-sm md:text-base"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <span className="hidden sm:inline">AI Assistant</span>
                <span className="sm:hidden">AI</span>
              </button>
            )}

            {/* Floating AI Assistant Popup - Responsive */}
            {isAssistantOpen && (
              <div className="fixed inset-4 md:top-32 md:right-8 md:bottom-8 md:left-auto z-50 pointer-events-none">
                <div 
                  className="w-full md:w-[600px] h-full rounded-3xl shadow-2xl animate-slide-in-right pointer-events-auto flex flex-col"
                >
                  <AIAdvisor onClose={() => setIsAssistantOpen(false)} />
                </div>
              </div>
            )}
          </main>
        </div>
      </FinanceProvider>
    );
  }

  // Fallback (shouldn't reach here due to useEffect redirect)
  return null;
}
