import React from 'react';
import { Calendar, RotateCcw, Tag } from 'lucide-react';
import { COST_GROUP_OPTIONS } from '../contracts/ContractModal';

export default function GlobalTimeFilter({ timeFilter, setTimeFilter, projects = [] }) {
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

  // Rule 1: Choosing "Năm: Tất cả" resets Quý & Tháng to "all" and clears custom dates
  const handleYearChange = (year) => {
    setTimeFilter(prev => {
      const updated = {
        ...prev,
        year,
        quarter: year === 'all' ? 'all' : prev.quarter,
        month: year === 'all' ? 'all' : prev.month,
        customStartDate: '',
        customEndDate: '',
      };
      console.log('🌐 [GlobalTimeFilter] Year Changed:', updated);
      return updated;
    });
  };

  // Rule 2: Choosing a specific Quarter (Q1..Q4) forces a specific Year, resets Month
  const handleQuarterChange = (quarter) => {
    setTimeFilter(prev => {
      let activeYear = prev.year;
      if (quarter !== 'all' && (prev.year === 'all' || !prev.year)) {
        activeYear = new Date().getFullYear().toString();
        if (!['2024', '2025', '2026'].includes(activeYear)) activeYear = '2025';
      }
      const updated = {
        ...prev,
        year: activeYear,
        quarter,
        month: 'all',
        customStartDate: '',
        customEndDate: '',
      };
      console.log('🌐 [GlobalTimeFilter] Quarter Changed:', updated);
      return updated;
    });
  };

  // Rule 3: Choosing a specific Month (1..12) forces a specific Year, resets Quarter
  const handleMonthChange = (month) => {
    setTimeFilter(prev => {
      let activeYear = prev.year;
      if (month !== 'all' && (prev.year === 'all' || !prev.year)) {
        activeYear = new Date().getFullYear().toString();
        if (!['2024', '2025', '2026'].includes(activeYear)) activeYear = '2025';
      }
      const updated = {
        ...prev,
        year: activeYear,
        month,
        quarter: 'all',
        customStartDate: '',
        customEndDate: '',
      };
      console.log('🌐 [GlobalTimeFilter] Month Changed:', updated);
      return updated;
    });
  };

  // Rule 4: Custom Date Range selection clears Year/Quarter/Month buttons to avoid filter conflict
  const handleCustomStartDateChange = (val) => {
    setTimeFilter(prev => {
      const updated = {
        ...prev,
        customStartDate: val,
        year: 'all',
        quarter: 'all',
        month: 'all',
      };
      console.log('🌐 [GlobalTimeFilter] Custom Start Date Changed:', updated);
      return updated;
    });
  };

  const handleCustomEndDateChange = (val) => {
    setTimeFilter(prev => {
      const updated = {
        ...prev,
        customEndDate: val,
        year: 'all',
        quarter: 'all',
        month: 'all',
      };
      console.log('🌐 [GlobalTimeFilter] Custom End Date Changed:', updated);
      return updated;
    });
  };

  const handleProjectChange = (project_id) => {
    setTimeFilter(prev => {
      const updated = { ...prev, project_id };
      console.log('🌐 [GlobalTimeFilter] Project Changed:', updated);
      return updated;
    });
  };

  const handleCostGroupChange = (cost_group) => {
    setTimeFilter(prev => {
      const updated = { ...prev, cost_group };
      console.log('🌐 [GlobalTimeFilter] Cost Group Changed:', updated);
      return updated;
    });
  };

  const handleResetFilter = () => {
    const defaultState = {
      year: 'all',
      quarter: 'all',
      month: 'all',
      customStartDate: '',
      customEndDate: '',
      project_id: '',
      cost_group: '',
    };
    console.log('🌐 [GlobalTimeFilter] Reset Filter:', defaultState);
    setTimeFilter(defaultState);
  };

  const isFiltered = Boolean(
    (timeFilter.year && timeFilter.year !== 'all') ||
    (timeFilter.quarter && timeFilter.quarter !== 'all') ||
    (timeFilter.month && timeFilter.month !== 'all') ||
    timeFilter.customStartDate ||
    timeFilter.customEndDate ||
    timeFilter.project_id ||
    timeFilter.cost_group
  );

  return (
    <div className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 lg:px-6 py-3 sticky top-16 z-20 shadow-xl w-full">
      <div className="w-full max-w-full flex flex-col xl:flex-row xl:items-center justify-between gap-3 text-xs">
        
        {/* Filter Label */}
        <div className="flex items-center gap-2 text-slate-200 font-bold shrink-0">
          <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20">
            <Calendar className="w-4 h-4" />
          </div>
          <span className="tracking-wide uppercase text-[11px] text-cyan-300 font-extrabold">BỘ LỌC THỜI GIAN:</span>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          
          {/* Year Buttons */}
          <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700/90 shadow-inner">
            <span className="text-[11px] text-slate-400 font-semibold px-1.5">Năm:</span>
            {yearOptions.map(y => (
              <button
                key={y}
                onClick={() => handleYearChange(y)}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  (timeFilter.year || 'all') === y
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/70'
                }`}
              >
                {y === 'all' ? 'Tất cả' : y}
              </button>
            ))}
          </div>

          {/* Quarter Buttons */}
          <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700/90 shadow-inner">
            <span className="text-[11px] text-slate-400 font-semibold px-1.5">Quý:</span>
            {['all', 'Q1', 'Q2', 'Q3', 'Q4'].map(q => (
              <button
                key={q}
                onClick={() => handleQuarterChange(q)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  (timeFilter.quarter || 'all') === q
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/70'
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
              className="px-3 py-1.5 bg-slate-800/90 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/40 text-xs font-semibold transition cursor-pointer hover:border-slate-600"
            >
              {monthOptions.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Custom Date Range Picker Container */}
          <div className="flex items-center gap-2 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700/90 shadow-inner text-slate-200">
            <span className="text-[11px] font-bold text-slate-300">Từ:</span>
            <div className="relative flex items-center">
              <input
                type="date"
                value={timeFilter.customStartDate || ''}
                onChange={(e) => handleCustomStartDateChange(e.target.value)}
                className="bg-slate-900/90 border border-slate-600 hover:border-cyan-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/40 text-white font-mono font-bold rounded-lg px-2.5 py-1 text-xs outline-none transition shadow-sm"
              />
            </div>
            <span className="text-[11px] font-bold text-slate-300">Đến:</span>
            <div className="relative flex items-center">
              <input
                type="date"
                value={timeFilter.customEndDate || ''}
                onChange={(e) => handleCustomEndDateChange(e.target.value)}
                className="bg-slate-900/90 border border-slate-600 hover:border-cyan-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/40 text-white font-mono font-bold rounded-lg px-2.5 py-1 text-xs outline-none transition shadow-sm"
              />
            </div>
          </div>

          {/* Project Filter */}
          <div className="relative shrink-0">
            <select
              value={timeFilter.project_id || ''}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="px-3 py-1.5 bg-slate-800/90 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 text-xs font-semibold transition cursor-pointer hover:border-slate-600"
            >
              <option value="">-- Tất cả Dự án --</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Cost Group Filter */}
          <div className="relative shrink-0">
            <select
              value={timeFilter.cost_group || ''}
              onChange={(e) => handleCostGroupChange(e.target.value)}
              className="px-3 py-1.5 bg-slate-800/90 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/40 text-xs font-semibold transition cursor-pointer hover:border-slate-600"
            >
              <option value="">-- Tất cả Nhóm Chi Phí --</option>
              <option value="unassigned">Chưa phân loại</option>
              {COST_GROUP_OPTIONS.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Reset Filter Button */}
          {isFiltered && (
            <button
              onClick={handleResetFilter}
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              title="Đặt lại toàn bộ bộ lọc"
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
