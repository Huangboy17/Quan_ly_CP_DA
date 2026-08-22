import React from 'react';

export default function StatusBadge({ status, label, variant, icon: Icon }) {
  let badgeStyle = 'bg-muted text-muted-foreground border-border';

  const v = variant || (
    status === 'settled' || status === 'active' || status === 'completed'
      ? 'success'
      : status === 'in_progress' || status === 'pending'
      ? 'warning'
      : status === 'overdue' || status === 'blocked' || status === 'danger'
      ? 'danger'
      : 'info'
  );

  if (v === 'success') {
    badgeStyle = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
  } else if (v === 'warning') {
    badgeStyle = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
  } else if (v === 'danger') {
    badgeStyle = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
  } else if (v === 'info') {
    badgeStyle = 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badgeStyle} shrink-0`}>
      {Icon ? <Icon className="w-3 h-3" /> : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      <span>{label || status}</span>
    </span>
  );
}
