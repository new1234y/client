export default function BrandMark({ compact = false, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <img
        src="/icon.svg"
        alt={compact ? "CHASE GPS" : ""}
        className="h-9 w-9 shrink-0 rounded-[22%]"
        draggable={false}
      />
      {!compact && (
        <span className="font-black tracking-tight text-slate-950 dark:text-white">
          CHASE GPS
        </span>
      )}
    </span>
  );
}
