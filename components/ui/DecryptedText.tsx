
import React, { useState, useEffect } from 'react';

interface Props {
  text: string;
  className?: string;
  speed?: number;
  revealSpeed?: number;
}

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";

const DecryptedText: React.FC<Props> = ({ 
  text, 
  className = "", 
  speed = 50, 
  revealSpeed = 100 
}) => {
  const [displayText, setDisplayText] = useState('');
  const [isScrambling, setIsScrambling] = useState(true);

  useEffect(() => {
    let interval: number;
    let revealIndex = 0;
    
    // Initial fill with random length
    setDisplayText(text.split('').map(() => CHARS[Math.floor(Math.random() * CHARS.length)]).join(''));

    const scramble = () => {
      if (revealIndex >= text.length) {
        setIsScrambling(false);
        setDisplayText(text);
        return;
      }

      const nextText = text
        .split('')
        .map((char, index) => {
          if (index < revealIndex) return char;
          // Random char for unrevealed parts
          if (char === ' ') return ' ';
          return CHARS[Math.floor(Math.random() * CHARS.length)];
        })
        .join('');

      setDisplayText(nextText);
      revealIndex += 0.5; // Increment slowly
    };

    interval = window.setInterval(scramble, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <span className={`${className} inline-block font-header`}>
      {displayText}
    </span>
  );
};

export default DecryptedText;
