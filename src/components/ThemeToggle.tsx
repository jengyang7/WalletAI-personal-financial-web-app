'use client';

import { useTheme } from '@/context/ThemeContext';
import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className="relative w-14 h-7 rounded-full glass transition-all duration-300">
        <div className="w-5 h-5 rounded-full bg-white shadow-lg" />
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="relative w-14 h-7 rounded-full glass transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
      aria-label="Toggle theme"
    >
      {/* Track */}
      <div 
        className={`absolute inset-0 rounded-full transition-all duration-300 ${
          theme === 'dark' 
            ? 'bg-gradient-to-r from-indigo-600 to-purple-600' 
            : 'bg-gradient-to-r from-amber-400 to-orange-400'
        }`}
      />
      
      {/* Thumb */}
      <div
        className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-lg transition-all duration-300 flex items-center justify-center ${
          theme === 'dark' ? 'translate-x-7' : 'translate-x-0'
        }`}
      >
        {theme === 'dark' ? (
          <Moon className="w-3 h-3 text-indigo-600" />
        ) : (
          <Sun className="w-3 h-3 text-amber-500" />
        )}
      </div>
    </button>
  );
}


