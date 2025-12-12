
import React, { useEffect, useRef } from 'react';

const CursorTrail: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<{x: number, y: number, lifetime: number}[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize mouse to center initially
    mouseRef.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    handleResize();

    const addPoint = (x: number, y: number) => {
      pointsRef.current.push({ x, y, lifetime: 1.0 });
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Always add current mouse position to keep the head attached to cursor
      // We limit the rate of adding points slightly to smooth it out if needed,
      // but adding every frame makes it most responsive.
      addPoint(mouseRef.current.x, mouseRef.current.y);

      // Filter dead points and update lifetime
      pointsRef.current = pointsRef.current
        .map(p => ({ ...p, lifetime: p.lifetime - 0.04 })) // Decay rate
        .filter(p => p.lifetime > 0);

      if (pointsRef.current.length < 2) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      // Draw the Trail
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      // Glow Effect
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00f0ff';

      // We draw segments individually to apply opacity gradient
      for (let i = 0; i < pointsRef.current.length - 1; i++) {
        const p1 = pointsRef.current[i];
        const p2 = pointsRef.current[i + 1];
        
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        // Quadratic bezier for smoothness? Or just lines for "Digital" feel?
        // Lines feel more "Retro/Arcade".
        ctx.lineTo(p2.x, p2.y);

        // Opacity and Width based on lifetime
        const opacity = p1.lifetime;
        const width = p1.lifetime * 4; // Max width 4px

        ctx.strokeStyle = `rgba(0, 240, 255, ${opacity})`;
        ctx.lineWidth = width;
        ctx.stroke();
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 z-[100] pointer-events-none mix-blend-screen"
    />
  );
};

export default CursorTrail;
