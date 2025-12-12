
export enum GamePhase {
  CHARACTER_CREATION = 'CHARACTER_CREATION',
  TRAINING_GYM = 'TRAINING_GYM',
  BOSS_FIGHT = 'BOSS_FIGHT',
}

export interface UserProfile {
  ageRange?: string;
  gender?: string;
  nativeLanguage?: string;
  profession?: string;
  proficiencyLevel?: string;
  goals?: string[];
  challenges?: string[];
  interests?: string[];
  tutorStyle?: string;
  tutorVoice?: string;
  vocabScore?: number;
}

export interface Character {
  name: string;
  role: string; // Derived from profession
  experience: string; // Derived from age/level
  characterClass: string; // Fluff text
  avatarUrl: string;
  profile: UserProfile; // New detailed profile
  xp: number;    
  level: number; 
  unlockedSkills: string[]; // NEW: Tracks unlocked skill IDs
}

export interface ImprovementTip {
  original: string;
  suggestion: string;
  reason: string;
}

export interface AnalysisStats {
  nativeScore: number; // 0-100 (Fluency)
  skillDna: {
    grammar: number;
    vocabulary: number;
    tone: number;
  };
  tips: ImprovementTip[];
  transcript?: string;
}

export type AvatarEmotion = 'happy' | 'neutral' | 'skeptical' | 'angry' | 'disappointed' | 'excited';

export interface Persona {
  id: string;
  name: string;
  title: string;
  color: string;
  avatar: string;
  avatarSeed: string; // NEW: Keeps the identity constant while expressions change
  currentEmotion?: AvatarEmotion; // NEW: Tracks current state
  description: string;
  voice: string; // Gemini TTS Voice Name
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface BossResponse {
  speaker: string; // Name of the persona
  mood: string;
  dialogue: string;
  damage_dealt: number;
  is_termination?: boolean; // NEW: Triggers instant game over
  sources?: GroundingSource[];
}

export interface ChatMessage {
  sender: 'user' | 'system' | 'boss';
  speakerName?: string;
  text: string;
  mood?: string;
  timestamp: number;
  sources?: GroundingSource[];
}
