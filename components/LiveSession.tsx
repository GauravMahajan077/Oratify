
import React, { useEffect, useRef, useState } from 'react';
import { getGeminiClient } from '../services/geminiService';
import { Modality, LiveServerMessage } from "@google/genai";
import PixelButton from './ui/PixelButton';
import PixelCard from './ui/PixelCard';
import { Mic, PhoneOff, Activity, Video, VideoOff } from 'lucide-react';

interface Props {
  onClose: () => void;
  voiceName: string;
}

const LiveSession: React.FC<Props> = ({ onClose, voiceName }) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('connecting');
  const [volume, setVolume] = useState(0);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Audio Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<Promise<any> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoIntervalRef = useRef<number | null>(null);

  // 1. Helper: Audio Encoding/Decoding
  const decodeAudioData = async (
    data: Uint8Array,
    ctx: AudioContext
  ): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length;
    const buffer = ctx.createBuffer(1, frameCount, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
  };

  const createPcmBlob = (data: Float32Array): { data: string; mimeType: string } => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    
    // Manual Base64 Encode
    let binary = '';
    const bytes = new Uint8Array(int16.buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Data = btoa(binary);

    return {
      data: base64Data,
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  // 2. Initialize Session
  useEffect(() => {
    // Get fresh client
    const ai = getGeminiClient();

    // Safety check for API Key availability
    if (!ai) {
        console.error("Gemini AI instance not initialized (Missing API Key)");
        setStatus('error');
        return;
    }

    const init = async () => {
      try {
        // Setup Audio Contexts
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        // Input: 16kHz required for Gemini
        const inputCtx = new AudioContextClass({ sampleRate: 16000 });
        // Output: 24kHz usually for Gemini TTS response
        const outputCtx = new AudioContextClass({ sampleRate: 24000 });
        
        inputAudioContextRef.current = inputCtx;
        outputAudioContextRef.current = outputCtx;

        // Get User Media (Fallback Logic)
        let stream: MediaStream;
        try {
            // Attempt 1: Audio + Video
            stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }, 
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                } 
            });
            setIsVideoEnabled(true);
        } catch (videoError) {
            console.warn("Video permission failed, falling back to audio only.", videoError);
            try {
                // Attempt 2: Audio Only
                stream = await navigator.mediaDevices.getUserMedia({ 
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                });
                setIsVideoEnabled(false);
            } catch (audioError) {
                console.error("Audio permission failed.", audioError);
                setStatus('error');
                return;
            }
        }
        
        streamRef.current = stream;

        // Attach to Video Element (Only if video track exists)
        if (videoRef.current && stream.getVideoTracks().length > 0) {
            videoRef.current.srcObject = stream;
        }

        // Connect to Gemini Live
        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-09-2025',
          callbacks: {
            onopen: async () => {
              setStatus('connected');
              // Critical: Resume AudioContexts after user interaction
              if (outputCtx.state === 'suspended') await outputCtx.resume();
              if (inputCtx.state === 'suspended') await inputCtx.resume();
              
              // --- AUDIO STREAMING ---
              const source = inputCtx.createMediaStreamSource(stream);
              const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
              
              scriptProcessor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                
                // Visualization Data
                let sum = 0;
                for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
                const rms = Math.sqrt(sum / inputData.length);
                setVolume(rms * 100);

                const pcmBlob = createPcmBlob(inputData);
                
                // Send Audio to Gemini
                // IMPORTANT: Catch potential rejection if session is closed/erroring to avoid unhandled promise exceptions
                sessionPromise.then(session => {
                    session.sendRealtimeInput({ media: pcmBlob });
                }).catch(() => {
                   // Ignore send errors if session is down
                });
              };

              source.connect(scriptProcessor);
              
              // CRITICAL FIX: Prevent feedback loop by muting local output
              const silenceNode = inputCtx.createGain();
              silenceNode.gain.value = 0;
              scriptProcessor.connect(silenceNode);
              silenceNode.connect(inputCtx.destination);

              // --- VIDEO STREAMING (1 FPS) ---
              // Only start video loop if we actually have video tracks
              if (stream.getVideoTracks().length > 0) {
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');
                  
                  videoIntervalRef.current = window.setInterval(async () => {
                     if (!videoRef.current || !ctx) return;
                     const vid = videoRef.current;
                     // Safe check for width to ensure video is ready
                     if (vid.readyState === vid.HAVE_ENOUGH_DATA && vid.videoWidth > 0) {
                         canvas.width = vid.videoWidth * 0.5;
                         canvas.height = vid.videoHeight * 0.5;
                         ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
                         
                         // Low quality JPEG for speed
                         const base64 = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
                         
                         sessionPromise.then(session => {
                            session.sendRealtimeInput({ 
                                media: { 
                                    mimeType: 'image/jpeg', 
                                    data: base64 
                                } 
                            });
                         }).catch(() => {});
                     }
                  }, 1000);
              }
            },
            onmessage: async (msg: LiveServerMessage) => {
               // Handle Audio Output
               const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
               if (base64Audio) {
                 try {
                     const binaryString = atob(base64Audio);
                     const len = binaryString.length;
                     const bytes = new Uint8Array(len);
                     for (let i = 0; i < len; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                     }

                     const audioBuffer = await decodeAudioData(bytes, outputCtx);
                     
                     // Schedule playback
                     nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                     
                     const source = outputCtx.createBufferSource();
                     source.buffer = audioBuffer;
                     source.connect(outputCtx.destination);
                     
                     source.onended = () => sourcesRef.current.delete(source);
                     source.start(nextStartTimeRef.current);
                     
                     sourcesRef.current.add(source);
                     nextStartTimeRef.current += audioBuffer.duration;
                 } catch (e) {
                     console.warn("Audio decode/play error", e);
                 }
               }

               // Handle Interruption
               if (msg.serverContent?.interrupted) {
                 sourcesRef.current.forEach(s => {
                    try { s.stop(); } catch(e) {}
                 });
                 sourcesRef.current.clear();
                 nextStartTimeRef.current = 0;
               }
            },
            onclose: () => setStatus('disconnected'),
            onerror: (err) => {
                console.error("Live Session Error:", err);
                setStatus('error');
            }
          },
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } }
            },
            systemInstruction: "You are an expert interview coach in a retro-futuristic simulation. I am the candidate. You can see me via video. Be helpful, concise, and encourage me. Act like a 'Sage' character.",
          }
        });

        sessionRef.current = sessionPromise;
        // Catch initial connection errors
        sessionPromise.catch(e => {
            console.error("Initial Connection Failed:", e);
            setStatus('error');
        });

      } catch (e) {
        console.error("Live Init Exception", e);
        setStatus('error');
      }
    };

    init();

    return () => {
       // Cleanup: Stop all tracks and close contexts
       if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
       if (sessionRef.current) {
           sessionRef.current.then((s: any) => {
               try { s.close(); } catch(e) {}
           }).catch(() => {});
       }
       if (streamRef.current) {
           streamRef.current.getTracks().forEach(track => track.stop());
       }
       // Don't await close in cleanup
       if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
           inputAudioContextRef.current.close().catch(() => {});
       }
       if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
           outputAudioContextRef.current.close().catch(() => {});
       }
    };
  }, [voiceName]);

  // Oscilloscope Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const draw = () => {
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#00f0ff';
      ctx.beginPath();

      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      // Simulate wave based on volume
      const amplitude = Math.max(2, volume * 2); 
      const frequency = 0.1;

      for (let x = 0; x < width; x++) {
        const y = centerY + Math.sin(x * frequency + Date.now() * 0.01) * amplitude * Math.sin(x * 0.05);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.stroke();
      
      // Add random glitch lines
      if (Math.random() > 0.95) {
          ctx.fillStyle = 'rgba(0, 240, 255, 0.1)';
          ctx.fillRect(0, Math.random() * height, width, 2);
      }

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [volume]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in">
      <PixelCard className="w-full max-w-2xl bg-cyber-black border-neon-cyan shadow-[0_0_50px_rgba(0,240,255,0.2)]">
        <div className="flex flex-col items-center gap-6 p-4">
            
            {/* Header */}
            <div className="flex items-center gap-3 w-full justify-between">
                <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${status === 'connected' ? 'bg-neon-green animate-pulse' : 'bg-red-500'}`}></div>
                    <h2 className="font-header text-xl md:text-2xl text-white tracking-widest">
                        LIVE UPLINK: <span className="text-neon-cyan">THE SAGE</span>
                    </h2>
                </div>
                <div className="text-xs font-header text-gray-500">
                    LATENCY: {status === 'connected' ? '12ms' : '--'}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                
                {/* User Video Feed */}
                <div className="relative aspect-video bg-black rounded-lg border border-white/10 overflow-hidden flex items-center justify-center">
                    {isVideoEnabled ? (
                        <>
                            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                            <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/50 px-2 py-1 rounded">
                                <Video className="w-3 h-3 text-red-500 animate-pulse" />
                                <span className="text-[10px] font-header text-white">LIVE FEED</span>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-2 text-gray-500">
                            <VideoOff className="w-8 h-8" />
                            <span className="text-xs font-header">VIDEO DISABLED</span>
                        </div>
                    )}
                </div>

                {/* AI Visualizer */}
                <div className="relative aspect-video bg-black border border-white/10 rounded-lg overflow-hidden flex flex-col">
                    <div className="absolute top-2 left-2 text-[10px] font-header text-gray-500">AUDIO_WAVEFORM_MONITOR</div>
                    <canvas ref={canvasRef} width={300} height={200} className="w-full h-full" />
                </div>

            </div>

            {/* Status Text */}
            <div className="text-center h-6">
                {status === 'connecting' && <p className="text-neon-cyan font-body text-sm animate-pulse">ESTABLISHING QUANTUM LINK...</p>}
                {status === 'connected' && <p className="text-gray-300 font-body text-sm">Connection Stable. Speak freely.</p>}
                {status === 'error' && <p className="text-red-500 font-body text-sm">Connection Failed. Check Microphone Permission.</p>}
                {status === 'disconnected' && <p className="text-gray-500 font-body text-sm">Link Terminated.</p>}
            </div>

            {/* Controls */}
            <div className="flex gap-4 w-full">
                <PixelButton 
                    label="TERMINATE LINK" 
                    variant="danger" 
                    icon={<PhoneOff />} 
                    onClick={onClose}
                    className="w-full"
                />
            </div>
        </div>
      </PixelCard>
    </div>
  );
};

export default LiveSession;
