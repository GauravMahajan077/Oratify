
import React from 'react';
import { playHover, playClick } from '../../utils/audio';

interface PixelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'success' | 'danger' | 'default' | 'outline';
  label: string;
  icon?: React.ReactNode;
}

const PixelButton: React.FC<PixelButtonProps> = ({ 
  variant = 'default', 
  label, 
  icon, 
  className = '', 
  onClick,
  ...props 
}) => {
  // Base styles: Sleek, glass-like, modern rounded corners, smooth transitions
  let baseStyles = "relative font-header font-medium tracking-wider text-sm py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 overflow-hidden group select-none backdrop-blur-md hover:scale-[1.02] active:scale-[0.98] border";
  let variantStyles = "";

  switch (variant) {
    case 'primary':
      variantStyles = "bg-cyan-500/10 border-cyan-500/50 text-cyan-50 shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:border-cyan-400 hover:bg-cyan-500/20";
      break;
    case 'success':
      variantStyles = "bg-emerald-500/10 border-emerald-500/50 text-emerald-50 shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:border-emerald-400 hover:bg-emerald-500/20";
      break;
    case 'danger':
      variantStyles = "bg-red-500/10 border-red-500/50 text-red-50 shadow-[0_0_20px_rgba(239,68,68,0.15)] hover:shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:border-red-400 hover:bg-red-500/20";
      break;
    case 'outline':
      variantStyles = "bg-transparent border-white/20 text-gray-300 hover:border-white/60 hover:text-white hover:bg-white/5 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]";
      break;
    default:
      variantStyles = "bg-white/5 border-white/10 text-gray-200 hover:bg-white/10 hover:border-white/30 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]";
  }

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!props.disabled) playClick();
    if (onClick) onClick(e);
  };

  const handleMouseEnter = () => {
    if (!props.disabled) playHover();
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles} ${props.disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''} ${className}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      {...props}
    >
      {/* Dynamic Background Glow on Hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none"></div>
      
      {/* Icon Wrapper for nicer alignment */}
      {icon && <span className="w-5 h-5 flex items-center justify-center relative z-10">{icon}</span>}
      
      {/* Label with subtle text shadow */}
      <span className="relative z-10 drop-shadow-md">{label}</span>
      
      {/* Tech Accent Lines (Corners) */}
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/30 rounded-tr-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/30 rounded-bl-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    </button>
  );
};

export default PixelButton;
