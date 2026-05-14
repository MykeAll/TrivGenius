import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';

interface AnimatedBackgroundProps {
  theme: string;
}

export function AnimatedBackground({ theme }: AnimatedBackgroundProps) {
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  
  const smoothMouseX = useSpring(mouseX, { damping: 50, stiffness: 400 });
  const smoothMouseY = useSpring(mouseY, { damping: 50, stiffness: 400 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX / window.innerWidth);
      mouseY.set(e.clientY / window.innerHeight);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  if (theme === 'space') {
    const bgX = useTransform(smoothMouseX, [0, 1], ['5%', '-5%']);
    const bgY = useTransform(smoothMouseY, [0, 1], ['5%', '-5%']);
    const mgX = useTransform(smoothMouseX, [0, 1], ['15%', '-15%']);
    const mgY = useTransform(smoothMouseY, [0, 1], ['15%', '-15%']);
    const fgX = useTransform(smoothMouseX, [0, 1], ['30%', '-30%']);
    const fgY = useTransform(smoothMouseY, [0, 1], ['30%', '-30%']);
    const planetX = useTransform(smoothMouseX, [0, 1], ['8%', '-8%']);
    const planetY = useTransform(smoothMouseY, [0, 1], ['8%', '-8%']);

    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#020510] perspective-[1000px]">
        {/* Nebula gradient */}
        <motion.div 
          className="absolute inset-[-10%] bg-[radial-gradient(ellipse_at_top_right,rgba(45,10,75,0.6)_0%,transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(10,30,80,0.6)_0%,transparent_50%)]" 
          style={{ x: bgX, y: bgY }}
        />
        
        {/* Deep background stars (slow) */}
        <motion.div className="absolute inset-[-20%]" style={{ x: bgX, y: bgY }}>
          {[...Array(40)].map((_, i) => (
            <motion.div
              key={`star-bg-${i}`}
              className="absolute bg-white rounded-full bg-blend-screen opacity-30"
              style={{ width: 1, height: 1, top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%` }}
              animate={{ y: [0, -30] }}
              transition={{ duration: Math.random() * 20 + 30, repeat: Infinity, ease: 'linear' }}
            />
          ))}
        </motion.div>

        {/* Mid-ground stars (medium) */}
        <motion.div className="absolute inset-[-20%]" style={{ x: mgX, y: mgY }}>
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={`star-md-${i}`}
              className="absolute bg-blue-100 rounded-full shadow-[0_0_4px_#fff]"
              style={{ width: 2, height: 2, top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`, filter: 'blur(0.5px)' }}
              animate={{ y: [0, -80], opacity: [0.2, 0.8, 0.2] }}
              transition={{ duration: Math.random() * 15 + 15, repeat: Infinity, ease: 'linear' }}
            />
          ))}
        </motion.div>

        {/* Foreground stars (fast) */}
        <motion.div className="absolute inset-[-20%]" style={{ x: fgX, y: fgY }}>
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={`star-fg-${i}`}
              className="absolute bg-white rounded-full shadow-[0_0_8px_#fff]"
              style={{ width: 3, height: 3, top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`, filter: 'blur(1px)' }}
              animate={{ y: [0, -200], scale: [1, 1.5, 1], opacity: [0, 1, 0] }}
              transition={{ duration: Math.random() * 8 + 5, repeat: Infinity, ease: 'linear' }}
            />
          ))}
        </motion.div>

        {/* Floating Planet - 3D illusion */}
        <motion.div
          className="absolute rounded-full shadow-[inset_-20px_-20px_40px_rgba(0,0,0,0.8),0_0_50px_rgba(45,10,75,0.6)]"
          style={{ width: '30vh', height: '30vh', top: '15%', right: '10%', background: 'radial-gradient(circle at 30% 30%, #4b236e, #0a0514)', x: planetX, y: planetY }}
          animate={{ y: [0, 20, 0], rotateZ: [0, 5, 0], scale: [1, 1.02, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Shooting star */}
        <motion.div 
          className="absolute w-48 h-[2px] bg-gradient-to-r from-transparent via-blue-200 to-transparent rotate-[-45deg] blur-[1px]"
          style={{ top: '20%', left: '10%', x: fgX, y: fgY }}
          animate={{ x: ['200vw', '-50vw'], y: ['-50vh', '150vh'], opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 5, ease: 'easeIn' }}
        />
        {/* Floating space dust */}
        <motion.div
           className="absolute inset-[-10%] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC4wNSIgbnVtT2N0YXZlcz0iMiIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNuKSIgb3BhY2l0eT0iMC4wOCIvPjwvc3ZnPg==')] mix-blend-overlay"
           style={{ x: fgX, y: fgY }}
           animate={{ rotate: 5, scale: 1.1 }}
           transition={{ duration: 60, repeat: Infinity, ease: 'linear', repeatType: 'reverse' }}
        />
      </div>
    );
  }
  
  if (theme === 'underwater') {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#000a18] perspective-[1000px]">
        {/* Deep blue gradient & Caustics */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#004a8f]/30 to-[#000510]/90 pointer-events-none" />
        
        {/* Base Caustics */}
        <motion.div 
          className="absolute inset-[-100%] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC4wMiIgbnVtT2N0YXZlcz0iMiIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNuKSIgb3BhY2l0eT0iMC4xNSIvPjwvc3ZnPg==')] mix-blend-overlay rotate-x-[45deg] origin-top opacity-50"
          style={{ x: useTransform(smoothMouseX, [0, 1], ['-5%', '5%']) }}
          animate={{ backgroundPosition: ['0px 0px', '200px 200px'] }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        />

        {/* Dynamic Caustics matching light shafts movement */}
        <motion.div
           className="absolute inset-[-100%] rotate-x-[60deg] origin-bottom mix-blend-screen opacity-40 blur-[2px]"
           style={{ x: useTransform(smoothMouseX, [0, 1], ['-10%', '10%']), y: useTransform(smoothMouseY, [0, 1], ['-5%', '5%']) }}
           animate={{ rotateZ: [-1, 1, -1] }}
           transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        >
          <motion.div 
            className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC4wMTUiIG51bU9jdGF2ZXM9IjMiLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjbikiIG9wYWNpdHk9IjAuNSIvPjwvc3ZnPg==')]"
            animate={{ backgroundPosition: ['0px 0px', '-400px -400px'] }}
            transition={{ duration: 100, repeat: Infinity, ease: 'linear' }}
          />
        </motion.div>

        {/* Detailed Light shafts */}
        <motion.div
           className="absolute top-[-10%] w-[150%] h-[120%] left-[-25%] opacity-40 mix-blend-screen pointer-events-none"
           style={{ x: useTransform(smoothMouseX, [0, 1], ['-10%', '10%']) }}
           animate={{ rotate: [-2, 2, -2] }}
           transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        >
          {[...Array(8)].map((_, i) => (
             <motion.div 
               key={`shaft-${i}`} 
               className="absolute top-0 bottom-0 bg-gradient-to-b from-[#00ffff] to-transparent blur-[15px]" 
               style={{ left: `${i * 15}%`, width: `${Math.random() * 5 + 5}%`, transform: 'rotate(15deg)' }} 
               animate={{ opacity: [0.3, 0.7, 0.3] }}
               transition={{ duration: Math.random() * 5 + 5, repeat: Infinity, ease: 'easeInOut' }}
             />
          ))}
        </motion.div>
        
        {/* Background Bubbles (slow, tiny) */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={`bg-b-${i}`}
            className="absolute border border-blue-300/20 rounded-full shadow-[inset_0_0_5px_rgba(255,255,255,0.1)] blur-[2px]"
            style={{ width: Math.random() * 8 + 2, height: Math.random() * 8 + 2, left: `${Math.random() * 100}%`, bottom: '-10%' }}
            animate={{ y: ['0vh', '-110vh'], x: [0, Math.random() * 20 - 10, 0] }}
            transition={{ y: { duration: Math.random() * 15 + 15, repeat: Infinity, ease: 'linear' }, x: { duration: 4, repeat: Infinity, ease: 'easeInOut' } }}
          />
        ))}

        {/* Midground Bubbles */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={`md-b-${i}`}
            className="absolute border border-blue-300/40 rounded-full shadow-[inset_0_0_8px_rgba(255,255,255,0.2)] blur-[0.5px]"
            style={{ width: Math.random() * 16 + 4, height: Math.random() * 16 + 4, left: `${Math.random() * 100}%`, bottom: '-10%' }}
            animate={{ y: ['0vh', '-110vh'], x: [0, Math.random() * 40 - 20, 0] }}
            transition={{ y: { duration: Math.random() * 10 + 10, repeat: Infinity, ease: 'linear' }, x: { duration: 3, repeat: Infinity, ease: 'easeInOut' } }}
          />
        ))}

        {/* Foreground Bubbles (fast, large) */}
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={`fg-b-${i}`}
            className="absolute border border-blue-200/60 rounded-full shadow-[inset_0_0_15px_rgba(255,255,255,0.4)]"
            style={{ width: Math.random() * 30 + 10, height: Math.random() * 30 + 10, left: `${Math.random() * 100}%`, bottom: '-10%' }}
            animate={{ y: ['0vh', '-110vh'], x: [0, Math.random() * 60 - 30, 0] }}
            transition={{ y: { duration: Math.random() * 8 + 5, repeat: Infinity, ease: 'linear' }, x: { duration: 2, repeat: Infinity, ease: 'easeInOut' } }}
          />
        ))}

        {/* Light rays */}
        <motion.div
          className="absolute inset-x-0 top-0 h-full bg-[radial-gradient(ellipse_at_top,rgba(0,190,255,0.2)_0%,transparent_70%)] mix-blend-screen mix-blend-overlay"
          animate={{ opacity: [0.5, 0.8, 0.5], scale: [1, 1.05, 1], rotate: [-2, 2, -2] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        
        {/* Swaying Seaweed layers (3D depth layers) */}
        {[...Array(12)].map((_, i) => {
          const depth = i % 3; // 0 = bg, 1 = mg, 2 = fg
          return (
          <motion.div
            key={`seaweed-${i}`}
            className={`absolute bottom-0 origin-bottom mix-blend-overlay aspect-[1/15] rounded-t-full 
              ${depth === 0 ? 'bg-teal-900/40 blur-[3px] z-[-2]' : 
                depth === 1 ? 'bg-emerald-800/50 blur-[1px] z-[-1]' : 
                'bg-green-700/60 blur-none'}`}
            style={{
              width: depth === 0 ? '4%' : depth === 1 ? '6%' : '8%',
              height: Math.random() * 60 + (depth === 0 ? 50 : depth === 1 ? 70 : 90) + '%',
              left: `${(i * 11) % 90}%`,
            }}
            animate={{ rotate: [-6, 6, -6], skewX: [-2, 2, -2] }}
            transition={{ duration: Math.random() * 3 + 4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.2 }}
          />
        )})}
      </div>
    );
  }
  
  if (theme === 'fantasy') {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#0f0a1c] perspective-[1000px]">
        {/* Mystical mist base */}
        <motion.div 
           className="absolute bottom-[-10%] w-[120%] h-[40%] bg-[radial-gradient(ellipse_at_bottom,rgba(168,85,247,0.3)_0%,transparent_70%)] blur-[30px]"
           style={{ x: useTransform(smoothMouseX, [0, 1], ['-8%', '0%']) }}
           animate={{ scale: [1, 1.1, 1], opacity: [0.6, 0.8, 0.6] }}
           transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div 
           className="absolute top-0 right-0 w-[50%] h-[50%] bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.15)_0%,transparent_60%)] blur-[40px]" 
           style={{ x: useTransform(smoothMouseX, [0, 1], ['5%', '-5%']) }}
        />

        {/* Fireflies (Interactive) */}
        {[...Array(25)].map((_, i) => (
          <motion.div
             key={`firefly-${i}`}
             className="absolute rounded-full bg-yellow-300 shadow-[0_0_10px_#fef08a]"
             style={{
               width: Math.random() * 3 + 1,
               height: Math.random() * 3 + 1,
               left: `${Math.random() * 100}%`,
               top: `${Math.random() * 100}%`,
               x: useTransform(smoothMouseX, [0, 1], [`${Math.random() * -30}%`, `${Math.random() * 30}%`]),
               y: useTransform(smoothMouseY, [0, 1], [`${Math.random() * -30}%`, `${Math.random() * 30}%`])
             }}
             animate={{
               opacity: [0, 1, 0],
               scale: [0.5, 1.5, 0.5],
               x: [0, Math.random() * 100 - 50],
               y: [0, Math.random() * -100 - 50]
             }}
             transition={{ duration: Math.random() * 5 + 3, repeat: Infinity, ease: 'easeInOut', delay: Math.random() * 5 }}
          />
        ))}

        {/* Floating Glowing Orbs (Interactive) */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={`orb-${i}`}
            className="absolute rounded-full mix-blend-screen"
            style={{
              width: Math.random() * 100 + 50,
              height: Math.random() * 100 + 50,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: `radial-gradient(circle, ${Math.random() > 0.5 ? 'rgba(168,85,247,0.2)' : 'rgba(16,185,129,0.2)'} 0%, transparent 70%)`,
              x: useTransform(smoothMouseX, [0, 1], [`${(i + 1) * -5}%`, `${(i + 1) * 5}%`]),
              y: useTransform(smoothMouseY, [0, 1], [`${(i + 1) * -5}%`, `${(i + 1) * 5}%`])
            }}
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.5, 0.9, 0.5],
              y: [0, Math.random() * -50 - 25, 0]
            }}
            transition={{ duration: Math.random() * 10 + 10, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}

        {/* Rotating mystical rings */}
        <motion.div 
           className="absolute top-[20%] left-[10%] w-64 h-64 border border-purple-500/20 rounded-full border-dashed mix-blend-screen opacity-40"
           style={{ rotateX: 60, x: useTransform(smoothMouseX, [0, 1], ['-10%', '10%']) }}
           animate={{ rotateZ: 360 }}
           transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div 
           className="absolute top-[20%] left-[10%] w-48 h-48 border border-emerald-500/20 rounded-full border-dotted mix-blend-screen opacity-40"
           style={{ rotateX: 60, y: 32, x: 32, translateZ: 50 }}
           animate={{ rotateZ: -360 }}
           transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        />
        
        {/* 3D Spores Layers */}
        {[...Array(40)].map((_, i) => {
          const depth = i % 3; // 0=BG, 1=MG, 2=FG
          const color = Math.random() > 0.5 ? '#a7f3d0' : '#e9d5ff';
          const baseSize = depth === 0 ? 2 : depth === 1 ? 4 : 8;
          return (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              backgroundColor: color,
              boxShadow: `0 0 ${baseSize * 2}px ${color}`,
              width: baseSize,
              height: baseSize,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              filter: `blur(${depth === 0 ? 2 : depth === 1 ? 0.5 : 0}px)`,
              x: useTransform(smoothMouseX, [0, 1], [`${(depth + 1) * -2}%`, `${(depth + 1) * 2}%`]),
              y: useTransform(smoothMouseY, [0, 1], [`${(depth + 1) * -2}%`, `${(depth + 1) * 2}%`])
            }}
            animate={{ 
              y: [0, Math.random() * -100 - 50],
              x: [0, Math.random() * 100 - 50],
              opacity: [0, Math.random() * 0.6 + 0.2, 0],
              scale: [0.5, 1.5, 0.5]
            }}
            transition={{ duration: Math.random() * 8 + (depth === 0 ? 10 : depth === 1 ? 6 : 4), repeat: Infinity, ease: 'easeInOut' }}
          />
        )})}
      </div>
    );
  }
  
  if (theme === 'cyberpunk') {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#050505] perspective-[1000px]">
        {/* Interactive mouse light */}
        <motion.div
           className="absolute w-96 h-96 bg-[radial-gradient(circle,rgba(0,255,65,0.15)_0%,transparent_70%)] rounded-full mix-blend-screen pointer-events-none"
           style={{
             x: useTransform(smoothMouseX, [0, 1], ['-50vw', '50vw']),
             y: useTransform(smoothMouseY, [0, 1], ['-50vh', '50vh']),
             left: '50%',
             top: '50%',
             translateX: '-50%',
             translateY: '-50%'
           }}
        />

        {/* Subtle base glow + Horizon horizon line */}
        <motion.div 
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,255,65,0.08)_0%,transparent_80%)] mix-blend-screen"
          animate={{ opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute bottom-[40%] left-0 right-0 h-[2px] bg-[linear-gradient(90deg,transparent,rgba(0,255,65,0.8),transparent)] shadow-[0_0_20px_#00ff41]" />
        <div className="absolute bottom-[40%] left-0 right-0 h-[30%] bg-gradient-to-t from-transparent to-[rgba(0,255,65,0.15)]" />
        
        {/* Shimmering data streams (vertical matrix style) */}
        {[...Array(15)].map((_, i) => (
           <motion.div
             key={`data-${i}`}
             className="absolute top-0 bottom-0 text-[#00ff41] font-mono text-xs opacity-40 mix-blend-screen"
             style={{
               left: `${Math.random() * 100}%`,
               writingMode: 'vertical-rl',
               textOrientation: 'upright',
               whiteSpace: 'nowrap',
               x: useTransform(smoothMouseX, [0, 1], [`${Math.random() * 20 - 10}%`, `${Math.random() * -20 + 10}%`])
             }}
             animate={{ y: ['-100%', '100%'] }}
             transition={{ duration: Math.random() * 10 + 10, repeat: Infinity, ease: 'linear', delay: Math.random() * -20 }}
           >
             {[...Array(20)].map(() => String.fromCharCode(Math.floor(Math.random() * 64) + 65)).join('')}
           </motion.div>
        ))}

        {/* Scanning lines */}
        {[...Array(3)].map((_, i) => (
          <motion.div 
            key={`scan-${i}`}
            className="absolute left-0 right-0 h-[3px] bg-[#00ff41]/60 shadow-[0_0_20px_#00ff41]"
            style={{ opacity: 0.5 - i * 0.1 }}
            animate={{ top: ['-10%', '110%'] }}
            transition={{ duration: 3 + i, repeat: Infinity, ease: 'linear', delay: i * 1.5 }}
          />
        ))}
        {/* Grid animated */}
        <motion.div 
          className="absolute bottom-0 left-[-50%] right-[-50%] h-[50%] bg-[linear-gradient(to_right,#00ff41_2px,transparent_2px),linear-gradient(to_bottom,#00ff41_2px,transparent_2px)] bg-[size:4rem_2rem] opacity-[0.25] rotate-x-[65deg] origin-top scale-100 border-t border-[#00ff41]/50 shadow-[inset_0_20px_40px_-10px_rgba(0,255,65,0.3)]" 
          style={{ x: useTransform(smoothMouseX, [0, 1], ['2%', '-2%']) }}
          animate={{ backgroundPosition: ['0rem 0rem', '0rem 2rem'] }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    );
  }
  

  if (theme === 'vintage') {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#e0d5c1] dark:bg-[#352516] opacity-90 perspective-[1000px]">
        {/* Animated Grain/Noise */}
        <motion.div 
          className="absolute inset-[-100%] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAlIiBoZWlnaHQ9IjIwMCUiPjxmaWx0ZXIgaWQ9Im4iPjxmZVR1cmJ1bGVuY2UgdHlwZT0iZnJhY3RhbE5vaXNlIiBiYXNlRnJlcXVlbmN5PSIwLjg1IiBudW1PY3RhdmVzPSIzIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI24pIiBvcGFjaXR5PSIwLjM1IiBtaXgtYmxlbmQtbW9kZT0ibXVsdGlwbHkiLz48L3N2Zz4=')]"
          animate={{ x: ['0%', '-3%', '2%', '-1%', '0%'], y: ['0%', '-2%', '4%', '-1%', '0%'] }}
          transition={{ duration: 0.15, repeat: Infinity, ease: 'linear' }}
          style={{ mixBlendMode: 'color-burn', opacity: 0.4 }}
        />
        
        {/* Authentic Light Leaks */}
        <motion.div 
           className="absolute top-[-30%] left-[-10%] w-[80%] h-[80%] bg-[radial-gradient(ellipse_at_center,rgba(255,100,50,0.3)_0%,transparent_60%)] blur-[50px] mix-blend-color-dodge pointer-events-none"
           animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.4, 0.1], x: [0, 30, 0] }}
           transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div 
           className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-[radial-gradient(ellipse_at_center,rgba(255,50,50,0.25)_0%,transparent_60%)] blur-[60px] mix-blend-color-dodge pointer-events-none"
           animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.5, 0.2], y: [0, -20, 0] }}
           transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
        <motion.div 
           className="absolute top-[20%] right-[30%] w-[50%] h-[20%] bg-gradient-to-r from-transparent via-[rgba(255,180,100,0.2)] to-transparent blur-[30px] mix-blend-screen transform rotate-45 pointer-events-none"
           animate={{ opacity: [0, 0.3, 0], x: [-30, 30] }}
           transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
        />

        {/* Scratches */}
        {[...Array(5)].map((_, i) => (
           <motion.div
              key={`scratch-${i}`}
              className="absolute bg-black/40 dark:bg-white/30"
              style={{
                width: Math.random() > 0.5 ? 1 : 2,
                height: `${Math.random() * 40 + 20}%`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                transform: `rotate(${Math.random() * 10 - 5}deg)`
              }}
              animate={{ opacity: [0, 0.8, 0], y: ['0%', '10%'] }}
              transition={{ duration: Math.random() * 0.2 + 0.1, repeat: Infinity, repeatDelay: Math.random() * 3 + 1 }}
           />
        ))}
        {/* Floating dust particles (3D depth) */}
        {[...Array(30)].map((_, i) => (
           <motion.div
              key={`dust-${i}`}
              className="absolute bg-[#FFE0B2]/50 rounded-full mix-blend-screen"
              style={{
                width: Math.random() * 4 + 1,
                height: Math.random() * 4 + 1,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                filter: `blur(${Math.random() * 2}px)`,
                x: useTransform(smoothMouseX, [0, 1], [`${(i % 5) * -5}%`, `${(i % 5) * 5}%`]),
                y: useTransform(smoothMouseY, [0, 1], [`${(i % 5) * -5}%`, `${(i % 5) * 5}%`])
              }}
              animate={{
                y: [0, Math.random() * -100 - 50],
                x: [0, Math.random() * 50 - 25],
                opacity: [0, Math.random() * 0.5 + 0.2, 0],
                scale: [0.5, Math.random() * 2 + 1, 0.5]
              }}
              transition={{ duration: Math.random() * 10 + 5, repeat: Infinity, ease: 'linear' }}
           />
        ))}
        {/* Sepia vignetting */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(60,40,20,0.8)_100%)] mix-blend-multiply border-[20px] border-black/10 rounded-[30px]" />
      </div>
    );
  }

  if (theme === 'scifi') {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#06101e] perspective-[1000px]">
        {/* Ambient tech glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(69,162,158,0.15)_0%,transparent_70%)] blur-[40px]" />

        {/* Distant slowly rotating geometric shapes */}
        {[...Array(6)].map((_, i) => (
           <motion.div
             key={`geo-${i}`}
             className="absolute mix-blend-screen"
             style={{
               width: Math.random() * 150 + 50,
               height: Math.random() * 150 + 50,
               left: `${Math.random() * 100}%`,
               top: `${Math.random() * 100}%`,
               border: `1px solid rgba(69,162,158,${Math.random() * 0.2 + 0.1})`,
               clipPath: i % 2 === 0 
                  ? 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' // Hexagon
                  : 'polygon(50% 0%, 0% 100%, 100% 100%)', // Triangle
               x: useTransform(smoothMouseX, [0, 1], [`${(i + 1) * -2}%`, `${(i + 1) * 2}%`]),
               y: useTransform(smoothMouseY, [0, 1], [`${(i + 1) * -2}%`, `${(i + 1) * 2}%`])
             }}
             animate={{ rotateZ: [0, 360], rotateX: [0, 360], rotateY: [0, 360] }}
             transition={{ duration: Math.random() * 40 + 40, repeat: Infinity, ease: 'linear' }}
           />
        ))}
        
        {/* Glowing floating data nodes (3D) */}
        {[...Array(40)].map((_, i) => {
          const depth = i % 3; // 0=bg, 1=mg, 2=fg
          const size = depth === 0 ? 2 : depth === 1 ? 4 : 6;
          return (
          <motion.div
            key={i}
            className="absolute bg-[#66fcf1] rounded-full shadow-[0_0_12px_#45a29e]"
            style={{
              width: size,
              height: size,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              filter: `blur(${depth === 0 ? 3 : depth === 1 ? 1 : 0}px)`
            }}
            animate={{ 
              opacity: [0.2, 1, 0.2],
              scale: [1, 1.5, 1],
              z: [0, 50, 0],
              x: [0, Math.random() * 30 - 15, 0],
              y: [0, Math.random() * 30 - 15, 0]
            }}
            transition={{ duration: Math.random() * 4 + 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        )})}

        {/* 3D HUD rings & Holograms */}
        <motion.div
          className="absolute top-[30%] left-[20%] w-[150px] h-[150px] border border-[#45a29e]/30 rounded-full border-dashed mix-blend-screen"
          style={{ rotateX: 60, rotateY: 20, x: useTransform(smoothMouseX, [0, 1], ['-5%', '5%']) }}
          animate={{ rotateZ: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute top-[30%] left-[20%] w-[200px] h-[200px] border-2 border-[#45a29e]/20 rounded-full border-dotted mix-blend-screen"
          style={{ rotateX: 60, rotateY: 20, x: useTransform(smoothMouseX, [0, 1], ['-25px', '15px']), y: -25, translateZ: -50 }}
          animate={{ rotateZ: -360 }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
           className="absolute bottom-[20%] right-[15%] w-[80px] h-[80px] mix-blend-screen opacity-50"
           style={{ rotateX: 45, x: useTransform(smoothMouseX, [0, 1], ['5%', '-5%']) }}
           animate={{ rotateZ: 360 }}
           transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
        >
           {/* Crosshair structure */}
           <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-[#66fcf1]" />
           <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-[#66fcf1]" />
           <div className="absolute inset-0 border border-[#45a29e] rounded-full" />
           <div className="absolute inset-2 border border-[#45a29e]/50 border-dashed rounded-full" />
        </motion.div>

        {/* Animated Hex grid overlay with depth */}
        <motion.div 
          className="absolute inset-[-50%] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSI0MiI+PHBhdGggZD0iTTEyIDBMIDI0IDcgTDI0IDIxIEwxMiAyOCBMMCAyMSBMMCA3IFoiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzY2ZmNmMSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9zdmc+')] bg-[size:40px_56px] opacity-30 mix-blend-screen origin-center"
          style={{ rotateX: 45, scale: 1.5, x: useTransform(smoothMouseX, [0, 1], ['-2%', '2%']) }}
          animate={{ opacity: [0.15, 0.35, 0.15], y: [0, 56] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    );
  }

  // default
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden bg-slate-900 perspective-[1000px]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(50,50,90,0.3)_0%,transparent_80%)] mix-blend-screen" />
      <motion.div 
        className="absolute top-[-30%] right-[-10%] w-[60%] h-[70%] rounded-full bg-primary/20 blur-[130px] mix-blend-screen"
        animate={{ scale: [1, 1.15, 1], rotate: [0, 90, 0], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div 
        className="absolute bottom-[-30%] left-[-20%] w-[70%] h-[70%] rounded-full bg-secondary/20 blur-[140px] mix-blend-screen"
        animate={{ scale: [1, 1.2, 1], rotate: [0, -90, 0], opacity: [0.6, 0.9, 0.6] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      
      {/* 3D floating particles for the default background */}
      {[...Array(30)].map((_, i) => {
        const depth = i % 3; // 0=bg, 1=mg, 2=fg
        const size = depth === 0 ? 2 : depth === 1 ? 4 : 6;
        return (
        <motion.div
           key={`particle-${i}`}
           className="absolute bg-white/20 rounded-full"
           style={{
             width: size,
             height: size,
             left: `${Math.random() * 100}%`,
             top: `${Math.random() * 100}%`,
             filter: `blur(${depth === 0 ? 2 : depth === 1 ? 1 : 0}px)`
           }}
           animate={{
             y: [0, Math.random() * -100 - 30],
             x: [0, Math.random() * 40 - 20],
             opacity: [0, depth === 0 ? 0.3 : 0.6, 0],
             scale: [0.5, 1.5, 0.5]
           }}
           transition={{ duration: Math.random() * 8 + 8, repeat: Infinity, ease: 'easeInOut' }}
        />
      )})}
    </div>
  );
}
