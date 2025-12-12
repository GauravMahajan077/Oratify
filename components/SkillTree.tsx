
import React, { useState, useMemo } from 'react';
import PixelCard from './ui/PixelCard';
import PixelButton from './ui/PixelButton';
import { Character } from '../types';
import { Brain, Shield, Zap, Mic, Volume2, BookOpen, Lock, Check, X } from 'lucide-react';
import { playSuccess, playClick, playHover, playError } from '../utils/audio';

interface Skill {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  x: number; // Percent 0-100
  y: number; // Percent 0-100
  cost: number;
  dependencies: string[];
  branch: 'core' | 'defense' | 'offense' | 'utility';
}

const ActivityIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
);

const SKILLS: Skill[] = [
  // CENTER
  { id: 'core_uplink', name: 'Neural Uplink', description: 'Basic connection established. Required for all upgrades.', icon: <Zap />, x: 50, y: 50, cost: 0, dependencies: [], branch: 'core' },
  
  // TOP LEFT (Defense)
  { id: 'iron_mind', name: 'Iron Mind', description: '+20 Max HP in Interview Battles.', icon: <Shield />, x: 30, y: 30, cost: 1, dependencies: ['core_uplink'], branch: 'defense' },
  { id: 'resilience', name: 'Resilience Protocol', description: 'Recover 5 HP per turn during silence.', icon: <ActivityIcon />, x: 20, y: 15, cost: 1, dependencies: ['iron_mind'], branch: 'defense' },
  
  // TOP RIGHT (Offense/Vocab)
  { id: 'vocab_matrix', name: 'Vocab Matrix', description: 'Unlocks advanced synonym suggestions in Training.', icon: <BookOpen />, x: 70, y: 30, cost: 1, dependencies: ['core_uplink'], branch: 'offense' },
  { id: 'eloquence', name: 'Eloquence Engine', description: 'Bonus XP for complex sentences.', icon: <Mic />, x: 80, y: 15, cost: 1, dependencies: ['vocab_matrix'], branch: 'offense' },

  // BOTTOM (Utility/Tone)
  { id: 'tone_analyzer', name: 'Tone Analyzer', description: 'Real-time tone feedback during Boss Fights.', icon: <Volume2 />, x: 50, y: 75, cost: 1, dependencies: ['core_uplink'], branch: 'utility' },
  { id: 'empathy_core', name: 'Empathy Core', description: 'Reduces damage taken from HR Persona by 50%.', icon: <Brain />, x: 50, y: 90, cost: 1, dependencies: ['tone_analyzer'], branch: 'utility' },
];

interface Props {
  character: Character;
  onUpdateCharacter: (char: Character) => void;
  onClose: () => void;
}

