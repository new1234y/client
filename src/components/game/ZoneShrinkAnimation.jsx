import { useEffect, useRef, useState } from "react";

export default function ZoneShrinkAnimation({ isActive, duration = 2000 }) {
  const [particles, setParticles] = useState([]);
  const containerRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    if (!isActive) {
      setParticles([]);
      return;
    }

    // Generate colorful particles
    const newParticles = [];
    const colors = ["#ff6b6b", "#feca57", "#48dbfb", "#ff9ff3", "#54a0ff", "#5f27cd"];
    
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2;
      const distance = 100 + Math.random() * 200;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;
      const size = 8 + Math.random() * 16;
      const delay = Math.random() * 500;
      
      newParticles.push({
        id: i,
        x: 50 + Math.cos(angle) * 30,
        y: 50 + Math.sin(angle) * 30,
        size,
        color: colors[Math.floor(Math.random() * colors.length)],
        tx,
        ty,
        delay,
      });
    }
    
    setParticles(newParticles);

    // Clear particles after animation
    animationRef.current = setTimeout(() => {
      setParticles([]);
    }, duration + 500);

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [isActive, duration]);

  if (!isActive) return null;

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center"
    >
      {/* Main shrinking circle */}
      <div className="zone-shrink-circle absolute h-[60vh] w-[60vh] rounded-full border-4 border-violet-500 bg-violet-500/10" />
      
      {/* Colorful particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="zone-particle zone-particle-float absolute"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            boxShadow: `0 0 ${p.size}px ${p.color}`,
            "--tx": `${p.tx}px`,
            "--ty": `${p.ty}px`,
            animationDelay: `${p.delay}ms`,
          }}
        />
      ))}

      {/* Inner pulse effect */}
      <div className="zone-pulse absolute h-[40vh] w-[40vh] rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 opacity-30 blur-xl" />
    </div>
  );
}
