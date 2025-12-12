
import React from 'react';

interface PixelBarProps {
  label: string;
  value: number; // 0 to 100
  max?: number;
  color?: string; // Optional override
  subLabel?: string;
  barColorClass?: string;
}

const PixelBar: React.FC<PixelBarProps> = ({ label, value, max = 100, subLabel, barColorClass }) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  // Default gradients if custom class not provided
  const bgGradient = barColorClass || 'bg-gradient-to-r from-cyan-600 to-blue-500';

  return (
    <div className="mb-5 w-full">
      {/* Header */}
      <div className="flex justify-between items-end mb-2">
        <span className="font-header text-xs tracking-widest text-gray-400 uppercase">{label}</span>
        <div className="flex items-baseline gap-1">
             <span className="font-body font-bold text-white text-lg">{Math.round(value)}%</span>
             {subLabel && <span className="text-xs text-gray-500">{subLabel}</span>}
        </div>
      </div>

      {/* Bar Track */}
      <div className="h-3 w-full bg-black/60 rounded-full p-[2px] border border-white/5 shadow-inner relative overflow-hidden">
        {/* Fill */}
        <div 
          className={`h-full rounded-full ${bgGradient} relative transition-all duration-1000 ease-out flex items-center`}
          style={{ width: `${percentage}%` }}
        >
          {/* Subtle Striations/Texture */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-30 mix-blend-overlay"></div>
          
          {/* Leading Edge Glow */}
          <div className="absolute right-0 top-0 bottom-0 w-4 bg-white/40 blur-[4px] rounded-full"></div>
        </div>
      </div>
    </div>
  );
};

export default PixelBar;
