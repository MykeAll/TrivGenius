let isEnabled = true;

export const setSoundEnabled = (enabled: boolean) => {
  isEnabled = enabled;
};

export const getSoundEnabled = () => isEnabled;

const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

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
  },
  correct: () => {
    playTone(523.25, 'sine', 0.1, 0.1); // C5
    setTimeout(() => playTone(659.25, 'sine', 0.2, 0.1), 100); // E5
  },
  incorrect: () => {
    playTone(300, 'sawtooth', 0.2, 0.1);
    setTimeout(() => playTone(250, 'sawtooth', 0.3, 0.1), 150);
  }
};
