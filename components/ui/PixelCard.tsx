
import React from 'react';

interface PixelCardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  variant?: 'default' | 'glow';
}

const PixelCard: React.FC<PixelCardProps> = ({ children, title, className = '', variant = 'default' }) => {
  // Variant handling for border/shadow colors
  const glowStyles = variant === 'glow' 
    ? 'border-neon-cyan/40 shadow-[0_0_30px_rgba(0,240,255,0.1)]' 
    : 'border-white/10 shadow-lg';

  return (
    <div className={`relative rounded-xl bg-cyber-black/70 backdrop-blur-xl border ${glowStyles} p-8 overflow-hidden transition-all duration-500 group ${className}`}>
      
      {/* Subtle top-down gradient for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
      
      {/* Top Accent Line (Glowing) */}
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-[1px] bg-gradient-to-r from-transparent ${variant === 'glow' ? 'via-neon-cyan' : 'via-white/40'} to-transparent opacity-50`}></div>
      
      {title && (
        <div className="mb-8 flex flex-col items-center relative z-10">
          <h3 className={`font-header text-sm md:text-base tracking-[0.2em] uppercase mb-2 ${variant === 'glow' ? 'text-neon-cyan drop-shadow-[0_0_5px_rgba(0,240,255,0.8)]' : 'text-gray-300'}`}>
            {title}
          </h3>
          {/* Decorative Underline */}
          <div className="flex items-center gap-1">
             <div className="w-2 h-[2px] bg-gray-600 rounded-full"></div>
             <div className={`w-12 h-[2px] rounded-full ${variant === 'glow' ? 'bg-gradient-to-r from-neon-cyan to-blue-500' : 'bg-gray-500'}`}></div>
             <div className="w-2 h-[2px] bg-gray-600 rounded-full"></div>
          </div>
        </div>
      )}

      {/* Content Container - UPDATED to h-full w-full */}
      <div className="relative z-10 h-full w-full">
        {children}
      </div>
      
      {/* Modern Corner Accents (Bottom Right) */}
      <div className="absolute bottom-3 right-3 flex gap-1 opacity-30">
        <div className="w-1 h-1 bg-white rounded-full"></div>
        <div className="w-1 h-1 bg-white rounded-full"></div>
        <div className="w-1 h-1 bg-white rounded-full"></div>
      </div>
    </div>
  );
};

export default PixelCard;
