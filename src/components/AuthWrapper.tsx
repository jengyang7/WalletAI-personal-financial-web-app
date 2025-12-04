'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import AIAdvisor from '@/components/AIAdvisor';
import { FinanceProvider } from '@/context/FinanceContext';

const publicRoutes = ['/login', '/signup', '/verify-email'];

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  // Draggable width for the FinAI assistant panel (must be outside conditionals for hooks order)
  const [assistantWidth, setAssistantWidth] = useState<number>(384); // default ~ w-96
  const [isResizing, setIsResizing] = useState(false);
  const layoutRef = useRef<HTMLDivElement | null>(null);

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

  // Handle dragging to resize the assistant panel
  useEffect(() => {
    if (!isResizing) return;

    // Disable text selection while resizing
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      if (!layoutRef.current) return;
      const rect = layoutRef.current.getBoundingClientRect();
      const newWidth = rect.right - e.clientX;

      const minWidth = 384; // lock minimum width to original size (w-96)
      const maxWidth = 640;
      const clampedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);

      setAssistantWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.userSelect = previousUserSelect;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = previousUserSelect;
    };
  }, [isResizing, layoutRef]);

  const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsResizing(true);
  };

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
        <div className="flex h-screen" ref={layoutRef}>
          <Sidebar />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
          {/* Drag handle between main content and FinAI assistant */}
          <div
            className={`w-1 cursor-col-resize bg-[var(--background)] border-l border-[var(--glass-border)] hover:bg-[var(--card-hover)] transition-colors select-none ${
              isResizing ? 'bg-[var(--card-hover)]' : ''
            }`}
            onMouseDown={handleResizeMouseDown}
          />
          <div className="shrink-0" style={{ width: assistantWidth }}>
            <AIAdvisor />
          </div>
        </div>
      </FinanceProvider>
    );
  }

  // Fallback (shouldn't reach here due to useEffect redirect)
  return null;
}
