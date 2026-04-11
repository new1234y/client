import { useCallback, useEffect, useRef, useState } from "react";

/* ─── Hook ──────────────────────────────────────────────── */
export function useNotifications() {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback(
    (message, type = "info", duration = 4500) => {
      const id = Date.now() + Math.random();
      setNotifications((prev) => [{ id, message, type, duration }, ...prev]);
      if (duration > 0) {
        setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== id));
        }, duration);
      }
      return id;
    },
    []
  );

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => setNotifications([]), []);

  return { notifications, addNotification, removeNotification, clearAll };
}

/* ─── Toast visual config ───────────────────────────────── */
const TOAST_CONFIG = {
  info: {
    bg: "bg-slate-900",
    text: "text-white",
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  success: {
    bg: "bg-emerald-600",
    text: "text-white",
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  warning: {
    bg: "bg-amber-500",
    text: "text-slate-900",
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  error: {
    bg: "bg-red-600",
    text: "text-white",
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  player_left: {
    bg: "bg-slate-700",
    text: "text-white",
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
    ),
  },
  player_joined: {
    bg: "bg-sky-600",
    text: "text-white",
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
  },
};

/* ─── Single toast item ─────────────────────────────────── */
function ToastItem({ notif, onRemove }) {
  const [exiting, setExiting] = useState(false);
  const cfg = TOAST_CONFIG[notif.type] || TOAST_CONFIG.info;

  const dismiss = () => {
    setExiting(true);
    setTimeout(() => onRemove(notif.id), 220);
  };

  // Auto-dismiss progress animation
  const progressRef = useRef(null);
  useEffect(() => {
    if (!progressRef.current || !notif.duration) return;
    progressRef.current.style.transition = `width ${notif.duration}ms linear`;
    requestAnimationFrame(() => {
      if (progressRef.current) progressRef.current.style.width = "0%";
    });
  }, [notif.duration]);

  return (
    <div
      className={`relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-2xl px-4 py-3 shadow-xl ring-1 ring-black/10 ${cfg.bg} ${cfg.text} ${exiting ? "opacity-0 transition-opacity duration-200" : "animate-slide-down"}`}
      role="alert"
      aria-live="polite"
    >
      {/* Icon */}
      <span className="mt-0.5">{cfg.icon}</span>

      {/* Message */}
      <p className="flex-1 text-sm font-semibold leading-snug">{notif.message}</p>

      {/* Close */}
      <button
        type="button"
        onClick={dismiss}
        className="ml-1 shrink-0 rounded-lg p-1 opacity-70 hover:opacity-100 active:opacity-60"
        aria-label="Fermer"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Progress bar */}
      {notif.duration > 0 && (
        <div
          className="absolute bottom-0 left-0 h-0.5 w-full bg-white/30"
          aria-hidden="true"
        >
          <div
            ref={progressRef}
            className="h-full bg-white/70"
            style={{ width: "100%" }}
          />
        </div>
      )}
    </div>
  );
}

/* ─── Container ─────────────────────────────────────────── */
export function NotificationContainer({ notifications, onRemove }) {
  if (!notifications.length) return null;

  return (
    /* z-[9999] ensures toasts render above every modal (max z-[2500]) */
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] flex flex-col items-center gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]"
      aria-live="polite"
      aria-label="Notifications"
    >
      {notifications.slice(0, 5).map((notif) => (
        <div key={notif.id} className="pointer-events-auto w-full max-w-sm">
          <ToastItem notif={notif} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
}
