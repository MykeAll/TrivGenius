import React from 'react';

type AdPlaceholderProps = {
  type: 'banner' | 'interstitial' | 'rewarded';
  className?: string;
  onClose?: () => void;
};

export const AdPlaceholder: React.FC<AdPlaceholderProps> = ({ type, className = '', onClose }) => {
  if (type === 'banner') {
    return (
      <div className={`w-full max-w-[320px] h-[50px] bg-slate-200 border-2 border-dashed border-slate-400 text-slate-500 mx-auto flex items-center justify-center text-xs font-mono tracking-wider ${className}`}>
        [ ADMOB BANNER 320x50 ]
      </div>
    );
  }

  if (type === 'interstitial' || type === 'rewarded') {
    return (
      <div className={`fixed inset-0 z-50 bg-[#1a1a2e] flex flex-col items-center justify-center p-6 ${className}`}>
        <div className="absolute top-4 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded">
          Ad
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm rounded-2xl border-4 border-dashed border-slate-500 bg-slate-800 text-slate-400 p-8 space-y-4 text-center">
          <h2 className="text-xl font-bold uppercase tracking-widest text-slate-300">
            {type === 'rewarded' ? 'Rewarded Video' : 'Interstitial Ad'}
          </h2>
          <p className="text-sm">
            Imagine a highly engaging ad for another mobil game right here.
          </p>
          <div className="w-24 h-24 border-2 border-dashed border-slate-500 rounded-xl my-4"></div>
          <p className="text-xs opacity-50">Making you money 💸</p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="mt-8 px-6 py-3 rounded-full bg-slate-700 text-white font-bold tracking-widest hover:bg-slate-600 transition-colors uppercase text-sm"
          >
            Close Ad
          </button>
        )}
      </div>
    );
  }

  return null;
};
