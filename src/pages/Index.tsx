import React, { useEffect, useRef } from 'react';
import ChatInterface from '@/components/ChatInterface';
import { useChat } from '@/context/ChatContext';

const Index = () => {
  const { currentRoom } = useChat();
  const containerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const isHovering = useRef(false);
  const currentRadius = useRef(150);

  // Get theme-based color
  const getThemeColor = () => {
    if (!currentRoom) return { 
      color: '0, 255, 0', 
      opacity: '0.15', 
      textColor: 'text-neon-green',
      bgColor: 'bg-hacker-darker'
    }; // Default green
    
    const theme = currentRoom.theme || 'terminal';
    
    // Return RGB values based on theme
    switch (theme) {
      case 'terminal':
        return { 
          color: '0, 255, 0', 
          opacity: '0.15', 
          textColor: 'text-neon-green',
          bgColor: 'bg-hacker-darker'
        }; // Green
      case 'cyberpunk':
        return { 
          color: '219, 39, 119', 
          opacity: '0.15', 
          textColor: 'text-pink-400',
          bgColor: 'bg-hacker-darker'
        }; // Pink
      case 'retro':
        return { 
          color: '251, 191, 36', 
          opacity: '0.15', 
          textColor: 'text-amber-400',
          bgColor: 'bg-hacker-darker'
        }; // Amber
      case 'minimal':
        return { 
          color: '96, 165, 250', 
          opacity: '0.15', 
          textColor: 'text-blue-400',
          bgColor: 'bg-hacker-darker'
        }; // Blue
      case 'hacker':
        return { 
          color: '34, 197, 94', 
          opacity: '0.15', 
          textColor: 'text-green-500',
          bgColor: 'bg-hacker-darker'
        }; // Green
      case 'premium':
        return { 
          color: '59, 130, 246', 
          opacity: '0.25', 
          textColor: 'text-blue-600',
          bgColor: 'bg-white'
        }; // Blue with white background
      default:
        return { 
          color: '0, 255, 0', 
          opacity: '0.15', 
          textColor: 'text-neon-green',
          bgColor: 'bg-hacker-darker'
        }; // Default green
    }
  };

  // Apply theme-specific styles to document root
  useEffect(() => {
    if (!currentRoom) {
      document.documentElement.classList.remove('theme-premium');
      document.body.classList.remove('premium-theme');
      return;
    }

    if (currentRoom.theme === 'premium') {
      document.documentElement.classList.add('theme-premium');
      document.body.classList.add('premium-theme');
    } else {
      document.documentElement.classList.remove('theme-premium');
      document.body.classList.remove('premium-theme');
    }
  }, [currentRoom]);

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

      // Get current theme color
      const { color, opacity } = getThemeColor();

      // Smooth transition of radius
      currentRadius.current += (targetRadius - currentRadius.current) * 0.1;
      
      glowElement.style.mask = `radial-gradient(circle ${currentRadius.current}px at var(--mouse-x) var(--mouse-y), rgba(${color}, ${opacity}), transparent)`;
      
      // Update grid colors based on theme
      glowElement.style.backgroundImage = `
        linear-gradient(to right, rgba(${color}, 0.3) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(${color}, 0.3) 1px, transparent 1px),
        radial-gradient(circle at center, rgba(${color}, 0.5) 2px, transparent 2px)
      `;
      
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
  }, [currentRoom]); // Add currentRoom as dependency to update when room changes

  // Get the base grid color based on theme
  const { color, textColor, bgColor } = getThemeColor();
  const isPremium = currentRoom?.theme === 'premium';

  return (
    <div 
      ref={containerRef}
      className={`min-h-screen ${bgColor} relative overflow-hidden transition-colors duration-500`}
    >
      {/* Base grid with dots */}
      <div 
        className="absolute inset-0 bg-grid-pattern bg-grid opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(${color}, 0.2) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(${color}, 0.2) 1px, transparent 1px),
            radial-gradient(circle at center, rgba(${color}, 0.3) 2px, transparent 2px)
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
            linear-gradient(to right, rgba(${color}, 0.3) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(${color}, 0.3) 1px, transparent 1px),
            radial-gradient(circle at center, rgba(${color}, 0.5) 2px, transparent 2px)
          `,
          backgroundSize: '20px 20px, 20px 20px, 20px 20px',
          backgroundPosition: '0 0, 0 0, 10px 10px',
          mask: `radial-gradient(circle 150px at var(--mouse-x) var(--mouse-y), rgba(${color}, ${isPremium ? '0.35' : '0.15'}), transparent)`,
          mixBlendMode: isPremium ? 'multiply' : 'screen'
        }}
      />

      <div className="relative w-full max-w-screen-xl mx-auto px-2">
        <header className="py-2 text-center">
          <h1 className={`text-3xl md:text-4xl font-mono font-bold ${textColor} ${isPremium ? 'drop-shadow-sm' : ''}`}>
            <span className="animate-text-flicker">CHATROPOLIS</span>
          </h1>
          <p className={`${textColor.replace('text-', 'text-')}/70 mt-1 font-mono max-w-md mx-auto`}>
            An anonymous space for global conversation.
            No registration. No tracking. Just chat.
          </p>
        </header>
        
        <main>
          <ChatInterface />
        </main>
        
        <footer className={`text-center text-xs ${textColor}/50 py-1 font-mono`}>
          <p>&gt; No logs. No history. Refreshing the page starts a new session.</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
