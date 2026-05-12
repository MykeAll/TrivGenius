let isEnabled = true;
let isMusicEnabled = true;

let masterVolume = 0.5;

export const setSoundEnabled = (enabled: boolean) => {
  isEnabled = enabled;
};

export const getSoundEnabled = () => isEnabled;

export const setMusicEnabled = (enabled: boolean) => {
  isMusicEnabled = enabled;
  if (!enabled) stopBGM();
  else playBGM(currentBgmCategory);
};

export const getMusicEnabled = () => isMusicEnabled;

export const setMasterVolume = (vol: number) => {
  masterVolume = Math.max(0, Math.min(1, vol));
  if (masterGainNode) {
    masterGainNode.gain.setValueAtTime(masterVolume, audioCtx.currentTime);
  }
};
export const getMasterVolume = () => masterVolume;

const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
const masterGainNode = audioCtx.createGain();
masterGainNode.gain.value = masterVolume;
masterGainNode.connect(audioCtx.destination);

let bgmInterval: ReturnType<typeof setInterval> | null = null;
let nextNoteTime = 0;
let current16thNote = 0;
let currentBgmCategory = 'General Knowledge';

export const playBGM = (themeOrCategory: string = 'default') => {
  currentBgmCategory = themeOrCategory;
  if (!isMusicEnabled) return;
  
  if (bgmInterval) {
    clearInterval(bgmInterval);
    bgmInterval = null;
  }
  
  if (audioCtx.state === 'suspended') audioCtx.resume();

  // Reset counters for clean start
  nextNoteTime = audioCtx.currentTime + 0.1;
  current16thNote = 0;

  let scheduler: () => void = () => {};

  if (themeOrCategory === 'vintage' || themeOrCategory === 'History' || themeOrCategory === 'fantasy') {
    // Epic Orchestral (Slower, strings and timpani-like)
    const secondsPerBeat = 60.0 / 80.0;
    const secondsPer16th = secondsPerBeat * 0.25;

    scheduler = () => {
      while (nextNoteTime < audioCtx.currentTime + 0.1) {
        const tick = current16thNote;
        const time = nextNoteTime;
        
        // Timpani on 1
        if (tick % 16 === 0) {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(60, time);
          osc.frequency.exponentialRampToValueAtTime(0.01, time + 1.0);
          gain.gain.setValueAtTime(0.4, time);
          gain.gain.exponentialRampToValueAtTime(0.01, time + 1.0);
          osc.connect(gain);
          gain.connect(masterGainNode);
          osc.start(time);
          osc.stop(time + 1.0);
        }

        // Orchestral Strings Pad (Chord changes every 2 beats)
        if (tick % 8 === 0) {
          const chordProgression = [
            [220.00, 261.63, 329.63], // Am
            [174.61, 220.00, 261.63], // F
            [196.00, 246.94, 293.66], // G
            [164.81, 220.00, 246.94]  // Em
          ];
          const chordIndex = Math.floor(tick / 8) % 4;
          const chord = chordProgression[chordIndex];
          
          chord.forEach((freq) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sawtooth';
            // Slow attack and release for strings
            osc.frequency.setValueAtTime(freq, time);
            gain.gain.setValueAtTime(0.001, time);
            gain.gain.linearRampToValueAtTime(0.03, time + 0.5);
            gain.gain.linearRampToValueAtTime(0.001, time + 1.5);
            
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, time);
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(masterGainNode);
            osc.start(time);
            osc.stop(time + 1.5);
          });
        }

        // Fantasy Chimes (for fantasy theme)
        if (themeOrCategory === 'fantasy' && tick % 16 === 8) {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800 + Math.random() * 400, time);
          gain.gain.setValueAtTime(0.05, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
          osc.connect(gain);
          gain.connect(masterGainNode);
          osc.start(time);
          osc.stop(time + 0.5);
        }

        nextNoteTime += secondsPer16th;
        current16thNote++;
      }
    };
  } else if (themeOrCategory === 'cyberpunk' || themeOrCategory === 'Pop Culture' || themeOrCategory === 'scifi') {
    // Upbeat Electronic Dance
    const secondsPerBeat = 60.0 / 128.0;
    const secondsPer16th = secondsPerBeat * 0.25;

    scheduler = () => {
      while (nextNoteTime < audioCtx.currentTime + 0.1) {
        const tick = current16thNote;
        const time = nextNoteTime;
        
        // Four on the floor kick
        if (tick % 4 === 0) {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(120, time);
          osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.4);
          gain.gain.setValueAtTime(0.4, time);
          gain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);
          osc.connect(gain);
          gain.connect(masterGainNode);
          osc.start(time);
          osc.stop(time + 0.4);
        }

        // Offbeat Hi-hat
        if (tick % 4 === 2) {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          const filter = audioCtx.createBiquadFilter();
          osc.type = 'square';
          osc.frequency.setValueAtTime(8000, time);
          filter.type = 'highpass';
          filter.frequency.setValueAtTime(7000, time);
          gain.gain.setValueAtTime(0.05, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(masterGainNode);
          osc.start(time);
          osc.stop(time + 0.1);
        }

        // Bouncy Synth Bass (16th notes)
        if (tick % 2 === 0) {
          const noteIndex = Math.floor(tick / 2) % 8;
          const bassNotes = [65.41, 65.41, 77.78, 65.41, 58.27, 65.41, 87.31, 77.78]; // C, C, Eb, C, Bb, C, F, Eb
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(bassNotes[noteIndex], time);
          gain.gain.setValueAtTime(0.1, time);
          gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
          osc.connect(gain);
          gain.connect(masterGainNode);
          osc.start(time);
          osc.stop(time + 0.15);
        }

        nextNoteTime += secondsPer16th;
        current16thNote++;
      }
    };
  } else if (themeOrCategory === 'space' || themeOrCategory === 'Science') {
    // Ambient / Sci-Fi
    const secondsPerBeat = 60.0 / 90.0;
    const secondsPer16th = secondsPerBeat * 0.25;

    scheduler = () => {
      while (nextNoteTime < audioCtx.currentTime + 0.1) {
        const tick = current16thNote;
        const time = nextNoteTime;
        
        // Ethereal Pad
        if (tick % 16 === 0) {
          const freqs = [130.81, 196.00, 261.63, 392.00]; // Open fifths & octaves 
          freqs.forEach(freq => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time);
            // Slow LFO-like wobble
            osc.frequency.linearRampToValueAtTime(freq * 1.01, time + 1.0);
            osc.frequency.linearRampToValueAtTime(freq, time + 2.0);
            
            gain.gain.setValueAtTime(0.001, time);
            gain.gain.linearRampToValueAtTime(0.04, time + 1.0);
            gain.gain.linearRampToValueAtTime(0.001, time + 2.0);
            
            osc.connect(gain);
            gain.connect(masterGainNode);
            osc.start(time);
            osc.stop(time + 2.0);
          });
        }

        // Occasional Random "Bleep"
        if (tick % 8 === 0 && Math.random() > 0.5) {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800 + Math.random() * 800, time);
          gain.gain.setValueAtTime(0.03, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
          osc.connect(gain);
          gain.connect(masterGainNode);
          osc.start(time);
          osc.stop(time + 0.1);
        }

        nextNoteTime += secondsPer16th;
        current16thNote++;
      }
    };
  } else if (themeOrCategory === 'underwater') {
    // Underwater Ambient
    const secondsPerBeat = 60.0 / 70.0;
    const secondsPer16th = secondsPerBeat * 0.25;

    scheduler = () => {
      while (nextNoteTime < audioCtx.currentTime + 0.1) {
        const tick = current16thNote;
        const time = nextNoteTime;
        
        // Deep water hum
        if (tick % 32 === 0) {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(45, time);
          gain.gain.setValueAtTime(0.001, time);
          gain.gain.linearRampToValueAtTime(0.2, time + 1.0);
          gain.gain.linearRampToValueAtTime(0.001, time + 3.0);
          osc.connect(gain);
          gain.connect(masterGainNode);
          osc.start(time);
          osc.stop(time + 3.0);
        }

        // Bubble sounds
        if (tick % 16 === 0) {
          const bubbleosc = audioCtx.createOscillator();
          const bubblegain = audioCtx.createGain();
          bubbleosc.type = 'sine';
          bubbleosc.frequency.setValueAtTime(300, time);
          bubbleosc.frequency.exponentialRampToValueAtTime(800, time + 0.1);
          bubblegain.gain.setValueAtTime(0.05, time);
          bubblegain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
          bubbleosc.connect(bubblegain);
          bubblegain.connect(masterGainNode);
          bubbleosc.start(time);
          bubbleosc.stop(time + 0.1);
        }

        nextNoteTime += secondsPer16th;
        current16thNote++;
      }
    };

  } else {
    // General Knowledge - Quiz Show Tension (Original)
    const secondsPerBeat = 60.0 / 115.0;
    const secondsPer16th = secondsPerBeat * 0.25;

    scheduler = () => {
      while (nextNoteTime < audioCtx.currentTime + 0.1) {
        const tick = current16thNote;
        const time = nextNoteTime;

        // 1. Kick on 1 and 3
        if (tick % 16 === 0 || tick % 16 === 8) {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(150, time);
          osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
          gain.gain.setValueAtTime(0.3, time);
          gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
          osc.connect(gain);
          gain.connect(masterGainNode);
          osc.start(time);
          osc.stop(time + 0.5);
        }
        
        // 2. Snare-like clap on 2 and 4
        if (tick % 16 === 4 || tick % 16 === 12) {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          const filter = audioCtx.createBiquadFilter();
          osc.type = 'square';
          osc.frequency.setValueAtTime(250, time);
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(1500, time);
          filter.Q.value = 1.5;
          gain.gain.setValueAtTime(0.1, time);
          gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(masterGainNode);
          osc.start(time);
          osc.stop(time + 0.2);
        }

        // 3. Tick-tock (High hat) every 16th note
        const isEighth = tick % 2 === 0;
        const oscHat = audioCtx.createOscillator();
        const gainHat = audioCtx.createGain();
        const filterHat = audioCtx.createBiquadFilter();
        oscHat.type = 'square';
        oscHat.frequency.setValueAtTime(isEighth ? 8000 : 9000, time);
        filterHat.type = 'highpass';
        filterHat.frequency.setValueAtTime(6000, time);
        gainHat.gain.setValueAtTime(isEighth ? 0.04 : 0.015, time);
        gainHat.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
        oscHat.connect(filterHat);
        filterHat.connect(gainHat);
        gainHat.connect(masterGainNode);
        oscHat.start(time);
        oscHat.stop(time + 0.05);

        // 4. Bassline
        if (tick % 2 === 0) {
          const eighthNote = Math.floor(tick / 2) % 16;
          const bassProgression = [
            65.41, 65.41, 65.41, 65.41, 65.41, 65.41, 77.78, 65.41, // C2 mostly
            73.42, 73.42, 73.42, 73.42, 73.42, 73.42, 58.27, 73.42  // D2 mostly
          ];
          const freq = bassProgression[eighthNote];
          
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          const filter = audioCtx.createBiquadFilter();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, time);
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(800, time);
          filter.frequency.exponentialRampToValueAtTime(100, time + 0.2);
          gain.gain.setValueAtTime(0.12, time);
          gain.gain.linearRampToValueAtTime(0.01, time + 0.2);
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(masterGainNode);
          osc.start(time);
          osc.stop(time + 0.2);
        }

        // 5. Tension Arpeggio
        if (true) {
          const arpFreq = (tick % 4 === 0) ? 523.25 : (tick % 4 === 1) ? 392.00 : (tick % 4 === 2) ? 622.25 : 392.00;
          const oscArp = audioCtx.createOscillator();
          const gainArp = audioCtx.createGain();
          const filterArp = audioCtx.createBiquadFilter();
          oscArp.type = 'sine';
          oscArp.frequency.setValueAtTime(arpFreq, time);
          filterArp.type = 'lowpass';
          filterArp.frequency.setValueAtTime(2000, time);
          gainArp.gain.setValueAtTime(0.03, time);
          gainArp.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
          oscArp.connect(filterArp);
          filterArp.connect(gainArp);
          gainArp.connect(masterGainNode);
          oscArp.start(time);
          oscArp.stop(time + 0.15);
        }

        nextNoteTime += secondsPer16th;
        current16thNote++;
      }
    };
  }

  bgmInterval = setInterval(scheduler, 25);
};

