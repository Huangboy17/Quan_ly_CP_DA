import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({
  title = 'Chưa có dữ liệu',
  description = 'Không tìm thấy dữ liệu phù hợp với bộ lọc hoặc tìm kiếm hiện tại.',
  icon: Icon = Inbox,
  action
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl bg-card border border-border/60 my-4 shadow-2xs">
      <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center text-muted-foreground mb-3 shadow-2xs">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight mb-1">
        {title}
      </h3>
      <p className="text-xs text-muted-foreground max-w-sm leading-relaxed mb-4">
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
        >
          {action.icon && <action.icon className="w-3.5 h-3.5" />}
          <span>{action.label}</span>
        </button>
      )}
    </div>
  );
}
