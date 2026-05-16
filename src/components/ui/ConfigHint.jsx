/** Légende discrète avec pictogramme « i » pour expliquer une option de configuration. */
export default function ConfigHint({ children }) {
 return (
  <p className="mt-1.5 flex items-start gap-2 text-[11px] leading-snug text-cozy-text-muted">
   <span
    className="mt-0.5 inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-cozy-border bg-cozy-bg text-[10px] font-bold text-cozy-text-muted dark:border-cozy-border bg-cozy-surface dark:text-cozy-text-muted"
    aria-hidden
   >
    i
   </span>
   <span>{children}</span>
  </p>
 );
}
