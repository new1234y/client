import { useEffect, useRef, useState } from "react";
import BrandMark from "./ui/BrandMark.jsx";
import GlassHeader from "./ui/GlassHeader.jsx";

const powers = [
  { name: "Invisibilité", code: "01", color: "blue", description: "Masquez temporairement votre position. Le Chat perd votre trace pendant quelques secondes : idéal pour changer de direction ou quitter une zone dangereuse.", stat: "Position masquée", duration: "20 s" },
  { name: "Bruit fantôme", code: "02", color: "amber", description: "Créez un faux signal GPS ailleurs sur la carte. Le Chat voit un leurre crédible et doit choisir quelle piste suivre.", stat: "Fausse piste", duration: "30 s" },
  { name: "Immobilisation", code: "03", color: "blue", description: "Bloquez brièvement un adversaire à portée. Une fenêtre courte, mais suffisante pour gagner du terrain ou préparer une capture.", stat: "Cible ralentie", duration: "10 s" },
  { name: "Position exacte", code: "04", color: "amber", description: "Révélez précisément la position d'une cible. Le brouillard disparaît et le marqueur s'affiche en direct sur la carte.", stat: "Radar précis", duration: "15 s" },
  { name: "Balise-leurre", code: "05", color: "blue", description: "Posez une balise trompeuse dans la zone. Elle attire les poursuivants et ouvre un nouvel itinéraire à votre équipe.", stat: "Leurre posé", duration: "45 s" },
];

