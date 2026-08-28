import PartyChatPanel from "./PartyChatPanel.jsx";
import Button from "../ui/Button.jsx";
import { formatCoins } from "../../lib/format";

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
    <div className="h-full overflow-auto bg-white px-3 pb-28 pt-2 text-slate-950 [scrollbar-width:none] [-ms-overflow-style:none] dark:bg-slate-950 dark:text-white [&::-webkit-scrollbar]:hidden">
      <div className="mx-auto max-w-lg space-y-4">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 text-center dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Code partie</p>
          <p className="mt-2 break-all font-mono text-3xl font-black tracking-[0.18em] text-blue-600">{roomCode}</p>
          <Button
            variant="primary"
            className="mt-4 w-full"
            onClick={onShare}
          >
            Partager
          </Button>
        </div>

        <div>
          <h2 className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-slate-400">
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
              const isGhost = p.invisible;
              return (
                <li key={p.sessionId}>
                  <button
                    type="button"
                    onClick={() => onSelectPlayer(p)}
                    className={`flex min-h-11 w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left dark:border-slate-700 dark:bg-slate-900 ${isGhost ? 'opacity-50' : ''}`}
                  >
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-black text-white ${
                        isCat ? "bg-blue-600" : "bg-amber-500"
                      }`}
                    >
                      {p.nickname.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate whitespace-nowrap overflow-hidden text-ellipsis font-bold text-slate-950 dark:text-white">
                          {p.nickname}
                          {p.sessionId === sessionId && (
                            <span className="ml-1 text-xs font-semibold text-blue-600">(vous)</span>
                          )}
                        </span>
                        {(p.coins || 0) > 0 && (
                          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            {formatCoins(p.coins)}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs font-bold ${isCat ? "text-blue-600" : "text-amber-600"}`}>
                        {roleBadgeText(p)}
                        {p.disconnected && " · Déconnecté"}
                        {p.invisible && " · Ghost"}
                      </p>
                      {ghostRemaining != null && (
                        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                          <div
                            className="h-full rounded-full bg-blue-600"
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

        <div className="rounded-[2rem] border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
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
