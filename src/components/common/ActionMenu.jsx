import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal } from 'lucide-react';

export default function ActionMenu({ actions = [], align = 'right' }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!actions || actions.length === 0) return null;

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition cursor-pointer border border-transparent hover:border-border"
        title="Thao tác"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          className={`absolute z-30 mt-1 w-44 rounded-xl bg-card border border-border shadow-lg py-1 animate-in fade-in-50 zoom-in-95 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {actions.map((action, idx) => {
            if (action.divider) {
              return <div key={idx} className="my-1 border-t border-border/60" />;
            }
            const Icon = action.icon;
            const isDanger = action.variant === 'danger';
            return (
              <button
                key={action.key || idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  if (action.onClick) action.onClick();
                }}
                disabled={action.disabled}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition text-left cursor-pointer ${
                  isDanger
                    ? 'text-destructive hover:bg-destructive/10'
                    : 'text-foreground hover:bg-muted'
                } ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={action.title}
              >
                {Icon && <Icon className={`w-3.5 h-3.5 ${isDanger ? 'text-destructive' : 'text-muted-foreground'}`} />}
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
