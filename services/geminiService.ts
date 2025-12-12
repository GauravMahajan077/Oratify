
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { BossResponse, AnalysisStats, GroundingSource, Persona, AvatarEmotion } from "../types";

// Dynamic Client Accessor to ensure fresh API Key usage
export const getGeminiClient = (): GoogleGenAI | null => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({ apiKey });
  } catch (e) {
    console.warn("API Key access failed", e);
    return null;
  }
};

// --- AVATAR ENGINE ---
export const getAvatarUrl = (seed: string, emotion: AvatarEmotion = 'neutral') => {
  let params = '&clothing=blazerAndShirt';
  
  switch (emotion) {
    case 'happy': 
        params += '&mouth=smile&eyebrows=default&eyes=default'; 
        break;
    case 'excited': 
        params += '&mouth=smile&eyebrows=raisedExcited&eyes=happy'; 
        break;
    case 'neutral': 
        params += '&mouth=default&eyebrows=default&eyes=default'; 
        break;
    case 'skeptical': 
        params += '&mouth=serious&eyebrows=raisedExcited&eyes=squint'; 
        break;
    case 'angry': 
        params += '&mouth=grimace&eyebrows=angry&eyes=squint'; 
        break;
    case 'disappointed': 
        params += '&mouth=sad&eyebrows=sadConcerned&eyes=default'; 
        break;
    default:
        params += '&mouth=default&eyebrows=default';
  }
  
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}${params}`;
};

// Fixed archetypes as requested
export const PERSONAS: Persona[] = [
  { id: 'hr_anchor', name: 'Alex', title: 'HR Lead', description: 'Warm, steady, focused on culture fit and emotional intelligence. Steers the session.', color: 'text-pink-400', voice: 'Kore', avatarSeed: 'AlexHR', avatar: getAvatarUrl('AlexHR', 'happy') },
  { id: 'tech_lead', name: 'Jordan', title: 'Technical Expert', description: 'Sharp, skeptical. Focuses on deep field probes and implementation details.', color: 'text-blue-400', voice: 'Fenrir', avatarSeed: 'JordanTech', avatar: getAvatarUrl('JordanTech', 'happy') },
  { id: 'exec_lead', name: 'Morgan', title: 'Team Lead', description: 'Tactical, scenario-focused, practical. Cares about real-world application.', color: 'text-yellow-400', voice: 'Charon', avatarSeed: 'MorganExec', avatar: getAvatarUrl('MorganExec', 'happy') },
  { id: 'wildcard', name: 'Casey', title: 'Skills Coach', description: 'Supportive, observant. Focuses on growth, behavior, and soft skills.', color: 'text-green-400', voice: 'Puck', avatarSeed: 'CaseyCoach', avatar: getAvatarUrl('CaseyCoach', 'happy') },
];

export const generateInterviewPanel = async (role: string, field: string = 'General'): Promise<Persona[]> => {
  const ai = getGeminiClient();
  if (!ai) return PERSONAS;

  const prompt = `
    Generate a 4-person corporate interview panel for a "${role}" position in the "${field}" field.
    
    You must adapt the following specific archetypes to the field "${field}":
    
    1. Fixed Anchor: HR Lead (Name: Alex). Warm/probing.
    2. Dynamic Role 1: Jordan. Currently "Technical Expert". Rename title to fit ${field} (e.g., for Healthcare -> "Clinical Expert"). Deep field probes, skeptical.
    3. Dynamic Role 2: Morgan. Currently "Team Lead". Rename title to fit ${field} (e.g., "Ward Manager"). Practical, scenario-focused.
    4. Dynamic Role 3: Casey. Currently "Skills Coach". Rename title to fit ${field} (e.g., "Resilience Coach"). Behavioral, supportive.

    Return a JSON array of objects with keys: id, name, title, description, voice (use 'Kore', 'Fenrir', 'Charon', 'Puck'), color.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              voice: { type: Type.STRING },
              color: { type: Type.STRING }
            },
            required: ['id', 'name', 'title', 'description', 'voice', 'color']
          }
        }
      }
    });

    const rawPanel = JSON.parse(response.text || "[]");
    
    if (rawPanel.length === 0) return PERSONAS;

    return rawPanel.map((p: any) => ({
      ...p,
      avatarSeed: p.name, // Store the seed
      avatar: getAvatarUrl(p.name, 'happy'), // Start everyone happy
      currentEmotion: 'happy'
    }));

  } catch (e) {
    console.error("Panel Generation Error", e);
    return PERSONAS;
  }
};

