export default function CircularLobby({ players, hostSessionId, currentSessionId }) {
  const list = players || [];

  if (!list.length) {
    return (
      <p className="py-6 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
        En attente de joueurs…
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
      {list.map((player) => {
        const isHost = player.sessionId === hostSessionId;
        const isYou = player.sessionId === currentSessionId;
        return (
          <li
            key={player.sessionId}
            className="flex min-h-11 items-center gap-3 rounded-2xl bg-slate-100 p-3 dark:bg-slate-900"
          >
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-black text-white ${
                isHost ? "bg-blue-600" : "bg-slate-400 dark:bg-slate-600"
              }`}
            >
              {player.nickname?.charAt(0)?.toUpperCase() || "?"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="break-words font-bold leading-tight text-slate-950 dark:text-white">
                {player.nickname}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {isHost ? "Hôte" : "Participant"}
                {isYou ? " · vous" : ""}
                {player.disconnected ? (
                  <span className="text-amber-600"> · déconnecté</span>
                ) : null}
              </p>
            </div>
            {isHost && (
              <span className="shrink-0 rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                Hôte
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
