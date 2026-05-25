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

export default function PlayerSheet({ player, roomCode, onClose, onShowLocation = null }) {
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

  const handleShowLocation = () => {
    if (onShowLocation && player?.lat != null && player?.lng != null) {
      onShowLocation(player.lat, player.lng);
      onClose();
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
    ? "text-[#C45454] dark:text-[#D47070]"
    : "text-[#5B7FA5] dark:text-[#7B9BB8]";

  const isDisconnected = player.disconnected;
  const hasLocation = player.lat != null && player.lng != null;

  return (
    <div
      className="fixed inset-0 z-[2500] flex items-end justify-center bg-black/60"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg animate-slide-up rounded-t-3xl bg-white pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center py-3">
          <div className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        <div className="px-5 pb-4">
          {/* Player info */}
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-2xl dark:bg-slate-800">
              {player.role === "cat" ? (
                <svg className="h-7 w-7 text-[#C45454]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              ) : (
                <svg className="h-7 w-7 text-[#5B7FA5]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {player.nickname}
              </h2>
              <p className={`text-sm font-medium ${roleColor}`}>
                {roleBadgeText(player)}
              </p>
              {player.coins !== undefined && (
                <div className="mt-1 flex items-center gap-1.5">
                  <svg className="h-4 w-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z"/>
                  </svg>
                  <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                    {player.coins}
                  </span>
                </div>
              )}
              <div className="mt-1 flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${isDisconnected ? "bg-red-500" : "bg-emerald-500"}`} />
                <p className={`text-xs ${isDisconnected ? "text-red-500 dark:text-red-400" : "text-emerald-500 dark:text-emerald-400"}`}>
                  {isDisconnected ? "Déconnecté" : "En ligne"}
                </p>
              </div>
            </div>
          </div>

          {/* Show location button */}
          {hasLocation && onShowLocation && (
            <button
              type="button"
              onClick={handleShowLocation}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#5B7FA5] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#4A6A8A]"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Afficher sa position
            </button>
          )}

          {!hasLocation && (
            <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-center text-sm text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
              Position non disponible
            </div>
          )}
        </div>

        <div className="px-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-slate-100 py-3.5 text-base font-semibold text-slate-700 active:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
