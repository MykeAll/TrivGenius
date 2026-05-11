import React from 'react';
import { motion } from 'motion/react';

interface AnimatedBackgroundProps {
  theme: string;
}

export function AnimatedBackground({ theme }: AnimatedBackgroundProps) {
  if (theme === 'space') {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* Twinkling stars */}
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={`star-${i}`}
            className="absolute bg-white rounded-full bg-blend-screen shadow-[0_0_4px_#fff]"
            style={{
              width: Math.random() * 2 + 1,
              height: Math.random() * 2 + 1,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
            animate={{ opacity: [Math.random() * 0.3, 1, Math.random() * 0.3] }}
            transition={{ duration: Math.random() * 2 + 1, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
        {/* Shooting star */}
        <motion.div 
          className="absolute w-32 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent rotate-[-45deg]"
          style={{ top: '20%', left: '10%' }}
          animate={{ x: ['200vw', '-50vw'], y: ['-50vh', '150vh'] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 4, ease: 'linear' }}
        />
      </div>
    );
  }
  
  if (theme === 'underwater') {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* Deep blue gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#001030]/50" />
        
        {/* Bubbles */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute border border-blue-200/40 rounded-full"
            style={{
              width: Math.random() * 12 + 4,
              height: Math.random() * 12 + 4,
              left: `${Math.random() * 100}%`,
              bottom: '-10%'
            }}
            animate={{ 
              y: ['0vh', '-110vh'], 
              x: [0, Math.random() * 40 - 20, 0] 
            }}
            transition={{ 
              duration: Math.random() * 8 + 6, 
              repeat: Infinity, 
              ease: 'linear',
              x: { duration: Math.random() * 3 + 2, repeat: Infinity, ease: 'easeInOut' }
            }}
          />
        ))}
        {/* Light rays */}
        <motion.div
          className="absolute inset-x-0 top-0 h-full bg-[radial-gradient(ellipse_at_top,rgba(0,255,255,0.1)_0%,transparent_70%)] mix-blend-overlay"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    );
  }
  
  if (theme === 'fantasy') {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* Fireflies */}
        {[...Array(25)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute bg-[#a7f3d0] rounded-full shadow-[0_0_8px_#10b981]"
            style={{
              width: Math.random() * 4 + 2,
              height: Math.random() * 4 + 2,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`
            }}
            animate={{ 
              y: [0, Math.random() * -40 - 10, 0],
              x: [0, Math.random() * 40 - 20, 0],
              opacity: [0, 0.8, 0],
              scale: [0.5, 1.2, 0.5]
            }}
            transition={{ duration: Math.random() * 5 + 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>
    );
  }
  
  if (theme === 'cyberpunk') {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* Scanning line */}
        <motion.div 
          className="absolute left-0 right-0 h-[2px] bg-[#00ff41]/50 shadow-[0_0_15px_#00ff41]"
          animate={{ top: ['-10%', '110%'] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        />
        {/* Grid animated */}
        <motion.div 
          className="absolute inset-[-50%] bg-[linear-gradient(to_right,#00ff41_1px,transparent_1px),linear-gradient(to_bottom,#00ff41_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-[0.05] perspective-[1000px] rotate-x-[60deg] origin-bottom scale-150" 
          animate={{ backgroundPosition: ['0rem 0rem', '0rem 4rem'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    );
  }
  

  if (theme === 'vintage') {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-40 mix-blend-overlay">
        {/* Animated Grain */}
        <motion.div 
          className="absolute inset-[-100%] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAlIiBoZWlnaHQ9IjIwMCUiPjxmaWx0ZXIgaWQ9Im4iPjxmZVR1cmJ1bGVuY2UgdHlwZT0iZnJhY3RhbE5vaXNlIiBiYXNlRnJlcXVlbmN5PSIwLjciIG51bU9jdGF2ZXM9IjIiIHN0aXRjaFRpbGVzPSJzdGl0Y2giLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjbikiIG9wYWNpdHk9IjAuMjUiLz48L3N2Zz4=')]"
          animate={{ x: ['0%', '-5%', '2%', '-3%', '0%'], y: ['0%', '-2%', '5%', '-1%', '0%'] }}
          transition={{ duration: 0.2, repeat: Infinity, ease: 'steps(3)' }}
        />
        {/* Sepia vignetting */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.6)_100%)] mix-blend-multiply" />
      </div>
    );
  }

  if (theme === 'scifi') {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#0b0c10]">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute bg-[#66fcf1] rounded-full blur-[2px] shadow-[0_0_10px_#45a29e]"
            style={{
              width: Math.random() * 6 + 2,
              height: Math.random() * 6 + 2,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`
            }}
            animate={{ 
              opacity: [0.1, 0.9, 0.1],
              scale: [1, 1.8, 1],
            }}
            transition={{ duration: Math.random() * 3 + 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
        {/* Animated Hex grid overlay */}
        <motion.div 
          className="absolute inset-[-50%] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSI0MiI+PHBhdGggZD0iTTEyIDBMIDI0IDcgTDI0IDIxIEwxMiAyOCBMMCAyMSBMMCA3IFoiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzY2ZmNmMSIgc3Ryb2tlLW9wYWNpdHk9IjAuMiIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9zdmc+')] bg-[size:30px_42px] opacity-20"
          animate={{ x: ['0px', '-30px'], y: ['0px', '-42px'] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    );
  }

  // default
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      <motion.div 
        className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] pointer-events-none mix-blend-screen"
        animate={{ scale: [1, 1.2, 1], rotate: [0, 45, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div 
        className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-secondary/15 blur-[120px] pointer-events-none mix-blend-screen"
        animate={{ scale: [1, 1.3, 1], rotate: [0, -45, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}
