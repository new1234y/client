import { QRCodeSVG } from "qrcode.react";

export default function ShareQRModal({ sessionId, onClose }) {
  if (!sessionId) return null;

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/?code=${sessionId}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(sessionId);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Code de partie',
          text: `Rejoins ma partie avec le code : ${sessionId}`,
        });
      } catch (err) {
        console.log('Share failed or was cancelled', err);
      }
    } else {
      handleCopyLink();
    }
  };

  const invitationUrl = `${window.location.origin}/?code=${sessionId}`;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/60 p-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Inviter à cette salle"
      onClick={onClose}
    >
      <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-black text-slate-950 dark:text-white">Inviter à cette salle</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Copier le lien ou le code ne vous déconnecte pas : vous restez dans la salle.
        </p>

        <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-600">
            <QRCodeSVG value={invitationUrl} size={168} level="M" />
          </div>

          <div className="w-full min-w-0 flex-1 text-center sm:text-left">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Code salle</p>
            <p className="mt-1 break-all font-mono text-3xl font-black tracking-[0.18em] text-blue-600">
              {sessionId}
            </p>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={handleShare}
                className="min-h-11 w-full rounded-full bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 sm:w-auto sm:px-6"
              >
                Partager
              </button>
              <button
                type="button"
                onClick={handleCopyCode}
                className="min-h-11 w-full rounded-full border border-slate-200 py-3 text-sm font-bold text-slate-800 dark:border-slate-600 dark:text-slate-200 sm:w-auto sm:px-5"
              >
                Copier le code seul
              </button>
            </div>

            <p className="mt-3 text-left text-[11px] leading-snug text-slate-400 dark:text-slate-500">
              Partagez par message ou autre appli : aucune action ici ne ferme votre session sur cet appareil.
            </p>
            <p className="mt-1 break-all text-left text-xs text-slate-400">
              {invitationUrl}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 flex min-h-11 w-full items-center justify-center rounded-full border border-slate-200 py-3 text-sm font-bold text-slate-700 dark:border-slate-600 dark:text-slate-200"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
