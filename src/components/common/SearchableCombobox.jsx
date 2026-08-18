import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { removeVietnameseTones } from '../../utils/formatters';

export default function SearchableCombobox({
  options = [],
  value = '',
  onChange,
  placeholder = 'Chọn hoặc nhập để tìm kiếm...',
  disabled = false,
  disabledPlaceholder = 'Vui lòng chọn bước trước',
  renderOption,
  getSearchableString,
  maxDisplay = 50,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Find currently selected option
  const selectedOption = useMemo(() => {
    return options.find(opt => opt.id === value || opt.value === value) || null;
  }, [options, value]);

  // Real-time filtering and relevance scoring (Vietnamese accent-insensitive & case-insensitive)
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) {
      return options.slice(0, maxDisplay);
    }

    const cleanQuery = removeVietnameseTones(searchTerm.trim());

    // Score and filter
    const scored = [];
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      let searchStr = '';
      
      if (getSearchableString) {
        searchStr = getSearchableString(opt);
      } else if (opt.searchTerms) {
        searchStr = opt.searchTerms;
      } else {
        searchStr = `${opt.label || ''} ${opt.subtitle || ''} ${opt.id || ''} ${opt.meta || ''}`;
      }

      const cleanStr = removeVietnameseTones(searchStr);

      if (cleanStr.includes(cleanQuery)) {
        let score = 0;
        const cleanLabel = removeVietnameseTones(opt.label || '');
        
        if (cleanLabel === cleanQuery) score += 100;
        else if (cleanLabel.startsWith(cleanQuery)) score += 50;
        else if (cleanStr.startsWith(cleanQuery)) score += 30;
        else score += 10;

        scored.push({ opt, score });
      }
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);
    return scored.map(item => item.opt).slice(0, maxDisplay);
  }, [options, searchTerm, getSearchableString, maxDisplay]);

  // Reset highlight index when filtered list changes
  useEffect(() => {
    setHighlightIndex(0);
  }, [filteredOptions]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const highlightedEl = listRef.current.children[highlightIndex];
      if (highlightedEl) {
        highlightedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [highlightIndex, isOpen]);

  const handleSelect = (option) => {
    if (onChange) {
      onChange(option);
    }
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (onChange) {
      onChange(null);
    }
    setSearchTerm('');
    setIsOpen(false);
  };

  // Keyboard Handler for Notion/Google style controls
  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex(prev => Math.min(prev + 1, Math.max(0, filteredOptions.length - 1)));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightIndex]) {
          handleSelect(filteredOptions[highlightIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm('');
        break;
      case 'Tab':
        setIsOpen(false);
        setSearchTerm('');
        break;
      default:
        break;
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      
      {/* Input Field Box */}
      <div
        onClick={() => {
          if (!disabled) {
            setIsOpen(prev => !prev);
            if (!isOpen && inputRef.current) {
              inputRef.current.focus();
            }
          }
        }}
        className={`w-full px-3.5 py-2.5 bg-muted border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-card/50 border-border'
            : isOpen
            ? 'border-success ring-1 ring-emerald-500 shadow-lg shadow-emerald-500/10'
            : 'border-border hover:border-border'
        }`}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          
          {isOpen ? (
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={selectedOption ? selectedOption.label : placeholder}
              className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-400 focus:outline-none"
              autoFocus
            />
          ) : (
            <span className={`text-sm truncate ${selectedOption ? 'text-slate-100 font-medium' : 'text-muted-foreground'}`}>
              {disabled
                ? disabledPlaceholder
                : selectedOption
                ? selectedOption.label
                : placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedOption && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition"
              title="Xóa lựa chọn"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180 text-success' : ''}`} />
        </div>
      </div>

      {/* Dropdown Menu Popup */}
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in duration-150">
          
          {/* List Container */}
          <div ref={listRef} className="max-h-64 overflow-y-auto p-1.5 space-y-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                const isSelected = selectedOption && selectedOption.id === opt.id;
                const isHighlighted = highlightIndex === idx;

                if (renderOption) {
                  return (
                    <div
                      key={opt.id || idx}
                      onClick={() => handleSelect(opt)}
                      onMouseEnter={() => setHighlightIndex(idx)}
                      className="cursor-pointer"
                    >
                      {renderOption(opt, { isSelected, isHighlighted })}
                    </div>
                  );
                }

                return (
                  <div
                    key={opt.id || idx}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    className={`px-3 py-2 rounded-lg cursor-pointer transition flex items-center justify-between text-xs ${
                      isHighlighted
                        ? 'bg-muted text-foreground'
                        : isSelected
                        ? 'bg-muted/60 text-emerald-300'
                        : 'text-foreground/80 hover:bg-muted/40'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="font-semibold truncate text-sm text-slate-100 flex items-center gap-2">
                        {opt.label}
                        {isSelected && <Check className="w-3.5 h-3.5 text-success shrink-0" />}
                      </div>
                      {opt.subtitle && (
                        <div className="text-[11px] text-muted-foreground truncate mt-0.5">{opt.subtitle}</div>
                      )}
                    </div>

                    {opt.badge && (
                      <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-muted text-warning border border-border shrink-0">
                        {opt.badge}
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-muted-foreground">
                Không tìm thấy kết quả phù hợp cho &quot;<span className="text-foreground font-semibold">{searchTerm}</span>&quot;
              </div>
            )}
          </div>

          {/* Footer info tip */}
          <div className="px-3 py-1.5 bg-background/80 border-t border-border text-[10px] text-muted-foreground flex items-center justify-between">
            <span>Dùng <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-foreground/80 font-mono">↑</kbd> <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-foreground/80 font-mono">↓</kbd> để di chuyển</span>
            <span><kbd className="px-1 py-0.5 rounded bg-muted border border-border text-foreground/80 font-mono">Enter</kbd> chọn • <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-foreground/80 font-mono">Esc</kbd> đóng</span>
          </div>

        </div>
      )}

    </div>
  );
}
