export default function AdminPanel({
  roomCode,
  rosterList,
  sessionId,
  onEndGame,
  onAddTime,
  onAdjustCoins,
  onSetRole,
  onKick,
  onLeave,
}) {
  return (
    <div className="h-full overflow-auto bg-gradient-to-b from-[#FFF5D7] via-white to-[#FDECF4] p-4 pb-28 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="mx-auto max-w-lg space-y-4">
        <div className="rounded-3xl bg-gradient-to-br from-[#FDE68A] via-[#FBBF24] to-[#F97316] p-5 text-center shadow-lg">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-900/70">Admin · Hôte</p>
          <p className="mt-1 font-mono text-3xl font-black tracking-widest text-amber-950">{roomCode}</p>
        </div>

        <button
          type="button"
          onClick={onEndGame}
          className="w-full rounded-2xl bg-gradient-to-r from-[#FB7185] to-[#F43F5E] py-3.5 text-sm font-bold text-white shadow-lg"
        >
          Terminer la partie
        </button>

        <div className="rounded-3xl bg-white/90 p-4 shadow-sm ring-1 ring-amber-100 dark:bg-slate-800/90 dark:ring-slate-700">
          <p className="mb-2 text-sm font-bold text-slate-800 dark:text-white">Ajouter du temps</p>
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              max={60}
              placeholder="Minutes"
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const v = e.currentTarget.value;
                  if (v) onAddTime(v);
                }
              }}
            />
            <button
              type="button"
              onClick={(e) => {
                const input = e.currentTarget.parentElement?.querySelector("input");
                if (input?.value) onAddTime(input.value);
              }}
              className="rounded-xl bg-gradient-to-r from-[#34D399] to-[#10B981] px-4 py-2 text-xs font-bold text-white"
            >
              + Temps
            </button>
          </div>
        </div>

        <ul className="space-y-3">
          {rosterList.map((p, idx) => {
            const accents = [
              "from-[#60A5FA] to-[#2563EB]",
              "from-[#FB7185] to-[#F97316]",
              "from-[#A78BFA] to-[#8B5CF6]",
              "from-[#34D399] to-[#10B981]",
            ];
            const grad = accents[idx % accents.length];
            return (
              <li
                key={p.sessionId}
                className="overflow-hidden rounded-3xl bg-white shadow-md ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700"
              >
                <div className={`bg-gradient-to-r ${grad} px-4 py-3 text-white`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold">
                      {p.nickname}
                      {p.sessionId === sessionId && " (vous)"}
                    </span>
                    <span className="rounded-full bg-white/25 px-2 py-0.5 text-xs font-bold">
                      🪙 {p.coins || 0}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-white/80">{p.role === "cat" ? "Chat" : "Joueur"}</p>
                </div>
                {p.sessionId !== sessionId && (
                  <div className="space-y-2 p-3">
                    <div className="flex flex-wrap gap-1">
                      {[-10, -5, -1, 1, 5, 10].map((d) => (
                        <button
                          key={d}
                          type="button"
                          className={`rounded-lg px-2 py-1 text-xs font-bold text-white ${
                            d > 0 ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                          onClick={() =>
                            onAdjustCoins(p.sessionId, d, p.nickname)
                          }
                        >
                          {d > 0 ? `+${d}` : d}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onSetRole(p.sessionId, "cat")}
                        className="rounded-xl bg-gradient-to-r from-[#FB7185] to-[#F97316] px-3 py-2 text-xs font-bold text-white"
                      >
                        Chat
                      </button>
                      <button
                        type="button"
                        onClick={() => onSetRole(p.sessionId, "player")}
                        className="rounded-xl bg-gradient-to-r from-[#60A5FA] to-[#2563EB] px-3 py-2 text-xs font-bold text-white"
                      >
                        Joueur
                      </button>
                      <button
                        type="button"
                        onClick={() => onKick(p.sessionId)}
                        className="rounded-xl bg-slate-200 px-3 py-2 text-xs font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                      >
                        Expulser
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={onLeave}
          className="w-full rounded-2xl border-2 border-slate-200 py-3 text-sm font-semibold text-slate-600 dark:border-slate-600 dark:text-slate-300"
        >
          Quitter (hôte)
        </button>
      </div>
    </div>
  );
}
