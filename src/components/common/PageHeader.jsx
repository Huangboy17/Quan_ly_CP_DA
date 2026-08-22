import React from 'react';

export default function PageHeader({
  title,
  subtitle,
  breadcrumb,
  primaryAction,
  secondaryActions = [],
  children
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-border/60 transition-colors">
      <div>
        {breadcrumb && (
          <div className="text-xs text-muted-foreground font-medium mb-1.5 flex items-center gap-1.5">
            {breadcrumb}
          </div>
        )}
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-normal">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
        {children}

        {secondaryActions.map((action, idx) => {
          const Icon = action.icon;
          return (
            <button
              key={action.key || idx}
              onClick={action.onClick}
              disabled={action.disabled}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition cursor-pointer ${
                action.variant === 'danger'
                  ? 'bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/30'
                  : action.variant === 'warning'
                  ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
                  : 'bg-card hover:bg-muted text-foreground border-border shadow-2xs'
              }`}
              title={action.title}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              <span>{action.label}</span>
            </button>
          );
        })}

        {primaryAction && (
          <button
            onClick={primaryAction.onClick}
            disabled={primaryAction.disabled}
            className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-primary/20 transition cursor-pointer"
            title={primaryAction.title}
          >
            {primaryAction.icon && <primaryAction.icon className="w-4 h-4" />}
            <span>{primaryAction.label}</span>
          </button>
        )}
      </div>
    </div>
  );
}
