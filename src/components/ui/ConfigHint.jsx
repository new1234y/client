/** Légende discrète avec pictogramme « i » pour expliquer une option de configuration. */
export default function ConfigHint({ children }) {
  return (
    <p className="mt-1.5 flex items-start gap-2 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
      <span
        className="mt-0.5 inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-bold text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400"
        aria-hidden
      >
        i
      </span>
      <span>{children}</span>
    </p>
  );
}
