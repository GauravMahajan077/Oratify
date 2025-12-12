
import React, { useState, useEffect } from 'react';
import PixelButton from './ui/PixelButton';
import TypewriterText from './ui/TypewriterText';
import Logo from './ui/Logo';
import { playTypewriterClick, playSuccess, playError } from '../utils/audio';
import { ShieldAlert, Brain, ChevronRight, SkipForward } from 'lucide-react';

interface Props {
  onComplete: () => void;
}

const IntroSequence: React.FC<Props> = ({ onComplete }) => {
  const [scene, setScene] = useState(0);
  const [showButton, setShowButton] = useState(false);

  // Auto-advance logic for specific scenes
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    
    // Scene durations
    const durations = [4000, 6000, 7000, 0]; // 0 means manual advance (Final scene)

    if (scene < 3) {
      // Play sound on scene change
      if (scene === 0) playTypewriterClick();
      if (scene === 1) playError(); // Alert sound
      if (scene === 2) playSuccess(); // Insight sound

      timer = setTimeout(() => {
        setScene(prev => prev + 1);
      }, durations[scene]);
    } else {
      // Final scene: show button after delay
      setTimeout(() => setShowButton(true), 1000);
    }

    return () => clearTimeout(timer);
  }, [scene]);

  const handleStart = () => {
    playSuccess();
    onComplete();
  };

  const renderScene = () => {
    switch (scene) {
      case 0: // Boot Sequence
        return (
          <div className="text-center space-y-4 animate-fade-in">
             <div className="w-16 h-16 mx-auto border-4 border-t-transparent border-neon-cyan rounded-full animate-spin"></div>
             <h1 className="text-3xl font-header tracking-[0.2em] text-neon-cyan">
               <TypewriterText text="INITIALIZING NEURAL LINK..." speed={50} />
             </h1>
             <p className="font-mono text-xs text-gray-500">v2.4.1 Secure Connection</p>
          </div>
        );
      case 1: // The Problem (Glossophobia)
        return (
          <div className="max-w-2xl text-center space-y-6 animate-fade-in">
             <ShieldAlert className="w-20 h-20 text-red-500 mx-auto animate-pulse" />
             <h2 className="text-4xl font-header text-red-500 tracking-widest">
               <TypewriterText text="CRITICAL ALERT: GLOSSOPHOBIA" speed={30} />
             </h2>
             <div className="bg-red-900/20 border border-red-500/50 p-6 rounded-xl backdrop-blur-md">
               <p className="font-body text-xl text-gray-200 leading-relaxed">
                 "75% of the global population suffers from speech anxiety. It is the single biggest blocker to career ascension."
               </p>
               <div className="mt-4 text-xs font-mono text-red-400 uppercase">- National Institute of Mental Health</div>
             </div>
          </div>
        );
      case 2: // The Value (Soft Skills)
        return (
          <div className="max-w-2xl text-center space-y-6 animate-fade-in">
             <Brain className="w-20 h-20 text-neon-green mx-auto animate-float" />
             <h2 className="text-4xl font-header text-neon-green tracking-widest">
               <TypewriterText text="DATA INSIGHT: THE 85% RULE" speed={30} />
             </h2>
             <div className="bg-green-900/20 border border-green-500/50 p-6 rounded-xl backdrop-blur-md">
               <p className="font-body text-xl text-gray-200 leading-relaxed">
                 "85% of job success comes from well-developed soft skills and people engineering. Only 15% comes from technical skills."
               </p>
               <div className="mt-4 text-xs font-mono text-green-400 uppercase">- Harvard University / Carnegie Foundation</div>
             </div>
          </div>
        );
      case 3: // The Solution (Oratify)
        return (
          <div className="max-w-3xl text-center space-y-8 animate-fade-in flex flex-col items-center">
             <div className="scale-150 mb-8">
               <Logo className="h-24" animated />
             </div>

             <div className="bg-cyber-black/80 border border-white/10 p-6 rounded-xl max-w-xl mx-auto">
               <p className="font-body text-lg text-gray-300 leading-relaxed">
                 <TypewriterText 
                    text="Welcome to the Simulation, Agent. Here, you will face AI-driven personas in high-stakes conversation battles. Level up your confidence, analyze your voice metrics, and master the art of persuasion." 
                    speed={20} 
                 />
               </p>
             </div>

             {showButton && (
               <div className="animate-[fadeIn_1s_ease-out]">
                  <PixelButton 
                    label="ENTER SIMULATION" 
                    variant="primary" 
                    onClick={handleStart}
                    icon={<ChevronRight />}
                    className="w-64 text-lg py-4 mx-auto shadow-[0_0_30px_rgba(0,240,255,0.4)]"
                  />
               </div>
             )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 text-white p-4">
      {/* Cinematic Letterbox Bars */}
      <div className="absolute top-0 left-0 w-full h-[10vh] bg-black z-10"></div>
      <div className="absolute bottom-0 left-0 w-full h-[10vh] bg-black z-10"></div>

      {/* Skip Button */}
      {scene < 3 && (
        <button 
          onClick={() => setScene(3)}
          className="absolute top-[12vh] right-8 text-gray-600 hover:text-white flex items-center gap-2 font-header text-xs tracking-widest transition-colors z-20"
        >
          SKIP INTRO <SkipForward className="w-4 h-4" />
        </button>
      )}

      {/* Scene Content */}
      <div className="relative z-0 w-full flex items-center justify-center min-h-[50vh]">
        {renderScene()}
      </div>

      {/* Progress Indicators */}
      <div className="absolute bottom-[12vh] flex gap-2">
        {[0, 1, 2, 3].map(i => (
          <div 
            key={i} 
            className={`h-1 rounded-full transition-all duration-500 ${i === scene ? 'w-8 bg-neon-cyan' : i < scene ? 'w-2 bg-gray-600' : 'w-2 bg-gray-800'}`}
          />
        ))}
      </div>

      {/* Scanline Overlay (Local) */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>
    </div>
  );
};

export default IntroSequence;
