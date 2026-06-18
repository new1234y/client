import React from 'react';

export default function RadarBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Radar circles */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-[800px] h-[800px]">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-2 border-blue-200/30 animate-[spin_20s_linear_infinite]" />
          
          {/* Middle ring */}
          <div className="absolute inset-[100px] rounded-full border-2 border-purple-200/30 animate-[spin_15s_linear_infinite_reverse]" />
          
          {/* Inner ring */}
          <div className="absolute inset-[200px] rounded-full border-2 border-blue-200/40 animate-[spin_10s_linear_infinite]" />
          
          {/* Center ring */}
          <div className="absolute inset-[300px] rounded-full border-2 border-purple-200/40 animate-[spin_8s_linear_infinite_reverse]" />
          
          {/* Core ring */}
          <div className="absolute inset-[350px] rounded-full border-4 border-blue-300/50 animate-[spin_5s_linear_infinite]" />
          
          {/* Radar sweep */}
          <div className="absolute inset-0 rounded-full animate-[spin_4s_linear_infinite]">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-200/20 to-transparent" 
                 style={{
                   clipPath: 'polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%)'
                 }}
            />
          </div>
          
          {/* Dots on rings */}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 bg-blue-400/40 rounded-full"
              style={{
                top: '50%',
                left: '50%',
                transform: `rotate(${i * 45}deg) translateX(380px) translateY(-50%)`,
                animation: `pulse 2s ease-in-out ${i * 0.2}s infinite`
              }}
            />
          ))}
          
          {[...Array(6)].map((_, i) => (
            <div
              key={`inner-${i}`}
              className="absolute w-2 h-2 bg-purple-400/40 rounded-full"
              style={{
                top: '50%',
                left: '50%',
                transform: `rotate(${i * 60 + 30}deg) translateX(280px) translateY(-50%)`,
                animation: `pulse 2s ease-in-out ${i * 0.3}s infinite`
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Floating particles */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-blue-300/30 rounded-full"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animation: `float ${6 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`
            }}
          />
        ))}
      </div>
      
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-20px) translateX(10px);
            opacity: 0.6;
          }
        }
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.4;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
}