const SkillTree: React.FC<Props> = ({ character, onUpdateCharacter, onClose }) => {
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);

  const unlockedSkills = character.unlockedSkills || ['core_uplink'];
  const skillPointsTotal = character.level; // Simple 1 level = 1 point logic (excluding free core)
  const skillPointsSpent = unlockedSkills.length - 1; // Subtract 1 for free core
  const availablePoints = Math.max(0, skillPointsTotal - skillPointsSpent);

  const handleUnlock = () => {
    if (!selectedSkillId) return;
    const skill = SKILLS.find(s => s.id === selectedSkillId);
    if (!skill) return;

    if (availablePoints >= skill.cost) {
      playSuccess();
      onUpdateCharacter({
        ...character,
        unlockedSkills: [...unlockedSkills, skill.id]
      });
    } else {
      playError();
    }
  };

  const getStatus = (skill: Skill) => {
    if (unlockedSkills.includes(skill.id)) return 'unlocked';
    const parentsUnlocked = skill.dependencies.every(d => unlockedSkills.includes(d));
    if (parentsUnlocked) return 'available';
    return 'locked';
  };

  const selectedSkill = SKILLS.find(s => s.id === selectedSkillId);
  const selectedStatus = selectedSkill ? getStatus(selectedSkill) : null;

  return (
    <div className="fixed inset-0 z-[60] bg-cyber-black/95 backdrop-blur-sm flex items-center justify-center animate-fade-in">
      
      {/* BACKGROUND GRID */}
      <div className="absolute inset-0 pointer-events-none opacity-20" 
           style={{ backgroundImage: 'radial-gradient(circle, #1a1d24 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      </div>

      <div className="relative w-full max-w-5xl h-[90vh] flex flex-col md:flex-row gap-4 p-4">
        
        {/* MAIN TREE VISUALIZATION */}
        <div className="flex-1 bg-cyber-dark/50 border border-white/10 rounded-xl relative overflow-hidden shadow-2xl group">
             
             {/* Header */}
             <div className="absolute top-4 left-4 z-10">
                 <h2 className="text-2xl font-header text-white flex items-center gap-2">
                     <Brain className="text-neon-cyan" />
                     NEURAL MAP
                 </h2>
                 <p className="text-gray-400 font-body text-sm">OPTIMIZE COGNITIVE FUNCTIONS</p>
             </div>

             <div className="absolute top-4 right-4 z-10 flex flex-col items-end">
                 <div className="text-3xl font-header text-neon-green drop-shadow-[0_0_10px_rgba(0,255,159,0.5)]">
                     {availablePoints}
                 </div>
                 <div className="text-xs font-header text-gray-400 tracking-widest">AVAILABLE POINTS</div>
             </div>

             {/* CANVAS AREA */}
             <div className="w-full h-full relative" onClick={() => setSelectedSkillId(null)}>
                
                {/* SVG CONNECTIONS */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    {SKILLS.map(skill => {
                        return skill.dependencies.map(depId => {
                            const parent = SKILLS.find(s => s.id === depId);
                            if (!parent) return null;
                            
                            const isPathActive = unlockedSkills.includes(skill.id) && unlockedSkills.includes(parent.id);
                            const isPathAvailable = !unlockedSkills.includes(skill.id) && unlockedSkills.includes(parent.id);
                            
                            return (
                                <g key={`${parent.id}-${skill.id}`}>
                                    {/* Base Line */}
                                    <line 
                                        x1={`${parent.x}%`} y1={`${parent.y}%`} 
                                        x2={`${skill.x}%`} y2={`${skill.y}%`} 
                                        stroke="#1a1d24" 
                                        strokeWidth="4" 
                                    />
                                    {/* Active/Glowing Line */}
                                    <line 
                                        x1={`${parent.x}%`} y1={`${parent.y}%`} 
                                        x2={`${skill.x}%`} y2={`${skill.y}%`} 
                                        stroke={isPathActive ? '#00f0ff' : isPathAvailable ? '#ffffff' : 'transparent'} 
                                        strokeWidth="2"
                                        strokeOpacity={isPathAvailable ? 0.2 : 1}
                                        className={isPathActive ? 'drop-shadow-[0_0_5px_#00f0ff]' : ''}
                                        strokeDasharray={isPathAvailable ? "5,5" : "none"}
                                    />
                                </g>
                            );
                        });
                    })}
                </svg>

                {/* NODES */}
                {SKILLS.map(skill => {
                    const status = getStatus(skill);
                    const isSelected = selectedSkillId === skill.id;
                    
                    let bgClass = "bg-cyber-gray border-gray-700 text-gray-500";
                    let glowClass = "";

                    if (status === 'unlocked') {
                        bgClass = "bg-neon-cyan/20 border-neon-cyan text-white";
                        glowClass = "shadow-[0_0_20px_rgba(0,240,255,0.4)]";
                    } else if (status === 'available') {
                        bgClass = "bg-white/10 border-white text-white hover:bg-white/20";
                        glowClass = "animate-pulse";
                    }

                    if (isSelected) {
                        glowClass += " ring-2 ring-white scale-110";
                    }

                    return (
                        <button
                            key={skill.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                playClick();
                                setSelectedSkillId(skill.id);
                            }}
                            className={`
                                absolute w-12 h-12 md:w-16 md:h-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 
                                flex items-center justify-center transition-all duration-300 z-20
                                ${bgClass} ${glowClass}
                            `}
                            style={{ left: `${skill.x}%`, top: `${skill.y}%` }}
                            onMouseEnter={() => playHover()}
                        >
                            <div className="w-5 h-5 md:w-6 md:h-6">{skill.icon}</div>
                            {status === 'locked' && (
                                <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                                    <Lock className="w-4 h-4 text-gray-500" />
                                </div>
                            )}
                        </button>
                    );
                })}

             </div>
        </div>

        {/* SIDEBAR DETAILS */}
        <div className="w-full md:w-80 flex flex-col gap-4">
            <PixelCard className="h-full flex flex-col" title="NODE DETAILS">
                {selectedSkill ? (
                    <div className="flex-1 flex flex-col items-center text-center space-y-6 animate-fade-in">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center border-2 mb-4
                            ${getStatus(selectedSkill) === 'unlocked' ? 'bg-neon-cyan/20 border-neon-cyan text-white shadow-[0_0_20px_rgba(0,240,255,0.3)]' : 'bg-cyber-gray border-gray-600 text-gray-400'}
                        `}>
                            <div className="w-10 h-10">{selectedSkill.icon}</div>
                        </div>
                        
                        <div>
                            <h3 className="text-xl font-header text-white mb-2">{selectedSkill.name}</h3>
                            <p className="text-gray-400 font-body leading-relaxed text-sm">
                                {selectedSkill.description}
                            </p>
                        </div>

                        <div className="w-full pt-6 border-t border-white/10 mt-auto">
                            <div className="flex justify-between items-center mb-4 text-xs font-header tracking-widest">
                                <span>STATUS</span>
                                <span className={
                                    getStatus(selectedSkill) === 'unlocked' ? 'text-neon-cyan' : 
                                    getStatus(selectedSkill) === 'available' ? 'text-white' : 'text-red-500'
                                }>
                                    {getStatus(selectedSkill).toUpperCase()}
                                </span>
                            </div>
                            
                            {getStatus(selectedSkill) === 'available' && (
                                <PixelButton 
                                    label={`UNLOCK (-${selectedSkill.cost} PT)`} 
                                    variant="success" 
                                    onClick={handleUnlock}
                                    disabled={availablePoints < selectedSkill.cost}
                                    className="w-full"
                                    icon={<Zap />}
                                />
                            )}
                            
                            {getStatus(selectedSkill) === 'unlocked' && (
                                <div className="py-3 w-full border border-neon-cyan/30 bg-neon-cyan/10 rounded text-neon-cyan font-header text-sm flex items-center justify-center gap-2">
                                    <Check className="w-4 h-4" /> INSTALLED
                                </div>
                            )}

                             {getStatus(selectedSkill) === 'locked' && (
                                <div className="py-3 w-full border border-white/10 bg-black/30 rounded text-gray-500 font-header text-sm flex items-center justify-center gap-2">
                                    <Lock className="w-4 h-4" /> LOCKED
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 opacity-50">
                        <Brain className="w-16 h-16 mb-4" />
                        <p className="font-header text-sm tracking-widest">SELECT A NODE</p>
                    </div>
                )}
            </PixelCard>
            
            <PixelButton 
                label="CLOSE INTERFACE" 
                variant="outline" 
                onClick={onClose}
                icon={<X />}
            />
        </div>

      </div>
    </div>
  );
};

export default SkillTree;
