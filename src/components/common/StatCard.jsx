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
      border: 'border-blue-500/30 hover:border-blue-500/50',
      iconBg: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      progressBg: 'bg-blue-500',
    },
    emerald: {
      border: 'border-emerald-500/30 hover:border-emerald-500/50',
      iconBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      progressBg: 'bg-emerald-500',
    },
    amber: {
      border: 'border-amber-500/30 hover:border-amber-500/50',
      iconBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      progressBg: 'bg-amber-500',
    },
    purple: {
      border: 'border-purple-500/30 hover:border-purple-500/50',
      iconBg: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
      progressBg: 'bg-purple-500',
    },
    rose: {
      border: 'border-rose-500/30 hover:border-rose-500/50',
      iconBg: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
      progressBg: 'bg-rose-500',
    },
    cyan: {
      border: 'border-cyan-500/30 hover:border-cyan-500/50',
      iconBg: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
      progressBg: 'bg-cyan-500',
    },
  };

  const style = colorStyles[color] || colorStyles.blue;

  return (
    <div className={`p-5 rounded-2xl bg-slate-800/80 border ${style.border} transition duration-200 shadow-lg flex flex-col justify-between relative overflow-hidden group`}>
      {/* Background Subtle Gradient Glow */}
      <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-slate-700/20 blur-xl group-hover:bg-slate-700/40 transition pointer-events-none" />

      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            {title}
          </span>
          {Icon && (
            <div className={`p-2 rounded-xl ${style.iconBg}`}>
              <Icon className="w-5 h-5" />
            </div>
          )}
        </div>

        <div className="text-xl lg:text-2xl font-bold text-white tracking-tight font-mono mb-1">
          {value}
        </div>

        {subtext && (
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
            {subtext}
          </p>
        )}
      </div>

      {progress !== undefined && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-400 font-medium">Tiến độ lũy kế</span>
            <span className="text-white font-bold">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-slate-700/80 rounded-full overflow-hidden">
            <div 
              className={`h-full ${style.progressBg} rounded-full transition-all duration-500`}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      )}

      {badge && (
        <div className="mt-3">
          {badge}
        </div>
      )}
    </div>
  );
}
