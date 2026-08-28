export default function BottomNav({
  activeTab,
  onTabChange,
  centerAction,
  onCenterAction,
  canShowMap = true,
  disablePowers = false,
}) {
  const tabCls = (active, disabled) =>
    `flex min-h-11 min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-3 py-2 text-[11px] font-bold transition ${
      disabled
        ? "opacity-30"
        : active
        ? "bg-blue-600 text-white"
          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
    }`;

  const iconCls = "h-5 w-5";
  const centerLabel = centerAction === "scan" ? "Scan" : centerAction === "qr" ? "QR" : "";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[900] flex justify-center pb-[max(4px,env(safe-area-inset-bottom))] md:hidden">
      <nav className="relative mx-2 w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white/95 p-1.5 shadow-sm backdrop-blur-xl dark:border-slate-700 dark:bg-slate-950/95">
        <div className="flex items-end gap-0.5">
          <button
            type="button"
            disabled={!canShowMap}
            onClick={() => {
              onTabChange("map");
            }}
            className={tabCls(activeTab === "map", !canShowMap)}
            aria-current={activeTab === "map" ? "page" : undefined}
          >
            <svg className={iconCls} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
            Jeu
          </button>

          <button
            type="button"
            onClick={() => {
              onTabChange("social");
            }}
            className={tabCls(activeTab === "social", false)}
            aria-current={activeTab === "social" ? "page" : undefined}
          >
            <svg className={iconCls} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128H5.228A2 2 0 013 17.16v-.088c0-2.052 1.622-3.82 3.837-4.1a9.77 9.77 0 016.326 0A4.49 4.49 0 0115 16.057v3.071zM12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
              />
            </svg>
            Social
          </button>

          <div className="relative -mt-5 flex min-w-[64px] shrink-0 flex-col items-center justify-center pb-0.5">
            <button
              type="button"
              onClick={onCenterAction}
              disabled={!centerAction}
              className={`flex h-12 w-12 items-center justify-center rounded-full text-white transition active:scale-[0.96] ${
                centerAction
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500"
              }`}
              aria-label={
                centerAction === "scan"
                  ? "Scanner pour capturer"
                  : centerAction === "qr"
                    ? "Afficher mon QR"
                    : "Action indisponible"
              }
            >
              {centerAction === "scan" ? (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4h4m8 0h4v4M4 16v4h4m8 0h4v-4M7 12h10" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 16.5h3v3h-3v-3z" />
                </svg>
              )}
            </button>
            {centerLabel && (
              <span className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-slate-600 dark:text-slate-300">
                {centerLabel}
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={disablePowers}
            onClick={() => {
              onTabChange("powers");
            }}
            className={tabCls(activeTab === "powers", disablePowers)}
            aria-current={activeTab === "powers" ? "page" : undefined}
          >
            <svg className={iconCls} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            Super
          </button>

          <button
            type="button"
            onClick={() => {
              onTabChange("settings");
            }}
            className={tabCls(activeTab === "settings", false)}
            aria-current={activeTab === "settings" ? "page" : undefined}
          >
            <svg className={iconCls} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Réglages
          </button>
        </div>
      </nav>
    </div>
  );
}
