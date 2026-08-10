import { useState } from "react";
import heroChase from "../assets/hero-chase.png";

const rules = [
  {
    title: "Chat ou Souris",
    description: "Les Chats traquent. Les Souris esquivent et restent libres jusqu’à la fin du chrono.",
    icon: "roles",
  },
  {
    title: "Une zone vivante",
    description: "La zone de jeu se resserre progressivement : restez en mouvement et adaptez votre stratégie.",
    icon: "zone",
  },
  {
    title: "Capture par QR code",
    description: "Approchez votre cible, scannez sa balise et confirmez la capture directement dans le jeu.",
    icon: "qr",
  },
  {
    title: "Pouvoirs spéciaux",
    description: "Utilisez vos pouvoirs au bon moment pour brouiller une piste, accélérer ou surprendre un rival.",
    icon: "power",
  },
  {
    title: "Pièces et score",
    description: "Gagnez des pièces avec vos actions et grimpez au classement à chaque partie.",
    icon: "coin",
  },
];

function RuleIcon({ type }) {
  const common = "h-5 w-5";
  if (type === "roles") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="8" cy="8" r="3" /><circle cx="17" cy="10" r="2.5" /><path d="M3.5 20c.5-4 2.2-6 4.5-6s4 2 4.5 6M14 19c.4-2.7 1.4-4.2 3-4.2 1.8 0 3 1.5 3.5 4.2" />
      </svg>
    );
  }
  if (type === "zone") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" fill="currentColor" />
      </svg>
    );
  }
  if (type === "qr") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM15 14h2v2h-2zM19 14v3h-2M14 19h3v1M20 19v1" />
      </svg>
    );
  }
  if (type === "power") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z" />
      </svg>
    );
  }
  return (
    <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="8" /><path d="M14.5 8.5c-.6-.6-1.4-1-2.5-1-1.7 0-3 1-3 2.3 0 3.7 6 1.5 6 4.7 0 1.2-1.2 2.2-3 2.2-1.2 0-2.2-.4-2.9-1.1M12 5.5v13" />
    </svg>
  );
}

