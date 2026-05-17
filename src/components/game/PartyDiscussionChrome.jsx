import PartyChatPanel from "./PartyChatPanel.jsx";

export default function PartyDiscussionChrome({
  desktop,
  open,
  onToggle,
  messages,
  sessionId,
  onSend,
  position,
  disabled,
  hideFab = false,
  fabBottomClass = "bottom-24",
  fabAlignClass = "right-3",
  onFocusLocation,
}) {
  if (desktop) {
    return (
      <aside className="flex h-full min-h-0 w-full max-w-[400px] shrink-0 flex-col border-l border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="shrink-0 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
            Discussion
          </h2>
          <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
            Messages, photos géolocalisées et points GPS partagés avec la partie.
          </p>
        </div>
        <div className="min-h-0 flex-1 p-3 pt-0">
          <PartyChatPanel
            fillHeight
            variant="discussion"
            messages={messages}
            sessionId={sessionId}
            onSend={onSend}
            position={position}
            disabled={disabled}
            onFocusLocation={onFocusLocation}
          />
        </div>
      </aside>
    );
  }

  return (
    <>
      {!hideFab && (
        <button
          type="button"
          onClick={() => onToggle(!open)}
          className={`fixed z-[2100] flex h-14 w-14 items-center justify-center rounded-[8px] bg-[#5B7FA5] text-white shadow-lg ring-2 ring-white/20 transition active:scale-95 ${fabAlignClass} ${fabBottomClass}`}
          aria-expanded={open}
          aria-label={open ? "Fermer la discussion" : "Ouvrir la discussion"}
        >
          {open ? (
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          )}
        </button>
      )}
      {open && (
        <div
          className="fixed inset-0 z-[2000] flex flex-col justify-end bg-black/40 backdrop-blur-[2px] md:hidden"
          role="presentation"
          onClick={() => onToggle(false)}
        >
          <div
            className="flex max-h-[min(78dvh,560px)] min-h-[45dvh] flex-col rounded-t-[8px] bg-white shadow-2xl dark:bg-slate-900"
            role="dialog"
            aria-modal="true"
            aria-label="Discussion de partie"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Discussion</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Fermez pour revenir à la carte sans quitter la partie.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onToggle(false)}
                className="rounded-[8px] bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Fermer
              </button>
            </div>
            <div className="min-h-0 flex-1 p-3">
              <PartyChatPanel
                fillHeight
                variant="discussion"
                messages={messages}
                sessionId={sessionId}
                onSend={onSend}
                position={position}
                disabled={disabled}
                onFocusLocation={onFocusLocation}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