// --- IMAGE GENERATION & EDITING ---

export const generateAvatarImage = async (prompt: string, size: '1K' | '2K' | '4K'): Promise<string> => {
  const ai = getGeminiClient();
  if (!ai) throw new Error("API_KEY_MISSING");
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      },
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("NO_IMAGE_DATA");
  } catch (e: any) {
    console.error("Image Gen Error", e);
    throw new Error(e.message || "GENERATION_FAILED");
  }
};

export const editAvatarImage = async (base64Image: string, prompt: string): Promise<string> => {
    const ai = getGeminiClient();
    if (!ai) throw new Error("API_KEY_MISSING");
    
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { 
                        inlineData: { 
                            mimeType: 'image/png', 
                            data: cleanBase64 
                        } 
                    },
                    { text: prompt }
                ]
            }
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        throw new Error("NO_IMAGE_DATA");
    } catch (e: any) {
        console.error("Image Edit Error", e);
        throw new Error(e.message || "EDIT_FAILED");
    }
};

// --- TTS HELPER FUNCTIONS ---

let sharedAudioContext: AudioContext | null = null;

const getSharedAudioContext = () => {
    if (!sharedAudioContext) {
        sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (sharedAudioContext.state === 'suspended') {
        sharedAudioContext.resume().catch(e => console.warn("Audio resume failed", e));
    }
    return sharedAudioContext;
};

const decodeBase64 = (base64String: string) => {
  const binaryString = atob(base64String);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const generateSpeech = async (text: string, voiceName: string = 'Kore'): Promise<AudioBuffer | null> => {
    const ai = getGeminiClient();
    if (!ai) return null;

    const cleanText = text.replace(/[*_#`]/g, '').trim();
    if (!cleanText) return null;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: cleanText }] }],
            config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            console.warn("No audio data received from Gemini TTS");
            return null;
        }

        const audioContext = getSharedAudioContext();
        const audioData = decodeBase64(base64Audio);
        
        const dataInt16 = new Int16Array(audioData.buffer);
        const frameCount = dataInt16.length;
        const buffer = audioContext.createBuffer(1, frameCount, 24000);
        const channelData = buffer.getChannelData(0);
        
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i] / 32768.0;
        }
        return buffer;

    } catch (e) {
        // Suppress 500 errors to avoid console spam, return null to fail gracefully (silence)
        console.warn("TTS Generation skipped due to API error (likely 500 or overload):", e);
        return null;
    }
};

export const playAudioBuffer = (buffer: AudioBuffer): AudioBufferSourceNode => {
    const audioContext = getSharedAudioContext();
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);
    return source;
};

// --- CORE INTERVIEW LOGIC ---

