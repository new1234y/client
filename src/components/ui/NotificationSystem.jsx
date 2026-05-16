import { useCallback, useEffect, useState } from "react";

// Notification types: info, success, warning, error
export function useNotifications() {
 const [notifications, setNotifications] = useState([]);

 const addNotification = useCallback((message, type = "info", duration = 4000) => {
  const id = Date.now() + Math.random();
  setNotifications((prev) => [...prev, { id, message, type, duration }]);
  if (duration > 0) {
   setTimeout(() => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
   }, duration);
  }
  return id;
 }, []);

 const removeNotification = useCallback((id) => {
  setNotifications((prev) => prev.filter((n) => n.id !== id));
 }, []);

 const clearAll = useCallback(() => {
  setNotifications([]);
 }, []);

 return { notifications, addNotification, removeNotification, clearAll };
}

const typeStyles = {
 info: "bg-cozy-primary text-cozy-bg",
 success: "bg-cozy-success text-cozy-bg",
 warning: "bg-cozy-yellow text-cozy-text",
 error: "bg-cozy-red text-cozy-bg",
 player_left: "bg-cozy-text text-cozy-bg",
 player_joined: "bg-cozy-player text-cozy-bg",
};

const typeIcons = {
 info: (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
 ),
 success: (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
 ),
 warning: (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
 ),
 error: (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
 ),
 player_left: (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
 ),
 player_joined: (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
  </svg>
 ),
};

export function NotificationContainer({ notifications, onRemove }) {
 if (!notifications.length) return null;

 return (
  <div className="pointer-events-none fixed inset-x-0 top-0 z-[10050] flex flex-col items-center gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-4">
   {notifications.map((notif) => (
    <div
     key={notif.id}
     className={`pointer-events-auto flex w-[min(100%,24rem)] max-w-[calc(100vw-1.5rem)] items-center gap-3 rounded-xl border-2 border-white/25 px-4 py-3.5 text-left shadow-2xl ring-2 ring-black/10 backdrop-blur-md transition-all duration-300  ${typeStyles[notif.type] || typeStyles.info}`}
     role="alert"
    >
     {typeIcons[notif.type] || typeIcons.info}
     <span className="text-sm font-medium">{notif.message}</span>
     <button
      type="button"
      onClick={() => onRemove(notif.id)}
      className="ml-2 rounded-full p-1 opacity-70 hover:opacity-100"
     >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
     </button>
    </div>
   ))}
  </div>
 );
}
