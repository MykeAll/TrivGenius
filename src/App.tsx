import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, Brain, Check, X, Trophy, Timer, Lightbulb, Share2, Settings, Star, Calendar } from 'lucide-react';
import { AnimatedBackground } from './components/AnimatedBackground';
import { AdPlaceholder } from './components/AdPlaceholder';
import { generateTriviaQuestions, TriviaQuestion } from './lib/gemini';
import { AnimatedNumber } from './components/AnimatedNumber';
import { playSound, getSoundEnabled, setSoundEnabled, playBGM, stopBGM, setMusicEnabled, setMasterVolume, getMasterVolume } from './lib/sounds';

type GameState = 'MENU' | 'LOADING' | 'PLAYING' | 'ADVERT' | 'ADVERT_REWARDED' | 'GAME_OVER' | 'SETTINGS' | 'ACHIEVEMENTS';
type Difficulty = 'Easy' | 'Medium' | 'Hard';
type Category = 'General Knowledge' | 'Science' | 'History' | 'Pop Culture';
type Theme = 'default' | 'space' | 'underwater' | 'fantasy' | 'cyberpunk' | 'vintage' | 'scifi';

type Stats = {
  totalCorrect: number;
  currentStreak: number;
  maxStreak: number;
  hardModePlayed: boolean;
  hintsUsed: number;
  dailyChallengesCompleted: number;
  dailyHighScore: number;
  gamesCompleted: number;
  totalScore: number;
  categoryPlays: Record<string, number>;
};

const defaultStats: Stats = {
  totalCorrect: 0,
  currentStreak: 0,
  maxStreak: 0,
  hardModePlayed: false,
  hintsUsed: 0,
  dailyChallengesCompleted: 0,
  dailyHighScore: 0,
  gamesCompleted: 0,
  totalScore: 0,
  categoryPlays: {
    'General Knowledge': 0,
    'Science': 0,
    'History': 0,
    'Pop Culture': 0,
  }
};

const QUESTIONS_PER_ROUND = 5;
const DAILY_SECONDS = 10;


