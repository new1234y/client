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
    <div className="h-full overflow-auto bg-white p-4 pb-28 text-slate-950 [scrollbar-width:none] dark:bg-slate-950 dark:text-white [&::-webkit-scrollbar]:hidden">
      <div className="mx-auto max-w-lg space-y-4">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 text-center dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Admin · Hôte</p>
          <p className="mt-1 break-all font-mono text-3xl font-black tracking-[0.18em] text-blue-600">{roomCode}</p>
        </div>

        <Button
          variant="danger"
          className="w-full"
          onClick={onEndGame}
        >
          Terminer la partie
        </Button>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="mb-2 text-sm font-bold text-slate-800 dark:text-white">Ajouter du temps</p>
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              max={60}
              placeholder="Minutes"
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
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
          {rosterList.map((p) => {
            const isCat = p.role === "cat";
            return (
              <li
                key={p.sessionId}
                className="overflow-hidden rounded-3xl bg-white shadow-md ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700"
              >
                <div className={`px-4 py-3 text-white ${isCat ? "bg-blue-600" : "bg-amber-500"}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold">
                      {p.nickname}
                      {p.sessionId === sessionId && " (vous)"}
                    </span>
                    <span className="rounded-full bg-white/25 px-2 py-0.5 text-xs font-bold">
                      {formatCoins(p.coins || 0)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-white/80">{p.role === "cat" ? "Chat" : "Souris"}</p>
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
                  <form
                    className="mt-2 flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const input = e.currentTarget.querySelector("input");
                      const n = Number(input?.value);
                      if (!Number.isFinite(n) || n === 0) return;
                      const abs = Math.abs(n);
                      if (abs >= 1000 && !window.confirm(`Attribuer ${n > 0 ? "+" : ""}${n} pièces à ${p.nickname} ?`)) return;
                      onAdjustCoins(p.sessionId, n, p.nickname);
                      if (input) input.value = "";
                    }}
                  >
                    <input
                      type="number"
                      step="1"
                      placeholder="Montant libre"
                      className="min-h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                    />
                    <Button variant="primary" size="sm" type="submit">OK</Button>
                  </form>
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
                        Souris
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
