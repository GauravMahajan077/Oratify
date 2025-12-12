
import React, { useState, useEffect, useRef } from 'react';
import PixelCard from './ui/PixelCard';
import PixelButton from './ui/PixelButton';
import PixelBar from './ui/PixelBar';
import DecryptedText from './ui/DecryptedText';
import TypewriterText from './ui/TypewriterText';
import { Character, UserProfile } from '../types';
import { User, Zap, ChevronRight, ChevronLeft, Check, Mic, Brain, Shield, Terminal, BookOpen, Activity, Layout, Heart, RotateCcw } from 'lucide-react';
import { playSuccess, playClick, playHover } from '../utils/audio';

// --- TYPES ---
type QuestionType = 'single' | 'multi' | 'scale' | 'text';

interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[]; // For single/multi
  preFact?: string; // The psychological "nugget"
  scaleLabel?: { min: string, max: string }; // For 1-5 scale
}

interface Module {
  id: string;
  title: string;
  icon: React.ReactNode;
  questions: Question[];
}

// --- DATA: ENRICHED DATASET ---
const QUESTION_MODULES: Module[] = [
  {
    id: 'background',
    title: 'SECTION 1: ORIGIN STORY',
    icon: <User className="w-4 h-4" />,
    questions: [
      { 
        id: 'q_daily_usage', 
        type: 'single',
        preFact: "Did you know? 85% of job success comes from soft skills like communication, per LinkedIn's Global Talent Trends.",
        text: "How often do you use your primary professional language in daily corporate interactions?", 
        options: ["Every day", "A few times per week", "A few times per month", "Rarely"] 
      },
      { 
        id: 'q_goals', 
        type: 'multi',
        preFact: "Harvard Business Review notes that clear goal-setting boosts skill acquisition by 42%.",
        text: "What aspects do you want to improve most?", 
        options: ["Speaking Confidence", "Pronunciation", "Professional Vocabulary", "Grammar Precision", "Understanding Accents", "Persuasive Writing"] 
      },
      { 
        id: 'q_freeze', 
        type: 'single',
        preFact: "Psych tip: 'Freezing' is common—mindfulness reduces it by 25%, per APA studies.",
        text: "What's holding you back in professional conversations?", 
        options: ["I freeze under pressure", "Struggle to articulate ideas", "Accent/Clarity issues", "Fear of grammar errors", "Cultural misunderstandings"] 
      },
      {
        id: 'q_industry',
        type: 'text',
        preFact: "World Economic Forum ranks adaptability as a top skill—your field shapes how we tailor this.",
        text: "What industry or field do you work in?",
      }
    ]
  },
  {
    id: 'context',
    title: 'SECTION 2: BATTLEFIELD CONTEXT',
    icon: <Layout className="w-4 h-4" />,
    questions: [
        {
            id: 'q_scenarios',
            type: 'multi',
            preFact: "Scenario mastery: Focusing on 2-3 contexts yields 60% faster ROI in skills.",
            text: "Which corporate scenarios do you want to target?",
            options: ["Job Interviews", "Executive Presentations", "Negotiations", "Team Huddles", "Networking Events", "Conflict Resolution"]
        },
        {
            id: 'q_tutor_style',
            type: 'single',
            preFact: "Tutor match: 'Friendly-strict' hybrids drive 40% better outcomes, per coaching psych.",
            text: "Build your ideal coach personality:",
            options: ["Cheerful & Encouraging", "Strict & Accountable", "Academic & Insightful", "Direct & ROI-Focused", "Friendly & Relatable"]
        },
        {
            id: 'q_feedback_pref',
            type: 'single',
            preFact: "Correction balance: Fluency-first approaches build confidence 2x faster.",
            text: "How do you prefer feedback during practice?",
            options: ["Immediate Interruptions", "Post-Speech Summary", "Only Critical Errors", "Flow over Perfection"]
        }
    ]
  },
  {
    id: 'personality',
    title: 'SECTION 3: NEURAL ARCHITECTURE',
    icon: <Brain className="w-4 h-4" />,
    questions: [
        {
            id: 'q_disc',
            type: 'single',
            preFact: "Personality power: Understanding yours predicts 30% of career success.",
            text: "How would you describe your social energy in teams?",
            options: ["Dominant (I lead/drive)", "Influential (I inspire/connect)", "Steady (I support/harmonize)", "Conscientious (I plan/perfect)"]
        },
        {
            id: 'q_conflict',
            type: 'single',
            preFact: "Conflict catalyst: 69% of issues stem from miscommunication—skill up to resolve.",
            text: "In disagreements, you tend to...",
            options: ["Confront directly", "Mediate collaboratively", "Avoid until resolved", "Delegate to others"]
        }
    ]
  }
];