export default function App() {
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isProcessingOption, setIsProcessingOption] = useState<number | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
  const [category, setCategory] = useState<Category>('General Knowledge');
  const [theme, setTheme] = useState<Theme>('default');
  const [playerName, setPlayerName] = useState('');
  
  const [timeLeft, setTimeLeft] = useState(15);
  const [hintUsed, setHintUsed] = useState(false);
  const [skipUsed, setSkipUsed] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showSecondChance, setShowSecondChance] = useState(false);
  const [secondChanceUsed, setSecondChanceUsed] = useState(false);
  const [shimmerScore, setShimmerScore] = useState(false);
  
  const [eliminatedOptions, setEliminatedOptions] = useState<number[]>([]);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  
  const [isDailyChallenge, setIsDailyChallenge] = useState(false);
  const [dailyTimeStr, setDailyTimeStr] = useState('');
  const [stats, setStats] = useState<Stats>(defaultStats);
  const [soundEnabled, setSoundToggle] = useState(true);

  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [musicEnabled, setMusicToggle] = useState(true);
  const [musicVolume, setMusicVolume] = useState(0.5);
  const [showMusicControls, setShowMusicControls] = useState(false);
  const [timerDuration, setTimerDurationState] = useState<number>(15);
  const [scorePopup, setScorePopup] = useState<number | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [resumeMusicAfterAd, setResumeMusicAfterAd] = useState(false);
  const [themePreview, setThemePreview] = useState<Theme | null>(null);
  const [prevGameState, setPrevGameState] = useState<GameState | null>(null);
  const [showCategoryConfirm, setShowCategoryConfirm] = useState(false);

  // Stats updater
  const updateStats = (updates: Partial<Stats>) => {
    setStats(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem('trivia_genius_stats', JSON.stringify(next));
      return next;
    });
  };

  // Daily Challenge countdown
  useEffect(() => {
    const calcDailyTime = () => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const diff = tomorrow.getTime() - now.getTime();
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setDailyTimeStr(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    calcDailyTime();
    const id = setInterval(calcDailyTime, 1000);
    return () => clearInterval(id);
  }, []);

  // Load high score and name from local storage
  useEffect(() => {
    const saved = localStorage.getItem('trivia_genius_high_score');
    if (saved) {
      setHighScore(parseInt(saved, 10));
    }
    const savedName = localStorage.getItem('trivia_genius_player_name');
    if (savedName) {
      setPlayerName(savedName);
    }
    const savedTheme = localStorage.getItem('trivia_genius_theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
    }
    const savedStats = localStorage.getItem('trivia_genius_stats');
    if (savedStats) {
      setStats({ ...defaultStats, ...JSON.parse(savedStats) });
    }
    const savedSound = localStorage.getItem('trivia_genius_sound');
    if (savedSound !== null) {
      const isEnabled = savedSound === 'true';
      setSoundToggle(isEnabled);
      setSoundEnabled(isEnabled);
    }
    const savedMusic = localStorage.getItem('trivia_genius_music');
    if (savedMusic !== null) {
      const isMusicEnabled = savedMusic === 'true';
      setMusicToggle(isMusicEnabled);
      setMusicEnabled(isMusicEnabled);
    }
    const savedTimer = localStorage.getItem('trivia_genius_timer_duration');
    if (savedTimer !== null) {
      setTimerDurationState(parseInt(savedTimer, 10));
    }
    const savedResumeMusic = localStorage.getItem('trivia_genius_resume_music');
    if (savedResumeMusic !== null) {
      setResumeMusicAfterAd(savedResumeMusic === 'true');
    }
  }, []);

  const toggleSound = () => {
    playSound.click();
    const next = !soundEnabled;
    setSoundToggle(next);
    setSoundEnabled(next);
    localStorage.setItem('trivia_genius_sound', String(next));
  };

  const toggleMusic = () => {
    playSound.click();
    const next = !musicEnabled;
    setMusicToggle(next);
    setMusicEnabled(next);
    localStorage.setItem('trivia_genius_music', String(next));
    if (next) {
      playBGM(theme);
    } else {
      stopBGM();
    }
  };

  const toggleResumeMusic = () => {
    playSound.click();
    const next = !resumeMusicAfterAd;
    setResumeMusicAfterAd(next);
    localStorage.setItem('trivia_genius_resume_music', String(next));
  };

  const handleStartRequest = () => {
    playSound.click();
    if (!playerName || playerName.trim().length < 2) {
      setNameError("Please enter a name (at least 2 characters).");
      return;
    }
    setNameError(null);
    setShowCategoryConfirm(true);
  };

  const startGame = async () => {
    playSound.click();
    setShowCategoryConfirm(false);
    setApiError(null);
    playBGM(theme);
    localStorage.setItem('trivia_genius_player_name', playerName);
    localStorage.setItem('trivia_genius_theme', theme);
    if (difficulty === 'Hard' && !stats.hardModePlayed) updateStats({ hardModePlayed: true });
    
    // Easter Egg
    const isSpeedrun = playerName.toLowerCase().trim() === 'speedrun';
    const newTimerDuration = isSpeedrun ? 5 : 15;
    setTimerDurationState(newTimerDuration);

    setScore(0);
    setIsNewHighScore(false);
    setIsDailyChallenge(false);
    setGameState('LOADING');
    await fetchQuestions(newTimerDuration);
  };

  const startDailyChallenge = async () => {
    playSound.click();
    if (!playerName || playerName.trim().length < 2) {
      setNameError("Please enter a name (at least 2 characters).");
      return;
    }
    setNameError(null);
    setApiError(null);
    playBGM(theme);
    localStorage.setItem('trivia_genius_player_name', playerName);
    localStorage.setItem('trivia_genius_theme', theme);
    
    // Check if daily challenge already played today
    const lastPlayed = localStorage.getItem('trivia_genius_daily_last_played');
    const today = new Date().toDateString();
    if (lastPlayed === today) {
      alert("You have already played the Daily Challenge today! Come back tomorrow.");
      return;
    }
    localStorage.setItem('trivia_genius_daily_last_played', today);

    setScore(0);
    setIsNewHighScore(false);
    setIsDailyChallenge(true);
    setDifficulty('Hard'); // Modifiers
    setGameState('LOADING');
    setIsLoading(true);
    const { questions: newQuestions, error } = await generateTriviaQuestions(10, 'Hard', 'General Knowledge'); // 10 hard questions
    if (error) setApiError(error);
    setQuestions(newQuestions);
    setCurrentIdx(0);
    setSelectedOption(null);
    setIsAnswerRevealed(false);
    setHintUsed(false);
    setSkipUsed(false);
    setSecondChanceUsed(false);
    setEliminatedOptions([]);
    setTimeLeft(DAILY_SECONDS);
    setIsLoading(false);
    setGameState('PLAYING');
  };

  const fetchQuestions = async (forcedDuration?: number) => {
    setIsLoading(true);
    setApiError(null);
    const { questions: newQuestions, error } = await generateTriviaQuestions(QUESTIONS_PER_ROUND, difficulty, category);
    if (error) setApiError(error);
    setQuestions(newQuestions);
    setCurrentIdx(0);
    setSelectedOption(null);
    setIsAnswerRevealed(false);
    setHintUsed(false);
    setSkipUsed(false);
    setSecondChanceUsed(false);
    setEliminatedOptions([]);
    setTimeLeft(isDailyChallenge ? DAILY_SECONDS : (forcedDuration ?? timerDuration));
    setIsLoading(false);
    setGameState('PLAYING');
  };

  useEffect(() => {
    if (gameState === 'PLAYING' && !isAnswerRevealed && isProcessingOption === null && timeLeft > 0 && !isPaused && !showSecondChance && (isDailyChallenge || timerDuration > 0)) {
      const timerId = setTimeout(() => {
        setTimeLeft(t => t - 1);
      }, 1000);
      return () => clearTimeout(timerId);
    } else if (gameState === 'PLAYING' && !isAnswerRevealed && isProcessingOption === null && timeLeft === 0 && !isPaused && !showSecondChance && (isDailyChallenge || timerDuration > 0)) {
      handleOptionClick(-1); // -1 signifies timeout
    }
  }, [gameState, isAnswerRevealed, isProcessingOption, timeLeft, isPaused, showSecondChance]);

  const fireConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFCC00', '#FF3366', '#00C3FF']
    });
  };

  const handleGameOver = () => {
    playSound.gameOver();
    const newTotalScore = (stats.totalScore || 0) + score;
    const catPlays = (stats.categoryPlays ? { ...stats.categoryPlays } : {
      'General Knowledge': 0,
      'Science': 0,
      'History': 0,
      'Pop Culture': 0,
    }) as any;
    if (category in catPlays) {
      catPlays[category as string] = (catPlays[category as string] || 0) + 1;
    }

    if (isDailyChallenge) {
      updateStats({
        dailyChallengesCompleted: (stats.dailyChallengesCompleted || 0) + 1,
        dailyHighScore: Math.max(stats.dailyHighScore || 0, score),
        gamesCompleted: (stats.gamesCompleted || 0) + 1,
        totalScore: newTotalScore,
        categoryPlays: catPlays
      });
    } else {
      updateStats({
        gamesCompleted: (stats.gamesCompleted || 0) + 1,
        totalScore: newTotalScore,
        categoryPlays: catPlays
      });
    }
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('trivia_genius_high_score', score.toString());
    }
    setGameState('GAME_OVER');
  };

  const advanceQuestion = () => {
    const isRoundOver = currentIdx + 1 >= questions.length;
    if (isRoundOver) {
      if (isDailyChallenge) {
        handleGameOver();
      } else {
        stopBGM();
        setGameState('ADVERT');
      }
    } else {
      setCurrentIdx(i => i + 1);
      setSelectedOption(null);
      setIsAnswerRevealed(false);
      setEliminatedOptions([]);
      setScorePopup(null);
      setTimeLeft(isDailyChallenge ? DAILY_SECONDS : timerDuration);
      setShimmerScore(false);
    }
  };

  const handleOptionClick = (idx: number) => {
    if (isAnswerRevealed || isPaused || showSecondChance || isProcessingOption !== null) return;
    
    if (idx !== -1) {
      playSound.click();
      setIsProcessingOption(idx);
    }
    
    setTimeout(() => {
      if (idx !== -1) {
        setIsProcessingOption(null);
      }
      setSelectedOption(idx);
      setIsAnswerRevealed(true);

      const isCorrect = idx === questions[currentIdx].correctOptionIndex;
      
      if (isCorrect) {
        const difficultyMultiplier = difficulty === 'Easy' ? 0.5 : difficulty === 'Hard' ? 2 : 1;
        const pointsGained = 100 * difficultyMultiplier;
        const newScore = score + pointsGained;
        
        const milestones = [1000, 5000, 10000, 20000, 50000, 100000];
        const crossedMilestone = milestones.some(m => score < m && newScore >= m);
        if (crossedMilestone) {
          confetti({
            particleCount: 250,
            spread: 120,
            origin: { y: 0.5 },
            colors: ['#00C3FF', '#FF3366', '#FFCC00', '#00FF00']
          });
        }
        
        setScore(newScore);
        setScorePopup(pointsGained);
        let newHighScoreTriggered = false;
        if (newScore > highScore && highScore > 0 && !isNewHighScore) {
          setIsNewHighScore(true);
          setShimmerScore(true);
          newHighScoreTriggered = true;
          confetti({
            particleCount: 150,
            spread: 100,
            origin: { y: 0.5 },
            colors: ['#FFD700', '#FFA500', '#FF8C00']
          });
        }
        const newStreak = stats.currentStreak + 1;
        updateStats({ 
          totalCorrect: stats.totalCorrect + 1,
          currentStreak: newStreak,
          maxStreak: Math.max(stats.maxStreak, newStreak)
        });
        
        playSound.cashRegister();
        playSound.correct();
        if (!newHighScoreTriggered) fireConfetti();
        
        setTimeout(() => advanceQuestion(), 1500);
      } else {
        updateStats({ currentStreak: 0 });
        if (idx !== -1) playSound.incorrect();
        
        if (!secondChanceUsed && !isDailyChallenge && idx !== -1) {
           setTimeout(() => setShowSecondChance(true), 1000);
        } else {
           setTimeout(() => advanceQuestion(), 1500);
        }
      }
    }, idx === -1 ? 0 : 400);
  };

  const useSkip = () => {
    if (skipUsed || isAnswerRevealed || gameState !== 'PLAYING' || isPaused || showSecondChance) return;
    playSound.click();
    setSkipUsed(true);
    advanceQuestion();
  };

  const confirmQuit = () => {
    playSound.click();
    setShowQuitConfirm(true);
    setIsPaused(true);
  };

  const cancelQuit = () => {
    playSound.click();
    setShowQuitConfirm(false);
    setIsPaused(false);
  };

  const handleQuit = () => {
    playSound.click();
    setShowQuitConfirm(false);
    setIsPaused(false);
    setGameState('MENU');
  };

  const useHint = () => {
    if (hintUsed || isAnswerRevealed || gameState !== 'PLAYING' || isPaused || showSecondChance) return;
    playSound.click();
    setHintUsed(true);
    updateStats({ hintsUsed: stats.hintsUsed + 1 });
    
    const currentQ = questions[currentIdx];
    const incorrectIndices = [0, 1, 2, 3].filter(
      i => i !== currentQ.correctOptionIndex && !eliminatedOptions.includes(i)
    );
    
    if (incorrectIndices.length >= 2) {
      const shuffled = [...incorrectIndices].sort(() => 0.5 - Math.random());
      setEliminatedOptions(prev => [...prev, shuffled[0], shuffled[1]]);
    } else if (incorrectIndices.length === 1) {
      setEliminatedOptions(prev => [...prev, incorrectIndices[0]]);
    }
  };

  const handleSecondChanceWatchAd = () => {
    playSound.click();
    stopBGM();
    setShowSecondChance(false);
    setGameState('ADVERT_REWARDED');
  };

  const handleSecondChanceDecline = () => {
    playSound.click();
    setShowSecondChance(false);
    advanceQuestion();
  };

  const handleRewardedAdClose = () => {
    playSound.click();
    if (!resumeMusicAfterAd) {
      setMusicToggle(false);
      setMusicEnabled(false);
      localStorage.setItem('trivia_genius_music', 'false');
    } else if (musicEnabled) {
      playBGM(theme);
    }
    setSecondChanceUsed(true);
    setGameState('PLAYING');
    setSelectedOption(null);
    setIsAnswerRevealed(false);
    setTimeLeft(isDailyChallenge ? DAILY_SECONDS : timerDuration);
  };

  const handleAdClose = async () => {
    if (!resumeMusicAfterAd) {
      setMusicToggle(false);
      setMusicEnabled(false);
      localStorage.setItem('trivia_genius_music', 'false');
    } else if (musicEnabled) {
      playBGM(theme);
    }
    setGameState('LOADING');
    await fetchQuestions();
  };

  const endGame = () => {
    playSound.click();
    handleGameOver();
  };

  const getThemeClasses = () => {
    switch(theme) {
      case 'space': return 'bg-violet-950 text-indigo-100';
      case 'underwater': return 'bg-cyan-950 text-cyan-100';
      case 'fantasy': return 'bg-emerald-950 text-emerald-100';
      case 'cyberpunk': return 'bg-black text-[#00ff41] border-[#00ff41]';
      case 'tropical': return 'bg-teal-900 text-teal-50';
      case 'vintage': return 'bg-[#4a3b32] text-[#f4ebd0]';
      case 'scifi': return 'bg-[#0b0c10] text-[#66fcf1]';
      case 'western': return 'bg-[#8d6e63] text-[#ffe082]';
      default: return 'bg-slate-900 text-white';
    }
  };

  const handleShare = async () => {
    playSound.click();
    const challengeText = isDailyChallenge ? 'on the Daily Challenge' : `playing on ${difficulty} difficulty`;
    const text = `I just scored ${score} points as ${playerName || 'Guest'} in Trivia Genius ${challengeText}! Can you beat my score?`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Trivia Genius Score',
          text: text,
          url: window.location.href
        });
      } catch (err) {
        console.error('Share failed', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(text + ' ' + window.location.href);
        alert('Score copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy', err);
      }
    }
  };

  const handleShareLeaderboard = async () => {
    playSound.click();
    // Simulate rank since there's no backend connected
    const rank = Math.max(1, Math.floor(10000 - score * 1.5));
    const challengeText = isDailyChallenge ? 'in the Daily Challenge' : `on the Global Leaderboard`;
    const text = `I just ranked #${rank} ${challengeText} with ${score} points in Trivia Genius! Think you can do better?`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Trivia Genius Leaderboard Rank',
          text: text,
          url: window.location.href
        });
      } catch (err) {
        console.error('Share failed', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(text + ' ' + window.location.href);
        alert('Leaderboard rank copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy', err);
      }
    }
  };


  return (
    <div className={`min-h-screen w-full flex flex-col items-center pb-16 font-sans relative overflow-hidden ${getThemeClasses()}`}>
      
      {/* Top Bar for Game & Ad States */}
      {gameState !== 'MENU' && gameState !== 'ADVERT' && gameState !== 'ADVERT_REWARDED' && (
        <div className="w-full max-w-md mx-auto p-4 flex justify-between items-center z-10">
          <motion.div 
            className="flex flex-col relative"
            animate={isNewHighScore ? { scale: [1, 1.1, 1], textShadow: ["0px 0px 0px rgba(255,204,0,0)", "0px 0px 20px rgba(255,204,0,0.8)", "0px 0px 0px rgba(255,204,0,0)"] } : {}}
            transition={{ duration: 1, repeat: isNewHighScore ? Infinity : 0 }}
          >
            {shimmerScore && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-50 z-20 pointer-events-none skew-x-[-20deg]"
                initial={{ left: '-100%' }}
                animate={{ left: '200%' }}
                transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 1 }}
              />
            )}
            <span className="text-xs uppercase tracking-widest opacity-70 font-bold">
              {isNewHighScore ? <span className="text-accent animate-pulse">New High Score!</span> : (playerName ? `${playerName}'s Score` : "Score")}
            </span>
            <div className="flex items-center gap-2 relative">
              <motion.span 
                key={score}
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="text-2xl font-display font-bold text-accent inline-block origin-left"
              >
                <AnimatedNumber value={score} />
              </motion.span>
              {difficulty === 'Hard' && gameState !== 'GAME_OVER' && (
                <span className="bg-red-500/20 text-red-500 border border-red-500/50 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest">
                  Hard
                </span>
              )}
              <AnimatePresence>
                {scorePopup && (
                  <motion.div
                    initial={{ opacity: 0, y: 0, scale: 0.5 }}
                    animate={{ opacity: [0, 1, 0], y: -40, scale: [0.5, 1.2, 1] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 text-accent font-display font-black text-2xl z-50 pointer-events-none drop-shadow-md"
                  >
                    +{scorePopup}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
          <div className="flex space-x-2">
            {gameState === 'PLAYING' && (
              <>
                <div className="relative">
                  <button 
                    onClick={() => { playSound.click(); setShowMusicControls(!showMusicControls); }}
                    className={`px-4 py-2 bg-slate-800 rounded-full text-xs font-bold uppercase tracking-wider transition-colors flex items-center space-x-1 ${showMusicControls ? 'text-white' : 'text-slate-300'} hover:bg-slate-700`}
                  >
                    <span>Music</span>
                  </button>
                  <AnimatePresence>
                    {showMusicControls && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute top-full mt-2 right-0 bg-slate-800 p-3 rounded-xl shadow-xl border border-slate-700 w-48 z-50 flex flex-col space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-300 font-bold uppercase">BGM</span>
                          <button 
                            onClick={() => {
                              const newEnabled = !musicEnabled;
                              setMusicToggle(newEnabled);
                              setMusicEnabled(newEnabled);
                            }}
                            className={`w-10 h-5 rounded-full flex items-center p-1 transition-colors ${musicEnabled ? 'bg-primary' : 'bg-slate-600'}`}
                          >
                            <div className={`w-3 h-3 rounded-full bg-white transition-transform ${musicEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                          </button>
                        </div>
                        <div className="flex flex-col space-y-1">
                          <span className="text-xs text-slate-400">Volume</span>
                          <input 
                            type="range" 
                            min="0" 
                            max="1" 
                            step="0.05"
                            value={musicVolume}
                            onChange={(e) => {
                              const vol = parseFloat(e.target.value);
                              setMusicVolume(vol);
                              setMasterVolume(vol);
                            }}
                            className="w-full accent-primary h-2 bg-slate-700 rounded-full appearance-none outline-none"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <button 
                  onClick={() => {
                    playSound.click();
                    setIsPaused(true);
                    setPrevGameState(gameState);
                    setGameState('SETTINGS');
                  }}
                  className="w-8 h-8 flex items-center justify-center bg-slate-800 rounded-full text-slate-300 hover:bg-slate-700 transition-colors"
                  aria-label="Settings"
                >
                  <Settings size={14} />
                </button>
                <button 
                  onClick={confirmQuit}
                  className="px-4 py-2 bg-slate-800 rounded-full text-xs font-bold uppercase tracking-wider text-red-400 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  Quit
                </button>
                <button 
                  onClick={() => { playSound.click(); setIsPaused(true); }}
                  className="px-4 py-2 bg-slate-800 rounded-full text-xs font-bold uppercase tracking-wider text-slate-300 hover:bg-slate-700"
                >
                  Pause
                </button>
              </>
            )}
            {gameState !== 'PLAYING' && (
              <button 
                onClick={endGame}
                className="px-4 py-2 bg-slate-800 rounded-full text-xs font-bold uppercase tracking-wider text-slate-300 hover:bg-slate-700"
              >
                End Game
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <AnimatePresence mode="wait">
        
        {/* MENU STATE */}
        {gameState === 'MENU' && (
          <motion.div 
            key="menu"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -50 }}
            className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-md mx-auto z-10"
          >
            <div className="w-24 h-24 mb-6 rounded-3xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
              <Brain size={48} className="text-white" />
            </div>
            <h1 className="text-5xl font-display font-black text-center mb-2 text-white drop-shadow-md">
              TRIVIA<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">GENIUS</span>
            </h1>
            <p className="text-slate-400 mb-8 font-medium text-center max-w-xs">
              Endless AI generated trivia. How long can you survive?
            </p>

            <div className="flex items-center space-x-2 text-accent mb-8 bg-slate-800/50 px-6 py-3 rounded-full border border-slate-700">
              <Trophy size={20} />
              <span className="font-bold tracking-wide">HIGH SCORE: {highScore}</span>
            </div>
            
            <div className="flex flex-col items-center mb-6 w-full gap-3 z-10 relative">
              <input 
                type="text" 
                placeholder="Enter your name" 
                value={playerName}
                onChange={e => {
                  setPlayerName(e.target.value);
                  if (nameError) setNameError(null);
                }}
                className={`w-full bg-slate-800 text-white p-4 rounded-xl text-center font-bold border ${nameError ? 'border-red-500' : 'border-slate-700'} focus:border-primary outline-none transition-colors relative z-10`}
                maxLength={20}
              />
              {nameError && (
                <p className="text-red-400 text-sm font-bold w-full text-center mt-[-8px] relative z-10">{nameError}</p>
              )}
              <motion.select
                key={category}
                initial={{ scale: 1.05, borderColor: '#00C3FF', backgroundColor: '#1E293B' }}
                animate={{ scale: 1, borderColor: '#334155', backgroundColor: '#1E293B' }}
                transition={{ duration: 0.3 }}
                value={category}
                onChange={e => { 
                  const newCat = e.target.value as Category;
                  playSound.categorySelect(newCat); 
                  setCategory(newCat); 
                  switch(newCat) {
                    case 'Science': setTheme('space'); break;
                    case 'History': setTheme('vintage'); break;
                    case 'Pop Culture': setTheme('cyberpunk'); break;
                    case 'General Knowledge': setTheme('default'); break;
                  }
                }}
                className="w-full text-white p-4 rounded-xl font-bold text-center border focus:border-primary outline-none transition-colors appearance-none relative z-10"
              >
                <option value="General Knowledge">General Knowledge</option>
                <option value="Science">Science</option>
                <option value="History">History</option>
                <option value="Pop Culture">Pop Culture</option>
              </motion.select>
            </div>

            <div className="flex flex-col w-full mb-4 relative z-10">
              <div className="flex space-x-2 bg-slate-800 p-1 rounded-full w-full relative z-20">
                {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map(level => (
                  <button
                    key={level}
                    onClick={() => { playSound.click(); setDifficulty(level); }}
                    className={`flex-1 py-3 px-4 rounded-full font-bold text-sm transition-all ${difficulty === level ? 'bg-secondary text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <motion.div 
                key={difficulty}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mt-2 text-xs text-slate-400 min-h-[20px]"
              >
                {difficulty === 'Easy' && 'Easy mode: Simple questions, 0.5x score multiplier.'}
                {difficulty === 'Medium' && 'Medium mode: Standard questions, 1x score multiplier.'}
                {difficulty === 'Hard' && 'Hard mode: Challenging questions, 2x score multiplier.'}
              </motion.div>
            </div>

            <div className="flex flex-col w-full mb-8 relative z-10">
              <div className="flex space-x-2 bg-slate-800 p-1 rounded-full w-full overflow-x-auto scroll-smooth no-scrollbar" style={{ scrollSnapType: 'x mandatory' }}>
                {(['default', 'space', 'underwater', 'fantasy', 'cyberpunk', 'vintage', 'scifi'] as Theme[]).map(t => (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onHoverStart={() => setThemePreview(t)}
                    onHoverEnd={() => setThemePreview(null)}
                    key={t}
                    onClick={() => { playSound.click(); setTheme(t); setThemePreview(null); }}
                    className={`py-2 px-6 rounded-full font-bold text-xs uppercase transition-all whitespace-nowrap scroll-snap-align-start ${theme === t ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                    style={{ scrollSnapAlign: 'start' }}
                  >
                    {t}
                  </motion.button>
                ))}
              </div>
              <div className="h-6 mt-2 flex justify-center items-center">
                <AnimatePresence mode="wait">
                  {themePreview && (
                    <motion.div
                      key={themePreview}
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      transition={{ duration: 0.2 }}
                      className="text-xs text-slate-300 bg-slate-800/80 px-3 py-1 rounded-full backdrop-blur-sm"
                    >
                      {
                        themePreview === 'space' ? 'A journey through stars and nebulas' :
                        themePreview === 'underwater' ? 'Deep sea exploration' :
                        themePreview === 'fantasy' ? 'Magical realms and mythical creatures' :
                        themePreview === 'cyberpunk' ? 'Neon-lit futuristic city' :
                        themePreview === 'vintage' ? 'Sepia tones and classic vibes' :
                        themePreview === 'scifi' ? 'High-tech interfaces and neon' :
                        'Clean and modern default theme'
                      }
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleStartRequest}
              className="w-full py-5 mb-4 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-display font-bold text-2xl shadow-xl hover:shadow-primary/50 transition-all flex items-center justify-center space-x-2"
            >
              <Play fill="currentColor" />
              <span>PLAY NOW</span>
            </motion.button>
            
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startDailyChallenge}
              className="w-full py-4 mb-4 rounded-2xl bg-slate-800 border-2 border-accent text-accent font-display font-bold text-lg shadow-lg hover:bg-slate-800/80 transition-all flex justify-between items-center px-6"
            >
              <div className="flex items-center space-x-2">
                <Calendar size={20} />
                <span>DAILY CHALLENGE</span>
              </div>
              <span className="text-sm font-mono opacity-80">{dailyTimeStr}</span>
            </motion.button>
            
            <div className="flex space-x-4 w-full">
              <button 
                onClick={() => { playSound.click(); setGameState('ACHIEVEMENTS'); }}
                className="flex-1 py-3 bg-slate-800 rounded-xl text-slate-300 font-bold hover:bg-slate-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Star size={18} />
                <span>Achieve</span>
              </button>
              <button 
                onClick={() => { playSound.click(); setGameState('SETTINGS'); }}
                className="flex-1 py-3 bg-slate-800 rounded-xl text-slate-300 font-bold hover:bg-slate-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Settings size={18} />
                <span>Settings</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* SETTINGS STATE */}
        {gameState === 'SETTINGS' && (
          <motion.div 
            key="settings"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-md mx-auto z-10"
          >
            <div className="w-20 h-20 mb-6 rounded-3xl bg-slate-800 flex items-center justify-center shadow-lg">
              <Settings size={40} className="text-secondary" />
            </div>
            <h2 className="text-4xl font-display font-black text-center mb-8">Settings</h2>
            
            <div className="w-full bg-slate-800 rounded-2xl p-6 mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Sound Effects</h3>
                <p className="text-slate-400 text-sm">Toggle UI and game sound effects</p>
              </div>
              <button 
                onClick={toggleSound}
                className={`w-16 h-8 rounded-full flex items-center p-1 transition-colors ${soundEnabled ? 'bg-primary' : 'bg-slate-600'}`}
              >
                <div className={`w-6 h-6 rounded-full bg-white transition-transform ${soundEnabled ? 'translate-x-8' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="w-full bg-slate-800 rounded-2xl p-6 mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Background Music</h3>
                <p className="text-slate-400 text-sm">Toggle theme music</p>
              </div>
              <button 
                onClick={toggleMusic}
                className={`w-16 h-8 rounded-full flex items-center p-1 transition-colors ${musicEnabled ? 'bg-primary' : 'bg-slate-600'}`}
              >
                <div className={`w-6 h-6 rounded-full bg-white transition-transform ${musicEnabled ? 'translate-x-8' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="w-full bg-slate-800 rounded-2xl p-6 mb-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Master Volume</h3>
                <span className="text-slate-400 font-mono">{Math.round(musicVolume * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05"
                value={musicVolume}
                onChange={(e) => {
                  const vol = parseFloat(e.target.value);
                  setMusicVolume(vol);
                  setMasterVolume(vol);
                }}
                className="w-full accent-primary h-2 bg-slate-700 rounded-full appearance-none outline-none"
              />
            </div>

            <div className="w-full bg-slate-800 rounded-2xl p-6 mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Resume Music After Ad</h3>
                <p className="text-slate-400 text-sm">Auto-resume background music</p>
              </div>
              <button 
                onClick={toggleResumeMusic}
                className={`w-16 h-8 rounded-full flex items-center p-1 transition-colors ${resumeMusicAfterAd ? 'bg-primary' : 'bg-slate-600'}`}
              >
                <div className={`w-6 h-6 rounded-full bg-white transition-transform ${resumeMusicAfterAd ? 'translate-x-8' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="w-full bg-slate-800 rounded-2xl p-6 mb-8 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Timer Duration</h3>
                <p className="text-slate-400 text-sm">Time per question</p>
              </div>
              <select
                value={timerDuration}
                onChange={e => {
                  playSound.click();
                  const val = parseInt(e.target.value, 10);
                  setTimerDurationState(val);
                  localStorage.setItem('trivia_genius_timer_duration', val.toString());
                }}
                className="bg-slate-700 text-white p-2 rounded-lg font-bold border border-slate-600 focus:border-primary outline-none transition-colors appearance-none text-center"
              >
                <option value={10}>10s</option>
                <option value={15}>15s</option>
                <option value={20}>20s</option>
                <option value={0}>No Timer</option>
              </select>
            </div>

            <div className="w-full bg-slate-800 rounded-2xl p-6 mb-8 flex flex-col items-center justify-between border-t border-red-500/20">
              <div className="w-full flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-red-400">Reset Data</h3>
                  <p className="text-slate-400 text-xs">Clear all stats and achievements</p>
                </div>
                <button 
                  onClick={() => {
                    playSound.click();
                    if (window.confirm('Are you sure you want to completely reset all your statistics and high scores? This cannot be undone.')) {
                      setStats({
                        totalCorrect: 0,
                        maxStreak: 0,
                        hardModePlayed: false,
                        hintsUsed: 0,
                        dailyChallengesCompleted: 0,
                        dailyHighScore: 0,
                        gamesCompleted: 0,
                        totalScore: 0,
                        categoryPlays: {
                          'General Knowledge': 0,
                          'Science': 0,
                          'History': 0,
                          'Pop Culture': 0,
                        }
                      });
                      setHighScore(0);
                      localStorage.removeItem('trivia_genius_high_score');
                      localStorage.removeItem('trivia_genius_stats');
                    }
                  }}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors bg-red-900/30 text-red-500 hover:bg-red-900/50 hover:text-red-400 border border-red-500/30`}
                >
                  <Trophy size={18} />
                </button>
              </div>
            </div>

            <button 
              onClick={() => { 
                playSound.click(); 
                if (prevGameState) {
                  setGameState(prevGameState);
                  setPrevGameState(null);
                } else {
                  setGameState('MENU'); 
                }
              }}
              className="w-full py-4 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition-colors"
            >
              {prevGameState ? 'BACK' : 'BACK TO MENU'}
            </button>
          </motion.div>
        )}

        {/* ACHIEVEMENTS STATE */}
        {gameState === 'ACHIEVEMENTS' && (
          <motion.div 
            key="achievements"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center p-6 w-full max-w-md mx-auto z-10 mt-10"
          >
            <h2 className="text-4xl font-display font-black text-center mb-6">Stats & Achievements</h2>
            
            <div className="w-full grid grid-cols-2 gap-3 mb-6">
              <div className="bg-slate-800 p-3 rounded-2xl text-center border border-slate-700 flex flex-col justify-center">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Total Correct</p>
                <p className="text-2xl font-display font-black text-primary">{stats.totalCorrect}</p>
              </div>
              <div className="bg-slate-800 p-3 rounded-2xl text-center border border-slate-700 flex flex-col justify-center">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Max Streak</p>
                <p className="text-2xl font-display font-black text-accent">{stats.maxStreak}</p>
              </div>
              <div className="bg-slate-800 p-3 rounded-2xl text-center border border-slate-700 flex flex-col justify-center">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Daily Played</p>
                <p className="text-2xl font-display font-bold text-white">{stats.dailyChallengesCompleted || 0}</p>
              </div>
              <div className="bg-slate-800 p-3 rounded-2xl text-center border border-slate-700 flex flex-col justify-center">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Daily High</p>
                <p className="text-2xl font-display font-bold text-white">{stats.dailyHighScore || 0}</p>
              </div>
              <div className="bg-slate-800 p-3 rounded-2xl text-center border border-slate-700 flex flex-col justify-center">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Avg Score</p>
                <p className="text-2xl font-display font-bold text-white">{stats.gamesCompleted > 0 ? Math.round((stats.totalScore || 0) / stats.gamesCompleted) : 0}</p>
              </div>
              <div className="bg-slate-800 p-3 rounded-2xl text-center border border-slate-700 flex flex-col justify-center overflow-hidden">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Top Category</p>
                <p className="text-sm font-display font-bold text-white truncate px-1">
                  {Object.entries(stats.categoryPlays || {}).sort((a,b)=>(b[1] as number)-(a[1] as number))[0] && (Object.entries(stats.categoryPlays || {}).sort((a,b)=>(b[1] as number)-(a[1] as number))[0][1] as number) > 0 ? Object.entries(stats.categoryPlays || {}).sort((a,b)=>(b[1] as number)-(a[1] as number))[0][0].replace('General Knowledge', 'Gen. Knowledge') : 'None'}
                </p>
              </div>
            </div>

            <div className="w-full space-y-4 mb-8 overflow-y-auto max-h-[40vh] no-scrollbar">
               {[
                 { id: 'centurion', title: 'Centurion', desc: 'Answer 100 questions correctly', 
                   progress: Math.min(stats.totalCorrect, 100), max: 100, done: stats.totalCorrect >= 100 },
                 { id: 'trivia_master', title: 'Trivia Master', desc: 'Answer 500 questions correctly', 
                   progress: Math.min(stats.totalCorrect, 500), max: 500, done: stats.totalCorrect >= 500 },
                 { id: 'streak_master', title: 'Streak Master', desc: 'Achieve a 10-question streak', 
                   progress: Math.min(stats.maxStreak, 10), max: 10, done: stats.maxStreak >= 10 },
                 { id: 'streak_god', title: 'Streak God', desc: 'Achieve a 20-question streak', 
                   progress: Math.min(stats.maxStreak, 20), max: 20, done: stats.maxStreak >= 20 },
                 { id: 'brave', title: 'Brave Soul', desc: 'Play on Hard difficulty', 
                   progress: stats.hardModePlayed ? 1 : 0, max: 1, done: stats.hardModePlayed },
                 { id: 'hint_lover', title: 'Hint Lover', desc: 'Use a hint 5 times', 
                   progress: Math.min(stats.hintsUsed, 5), max: 5, done: stats.hintsUsed >= 5 },
                 { id: 'daily_warrior', title: 'Daily Warrior', desc: 'Complete 7 daily challenges', 
                   progress: Math.min(stats.dailyChallengesCompleted || 0, 7), max: 7, done: (stats.dailyChallengesCompleted || 0) >= 7 },
                 { id: 'quiz_addict', title: 'Quiz Addict', desc: 'Complete 20 games', 
                   progress: Math.min(stats.gamesCompleted || 0, 20), max: 20, done: (stats.gamesCompleted || 0) >= 20 },
               ].map(ach => (
                 <motion.div 
                    key={ach.id} 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={(e) => {
                      if (ach.done) {
                        playSound.click();
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = (rect.left + rect.width / 2) / window.innerWidth;
                        const y = (rect.top + rect.height / 2) / window.innerHeight;
                        confetti({
                          particleCount: 80,
                          spread: 60,
                          origin: { x, y },
                          colors: ['#00C3FF', '#FF3366', '#FFCC00'],
                          disableForReducedMotion: true
                        });
                      }
                    }}
                    className={`p-4 rounded-2xl flex items-center space-x-4 border-2 cursor-pointer
                      ${ach.done ? 'bg-accent/10 border-accent shadow-[0_0_15px_rgba(0,195,255,0.2)]' : 'bg-slate-800 border-slate-700 opacity-60'}`}
                 >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors
                      ${ach.done ? 'bg-accent text-slate-900 shadow-[0_0_10px_#00c3ff]' : 'bg-slate-700 text-slate-500'}`}>
                      <Star size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-bold ${ach.done ? 'text-accent' : 'text-slate-300'}`}>{ach.title}</h3>
                      <p className="text-xs text-slate-400">{ach.desc}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-bold ${ach.done ? 'text-accent' : 'text-slate-500'}`}>
                        {ach.progress} / {ach.max}
                      </span>
                    </div>
                 </motion.div>
               ))}
            </div>

            <button 
              onClick={() => { playSound.click(); setGameState('MENU'); }}
              className="w-full py-4 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition-colors"
            >
              BACK TO MENU
            </button>
          </motion.div>
        )}

        {/* LOADING STATE */}
        {gameState === 'LOADING' && (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-md mx-auto z-10"
          >
            <div className="relative mb-10 w-32 h-32 flex items-center justify-center">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 border-2 border-primary/50 rounded-full"
                  initial={{ scale: 0.8, opacity: 1 }}
                  animate={{
                    scale: [0.8, 1.5, 2.5],
                    opacity: [1, 0.5, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.6,
                    ease: "easeOut",
                  }}
                />
              ))}
              <motion.div 
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0],
                  filter: ["drop-shadow(0 0 10px rgba(0,195,255,0.4))", "drop-shadow(0 0 25px rgba(0,195,255,0.8))", "drop-shadow(0 0 10px rgba(0,195,255,0.4))"]
                }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center relative z-10 text-primary border border-primary/30"
              >
                <Brain size={48} />
              </motion.div>
            </div>
            
            <h2 className="text-3xl font-display font-black text-white mb-2 tracking-wide text-center">
              Generating Trivia<span className="animate-pulse">...</span>
            </h2>
            <p className="text-slate-400 text-center font-medium">Brewing fresh questions for you</p>
            {apiError && (
              <div className="mt-4 p-3 bg-red-900/40 border border-red-500/50 rounded-xl text-red-200 text-sm text-center font-medium max-w-xs">
                {apiError}
              </div>
            )}
          </motion.div>
        )}

        {/* PLAYING STATE */}
        {gameState === 'PLAYING' && questions.length > 0 && (
          <motion.div 
            key="playing"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-md mx-auto z-10"
          >
            <div className="w-full bg-slate-800 rounded-full h-3 mb-8 overflow-hidden relative border border-slate-700/50 shadow-inner">
              <motion.div 
                className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-primary to-secondary"
                initial={{ width: 0 }}
                animate={{ width: `${((currentIdx) / questions.length) * 100}%` }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              />
            </div>
            <div className="w-full text-center mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-secondary font-bold tracking-widest text-sm uppercase">Question {currentIdx + 1} / {questions.length}</span>
                <div className="flex items-center space-x-2 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                  <Timer size={16} className={timeLeft <= 5 ? 'text-primary' : 'text-slate-400'} />
                  <span className={`font-mono font-bold ${timeLeft <= 5 ? 'text-primary animate-pulse' : 'text-slate-300'}`}>00:{timeLeft.toString().padStart(2, '0')}</span>
                </div>
              </div>
              <h2 className="text-3xl font-display font-bold mt-2 leading-tight">
                {questions[currentIdx].question}
              </h2>
            </div>
            
            <div className="w-full flex justify-between mb-4">
              <button
                onClick={useSkip}
                disabled={skipUsed || isAnswerRevealed || isPaused || showSecondChance}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full font-bold text-xs tracking-wider uppercase transition-all ${
                  skipUsed || isAnswerRevealed || isPaused || showSecondChance
                    ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed border border-slate-700' 
                    : 'bg-secondary text-slate-900 hover:bg-cyan-500 shadow-md shadow-secondary/20'
                }`}
              >
                <span>{skipUsed ? 'Skipped' : 'Skip (1/Round)'}</span>
              </button>
              <button
                onClick={useHint}
                disabled={hintUsed || isAnswerRevealed || isPaused || showSecondChance}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full font-bold text-xs tracking-wider uppercase transition-all ${
                  hintUsed || isAnswerRevealed || isPaused || showSecondChance
                    ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed border border-slate-700' 
                    : 'bg-accent text-slate-900 hover:bg-yellow-400 shadow-md shadow-accent/20'
                }`}
              >
                <Lightbulb size={16} />
                <span>{hintUsed ? '50/50 Used' : '50/50 (1/Round)'}</span>
              </button>
            </div>

            <div className="w-full space-y-3 overflow-hidden px-1">
              {questions[currentIdx].options.map((option, idx) => {
                let btnStyle = "bg-slate-800 border-slate-700 text-white hover:bg-slate-700";
                const isEliminated = eliminatedOptions.includes(idx);
                const isTimeout = selectedOption === -1;
                
                if (isAnswerRevealed) {
                  if (idx === questions[currentIdx].correctOptionIndex) {
                    btnStyle = "bg-green-500 border-green-600 text-white"; // Correct answer highlights green
                  } else if (idx === selectedOption) {
                    btnStyle = "bg-red-500 border-red-600 text-white"; // Incorrect selected answer highlights red
                  } else if (isEliminated) {
                     btnStyle = "bg-slate-800 border-slate-700 text-slate-500 opacity-20";
                  } else {
                    btnStyle = "bg-slate-800 border-slate-700 text-slate-500 opacity-50"; // Others fade
                  }
                } else if (isEliminated) {
                  btnStyle = "bg-slate-800 border-slate-700 text-slate-500 opacity-20 pointer-events-none";
                }

                return (
                  <motion.button
                    key={idx}
                    disabled={isAnswerRevealed || isEliminated || isPaused || showSecondChance || isProcessingOption !== null}
                    onClick={() => handleOptionClick(idx)}
                    drag={isAnswerRevealed || isEliminated || isPaused || showSecondChance || isProcessingOption !== null ? false : "x"}
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.2}
                    onDragEnd={(e, { offset, velocity }) => {
                      if (Math.abs(offset.x) > 40 || Math.abs(velocity.x) > 300) {
                        handleOptionClick(idx);
                      }
                    }}
                    animate={isProcessingOption === idx ? { scale: [1, 0.95, 1.05, 1] } : { scale: 1 }}
                    transition={{ duration: 0.4 }}
                    whileHover={{ scale: (isAnswerRevealed || isEliminated || isPaused || showSecondChance || isProcessingOption !== null) ? 1 : 1.02 }}
                    whileTap={{ scale: (isAnswerRevealed || isEliminated || isPaused || showSecondChance || isProcessingOption !== null) ? 1 : 0.98 }}
                    whileDrag={{ scale: 1.05, zIndex: 50, opacity: 0.9 }}
                    className={`w-full p-4 rounded-xl border-b-4 font-bold text-lg text-left transition-colors flex justify-between items-center relative z-10 ${btnStyle}`}
                  >
                    <span className={isEliminated && !isAnswerRevealed ? 'line-through' : ''}>{option}</span>
                    {isAnswerRevealed && idx === questions[currentIdx].correctOptionIndex && <Check size={20} />}
                    {isAnswerRevealed && idx === selectedOption && idx !== questions[currentIdx].correctOptionIndex && <X size={20} />}
                    {isAnswerRevealed && isTimeout && idx !== questions[currentIdx].correctOptionIndex && !isEliminated && <X size={20} className="opacity-0" />}
                  </motion.button>
                 );
               })}
             </div>

            {/* PAUSE MODAL */}
            {isPaused && (
              <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 rounded-3xl">
                <h2 className="text-4xl font-display font-black text-white mb-8">Paused</h2>
                <motion.button 
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}
                  onClick={() => { playSound.click(); setIsPaused(false); }}
                  className="w-full py-4 mb-4 rounded-xl bg-primary text-white font-bold tracking-widest uppercase hover:bg-primary/80 transition-colors"
                >
                  Resume
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}
                  onClick={() => { playSound.click(); setIsPaused(false); setGameState('SETTINGS'); }}
                  className="w-full py-4 mb-4 rounded-xl bg-slate-800 text-slate-300 font-bold tracking-widest uppercase hover:bg-slate-700 transition-colors"
                >
                  Settings
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}
                  onClick={() => { playSound.click(); setIsPaused(false); endGame(); }}
                  className="w-full py-4 rounded-xl bg-red-900/30 text-red-400 font-bold tracking-widest uppercase border border-red-900/50 hover:bg-red-900/50 transition-colors"
                >
                  End Game
                </motion.button>
              </div>
            )}

            {/* SECOND CHANCE MODAL */}
            {showSecondChance && (
              <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 rounded-3xl border-4 border-slate-800">
                <h2 className="text-3xl font-display font-black text-white mb-2 text-center">Incorrect!</h2>
                <p className="text-slate-400 text-center mb-8">Watch a short ad to get a second chance?</p>
                <motion.button 
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}
                  onClick={handleSecondChanceWatchAd}
                  className="w-full py-4 mb-4 rounded-xl bg-secondary text-slate-900 font-bold tracking-widest uppercase hover:bg-cyan-400 transition-colors shadow-[0_0_20px_rgba(0,195,255,0.4)]"
                >
                  Watch Ad
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}
                  onClick={handleSecondChanceDecline}
                  className="w-full py-4 rounded-xl bg-transparent text-slate-500 font-bold tracking-widest uppercase hover:text-slate-300 transition-colors"
                >
                  No Thanks
                </motion.button>
              </div>
            )}

            {/* QUIT CONFIRM MODAL */}
            {showQuitConfirm && (
              <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 rounded-3xl border-4 border-slate-800">
                <h2 className="text-3xl font-display font-black text-white mb-2 text-center">Are you sure you want to quit?</h2>
                <p className="text-slate-400 mb-8 text-center">Your progress in this round will be lost.</p>
                <div className="flex gap-4 w-full">
                  <motion.button 
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}
                    onClick={handleQuit}
                    className="flex-1 py-4 rounded-xl bg-red-600 text-white font-bold tracking-widest uppercase hover:bg-red-500 transition-colors"
                  >
                    Yes
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}
                    onClick={cancelQuit}
                    className="flex-1 py-4 rounded-xl bg-slate-800 text-slate-300 font-bold tracking-widest uppercase hover:bg-slate-700 transition-colors"
                  >
                    No
                  </motion.button>
                </div>
              </div>
            )}
           </motion.div>
        )}

        {/* AD BREAK STATE */}
        {(gameState === 'ADVERT' || gameState === 'ADVERT_REWARDED') && (
          <motion.div 
            key="advert"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-md mx-auto z-50 fixed inset-0 bg-slate-900"
          >
             <AdPlaceholder 
               type={gameState === 'ADVERT_REWARDED' ? 'rewarded' : 'interstitial'} 
               onClose={gameState === 'ADVERT_REWARDED' ? handleRewardedAdClose : handleAdClose} 
             />
          </motion.div>
        )}

        {/* GAME OVER STATE */}
        {gameState === 'GAME_OVER' && (
          <motion.div 
            key="game_over"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-md mx-auto z-10"
          >
            <div className="w-24 h-24 mb-6 rounded-full bg-slate-800 flex items-center justify-center shadow-lg">
              <Trophy size={48} className="text-accent" />
            </div>
            <h2 className="text-4xl font-display font-black text-center mb-2">Round Over</h2>
            {playerName && <p className="text-lg text-slate-300 font-bold mb-2">Well played, {playerName}!</p>}
            <div className="text-center mb-8">
              <p className="text-slate-400 uppercase tracking-widest font-bold text-sm mb-1">Final Score</p>
              <p className="text-6xl font-display font-black text-white text-shadow-sm">{score}</p>
            </div>

            <div className="w-full bg-slate-800 p-4 rounded-xl mb-6">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 text-center">Next Game Category</p>
              <motion.select
                key={category}
                initial={{ scale: 1.05, borderColor: '#00C3FF', backgroundColor: '#1E293B' }}
                animate={{ scale: 1, borderColor: '#475569', backgroundColor: '#334155' }}
                transition={{ duration: 0.3 }}
                value={category}
                onChange={e => { 
                  const newCat = e.target.value as Category;
                  playSound.categorySelect(newCat); 
                  setCategory(newCat); 
                  switch(newCat) {
                    case 'Science': setTheme('space'); break;
                    case 'History': setTheme('vintage'); break;
                    case 'Pop Culture': setTheme('cyberpunk'); break;
                    case 'General Knowledge': setTheme('default'); break;
                  }
                }}
                className="w-full text-white p-3 rounded-lg font-bold text-center border focus:border-primary outline-none transition-colors appearance-none"
              >
                <option value="General Knowledge">General Knowledge</option>
                <option value="Science">Science</option>
                <option value="History">History</option>
                <option value="Pop Culture">Pop Culture</option>
              </motion.select>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStartRequest}
                className="w-full py-4 mt-4 rounded-xl bg-primary text-white font-black tracking-widest text-lg hover:bg-primary/80 transition-colors flex justify-center items-center space-x-2"
              >
                <Play size={20} fill="currentColor" />
                <span>PLAY AGAIN</span>
              </motion.button>
            </div>

            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleShare}
              className="w-full py-4 mb-3 rounded-xl bg-[#1DA1F2] text-white font-bold tracking-wider hover:bg-[#1a91da] transition-colors flex justify-center items-center space-x-2"
            >
              <Share2 size={20} />
              <span>SHARE SCORE</span>
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleShareLeaderboard}
              className="w-full py-4 mb-4 rounded-xl bg-orange-500 text-white font-bold tracking-wider hover:bg-orange-600 transition-colors flex justify-center items-center space-x-2 shadow-lg"
            >
              <Trophy size={20} />
              <span>SHARE LEADERBOARD RANK</span>
            </motion.button>

            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleStartRequest}
              className="w-full py-5 mb-4 rounded-2xl bg-secondary text-white font-display font-bold text-xl shadow-xl hover:shadow-secondary/50 transition-all flex items-center justify-center space-x-2"
            >
              <RotateCcw />
              <span>PLAY AGAIN</span>
            </motion.button>
            <button 
              onClick={() => { playSound.click(); setGameState('MENU'); }}
              className="w-full py-4 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition-colors"
            >
              RETURN TO MENU
            </button>
          </motion.div>
        )}

        {/* CATEGORY CONFIRM MODAL */}
        {showCategoryConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 rounded-3xl border-4 border-slate-800"
          >
            <h2 className="text-3xl font-display font-black text-white mb-2 text-center">Start Game?</h2>
            <p className="text-slate-400 mb-8 text-center text-lg">Start with <strong className="text-primary">{category}</strong> category?</p>
            <div className="flex gap-4 w-full max-w-xs">
              <motion.button 
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}
                onClick={startGame}
                className="flex-1 py-4 rounded-xl bg-primary text-white font-bold tracking-widest uppercase hover:bg-primary/80 transition-colors"
              >
                Yes
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}
                onClick={() => { playSound.click(); setShowCategoryConfirm(false); }}
                className="flex-1 py-4 rounded-xl bg-slate-800 text-slate-300 font-bold tracking-widest uppercase hover:bg-slate-700 transition-colors"
              >
                No
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {(gameState === 'MENU' || gameState === 'GAME_OVER') && (
        <div className="fixed bottom-0 left-0 w-full flex justify-center pb-2 bg-slate-900 z-50">
           <AdPlaceholder type="banner" />
        </div>
      )}

      <AnimatePresence mode="popLayout">
        <motion.div
          key={themePreview || theme}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0 z-0 pointer-events-none"
        >
          <AnimatedBackground theme={themePreview || theme} />
        </motion.div>
      </AnimatePresence>
      
    </div>
  );
}
