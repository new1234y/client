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
          title: 'Game Code',
          text: `Join my game with code: ${sessionId}`,
        });
      } catch (err) {
        console.log('Share failed or was cancelled', err);
      }
    }
  };

  const invitationUrl = `${window.location.origin}/?code=${sessionId}`;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/75 p-2 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Inviter à cette salle"
      onClick={onClose}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Inviter à cette salle</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Copier le lien ou le code ne vous déconnecte pas : vous restez dans la salle.
        </p>

        <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="rounded-2xl bg-white p-3 ring-2 ring-[#5B7FA5]/20 dark:bg-slate-800 dark:ring-[#5B7FA5]/30">
            <QRCodeSVG value={invitationUrl} size={168} level="M" />
          </div>

          <div className="w-full min-w-0 flex-1 text-center sm:text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Code salle</p>
            <p className="mt-1 break-all font-mono text-3xl font-black tracking-[0.2em] text-[#5B7FA5]">
              {sessionId}
            </p>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={handleShare}
                className="w-full rounded-2xl bg-[#5B7FA5] py-3 text-sm font-semibold text-white sm:w-auto sm:px-6 transition hover:bg-[#4A6A8A]"
              >
                Partager
              </button>
              <button
                type="button"
                onClick={handleCopyCode}
                className="w-full rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-800 dark:border-slate-600 dark:text-slate-200 sm:w-auto sm:px-5"
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
          className="mt-6 w-full rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-200"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
