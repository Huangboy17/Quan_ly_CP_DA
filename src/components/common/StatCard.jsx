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
      border: 'border-primary/30 hover:border-primary/50',
      iconBg: 'bg-primary/10 text-primary border border-primary/20',
      progressBg: 'bg-primary',
    },
    emerald: {
      border: 'border-success/30 hover:border-success/50',
      iconBg: 'bg-success/10 text-success border border-success/20',
      progressBg: 'bg-success',
    },
    amber: {
      border: 'border-warning/30 hover:border-warning/50',
      iconBg: 'bg-warning/10 text-warning border border-warning/20',
      progressBg: 'bg-warning',
    },
    purple: {
      border: 'border-primary/30 hover:border-primary/50',
      iconBg: 'bg-primary/10 text-primary border border-primary/20',
      progressBg: 'bg-primary',
    },
    rose: {
      border: 'border-destructive/30 hover:border-destructive/50',
      iconBg: 'bg-destructive/10 text-destructive border border-destructive/20',
      progressBg: 'bg-destructive',
    },
    cyan: {
      border: 'border-primary/30 hover:border-primary/50',
      iconBg: 'bg-primary/10 text-primary border border-primary/20',
      progressBg: 'bg-primary',
    },
  };

  const style = colorStyles[color] || colorStyles.blue;

  return (
    <div className={`p-3.5 sm:p-4 rounded-xl bg-card border ${style.border} transition duration-200 shadow-md flex flex-col justify-between relative overflow-hidden group`}>
      {/* Background Subtle Gradient Glow */}
      <div className="absolute -right-6 -bottom-6 w-20 h-20 rounded-full bg-muted blur-xl group-hover:bg-muted/80 transition pointer-events-none" />

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            {title}
          </span>
          {Icon && (
            <div className={`p-1.5 rounded-lg ${style.iconBg}`}>
              <Icon className="w-4 h-4" />
            </div>
          )}
        </div>

        <div className="text-lg lg:text-xl font-bold text-foreground tracking-tight font-mono mb-0.5">
          {value}
        </div>

        {subtext && (
          <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
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
