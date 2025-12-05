'use client';

import { useState } from 'react';
import { Calendar, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthSelectorProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  showAllOption?: boolean;
}

export default function MonthSelector({ selectedMonth, onMonthChange, showAllOption = false }: MonthSelectorProps) {
  const [showModal, setShowModal] = useState(false);

  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  // Show last 4 years, current year, and next year
  const years = Array.from({ length: 6 }, (_, i) => currentYear - 4 + i); // e.g. 2022–2027 when currentYear=2026
  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const getDisplayText = () => {
    if (selectedMonth === 'all') return 'View All Time';
    const [year, month] = selectedMonth.split('-');
    const monthName = months.find(m => m.value === month)?.label || '';
    return `${monthName} ${year}`;
  };

  const handleMonthSelect = (year: number, month: string) => {
    onMonthChange(`${year}-${month}`);
    setShowModal(false);
  };

  const handleAllHistory = () => {
    onMonthChange('all');
    setShowModal(false);
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 'all') {
      // Go to current month
      const now = new Date();
      onMonthChange(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
      return;
    }
    const [year, month] = selectedMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    date.setMonth(date.getMonth() - 1);
    onMonthChange(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    if (selectedMonth === 'all') return;
    const [year, month] = selectedMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    date.setMonth(date.getMonth() + 1);
    const nextMonthValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    // Don't go beyond December of next year
    const maxMonthStr = `${nextYear}-12`;
    if (nextMonthValue <= maxMonthStr) {
      onMonthChange(nextMonthValue);
    }
  };

  const isCurrentMonth = () => {
    if (selectedMonth === 'all') return false;
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return selectedMonth === currentMonthStr;
  };

  const isMaxMonth = () => {
    if (selectedMonth === 'all') return false;
    const maxMonthStr = `${nextYear}-12`;
    return selectedMonth === maxMonthStr;
  };

  return (
    <>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 glass-card rounded-xl px-4 py-2 text-[var(--text-primary)] hover:scale-105 transition-all duration-300 liquid-button shadow-lg"
        >
          <Calendar className="h-4 w-4 text-[var(--accent-primary)]" />
          <span className="font-medium">{getDisplayText()}</span>
        </button>

        <button
          onClick={handlePrevMonth}
          className="p-2 glass-card rounded-xl text-[var(--text-primary)] hover:scale-105 hover:bg-[var(--card-hover)] transition-all duration-300 liquid-button shadow-lg"
          title="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <button
          onClick={handleNextMonth}
          disabled={isMaxMonth()}
          className="p-2 glass-card rounded-xl text-[var(--text-primary)] hover:scale-105 hover:bg-[var(--card-hover)] transition-all duration-300 liquid-button shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          title="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => setShowModal(false)}
        >
          <div
            className="glass-card rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-[var(--text-primary)]">Select Month</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-[var(--text-secondary)] hover:text-[var(--accent-error)] hover:bg-[var(--sidebar-hover)] rounded-xl transition-all duration-300 liquid-button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Current Month Button */}
            <button
              onClick={() => {
                const now = new Date();
                const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                onMonthChange(currentMonthStr);
                setShowModal(false);
              }}
              className={`w-full mb-4 p-3 rounded-xl text-left font-medium transition-all duration-300 liquid-button shadow-lg flex items-center ${isCurrentMonth()
                ? 'bg-[var(--accent-primary)] text-white'
                : 'glass-card text-[var(--text-primary)] hover:bg-[var(--card-hover)]'
                }`}
            >
              <Calendar className="h-4 w-4 mr-2" />
              This Month
              {isCurrentMonth() && <span className="ml-auto">✓</span>}
            </button>

            {showAllOption && (
              <button
                onClick={handleAllHistory}
                className={`w-full mb-4 p-3 rounded-xl text-left font-medium transition-all duration-300 liquid-button shadow-lg ${selectedMonth === 'all'
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'glass-card text-[var(--text-primary)] hover:bg-[var(--card-hover)]'
                  }`}
              >
                📅 View All Time
              </button>
            )}

            <div className="space-y-6">
              {years.reverse().map(year => (
                <div key={year}>
                  <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-3">{year}</h4>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {months.map(month => {
                      const value = `${year}-${month.value}`;
                      const isSelected = selectedMonth === value;
                      // Allow all months in nextYear to be selectable, but prevent years beyond that
                      const monthDate = new Date(`${year}-${month.value}-01`);
                      const now = new Date();
                      let isFuture = false;
                      if (year > nextYear) {
                        isFuture = true;
                      } else if (year === nextYear) {
                        isFuture = false;
                      } else {
                        isFuture = monthDate > now;
                      }

                      return (
                        <button
                          key={month.value}
                          onClick={() => handleMonthSelect(year, month.value)}
                          disabled={isFuture}
                          className={`p-3 rounded-xl text-sm font-medium transition-all duration-300 liquid-button shadow-lg ${isSelected
                            ? 'bg-[var(--accent-primary)] text-white'
                            : isFuture
                              ? 'glass-card text-[var(--text-tertiary)] opacity-40 cursor-not-allowed'
                              : 'glass-card text-[var(--text-primary)] hover:bg-[var(--card-hover)] hover:scale-105'
                            }`}
                        >
                          {month.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

