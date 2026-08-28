export default function SegmentedControl({ options, value, onChange, className = "" }) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const n = Math.max(1, options.length);
  return (
    <div className={`relative flex rounded-full bg-slate-100 p-0.5 dark:bg-slate-800 ${className}`}>
      <span
        className="seg-thumb pointer-events-none absolute top-0.5 bottom-0.5 rounded-full bg-white shadow-sm dark:bg-slate-700"
        style={{
          width: `calc(${100 / n}% - 4px)`,
          left: `calc(${(100 / n) * idx}% + 2px)`,
        }}
        aria-hidden="true"
      />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`relative z-10 min-h-9 flex-1 rounded-full px-3 py-1 text-[13px] font-semibold transition-colors ${
            value === o.value
              ? "text-slate-900 dark:text-white"
              : "text-slate-600 dark:text-slate-400"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
