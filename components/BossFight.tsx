
import React, { useState, useEffect, useRef } from 'react';
import PixelCard from './ui/PixelCard';
import PixelButton from './ui/PixelButton';
import PixelBar from './ui/PixelBar';
import LiveSession from './LiveSession';
import TypewriterText from './ui/TypewriterText';
import { Character, ChatMessage, Persona, AvatarEmotion } from '../types';
import { generateBossResponse, generateSpeech, playAudioBuffer, generateInterviewReport, InterviewReport, generateInterviewPanel, getAvatarUrl } from '../services/geminiService';
import { Send, VolumeX, Radio, Globe, ShieldAlert, Flag, ChevronLeft, Download, RotateCcw, Mic, MicOff, Users, VideoOff, MessageSquare } from 'lucide-react';
import { playClick, playSuccess, playError } from '../utils/audio';

interface Props {
  character: Character;
  onBack: () => void;
  onRestart: () => void;
}

declare global {
  interface Window {
    jspdf: any;
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const BossFight: React.FC<Props> = ({ character, onBack, onRestart }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  // Skill Check: Iron Mind gives +20 Max HP
  const maxHP = character.unlockedSkills?.includes('iron_mind') ? 120 : 100;
  const [playerHP, setPlayerHP] = useState(maxHP);
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  
  // DYNAMIC PANEL STATE
  const [panel, setPanel] = useState<Persona[]>([]);
  const [isPanelReady, setIsPanelReady] = useState(false);
  const [panelLoading, setPanelLoading] = useState(true);

  // Turn Management
  const [turnIndex, setTurnIndex] = useState(-1); 
  const [activePersonaId, setActivePersonaId] = useState<string>('');
  
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showLiveSession, setShowLiveSession] = useState(false);
  
  // VOICE INPUT STATE
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // CAMERA STATE
  const [cameraError, setCameraError] = useState(false);

  // Report State
  const [isFinished, setIsFinished] = useState(false);
  const [reportData, setReportData] = useState<InterviewReport | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const currentAudioSource = useRef<AudioBufferSourceNode | null>(null);

  // PHASE TRACKING
  const [phase, setPhase] = useState<'KICKOFF' | 'MAIN' | 'WRAP'>('KICKOFF');
  const TURN_LIMIT_KICKOFF = 2; // Short intro
  const TURN_LIMIT_MAIN = 12; // Bulk of interview

  const stopCurrentAudio = () => {
    if (currentAudioSource.current) {
      try {
        currentAudioSource.current.stop();
      } catch (e) {}
      currentAudioSource.current = null;
    }
    setIsSpeaking(false);
  };

  // --- INITIALIZATION: LOAD PANEL & CAMERA ---
  useEffect(() => {
    let isMounted = true;
    
    const init = async () => {
        // 1. Generate Panel based on profession/role
        setPanelLoading(true);
        const profession = character.profile?.profession || character.role || 'General';
        const generatedPanel = await generateInterviewPanel(character.role || 'Professional', profession);
        
        if (isMounted) {
            setPanel(generatedPanel);
            setPanelLoading(false);
            setIsPanelReady(true);
            
            // Find HR Leader (Usually the first one or one with 'Kore' voice)
            const leader = generatedPanel[0];
            setActivePersonaId(leader.id);

            // Intro Message
            const initialText = `Panel convened. I'm ${leader.name}, ${leader.title}. We have a tight schedule for the ${character.role} role. ${character.name}, let's start. Your edge?`;
            
            const initialMessage: ChatMessage = {
                sender: 'boss',
                speakerName: leader.name,
                text: initialText,
                timestamp: Date.now(),
            };
            setMessages([initialMessage]);

            // Intro Speech
            setIsSpeaking(true);
            const audioBuffer = await generateSpeech(initialText, leader.voice);
            if (audioBuffer && isMounted) {
                const source = playAudioBuffer(audioBuffer);
                currentAudioSource.current = source;
                source.onended = () => {
                    if(isMounted) setIsSpeaking(false);
                    currentAudioSource.current = null;
                };
            } else {
                setIsSpeaking(false);
            }
        }
    };

    // 2. Camera Setup
    const startCamera = async () => {
      try {
        setCameraError(false);
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (isMounted) {
            streamRef.current = stream;
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
        } else {
            stream.getTracks().forEach(track => track.stop());
        }
      } catch (err) {
        console.error("Camera error:", err);
        if (isMounted) setCameraError(true);
      }
    };

    // 3. Speech Recognition Setup
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US'; // Default to English for Interview
      
      recognitionRef.current.onresult = (event: any) => {
         const currentText = Array.from(event.results)
           .map((result: any) => result[0].transcript)
           .join(' ');
         setInput(currentText);
      };

      recognitionRef.current.onend = () => {
          setIsRecording(false);
          // Optional: Auto-submit here if desired, but button press is safer for correction
      };
    }
    
    init();
    startCamera();
    
    return () => {
        isMounted = false;
        stopCurrentAudio();
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    };
  }, [character]);

  useEffect(() => {
    // Dynamic Difficulty Logic
    if (playerHP >= (maxHP * 0.8)) setDifficulty('HARD');
    else if (playerHP <= (maxHP * 0.4)) setDifficulty('EASY');
    else setDifficulty('MEDIUM');
  }, [playerHP, maxHP]);

  // Phase Logic
  useEffect(() => {
      const turns = messages.filter(m => m.sender === 'user').length;
      if (turns < TURN_LIMIT_KICKOFF) setPhase('KICKOFF');
      else if (turns < TURN_LIMIT_MAIN) setPhase('MAIN');
      else setPhase('WRAP');
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- VOICE INPUT HANDLER ---
  const toggleRecording = () => {
      if (!recognitionRef.current) {
          alert("Speech recognition not supported in this browser.");
          return;
      }

      if (isRecording) {
          recognitionRef.current.stop();
          setIsRecording(false);
      } else {
          stopCurrentAudio(); // Stop TTS if speaking
          setInput('');
          recognitionRef.current.start();
          setIsRecording(true);
      }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading || playerHP <= 0) return;
    
    // Stop recording if active when sending
    if (isRecording && recognitionRef.current) {
        recognitionRef.current.stop();
        setIsRecording(false);
    }
    
    // Always stop current audio when sending new message
    stopCurrentAudio();

    // 1. Add User Message
    const userMsg: ChatMessage = {
      sender: 'user',
      text: input,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
        // 2. Determine Next Speaker (Rotate through panel)
        const nextIndex = (turnIndex + 1) % panel.length;
        const targetPersona = panel[nextIndex];
        const currentField = character.profile?.profession || character.role || 'General';

        // 3. Generate Response (Adaptive Difficulty + Phase + Field)
        const history = messages.map(m => `${m.speakerName || 'User'}: ${m.text}`);
        const response = await generateBossResponse(
            userMsg.text, 
            history, 
            targetPersona, 
            difficulty,
            phase,
            currentField
        );

        setTurnIndex(nextIndex);
        setActivePersonaId(targetPersona.id);

        // 4. Update Panel Expressions (Read the Room Logic)
        const damage = response.damage_dealt;
        let speakerEmotion: AvatarEmotion = 'neutral';
        let panelEmotion: AvatarEmotion = 'neutral';

        if (response.is_termination) {
           speakerEmotion = 'angry';
           panelEmotion = 'disappointed';
        } else if (damage > 20) {
           // Bad Answer: Active speaker is unhappy, panel is skeptical
           speakerEmotion = 'disappointed';
           panelEmotion = 'skeptical';
        } else if (damage > 0) {
           // Weak Answer: Active speaker is skeptical, panel is neutral
           speakerEmotion = 'skeptical';
           panelEmotion = 'neutral';
        } else {
           // Good Answer: Smiles all around
           speakerEmotion = 'happy';
           panelEmotion = 'happy';
           
           // If the text seems particularly positive, upgrade to excited
           if (response.mood.toLowerCase().includes('excited') || response.mood.toLowerCase().includes('impressed')) {
              speakerEmotion = 'excited';
           }
        }

        // Apply visual updates
        setPanel(prev => prev.map(p => {
             const isSpeaker = p.id === targetPersona.id;
             const newEmotion = isSpeaker ? speakerEmotion : panelEmotion;
             // Only update if changed to avoid unnecessary re-renders (though React handles diffing)
             if (p.currentEmotion !== newEmotion) {
                 return {
                     ...p,
                     currentEmotion: newEmotion,
                     avatar: getAvatarUrl(p.avatarSeed, newEmotion)
                 };
             }
             return p;
        }));


        // 5. Add Boss Message
        const bossMsg: ChatMessage = {
          sender: 'boss',
          speakerName: response.speaker,
          text: response.dialogue,
          mood: response.mood,
          sources: response.sources,
          timestamp: Date.now(),
        };

        setMessages(prev => [...prev, bossMsg]);
        
        // 6. Handle Damage & Termination
        if (response.is_termination) {
             setPlayerHP(0); // Instant Kill
             playError(); // Termination Sound
        } else if (response.damage_dealt > 0) {
             setPlayerHP(prev => Math.max(0, prev - response.damage_dealt));
        } else {
             // Optional: Heal slightly on perfect answers?
             // setPlayerHP(prev => Math.min(maxHP, prev + 5));
        }

        // 7. Handle TTS
        if (targetPersona.voice) {
          const audioBuffer = await generateSpeech(response.dialogue, targetPersona.voice);
          if (audioBuffer) {
              stopCurrentAudio(); 
              setIsSpeaking(true);
              const source = playAudioBuffer(audioBuffer);
              currentAudioSource.current = source;
              source.onended = () => {
                 setIsSpeaking(false);
                 currentAudioSource.current = null;
              };
          }
        }
    } catch (e) {
        console.error("Game Loop Error", e);
    } finally {
        setLoading(false);
    }
  };

  const finishInterview = async () => {
      stopCurrentAudio();
      setIsFinished(true);
      setGeneratingReport(true);
      
      const history = messages.map(m => `${m.sender.toUpperCase()}: ${m.text}`);
      const report = await generateInterviewReport(history);
      setReportData(report);
      setGeneratingReport(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const generatePDF = () => {
    if (!reportData || !window.jspdf) {
        console.error("PDF Generation failed: Report missing or jsPDF not loaded.");
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFillColor(5, 5, 5);
    doc.rect(0, 0, 210, 297, "F");
    doc.setTextColor(0, 240, 255);
    doc.setFontSize(22);
    doc.setFont("courier", "bold");
    doc.text("ORATIFY: MISSION DOSSIER", 20, 20);
    doc.setFontSize(10);
    doc.setTextColor(200, 200, 200);
    doc.text(`AGENT: ${character.name.toUpperCase()}`, 20, 30);
    doc.text(`DATE: ${new Date().toLocaleDateString()}`, 20, 35);
    doc.setTextColor(0, 255, 159);
    doc.setFontSize(40);
    doc.text(`SCORE: ${reportData.grade}`, 150, 35);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text("EXECUTIVE SUMMARY", 20, 50);
    doc.setFontSize(10);
    doc.setTextColor(180, 180, 180);
    const summaryLines = doc.splitTextToSize(reportData.summary, 170);
    doc.text(summaryLines, 20, 60);
    let yPos = 80;
    
    // Panel Insights
    if (reportData.panelInsights) {
        doc.setTextColor(255, 200, 0);
        doc.setFontSize(14);
        doc.text("PANEL INTELLIGENCE", 20, yPos);
        yPos += 10;
        doc.setTextColor(200, 200, 200);
        doc.setFontSize(10);
        const insightLines = doc.splitTextToSize(reportData.panelInsights, 170);
        doc.text(insightLines, 20, yPos);
        yPos += 20;
    }

    doc.setTextColor(0, 240, 255);
    doc.setFontSize(14);
    doc.text("TACTICAL STRENGTHS", 20, yPos);
    yPos += 10;
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(10);
    reportData.strengths.forEach(s => {
        doc.text(`• ${s}`, 20, yPos);
        yPos += 7;
    });
    yPos += 10;
    doc.setTextColor(255, 0, 85);
    doc.setFontSize(14);
    doc.text("AREAS FOR RE-CALIBRATION", 20, yPos);
    yPos += 10;
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(10);
    reportData.improvements.forEach(s => {
        doc.text(`• ${s}`, 20, yPos);
        yPos += 7;
    });
    doc.save("oratify_mission_report.pdf");
  };

  // --- RENDER: LOADING STATE ---
  if (panelLoading) {
      return (
          <div className="flex flex-col items-center justify-center h-[80vh] w-full gap-8 animate-fade-in">
              <div className="relative">
                  <div className="w-24 h-24 rounded-full border-4 border-neon-cyan border-t-transparent animate-spin"></div>
                  <Users className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white w-10 h-10 animate-pulse" />
              </div>
              <div className="text-center">
                  <h2 className="text-3xl font-header text-white mb-2">ASSEMBLING PANEL</h2>
                  <p className="font-body text-gray-400">Recruiting experts for: <span className="text-neon-cyan">{character.role}</span></p>
                  <p className="font-mono text-xs text-gray-600 mt-2">Locating HR Director (Alex)... Syncing.</p>
                  <p className="font-mono text-xs text-gray-600">Locating Technical Leads... Connected.</p>
              </div>
          </div>
      );
  }

  // --- RENDER: FINISHED STATE ---
  if (isFinished) {
      return (
          <div className="flex flex-col items-center justify-center h-full max-h-[80vh] w-full max-w-4xl mx-auto p-4 animate-fade-in gap-6">
              {generatingReport ? (
                  <div className="text-center space-y-4">
                      <div className="w-16 h-16 border-4 border-neon-cyan border-t-transparent rounded-full animate-spin mx-auto"></div>
                      <h2 className="text-2xl font-header text-white animate-pulse">COMPILING MISSION DOSSIER...</h2>
                      <p className="font-body text-gray-400">Analyzing panel murmurs, grit factor, and technical accuracy.</p>
                  </div>
              ) : reportData ? (
                  <PixelCard title="MISSION REPORT" className="w-full">
                      <div className="flex flex-col md:flex-row gap-8">
                          {/* Grade Section */}
                          <div className="flex flex-col items-center justify-center gap-4 p-6 bg-black/40 rounded-xl border border-white/10 md:min-w-[200px]">
                              <div className="text-center">
                                <span className="text-gray-500 font-header text-xs tracking-widest uppercase block mb-1">Final Score</span>
                                <span className={`text-6xl font-header font-bold ${reportData.grade.includes('8') || reportData.grade.includes('9') ? 'text-neon-cyan' : 'text-yellow-400'}`}>
                                    {reportData.grade}
                                </span>
                              </div>
                          </div>

                          {/* Details */}
                          <div className="flex-1 space-y-6">
                              <div>
                                  <h3 className="text-neon-cyan font-header text-lg mb-2">EXECUTIVE SUMMARY</h3>
                                  <p className="text-gray-300 font-body leading-relaxed">{reportData.summary}</p>
                              </div>
                              {reportData.panelInsights && (
                                  <div className="bg-white/5 p-3 rounded border border-white/10">
                                      <h3 className="text-yellow-400 font-header text-sm mb-1 uppercase">PANEL INTELLIGENCE</h3>
                                      <p className="text-gray-400 text-sm italic">"{reportData.panelInsights}"</p>
                                  </div>
                              )}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                      <h4 className="text-green-400 font-header text-sm mb-2 uppercase">Tactical Strengths</h4>
                                      <ul className="list-disc pl-4 space-y-1 text-gray-400 text-sm">
                                          {reportData.strengths.map((s, i) => <li key={i}>{s}</li>)}
                                      </ul>
                                  </div>
                                  <div>
                                      <h4 className="text-red-400 font-header text-sm mb-2 uppercase">Re-Calibration Needed</h4>
                                      <ul className="list-disc pl-4 space-y-1 text-gray-400 text-sm">
                                          {reportData.improvements.map((s, i) => <li key={i}>{s}</li>)}
                                      </ul>
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="mt-8 flex gap-4">
                          <PixelButton 
                             label="DOWNLOAD DOSSIER" 
                             variant="primary" 
                             icon={<Download />} 
                             onClick={generatePDF}
                             className="flex-1"
                          />
                          <PixelButton 
                             label="RETURN TO BASE" 
                             variant="outline" 
                             icon={<ChevronLeft />} 
                             onClick={onBack}
                             className="flex-1"
                          />
                           <PixelButton 
                             label="NEW CANDIDATE" 
                             variant="danger" 
                             icon={<RotateCcw />} 
                             onClick={onRestart}
                             className="flex-1"
                          />
                      </div>
                  </PixelCard>
              ) : (
                  <div className="text-red-500">Report Generation Failed</div>
              )}
          </div>
      );
  }

  // --- RENDER: GAME OVER STATE ---
  if (playerHP <= 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center animate-fade-in space-y-6">
        <h1 className="font-header text-6xl text-red-500 mb-4 drop-shadow-[0_0_20px_rgba(255,0,0,0.5)]">INTERVIEW TERMINATED</h1>
        <p className="font-body text-2xl text-gray-400 mb-8">The Council has decided not to move forward.</p>
        <div className="flex gap-4">
            <PixelButton label="RETRY" variant="primary" onClick={() => window.location.reload()} />
            <PixelButton label="ABORT SESSION" variant="outline" onClick={onRestart} />
        </div>
      </div>
    );
  }

  // Difficulty Colors
  const diffColor = difficulty === 'HARD' ? 'text-red-500' : difficulty === 'EASY' ? 'text-green-400' : 'text-yellow-400';

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto h-screen max-h-[90vh] p-2 gap-4 relative z-10">
      
      {/* Live Session Overlay */}
      {showLiveSession && (
          <LiveSession onClose={() => setShowLiveSession(false)} voiceName="Zephyr" />
      )}

      {/* Back Button (Abort) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-50 hidden lg:flex gap-2">
          <button onClick={onRestart} className="flex items-center gap-1 text-gray-600 hover:text-red-500 transition-colors font-header text-xs bg-black/50 px-3 py-1 rounded-full border border-white/5 hover:border-red-500/50">
              <RotateCcw className="w-3 h-3" /> ABORT SESSION
          </button>
      </div>

      {/* HUD */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center glass-panel rounded-xl p-4 border-b-2 border-neon-cyan/20">
        <div className="flex-1 w-full md:max-w-[250px]">
           <PixelBar label="Confidence HP" value={playerHP} max={maxHP} color={playerHP < 30 ? "bg-red-500" : "bg-green-500"} barColorClass={playerHP < 30 ? "bg-red-500" : "bg-gradient-to-r from-green-500 to-emerald-400"}/>
        </div>
        
        <div className="text-center flex flex-col items-center">
           <h2 className="font-header text-white text-xl tracking-[0.3em] uppercase">{character.role} PANEL</h2>
           <div className="flex items-center gap-3 text-[10px] text-neon-cyan uppercase mt-1">
             <span>Phase: {phase}</span>
             <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
             <span className={`flex items-center gap-1 ${diffColor} font-bold animate-pulse`}>
               {difficulty === 'HARD' && <ShieldAlert className="w-3 h-3" />}
               PROTOCOL: {difficulty}
             </span>
           </div>
        </div>

        <div className="flex items-center gap-3">
             <PixelButton 
                label="LIVE LINK" 
                variant="outline" 
                icon={<Radio className="w-4 h-4 text-red-500 animate-pulse" />} 
                onClick={() => { stopCurrentAudio(); setShowLiveSession(true); }}
                className="py-2 px-4 text-xs"
             />
             <PixelButton 
                label="END INTERVIEW" 
                variant="danger" 
                icon={<Flag className="w-4 h-4" />} 
                onClick={finishInterview}
                className="py-2 px-4 text-xs"
             />
        </div>
      </div>

      {/* PERSONAS GRID */}
      <div className="grid grid-cols-4 gap-3 h-32 md:h-40">
        {panel.map((persona) => {
          const isActive = activePersonaId === persona.id;
          const isActuallyTalking = isActive && isSpeaking;

          return (
            <div 
              key={persona.id} 
              className={`
                relative flex flex-col items-center justify-end p-2 rounded-xl transition-all duration-500 border
                ${isActive ? 'bg-gradient-to-b from-cyber-gray to-cyber-black border-neon-cyan shadow-[0_0_15px_rgba(0,240,255,0.3)] scale-105 z-10' : 'bg-cyber-dark/50 border-white/5 opacity-50 scale-95 grayscale'}
              `}
            >
              <div className={`w-16 h-16 md:w-20 md:h-20 mb-2 rounded-full overflow-hidden border-2 transition-all duration-200 ${isActuallyTalking ? 'border-neon-cyan shadow-[0_0_10px_#00f0ff] scale-110' : 'border-white/10'}`}>
                 <img 
                    src={persona.avatar}
                    alt={persona.name}
                    className="w-full h-full object-cover"
                 />
              </div>
              <div className="text-center">
                <p className={`font-header text-[10px] md:text-xs font-bold uppercase ${isActive ? 'text-white' : 'text-gray-500'}`}>{persona.name}</p>
                <p className="text-[9px] text-gray-400 truncate w-24">{persona.title}</p>
                {isActive && <span className="text-[9px] text-neon-cyan animate-pulse">SPEAKING</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* MAIN */}
      <div className="flex flex-col md:flex-row gap-4 flex-1 overflow-hidden min-h-0">
        
        {/* LEFT: CANDIDATE */}
        <div className="md:w-1/3 flex flex-col gap-2">
            <PixelCard className="flex-1 p-0 relative border-white/10 bg-black overflow-hidden flex flex-col items-center justify-center">
                {cameraError ? (
                    <div className="flex flex-col items-center justify-center gap-2 text-center">
                        <VideoOff className="w-8 h-8 text-red-500 animate-pulse" />
                        <span className="text-red-500 font-header text-xs tracking-widest uppercase">VIDEO SIGNAL LOST</span>
                        <span className="text-gray-600 text-[9px] font-mono">CAMERA PERMISSION DENIED</span>
                    </div>
                ) : (
                    <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover opacity-80" />
                )}
            </PixelCard>
        </div>

        {/* RIGHT: CHAT */}
        {/* Updated structure: Moved flex properties to internal wrapper */}
        <PixelCard className="flex-1 p-0 bg-cyber-dark/80 backdrop-blur-md border-white/5 md:w-2/3 overflow-hidden">
            <div className="flex flex-col h-full w-full">
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} animate-fade-in`}>
                    <div className="flex items-center gap-2 mb-1 px-1">
                        {msg.sender === 'boss' && (
                            <span className={`font-header text-xs uppercase tracking-wider ${panel.find(p => p.name === msg.speakerName)?.color || 'text-neon-purple'}`}>
                                {msg.speakerName}
                            </span>
                        )}
                    </div>
                    
                    <div className={`max-w-[90%] p-4 rounded-2xl relative font-body text-lg leading-relaxed shadow-lg border ${msg.sender === 'user' ? 'bg-gradient-to-br from-cyan-900/50 to-blue-900/50 text-white border-cyan-500/30' : 'bg-cyber-gray text-gray-200 border-white/10'}`}>
                        {msg.sender === 'boss' ? (
                            <TypewriterText text={msg.text} speed={30} />
                        ) : (
                            msg.text
                        )}
                        
                        {msg.mood && (
                            <div className="absolute -bottom-3 left-0 bg-black/80 border border-white/20 px-2 py-0.5 rounded-full text-[10px] font-header text-gray-400 flex items-center gap-1">
                                MOOD: <span className="text-white">{msg.mood}</span>
                            </div>
                        )}
                    </div>

                    {/* Grounding Sources */}
                    {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-2 max-w-[90%]">
                            {msg.sources.map((source, i) => (
                                <a key={i} href={source.uri} target="_blank" rel="noreferrer" className="flex items-center gap-1 bg-black/40 hover:bg-neon-cyan/10 border border-white/10 px-2 py-1 rounded text-[10px] text-neon-cyan hover:text-white transition-colors">
                                    <Globe className="w-3 h-3" />
                                    <span className="truncate max-w-[150px]">{source.title}</span>
                                </a>
                            ))}
                        </div>
                    )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 bg-cyber-black border-t border-white/10 flex gap-3 items-center shrink-0">
                    {/* MIC BUTTON - PRIMARY */}
                    <button
                    onClick={toggleRecording}
                    className={`
                        h-14 w-14 rounded-full flex items-center justify-center border-2 transition-all duration-300 shadow-lg transform hover:scale-105
                        ${isRecording 
                            ? 'bg-red-500 border-red-400 text-white animate-pulse shadow-[0_0_25px_rgba(239,68,68,0.6)]' 
                            : 'bg-gradient-to-br from-cyber-gray to-black border-neon-cyan text-neon-cyan hover:shadow-[0_0_15px_rgba(0,240,255,0.4)]'}
                    `}
                    >
                    {isRecording ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                    </button>

                    {/* Text Input - Secondary */}
                    <div className="flex-1 relative">
                        <input 
                            type="text" 
                            className="w-full bg-cyber-dark text-white font-body text-lg py-3 px-4 rounded-xl border border-white/10 focus:border-neon-cyan outline-none transition-all pl-10"
                            placeholder={isRecording ? "Listening to your voice..." : "Or type your response here..."}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={loading || isRecording}
                        />
                        <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                    </div>
                    
                    {/* Separate STOP button if speaking, but KEEP Send button visible */}
                    {isSpeaking && (
                        <button 
                        onClick={stopCurrentAudio}
                        className="h-12 px-4 rounded-xl bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/40 hover:text-white transition-all flex items-center gap-2 font-header text-xs animate-pulse"
                        >
                            <VolumeX className="w-4 h-4" /> STOP
                        </button>
                    )}

                    <PixelButton 
                        label="" 
                        icon={loading ? <div className="animate-spin">⏳</div> : <Send />} 
                        variant="primary" 
                        onClick={handleSendMessage} 
                        disabled={loading || isRecording} 
                        className="w-16 h-12 rounded-xl flex items-center justify-center px-0" 
                    />
                </div>
            </div>
        </PixelCard>

      </div>
    </div>
  );
};

export default BossFight;
