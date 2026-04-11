import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

function formatDate(isoString) {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(ms) {
  if (!ms || ms <= 0) return "—";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m === 0) return `${s}s`;
  return `${m}m${s > 0 ? ` ${s}s` : ""}`;
}

function HistoryShareSheet({ game, onClose }) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = `${baseUrl}?code=${game.code}`;

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
          title: `Partie Chase GPS ${game.code}`,
          text: `Regarde les details de cette partie avec le code ${game.code}`,
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
      className="fixed inset-0 z-[2500] flex items-end justify-center bg-black/70"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="animate-slide-up w-full max-w-sm rounded-t-3xl bg-[var(--color-bg-elevated)] pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center py-3">
          <div className="h-1 w-10 rounded-full bg-[var(--color-border)]" />
        </div>

        <div className="px-5 pb-2">
          <h2 className="mb-1 text-lg font-bold text-[var(--color-text-primary)]">
            Partager cette partie
          </h2>
          <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
            Code{" "}
            <span className="font-mono font-bold text-[var(--color-brand)]">
              {game.code}
            </span>{" "}
            &mdash; {formatDate(game.date)}
          </p>

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
            onClick={() => setShowQR((v) => !v)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] py-3 text-sm font-medium text-[var(--color-text-secondary)] active:opacity-70"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            {showQR ? "Masquer le QR code" : "Afficher le QR code"}
          </button>

          {showQR && (
            <div className="mt-3 flex justify-center rounded-2xl bg-white p-5 shadow-inner">
              <QRCodeSVG
                value={shareUrl}
                size={180}
                level="H"
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
          )}

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

export default function GameHistoryPage({ history, onClose, onJoinGame }) {
  const [shareGame, setShareGame] = useState(null);

  return (
    <div className="flex min-h-full flex-col bg-[var(--color-bg)]">
      {/* Header */}
      <header className="flex shrink-0 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-bg-sunken)] text-[var(--color-text-primary)] active:opacity-70"
          aria-label="Retour"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-lg font-bold text-[var(--color-text-primary)]">
            Historique des parties
          </h1>
          <p className="text-xs text-[var(--color-text-muted)]">
            {history.length} partie{history.length !== 1 ? "s" : ""} enregistree{history.length !== 1 ? "s" : ""}
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {history.length === 0 ? (
          <div className="mt-20 flex flex-col items-center gap-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-bg-sunken)]">
              <svg className="h-8 w-8 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="font-medium text-[var(--color-text-primary)]">Aucune partie jouee</p>
            <p className="text-sm text-[var(--color-text-muted)]">
              Vos parties terminees apparaitront ici.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {history.map((game) => (
              <li
                key={game.id}
                className="rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)]"
              >
                {/* Card top */}
                <div className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xl font-black tracking-wider text-[var(--color-brand)]">
                        {game.code}
                      </span>
                      {game.winner && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            game.winner === "cats"
                              ? "bg-[var(--color-accent-dim)] text-[var(--color-accent)]"
                              : "bg-[var(--color-brand-dim)] text-[var(--color-brand)]"
                          }`}
                        >
                          {game.winner === "cats" ? "Chats gagnent" : "Joueurs gagnent"}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                      {formatDate(game.date)}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
                      <span className="flex items-center gap-1">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {game.players} joueur{game.players !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatDuration(game.duration)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card actions */}
                <div className="flex gap-2 border-t border-[var(--color-border)] px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setShareGame(game)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--color-bg-sunken)] py-2.5 text-xs font-semibold text-[var(--color-text-primary)] active:opacity-70"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Partager
                  </button>
                  <button
                    type="button"
                    onClick={() => onJoinGame(game.code)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--color-brand)] py-2.5 text-xs font-semibold text-white active:opacity-90"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Rejoindre
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Share sheet */}
      {shareGame && (
        <HistoryShareSheet game={shareGame} onClose={() => setShareGame(null)} />
      )}
    </div>
  );
}
