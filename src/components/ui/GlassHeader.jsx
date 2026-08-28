import { useEffect, useState } from "react";

export default function GlassHeader({ children, variant = "sticky" }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = (event) => {
      const windowY = window.scrollY || document.documentElement.scrollTop || 0;
      const target = event?.target;
      const targetY =
        target && target !== document && target !== window && typeof target.scrollTop === "number"
          ? target.scrollTop
          : 0;
      setScrolled(Math.max(windowY, targetY) > 8);
    };
    update();
    window.addEventListener("scroll", update, { passive: true, capture: true });
    return () => window.removeEventListener("scroll", update, { capture: true });
  }, []);

  const position = variant === "fixed" ? "fixed inset-x-0 top-0" : "sticky top-0 shrink-0";
  const glass = scrolled
    ? "border-slate-200/40 bg-white/45 backdrop-blur-3xl backdrop-saturate-150 dark:border-slate-800/40 dark:bg-slate-950/45"
    : "border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80";

  return (
    <header
      className={`${position} z-50 border-b pt-[env(safe-area-inset-top)] transition-[background-color,border-color,backdrop-filter,-webkit-backdrop-filter] duration-300 ${glass}`}
    >
      {children}
    </header>
  );
}
