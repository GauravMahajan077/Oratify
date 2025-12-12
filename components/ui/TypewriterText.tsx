
import React, { useState, useEffect } from 'react';
import { playTypewriterClick } from '../../utils/audio';

interface Props {
  text: string;
  speed?: number; // ms per char
  onComplete?: () => void;
  className?: string;
  startDelay?: number;
}

const TypewriterText: React.FC<Props> = ({ 
  text, 
  speed = 30, 
  onComplete, 
  className = '',
  startDelay = 0 
}) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    // Reset immediately when text changes
    setDisplayedText('');
    
    let timer: ReturnType<typeof setTimeout>;
    let charIndex = 0;

    const typeNextChar = () => {
        if (charIndex < text.length) {
            const char = text.charAt(charIndex);
            setDisplayedText((prev) => prev + char);
            
            try {
               // Play sound only for visible chars
               if (char.trim()) playTypewriterClick();
            } catch(e) {
               // Ignore audio errors
            }

            charIndex++;
            // Slight random variance for realism
            const variance = Math.random() * 10;
            timer = setTimeout(typeNextChar, speed + variance);
        } else {
            if (onComplete) onComplete();
        }
    };

    const startTimeout = setTimeout(() => {
        typeNextChar();
    }, startDelay);

    return () => {
      clearTimeout(startTimeout);
      clearTimeout(timer);
    };
  }, [text, speed, startDelay, onComplete]);

  return (
    <span className={className}>
      {displayedText}
      {displayedText.length < text.length && (
        <span className="animate-pulse text-neon-cyan inline-block w-[2px] h-[1em] bg-neon-cyan align-middle ml-1 opacity-70"></span>
      )}
    </span>
  );
};

export default TypewriterText;
