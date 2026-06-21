import React, { useEffect, useState, useRef } from "react";
import { formatCoins } from '../../lib/format';

export default function AnimatedPrice({ value, label = "Coût estimé :" }) {
  const [displayValue, setDisplayValue] = useState(value);
  const containerRef = useRef(null);

  useEffect(() => {
    if (value !== displayValue) {
      // Trigger particles
      if (containerRef.current) {
        for (let i = 0; i < 5; i++) {
          const particle = document.createElement("div");
          particle.className = "click-particle";
          particle.style.background = "#FBBF24";
          particle.style.width = "4px";
          particle.style.height = "4px";
          particle.style.borderRadius = "50%";
          const angle = Math.random() * Math.PI * 2;
          const velocity = 15 + Math.random() * 20;
          particle.style.setProperty("--dx", Math.cos(angle) * velocity + "px");
          particle.style.setProperty("--dy", Math.sin(angle) * velocity + "px");
          
          const rect = containerRef.current.getBoundingClientRect();
          particle.style.left = rect.left + rect.width / 2 + "px";
          particle.style.top = rect.top + rect.height / 2 + "px";
          particle.style.animation = 'burst-particle 0.5s cubic-bezier(0.1, 0.8, 0.3, 1) forwards';
          
          document.body.appendChild(particle);
          setTimeout(() => particle.remove(), 500);
        }
      }
      
      const el = containerRef.current;
      if (el) {
        el.style.transform = "scale(1.2)";
        el.style.color = "#F59E0B";
        setTimeout(() => {
          el.style.transform = "scale(1)";
          el.style.color = "";
        }, 200);
      }
      
      setDisplayValue(value);
    }
  }, [value, displayValue]);

  return (
    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
      <span className="text-[12px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <div 
        ref={containerRef}
        className="flex items-center gap-1.5 transition-all duration-200"
      >
        <span className="text-xl">🪙</span>
        <span className="text-[16px] font-black text-slate-900 dark:text-white">
          {formatCoins(displayValue)}
        </span>
      </div>
    </div>
  );
}