export default function HomePage({
  connected,
  nickname,
  setNickname,
  nicknameError,
  setNicknameError,
  roomCodeInput,
  setRoomCodeInput,
  entryBusyKind,
  errorBanner,
  onCreate,
  onJoin,
  onCancel,
  onOpenSettings,
  midJoinWait,
  onCancelMidJoin,
}) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const handleCreate = () => {
    if (nickname.trim()) {
      onCreate();
      return;
    }
    setShowCreateDialog(true);
  };

  const handleJoinKeyDown = (event) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing || event.keyCode === 229 || entryBusyKind) return;
    event.preventDefault();
    onJoin();
  };

  return (
    <div className="min-h-full overflow-x-hidden bg-white font-sans text-slate-950">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <a href="#top" className="flex items-center gap-3" aria-label="Chase GPS, accueil">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
            <span className="absolute inset-1.5 rounded-full border border-white/70" />
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
          </span>
          <span className="text-lg font-black tracking-tight">CHASE GPS</span>
        </a>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden items-center gap-2 text-sm font-medium text-slate-500 sm:flex">
            <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "animate-pulse bg-amber-500"}`} />
            {connected ? "En ligne" : "Connexion"}
          </span>
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Ouvrir les réglages"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={Boolean(entryBusyKind)}
            className="rounded-full bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60 sm:px-5"
          >
            {entryBusyKind === "create" ? "Création…" : "Créer une partie"}
          </button>
        </div>
      </header>

      <main id="top">
        <section className="mx-auto grid w-full max-w-7xl items-center gap-10 px-5 pb-16 pt-8 sm:px-8 sm:pt-14 lg:grid-cols-[1.02fr_0.98fr] lg:gap-14 lg:px-10 lg:pb-24 lg:pt-20">
          <div className="animate-fade-up">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-blue-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-60" />
                <span className="relative h-2 w-2 rounded-full bg-blue-600" />
              </span>
              La chasse commence dehors
            </div>
            <h1 className="max-w-3xl text-balance text-5xl font-black leading-[0.98] tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-7xl">
              La ville devient votre terrain de jeu.
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">
              Un jeu de poursuite GPS en temps réel. Formez votre équipe, restez dans la zone et capturez vos adversaires avant la fin du chrono.
            </p>

            <div className="mt-8 max-w-xl rounded-3xl border border-slate-200 bg-slate-50 p-3 shadow-sm sm:p-4">
              <label htmlFor="room-code" className="sr-only">Code de la partie</label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="room-code"
                  className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-5 py-4 font-mono text-base font-bold uppercase tracking-[0.2em] text-slate-950 outline-none placeholder:font-sans placeholder:font-medium placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Code de la partie"
                  value={roomCodeInput}
                  onChange={(event) => setRoomCodeInput(event.target.value.toUpperCase())}
                  onKeyDown={handleJoinKeyDown}
                  maxLength={8}
                  autoCapitalize="characters"
                  disabled={Boolean(entryBusyKind)}
                />
                <button
                  type="button"
                  onClick={onJoin}
                  disabled={Boolean(entryBusyKind)}
                  className="rounded-2xl bg-slate-950 px-6 py-4 text-sm font-bold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
                >
                  {entryBusyKind === "join" ? "Connexion…" : "Rejoindre"}
                </button>
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <label htmlFor="player-name" className="shrink-0 text-xs font-semibold text-slate-500">Votre pseudo</label>
                <input
                  id="player-name"
                  className={`min-w-0 flex-1 rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 ${nicknameError ? "border-amber-400 focus:ring-amber-100" : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"}`}
                  placeholder="Ex. Camille"
                  value={nickname}
                  onChange={(event) => {
                    setNickname(event.target.value);
                    setNicknameError(null);
                  }}
                  onKeyDown={handleJoinKeyDown}
                  maxLength={24}
                  autoComplete="nickname"
                  disabled={Boolean(entryBusyKind)}
                />
              </div>
              {nicknameError && <p className="mt-2 text-sm font-medium text-amber-700">{nicknameError}</p>}
            </div>

            {errorBanner && (
              <div role="alert" className="mt-4 max-w-xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                {errorBanner}
              </div>
            )}

            {entryBusyKind && (
              <button type="button" onClick={onCancel} className="mt-3 text-sm font-semibold text-slate-500 underline decoration-slate-300 underline-offset-4 hover:text-slate-900">
                Annuler
              </button>
            )}
          </div>

          <div className="relative animate-fade-up [animation-delay:160ms]">
            <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 shadow-[0_24px_70px_-32px_rgba(15,23,42,0.35)]">
              <img src={heroChase} alt="Carte du jeu montrant un Chat qui poursuit une Souris grâce au GPS" className="aspect-[3/2] h-full w-full object-cover" />
              <div className="absolute bottom-4 left-4 flex items-center gap-3 rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-lg backdrop-blur-sm">
                <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white">
                  <span className="absolute inset-0 animate-ping-slow rounded-full border border-blue-500" />
                  <span className="h-2 w-2 rounded-full bg-white" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Position en direct</p>
                  <p className="text-sm font-black text-slate-900">Cible à 180 m</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-50">
          <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">Règles du jeu</p>
              <h2 className="mt-3 text-balance text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Simple à comprendre. Impossible à prévoir.</h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">Tout ce qu’il faut savoir avant de lancer votre première chasse.</p>
            </div>

            <div className="mt-10 grid gap-px overflow-hidden rounded-3xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-3">
              {rules.map((rule, index) => (
                <article key={rule.title} className={`bg-white p-6 sm:p-7 ${index === rules.length - 1 ? "sm:col-span-2 lg:col-span-1" : ""}`}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <RuleIcon type={rule.icon} />
                  </div>
                  <h3 className="mt-5 text-lg font-black text-slate-950">{rule.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{rule.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {midJoinWait && (
          <section className="mx-auto w-full max-w-xl px-5 py-10 sm:px-8">
            <div className="rounded-3xl border border-blue-100 bg-blue-50 p-6 text-center">
              <p className="text-sm font-bold text-slate-950">En attente · salle <span className="font-mono text-blue-600">{midJoinWait.code}</span></p>
              <p className="mt-2 text-sm text-slate-600">L’hôte doit accepter votre demande.</p>
              <button type="button" onClick={onCancelMidJoin} className="mt-4 text-sm font-bold text-blue-700 underline underline-offset-4">Annuler</button>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500">
        <p><span className="font-bold text-slate-800">Chase GPS</span> · Jouez dehors, restez ensemble.</p>
      </footer>

      {showCreateDialog && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-slate-950/45 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="create-title">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <h2 id="create-title" className="text-xl font-black text-slate-950">Créer une partie</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">Choisissez votre pseudo. Il sera mémorisé pour vos prochaines parties.</p>
            <label htmlFor="create-name" className="mt-5 block text-sm font-bold text-slate-700">Pseudo</label>
            <input
              id="create-name"
              autoFocus
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base font-semibold text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Votre pseudo"
              value={nickname}
              onChange={(event) => {
                setNickname(event.target.value);
                setNicknameError(null);
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.nativeEvent.isComposing || event.keyCode === 229) return;
                event.preventDefault();
                onCreate();
              }}
              maxLength={24}
              autoComplete="nickname"
            />
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setShowCreateDialog(false)} className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">Retour</button>
              <button type="button" onClick={onCreate} className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700">Créer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
