export default function BottomNav({
  activeTab,
  onTabChange,
  chatOpen,
  onChatToggle,
  centerAction,
  onCenterAction,
  canShowMap = true,
  showAdmin = false,
  onMore,
}) {
  const tabCls = (active, disabled) =>
    `flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-2 text-[11px] font-semibold transition ${
      disabled
        ? "opacity-30"
        : active
          ? "bg-[#5B7FA5]/10 text-[#5B7FA5]"
          : "text-slate-500"
    }`;

  const iconCls = "h-6 w-6";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[900] flex justify-center pb-[max(0.6rem,env(safe-area-inset-bottom))] md:hidden">
      <nav className="relative w-[min(420px,calc(100vw-1.25rem))] rounded-[26px] bg-white/95 px-2 py-2 shadow-xl ring-1 ring-slate-200/80 backdrop-blur dark:bg-slate-950/90 dark:ring-slate-700/80">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!canShowMap}
            onClick={() => {
              onChatToggle(false);
              onTabChange("map");
            }}
            className={tabCls(activeTab === "map" && !chatOpen, !canShowMap)}
            aria-current={activeTab === "map" ? "page" : undefined}
          >
            <svg className={iconCls} fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
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
              onChatToggle(false);
              onTabChange("players");
            }}
            className={tabCls(activeTab === "players" && !chatOpen, false)}
            aria-current={activeTab === "players" ? "page" : undefined}
          >
            <svg className={iconCls} fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128H5.228A2 2 0 013 17.16v-.088c0-2.052 1.622-3.82 3.837-4.1a9.77 9.77 0 016.326 0A4.49 4.49 0 0115 16.057v3.071zM12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
              />
            </svg>
            Joueurs
          </button>

          <div className="relative -mt-7 flex h-16 w-16 shrink-0 items-center justify-center">
            <button
              type="button"
              onClick={onCenterAction}
              disabled={!centerAction}
              className={`flex h-16 w-16 items-center justify-center rounded-[24px] text-white shadow-lg ring-1 ring-white/60 transition active:scale-[0.98] ${
                centerAction ? "bg-[#5B7FA5]" : "bg-slate-300"
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
                <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
                  />
                </svg>
              ) : (
                <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h3v3h-3v-3z"
                  />
                </svg>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              if (chatOpen) onChatToggle(false);
              else {
                onTabChange("map");
                onChatToggle(true);
              }
            }}
            className={tabCls(chatOpen, false)}
            aria-expanded={chatOpen}
          >
            <svg className={iconCls} fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            Chat
          </button>

          <button
            type="button"
            onClick={onMore}
            className={tabCls(activeTab === "admin" && !chatOpen, false)}
          >
            {showAdmin ? (
              <svg className={iconCls} fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            ) : (
              <svg className={iconCls} fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.25 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m-1.5 3h1.5M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.25 6.75v10.5A2.25 2.25 0 004.5 19.5z"
                />
              </svg>
            )}
            {showAdmin ? "Admin" : "Infos"}
          </button>
        </div>
      </nav>
    </div>
  );
}

