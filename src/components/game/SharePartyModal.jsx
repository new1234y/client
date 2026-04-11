import { QRCodeSVG } from "qrcode.react";
import { useCallback, useState } from "react";

export default function SharePartyModal({ code, title, onClose }) {
  const [copied, setCopied] = useState(false);
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

  if (!code) return null;

  return (
    <div
      className="fixed inset-0 z-[12000] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Partager la partie"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {title || "Inviter des joueurs"}
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Code et lien à partager avant le lancement.
        </p>

        <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="rounded-2xl bg-white p-3 ring-2 ring-indigo-100 dark:bg-slate-800 dark:ring-indigo-900">
            <QRCodeSVG value={joinUrl} size={168} level="M" />
          </div>
          <div className="w-full min-w-0 flex-1 text-center sm:text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Code salle
            </p>
            <p className="mt-1 break-all font-mono text-3xl font-black tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
              {code}
            </p>
            <button
              type="button"
              onClick={copy}
              className="mt-4 w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white sm:w-auto sm:px-6"
            >
              {copied ? "Copié !" : "Copier le lien"}
            </button>
            <p className="mt-2 break-all text-left text-xs text-slate-400">{joinUrl}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-200"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
