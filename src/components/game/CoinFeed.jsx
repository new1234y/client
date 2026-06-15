import { useEffect, useState } from "react";

export default function CoinFeed({ socket, sessionId }) {
  const [currentEvent, setCurrentEvent] = useState(null);

  useEffect(() => {
    if (!socket) return;

    const handleCoinsLost = (data) => {
      const isMe = data.sessionId === sessionId;
      setCurrentEvent({
        type: "lost",
        amount: data.coinsLost,
        nickname: data.nickname,
        isMe,
        timestamp: Date.now(),
      });
    };

    const handleBaliseCaptured = (data) => {
      const isMe = data.sessionId === sessionId;
      setCurrentEvent({
        type: "gained",
        amount: 10,
        nickname: data.nickname,
        isMe,
        timestamp: Date.now(),
      });
    };

    socket.on("coins_lost", handleCoinsLost);
    socket.on("balise_captured", handleBaliseCaptured);

    return () => {
      socket.off("coins_lost", handleCoinsLost);
      socket.off("balise_captured", handleBaliseCaptured);
    };
  }, [socket, sessionId]);

  // Auto-hide event after 2 seconds
  useEffect(() => {
    if (!currentEvent) return;
    const timeout = setTimeout(() => {
      setCurrentEvent(null);
    }, 2000);

    return () => clearTimeout(timeout);
  }, [currentEvent]);

  if (!currentEvent) return null;

  return (
    <div
      className={`pointer-events-none absolute right-3 top-[4.5rem] z-[9999] flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold shadow-lg backdrop-blur-sm animate-slide-up md:top-20 ${
        currentEvent.type === "gained"
          ? "bg-emerald-500/95 text-white"
          : "bg-rose-500/95 text-white"
      }`}
    >
      <span className="text-lg">
        {currentEvent.type === "gained" ? "+" : "-"}{currentEvent.amount}
      </span>
      <span className="opacity-90">
        {currentEvent.isMe ? "Vous" : currentEvent.nickname}
      </span>
    </div>
  );
}
