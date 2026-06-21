export function formatDurationMs(ms) {
  if (!ms || ms <= 0) return '0:00';
  const totalSec = Math.ceil(ms / 1000);
  if (totalSec >= 3600) {
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    return `${String(hours).padStart(2, '0')}h${String(mins).padStart(2, '0')}`;
  }
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatCoins(n) {
  if (n == null) return '';
  const num = Number(n);
  if (!isFinite(num)) return String(n);
  if (Math.abs(num) >= 1000) {
    const v = (num / 1000).toFixed(1).replace(/\.0$/, '');
    return `${v}k`;
  }
  return String(num);
}