export const generateBossResponse = async (
  userMessage: string,
  history: string[],
  targetPersona: Persona,
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM',
  phase: 'KICKOFF' | 'MAIN' | 'WRAP' = 'MAIN',
  field: string = 'General'
): Promise<BossResponse> => {
  const ai = getGeminiClient();
  if (!ai) {
    return new Promise(resolve => setTimeout(() => resolve({
      speaker: targetPersona?.name || 'The Sage',
      mood: 'Helpful',
      dialogue: "I see you haven't connected your API Key spell yet. Check your environment variables, adventurer!",
      damage_dealt: 0,
      is_termination: false
    }), 1000));
  }

  const model = "gemini-2.5-flash";

  let difficultyInstruction = "";
  switch(difficulty) {
    case 'HARD': 
        difficultyInstruction = "DIFFICULTY: HARD. You are in 'Boss Mode'. Be critical. Ask complex, multi-part questions or challenge the user's logic. If the user's answer is short, vague, or non-specific, set 'damage_dealt' between 20-30."; 
        break;
    case 'EASY': 
        difficultyInstruction = "DIFFICULTY: EASY. Be encouraging and coaching. Ask simple, direct questions. Offer hints. 'damage_dealt' should stay low (0-10)."; 
        break;
    default: 
        difficultyInstruction = "DIFFICULTY: NORMAL. Balance professionalism with moderate challenge. 'damage_dealt' range 10-20 for weak answers.";
  }

  let phaseInstruction = "";
  switch(phase) {
      case 'KICKOFF':
          phaseInstruction = "PHASE: KICKOFF (3 min). HR Lead (Alex) should steer. 'Panel convened—[FIELD] pace intense. Settled?' Use icebreakers. Establish panel dynamics. Keep it brief (under 50 words).";
          break;
      case 'WRAP':
          phaseInstruction = "PHASE: WRAP (5 min). Panel confers audibly. Expert to HR Lead: 'Grit factor—advance?' or 'Weak on details.' Ask a final 'vision' question. Keep it brief.";
          break;
      default:
          phaseInstruction = "PHASE: MAIN ROUNDS (35 min). Fuse behavioral (STAR: '[FIELD] hurdle—team ripple?'), situational ('[FIELD] shift—rally?'), alignment. Use universal base with field tweaks.";
  }

  // Injecting the User's "Human-Like Panel Dynamics" Prompt
  const systemPrompt = `
    You are simulating a high-stakes, realistic corporate interview panel for a role in "${field}".
    
    CURRENT SPEAKER: "${targetPersona.name}" (${targetPersona.title}).
    PERSONALITY: ${targetPersona.description}.
    
    ${phaseInstruction}
    ${difficultyInstruction}

    SAFETY & PROFESSIONALISM PROTOCOL (ZERO TOLERANCE):
    Analyze the candidate's input for:
    1. Vulgarity/Profanity/Curse words (e.g., f*ck, sh*t, etc.).
    2. Overt hostility, insults, or aggressive behavior towards the panel.
    3. "Trolling" (nonsense/spam/gibberish designed to waste time).
    4. Sexual harassment or inappropriate conduct.
    
    IF A VIOLATION IS DETECTED:
    1. Set "is_termination": true.
    2. Set "damage_dealt": 100 (Instant Fail).
    3. "dialogue": A firm, professional dismissal. Do NOT engage with the toxicity. 
       Example: "That language is unacceptable. This interview is concluded immediately."
       Example: "We do not tolerate unprofessional conduct. Security will see you out."
    4. "mood": "Dismissive" or "Stern".

    HUMAN-LIKE PANEL DYNAMICS:
    1. REALISM: Use formal opens ("Panel ready—your edge?"), but include human quirks like fillers ("Er... like that project stall?").
    2. INTERRUPTIONS: If the user is rambling or vague, CUT THEM OFF politely but firmly. E.g., HR Lead cuts: "Core—impact?".
    3. NON-VERBALS: Describe actions in text. E.g., "(Coach nods to Expert)".
    4. CHIT-CHAT (20% chance): Include brief cross-talk with other panelists (Alex, Jordan, Morgan, Casey) BEFORE asking the candidate. 
    5. COORDINATION: Reference previous answers or other panelists' reactions.

    OUTPUT RULES:
    1. VOICE STYLE: Spoken-word, punchy, professional but authentic.
    2. LENGTH: Keep it under 60 words to maintain flow.
    3. FIELD FLAVOR: Use specific "${field}" terminology.
    4. IMPORTANT: YOU MUST RETURN RAW VALID JSON ONLY. NO MARKDOWN BLOCK.
    
    Current Context:
    The user said: "${userMessage}".
    History: ${history.slice(-3).join('\n')}
    
    OUTPUT FORMAT (JSON ONLY):
    {
      "speaker": "${targetPersona.name}",
      "mood": "Emotional state",
      "dialogue": "Spoken text",
      "damage_dealt": 0-100,
      "is_termination": boolean
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: systemPrompt,
      config: {
        tools: [{ googleSearch: {} }],
        // NOTE: responseMimeType: 'application/json' cannot be used with Tools. 
        // We rely on the system prompt to enforce JSON structure.
      },
    });

    let jsonString = response.text || "{}";
    
    // Manual cleanup since we can't use JSON mode with Tools
    if (jsonString.includes("```json")) {
        jsonString = jsonString.replace(/```json/g, "").replace(/```/g, "").trim();
    } else if (jsonString.includes("```")) {
        jsonString = jsonString.replace(/```/g, "").trim();
    }

    const data = JSON.parse(jsonString) as BossResponse;

    if (targetPersona) {
        data.speaker = targetPersona.name;
    }

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources: GroundingSource[] = [];
    if (groundingChunks) {
        groundingChunks.forEach((chunk: any) => {
            if (chunk.web?.uri && chunk.web?.title) {
                sources.push({ title: chunk.web.title, uri: chunk.web.uri });
            }
        });
    }
    data.sources = sources;

    return data;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      speaker: targetPersona?.name || 'Glitch',
      mood: 'Erratic',
      dialogue: "My logic circuits are jammed... (API Error)",
      damage_dealt: 0,
      is_termination: false
    };
  }
};

export const analyzeTrainingData = async (
    transcript: string, 
    language: 'en-US' | 'hi-IN',
    strictness: 'LENIENT' | 'NORMAL' | 'STRICT' = 'NORMAL'
): Promise<AnalysisStats> => {
  const ai = getGeminiClient();
  if (!ai) {
    return {
      nativeScore: 65,
      skillDna: { grammar: 70, vocabulary: 60, tone: 80 },
      tips: [
        { original: "Mock Data", suggestion: "Connect API", reason: "API Key Missing" }
      ],
      transcript: transcript || "No audio detected."
    };
  }

  const langContext = language === 'hi-IN' 
    ? "The user is speaking Hindi. Analyze for formal vs colloquial usage and clarity."
    : "The user is speaking English. Analyze for Native American English fluency. Identify non-native phrasing or 'Indianisms'.";

  const strictnessPrompt = strictness === 'STRICT' 
    ? "GRADING: STRICT. Penalize even minor grammar or pronunciation slips heavily. Expect native-level idiom usage and complex sentence structures. Give lower scores."
    : strictness === 'LENIENT' 
    ? "GRADING: LENIENT. Focus only on communication clarity. Ignore minor grammar errors. Be generous with scores to encourage the user."
    : "GRADING: STANDARD. Balance fluency and accuracy.";

  const prompt = `
    Act as a 'Fluency Guru' AI. 
    ${langContext}
    ${strictnessPrompt}
    
    Analyze the following speech transcript:
    "${transcript}"

    Output JSON with these stats:
    1. nativeScore: 0-100.
    2. skillDna: grammar, vocabulary, tone (0-100).
    3. tips: Array of 2-3 specific improvements (original, suggestion, reason).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nativeScore: { type: Type.INTEGER },
            skillDna: { 
              type: Type.OBJECT,
              properties: {
                grammar: { type: Type.INTEGER },
                vocabulary: { type: Type.INTEGER },
                tone: { type: Type.INTEGER }
              },
              required: ['grammar', 'vocabulary', 'tone']
            },
            tips: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT,
                properties: {
                  original: { type: Type.STRING },
                  suggestion: { type: Type.STRING },
                  reason: { type: Type.STRING }
                }
              } 
            }
          },
          required: ['nativeScore', 'skillDna', 'tips']
        }
      }
    });

    if (response.text) {
      const stats = JSON.parse(response.text) as AnalysisStats;
      stats.transcript = transcript;
      return stats;
    }
    throw new Error("Empty analysis response");
  } catch (e) {
    console.error("Analysis Error", e);
    // Return a graceful fallback instead of throwing
    return {
      nativeScore: 50,
      skillDna: { grammar: 50, vocabulary: 50, tone: 50 },
      tips: [{ original: "N/A", suggestion: "N/A", reason: "AI Analysis Temporarily Unavailable" }],
      transcript: transcript
    };
  }
};

