import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";

function roleBadgeText(p) {
  if (p.spectator) return "Spectateur";
  if (p.role === "cat" && p.originalRole === "player") return "Chat (devenu chat)";
  if (p.role === "cat") return "Chat";
  if (p.role === "player" && p.originalRole === "cat") return "Joueur (ex-chat)";
  return "Joueur";
}

function formatLastSeen(timestamp) {
  if (!timestamp) return null;
  const diff = Date.now() - timestamp;
  if (diff < 15000) return "A l'instant";
  if (diff < 60000) return `Il y a ${Math.floor(diff / 1000)}s`;
  if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`;
  return new Date(timestamp).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PlayerSheet({ player, roomCode, onClose }) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = `${baseUrl}?code=${roomCode}`;

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
          text: `Code de partie : ${roomCode}`,
          url: shareUrl,
        });
      } catch {
        // user cancelled
      }
    } else {
      handleCopy();
    }
  };

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  if (!player) return null;

  const isCat = player.role === "cat";
  const isDisconnected = player.disconnected;
  const isCaptured = player.captured;
  const lastLocation = player.lastLocation;
  const lastSeen = formatLastSeen(lastLocation?.timestamp);
  const roleLabel = roleBadgeText(player);

  return (
    <div
      className="fixed inset-0 z-[2500] flex items-end justify-center bg-black/65"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Fiche joueur : ${player.nickname}`}
    >
      <div
        className="w-full max-w-lg animate-slide-up rounded-t-3xl bg-[var(--color-bg-elevated)] pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="h-1 w-10 rounded-full bg-[var(--color-border)]" />
        </div>

        <div className="px-5 pb-2">
          {/* ── Player identity ── */}
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
                isCat
                  ? "bg-orange-100 dark:bg-orange-950/60"
                  : "bg-sky-100 dark:bg-sky-950/60"
              }`}
            >
              {isCat ? (
                <svg
                  className="h-7 w-7 text-[var(--color-cat)]"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              ) : (
                <svg
                  className="h-7 w-7 text-[var(--color-player)]"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              )}
            </div>

            {/* Name + status badges */}
            <div className="flex-1 min-w-0">
              <h2 className="truncate text-xl font-bold text-[var(--color-text-primary)]">
                {player.nickname}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    isCat
                      ? "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300"
                      : "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300"
                  }`}
                >
                  {roleLabel}
                </span>
                {isDisconnected && (
                  <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/60 dark:text-red-300">
                    Deconnecte
                  </span>
                )}
                {isCaptured && (
                  <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    Capture
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── Last known location ── */}
          {lastLocation?.lat != null ? (
            <div className="mt-4 rounded-2xl bg-[var(--color-bg-sunken)] p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Derniere position connue
              </p>
              <div className="flex items-start gap-2">
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-brand)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <p className="font-mono text-sm font-medium text-[var(--color-text-primary)]">
                    {lastLocation.lat.toFixed(5)}, {lastLocation.lng.toFixed(5)}
                  </p>
                  {lastSeen && (
                    <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                      {lastSeen}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl bg-[var(--color-bg-sunken)] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Position non disponible
              </p>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Ce joueur n&apos;a pas encore envoye sa localisation.
              </p>
            </div>
          )}

          {/* ── Invite section ── */}
          <div className="mt-5 border-t border-[var(--color-border)] pt-4">
            <p className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">
              Inviter d&apos;autres joueurs
            </p>

            {/* Share URL chip */}
            <div className="mb-3 flex items-center gap-2 rounded-xl bg-[var(--color-bg-sunken)] px-3 py-2">
              <svg
                className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span className="flex-1 truncate font-mono text-xs text-[var(--color-text-secondary)]">
                {shareUrl}
              </span>
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={handleCopy}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--color-bg-sunken)] py-3 text-sm font-semibold text-[var(--color-text-primary)] active:opacity-75"
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
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--color-brand)] py-3 text-sm font-semibold text-white active:opacity-90"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Partager
              </button>
            </div>

            {/* QR toggle */}
            <button
              type="button"
              onClick={() => setShowQR((v) => !v)}
              className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] py-3 text-sm font-medium text-[var(--color-text-secondary)] active:opacity-70"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              {showQR ? "Masquer QR code" : "QR code pour rejoindre"}
            </button>

            {showQR && (
              <div className="mt-3 flex justify-center rounded-2xl bg-white p-5 shadow-inner">
                <QRCodeSVG
                  value={shareUrl}
                  size={176}
                  level="H"
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>
            )}

            <p className="mt-3 text-center text-xs text-[var(--color-text-muted)]">
              Code de partie:{" "}
              <span className="font-mono font-bold text-[var(--color-brand)]">
                {roomCode}
              </span>
            </p>
          </div>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="mt-4 w-full rounded-xl bg-[var(--color-bg-sunken)] py-3.5 text-base font-semibold text-[var(--color-text-primary)] active:opacity-70"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
