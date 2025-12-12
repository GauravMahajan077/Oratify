
import React, { useState, useEffect, useRef } from 'react';
import { GamePhase, Character } from './types';
import CharacterCreator from './components/CharacterCreator';
import TrainingGym from './components/TrainingGym';
import BossFight from './components/BossFight';
import IntroSequence from './components/IntroSequence'; // IMPORTED
import Logo from './components/ui/Logo'; // IMPORTED
import CursorTrail from './components/ui/CursorTrail';
import XpHUD from './components/ui/XpHUD';
import SkillTree from './components/SkillTree';

// --- HIGH-RES 3D SPACE BACKGROUND ---
const SpaceBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const targetMouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse coordinates (-1 to 1)
      targetMouseRef.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. High-DPI Setup
    const updateSize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };
    window.addEventListener('resize', updateSize);
    updateSize();

    // 2. Scene Configuration
    const starCount = 600;
    const stars = Array.from({ length: starCount }, () => ({
      x: (Math.random() - 0.5) * 3000,
      y: (Math.random() - 0.5) * 3000,
      z: Math.random() * 2000 + 100, // Depth
      size: Math.random() * 1.2 + 0.1,
      opacity: Math.random(),
      twinkleSpeed: (Math.random() - 0.5) * 0.02
    }));

    const planets = [
      { r: 80, size: 3, color: '#ff0055', speed: 0.015, angle: Math.random() * Math.PI * 2, name: 'Mercury' },
      { r: 140, size: 5, color: '#00f0ff', speed: 0.01, angle: Math.random() * Math.PI * 2, name: 'Earth' },
      { r: 210, size: 4, color: '#bc13fe', speed: 0.008, angle: Math.random() * Math.PI * 2, name: 'Mars' },
      { r: 350, size: 12, color: '#ffeb3b', speed: 0.004, angle: Math.random() * Math.PI * 2, hasRing: true }, // Jupiter
      { r: 500, size: 10, color: '#00ff9f', speed: 0.002, angle: Math.random() * Math.PI * 2, hasRing: true }, // Saturn
    ];

    let animationFrameId: number;

    const render = () => {
      // 3. Smooth Camera Movement (Easing)
      mouseRef.current.x += (targetMouseRef.current.x - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (targetMouseRef.current.y - mouseRef.current.y) * 0.05;

      const width = window.innerWidth;
      const height = window.innerHeight;
      const cx = width / 2;
      const cy = height / 2;
      
      // Clear
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, width, height);

      // --- STARFIELD RENDERING ---
      // Parallax effect: Stars move opposite to mouse
      const panX = mouseRef.current.x * 200;
      const panY = mouseRef.current.y * 100;

      stars.forEach(star => {
        // Twinkle
        star.opacity += star.twinkleSpeed;
        if (star.opacity > 1 || star.opacity < 0.2) star.twinkleSpeed *= -1;

        // 3D Projection for Stars
        const fov = 1000;
        const scale = fov / (fov + star.z);
        
        const x2d = (star.x - panX * (1000/star.z)) * scale + cx;
        const y2d = (star.y - panY * (1000/star.z)) * scale + cy;

        if (x2d > 0 && x2d < width && y2d > 0 && y2d < height) {
          ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity * 0.8})`;
          ctx.beginPath();
          ctx.arc(x2d, y2d, star.size * scale, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // --- SOLAR SYSTEM RENDERING ---
      
      // Draw Sun (Glowing Center)
      const sunGradient = ctx.createRadialGradient(cx, cy, 10, cx, cy, 100);
      sunGradient.addColorStop(0, '#ffffff');
      sunGradient.addColorStop(0.1, '#ffd700'); // Gold
      sunGradient.addColorStop(0.4, 'rgba(255, 100, 50, 0.4)'); // Orange Glow
      sunGradient.addColorStop(1, 'rgba(255, 0, 0, 0)'); // Transparent

      ctx.fillStyle = sunGradient;
      ctx.beginPath();
      ctx.arc(cx, cy, 100, 0, Math.PI * 2);
      ctx.fill();
      
      // Core Sun
      ctx.fillStyle = '#fff';
      ctx.shadowBlur = 30;
      ctx.shadowColor = '#ffaa00';
      ctx.beginPath();
      ctx.arc(cx, cy, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // 3D Variables
      const tilt = 0.3 + (mouseRef.current.y * 0.2); // Tilt viewing angle based on mouse Y
      const rotationY = mouseRef.current.x * 0.5; // Rotate system around Y axis based on mouse X
      const fov = 800;

      // Render Orbits First (Background)
      ctx.lineWidth = 1;
      planets.forEach(p => {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.05 + (1 - Math.abs(mouseRef.current.x)) * 0.05})`;
        
        // Draw orbital path as a loop of connected 3D points
        for (let angle = 0; angle <= Math.PI * 2.1; angle += 0.1) {
          const ox = Math.cos(angle) * p.r;
          const oz = Math.sin(angle) * p.r;
          
          // Apply System Rotation
          const rx = ox * Math.cos(rotationY) - oz * Math.sin(rotationY);
          const rz = ox * Math.sin(rotationY) + oz * Math.cos(rotationY);
          
          // Project
          const scale = fov / (fov + rz + 300); // +300 pushes system back slightly
          const screenX = cx + rx * scale;
          const screenY = cy + rz * tilt * scale;
          
          if (angle === 0) ctx.moveTo(screenX, screenY);
          else ctx.lineTo(screenX, screenY);
        }
        ctx.stroke();
      });

      // Render Planets
      const renderQueue: any[] = [];
      planets.forEach(p => {
        p.angle += p.speed;
        
        // Calculate 3D Pos
        const ox = Math.cos(p.angle) * p.r;
        const oz = Math.sin(p.angle) * p.r;

        // Apply Rotation
        const rx = ox * Math.cos(rotationY) - oz * Math.sin(rotationY);
        const rz = ox * Math.sin(rotationY) + oz * Math.cos(rotationY);
        
        // Project
        const scale = fov / (fov + rz + 300);
        const screenX = cx + rx * scale;
        const screenY = cy + rz * tilt * scale;

        renderQueue.push({ ...p, x: screenX, y: screenY, z: rz, scale });
      });

      // Sort by Z depth (Painter's Algorithm)
      renderQueue.sort((a, b) => b.z - a.z);

      renderQueue.forEach(p => {
        const size = p.size * p.scale;
        
        // 1. Planet Body with Radial Gradient (Lighting from Center)
        const grad = ctx.createRadialGradient(
            p.x - size * 0.2, p.y - size * 0.2, 0, 
            p.x, p.y, size
        );
        grad.addColorStop(0, p.color);
        grad.addColorStop(1, '#000000'); // Shadow side

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();

        // 2. Atmosphere / Glow
        ctx.shadowBlur = 15 * p.scale;
        ctx.shadowColor = p.color;
        ctx.strokeStyle = `rgba(255,255,255,0.2)`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 3. Rings
        if (p.hasRing) {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 2 * p.scale;
          // Rings tilt with the planet/view
          ctx.ellipse(p.x, p.y, size * 2.5, size * 0.6, -rotationY, 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', updateSize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0" />;
};

const App = () => {
  const [showIntro, setShowIntro] = useState(true); // Intro State
  const [phase, setPhase] = useState<GamePhase>(GamePhase.CHARACTER_CREATION);
  const [character, setCharacter] = useState<Character | null>(null);
  const [showSkillTree, setShowSkillTree] = useState(false);
  const [sessionKey, setSessionKey] = useState(0); // Force remount on restart

  const handleCharacterComplete = (char: Character) => {
    // Ensure unlockedSkills initialized
    const initializedChar = {
        ...char,
        unlockedSkills: char.unlockedSkills || ['core_uplink']
    };
    setCharacter(initializedChar);
    setPhase(GamePhase.TRAINING_GYM);
  };

  const handleUpdateCharacter = (char: Character) => {
    setCharacter(char);
  };

  const handleTrainingComplete = () => {
    setPhase(GamePhase.BOSS_FIGHT);
  };

  // REPLACES GENERIC 'BACK' - RESETS SESSION ENTIRELY
  const handleRestart = () => {
    if (window.confirm("WARNING: END SESSION?\n\nThis will terminate the current identity and delete all progress.")) {
        setCharacter(null);
        setPhase(GamePhase.CHARACTER_CREATION);
        setShowIntro(true); // Trigger intro sequence again
        setSessionKey(prev => prev + 1); // Force complete remount of children
    }
  };

  const handleBackToGym = () => {
    // Allows retreating from Boss to Gym without losing identity
    setPhase(GamePhase.TRAINING_GYM);
  };

  return (
    <div className="min-h-screen bg-cyber-black text-gray-200 font-body overflow-x-hidden relative selection:bg-neon-cyan selection:text-black flex flex-col">
      
      {/* GLOBAL CRT SCANLINES & VIGNETTE */}
      <div className="scanline-overlay"></div>

      {/* GLOWING CURSOR TRAIL */}
      <CursorTrail />

      {/* 3D HIGH-RES INTERACTIVE SOLAR SYSTEM BACKGROUND */}
      <SpaceBackground />

      {/* INTRO SEQUENCE OVERLAY */}
      {showIntro && (
         <IntroSequence onComplete={() => setShowIntro(false)} />
      )}

      {/* ANIMATED RETRO GRID OVERLAY */}
      <div className="fixed inset-0 z-0 pointer-events-none perspective-500 overflow-hidden">
        <div 
          className="absolute inset-[-100%] opacity-[0.08]"
          style={{
            backgroundImage: 'linear-gradient(rgba(0, 240, 255, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.4) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            animation: 'grid-scroll 20s linear infinite',
            transformOrigin: 'top center',
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 40%, black 80%, transparent 100%)'
          }}
        ></div>
      </div>

      {/* MAIN CONTENT */}
      {!showIntro && (
        <>
            {/* XP HUD */}
            {character && phase !== GamePhase.CHARACTER_CREATION && (
                <XpHUD 
                   xp={character.xp} 
                   level={character.level} 
                   onOpenSkillTree={() => setShowSkillTree(true)}
                   unlockedSkillsCount={character.unlockedSkills?.length}
                />
            )}

            {/* SKILL TREE OVERLAY */}
            {showSkillTree && character && (
                <SkillTree 
                    character={character} 
                    onUpdateCharacter={handleUpdateCharacter} 
                    onClose={() => setShowSkillTree(false)} 
                />
            )}

            {/* --- MAIN APP --- */}
            <div className={`relative z-10 w-full max-w-7xl mx-auto px-4 md:px-6 flex-1 flex flex-col transition-opacity duration-300 ${showSkillTree ? 'opacity-20 blur-sm pointer-events-none' : 'opacity-100'}`}>
                {/* Professional Navbar */}
                <header className="py-6 flex justify-between items-center mb-4 animate-fade-in relative z-50">
                  <Logo className="h-10 md:h-12" animated />
                </header>

                <main className="transition-all duration-700 flex-1 flex flex-col relative">
                  {phase === GamePhase.CHARACTER_CREATION && (
                    <CharacterCreator 
                        key={sessionKey}
                        onComplete={handleCharacterComplete} 
                        onRestart={handleRestart}
                    />
                  )}
                  
                  {phase === GamePhase.TRAINING_GYM && character && (
                    <TrainingGym 
                        key={sessionKey}
                        character={character} 
                        onNext={handleTrainingComplete} 
                        onUpdateCharacter={handleUpdateCharacter}
                        onRestart={handleRestart} // Use Restart logic
                    />
                  )}

                  {phase === GamePhase.BOSS_FIGHT && character && (
                    <BossFight 
                        key={sessionKey}
                        character={character} 
                        onBack={handleBackToGym} // Can go back to Gym
                        onRestart={handleRestart} // Can Abort session
                    />
                  )}
                </main>
            </div>

            {/* Phase Indicator */}
            <div className="fixed bottom-6 left-6 z-40 hidden md:flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-full px-4 py-2 border border-white/10 shadow-lg animate-fade-in">
                <StepIndicator label="Setup" active={phase === GamePhase.CHARACTER_CREATION} completed={phase !== GamePhase.CHARACTER_CREATION} />
                <div className="w-6 h-[1px] bg-white/10"></div>
                <StepIndicator label="Training" active={phase === GamePhase.TRAINING_GYM} completed={phase === GamePhase.BOSS_FIGHT} />
                <div className="w-6 h-[1px] bg-white/10"></div>
                <StepIndicator label="Interview" active={phase === GamePhase.BOSS_FIGHT} completed={false} />
            </div>

            {/* Footer */}
            <div className="fixed bottom-4 right-6 font-header text-[10px] text-gray-700 z-50 flex items-center gap-2 animate-fade-in">
               <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
               SYSTEM ONLINE v2.1
            </div>
        </>
      )}
    </div>
  );
};

const StepIndicator = ({ label, active, completed }: { label: string, active: boolean, completed: boolean }) => (
  <div className={`flex items-center gap-2 ${active ? 'text-neon-cyan' : completed ? 'text-green-500' : 'text-gray-600'}`}>
    <div className={`w-2 h-2 rounded-full ${active ? 'bg-neon-cyan shadow-[0_0_8px_rgba(0,240,255,0.8)]' : completed ? 'bg-green-500' : 'bg-gray-700'}`}></div>
    <span className="font-header text-xs uppercase tracking-wider">{label}</span>
  </div>
);

export default App;
