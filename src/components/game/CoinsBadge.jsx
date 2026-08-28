import { formatCoins } from '../../lib/format';
import useAnimatedClose from '../../hooks/useAnimatedClose.js';

export default function CoinsBadge({ coins, coinHistory = [], className = "", onOpen = null }) {
  if (coins == null) return null;
  return (
    <button
      type="button"
      onClick={() => onOpen?.()}
      className={`pointer-events-auto flex items-center gap-3 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-lg ring-1 ring-slate-200 transition-transform hover:scale-105 dark:bg-slate-900 dark:text-white dark:ring-slate-700 ${className}`}
    >
      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-transparent">
        <svg className="h-8 w-8 drop-shadow-sm" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <circle cx="12" cy="12" r="10" fill="url(#coinGrad)" stroke="#D97706" strokeWidth="1.5" />
          <circle cx="9" cy="9" r="3" fill="white" opacity="0.4" />
          <path d="M12 7v10M9 9l3-2 3 2M9 15l3 2 3-2" stroke="#B45309" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <defs>
            <linearGradient id="coinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFED9A" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="tabular-nums">{formatCoins(coins)}</div>
    </button>
  );
}

export function CoinsHistoryModal({ coins, onClose, coinHistory = [] }) {
  const { leaving, requestClose, onExitAnimationEnd } = useAnimatedClose(onClose);
  const leave = leaving ? " is-leaving" : "";
  return (
    <div
      className={`sheet-overlay fixed inset-0 z-[2000] flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm touch-none sm:items-center sm:p-4${leave}`}
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        requestClose();
      }}
      onAnimationEnd={onExitAnimationEnd}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onPointerMove={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div
        className={`sheet-panel w-full max-w-sm rounded-t-3xl bg-white p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700 sm:rounded-2xl${leave}`}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerMove={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#F59E0B" stroke="#D97706" strokeWidth="1.5"/><path d="M12 7v10M9 9l3-2 3 2M9 15l3 2 3-2" stroke="#B45309" strokeWidth="1.5" strokeLinecap="round"/></svg>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Historique des pièces</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total : {formatCoins(coins)} pièces</p>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              requestClose();
            }}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {coinHistory.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-slate-500 dark:text-slate-400">Aucun historique de pièces disponible</p>
            </div>
          ) : (
            coinHistory.map((entry) => (
              <div
                key={entry.id || entry.timestamp}
                className="flex items-center justify-between rounded-lg bg-slate-100 p-3 dark:bg-slate-800"
              >
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{entry.reason || entry.type}</p>
                  <p className="text-xs text-slate-500">{entry.time || new Date(entry.timestamp).toLocaleString('fr-FR')}</p>
                </div>
                <span className={`text-sm font-bold ${entry.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {entry.amount > 0 ? '+' : ''}{entry.amount}
                </span>
              </div>
            ))
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            requestClose();
          }}
          className="mt-4 w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 dark:shadow-none"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
