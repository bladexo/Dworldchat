import React, { useEffect, useRef } from 'react';
import ChatInterface from '@/components/ChatInterface';
import { ChatProvider } from '@/context/ChatContext';

const Index = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const isHovering = useRef(false);
  const currentRadius = useRef(150);

  useEffect(() => {
    const container = containerRef.current;
    const glowElement = glowRef.current;
    if (!container || !glowElement) return;

    let animationFrame: number;
    let targetRadius = 150; // Initial radius

    const updateGlowRadius = () => {
      if (isHovering.current) {
        targetRadius = 300; // Expanded radius
      } else {
        targetRadius = 150; // Initial radius
      }

      // Smooth transition of radius
      currentRadius.current += (targetRadius - currentRadius.current) * 0.1;
      
      glowElement.style.mask = `radial-gradient(circle ${currentRadius.current}px at var(--mouse-x) var(--mouse-y), rgba(0, 255, 0, 0.15), transparent)`;
      
      animationFrame = requestAnimationFrame(updateGlowRadius);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      container.style.setProperty('--mouse-x', `${x}px`);
      container.style.setProperty('--mouse-y', `${y}px`);
    };

    const handleMouseEnter = () => {
      isHovering.current = true;
    };

    const handleMouseLeave = () => {
      isHovering.current = false;
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);
    
    animationFrame = requestAnimationFrame(updateGlowRadius);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-hacker-darker relative overflow-hidden"
    >
      {/* Base grid with dots */}
      <div 
        className="absolute inset-0 bg-grid-pattern bg-grid opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0, 255, 0, 0.2) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 255, 0, 0.2) 1px, transparent 1px),
            radial-gradient(circle at center, rgba(0, 255, 0, 0.3) 2px, transparent 2px)
          `,
          backgroundSize: '20px 20px, 20px 20px, 20px 20px',
          backgroundPosition: '0 0, 0 0, 10px 10px'
        }}
      />

      {/* Glow effect layer with dots */}
      <div 
        ref={glowRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0, 255, 0, 0.3) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 255, 0, 0.3) 1px, transparent 1px),
            radial-gradient(circle at center, rgba(0, 255, 0, 0.5) 2px, transparent 2px)
          `,
          backgroundSize: '20px 20px, 20px 20px, 20px 20px',
          backgroundPosition: '0 0, 0 0, 10px 10px',
          mask: 'radial-gradient(circle 150px at var(--mouse-x) var(--mouse-y), rgba(0, 255, 0, 0.15), transparent)',
          mixBlendMode: 'screen'
        }}
      />

      <div className="relative w-full max-w-screen-xl mx-auto px-4">
        <header className="py-6 text-center">
          <h1 className="text-3xl md:text-4xl font-mono font-bold text-neon-green">
            <span className="animate-text-flicker">CHATROPOLIS</span>
          </h1>
          <p className="text-neon-green/70 mt-2 font-mono max-w-md mx-auto">
            An anonymous space for global conversation.
            No registration. No tracking. Just chat.
          </p>
        </header>
        
        <main className="pb-12">
          <ChatProvider>
            <ChatInterface />
          </ChatProvider>
        </main>
        
        <footer className="text-center text-xs text-neon-green/50 py-4 font-mono">
          <p>&gt; No logs. No history. Refreshing the page starts a new session.</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
