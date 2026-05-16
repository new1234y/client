import { useEffect, useState } from "react";

export default function GameTimer({ endsAt, className = "" }) {
 const [timeLeft, setTimeLeft] = useState(null);

 useEffect(() => {
  if (!endsAt) {
   setTimeLeft(null);
   return;
  }

  const tick = () => {
   const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
   setTimeLeft(remaining);
  };

  tick();
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
 }, [endsAt]);

 if (timeLeft == null) return null;

 const hours = Math.floor(timeLeft / 3600);
 const minutes = Math.floor((timeLeft % 3600) / 60);
 const seconds = timeLeft % 60;

 const isUrgent = timeLeft <= 60;
 const isWarning = timeLeft <= 300 && !isUrgent;

 const formatTime = () => {
  if (hours > 0) {
   return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
 };

 return (
  <div
   className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-bold tabular-nums ${
    isUrgent
     ? "animate-pulse bg-cozy-red-muted text-red-700 "
     : isWarning
      ? "bg-cozy-yellow-muted text-amber-700 "
      : "bg-cozy-surface text-cozy-text-secondary"
   } ${className}`}
  >
   <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
   </svg>
   <span>{formatTime()}</span>
  </div>
 );
}
