import PartyChatPanel from "./PartyChatPanel.jsx";

/**
 * Discussion de groupe : panneau latéral fixe sur grand écran,
 * bouton flottant + feuille sur mobile.
 */
export default function PartyDiscussionChrome({
  desktop,
  open,
  onToggle,
  messages,
  sessionId,
  onSend,
  position,
  disabled,
  /** Plus bas sur l’écran jeu (barre d’onglets + actions scan) */
  fabBottomClass = "bottom-24",
  /** horizontal : éviter les contrôles carte à droite sur mobile */
  fabAlignClass = "right-3",
}) {
  if (desktop) {
    return (
      <aside className="flex h-full min-h-0 w-full max-w-[400px] shrink-0 flex-col border-l border-[var(--color-border)] bg-[var(--color-bg)]">
        <div className="shrink-0 border-b border-[var(--color-border)] px-4 py-3">
          <h2 className="text-sm font-semibold tracking-tight text-[var(--color-text)]">
            Discussion
          </h2>
          <p className="mt-0.5 text-[11px] leading-snug text-[var(--color-text-muted)]">
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
          />
        </div>
      </aside>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => onToggle(!open)}
        className={`fixed z-[880] flex h-14 w-14 items-center justify-center rounded-lg bg-brand-blue text-white shadow-card-lg ring-2 ring-white/20 transition active:scale-95 dark:bg-brand-blue dark:ring-navy-800/50 ${fabAlignClass} ${fabBottomClass}`}
        aria-expanded={open}
        aria-label={open ? "Fermer la discussion" : "Ouvrir la discussion"}
      >
        {open ? (
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[870] flex flex-col justify-end bg-black/40 backdrop-blur-[2px] md:hidden"
          role="presentation"
          onClick={() => onToggle(false)}
        >
          <div
            className="flex max-h-[min(78dvh,560px)] min-h-[45dvh] flex-col rounded-t-2xl bg-[var(--color-bg)] shadow-card-lg"
            role="dialog"
            aria-modal="true"
            aria-label="Discussion de partie"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-[var(--color-text)]">Discussion</h2>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  Fermez pour revenir à la carte sans quitter la partie.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onToggle(false)}
                className="rounded-lg bg-[var(--color-bg-overlay)] px-3 py-2 text-xs font-semibold text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-border)]"
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
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
