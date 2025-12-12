
import React, { useState, useEffect, useRef } from 'react';
import PixelCard from './ui/PixelCard';
import PixelButton from './ui/PixelButton';
import PixelBar from './ui/PixelBar';
import TypewriterText from './ui/TypewriterText';
import { Character, AnalysisStats } from '../types';
import { Mic, Square, Play, ArrowRight, ShieldAlert, Languages, Repeat, Volume2, Sparkles, TrendingUp, RotateCcw } from 'lucide-react';
import { analyzeTrainingData } from '../services/geminiService';
import { playSuccess } from '../utils/audio';

interface Props {
  character: Character;
  onNext: () => void;
  onUpdateCharacter: (char: Character) => void;
  onRestart: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const TrainingGym: React.FC<Props> = ({ character, onNext, onUpdateCharacter, onRestart }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [language, setLanguage] = useState<'en-US' | 'hi-IN'>('en-US');
  const [stats, setStats] = useState<AnalysisStats | null>(null);
  const [xpGained, setXpGained] = useState<number>(0);
  const [difficulty, setDifficulty] = useState<'LENIENT' | 'NORMAL' | 'STRICT'>('NORMAL');
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
    }
  }, []);

  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = language;
    }
  }, [language]);

  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onresult = (event: any) => {
        const currentText = Array.from(event.results)
           .map((result: any) => result[0].transcript)
           .join(' ');
        setTranscript(currentText);
      };
    }
  }, [recognitionRef.current]);

  const startRecording = () => {
    if (!recognitionRef.current) {
      alert("Speech Recognition not supported. Try Chrome.");
      return;
    }
    setTranscript('');
    setStats(null);
    setXpGained(0);
    setIsRecording(true);
    recognitionRef.current.start();
  };

  const stopRecording = async () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsRecording(false);
    setAnalyzing(true);
    
    // Analyze using current difficulty
    const result = await analyzeTrainingData(transcript, language, difficulty);
    setStats(result);

    // Calculate XP based on score
    // Base 50 for completing, + up to 200 based on score
    const earnedXp = 50 + Math.round((result.nativeScore || 0) * 2);
    setXpGained(earnedXp);
    
    // Update Character
    const newXp = character.xp + earnedXp;
    const newLevel = Math.floor(newXp / 1000) + 1;
    onUpdateCharacter({
        ...character,
        xp: newXp,
        level: newLevel
    });

    playSuccess();
    setAnalyzing(false);

    // ADAPTIVE DIFFICULTY UPDATE FOR NEXT ROUND
    if (result.nativeScore > 80) setDifficulty('STRICT');
    else if (result.nativeScore < 50) setDifficulty('LENIENT');
    else setDifficulty('NORMAL');
  };

  const loadDemoData = () => {
    const demoText = language === 'en-US' 
      ? "I will do the needful regarding the project prepone request. Basically, I have doubts about the logic."
      : "Main koshish karunga ki project time pe khatam ho jaye, par thoda doubt hai.";
      
    setTranscript(demoText);
    setAnalyzing(true);
    setXpGained(0);
    setTimeout(async () => {
       const result = await analyzeTrainingData(demoText, language, difficulty);
       setStats(result);
       
       const earnedXp = 100; // Fixed for demo
       setXpGained(earnedXp);
       const newXp = character.xp + earnedXp;
       const newLevel = Math.floor(newXp / 1000) + 1;
       onUpdateCharacter({
           ...character,
           xp: newXp,
           level: newLevel
       });
       playSuccess();

       // Demo adaption
       setDifficulty('NORMAL');

       setAnalyzing(false);
    }, 1500);
  };

  // Modern SVG Gauge
  const renderMeter = (score: number) => {
    const radius = 90;
    const stroke = 12;
    const normalizedScore = Math.min(100, Math.max(0, score));
    
    // We want a semi-circle (180 degrees), so circumference is PI * r
    const arcLength = Math.PI * radius;
    const strokeDashoffset = arcLength - (normalizedScore / 100) * arcLength;
    
    // Score label text
    let label = "Beginner";
    if (score > 40) label = "Intermediate";
    if (score > 60) label = "Advanced";
    if (score > 85) label = "Native-Like";

    return (
      <div className="relative flex flex-col items-center justify-center mt-4 mb-8">
        {/* Glow effect behind the meter */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-neon-cyan/20 blur-3xl rounded-full pointer-events-none"></div>

        <svg width="240" height="130" className="overflow-visible">
          <defs>
            <linearGradient id="meterGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2563eb" /> {/* Blue */}
              <stop offset="50%" stopColor="#00f0ff" /> {/* Cyan */}
              <stop offset="100%" stopColor="#00ff9f" /> {/* Green */}
            </linearGradient>
          </defs>
          
          {/* Background Arc */}
          <path 
            d="M 20 120 A 100 100 0 0 1 220 120" 
            fill="none" 
            stroke="#1a1d24" 
            strokeWidth={stroke} 
            strokeLinecap="round"
          />
          
          {/* Value Arc */}
          <path 
            d="M 20 120 A 100 100 0 0 1 220 120" 
            fill="none" 
            stroke="url(#meterGradient)" 
            strokeWidth={stroke} 
            strokeLinecap="round"
            strokeDasharray={arcLength}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1500 ease-out"
            style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
          />
        </svg>

        <div className="absolute top-[60px] flex flex-col items-center">
            <span className="font-header text-5xl font-bold text-white drop-shadow-[0_0_10px_rgba(0,240,255,0.5)]">
              {score}%
            </span>
            <span className="font-body text-neon-cyan uppercase tracking-[0.2em] text-sm mt-1">
              {label}
            </span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center w-full max-w-5xl mx-auto space-y-6 animate-fade-in p-4 relative z-10">
      
      {/* Restart/Abort Button */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 hidden lg:flex">
          <button 
            onClick={onRestart}
            className="text-gray-500 hover:text-red-500 flex items-center gap-2 font-header text-xs transition-colors bg-black/50 backdrop-blur rounded-full px-4 py-2 border border-white/10 hover:border-red-500/50"
          >
              <RotateCcw className="w-4 h-4" /> ABORT SESSION
          </button>
      </div>

      {/* LANGUAGE & DIFFICULTY SELECTOR */}
      <div className="absolute top-0 right-0 z-20 hidden lg:flex gap-4 items-center">
        {/* Difficulty Badge */}
        <div className={`
             flex items-center gap-2 px-3 py-1 rounded-full border bg-black/50 backdrop-blur transition-all duration-500
             ${difficulty === 'STRICT' ? 'border-red-500/50 text-red-400' : difficulty === 'LENIENT' ? 'border-green-500/50 text-green-400' : 'border-blue-500/50 text-blue-400'}
        `}>
           <TrendingUp className="w-4 h-4" />
           <span className="font-header text-xs tracking-widest uppercase">RUBRIC: {difficulty}</span>
        </div>

        <div className="flex gap-2 bg-black/50 backdrop-blur rounded-full p-1 border border-white/10">
           <button 
             onClick={() => setLanguage('en-US')}
             className={`px-4 py-1 rounded-full text-sm font-header transition-all ${language === 'en-US' ? 'bg-neon-cyan text-black shadow-[0_0_10px_rgba(0,240,255,0.5)]' : 'text-gray-400 hover:text-white'}`}
           >
             ENG (US)
           </button>
           <button 
             onClick={() => setLanguage('hi-IN')}
             className={`px-4 py-1 rounded-full text-sm font-header transition-all ${language === 'hi-IN' ? 'bg-neon-green text-black shadow-[0_0_10px_rgba(0,255,159,0.5)]' : 'text-gray-400 hover:text-white'}`}
           >
             HINDI
           </button>
        </div>
      </div>

      {/* FLOATING XP NOTIFICATION */}
      {xpGained > 0 && (
         <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none animate-[float_2s_ease-out_forwards]">
            <div className="text-6xl font-header font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-neon-green drop-shadow-[0_0_30px_rgba(0,255,159,0.8)] flex flex-col items-center">
                <span>+{xpGained} XP</span>
                <span className="text-sm font-body text-white tracking-widest mt-2 uppercase">Analysis Complete</span>
            </div>
         </div>
      )}

      {!stats && !analyzing ? (
        /* IDLE / RECORDING STATE */
        <div className="w-full flex flex-col items-center justify-center min-h-[60vh] gap-10">
           
           {/* THE GURU AVATAR CONTAINER */}
           <div className="relative group">
              <div className="relative w-64 h-64 rounded-full p-1 bg-gradient-to-b from-gray-700 to-black overflow-visible">
                 <div className="absolute inset-0 rounded-full border border-neon-cyan/30 animate-pulse-slow"></div>
                 <div className="absolute -inset-4 rounded-full border border-dashed border-white/10 animate-[spin_10s_linear_infinite]"></div>
                 
                 <div className="w-full h-full rounded-full overflow-hidden relative bg-black">
                     {/* Guru Image */}
                     <img 
                        src="https://api.dicebear.com/9.x/avataaars/svg?seed=Guru&backgroundColor=b6e3f4" 
                        alt="Guru" 
                        className={`w-full h-full object-cover transition-transform duration-500 ${isRecording ? 'scale-110' : 'scale-100'}`}
                     />
                     {/* Hologram Overlay */}
                     <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neon-cyan/5 to-transparent pointer-events-none mix-blend-overlay"></div>
                     <div className="absolute inset-0 bg-[url('https://media.istockphoto.com/id/175425667/photo/tv-static.jpg?s=1024x1024&w=is&k=20&c=P_g8R2g0uR0y_fJ2u-5v0_9k0_0-0-0-0-0')] opacity-[0.05] pointer-events-none"></div>
                 </div>

                 {isRecording && (
                   <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-red-600/90 text-white font-header text-xs px-4 py-1 rounded-full border border-red-400 animate-pulse shadow-neon-pink">
                      LISTENING...
                   </div>
                 )}
              </div>
           </div>

           <div className="text-center space-y-3 max-w-lg relative">
              <h2 className="font-header text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-500">
                 {language === 'en-US' ? 'NATIVE METER' : 'PRONUNCIATION CHECK'}
              </h2>
              <p className="font-body text-gray-400 text-lg tracking-wide">
                 Speak naturally for 30 seconds. The AI Guru will analyze your accent, flow, and confidence.
              </p>
           </div>

           {/* Transcript Preview */}
           <div className={`w-full max-w-2xl transition-all duration-300 ${transcript ? 'opacity-100' : 'opacity-0 h-0'}`}>
              <div className="glass-panel p-4 rounded-xl text-center">
                <p className="font-body text-xl text-neon-cyan/90 leading-relaxed">
                   "{transcript}"
                   {isRecording && <span className="animate-pulse">|</span>}
                </p>
              </div>
           </div>

           <div className="flex gap-4 w-full max-w-md">
              {!isRecording ? (
                 <>
                   <PixelButton 
                      label="TEST MY ACCENT" 
                      variant="success" 
                      onClick={startRecording}
                      icon={<Mic />}
                      className="flex-1"
                   />
                   <PixelButton 
                      label="DEMO MODE" 
                      variant="outline"
                      onClick={loadDemoData}
                      icon={<Play />}
                   />
                 </>
              ) : (
                 <PixelButton 
                    label="ANALYZE RESULTS" 
                    variant="danger" 
                    onClick={stopRecording}
                    icon={<Square />}
                    className="w-full"
                 />
              )}
           </div>
        </div>
      ) : (
        /* ANALYSIS RESULT STATE */
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
           
           {/* LEFT COLUMN: METER & STATS (5 cols) */}
           <div className="lg:col-span-5 space-y-6">
               <PixelCard className="h-full flex flex-col items-center bg-cyber-dark/80 backdrop-blur-xl border-white/5">
                   {analyzing ? (
                       <div className="flex flex-col items-center justify-center py-20 space-y-6">
                           <div className="relative w-20 h-20">
                              <div className="absolute inset-0 rounded-full border-t-2 border-neon-cyan animate-spin"></div>
                              <div className="absolute inset-2 rounded-full border-r-2 border-neon-purple animate-spin" style={{animationDirection: 'reverse'}}></div>
                           </div>
                           <p className="font-header text-sm text-neon-cyan tracking-widest animate-pulse">DECODING VOICE DNA...</p>
                       </div>
                   ) : (
                       <>
                           <div className="text-center w-full pb-4 border-b border-white/5">
                               <h3 className="font-header text-white text-lg tracking-widest">NATIVE METER</h3>
                               <p className="font-body text-gray-500 text-sm mt-1">
                                   Comparison to Native Speaker
                               </p>
                           </div>

                           {renderMeter(stats?.nativeScore || 0)}

                           <div className="w-full space-y-5 px-2">
                               <h4 className="font-header text-xs text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                  <Sparkles className="w-4 h-4 text-neon-purple" />
                                  SKILL DNA
                               </h4>
                               
                               <PixelBar 
                                  label="Grammar" 
                                  value={stats?.skillDna.grammar || 0} 
                                  color="" 
                                  barColorClass="bg-gradient-to-r from-blue-600 to-cyan-400" 
                               />
                               <PixelBar 
                                  label="Vocabulary" 
                                  value={stats?.skillDna.vocabulary || 0} 
                                  color="" 
                                  barColorClass="bg-gradient-to-r from-purple-600 to-pink-500" 
                               />
                               <PixelBar 
                                  label="Tone / Soft Skills" 
                                  value={stats?.skillDna.tone || 0} 
                                  color="" 
                                  barColorClass="bg-gradient-to-r from-orange-500 to-yellow-400" 
                               />
                           </div>
                       </>
                   )}
               </PixelCard>
           </div>

           {/* RIGHT COLUMN: IMPROVEMENTS (7 cols) */}
           <div className="lg:col-span-7 space-y-6">
               {analyzing ? (
                   <div className="h-full glass-panel rounded-2xl flex items-center justify-center p-12">
                       <p className="font-body text-gray-500 animate-pulse">Scanning phonemes and syntax patterns...</p>
                   </div>
               ) : (
                   <div className="flex flex-col h-full">
                       <div className="bg-gradient-to-r from-cyber-gray to-transparent p-4 rounded-t-xl border border-white/10 border-b-0">
                           <h3 className="font-header text-white text-lg flex items-center gap-2">
                             <Volume2 className="w-5 h-5 text-neon-green" />
                             HOW TO SOUND MORE {language === 'en-US' ? 'NATIVE' : 'NATURAL'}
                           </h3>
                           <p className="font-body text-gray-400 text-sm mt-1">
                               Specific adjustments to improve your professional presence.
                           </p>
                       </div>

                       <div className="flex-1 space-y-3 bg-cyber-black/50 p-4 border border-white/10 rounded-b-xl">
                           {stats?.tips.map((tip, idx) => (
                               <div key={idx} className="group relative bg-cyber-gray/50 hover:bg-cyber-gray border border-white/5 hover:border-neon-cyan/30 rounded-lg p-5 transition-all duration-300">
                                   <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                       
                                       {/* Issue */}
                                       <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-header text-red-400 bg-red-900/20 px-2 py-0.5 rounded uppercase">Avoid</span>
                                          </div>
                                          <p className="font-body text-lg text-gray-300 line-through decoration-red-500/50 decoration-2">
                                            "{tip.original}"
                                          </p>
                                       </div>

                                       <ArrowRight className="hidden md:block w-5 h-5 text-gray-600 group-hover:text-neon-cyan transition-colors" />

                                       {/* Suggestion */}
                                       <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-header text-green-400 bg-green-900/20 px-2 py-0.5 rounded uppercase">Better</span>
                                          </div>
                                          <div className="font-body text-lg text-neon-green font-medium">
                                            "<TypewriterText text={tip.suggestion} speed={40} startDelay={idx * 500} />"
                                          </div>
                                       </div>
                                   </div>
                                   
                                   <div className="mt-3 pt-3 border-t border-white/5 flex items-start gap-2">
                                      <div className="mt-0.5 w-1 h-1 bg-neon-cyan rounded-full"></div>
                                      <div className="text-sm font-body text-gray-400 italic">
                                         <TypewriterText text={tip.reason} speed={20} startDelay={idx * 500 + 500} />
                                      </div>
                                   </div>
                               </div>
                           ))}
                       </div>

                       <div className="flex gap-4 mt-6">
                           <PixelButton 
                               label="RETRY TEST" 
                               variant="default"
                               onClick={() => { setStats(null); setXpGained(0); }}
                               icon={<Repeat />}
                               className="flex-1"
                           />
                           <PixelButton 
                               label="ENTER BOSS ROOM" 
                               variant="primary" 
                               onClick={onNext}
                               className="flex-1"
                               icon={<ArrowRight />}
                           />
                       </div>
                   </div>
               )}
           </div>

        </div>
      )}
    </div>
  );
};

export default TrainingGym;
