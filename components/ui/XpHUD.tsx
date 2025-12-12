
import React, { useEffect, useState } from 'react';
import { Brain } from 'lucide-react';

interface Props {
  xp: number;
  level: number;
  onOpenSkillTree?: () => void;
  unlockedSkillsCount?: number;
}

const XpHUD: React.FC<Props> = ({ xp, level, onOpenSkillTree, unlockedSkillsCount = 1 }) => {
  const [displayXp, setDisplayXp] = useState(0);
  
  // XP required for next level (simple linear scaling: 1000 per level)
  const xpForNextLevel = 1000;
  // XP within the current level
  const currentLevelXp = xp % xpForNextLevel;
  const percentage = (currentLevelXp / xpForNextLevel) * 100;

  // Simple calculation for available points: 1 point per level, minus spent.
  // We subtract 1 from spent because the root skill is usually free/default.
  const pointsAvailable = Math.max(0, level - (unlockedSkillsCount - 1));

  useEffect(() => {
    // Smooth counter animation
    const diff = xp - displayXp;
    if (diff === 0) return;
    
    // If it's a huge jump (initial load), just set it to avoid long counting
    if (Math.abs(diff) > 500 && displayXp === 0) {
        setDisplayXp(xp);
        return;
    }

    const step = diff > 0 ? Math.ceil(diff / 10) : Math.floor(diff / 10);
    const timer = requestAnimationFrame(() => {
        setDisplayXp(prev => prev + step);
    });
    return () => cancelAnimationFrame(timer);
  }, [xp, displayXp]);

  return (
    <div className="fixed top-20 right-4 md:top-6 md:right-6 z-50 flex flex-col items-end gap-3 animate-[fadeIn_0.5s_ease-out]">
      <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2 mb-1">
                <span className="font-header text-neon-cyan text-sm tracking-widest shadow-neon-cyan">LVL {level}</span>
                <span className="font-body text-gray-400 text-xs tracking-wider">{displayXp % 1000} / {xpForNextLevel} XP</span>
            </div>
            {/* Bar Container */}
            <div className="w-32 md:w-48 h-2 bg-cyber-black border border-white/20 rounded-full overflow-hidden relative shadow-inner">
                <div 
                    className="h-full bg-gradient-to-r from-blue-600 via-neon-cyan to-white shadow-[0_0_10px_rgba(0,240,255,0.5)] transition-all duration-700 ease-out"
                    style={{ width: `${percentage}%` }}
                >
                    <div className="absolute top-0 right-0 bottom-0 w-[2px] bg-white blur-[1px]"></div>
                </div>
            </div>
          </div>
          
          {/* Hexagon Level Badge */}
          <div className="relative w-12 h-12 flex items-center justify-center group">
            <div className="absolute inset-0 bg-neon-cyan/10 blur-md rounded-full group-hover:bg-neon-cyan/30 transition-all"></div>
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-cyber-black fill-cyber-dark stroke-neon-cyan stroke-2 drop-shadow-lg">
                <polygon points="50 3, 93 25, 93 75, 50 97, 7 75, 7 25" />
            </svg>
            <span className="relative z-10 font-header font-bold text-white text-xl drop-shadow-[0_0_5px_rgba(0,240,255,0.8)]">{level}</span>
          </div>
      </div>

      {/* SKILL TREE BUTTON */}
      {onOpenSkillTree && (
        <button 
          onClick={onOpenSkillTree}
          className={`
            relative flex items-center gap-2 px-3 py-2 rounded-l-lg border-r-0 border border-white/20 
            bg-cyber-black/80 backdrop-blur-md transition-all hover:pr-5 hover:border-neon-cyan/50 hover:bg-white/5 group
            ${pointsAvailable > 0 ? 'border-neon-green/50' : ''}
          `}
        >
            {pointsAvailable > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-neon-green"></span>
                </span>
            )}
            <Brain className={`w-4 h-4 ${pointsAvailable > 0 ? 'text-neon-green' : 'text-gray-400 group-hover:text-neon-cyan'}`} />
            <span className={`font-header text-[10px] tracking-widest ${pointsAvailable > 0 ? 'text-neon-green' : 'text-gray-400 group-hover:text-neon-cyan'}`}>
                NEURAL MAP
            </span>
        </button>
      )}
    </div>
  );
};

export default XpHUD;
