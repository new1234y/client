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
  if (!timestamp) return "Inconnue";
  const diff = Date.now() - timestamp;
  if (diff < 60000) return "Il y a quelques secondes";
  if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`;
  return new Date(timestamp).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PlayerSheet({ player, roomCode, onClose }) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // Build share URL with room code
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = `${baseUrl}?code=${roomCode}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input");
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Rejoins ma partie Chase GPS",
          text: `Rejoins ma partie avec le code ${roomCode}`,
          url: shareUrl,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      handleCopyLink();
    }
  };

  useEffect(() => {
    // Prevent scroll on body when sheet is open
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (!player) return null;

  const roleColor = player.role === "cat" 
    ? "text-brand-red" 
    : "text-brand-blue";

  const isDisconnected = player.disconnected;
  const lastLocation = player.lastLocation;

  return (
    <div
      className="fixed inset-0 z-[2500] flex items-end justify-center bg-black/60"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg animate-slide-up rounded-t-2xl bg-[var(--color-bg)] pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-card-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center py-3">
          <div className="h-1 w-10 rounded-full bg-[var(--color-border)]" />
        </div>

        <div className="px-5 pb-4">
          {/* Player info */}
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--color-bg-overlay)] text-2xl">
              {player.role === "cat" ? (
                <svg className="h-7 w-7 text-brand-red" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              ) : (
                <svg className="h-7 w-7 text-brand-blue" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-[var(--color-text)]">
                {player.nickname}
              </h2>
              <p className={`text-sm font-medium ${roleColor}`}>
                {roleBadgeText(player)}
              </p>
              {isDisconnected && (
                <p className="mt-1 text-xs text-brand-red">
                  Deconnecte
                </p>
              )}
            </div>
          </div>

          {/* Last location */}
          {lastLocation && (
            <div className="mt-4 rounded-lg bg-[var(--color-bg-overlay)] p-4">
              <p className="text-xs font-medium uppercase text-[var(--color-text-faint)]">
                Derniere position connue
              </p>
              <p className="mt-1 text-sm text-[var(--color-text)]">
                {lastLocation.lat?.toFixed(5)}, {lastLocation.lng?.toFixed(5)}
              </p>
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                {formatLastSeen(lastLocation.timestamp)}
              </p>
            </div>
          )}

          {/* Share section */}
          <div className="mt-5 border-t border-[var(--color-border)] pt-5">
            <p className="mb-3 text-sm font-medium text-[var(--color-text)]">
              Inviter des joueurs
            </p>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--color-bg-overlay)] px-4 py-3 text-sm font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border)] active:bg-[var(--color-border)]"
              >
                {copied ? (
                  <>
                    <svg className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copie
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copier lien
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={handleShare}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-blue px-4 py-3 text-sm font-bold text-white active:opacity-90"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Partager
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowQR(!showQR)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-sm font-medium text-[var(--color-text)]"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              {showQR ? "Masquer QR code" : "Afficher QR code"}
            </button>

            {showQR && (
              <div className="mt-4 flex justify-center rounded-lg bg-white p-6 shadow-inner">
                <QRCodeSVG 
                  value={shareUrl} 
                  size={180} 
                  level="H"
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>
            )}

            <p className="mt-3 text-center text-xs text-[var(--color-text-muted)]">
              Code de partie: <span className="font-mono font-bold text-brand-blue">{roomCode}</span>
            </p>
          </div>
        </div>

        <div className="px-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-[var(--color-bg-overlay)] py-3.5 text-base font-semibold text-[var(--color-text)] active:bg-[var(--color-border)]"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