const ASSESSMENT_QUESTIONS = [
    "I actively listen without interrupting.",
    "I adapt my message to the audience.",
    "I handle criticism constructively.",
    "I express ideas clearly under time pressure.",
    "I recognize my emotional triggers.",
    "I resolve conflicts collaboratively.",
    "I seek feedback regularly.",
    "I articulate complex ideas simply."
];

// --- MAIN COMPONENT ---

interface Props {
  onComplete: (char: Character) => void;
  onRestart: () => void;
}

const CharacterCreator: React.FC<Props> = ({ onComplete, onRestart }) => {
  const [step, setStep] = useState<'NAME' | 'MODULES' | 'ASSESSMENT' | 'REPORT'>('NAME');
  
  // State: Identity
  const [name, setName] = useState('');
  
  // State: Questionnaire
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentModuleIdx, setCurrentModuleIdx] = useState<number>(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [textInput, setTextInput] = useState(''); // For text type questions

  // State: Assessment
  const [assessmentScores, setAssessmentScores] = useState<Record<number, number>>({}); // Index -> 1-5 Score
  const [assessmentIdx, setAssessmentIdx] = useState(0);

  // State: Gamification
  const [currentXp, setCurrentXp] = useState<number>(0);
  
  // --- HANDLERS: NAVIGATION ---
  
  const handleBack = () => {
    playClick();
    if (step === 'REPORT') {
        setStep('ASSESSMENT');
        setAssessmentIdx(ASSESSMENT_QUESTIONS.length - 1); // Go to last assessment q
    } else if (step === 'ASSESSMENT') {
        if (assessmentIdx > 0) {
            setAssessmentIdx(prev => prev - 1);
        } else {
            setStep('MODULES');
            setCurrentModuleIdx(QUESTION_MODULES.length - 1);
            setCurrentQuestionIdx(QUESTION_MODULES[QUESTION_MODULES.length - 1].questions.length - 1);
        }
    } else if (step === 'MODULES') {
        if (currentQuestionIdx > 0) {
            setCurrentQuestionIdx(prev => prev - 1);
        } else if (currentModuleIdx > 0) {
            setCurrentModuleIdx(prev => prev - 1);
            const prevModule = QUESTION_MODULES[currentModuleIdx - 1];
            setCurrentQuestionIdx(prevModule.questions.length - 1);
        } 
        // NOTE: We do NOT go back to NAME. Identity is locked.
    }
  };

  // --- HANDLERS: NAME ---
  const handleNameSubmit = () => {
    if (!name.trim()) return;
    playSuccess();
    setCurrentXp(prev => prev + 150);
    setStep('MODULES');
  };

  // --- HANDLERS: MODULES ---
  const handleAnswer = (value: any, isMulti: boolean = false) => {
    playClick();
    const currentModule = QUESTION_MODULES[currentModuleIdx];
    const q = currentModule.questions[currentQuestionIdx];

    if (isMulti) {
        setAnswers(prev => {
            const current = prev[q.id] || [];
            if (current.includes(value)) {
                return { ...prev, [q.id]: current.filter((i: string) => i !== value) };
            }
            return { ...prev, [q.id]: [...current, value] };
        });
    } else {
        setAnswers(prev => ({ ...prev, [q.id]: value }));
        // Delay for single select to allow visual feedback
        setTimeout(nextQuestion, 300);
    }
  };

  const handleTextSubmit = () => {
      if (!textInput.trim()) return;
      playClick();
      const currentModule = QUESTION_MODULES[currentModuleIdx];
      const q = currentModule.questions[currentQuestionIdx];
      setAnswers(prev => ({ ...prev, [q.id]: textInput }));
      setTextInput('');
      nextQuestion();
  };

  const nextQuestion = () => {
    const currentModule = QUESTION_MODULES[currentModuleIdx];
    setCurrentXp(prev => prev + 25); // XP per question

    if (currentQuestionIdx < currentModule.questions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
    } else if (currentModuleIdx < QUESTION_MODULES.length - 1) {
      setCurrentModuleIdx(prev => prev + 1);
      setCurrentQuestionIdx(0);
      playSuccess();
    } else {
      setStep('ASSESSMENT');
      playSuccess();
    }
  };

  // --- HANDLERS: ASSESSMENT ---
  const handleAssessmentScore = (score: number) => {
      playHover();
      setAssessmentScores(prev => ({ ...prev, [assessmentIdx]: score }));
      
      if (assessmentIdx < ASSESSMENT_QUESTIONS.length - 1) {
          setTimeout(() => setAssessmentIdx(prev => prev + 1), 200);
      } else {
          // Finish Assessment
          setCurrentXp(prev => prev + 200);
          setStep('REPORT');
      }
  };

  // --- HANDLERS: FINISH ---
  const finishProfile = () => {
      const totalXp = currentXp + 250; // Completion Bonus
      const level = Math.floor(totalXp / 1000) + 1;

      // Calculate Assessment Baseline (0-100)
      const totalScore = Object.values(assessmentScores).reduce((a: number, b: number) => Number(a) + Number(b), 0);
      const maxScore = ASSESSMENT_QUESTIONS.length * 5;
      const baselinePercentage = Math.round((Number(totalScore) / Number(maxScore)) * 100);

      // Derive Archetype from Personality Q
      const socialStyle = (answers['q_disc'] as string) || 'Balanced';
      const roleName = name ? `${name.split(' ')[0]} the ${socialStyle.split(' ')[0]}` : 'Agent';

      const profile: UserProfile = {
          proficiencyLevel: baselinePercentage > 80 ? 'Advanced' : baselinePercentage > 50 ? 'Intermediate' : 'Beginner',
          goals: answers['q_goals'] || [],
          challenges: [answers['q_freeze']].filter(Boolean),
          profession: answers['q_industry'],
          tutorStyle: answers['q_tutor_style'],
          vocabScore: baselinePercentage // Using assessment score as proxy for initial metric
      };

      const character: Character = {
          name,
          role: answers['q_industry'] || 'Professional',
          experience: `${baselinePercentage}% Efficiency`,
          characterClass: socialStyle.split(' ')[0] || 'Strategist',
          avatarUrl: `https://api.dicebear.com/9.x/avataaars/svg?seed=${name}&clothing=blazerAndShirt`,
          profile,
          xp: totalXp,
          level: level,
          unlockedSkills: ['core_uplink']
      };

      onComplete(character);
  };

  // --- RENDERERS ---

  const renderXpIndicator = () => (
    <div className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-black/40 backdrop-blur rounded-full px-4 py-2 border border-neon-cyan/30 animate-fade-in transition-all duration-300">
        <div className="w-2 h-2 bg-neon-cyan rounded-full animate-pulse"></div>
        <span key={currentXp} className="font-header text-xs text-neon-cyan tracking-widest transition-all">{currentXp} XP</span>
    </div>
  );

  const renderRestartButton = () => (
      <button 
        onClick={onRestart}
        className="absolute top-0 left-1/2 -translate-x-1/2 z-50 text-gray-500 hover:text-red-500 flex items-center gap-2 font-header text-xs transition-colors bg-black/40 backdrop-blur rounded-full px-4 py-2 border border-white/10 hover:border-red-500/50"
      >
          <RotateCcw className="w-3 h-3" /> ABORT SESSION
      </button>
  );

  const renderNameStep = () => (
    <div className="flex flex-col items-center justify-center h-full gap-8 animate-fade-in relative">
        <div className="text-center space-y-4">
            <h1 className="text-5xl font-header font-bold text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-blue-500">
                <DecryptedText text="IDENTITY UPLINK" />
            </h1>
            <p className="text-gray-400 font-body tracking-widest uppercase text-sm">
                Corporate Simulation v2.4
            </p>
        </div>
        <div className="w-full max-w-md relative group">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5 group-focus-within:text-neon-cyan transition-colors" />
            <input 
                autoFocus
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                placeholder="ENTER AGENT NAME"
                className="w-full bg-cyber-black border border-white/20 rounded-lg py-4 pl-12 pr-4 text-white font-header text-xl focus:border-neon-cyan outline-none shadow-[0_0_15px_rgba(0,0,0,0.5)] focus:shadow-[0_0_25px_rgba(0,240,255,0.2)] transition-all"
            />
        </div>
        <PixelButton 
            label="INITIALIZE" 
            variant="primary" 
            onClick={handleNameSubmit} 
            disabled={!name} 
            className="w-48"
            icon={<Zap />}
        />
    </div>
  );

  const renderModulesStep = () => {
      const module = QUESTION_MODULES[currentModuleIdx];
      const q = module.questions[currentQuestionIdx];
      const isMulti = q.type === 'multi';
      const currentAnswer = answers[q.id];

      // Explicit numbering for UI
      const stepNumber = (currentModuleIdx * 4) + currentQuestionIdx + 1;
      const progressPercent = ((currentQuestionIdx + 1) / module.questions.length) * 100;
      
      const isFirstStep = currentModuleIdx === 0 && currentQuestionIdx === 0;

      return (
          <div className="w-full max-w-4xl animate-fade-in flex flex-col min-h-[75vh] relative pt-12">
              {!isFirstStep && (
                <button 
                    onClick={handleBack}
                    className="absolute top-0 left-0 text-gray-500 hover:text-white flex items-center gap-1 font-header text-xs transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" /> BACK
                </button>
              )}

              {/* Progress Header */}
              <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-4">
                  <div className="p-2 bg-neon-cyan/10 rounded-lg border border-neon-cyan/30 text-neon-cyan">
                      {module.icon}
                  </div>
                  <div className="flex-1">
                      <div className="flex justify-between items-end mb-1">
                          <span className="font-header text-sm text-neon-cyan tracking-widest">{module.title}</span>
                          <span className="font-mono text-xs text-gray-500">REQ {stepNumber} / {10}</span>
                      </div>
                      <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-neon-cyan transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                          />
                      </div>
                  </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 flex flex-col relative">
                  
                  {/* Pre-Fact Nugget */}
                  {q.preFact && (
                      <div className="mb-6 bg-gradient-to-r from-blue-900/20 to-transparent border-l-2 border-blue-400 p-4 animate-fade-in">
                          <div className="flex items-start gap-3">
                              <BookOpen className="w-4 h-4 text-blue-400 mt-1 shrink-0" />
                              <div>
                                  <p className="text-xs font-header text-blue-300 uppercase mb-1">Psych Insight</p>
                                  <p className="text-sm font-body text-gray-300 italic leading-relaxed">"{q.preFact}"</p>
                              </div>
                          </div>
                      </div>
                  )}

                  <h2 className="text-2xl md:text-3xl font-body text-white mb-8 leading-relaxed">
                      {/* Added key to force re-mount on question change, fixing the 'only H appears' bug */}
                      <TypewriterText key={q.id} text={q.text} speed={10} />
                      {isMulti && <span className="text-xs text-gray-500 ml-2 block mt-2 font-mono">(SELECT MULTIPLE)</span>}
                  </h2>

                  {/* Options Renderer */}
                  {q.type === 'text' ? (
                      <div className="flex gap-4 items-center">
                          <input 
                            autoFocus
                            type="text" 
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                            className="flex-1 bg-cyber-dark border border-white/20 p-4 rounded text-white font-body focus:border-neon-cyan outline-none"
                            placeholder="Type your answer..."
                          />
                          <PixelButton label="NEXT" onClick={handleTextSubmit} variant="primary" icon={<ChevronRight />} />
                      </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {q.options?.map((opt, idx) => {
                            const isSelected = isMulti 
                                ? (currentAnswer || []).includes(opt)
                                : currentAnswer === opt;
                            
                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleAnswer(opt, isMulti)}
                                    className={`
                                        p-4 text-left rounded-lg border transition-all duration-200 flex items-center justify-between group
                                        ${isSelected 
                                            ? 'bg-neon-cyan/20 border-neon-cyan text-white shadow-[0_0_15px_rgba(0,240,255,0.3)]' 
                                            : 'bg-cyber-dark border-white/10 text-gray-400 hover:bg-white/5 hover:border-white/30 hover:text-gray-200'}
                                    `}
                                >
                                    <span className="font-body text-lg">{opt}</span>
                                    {isSelected && <Check className="w-4 h-4 text-neon-cyan" />}
                                </button>
                            );
                        })}
                    </div>
                  )}
              </div>

              {isMulti && (
                <div className="mt-6 flex justify-end">
                    <PixelButton label="CONFIRM PROTOCOLS" onClick={nextQuestion} variant="default" icon={<ChevronRight />} />
                </div>
            )}
          </div>
      );
  };

  const renderAssessmentStep = () => {
      const question = ASSESSMENT_QUESTIONS[assessmentIdx];
      const progress = ((assessmentIdx + 1) / ASSESSMENT_QUESTIONS.length) * 100;

      return (
          <div className="w-full max-w-3xl animate-fade-in flex flex-col items-center justify-center min-h-[70vh] text-center relative pt-12">
              <button 
                onClick={handleBack}
                className="absolute top-0 left-0 text-gray-500 hover:text-white flex items-center gap-1 font-header text-xs transition-colors"
              >
                  <ChevronLeft className="w-4 h-4" /> BACK
              </button>

              <div className="mb-8 mt-12">
                  <h2 className="text-3xl font-header text-white mb-2"><DecryptedText text="BASELINE DIAGNOSTIC" /></h2>
                  <p className="text-gray-400 font-body">Rate yourself honestly (1 = Never, 5 = Always)</p>
              </div>

              <PixelCard className="w-full p-8 mb-8 border-neon-purple/50 bg-cyber-dark/80 backdrop-blur-md">
                  <p className="text-2xl font-body text-white leading-relaxed">
                      "{question}"
                  </p>
              </PixelCard>

              {/* 1-5 Scale */}
              <div className="flex gap-4 w-full justify-center mb-8">
                  {[1, 2, 3, 4, 5].map((val) => (
                      <button
                          key={val}
                          onClick={() => handleAssessmentScore(val)}
                          className="w-12 h-12 md:w-16 md:h-16 rounded-full border border-white/20 hover:border-neon-purple hover:bg-neon-purple/20 text-white font-header text-xl transition-all hover:scale-110 focus:ring-2 focus:ring-neon-purple"
                      >
                          {val}
                      </button>
                  ))}
              </div>
              <div className="flex justify-between w-full max-w-md px-4 text-xs font-header text-gray-500 uppercase tracking-widest">
                   <span>Never</span>
                   <span>Always</span>
              </div>

              <div className="w-full max-w-md h-1 bg-gray-800 rounded-full mt-12 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-neon-purple to-pink-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
              </div>
          </div>
      );
  };

  const renderReportStep = () => {
    const totalScore = Object.values(assessmentScores).reduce((a: number, b: number) => Number(a) + Number(b), 0);
    const maxScore = ASSESSMENT_QUESTIONS.length * 5;
    const percentage = Math.round((Number(totalScore) / Number(maxScore)) * 100);
    
    // Determine Archetype
    const social = (answers['q_disc'] as string) || "Balanced";
    const archetype = social.split(' ')[0] || "Strategist";

    return (
        <div className="w-full max-w-4xl animate-fade-in min-h-[80vh] flex flex-col relative pt-12">
            <button 
                onClick={handleBack}
                className="absolute top-0 left-0 text-gray-500 hover:text-white flex items-center gap-1 font-header text-xs transition-colors"
            >
                <ChevronLeft className="w-4 h-4" /> RE-CALIBRATE
            </button>

            <div className="text-center mb-6 mt-8">
                <h1 className="text-3xl font-header text-white tracking-widest">ANALYSIS REPORT <span className="text-neon-cyan text-sm">#8492-X</span></h1>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 pr-2">
                
                {/* Executive Summary */}
                <PixelCard title="EXECUTIVE SUMMARY" className="flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                         <div className="w-20 h-20 rounded-full border-2 border-neon-cyan p-1">
                             <img src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${name}&clothing=blazerAndShirt`} alt="avatar" className="w-full h-full rounded-full bg-gray-800" />
                         </div>
                         <div>
                             <h3 className="text-xl font-header text-white uppercase">{name}</h3>
                             <p className="text-neon-cyan font-mono text-sm">ARCHETYPE: {archetype}</p>
                             <p className="text-gray-400 text-xs mt-1">Ready for deployment in: {answers['q_industry']}</p>
                         </div>
                    </div>
                    
                    <div className="mt-2 p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-xs font-header text-gray-400">BASELINE EFFICIENCY</span>
                            <span className="text-xl font-bold text-neon-green">{percentage}%</span>
                        </div>
                        <div className="w-full h-2 bg-black rounded-full overflow-hidden">
                            <div className="h-full bg-neon-green" style={{ width: `${percentage}%` }}></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2 italic">
                            {percentage > 75 ? "Excellent baseline. Focus on polish." : "Strong potential. Fundamentals required."}
                        </p>
                    </div>
                </PixelCard>

                {/* Personality Matrix */}
                <PixelCard title="NEURAL MATRIX">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Heart className="w-4 h-4 text-pink-500" />
                                <span className="text-sm text-gray-300">Empathy</span>
                            </div>
                            <div className="flex gap-1">
                                {[1,2,3,4,5].map(i => <div key={i} className={`w-2 h-4 rounded-sm ${i <= 4 ? 'bg-pink-500' : 'bg-gray-800'}`}></div>)}
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Activity className="w-4 h-4 text-blue-500" />
                                <span className="text-sm text-gray-300">Resilience</span>
                            </div>
                            <div className="flex gap-1">
                                {[1,2,3,4,5].map(i => <div key={i} className={`w-2 h-4 rounded-sm ${i <= 3 ? 'bg-blue-500' : 'bg-gray-800'}`}></div>)}
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Layout className="w-4 h-4 text-yellow-500" />
                                <span className="text-sm text-gray-300">Structure</span>
                            </div>
                            <div className="flex gap-1">
                                {[1,2,3,4,5].map(i => <div key={i} className={`w-2 h-4 rounded-sm ${i <= (social.includes('Conscientious') ? 5 : 3) ? 'bg-yellow-500' : 'bg-gray-800'}`}></div>)}
                            </div>
                        </div>
                    </div>
                    <p className="mt-4 text-xs text-gray-400 border-t border-white/10 pt-4 leading-relaxed">
                        Insight: As a <strong>{archetype}</strong>, you thrive when conversations are {social.includes('Dominant') ? 'direct and goal-oriented' : 'collaborative and warm'}. Your training modules will adapt to this style.
                    </p>
                </PixelCard>

                {/* Tactical Roadmap */}
                <PixelCard title="TACTICAL ROADMAP" className="md:col-span-2">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {[
                            { week: 'W1', title: 'Foundations', focus: 'Vocab & Grammar', status: 'LOCKED' },
                            { week: 'W2', title: 'Simulation', focus: answers['q_scenarios']?.[0] || 'Interviews', status: 'LOCKED' },
                            { week: 'W3', title: 'Pressure', focus: 'Rapid Response', status: 'LOCKED' },
                            { week: 'W4', title: 'Mastery', focus: 'Complex Debates', status: 'LOCKED' },
                        ].map((item, i) => (
                            <div key={i} className="bg-cyber-black/50 border border-white/10 p-4 rounded flex flex-col relative overflow-hidden group">
                                <span className="text-xs font-header text-gray-500 mb-1">{item.week}</span>
                                <span className="text-sm font-bold text-white mb-2">{item.title}</span>
                                <span className="text-xs text-neon-cyan">{item.focus}</span>
                                {i === 0 && <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>}
                            </div>
                        ))}
                    </div>
                </PixelCard>
            </div>

            <div className="mt-6 flex justify-center pb-8">
                 <PixelButton 
                    label="INITIATE TRAINING SEQUENCE" 
                    variant="primary" 
                    icon={<Terminal />} 
                    className="w-full md:w-1/2"
                    onClick={finishProfile}
                />
            </div>
        </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full relative z-10 p-4">
        {step !== 'NAME' && renderRestartButton()}
        {renderXpIndicator()}
        {step === 'NAME' && renderNameStep()}
        {step === 'MODULES' && renderModulesStep()}
        {step === 'ASSESSMENT' && renderAssessmentStep()}
        {step === 'REPORT' && renderReportStep()}
    </div>
  );
};

export default CharacterCreator;
