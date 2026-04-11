import { useEffect, useState, useRef } from "react";

const CloseIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ShareIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  </svg>
);

const LocationIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const WifiOffIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
  </svg>
);

function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatLastSeen(timestamp) {
  if (!timestamp) return "Inconnu";
  const diff = Date.now() - timestamp;
  if (diff < 60000) return "A l'instant";
  if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`;
  if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)} h`;
  return "Il y a longtemps";
}

export default function PlayerBottomSheet({ player, roomCode, onClose, myPosition }) {
  const [isClosing, setIsClosing] = useState(false);
  const [copied, setCopied] = useState(false);
  const sheetRef = useRef(null);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 280);
  };

  // Handle swipe down to close
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;

    let startY = 0;
    let currentY = 0;

    const handleTouchStart = (e) => {
      startY = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
      currentY = e.touches[0].clientY;
      const diff = currentY - startY;
      if (diff > 0) {
        sheet.style.transform = `translateY(${diff}px)`;
      }
    };

    const handleTouchEnd = () => {
      const diff = currentY - startY;
      if (diff > 100) {
        handleClose();
      } else {
        sheet.style.transform = "";
      }
    };

    sheet.addEventListener("touchstart", handleTouchStart);
    sheet.addEventListener("touchmove", handleTouchMove);
    sheet.addEventListener("touchend", handleTouchEnd);

    return () => {
      sheet.removeEventListener("touchstart", handleTouchStart);
      sheet.removeEventListener("touchmove", handleTouchMove);
      sheet.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  if (!player) return null;

  const roleColor = player.role === "cat" 
    ? "text-orange-500 bg-orange-500/10" 
    : "text-blue-500 bg-blue-500/10";
  
  const roleLabel = player.spectator 
    ? "Spectateur" 
    : player.role === "cat" 
      ? "Chat" 
      : "Joueur";

  const distance = myPosition && player.lat && player.lng
    ? Math.round(
        Math.sqrt(
          Math.pow((player.lat - myPosition.lat) * 111320, 2) +
          Math.pow((player.lng - myPosition.lng) * 111320 * Math.cos(myPosition.lat * Math.PI / 180), 2)
        )
      )
    : null;

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}?code=${roomCode}`;
    const shareText = `Rejoins ma partie Chase GPS! Code: ${roomCode}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Chase GPS",
          text: shareText,
          url: shareUrl,
        });
      } catch (e) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[1500] bg-black/50 transition-opacity"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`fixed inset-x-0 bottom-0 z-[1501] rounded-t-3xl bg-white pb-8 pt-2 shadow-2xl dark:bg-slate-900 ${
          isClosing ? "sheet-exit" : "sheet-enter"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={`Details de ${player.nickname}`}
      >
        {/* Handle */}
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />

        {/* Header */}
        <div className="flex items-start justify-between px-6">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-full text-2xl font-bold ${roleColor}`}
            >
              {player.nickname.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {player.nickname}
              </h2>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${roleColor}`}>
                  {roleLabel}
                </span>
                {player.disconnectedAt && (
                  <span className="flex items-center gap-1 text-xs text-red-500">
                    <WifiOffIcon />
                    Deconnecte
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            aria-label="Fermer"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Info */}
        <div className="mt-4 space-y-3 px-6">
          {/* Last position */}
          {player.lat && player.lng && (
            <div className="flex items-center gap-3 rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
              <span className="text-slate-500 dark:text-slate-400">
                <LocationIcon />
              </span>
              <div className="flex-1">
                <p className="text-xs text-slate-500 dark:text-slate-400">Derniere position</p>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {player.lat.toFixed(5)}, {player.lng.toFixed(5)}
                </p>
              </div>
              {distance !== null && (
                <span className="rounded-lg bg-indigo-100 px-2 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                  {formatDistance(distance)}
                </span>
              )}
            </div>
          )}

          {/* Last seen */}
          {player.disconnectedAt && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              Derniere activite: {formatLastSeen(player.lastPositionAt || player.disconnectedAt)}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 px-6">
          <button
            type="button"
            onClick={handleShare}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 active:bg-indigo-800"
          >
            <ShareIcon />
            {copied ? "Lien copie !" : "Partager la partie"}
          </button>
        </div>
      </div>
    </>
  );
}
