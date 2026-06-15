export default function CoinsBadge({ coins, className = "" }) {
  if (coins == null) return null;
  return (
    <div
      className={`pointer-events-auto flex items-center gap-1 rounded-full bg-gradient-to-r from-[#FDE68A] to-[#FBBF24] px-3 py-1.5 text-sm font-bold text-amber-900 shadow-lg ring-1 ring-amber-200/80 ${className}`}
    >
      <span aria-hidden>🪙</span>
      <span className="tabular-nums">{coins}</span>
    </div>
  );
}
