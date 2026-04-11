import { QRCodeSVG } from "qrcode.react";

export default function QRModal({ sessionId, roomCode, onClose }) {
  if (!sessionId) return null;
  
  // Generate join URL with room code
  const joinUrl = roomCode 
    ? `${window.location.origin}?code=${roomCode}`
    : sessionId;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Mon QR code"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <h2 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
          Ma capture
        </h2>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
          Montrez ce code a un chat a moins de 15 m pour etre capture.
        </p>
        {/* Force white background for QR code - critical for dark mode scanning */}
        <div className="flex justify-center rounded-xl bg-white p-6 shadow-inner">
          <QRCodeSVG 
            value={joinUrl} 
            size={220} 
            level="H"
            bgColor="#FFFFFF"
            fgColor="#000000"
            includeMargin={true}
          />
        </div>
        {roomCode && (
          <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
            Code: <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{roomCode}</span>
          </p>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-indigo-600 py-3.5 text-base font-semibold text-white transition-colors hover:bg-indigo-700 active:bg-indigo-800"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