export const stopBGM = () => {
  if (bgmInterval) {
    clearInterval(bgmInterval);
    bgmInterval = null;
  }
};

function playTone(freq: number, type: OscillatorType, duration: number, vol: number = 0.1) {
  if (!isEnabled) return;
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

  osc.connect(gain);
  gain.connect(masterGainNode);

  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

export const playSound = {
  click: () => {
    playTone(600, 'sine', 0.1, 0.05);
    triggerHaptic('light');
  },
  correct: () => {
    playTone(523.25, 'sine', 0.1, 0.1); // C5
    setTimeout(() => playTone(659.25, 'sine', 0.2, 0.1), 100); // E5
    triggerHaptic('success');
  },
  incorrect: () => {
    playTone(300, 'sawtooth', 0.2, 0.1);
    setTimeout(() => playTone(250, 'sawtooth', 0.3, 0.1), 150);
    triggerHaptic('error');
  },
  cashRegister: () => {
    if (!isEnabled) return;
    playTone(880, 'square', 0.1, 0.03);
    setTimeout(() => playTone(1108.73, 'square', 0.3, 0.03), 50); // A5 then C#6
    triggerHaptic('heavy');
  },
  gameOver: () => {
    if (!isEnabled) return;
    playTone(250, 'sawtooth', 0.3, 0.1);
    setTimeout(() => playTone(200, 'sawtooth', 0.4, 0.1), 300);
    setTimeout(() => playTone(150, 'sawtooth', 0.8, 0.1), 700);
    triggerHaptic('heavy');
  },
  categorySelect: (category: string) => {
    if (!isEnabled) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    if (category === 'History') {
      // Orchestral sting
      playTone(220, 'sawtooth', 0.8, 0.1);
      playTone(277.18, 'sawtooth', 0.8, 0.1);
      playTone(329.63, 'sawtooth', 0.8, 0.1);
    } else if (category === 'Science') {
      // Sci-Fi chirp
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(2000, audioCtx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(masterGainNode);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } else if (category === 'Pop Culture') {
      // 8-bit jump
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.05, audioCtx.currentTime + 0.2);
      gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(masterGainNode);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } else {
      // Default ding
      playTone(523.25, 'sine', 0.3, 0.1);
    }
    triggerHaptic('light');
  }
};

const triggerHaptic = (type: 'light' | 'success' | 'error' | 'heavy') => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      switch (type) {
        case 'light':
          navigator.vibrate(10);
          break;
        case 'success':
          navigator.vibrate([10, 30, 20]);
          break;
        case 'error':
          navigator.vibrate([20, 40, 20, 40, 30]);
          break;
        case 'heavy':
          navigator.vibrate(40);
          break;
      }
    } catch (e) {
      // Ignore
    }
  }
};
