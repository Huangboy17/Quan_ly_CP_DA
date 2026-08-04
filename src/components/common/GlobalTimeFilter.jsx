import React from 'react';
import { Calendar, Filter, RotateCcw, Building2, ChevronDown } from 'lucide-react';

export default function GlobalTimeFilter({ timeFilter, setTimeFilter, projects = [] }) {
  const currentYear = new Date().getFullYear();
  const yearOptions = ['all', '2024', '2025', '2026'];
  const monthOptions = [
    { value: 'all', label: 'Tất cả Tháng' },
    { value: '1', label: 'Tháng 1' },
    { value: '2', label: 'Tháng 2' },
    { value: '3', label: 'Tháng 3' },
    { value: '4', label: 'Tháng 4' },
    { value: '5', label: 'Tháng 5' },
    { value: '6', label: 'Tháng 6' },
    { value: '7', label: 'Tháng 7' },
    { value: '8', label: 'Tháng 8' },
    { value: '9', label: 'Tháng 9' },
    { value: '10', label: 'Tháng 10' },
    { value: '11', label: 'Tháng 11' },
    { value: '12', label: 'Tháng 12' },
  ];

  const handleYearChange = (year) => {
    setTimeFilter(prev => ({
      ...prev,
      year,
      // If setting custom date range, reset custom dates when switching year
      customStartDate: '',
      customEndDate: '',
    }));
  };

  const handleQuarterChange = (quarter) => {
    setTimeFilter(prev => ({
      ...prev,
      quarter,
      month: 'all', // Mutually exclusive with specific month
      customStartDate: '',
      customEndDate: '',
    }));
  };

  const handleMonthChange = (month) => {
    setTimeFilter(prev => ({
      ...prev,
      month,
      quarter: 'all', // Mutually exclusive with specific quarter
      customStartDate: '',
      customEndDate: '',
    }));
  };

  const handleProjectChange = (project_id) => {
    setTimeFilter(prev => ({ ...prev, project_id }));
  };

  const handleResetFilter = () => {
    setTimeFilter({
      year: 'all',
      quarter: 'all',
      month: 'all',
      customStartDate: '',
      customEndDate: '',
      project_id: '',
    });
  };

  const isFiltered = (timeFilter.year && timeFilter.year !== 'all') ||
    (timeFilter.quarter && timeFilter.quarter !== 'all') ||
    (timeFilter.month && timeFilter.month !== 'all') ||
    timeFilter.customStartDate ||
    timeFilter.customEndDate ||
    timeFilter.project_id;

  return (
    <div className="bg-slate-900/90 backdrop-blur border-b border-slate-800 px-4 lg:px-8 py-3 sticky top-16 z-20 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
        
        {/* Filter Label */}
        <div className="flex items-center gap-2 text-slate-300 font-semibold shrink-0">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Calendar className="w-4 h-4" />
          </div>
          <span>BỘ LỌC DÒNG TIỀN:</span>
        </div>

        {/* Filter Inputs Grid */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          
          {/* Year Filter */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700/80">
            <span className="text-[11px] text-slate-400 px-1 font-medium">Năm:</span>
            {yearOptions.map(y => (
              <button
                key={y}
                onClick={() => handleYearChange(y)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                  (timeFilter.year || 'all') === y
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {y === 'all' ? 'Tất cả' : y}
              </button>
            ))}
          </div>

          {/* Quarter Filter */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700/80">
            <span className="text-[11px] text-slate-400 px-1 font-medium">Quý:</span>
            {['all', 'Q1', 'Q2', 'Q3', 'Q4'].map(q => (
              <button
                key={q}
                onClick={() => handleQuarterChange(q)}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition ${
                  (timeFilter.quarter || 'all') === q
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {q === 'all' ? 'Tất cả' : q}
              </button>
            ))}
          </div>

          {/* Month Selector */}
          <div className="relative">
            <select
              value={timeFilter.month || 'all'}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 font-medium transition cursor-pointer"
            >
              {monthOptions.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Custom Date Range Picker */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700/80 text-slate-300">
            <span className="text-[11px] text-slate-400 px-1 font-medium">Từ:</span>
            <input
              type="date"
              value={timeFilter.customStartDate || ''}
              onChange={(e) => setTimeFilter(prev => ({ ...prev, customStartDate: e.target.value, year: 'all', quarter: 'all', month: 'all' }))}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-[11px] focus:outline-none"
            />
            <span className="text-[11px] text-slate-400 px-1 font-medium">Đến:</span>
            <input
              type="date"
              value={timeFilter.customEndDate || ''}
              onChange={(e) => setTimeFilter(prev => ({ ...prev, customEndDate: e.target.value, year: 'all', quarter: 'all', month: 'all' }))}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-[11px] focus:outline-none"
            />
          </div>

          {/* Project Selector Filter */}
          <div className="relative shrink-0">
            <select
              value={timeFilter.project_id || ''}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 font-medium transition cursor-pointer"
            >
              <option value="">-- Tất cả Dự án --</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Reset Filter Button */}
          {isFiltered && (
            <button
              onClick={handleResetFilter}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
              title="Đặt lại toàn bộ bộ lọc thời gian"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Đặt lại
            </button>
          )}

        </div>

      </div>
    </div>
  );
}
