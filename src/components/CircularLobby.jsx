import { useMemo } from "react";

export default function CircularLobby({ players, hostSessionId, currentSessionId }) {
  const hostPlayer = useMemo(() => 
    players?.find(p => p.sessionId === hostSessionId) || players?.[0],
    [players, hostSessionId]
  );

  const otherPlayers = useMemo(() => 
    players?.filter(p => p.sessionId !== hostSessionId) || [],
    [players, hostSessionId]
  );

  const { positionedPlayers } = useMemo(() => {
    if (!otherPlayers.length) {
      return { positionedPlayers: [] };
    }

    const count = otherPlayers.length;
    const radius = 180; // Radius of the circle
    const centerX = 250;
    const centerY = 250;

    const positioned = otherPlayers.map((player, index) => {
      const angle = (2 * Math.PI * index) / count - Math.PI / 2; // Start from top
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      return {
        ...player,
        x,
        y,
        angle,
        index
      };
    });

    return { positionedPlayers: positioned };
  }, [otherPlayers]);

  return (
    <div className="flex min-h-[500px] w-full items-center justify-center bg-white dark:bg-slate-900">
      <div className="relative h-[500px] w-[500px]">
        {/* Connection lines */}
        <svg className="absolute inset-0 h-full w-full pointer-events-none" style={{ zIndex: 0 }}>
          {positionedPlayers.map((player) => (
            <line
              key={player.sessionId}
              x1="250"
              y1="250"
              x2={player.x}
              y2={player.y}
              stroke="#E0E6ED"
              strokeWidth="2"
              strokeDasharray="5,5"
              className="dark:stroke-slate-700"
            />
          ))}
        </svg>

        {/* Concentric circles around center */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ zIndex: 1 }}>
          <div className="h-[280px] w-[280px] rounded-full border-2 border-slate-200 dark:border-slate-700 opacity-30" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[220px] w-[220px] rounded-full border-2 border-slate-200 dark:border-slate-700 opacity-40" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[160px] w-[160px] rounded-full border-2 border-slate-200 dark:border-slate-700 opacity-50" />
        </div>

        {/* Center host player */}
        {hostPlayer && (
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center"
            style={{ zIndex: 10 }}
          >
            <div className="relative animate-float-slow">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-2xl flex items-center justify-center text-white text-3xl font-bold border-4 border-white dark:border-slate-800">
                {hostPlayer.nickname?.charAt(0)?.toUpperCase() || "?"}
              </div>
              {/* Host badge */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white shadow-md">
                HÔTE
              </div>
            </div>
            <div className="mt-4 text-center">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {hostPlayer.nickname}
              </p>
              {hostPlayer.sessionId === currentSessionId && (
                <p className="text-xs text-indigo-600 dark:text-indigo-400">vous</p>
              )}
            </div>
          </div>
        )}

        {/* Surrounding players */}
        {positionedPlayers.map((player) => (
          <div
            key={player.sessionId}
            className="absolute flex flex-col items-center justify-center"
            style={{
              left: `${player.x}px`,
              top: `${player.y}px`,
              transform: 'translate(-50%, -50%)',
              zIndex: 5,
              animationDelay: `${player.index * 0.2}s`
            }}
          >
            <div className="relative animate-float">
              <div
                className={`h-16 w-16 rounded-full shadow-lg flex items-center justify-center text-white text-xl font-bold border-3 border-white dark:border-slate-800 ${
                  ['bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500'][player.index % 5]
                }`}
              >
                {player.nickname?.charAt(0)?.toUpperCase() || "?"}
              </div>
              {player.disconnected && (
                <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-amber-500 border-2 border-white dark:border-slate-800 flex items-center justify-center">
                  <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </div>
              )}
            </div>
            <div className="mt-2 text-center">
              <p className="text-xs font-medium text-slate-900 dark:text-white max-w-[80px] truncate">
                {player.nickname}
              </p>
              {player.sessionId === currentSessionId && (
                <p className="text-[10px] text-indigo-600 dark:text-indigo-400">vous</p>
              )}
              {player.disconnected && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400">déconnecté</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
