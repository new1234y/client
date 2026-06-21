import Button from "../ui/Button.jsx";
import { formatCoins } from "../../lib/format";

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

        <Button
          variant="danger"
          className="w-full"
          onClick={onEndGame}
        >
          Terminer la partie
        </Button>

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
            <Button
              variant="success"
              size="sm"
              onClick={(e) => {
                const input = e.currentTarget.parentElement?.querySelector("input");
                if (input?.value) onAddTime(input.value);
              }}
            >
              + Temps
            </Button>
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
                      🪙 {formatCoins(p.coins || 0)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-white/80">{p.role === "cat" ? "Chat" : "Joueur"}</p>
                </div>
                <div className="space-y-2 p-3">
                  <div className="flex flex-wrap gap-1">
                    {[-10, -5, -1, 1, 5, 10].map((d) => (
                      <Button
                        key={d}
                        variant={d > 0 ? "success" : "danger"}
                        size="sm"
                        onClick={() =>
                          onAdjustCoins(p.sessionId, d, p.nickname)
                        }
                      >
                        {d > 0 ? `+${d}` : d}
                      </Button>
                    ))}
                  </div>
                  {p.sessionId !== sessionId && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => onSetRole(p.sessionId, "cat")}
                      >
                        Chat
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onSetRole(p.sessionId, "player")}
                      >
                        Joueur
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onKick(p.sessionId)}
                      >
                        Expulser
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <Button
          variant="secondary"
          className="w-full"
          onClick={onLeave}
        >
          Quitter (hôte)
        </Button>
      </div>
    </div>
  );
}
