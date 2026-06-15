import PartyChatPanel from "./PartyChatPanel.jsx";

export default function SocialPanel({
  roomCode,
  rosterList,
  sessionId,
  partyChatMessages,
  onShare,
  onSelectPlayer,
  onSendChat,
  position,
  socket,
  onFocusLocation,
  ghostUiNow,
  roleBadgeText,
}) {
  return (
    <div className="h-full overflow-auto bg-gradient-to-b from-[#FFF5D7]/40 via-white to-[#FDECF4]/40 p-4 pb-28 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="mx-auto max-w-lg space-y-4">
        <div className="rounded-3xl bg-gradient-to-br from-[#BFDBFE] via-[#93C5FD] to-[#2563EB] p-5 text-center text-white shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/80">Code partie</p>
          <p className="mt-1 font-mono text-3xl font-black tracking-widest">{roomCode}</p>
          <button
            type="button"
            onClick={onShare}
            className="mt-4 w-full rounded-full bg-white/90 py-2.5 text-sm font-bold text-[#2563EB] shadow transition hover:bg-white"
          >
            Partager
          </button>
        </div>

        <div>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
            Participants ({rosterList.length})
          </h2>
          <ul className="space-y-2">
            {rosterList.map((p) => {
              let ghostRemaining = null;
              let ghostProgress = 0;
              if (p.invisible && p.invisUntil && p.invisSince && p.invisUntil > ghostUiNow) {
                const total = p.invisUntil - p.invisSince;
                const rest = p.invisUntil - ghostUiNow;
                if (total > 0) ghostProgress = 1 - rest / total;
                ghostRemaining = Math.max(1, Math.round(rest / 1000));
              }
              const isCat = p.role === "cat";
              return (
                <li key={p.sessionId}>
                  <button
                    type="button"
                    onClick={() => onSelectPlayer(p)}
                    className="flex w-full items-center gap-3 rounded-2xl bg-white/90 p-3 text-left shadow-sm ring-1 ring-slate-100 transition active:scale-[0.98] dark:bg-slate-800/90 dark:ring-slate-700"
                  >
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white ${
                        isCat
                          ? "bg-gradient-to-br from-[#FB7185] to-[#F97316]"
                          : "bg-gradient-to-br from-[#60A5FA] to-[#2563EB]"
                      }`}
                    >
                      {p.nickname.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-semibold text-slate-900 dark:text-white">
                          {p.nickname}
                          {p.sessionId === sessionId && (
                            <span className="ml-1 text-xs text-[#2563EB]">(vous)</span>
                          )}
                        </span>
                        {(p.coins || 0) > 0 && (
                          <span className="shrink-0 rounded-full bg-[#FDE68A] px-2 py-0.5 text-xs font-bold text-amber-900">
                            🪙 {p.coins}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs font-medium ${isCat ? "text-[#FB7185]" : "text-[#2563EB]"}`}>
                        {roleBadgeText(p)}
                        {p.disconnected && " · Déconnecté"}
                        {p.invisible && " · Ghost"}
                      </p>
                      {ghostRemaining != null && (
                        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                          <div
                            className="h-full rounded-full bg-slate-500"
                            style={{ width: `${Math.max(6, Math.min(100, ghostProgress * 100))}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-3xl bg-white/90 p-3 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800/90 dark:ring-slate-700">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Chat</h2>
          <PartyChatPanel
            fillHeight
            variant="discussion"
            messages={partyChatMessages}
            sessionId={sessionId}
            onSend={onSendChat}
            position={position}
            disabled={!socket}
            onFocusLocation={onFocusLocation}
          />
        </div>
      </div>
    </div>
  );
}
