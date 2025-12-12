
import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  animated?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = "h-12", showText = true, animated = false }) => {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Icon Container */}
      <div className="relative h-full aspect-square flex items-center justify-center">
        
        {/* Outer Glow/Pulse for Animation */}
        {animated && (
            <div className="absolute inset-0 rounded-full bg-neon-cyan/20 animate-pulse opacity-40"></div>
        )}

        {/* Simple, Crisp SVG Logo */}
        <svg viewBox="0 0 100 100" className={`w-full h-full drop-shadow-xl z-10 ${animated ? 'hover:scale-105 transition-transform duration-300' : ''}`}>
          
          {/* Animation: Expanding Ring (Signal Broadcast) */}
          {animated && (
            <circle cx="50" cy="50" r="45" fill="none" stroke="#00f0ff" strokeWidth="1" opacity="0.6">
                <animate attributeName="r" from="45" to="65" dur="2.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.6" to="0" dur="2.5s" repeatCount="indefinite" />
            </circle>
          )}

          {/* 1. The Base Circle (White) */}
          <circle cx="50" cy="50" r="45" fill="#ffffff" />

          {/* 2. Microphone Stand (Black) */}
          <path 
            d="M50 74 V84 M38 84 H62" 
            stroke="#000000" 
            strokeWidth="5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          
          {/* 3. Microphone U-Holder (Black) */}
          <path 
            d="M32 44 C32 58 38 74 50 74 C62 74 68 58 68 44" 
            fill="none" 
            stroke="#000000" 
            strokeWidth="5" 
            strokeLinecap="round" 
          />

          {/* 4. Microphone Capsule (Blue Gradient) */}
          <defs>
             <linearGradient id="micBlue" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#3b82f6" /> {/* Blue-500 */}
                <stop offset="100%" stopColor="#1e40af" /> {/* Blue-800 */}
             </linearGradient>
             
             {/* Animated Gradient for 'Live' look */}
             <linearGradient id="micBlueAnimated" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#3b82f6">
                    <animate attributeName="stop-color" values="#3b82f6;#00f0ff;#3b82f6" dur="3s" repeatCount="indefinite" />
                </stop>
                <stop offset="100%" stopColor="#1e40af">
                    <animate attributeName="stop-color" values="#1e40af;#2563eb;#1e40af" dur="3s" repeatCount="indefinite" />
                </stop>
             </linearGradient>
          </defs>
          
          {/* Use animated gradient if animated prop is true */}
          <rect x="38" y="24" width="24" height="42" rx="12" fill={animated ? "url(#micBlueAnimated)" : "url(#micBlue)"} />
          
          {/* 5. Mic Details (Subtle Horizontal Lines) */}
          <line x1="42" y1="34" x2="58" y2="34" stroke="black" strokeWidth="2" opacity="0.1" />
          <line x1="42" y1="44" x2="58" y2="44" stroke="black" strokeWidth="2" opacity="0.1" />
          <line x1="42" y1="54" x2="58" y2="54" stroke="black" strokeWidth="2" opacity="0.1" />

          {/* 6. Professional Reflection/Shine */}
          <path d="M42 28 Q 46 28 46 38" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.5" fill="none" />
        </svg>

        {/* Static Glow for Depth */}
        <div className="absolute inset-0 bg-white/10 blur-lg rounded-full -z-10"></div>
      </div>

      {/* Text Section */}
      {showText && (
        <div className="flex flex-col justify-center h-full pt-1">
            <span className="font-header font-black text-2xl md:text-3xl text-white tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                ORATIFY
            </span>
            <div className="flex items-center gap-2">
                {animated && <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                <span className="font-header text-[0.6rem] text-neon-cyan font-bold tracking-[0.3em] uppercase leading-none opacity-90">
                    PRO SIMULATION
                </span>
            </div>
        </div>
      )}
    </div>
  );
};

export default Logo;
