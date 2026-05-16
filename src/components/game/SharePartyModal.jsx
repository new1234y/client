import { QRCodeSVG } from "qrcode.react";
import { useCallback, useState } from "react";

export default function SharePartyModal({ code, title, onClose }) {
 const [copied, setCopied] = useState(false);
 const [copiedCode, setCopiedCode] = useState(false);
 const joinUrl =
  typeof window !== "undefined"
   ? `${window.location.origin}${window.location.pathname}?code=${encodeURIComponent(code || "")}`
   : "";

 const copy = useCallback(async () => {
  try {
   await navigator.clipboard.writeText(joinUrl);
   setCopied(true);
   setTimeout(() => setCopied(false), 2000);
  } catch {
   setCopied(false);
  }
 }, [joinUrl]);

 const copyCodeOnly = useCallback(async () => {
  try {
   await navigator.clipboard.writeText(code || "");
   setCopiedCode(true);
   setTimeout(() => setCopiedCode(false), 2000);
  } catch {
   setCopiedCode(false);
  }
 }, [code]);

 if (!code) return null;

 return (
  <div
   className="fixed inset-0 z-[12000] flex items-end justify-center bg-black/50 backdrop-blur-sm p-4 backdrop-blur-sm sm:items-center"
   role="dialog"
   aria-modal="true"
   aria-label="Partager la partie"
  >
   <div className="w-full max-w-md rounded-xlp-6 shadow-2xl ring-1 ring-cozy-border">
    <h2 className="text-lg font-bold text-cozy-text">
     {title || "Inviter des joueurs"}
    </h2>
    <p className="mt-1 text-sm text-cozy-text-muted">
     Copier le lien ou le code ne vous déconnecte pas : vous restez dans la salle.
    </p>

    <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
     <div className="rounded-xlp-3 ring-2 ring-cozy-primary/20">
      <QRCodeSVG value={joinUrl} size={168} level="M" />
     </div>
     <div className="w-full min-w-0 flex-1 text-center sm:text-left">
      <p className="text-xs font-semibold uppercase tracking-wider text-cozy-text-muted">Code salle</p>
      <p className="mt-1 break-all font-mono text-3xl font-black tracking-[0.2em] text-cozy-primary">
       {code}
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
       <button
        type="button"
        onClick={copy}
        className="w-full rounded-lg bg-cozy-primary py-3 text-sm font-semibold text-cozy-bg sm:w-auto sm:px-6"
       >
        {copied ? "Lien copié" : "Copier le lien d’invitation"}
       </button>
       <button
        type="button"
        onClick={copyCodeOnly}
        className="w-full rounded-lg border border-cozy-border py-3 text-sm font-semibold text-cozy-text sm:w-auto sm:px-5"
       >
        {copiedCode ? "Code copié" : "Copier le code seul"}
       </button>
      </div>
      <p className="mt-3 text-left text-[11px] leading-snug text-cozy-text-muted">
       Partagez par message ou autre appli : aucune action ici ne ferme votre session sur cet appareil.
      </p>
      <p className="mt-1 break-all text-left text-xs text-cozy-text-muted">{joinUrl}</p>
     </div>
    </div>

    <button
     type="button"
     onClick={onClose}
     className="mt-6 w-full rounded-lg border border-cozy-border py-3 text-sm font-semibold text-cozy-text-secondary"
    >
     Fermer
    </button>
   </div>
  </div>
 );
}