function Icon({ name, className = "h-5 w-5" }) {
  const paths = {
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
    moon: <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.6 6.6 0 0 0 21 12.8Z"/>,
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    users: <><circle cx="8" cy="8" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M2.5 20c.5-4 2.3-6 5.5-6s5 2 5.5 6M14 19c.4-2.8 1.5-4.2 3.5-4.2 2.1 0 3.4 1.5 4 4.2"/></>,
    scan: <><path d="M4 8V4h4m8 0h4v4M4 16v4h4m8 0h4v-4"/><path d="M7 12h10"/></>,
    bolt: <path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z"/>,
    coin: <><circle cx="12" cy="12" r="8"/><path d="M14.5 8.5c-.6-.7-1.5-1-2.5-1-1.7 0-3 1-3 2.4 0 3.6 6 1.4 6 4.6 0 1.3-1.2 2.3-3 2.3-1.2 0-2.2-.4-3-1.2M12 5.5v13"/></>,
    target: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/></>,
  };
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Reveal({ children, className = "" }) {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { node.classList.add("is-visible"); observer.unobserve(node); }
    }, { threshold: 0.14 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={`landing-reveal ${className}`}>{children}</div>;
}

function PlayerMarker({ role, label, className = "" }) {
  const cat = role === "chat";
  return (
    <div className={`flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 ${className}`}>
      <span className={`relative flex h-11 w-11 items-center justify-center rounded-full ${cat ? "bg-blue-600" : "bg-amber-500"}`}>
        <span className={`absolute inset-0 rounded-full border-2 ${cat ? "border-blue-400" : "border-amber-300"} landing-marker-pulse`} />
        <Icon name={cat ? "target" : "arrow"} className="h-5 w-5 text-white" />
      </span>
      <span><span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">{role}</span><span className="text-sm font-black text-slate-950 dark:text-white">{label}</span></span>
    </div>
  );
}

function MapPreview({ zone = false }) {
  return (
    <div className="dot-map relative min-h-[360px] overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-100 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
      <div className="absolute left-[12%] top-[18%] h-1 w-[76%] rotate-12 bg-slate-300 dark:bg-slate-700" />
      <div className="absolute left-[42%] top-[-10%] h-[120%] w-1 -rotate-12 bg-slate-300 dark:bg-slate-700" />
      <div className="absolute left-[5%] top-[64%] h-1 w-[90%] -rotate-6 bg-slate-300 dark:bg-slate-700" />
      {zone && <><div className="landing-zone absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-blue-500/70 bg-blue-500/5"/><div className="absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-blue-500/80" /></>}
      <PlayerMarker role="chat" label="Chasseur" className="absolute left-[10%] top-[22%]" />
      <PlayerMarker role="souris" label="À 180 m" className="absolute bottom-[15%] right-[8%]" />
      <div className="landing-route absolute left-[35%] top-[45%] h-px w-[34%] rotate-[24deg] border-t-2 border-dashed border-blue-500" />
    </div>
  );
}

function SectionIntro({ eyebrow, title, text }) {
  return <div className="max-w-xl"><p className="text-xs font-black uppercase tracking-[0.24em] text-blue-600 dark:text-blue-400">{eyebrow}</p><h2 className="mt-4 text-balance text-4xl font-black leading-tight tracking-[-0.035em] text-slate-950 dark:text-white sm:text-5xl lg:text-6xl">{title}</h2><p className="mt-5 text-pretty text-base leading-relaxed text-slate-600 dark:text-slate-300 sm:text-lg">{text}</p></div>;
}


function CreatePartyDialog({ nickname, setNickname, nicknameError, setNicknameError, onCreate, onClose }) {
  const [viewport, setViewport] = useState(null);
  useEffect(() => {
    const sync = () => {
      const vv = window.visualViewport;
      setViewport(
        vv
          ? { top: vv.offsetTop, left: vv.offsetLeft, width: vv.width, height: vv.height }
          : { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight }
      );
    };
    sync();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", sync);
    vv?.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    return () => {
      vv?.removeEventListener("resize", sync);
      vv?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  const overlayStyle = viewport
    ? { position: "fixed", top: viewport.top, left: viewport.left, width: viewport.width, height: viewport.height }
    : { position: "fixed", inset: 0 };

  return (
    <div
      className="sheet-overlay z-[5000] flex items-center justify-center overflow-hidden bg-slate-950/55 p-4 backdrop-blur-sm"
      style={overlayStyle}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-title"
    >
      <div className="sheet-panel min-h-0 w-full max-w-sm max-h-[calc(100%-2rem)] overflow-y-auto overscroll-contain rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <h2 id="create-title" className="text-xl font-black">Créer une partie</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Choisissez votre pseudo. Il sera mémorisé pour les prochaines parties.
        </p>
        <label htmlFor="create-name" className="mt-5 block text-sm font-bold">Pseudo</label>
        <input
          id="create-name"
          autoFocus
          className={`mt-2 w-full rounded-2xl border bg-white px-4 py-3.5 font-semibold outline-none focus:border-blue-500 dark:bg-slate-950 ${nicknameError ? "border-red-500 ring-2 ring-red-200" : "border-slate-200 dark:border-slate-700"}`}
          placeholder="Votre pseudo"
          value={nickname}
          onChange={(e) => { setNickname(e.target.value); setNicknameError(null); }}
          onKeyDown={(e) => {
            if (e.key !== "Enter" || e.nativeEvent.isComposing || e.keyCode === 229) return;
            e.preventDefault();
            onCreate();
          }}
          maxLength={24}
        />
        {nicknameError && <p className="mt-2 text-sm font-bold text-red-600">{nicknameError}</p>}
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold dark:border-slate-700">Retour</button>
          <button type="button" onClick={onCreate} className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white">Créer</button>
        </div>
      </div>
    </div>
  );
}

export default function HomePage({ connected, nickname, setNickname, nicknameError, setNicknameError, roomCodeInput, setRoomCodeInput, entryBusyKind, errorBanner, onCreate, onJoin, onCancel, onOpenSettings, midJoinWait, onCancelMidJoin }) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [powerIndex, setPowerIndex] = useState(0);
  const [carouselPaused, setCarouselPaused] = useState(false);
  const touchStart = useRef(null);

  const handleCreate = () => nickname.trim() ? onCreate() : setShowCreateDialog(true);
  const changePower = (direction) => setPowerIndex((current) => (current + direction + powers.length) % powers.length);
  useEffect(() => {
    if (carouselPaused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const timer = window.setInterval(() => changePower(1), 4500);
    return () => window.clearInterval(timer);
  }, [carouselPaused]);
  const handleJoinKeyDown = (event) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing || event.keyCode === 229 || entryBusyKind) return;
    event.preventDefault(); onJoin();
  };

  return (
    <div className="min-h-full overflow-x-hidden bg-white font-sans text-slate-950 transition-colors dark:bg-slate-950 dark:text-white">
      <GlassHeader variant="fixed">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
          <a href="#top" aria-label="Chase GPS, accueil"><BrandMark /></a>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-500 dark:text-slate-400 lg:flex" aria-label="Navigation principale"><a className="hover:text-blue-600" href="#roles">Rôles</a><a className="hover:text-blue-600" href="#zone">Zone</a><a className="hover:text-blue-600" href="#capture">Capture</a><a className="hover:text-blue-600" href="#powers">Pouvoirs</a></nav>
          <div className="flex items-center gap-2"><span className="hidden items-center gap-2 text-xs font-bold text-slate-500 sm:flex"><span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "animate-pulse bg-amber-500"}`}/>{connected ? "En ligne" : "Connexion"}</span><button type="button" onClick={onOpenSettings} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" aria-label="Paramètres"><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg></button><button type="button" onClick={handleCreate} disabled={Boolean(entryBusyKind)} className="rounded-full bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60 sm:px-5">{entryBusyKind === "create" ? "Création…" : "Créer une partie"}</button></div>
        </div>
      </GlassHeader>

      <main id="top">
        <section className="landing-dots flex min-h-screen items-center pt-24">
          <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:px-10">
            <Reveal><p className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-black uppercase tracking-widest text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300"><span className="h-2 w-2 animate-pulse rounded-full bg-blue-600"/>La chasse commence dehors</p><h1 className="mt-6 text-balance text-5xl font-black leading-[.97] tracking-[-0.05em] sm:text-6xl lg:text-7xl">La ville devient votre <span className="text-blue-600 dark:text-blue-400">terrain de jeu.</span></h1><p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">Un jeu de poursuite GPS grandeur nature. Créez une salle, recevez votre rôle et transformez chaque rue en décision tactique.</p>
              <div className="mt-8 max-w-xl rounded-3xl border border-slate-200 bg-slate-50/90 p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900/90"><div className="flex flex-col gap-3 sm:flex-row"><label htmlFor="room-code" className="sr-only">Code de la partie</label><input id="room-code" className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-5 py-4 font-mono font-bold uppercase tracking-[.2em] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-950 dark:text-white" placeholder="Code de la partie" value={roomCodeInput} onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())} onKeyDown={handleJoinKeyDown} maxLength={8} disabled={Boolean(entryBusyKind)}/><button type="button" onClick={onJoin} disabled={Boolean(entryBusyKind)} className="rounded-2xl bg-slate-950 px-7 py-4 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-700">{entryBusyKind === "join" ? "Connexion…" : "Rejoindre"}</button></div><label htmlFor="player-name" className="mt-3 block text-xs font-bold text-slate-500">Votre pseudo</label><input id="player-name" className={`mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm font-semibold outline-none dark:bg-slate-950 ${nicknameError ? "border-red-500 ring-2 ring-red-200 dark:ring-red-900" : "border-slate-200 dark:border-slate-700"}`} placeholder="Ex. Camille" value={nickname} onChange={(e) => { setNickname(e.target.value); setNicknameError(null); }} onKeyDown={handleJoinKeyDown} maxLength={24}/>{nicknameError && <p className="mt-2 text-sm font-bold text-red-600 dark:text-red-400">{nicknameError}</p>}</div>
              {errorBanner && <div role="alert" className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">{errorBanner}</div>}{entryBusyKind && <button type="button" onClick={onCancel} className="mt-3 text-sm font-bold underline">Annuler</button>}
            </Reveal><Reveal className="[transition-delay:150ms]"><MapPreview/></Reveal>
          </div>
        </section>

        <section id="preparation" className="landing-dots-muted flex min-h-screen items-center border-y border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto grid w-full max-w-7xl items-center gap-14 px-5 py-24 sm:px-8 lg:grid-cols-2 lg:px-10"><Reveal><SectionIntro eyebrow="01 — Préparer la partie" title="Une salle. Un code. Toute l'équipe." text="L'hôte crée une partie et règle sa durée, le rayon de départ et les options. Un code unique apparaît : les autres joueurs le saisissent, choisissent leur pseudo et rejoignent le lobby en direct."/><ol className="mt-8 flex flex-col gap-4">{["Créez et configurez la salle", "Partagez le code à votre groupe", "Lancez : les rôles sont distribués"].map((x,i)=><li key={x} className="flex items-center gap-4"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 font-mono text-xs font-black text-white">{i+1}</span><span className="font-bold text-slate-700 dark:text-slate-200">{x}</span></li>)}</ol></Reveal><Reveal className="[transition-delay:150ms]"><div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-950"><div className="flex items-center justify-between"><span className="text-xs font-black uppercase tracking-widest text-slate-400">Lobby en direct</span><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">4 joueurs</span></div><div className="my-8 text-center"><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Code de salle</p><p className="mt-2 font-mono text-5xl font-black tracking-[.18em] text-blue-600">H7K2</p></div><div className="grid grid-cols-2 gap-3">{["Camille","Noa","Lina","Sacha"].map((name,i)=><div key={name} className="landing-float flex items-center gap-3 rounded-2xl bg-slate-100 p-3 dark:bg-slate-900" style={{animationDelay:`${i*180}ms`}}><span className={`h-9 w-9 rounded-full ${i===0?"bg-blue-600":"bg-slate-300 dark:bg-slate-700"}`}/><span className="font-bold">{name}</span></div>)}</div></div></Reveal></div>
        </section>

        <section id="roles" className="landing-dots flex min-h-screen items-center"><div className="mx-auto w-full max-w-7xl px-5 py-24 sm:px-8 lg:px-10"><Reveal><SectionIntro eyebrow="02 — Chat contre Souris" title="Deux rôles. Deux façons de lire la ville." text="Au lancement, le jeu attribue secrètement les rôles. Les Chats organisent la traque ; les Souris survivent jusqu'à la fin du chrono."/></Reveal><div className="mt-12 grid gap-6 lg:grid-cols-2"><Reveal><article className="group min-h-[360px] rounded-[2rem] border border-blue-200 bg-blue-50 p-8 transition-transform hover:-translate-y-2 dark:border-blue-900 dark:bg-blue-950/40"><PlayerMarker role="chat" label="Le poursuivant"/><h3 className="mt-10 text-3xl font-black">Le Chat réduit la distance.</h3><p className="mt-4 leading-relaxed text-slate-600 dark:text-slate-300">Il suit les indices GPS, anticipe les itinéraires et doit s'approcher assez près pour scanner le QR de sa cible. Une capture réussie change immédiatement l'équilibre de la partie.</p><p className="mt-6 text-sm font-black text-blue-700 dark:text-blue-300">Objectif : capturer toutes les Souris avant le chrono.</p></article></Reveal><Reveal className="[transition-delay:120ms]"><article className="group min-h-[360px] rounded-[2rem] border border-amber-200 bg-amber-50 p-8 transition-transform hover:-translate-y-2 dark:border-amber-900 dark:bg-amber-950/30"><PlayerMarker role="souris" label="La cible mobile"/><h3 className="mt-10 text-3xl font-black">La Souris brouille la piste.</h3><p className="mt-4 leading-relaxed text-slate-600 dark:text-slate-300">Elle reste dans la zone, surveille le radar et utilise ses pouvoirs pour semer le doute. Courir droit ne suffit pas : les meilleurs détours sont ceux que le Chat ne prévoit pas.</p><p className="mt-6 text-sm font-black text-amber-700 dark:text-amber-300">Objectif : rester libre jusqu'à la dernière seconde.</p></article></Reveal></div></div></section>

        <section id="zone" className="landing-dots-muted flex min-h-screen items-center border-y border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"><div className="mx-auto grid w-full max-w-7xl items-center gap-14 px-5 py-24 sm:px-8 lg:grid-cols-2 lg:px-10"><Reveal className="lg:order-2"><SectionIntro eyebrow="03 — Zone dynamique" title="Le terrain se resserre. Vos choix aussi." text="La partie commence dans un large rayon. À chaque phase, le cercle bleu se contracte et force les joueurs à se rapprocher. Une alerte prévient avant chaque réduction : restez dehors trop longtemps et votre position devient dangereusement prévisible."/><div className="mt-8 grid grid-cols-3 gap-3 text-center">{[["Phase 1","800 m"],["Phase 2","500 m"],["Finale","250 m"]].map(([a,b])=><div key={a} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950"><p className="text-xs font-bold text-slate-400">{a}</p><p className="mt-1 text-xl font-black text-blue-600">{b}</p></div>)}</div></Reveal><Reveal className="lg:order-1"><MapPreview zone/></Reveal></div></section>

        <section id="capture" className="landing-dots flex min-h-screen items-center"><div className="mx-auto grid w-full max-w-7xl items-center gap-14 px-5 py-24 sm:px-8 lg:grid-cols-2 lg:px-10"><Reveal><SectionIntro eyebrow="04 — Capture QR et balises" title="Approchez. Cadrez. Capturez." text="Une capture ne se fait pas à distance. Le Chat doit rejoindre physiquement sa cible et ouvrir le scanner. Le QR personnel de la Souris valide la rencontre et enregistre la capture sans ambiguïté."/><div className="mt-8 flex flex-col gap-3">{["Entrez dans la distance de capture", "Ouvrez le scanner depuis la carte", "Cadrez le QR : la capture est validée"].map((x,i)=><div key={x} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><span className="font-mono text-sm font-black text-blue-600">0{i+1}</span><span className="font-semibold">{x}</span></div>)}</div></Reveal><Reveal className="[transition-delay:150ms]"><div className="relative mx-auto aspect-[4/5] max-w-sm overflow-hidden rounded-[2.5rem] border-8 border-slate-900 bg-slate-950 p-8 shadow-2xl"><div className="absolute inset-8"><span className="absolute left-0 top-0 h-16 w-16 border-l-4 border-t-4 border-blue-400"/><span className="absolute right-0 top-0 h-16 w-16 border-r-4 border-t-4 border-blue-400"/><span className="absolute bottom-0 left-0 h-16 w-16 border-b-4 border-l-4 border-blue-400"/><span className="absolute bottom-0 right-0 h-16 w-16 border-b-4 border-r-4 border-blue-400"/><div className="landing-scan-line absolute inset-x-3 top-1/2 h-0.5 bg-blue-400 shadow-[0_0_16px_#60a5fa]"/><div className="absolute left-1/2 top-1/2 grid h-40 w-40 -translate-x-1/2 -translate-y-1/2 grid-cols-5 gap-2 rounded-xl bg-white p-5">{Array.from({length:25}).map((_,i)=><span key={i} className={`${[0,1,4,5,6,8,10,12,14,16,18,19,20,22,24].includes(i)?"bg-slate-950":"bg-white"}`}/>)}</div></div><div className="absolute inset-x-0 bottom-4 text-center text-xs font-black uppercase tracking-widest text-white">Recherche d'une balise…</div></div></Reveal></div></section>

        <section id="powers" className="landing-dots-muted flex min-h-screen items-center border-y border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"><div className="mx-auto w-full max-w-7xl px-5 py-24 sm:px-8 lg:px-10"><Reveal><SectionIntro eyebrow="05 — Pouvoirs spéciaux" title="Retournez la partie au bon moment." text="Les pouvoirs s'achètent avec les pièces gagnées en jeu. Ils sont courts, lisibles et conçus pour créer un choix tactique — jamais une victoire automatique."/></Reveal><Reveal className="mt-12"><div className="overflow-hidden" onMouseEnter={()=>setCarouselPaused(true)} onMouseLeave={()=>setCarouselPaused(false)} onFocus={()=>setCarouselPaused(true)} onBlur={()=>setCarouselPaused(false)} onTouchStart={(e)=>{touchStart.current=e.touches[0].clientX}} onTouchEnd={(e)=>{if(touchStart.current===null)return;const d=e.changedTouches[0].clientX-touchStart.current;if(Math.abs(d)>45)changePower(d>0?-1:1);touchStart.current=null}}><div className="grid items-center gap-8 lg:grid-cols-[.75fr_1.25fr]"><div className="relative mx-auto flex aspect-square w-full max-w-sm items-center justify-center rounded-full border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950"><div className="landing-radar absolute inset-8 rounded-full border border-dashed border-blue-300 dark:border-blue-800"/><div className="absolute inset-20 rounded-full border border-slate-200 dark:border-slate-800"/><div key={powers[powerIndex].name} className={`landing-power-symbol relative flex h-28 w-28 items-center justify-center rounded-3xl ${powers[powerIndex].color === "blue" ? "bg-blue-600" : "bg-amber-500"} text-white shadow-2xl`}><Icon name="bolt" className="h-12 w-12"/></div></div><article key={powers[powerIndex].code} className="landing-slide rounded-[2rem] border border-slate-200 bg-white p-7 shadow-xl dark:border-slate-700 dark:bg-slate-950 sm:p-10"><div className="flex items-start justify-between"><span className="font-mono text-sm font-black text-blue-600">POUVOIR {powers[powerIndex].code} / 05</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold dark:bg-slate-800">{powers[powerIndex].duration}</span></div><h3 className="mt-8 text-4xl font-black tracking-tight sm:text-5xl">{powers[powerIndex].name}</h3><p className="mt-5 text-lg leading-relaxed text-slate-600 dark:text-slate-300">{powers[powerIndex].description}</p><div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6 dark:border-slate-800"><span className="text-sm font-black text-blue-600">{powers[powerIndex].stat}</span><div className="flex gap-2"><button type="button" onClick={()=>changePower(-1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800" aria-label="Pouvoir précédent"><Icon name="arrow" className="h-5 w-5 rotate-180"/></button><button type="button" onClick={()=>changePower(1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700" aria-label="Pouvoir suivant"><Icon name="arrow"/></button></div></div></article></div><div className="mt-8 flex justify-center gap-2" role="tablist" aria-label="Choisir un pouvoir">{powers.map((power,index)=><button key={power.name} type="button" onClick={()=>setPowerIndex(index)} className={`h-2.5 rounded-full transition-all ${index===powerIndex?"w-8 bg-blue-600":"w-2.5 bg-slate-300 dark:bg-slate-700"}`} aria-label={power.name} aria-selected={index===powerIndex}/>)}</div></div></Reveal></div></section>

        <section id="score" className="landing-dots flex min-h-screen items-center"><div className="mx-auto grid w-full max-w-7xl items-center gap-14 px-5 py-24 sm:px-8 lg:grid-cols-2 lg:px-10"><Reveal><SectionIntro eyebrow="06 — Pièces et score" title="Chaque action laisse une trace." text="Survivez, capturez, posez des balises et utilisez vos pouvoirs avec précision pour gagner des pièces. Le récapitulatif final révèle les captures, le temps de survie et le classement de chaque joueur."/><div className="mt-8 flex gap-3"><div className="rounded-2xl bg-amber-100 p-4 text-amber-800 dark:bg-amber-950 dark:text-amber-300"><Icon name="coin" className="h-7 w-7"/><p className="mt-3 text-2xl font-black">+250</p><p className="text-xs font-bold">Survie</p></div><div className="rounded-2xl bg-blue-100 p-4 text-blue-800 dark:bg-blue-950 dark:text-blue-300"><Icon name="target" className="h-7 w-7"/><p className="mt-3 text-2xl font-black">+400</p><p className="text-xs font-bold">Capture</p></div></div></Reveal><Reveal><div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"><p className="text-xs font-black uppercase tracking-widest text-slate-400">Classement final</p><div className="mt-10 flex items-end justify-center gap-3">{[["2","Lina","h-36","bg-slate-300"],["1","Camille","h-52","bg-blue-600"],["3","Noa","h-28","bg-amber-500"]].map(([rank,name,height,color])=><div key={rank} className="flex flex-1 flex-col items-center"><span className="mb-3 text-sm font-black">{name}</span><div className={`${height} ${color} landing-podium flex w-full items-start justify-center rounded-t-2xl pt-5 text-3xl font-black text-white`}>{rank}</div></div>)}</div><div className="flex items-center justify-between rounded-b-2xl bg-white p-5 dark:bg-slate-950"><span className="font-black">Partie terminée</span><span className="font-mono font-black text-amber-600">1 280 pièces</span></div></div></Reveal></div></section>

        <section className="relative overflow-hidden bg-blue-600 text-white"><div className="landing-dots-dark mx-auto flex min-h-[75vh] max-w-7xl flex-col items-center justify-center px-5 py-24 text-center sm:px-8"><Reveal><p className="text-xs font-black uppercase tracking-[.25em] text-blue-200">À vous de jouer</p><h2 className="mx-auto mt-5 max-w-4xl text-balance text-5xl font-black leading-none tracking-[-.045em] sm:text-7xl">La prochaine poursuite commence ici.</h2><p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-blue-100">Créez une salle en quelques secondes ou rejoignez votre groupe avec le code partagé.</p><div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row"><button type="button" onClick={handleCreate} className="rounded-full bg-white px-7 py-4 font-black text-blue-700 hover:bg-blue-50">Créer une partie</button><a href="#top" className="rounded-full border border-blue-300 px-7 py-4 font-black text-white hover:bg-blue-500">Saisir un code</a></div></Reveal></div></section>

        {midJoinWait && (() => {
          const status = midJoinWait.status || "waiting";
          const title =
            status === "denied" ? "Demande refusée" :
            status === "accepted" ? "Demande acceptée" :
            status === "host_disconnected" ? "Hôte déconnecté" :
            "En attente de l'hôte";
          const body =
            midJoinWait.message ||
            (status === "denied" ? "L'hôte a refusé votre demande." :
            status === "accepted" ? "Vous allez rejoindre la partie." :
            status === "host_disconnected" ? "L'hôte s'est déconnecté. En attente de sa reconnexion…" :
            "L'hôte doit accepter votre demande.");
          const tone =
            status === "denied" ? "border-red-200 dark:border-red-800" :
            status === "host_disconnected" ? "border-amber-200 dark:border-amber-800" :
            "border-blue-200 dark:border-blue-800";
          return (
            <section className={`fixed bottom-5 left-1/2 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border bg-white p-5 text-center shadow-2xl dark:bg-slate-900 ${tone}`}>
              <p className="font-bold">{title} · salle <span className="font-mono text-blue-600">{midJoinWait.code}</span></p>
              <p className="mt-1 text-sm text-slate-500">{body}</p>
              <button type="button" onClick={onCancelMidJoin} className="mt-3 text-sm font-bold text-blue-600 underline">{status === "waiting" || status === "host_disconnected" ? "Annuler" : "Fermer"}</button>
            </section>
          );
        })()}
      </main>

      <footer className="border-t border-slate-200 bg-white px-5 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950"><button type="button" onClick={onOpenSettings} className="font-bold text-slate-700 hover:text-blue-600 dark:text-slate-200">Réglages</button><span className="mx-3">·</span><span>Chase GPS — Jouez dehors.</span></footer>

      {showCreateDialog && (
        <CreatePartyDialog
          nickname={nickname}
          setNickname={setNickname}
          nicknameError={nicknameError}
          setNicknameError={setNicknameError}
          onCreate={onCreate}
          onClose={() => setShowCreateDialog(false)}
        />
      )}
    </div>
  );
}