export interface InterviewReport {
    grade: string;
    summary: string;
    strengths: string[];
    improvements: string[];
    panelInsights: string; // New field
}

export const generateInterviewReport = async (history: string[]): Promise<InterviewReport> => {
    const ai = getGeminiClient();
    if (!ai) return { grade: "N/A", summary: "API Error", strengths: [], improvements: [], panelInsights: "N/A" };

    const prompt = `
        Analyze this interview transcript for a corporate role.
        TRANSCRIPT:
        ${history.join('\n')}

        Task: Provide a final performance debrief.
        1. Grade: Score / 10 (e.g., "7.5/10").
        2. Summary: 2-sentence executive summary of the performance.
        3. Strengths: 3 bullet points highlighting specific moments (e.g., "Banter navigation: 9/10—handled cross-talk seamlessly").
        4. Improvements: 3 bullet points for areas to re-calibrate.
        5. Panel Insights: 1 sentence on how the candidate handled group dynamics.

        Return strictly valid JSON.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        grade: { type: Type.STRING },
                        summary: { type: Type.STRING },
                        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                        improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
                        panelInsights: { type: Type.STRING }
                    },
                    required: ['grade', 'summary', 'strengths', 'improvements', 'panelInsights']
                }
            }
        });

        return JSON.parse(response.text || "{}") as InterviewReport;
    } catch (e) {
        console.error("Report Generation Error", e);
        return { grade: "5.0/10", summary: "Analysis failed due to connection error.", strengths: [], improvements: [], panelInsights: "N/A" };
    }
};
