
import React, { useState, useRef } from 'react';
import PixelCard from './ui/PixelCard';
import PixelButton from './ui/PixelButton';
import { Character } from '../types';
import { Camera, Wand2, RefreshCw, ChevronRight, ChevronLeft, Image as ImageIcon, ScanFace, AlertTriangle } from 'lucide-react';
import { generateAvatarImage, editAvatarImage } from '../services/geminiService';

interface Props {
  character: Character;
  onUpdateCharacter: (char: Character) => void;
  onNext: () => void;
  onBack: () => void;
}

const VisualLab: React.FC<Props> = ({ character, onUpdateCharacter, onNext, onBack }) => {
  const [mode, setMode] = useState<'GENERATE' | 'EDIT'>('GENERATE');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Camera Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // --- GENERATE HANDLERS ---
  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    setGeneratedImage(null);
    setError(null);
    
    // Niche Specification: Enforce Pixel Art Vibe in prompt automatically
    const effectivePrompt = mode === 'GENERATE' 
        ? `Pixel art character portrait of ${prompt}, cyberpunk aesthetic, 8-bit style, vibrant neon colors, neutral background.` 
        : prompt;

    try {
        // We use '1K' as a placeholder, strictly handled by geminiService to use Flash
        const result = await generateAvatarImage(effectivePrompt, '1K');
        setGeneratedImage(result);
    } catch (e: any) {
         console.error(e);
         setError("VISUAL SYNTHESIS FAILURE: Model unavailable or prompt rejected.");
    }
    setLoading(false);
  };

  // --- EDIT HANDLERS ---
  const startCamera = async () => {
    try {
      setError(null);
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera Error", err);
      setCameraActive(false);
      setError("CAMERA ACCESS DENIED. PLEASE ENABLE PERMISSIONS IN BROWSER.");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/png');
            setCapturedImage(dataUrl);
            setCameraActive(false);
            
            // Stop stream
            const stream = video.srcObject as MediaStream;
            stream?.getTracks().forEach(track => track.stop());
        }
    }
  };

  const handleEdit = async () => {
    if (!prompt || !capturedImage) return;
    setLoading(true);
    setGeneratedImage(null);
    setError(null);
    
    try {
        const result = await editAvatarImage(capturedImage, prompt);
        setGeneratedImage(result);
    } catch (e: any) {
         setError("NANO-EDIT FAILED: The source material was incompatible or rejected.");
    }
    setLoading(false);
  };

  const confirmSelection = () => {
    if (generatedImage) {
        onUpdateCharacter({
            ...character,
            avatarUrl: generatedImage
        });
        onNext();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 animate-fade-in relative z-10 w-full max-w-4xl mx-auto p-4">
      
       {/* Back Button */}
      <div className="absolute top-0 left-0 z-20 hidden lg:flex">
          <button 
            onClick={onBack}
            className="text-gray-500 hover:text-white flex items-center gap-1 font-header text-xs transition-colors bg-black/50 backdrop-blur rounded-full px-4 py-2 border border-white/10"
          >
              <ChevronLeft className="w-4 h-4" /> RECONFIGURE PROFILE
          </button>
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-4xl font-header font-bold text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-cyan tracking-tight">
          VISUAL SYNTHESIS LAB
        </h1>
        <p className="font-body text-gray-400 tracking-widest uppercase">
          Craft your digital persona
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        
        {/* LEFT PANEL: CONTROLS */}
        <PixelCard className="space-y-6" title="CONFIGURATION">
            
            {/* MODE SWITCH */}
            <div className="flex p-1 bg-cyber-black rounded-lg border border-white/10">
                <button 
                    onClick={() => { setMode('GENERATE'); setGeneratedImage(null); setError(null); }}
                    className={`flex-1 py-2 text-xs font-header tracking-widest rounded transition-all ${mode === 'GENERATE' ? 'bg-neon-cyan text-black shadow-neon-cyan' : 'text-gray-500 hover:text-white'}`}
                >
                    GENERATE
                </button>
                <button 
                    onClick={() => { setMode('EDIT'); setGeneratedImage(null); setError(null); }}
                    className={`flex-1 py-2 text-xs font-header tracking-widest rounded transition-all ${mode === 'EDIT' ? 'bg-neon-purple text-white shadow-neon-purple' : 'text-gray-500 hover:text-white'}`}
                >
                    REMIX REALITY
                </button>
            </div>

            {/* INPUTS */}
            <div className="space-y-4">
                {mode === 'GENERATE' ? (
                    <>
                        <div>
                            <label className="text-xs font-header text-neon-cyan uppercase mb-2 block">Prompt Directive</label>
                            <textarea 
                                className="w-full bg-cyber-dark/50 border border-white/10 rounded p-3 text-white font-body focus:border-neon-cyan outline-none resize-none h-24"
                                placeholder="e.g. A cyberpunk knight with neon armor..."
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                            />
                        </div>
                        {/* Resolution removed as Flash model handles default only */}
                        <div className="text-[10px] text-gray-500 font-header">
                            * OPTIMIZED FOR FLASH GENERATION ENGINE
                        </div>
                        <PixelButton 
                            label={loading ? "SYNTHESIZING..." : "INITIATE GENERATION"} 
                            variant="primary" 
                            onClick={handleGenerate}
                            disabled={loading || !prompt}
                            className="w-full"
                            icon={loading ? <RefreshCw className="animate-spin" /> : <Wand2 />}
                        />
                    </>
                ) : (
                    <>
                         {/* CAMERA / UPLOAD AREA */}
                         <div className="relative w-full aspect-video bg-black rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden group">
                             {cameraActive ? (
                                 <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                             ) : capturedImage ? (
                                 <img src={capturedImage} alt="Capture" className="w-full h-full object-cover" />
                             ) : (
                                 <div className="text-center p-4">
                                     <ScanFace className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                                     <p className="text-gray-500 text-xs font-body">Capture base layer for remixing</p>
                                 </div>
                             )}

                             {!cameraActive && !capturedImage && (
                                 <button 
                                    onClick={startCamera}
                                    className="absolute inset-0 flex items-center justify-center bg-transparent hover:bg-white/5 transition-all"
                                 >
                                     <span className="bg-neon-purple text-white px-4 py-2 rounded font-header text-xs shadow-lg">ACTIVATE CAM</span>
                                 </button>
                             )}

                             {cameraActive && (
                                 <button 
                                    onClick={capturePhoto}
                                    className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-500 w-12 h-12 rounded-full border-4 border-white shadow-lg hover:scale-110 transition-transform"
                                 />
                             )}
                             
                             {/* Hidden Canvas for capture */}
                             <canvas ref={canvasRef} className="hidden" />
                         </div>

                         <div>
                            <label className="text-xs font-header text-neon-purple uppercase mb-2 block">Edit Instruction</label>
                            <input 
                                type="text"
                                className="w-full bg-cyber-dark/50 border border-white/10 rounded p-3 text-white font-body focus:border-neon-purple outline-none"
                                placeholder="e.g. Add a retro VHS filter..."
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                            />
                        </div>

                        <PixelButton 
                            label={loading ? "REMIXING..." : "APPLY NANO-EDIT"} 
                            variant="primary" 
                            onClick={handleEdit}
                            disabled={loading || !prompt || !capturedImage}
                            className="w-full"
                            icon={loading ? <RefreshCw className="animate-spin" /> : <SparklesIcon />}
                        />
                    </>
                )}
            </div>
        </PixelCard>

        {/* RIGHT PANEL: PREVIEW */}
        <PixelCard title="VISUAL OUTPUT" className="flex flex-col">
            <div className="flex-1 bg-black/50 rounded-lg border border-white/10 relative overflow-hidden flex items-center justify-center min-h-[300px]">
                {loading ? (
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 border-4 border-neon-cyan border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="font-header text-xs text-neon-cyan animate-pulse">
                            {mode === 'GENERATE' ? 'CONSTRUCTING PIXELS...' : 'APPLYING NANO-PARTICLES...'}
                        </p>
                    </div>
                ) : error ? (
                    <div className="text-center space-y-4 px-4">
                        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto animate-pulse" />
                        <p className="font-header text-sm text-red-500 uppercase tracking-widest">{error}</p>
                    </div>
                ) : generatedImage ? (
                    <img src={generatedImage} alt="Generated" className="w-full h-full object-contain animate-fade-in" />
                ) : (
                    <div className="text-center opacity-30">
                        <ImageIcon className="w-16 h-16 mx-auto mb-2 text-white" />
                        <p className="font-header text-xs">NO OUTPUT DETECTED</p>
                    </div>
                )}
            </div>

            <div className="mt-6">
                 <PixelButton 
                    label="CONFIRM IDENTITY" 
                    variant="success"
                    onClick={confirmSelection}
                    disabled={!generatedImage}
                    className={`w-full ${!generatedImage ? 'opacity-50 grayscale' : ''}`}
                    icon={<ChevronRight />}
                 />
                 <button onClick={onNext} className="w-full text-center mt-4 text-xs font-body text-gray-500 hover:text-white transition-colors">
                     SKIP VISUAL LAB &gt;&gt;
                 </button>
            </div>
        </PixelCard>

      </div>
    </div>
  );
};

// Helper Icon
const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M9 3v4"/><path d="M3 5h4"/><path d="M3 9h4"/></svg>
);

export default VisualLab;
