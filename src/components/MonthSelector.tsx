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
  const currentMonth = new Date().getMonth() + 1;
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i); // Last 5 years to current year
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
    const nextMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    // Don't go beyond current month
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (nextMonth <= currentMonthStr) {
      onMonthChange(nextMonth);
    }
  };

  const isCurrentMonth = () => {
    if (selectedMonth === 'all') return false;
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return selectedMonth === currentMonthStr;
  };

  return (
    <>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white hover:bg-slate-800 transition-colors"
        >
          <Calendar className="h-4 w-4" />
          <span>{getDisplayText()}</span>
        </button>

        <button
          onClick={handlePrevMonth}
          className="p-2 bg-slate-900 border border-slate-600 rounded-lg text-white hover:bg-slate-800 transition-colors"
          title="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <button
          onClick={handleNextMonth}
          disabled={isCurrentMonth()}
          className="p-2 bg-slate-900 border border-slate-600 rounded-lg text-white hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {showModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-slate-900 rounded-xl p-6 w-full max-w-2xl border border-slate-700 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Select Month</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {showAllOption && (
              <button
                onClick={handleAllHistory}
                className={`w-full mb-4 p-3 rounded-lg text-left font-medium transition-colors ${
                  selectedMonth === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                📅 View All Time
              </button>
            )}

            <div className="space-y-6">
              {years.reverse().map(year => (
                <div key={year}>
                  <h4 className="text-lg font-semibold text-white mb-3">{year}</h4>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {months.map(month => {
                      const value = `${year}-${month.value}`;
                      const isSelected = selectedMonth === value;
                      const isFuture = new Date(`${year}-${month.value}-01`) > new Date();
                      
                      return (
                        <button
                          key={month.value}
                          onClick={() => handleMonthSelect(year, month.value)}
                          disabled={isFuture}
                          className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : isFuture
                              ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
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

