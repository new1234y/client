import React, { useRef, useCallback } from "react";

export default function DiscreteSlider({ options, value, onChange, color = "blue" }) {
  const containerRef = useRef(null);
  
  const selectedIndex = options.findIndex((o) => o.value === value) !== -1 
    ? options.findIndex((o) => o.value === value) 
    : 0;
  
  const handleSelect = (idx, newValue) => {
    // Generate particles
    createParticles(idx);
    onChange(newValue);
  };

  const createParticles = useCallback((idx) => {
    if (!containerRef.current) return;
    const marks = containerRef.current.querySelectorAll('.slider-mark');
    if (!marks[idx]) return;

    const rect = marks[idx].getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    const colors = color === "amber" 
      ? ['#F59E0B', '#FBBF24', '#FCD34D'] 
      : ['#2563EB', '#3B82F6', '#93C5FD'];

    for (let i = 0; i < 8; i++) {
      const particle = document.createElement('div');
      particle.className = 'click-particle';
      const pColor = colors[Math.floor(Math.random() * colors.length)];
      
      const angle = Math.random() * Math.PI * 2;
      const velocity = 20 + Math.random() * 30;
      const dx = Math.cos(angle) * velocity;
      const dy = Math.sin(angle) * velocity;
      
      particle.style.left = x + 'px';
      particle.style.top = y + 'px';
      particle.style.width = (4 + Math.random() * 4) + 'px';
      particle.style.height = particle.style.width;
      particle.style.background = pColor;
      particle.style.borderRadius = '50%';
      particle.style.setProperty('--dx', dx + 'px');
      particle.style.setProperty('--dy', dy + 'px');
      particle.style.animation = 'burst-particle 0.6s cubic-bezier(0.1, 0.8, 0.3, 1) forwards';
      
      document.body.appendChild(particle);
      setTimeout(() => particle.remove(), 600);
    }
  }, [color]);

  const percentage = options.length > 1 ? (selectedIndex / (options.length - 1)) * 100 : 0;

  const colorCls = color === "amber" ? "bg-amber-500" : "bg-blue-600";
  const ringCls = color === "amber" ? "ring-amber-500/30" : "ring-blue-600/30";

  return (
    <div className="relative w-full py-4 px-2" ref={containerRef}>
      {/* Track */}
      <div className="absolute left-2 right-2 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
        <div 
          className={`absolute left-0 top-0 bottom-0 ${colorCls} transition-all duration-300 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Marks & Labels */}
      <div className="relative z-10 flex justify-between">
        {options.map((opt, idx) => {
          const isActive = idx === selectedIndex;
          const isPassed = idx <= selectedIndex;
          
          return (
            <div 
              key={opt.value}
              className="flex flex-col items-center cursor-pointer slider-mark"
              onClick={() => handleSelect(idx, opt.value)}
            >
              {/* Point */}
              <div 
                className={`h-4 w-4 rounded-full border-2 transition-all duration-300 transform ${
                  isActive 
                    ? `${colorCls} border-white dark:border-slate-800 scale-125 shadow-md ring-4 ${ringCls}` 
                    : isPassed
                      ? `${colorCls} border-${color}-500 scale-100`
                      : "bg-white border-slate-300 dark:bg-slate-800 dark:border-slate-600 scale-100"
                }`}
              />
              {/* Label */}
              <div 
                className={`absolute top-6 whitespace-nowrap text-[11px] font-bold transition-colors ${
                  isActive ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {opt.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
