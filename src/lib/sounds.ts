let isEnabled = true;
let isMusicEnabled = true;

export const setSoundEnabled = (enabled: boolean) => {
  isEnabled = enabled;
};

export const getSoundEnabled = () => isEnabled;

export const setMusicEnabled = (enabled: boolean) => {
  isMusicEnabled = enabled;
  if (!enabled) stopBGM();
  else playBGM();
};

export const getMusicEnabled = () => isMusicEnabled;

const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

let bgmInterval: ReturnType<typeof setInterval> | null = null;
let nextNoteTime = 0;
let current16thNote = 0;

export const playBGM = () => {
  if (!isMusicEnabled || bgmInterval) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();

  // "Quiz Show Tension" - 115 BPM
  const secondsPerBeat = 60.0 / 115.0;
  const secondsPer16th = secondsPerBeat * 0.25;

  nextNoteTime = audioCtx.currentTime + 0.1;
  current16thNote = 0;

  const scheduleNote = (tick: number, time: number) => {
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
      gain.connect(audioCtx.destination);
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
      gain.connect(audioCtx.destination);
      osc.start(time);
      osc.stop(time + 0.2);
    }

    // 3. Tick-tock (High hat) every 16th note, louder on 8ths
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
    gainHat.connect(audioCtx.destination);
    oscHat.start(time);
    oscHat.stop(time + 0.05);

    // 4. Bassline (Driving 8th notes with syncopation)
    if (tick % 2 === 0) {
      const eighthNote = Math.floor(tick / 2) % 16;
      // 2-bar bass loop: C, C, C, Eb, D, D, D, Bb
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
      gain.connect(audioCtx.destination);
      
      osc.start(time);
      osc.stop(time + 0.2);
    }

    // 5. Tension Arpeggio (16th notes)
    const arpFreq = (tick % 4 === 0) ? 523.25 : (tick % 4 === 1) ? 392.00 : (tick % 4 === 2) ? 622.25 : 392.00; // C5, G4, Eb5, G4
    const oscArp = audioCtx.createOscillator();
    const gainArp = audioCtx.createGain();
    const filterArp = audioCtx.createBiquadFilter();
    
    oscArp.type = 'sine'; // Subtle sine
    oscArp.frequency.setValueAtTime(arpFreq, time);
    
    filterArp.type = 'lowpass';
    filterArp.frequency.setValueAtTime(2000, time);
    // Add volume dip to make it pulse
    gainArp.gain.setValueAtTime(0.03, time);
    gainArp.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
    
    oscArp.connect(filterArp);
    filterArp.connect(gainArp);
    gainArp.connect(audioCtx.destination);
    oscArp.start(time);
    oscArp.stop(time + 0.15);
  };

  const scheduler = () => {
    while (nextNoteTime < audioCtx.currentTime + 0.1) {
      scheduleNote(current16thNote, nextNoteTime);
      nextNoteTime += secondsPer16th;
      current16thNote++;
    }
  };

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
  gain.connect(audioCtx.destination);

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
