import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

type AdPlaceholderProps = {
  type: 'banner' | 'interstitial' | 'rewarded';
  className?: string;
  onClose?: () => void;
};

export const AdPlaceholder: React.FC<AdPlaceholderProps> = ({ type, className = '', onClose }) => {
  const [timeLeft, setTimeLeft] = useState(type === 'rewarded' ? 5 : 3);
  const [canClose, setCanClose] = useState(false);

  useEffect(() => {
    if (type === 'banner') return;
    
    if (timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    } else {
      setCanClose(true);
    }
  }, [timeLeft, type]);

  if (type === 'banner') {
    return (
      <div className={`w-full max-w-[320px] h-[50px] bg-slate-800 border border-slate-700 text-slate-500 mx-auto flex items-center justify-center text-[10px] font-mono tracking-wider shadow-lg rounded ${className}`}>
        <span>AdMob Banner [320x50]</span>
      </div>
    );
  }

  if (type === 'interstitial' || type === 'rewarded') {
    return (
      <div className={`fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-6 backdrop-blur-sm ${className}`}>
        <div className="absolute top-4 left-4 bg-yellow-500 text-black font-bold text-[10px] px-2 py-0.5 rounded uppercase tracking-wider">
          Advertisement
        </div>
        
        {canClose && onClose ? (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/50 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all"
          >
            <X size={20} />
          </button>
        ) : (
          <div className="absolute top-4 right-4 text-white/50 font-mono text-sm pr-2">
            Reward in {timeLeft}s
          </div>
        )}
        
        <div className="flex flex-col items-center justify-center w-full max-w-sm">
          <div className="w-full h-48 bg-slate-800 border-2 border-slate-700 rounded-xl mb-6 shadow-2xl relative overflow-hidden flex items-center justify-center group cursor-pointer hover:border-primary/50 transition-colors">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,195,255,0.15)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="text-center">
              <h3 className="text-white font-bold text-lg mb-1">Epic Mobile Game</h3>
              <p className="text-slate-400 text-sm max-w-[200px] mx-auto leading-tight">Install now and get 5000 free coins!</p>
            </div>
            
            <button className="absolute bottom-4 bg-primary text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg transform group-hover:scale-105 transition-transform uppercase tracking-wider">
              Install Now
            </button>
          </div>
          
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">
            {type === 'rewarded' ? 'Rewarded Video Ad' : 'Interstitial Ad'}
          </h2>
          <p className="text-[10px] text-slate-600">Simulated AdMob SDK Integration</p>
        </div>
      </div>
    );
  }

  return null;
};
