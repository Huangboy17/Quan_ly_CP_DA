import React from 'react';

export default function StatCard({ 
  title, 
  value, 
  subtext, 
  icon: Icon, 
  color = 'blue', 
  progress, 
  badge 
}) {
  const colorStyles = {
    blue: {
      border: 'border-blue-500/20 hover:border-blue-500/40',
      iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
      progressBg: 'bg-blue-500',
    },
    emerald: {
      border: 'border-emerald-500/20 hover:border-emerald-500/40',
      iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
      progressBg: 'bg-emerald-500',
    },
    amber: {
      border: 'border-amber-500/20 hover:border-amber-500/40',
      iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
      progressBg: 'bg-amber-500',
    },
    purple: {
      border: 'border-purple-500/20 hover:border-purple-500/40',
      iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',
      progressBg: 'bg-purple-500',
    },
    rose: {
      border: 'border-rose-500/20 hover:border-rose-500/40',
      iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
      progressBg: 'bg-rose-500',
    },
    cyan: {
      border: 'border-cyan-500/20 hover:border-cyan-500/40',
      iconBg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20',
      progressBg: 'bg-cyan-500',
    },
  };

  const style = colorStyles[color] || colorStyles.blue;

  return (
    <div className={`p-3.5 sm:p-4 rounded-xl bg-card border ${style.border} transition duration-150 shadow-2xs flex flex-col justify-between relative overflow-hidden group`}>
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {title}
          </span>
          {Icon && (
            <div className={`p-1.5 rounded-lg ${style.iconBg} shrink-0`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
          )}
        </div>

        <div className="text-lg lg:text-xl font-bold text-foreground tracking-tight font-mono mb-0.5">
          {value}
        </div>

        {subtext && (
          <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1 font-medium truncate">
            {subtext}
          </p>
        )}
      </div>

      {progress !== undefined && (
        <div className="mt-2.5">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-muted-foreground font-medium">Tiến độ</span>
            <span className="text-foreground font-bold font-mono">{progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full ${style.progressBg} rounded-full transition-all duration-500`}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      )}

      {badge && (
        <div className="mt-2">
          {badge}
        </div>
      )}
    </div>
  );
}

