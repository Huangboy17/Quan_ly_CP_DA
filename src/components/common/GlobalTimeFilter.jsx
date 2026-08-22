import React from 'react';
import { Calendar, RotateCcw, Filter, Building2, Tag, Clock } from 'lucide-react';
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

  // Active filter count for badge indicator
  const activeCount = [
    (timeFilter.year && timeFilter.year !== 'all'),
    (timeFilter.quarter && timeFilter.quarter !== 'all'),
    (timeFilter.month && timeFilter.month !== 'all'),
    Boolean(timeFilter.customStartDate || timeFilter.customEndDate),
    Boolean(timeFilter.project_id),
    Boolean(timeFilter.cost_group)
  ].filter(Boolean).length;

  return (
    <div className="bg-background/95 backdrop-blur-md border-b border-border px-3 sm:px-4 lg:px-6 py-2 sticky top-16 z-20 shadow-sm w-full transition-colors">
      <div className="w-full max-w-full flex flex-col lg:flex-row lg:items-center justify-between gap-2 text-xs">
        
        {/* Header Label with Filter Count Indicator */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 font-semibold text-[11px]">
            <Filter className="w-3.5 h-3.5" />
            <span className="uppercase tracking-wider font-extrabold text-[10px]">Bộ lọc dữ liệu</span>
            {activeCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-primary text-primary-foreground font-bold text-[10px]">
                {activeCount}
              </span>
            )}
          </div>
        </div>

        {/* Filter Controls Container */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          
          {/* 1. Năm (Year Buttons) */}
          <div className="flex items-center gap-1 bg-card p-1 rounded-lg border border-border shadow-2xs">
            <span className="text-[10px] text-muted-foreground font-semibold px-1 hidden xl:inline">Năm:</span>
            {yearOptions.map(y => (
              <button
                key={y}
                onClick={() => handleYearChange(y)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition cursor-pointer ${
                  (timeFilter.year || 'all') === y
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {y === 'all' ? 'Tất cả' : y}
              </button>
            ))}
          </div>

          {/* 2. Quý (Quarter Buttons) */}
          <div className="flex items-center gap-1 bg-card p-1 rounded-lg border border-border shadow-2xs">
            <span className="text-[10px] text-muted-foreground font-semibold px-1 hidden xl:inline">Quý:</span>
            {['all', 'Q1', 'Q2', 'Q3', 'Q4'].map(q => (
              <button
                key={q}
                onClick={() => handleQuarterChange(q)}
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold transition cursor-pointer ${
                  (timeFilter.quarter || 'all') === q
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {q === 'all' ? 'Tất cả' : q}
              </button>
            ))}
          </div>

          {/* 3. Tháng (Month Selector) */}
          <div className="relative shrink-0">
            <select
              value={timeFilter.month || 'all'}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="px-2.5 py-1 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-[11px] font-medium transition cursor-pointer hover:border-muted-foreground/40"
            >
              {monthOptions.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* 4 & 5. Khoảng ngày (Custom Date Range: Từ - Đến) */}
          <div className="flex items-center gap-1.5 bg-card px-2 py-1 rounded-lg border border-border shadow-2xs text-foreground">
            <Clock className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
            <span className="text-[10px] font-medium text-muted-foreground">Từ:</span>
            <input
              type="date"
              value={timeFilter.customStartDate || ''}
              onChange={(e) => handleCustomStartDateChange(e.target.value)}
              className="bg-background border border-border hover:border-primary focus:border-primary text-foreground font-mono font-medium rounded px-1.5 py-0.5 text-[10px] outline-none transition"
            />
            <span className="text-[10px] font-medium text-muted-foreground">Đến:</span>
            <input
              type="date"
              value={timeFilter.customEndDate || ''}
              onChange={(e) => handleCustomEndDateChange(e.target.value)}
              className="bg-background border border-border hover:border-primary focus:border-primary text-foreground font-mono font-medium rounded px-1.5 py-0.5 text-[10px] outline-none transition"
            />
          </div>

          {/* 6. Dự án (Project Filter) */}
          <div className="relative shrink-0">
            <select
              value={timeFilter.project_id || ''}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="px-2.5 py-1 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-[11px] font-medium transition cursor-pointer hover:border-muted-foreground/40 max-w-[180px] truncate"
            >
              <option value="">-- Tất cả Dự án --</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* 7. Nhóm chi phí (Cost Group Filter) */}
          <div className="relative shrink-0">
            <select
              value={timeFilter.cost_group || ''}
              onChange={(e) => handleCostGroupChange(e.target.value)}
              className="px-2.5 py-1 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-[11px] font-medium transition cursor-pointer hover:border-muted-foreground/40 max-w-[180px] truncate"
            >
              <option value="">-- Tất cả Nhóm Chi Phí --</option>
              <option value="unassigned">Chưa phân loại</option>
              {COST_GROUP_OPTIONS.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* 8. Đặt lại (Reset Filter Button) */}
          {isFiltered && (
            <button
              onClick={handleResetFilter}
              className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer shadow-2xs"
              title="Đặt lại toàn bộ bộ lọc"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Đặt lại</span>
            </button>
          )}

        </div>

      </div>
    </div>
  );
}

