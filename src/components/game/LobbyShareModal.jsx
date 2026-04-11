import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export default function LobbyShareModal({ code, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!code) return null;

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = `${baseUrl}?code=${code}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const el = document.createElement("input");
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Rejoins ma partie Chase GPS",
          text: `Code de partie : ${code}`,
          url: shareUrl,
        });
      } catch {
        // user cancelled
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2200] flex items-end justify-center bg-black/70 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Partager la partie"
      onClick={onClose}
    >
      <div
        className="animate-slide-up w-full max-w-sm rounded-t-3xl bg-[var(--color-bg-elevated)] pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="h-1 w-10 rounded-full bg-[var(--color-border)]" />
        </div>

        <div className="px-5 pb-2">
          {/* Header */}
          <div className="mb-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
              Code de la partie
            </p>
            <p className="mt-1 font-mono text-5xl font-black tracking-[0.22em] text-[var(--color-brand)]">
              {code}
            </p>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Partagez ce code pour inviter des joueurs
            </p>
          </div>

          {/* QR code — always white background for scanner reliability */}
          <div className="mb-5 flex justify-center rounded-2xl bg-white p-5 shadow-inner">
            <QRCodeSVG
              value={shareUrl}
              size={190}
              level="H"
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>

          {/* URL preview */}
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-[var(--color-bg-sunken)] px-3 py-2.5">
            <svg className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <p className="flex-1 truncate font-mono text-xs text-[var(--color-text-secondary)]">
              {shareUrl}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={handleCopy}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--color-bg-sunken)] py-3.5 text-sm font-semibold text-[var(--color-text-primary)] active:opacity-80"
            >
              {copied ? (
                <>
                  <svg className="h-4 w-4 text-[var(--color-success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Copie !
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copier
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--color-brand)] py-3.5 text-sm font-semibold text-white active:opacity-90"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Partager
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-3 w-full rounded-xl py-3 text-sm font-medium text-[var(--color-text-muted)] active:opacity-70"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
