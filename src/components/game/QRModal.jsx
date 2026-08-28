import { QRCodeSVG } from "qrcode.react";
import useAnimatedClose from "../../hooks/useAnimatedClose.js";

export default function QRModal({ sessionId, onClose }) {
  const { leaving, requestClose, onExitAnimationEnd } = useAnimatedClose(onClose);
  if (!sessionId) return null;
  const leave = leaving ? " is-leaving" : "";

  return (
    <div
      className={`sheet-overlay fixed inset-0 z-[2000] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-5${leave}`}
      role="dialog"
      aria-modal="true"
      aria-label="Votre QR de capture"
      onClick={requestClose}
      onAnimationEnd={onExitAnimationEnd}
    >
      <div className={`sheet-panel w-full max-w-md rounded-t-[2rem] border border-slate-200 bg-white p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:rounded-[2rem]${leave}`} onClick={(e) => e.stopPropagation()}>
        <h2 className="text-center text-xl font-black text-slate-950 dark:text-white">Votre QR de capture</h2>
        <p className="mt-2 text-center text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Le Chat doit cadrer ce code pour valider la rencontre.
        </p>
        <div className="mt-6 flex justify-center">
          <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
            <QRCodeSVG value={sessionId} size={260} level="M" />
          </div>
        </div>
        <button
          type="button"
          onClick={requestClose}
          className="mt-6 flex min-h-11 w-full items-center justify-center rounded-full border border-slate-200 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
