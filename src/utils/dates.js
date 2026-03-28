export function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function fmtRelative(d) {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7)  return `${days}d ago`;
  return fmtDate(d);
}

export function weekLabel() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay() + 1);
  return `W/C ${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
}

export function taskUrgency(due) {
  if (!due) return 'normal';
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  if (due < today)    return 'overdue';
  if (due === today)  return 'today';
  if (due === tomorrow) return 'tomorrow';
  return 'normal';
}
