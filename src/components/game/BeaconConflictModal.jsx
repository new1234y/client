import { useEffect, useState } from "react";

export default function BeaconConflictModal({ conflict, onClose }) {
  const [phase, setPhase] = useState("waiting");
  const [face, setFace] = useState(null);

  useEffect(() => {
    if (!conflict) return undefined;
    setPhase("waiting");
    setFace(null);
    const timer = setTimeout(() => setPhase("flipping"), 350);
    return () => clearTimeout(timer);
  }, [conflict]);

  useEffect(() => {
    if (phase !== "flipping" || !conflict) return undefined;
    const timer = setTimeout(() => {
      setFace(conflict.result || conflict.outcome || "heads");
      setPhase("result");
    }, 1200);
    return () => clearTimeout(timer);
  }, [phase, conflict]);

  if (!conflict) return null;
  const winner = conflict.winnerNickname || conflict.winnerName;
  const isWinner = conflict.winnerSessionId && conflict.winnerSessionId === conflict.sessionId;

  return (
    <div className="fixed inset-0 z-[10060] flex items-center justify-center bg-slate-950/75 p-5 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-[2rem] border border-white/15 bg-slate-900 p-6 text-center text-white shadow-2xl">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-300">Conflit de balise</p>
        <h2 className="mt-2 text-2xl font-black">Pile ou face synchronisé</h2>
        <p className="mt-2 text-sm text-slate-300">{conflict.message || "Deux joueurs sont arrivés presque en même temps."}</p>
        <div className={`mx-auto my-7 flex h-28 w-28 items-center justify-center rounded-full border-4 border-amber-300 bg-amber-400 text-4xl font-black text-slate-900 shadow-[0_0_45px_rgba(250,204,21,.45)] ${phase === "flipping" ? "animate-spin" : ""}`}>
          {phase === "waiting" ? "?" : phase === "flipping" ? "↻" : face === "tails" ? "F" : "P"}
        </div>
        {phase === "result" && (
          <p className="text-lg font-bold">{winner ? `${winner} remporte la balise` : isWinner ? "Vous remportez la balise" : "Résultat enregistré"}</p>
        )}
        <button type="button" onClick={onClose} className="mt-6 w-full rounded-xl bg-white/10 px-4 py-3 font-bold hover:bg-white/15">
          Fermer
        </button>
      </div>
    </div>
  );
}
