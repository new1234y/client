export default function BrandMark({ compact = false, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <span
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600"
        aria-hidden="true"
      >
        <span className="absolute inset-1.5 rounded-full border border-white/70" />
        <span className="h-1.5 w-1.5 rounded-full bg-white" />
      </span>
      {!compact && (
        <span className="font-black tracking-tight text-slate-950 dark:text-white">
          CHASE GPS
        </span>
      )}
    </span>
  );
}
