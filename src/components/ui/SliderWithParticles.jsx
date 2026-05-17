import { useRef, useEffect, useState, useCallback } from 'react';

/**
 * SliderWithParticles - Premium slider with particles that move left/right based on drag direction
 * @param {Object} props - Standard HTML input[type="range"] props
 * @returns {JSX.Element}
 */
export default function SliderWithParticles(props) {
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const particleContainerRef = useRef(null);
  const lastValueRef = useRef(props.value || 0);
  const particleCountRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const createParticle = useCallback((x, y, direction) => {
    if (!particleContainerRef.current) return;

    // Random particle type: square, circle, or mini-cushion
    const types = ['square', 'circle', 'cushion'];
    const type = types[Math.floor(Math.random() * types.length)];

    // Random color from palette
    const colors = ['#5D8AA8', '#EEDC82', '#CD5C5C'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    // Random vertical offset
    const ty = (Math.random() - 0.5) * 30;

    // Create particle element
    const particle = document.createElement('div');
    const particleId = ++particleCountRef.current;
    const directionClass = direction === 'right' ? 'right' : 'left';
    particle.className = `particle-${type}-${directionClass} slider-particle`;
    particle.id = `particle-${particleId}`;
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    particle.style.setProperty('--ty', `${ty}px`);

    const size = 5 + Math.random() * 8;
    particle.style.width = size + 'px';
    particle.style.height = size + 'px';

    // Create shape content
    if (type === 'square') {
      particle.style.background = color;
      particle.style.borderRadius = '1px';
    } else if (type === 'circle') {
      particle.style.background = color;
      particle.style.borderRadius = '50%';
      particle.style.boxShadow = `0 0 6px ${color}80`;
    } else if (type === 'cushion') {
      particle.style.background = color;
      particle.style.borderRadius = '3px';
      particle.style.opacity = '0.85';
    }

    particle.style.position = 'fixed';
    particle.style.pointerEvents = 'none';
    particle.style.zIndex = '9999';

    particleContainerRef.current.appendChild(particle);

    // Remove particle after animation
    setTimeout(() => {
      if (particle.parentNode) {
        particle.remove();
      }
    }, 700);
  }, []);

  const createTrail = useCallback((x1, y1, x2, y2) => {
    if (!particleContainerRef.current) return;

    const trail = document.createElement('div');
    trail.className = 'slider-trail active';
    
    const minX = Math.min(x1, x2);
    const width = Math.abs(x2 - x1);
    
    trail.style.left = minX + 'px';
    trail.style.top = y2 + 'px';
    trail.style.width = width + 'px';

    particleContainerRef.current.appendChild(trail);

    setTimeout(() => {
      if (trail.parentNode) {
        trail.remove();
      }
    }, 600);
  }, []);

  const getThumbPosition = useCallback(() => {
    if (!inputRef.current) return { x: 0, y: 0 };
    const input = inputRef.current;
    const min = parseFloat(input.min) || 0;
    const max = parseFloat(input.max) || 100;
    const value = parseFloat(input.value) || 0;
    const percent = (value - min) / (max - min);
    const track = input.offsetWidth;
    const x = percent * track + 14; // +14 for thumb radius
    
    // Get absolute position on page
    const rect = input.getBoundingClientRect();
    const absoluteX = rect.left + x;
    const absoluteY = rect.top + -195; // Adjusted to be at slider level
    
    return { 
      x: absoluteX, 
      y: absoluteY 
    };
  }, []);

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleInput = (e) => {
    const newValue = parseFloat(e.target.value);
    const oldValue = lastValueRef.current;
    const step = parseFloat(props.step) || 1;

    // Determine direction
    const direction = newValue > oldValue ? 'right' : 'left';

    // Generate particles and trail if value changed significantly
    if (Math.abs(newValue - oldValue) > step * 0.4) {
      const { x, y } = getThumbPosition();
      
      // Generate 2-4 particles around thumb, aligned horizontally
      const particleCount = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < particleCount; i++) {
        const offsetX = (Math.random() - 0.5) * 10;
        setTimeout(() => {
          createParticle(x + offsetX, y, direction);
        }, i * 15);
      }

      // Create trail behind slider
      if (Math.abs(newValue - oldValue) > step * 1.5) {
        const lastThumbPos = (() => {
          if (!inputRef.current) return { x: 0, y: 0 };
          const input = inputRef.current;
          const min = parseFloat(input.min) || 0;
          const max = parseFloat(input.max) || 100;
          const percent = (oldValue - min) / (max - min);
          const track = input.offsetWidth;
          const xPos = percent * track + 14;
          const rect = input.getBoundingClientRect();
          return { 
            x: rect.left + xPos, 
            y: rect.top + 20 
          };
        })();
        
        createTrail(lastThumbPos.x, lastThumbPos.y, x, y);
      }

      lastValueRef.current = newValue;
    }

    if (props.onChange) {
      props.onChange(e);
    }
  };

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    input.addEventListener('mousedown', handleMouseDown);
    input.addEventListener('touchstart', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchend', handleMouseUp);

    return () => {
      input.removeEventListener('mousedown', handleMouseDown);
      input.removeEventListener('touchstart', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full" style={{ minHeight: '40px' }}>
      <div
        ref={particleContainerRef}
        className="pointer-events-none fixed inset-0"
        style={{ zIndex: 9998 }}
      />
      <input
        ref={inputRef}
        type="range"
        {...props}
        onChange={handleInput}
        style={{ position: 'relative', zIndex: 10 }}
      />
    </div>
  );
}
