import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Play, Loader2, RotateCcw, Brain, Check, X, Trophy, Timer, Lightbulb, Share2, Settings, Star, Calendar } from 'lucide-react';
import { AnimatedBackground } from './components/AnimatedBackground';
import { AdPlaceholder } from './components/AdPlaceholder';
import { generateTriviaQuestions, TriviaQuestion } from './lib/gemini';
import { AnimatedNumber } from './components/AnimatedNumber';
import { playSound, getSoundEnabled, setSoundEnabled, playBGM, stopBGM, setMusicEnabled, setMasterVolume, getMasterVolume } from './lib/sounds';

type GameState = 'MENU' | 'LOADING' | 'PLAYING' | 'ADVERT' | 'ADVERT_REWARDED' | 'GAME_OVER' | 'SETTINGS' | 'ACHIEVEMENTS';
type GameMode = 'CLASSIC' | 'DAILY' | 'SURVIVAL';
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
  categoryScores?: Record<string, number>;
  typeCorrect?: Record<string, number>;
  powerups?: {
    scoreBooster: number;
    timeFreeze: number;
    answerShield: number;
    fiftyFifty: number;
  };
  hasSeenPowerupTutorial?: boolean;
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
  categoryPlays: { 'General Knowledge': 0, 'Science': 0, 'History': 0, 'Pop Culture': 0 },
  categoryScores: { 'General Knowledge': 0, 'Science': 0, 'History': 0, 'Pop Culture': 0 },
  typeCorrect: { multiple_choice: 0, true_false: 0 },
  powerups: { scoreBooster: 2, timeFreeze: 2, answerShield: 2, fiftyFifty: 2 },
  hasSeenPowerupTutorial: false,
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
  
  const [gameMode, setGameMode] = useState<GameMode>('CLASSIC');
  const [activePowerup, setActivePowerup] = useState<'scoreBooster' | 'timeFreeze' | 'answerShield' | 'fiftyFifty' | null>(null);
  const [frozenTimer, setFrozenTimer] = useState(false);
  const [collectedPowerup, setCollectedPowerup] = useState<{type: 'scoreBooster' | 'timeFreeze' | 'answerShield' | 'fiftyFifty', name: string} | null>(null);
  const [dailyTimeStr, setDailyTimeStr] = useState('');
  const [stats, setStats] = useState<Stats>(defaultStats);
  const [soundEnabled, setSoundToggle] = useState(true);

  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [showPowerupTutorial, setShowPowerupTutorial] = useState(false);
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
      playBGM(theme, category);
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
    localStorage.setItem('trivia_genius_player_name', playerName);
    localStorage.setItem('trivia_genius_theme', theme);
    if (difficulty === 'Hard' && !stats.hardModePlayed) updateStats({ hardModePlayed: true });
    
    // Easter Egg
    const isSpeedrun = playerName.toLowerCase().trim() === 'speedrun';
    const newTimerDuration = isSpeedrun ? 5 : 15;
    setTimerDurationState(newTimerDuration);

    setScore(0);
    setIsNewHighScore(false);
    setGameMode('CLASSIC');
    
    if (stats.gamesCompleted > 0 && stats.gamesCompleted % 2 === 0) {
      stopBGM();
      setGameState('ADVERT');
    } else {
      playBGM(theme, category);
      await fetchQuestions(newTimerDuration);
    }
  };

  const startDailyChallenge = async () => {
    playSound.click();
    if (!playerName || playerName.trim().length < 2) {
      setNameError("Please enter a name (at least 2 characters).");
      return;
    }
    setNameError(null);
    setApiError(null);
    playBGM(theme, category);
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
    setGameMode('DAILY');
    setDifficulty('Hard'); // Modifiers
    setIsLoading(true);
    const { questions: newQuestions, error } = await generateTriviaQuestions(10, 'Hard', 'General Knowledge'); // 10 hard questions
    setIsLoading(false);
    
    if (error || newQuestions.length === 0) {
      setApiError(error || "Could not fetch questions. Please check your connection or try again later.");
      localStorage.removeItem('trivia_genius_daily_last_played'); // Revert so they can try again
      setGameState('MENU');
      return;
    }
    
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

  const startSurvivalMode = async () => {
    playSound.click();
    if (!playerName || playerName.trim().length < 2) {
      setNameError("Please enter a name (at least 2 characters).");
      return;
    }
    setNameError(null);
    setApiError(null);
    playBGM(theme, category);
    localStorage.setItem('trivia_genius_player_name', playerName);
    localStorage.setItem('trivia_genius_theme', theme);
    
    setScore(0);
    setIsNewHighScore(false);
    setGameMode('SURVIVAL');
    setIsLoading(true);
    const { questions: newQuestions, error } = await generateTriviaQuestions(10, difficulty, category);
    setIsLoading(false);
    
    if (error || newQuestions.length === 0) {
      setApiError(error || "Could not fetch questions. Please check your connection or try again later.");
      setGameState('MENU');
      return;
    }
    
    setQuestions(newQuestions);
    setCurrentIdx(0);
    setSelectedOption(null);
    setIsAnswerRevealed(false);
    setHintUsed(false);
    setSkipUsed(false);
    setSecondChanceUsed(false);
    setEliminatedOptions([]);
    setTimeLeft(10); // Faster timer
    setGameState('PLAYING');
  };

  const fetchQuestions = async (forcedDuration?: number) => {
    setIsLoading(true);
    setApiError(null);
    const { questions: newQuestions, error } = await generateTriviaQuestions(QUESTIONS_PER_ROUND, difficulty, category);
    setIsLoading(false);
    
    if (error || newQuestions.length === 0) {
      setApiError(error || "Could not fetch questions. Please check your connection or try again later.");
      setGameState('MENU');
      return;
    }
    
    setQuestions(newQuestions);
    setCurrentIdx(0);
    setSelectedOption(null);
    setIsAnswerRevealed(false);
    setHintUsed(false);
    setSkipUsed(false);
    setSecondChanceUsed(false);
    setEliminatedOptions([]);
    setTimeLeft(gameMode === 'DAILY' ? DAILY_SECONDS : (forcedDuration ?? timerDuration));
    setGameState('PLAYING');
  };

  useEffect(() => {
    if (gameState === 'PLAYING' && !showPowerupTutorial && !isAnswerRevealed && isProcessingOption === null && timeLeft > 0 && !isPaused && !showSecondChance && !frozenTimer && (gameMode === 'DAILY' || timerDuration > 0)) {
      const timerId = setTimeout(() => {
        setTimeLeft(t => t - 1);
      }, 1000);
      return () => clearTimeout(timerId);
    } else if (gameState === 'PLAYING' && !showPowerupTutorial && !isAnswerRevealed && isProcessingOption === null && timeLeft === 0 && !isPaused && !showSecondChance && !frozenTimer && (gameMode === 'DAILY' || timerDuration > 0)) {
      handleOptionClick(-1); // -1 signifies timeout
    }
  }, [gameState, showPowerupTutorial, isAnswerRevealed, isProcessingOption, timeLeft, isPaused, showSecondChance, frozenTimer, gameMode, timerDuration]);

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
    
    // Reset any active powerup on game over
    setActivePowerup(null);

    const catPlays = (stats.categoryPlays ? { ...stats.categoryPlays } : {
      'General Knowledge': 0, 'Science': 0, 'History': 0, 'Pop Culture': 0,
    }) as any;
    const catScores = (stats.categoryScores ? { ...stats.categoryScores } : {
      'General Knowledge': 0, 'Science': 0, 'History': 0, 'Pop Culture': 0,
    }) as any;

    if (category in catPlays) {
      catPlays[category as string] = (catPlays[category as string] || 0) + 1;
      catScores[category as string] = (catScores[category as string] || 0) + score;
    }

    if (gameMode === 'DAILY') {
      updateStats({
        dailyChallengesCompleted: (stats.dailyChallengesCompleted || 0) + 1,
        dailyHighScore: Math.max(stats.dailyHighScore || 0, score),
        gamesCompleted: (stats.gamesCompleted || 0) + 1,
        totalScore: newTotalScore,
        categoryPlays: catPlays,
        categoryScores: catScores
      });
    } else {
      updateStats({
        gamesCompleted: (stats.gamesCompleted || 0) + 1,
        totalScore: newTotalScore,
        categoryPlays: catPlays,
        categoryScores: catScores
      });
    }
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('trivia_genius_high_score', score.toString());
    }
    setGameState('GAME_OVER');
  };

  const advanceQuestion = async () => {
    const isRoundOver = currentIdx + 1 >= questions.length;
    if (isRoundOver) {
      if (gameMode === 'DAILY') {
        handleGameOver();
      } else if (gameMode === 'SURVIVAL') {
        setGameState('LOADING');
        // Increase difficulty based on score
        const newDiff = score > 10000 ? 'Hard' : score > 3000 ? 'Medium' : 'Easy';
        const { questions: newQuestions } = await generateTriviaQuestions(10, newDiff, category);
        if (newQuestions && newQuestions.length > 0) {
          setQuestions(newQuestions);
          setCurrentIdx(0);
          setSelectedOption(null);
          setIsAnswerRevealed(false);
          setEliminatedOptions([]);
          setTimeLeft(10); // Maintain fast timer
          setGameState('PLAYING');
        } else {
          handleGameOver(); // Fail gracefully
        }
      } else {
        handleGameOver();
      }
    } else {
      setCurrentIdx(i => i + 1);
      setSelectedOption(null);
      setIsAnswerRevealed(false);
      setEliminatedOptions([]);
      setScorePopup(null);
      setTimeLeft(gameMode === 'DAILY' ? DAILY_SECONDS : gameMode === 'SURVIVAL' ? 10 : timerDuration);
      setShimmerScore(false);
    }
  };

  const handleOptionClick = (idx: number) => {
    if (isAnswerRevealed || isPaused || showSecondChance || isProcessingOption !== null) return;
    
    const isCorrectInfo = idx !== -1 && idx === questions[currentIdx].correctOptionIndex;

    if (idx !== -1) {
      if (isCorrectInfo) {
        // Immediate positive feedback sound
        if (getSoundEnabled()) {
           // We can just use the select tone but make it slightly more pitched up
           playSound.select(); 
        }
      } else {
        playSound.click();
      }
      setIsProcessingOption(idx);
    }
    
    setTimeout(() => {
      if (idx !== -1) {
        setIsProcessingOption(null);
      }
      setSelectedOption(idx);
      setIsAnswerRevealed(true);

      const isCorrect = idx === questions[currentIdx].correctOptionIndex;
      const questionData = questions[currentIdx];
      
      if (isCorrect) {
        const difficultyMultiplier = difficulty === 'Easy' ? 0.5 : difficulty === 'Hard' ? 2 : 1;
        const boosterMultiplier = activePowerup === 'scoreBooster' ? 2 : 1;
        const pointsGained = 100 * difficultyMultiplier * boosterMultiplier;
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
        
        if (newStreak > 0 && newStreak % 3 === 0 && difficulty !== 'Hard') {
          const nextDiff = difficulty === 'Easy' ? 'Medium' : 'Hard';
          setDifficulty(nextDiff);
          const remainingCount = questions.length - currentIdx - 1;
          if (remainingCount > 0) {
            generateTriviaQuestions(remainingCount, nextDiff, category).then(res => {
              if (res.questions && res.questions.length > 0) {
                setQuestions(prev => [...prev.slice(0, prev.length - remainingCount), ...res.questions]);
              }
            });
          }
        }
        
        // Update type correct tracking
        const typeCorrect = stats.typeCorrect ? { ...stats.typeCorrect } : { multiple_choice: 0, true_false: 0 };
        const qType = questionData.type || 'multiple_choice';
        typeCorrect[qType] = (typeCorrect[qType] || 0) + 1;
        
        if (newStreak > 0 && newStreak % 3 === 0) {
          const powerupTypes = ['scoreBooster', 'timeFreeze', 'answerShield', 'fiftyFifty'] as const;
          const powerupNames = { scoreBooster: 'Score Booster', timeFreeze: 'Time Freeze', answerShield: 'Answer Shield', fiftyFifty: '50/50' };
          const currentPowerups = stats.powerups || { scoreBooster: 2, timeFreeze: 2, answerShield: 2, fiftyFifty: 2 };
          const availableTypes = powerupTypes.filter(type => (currentPowerups[type] || 0) < 5);
          const randomType = availableTypes.length > 0 ? availableTypes[Math.floor(Math.random() * availableTypes.length)] : null;
          
          if (randomType) {
            setCollectedPowerup({ type: randomType, name: powerupNames[randomType] });
            setTimeout(() => {
              setCollectedPowerup(null);
              if (!stats.hasSeenPowerupTutorial) {
                setShowPowerupTutorial(true);
                updateStats({ hasSeenPowerupTutorial: true });
              }
            }, 2500);
            
            updateStats({
              totalCorrect: stats.totalCorrect + 1,
              currentStreak: newStreak,
              maxStreak: Math.max(stats.maxStreak, newStreak),
              typeCorrect,
              powerups: { ...currentPowerups, [randomType]: (currentPowerups[randomType] || 0) + 1 }
            });
          } else {
            updateStats({ 
              totalCorrect: stats.totalCorrect + 1,
              currentStreak: newStreak,
              maxStreak: Math.max(stats.maxStreak, newStreak),
              typeCorrect
            });
          }
        } else {
          updateStats({ 
            totalCorrect: stats.totalCorrect + 1,
            currentStreak: newStreak,
            maxStreak: Math.max(stats.maxStreak, newStreak),
            typeCorrect
          });
        }
        
        playSound.cashRegister();
        playSound.correct();
        if (!newHighScoreTriggered) fireConfetti();
        
        setTimeout(() => advanceQuestion(), 1500);
      } else {
        if (idx !== -1) playSound.incorrect();
        
        if (activePowerup === 'answerShield' && idx !== -1) {
          // Shield saves them!
          setActivePowerup(null);
          setTimeout(() => {
            setEliminatedOptions(prev => [...prev, idx]);
            setSelectedOption(null);
            setIsAnswerRevealed(false);
          }, 1000);
          return; // Don't advance or break streak yet!
        }
        
        if (stats.currentStreak > 0 && difficulty !== 'Easy') {
          const dropDiff = 'Easy';
          setDifficulty(dropDiff);
          const remainingCount = questions.length - currentIdx - 1;
          if (remainingCount > 0) {
            generateTriviaQuestions(remainingCount, dropDiff, category).then(res => {
              if (res.questions && res.questions.length > 0) {
                setQuestions(prev => [...prev.slice(0, prev.length - remainingCount), ...res.questions]);
              }
            });
          }
        }
        
        updateStats({ currentStreak: 0 });
        
        if (gameMode === 'SURVIVAL') {
          setTimeout(() => handleGameOver(), 1500);
          return;
        }
        
        if (!secondChanceUsed && gameMode !== 'DAILY' && idx !== -1) {
           setTimeout(() => setShowSecondChance(true), 1000);
        } else {
           setTimeout(() => advanceQuestion(), 1500);
        }
      }
    }, idx === -1 ? 0 : (isCorrectInfo ? 600 : 400));
  };

  const handlePowerup = (type: 'scoreBooster' | 'timeFreeze' | 'answerShield' | 'fiftyFifty') => {
    if (activePowerup || isAnswerRevealed || gameState !== 'PLAYING' || isPaused || showSecondChance) return;
    if (stats.powerups && stats.powerups[type] > 0) {
      if (type === 'scoreBooster') playSound.scoreBooster();
      else if (type === 'timeFreeze') playSound.timeFreeze();
      else if (type === 'answerShield') playSound.answerShield();
      else playSound.fiftyFifty();
      
      updateStats({ powerups: { ...stats.powerups, [type]: stats.powerups[type] - 1 } });
      
      if (type === 'fiftyFifty') {
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
        // Set visual state briefly
        setActivePowerup('fiftyFifty');
        setTimeout(() => setActivePowerup(null), 1500);
      } else {
        setActivePowerup(type);
        
        if (type === 'timeFreeze') {
          setFrozenTimer(true);
          setTimeout(() => {
            setFrozenTimer(false);
            setActivePowerup(curr => curr === 'timeFreeze' ? null : curr); // timeFreeze wears off after 5s
          }, 5000);
        } else if (type === 'scoreBooster') {
          setTimeout(() => {
            setActivePowerup(curr => curr === 'scoreBooster' ? null : curr);
          }, 15000); // 15s duration
        }
      }
    }
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
      playBGM(theme, category);
    }
    setSecondChanceUsed(true);
    setGameState('PLAYING');
    setSelectedOption(null);
    setIsAnswerRevealed(false);
    setTimeLeft(gameMode === 'DAILY' ? DAILY_SECONDS : timerDuration);
  };

  const handleAdClose = async () => {
    if (!resumeMusicAfterAd) {
      setMusicToggle(false);
      setMusicEnabled(false);
      localStorage.setItem('trivia_genius_music', 'false');
    } else if (musicEnabled) {
      playBGM(theme, category);
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
    const challengeText = gameMode === 'DAILY' ? 'on the Daily Challenge' : `playing on ${difficulty} difficulty`;
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
    const challengeText = gameMode === 'DAILY' ? 'in the Daily Challenge' : `on the Global Leaderboard`;
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
              <motion.div
                animate={activePowerup === 'scoreBooster' ? {
                  textShadow: ["0px 0px 5px rgba(0,195,255,0.5)", "0px 0px 20px rgba(0,195,255,0.9)", "0px 0px 5px rgba(0,195,255,0.5)"]
                } : {}}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <motion.span 
                  key={score}
                  initial={{ scale: 1 }}
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className={`text-2xl font-display font-bold text-accent inline-block origin-left ${activePowerup === 'scoreBooster' ? 'drop-shadow-[0_0_5px_rgba(0,195,255,0.8)]' : ''}`}
                >
                  <AnimatedNumber value={score} />
                </motion.span>
              </motion.div>
              {difficulty === 'Hard' && gameState !== 'GAME_OVER' && (
                <span className="bg-red-500/20 text-red-500 border border-red-500/50 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest">
                  Hard
                </span>
              )}
              <AnimatePresence>
                {scorePopup && (
                  <motion.div
                    key="score-popup"
                    initial={{ opacity: 0, y: 0, scale: 0.5 }}
                    animate={{ opacity: [0, 1, 0], y: -40, scale: [0.5, 1.2, 1] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 text-accent font-display font-black text-2xl z-50 pointer-events-none drop-shadow-md"
                  >
                    +{scorePopup}
                  </motion.div>
                )}
                {activePowerup && (
                  <motion.div
                    key="active-powerup"
                    initial={{ opacity: 0, y: 20, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.8 }}
                    className={`absolute right-full mr-4 whitespace-nowrap px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
                      activePowerup === 'scoreBooster' ? 'bg-secondary text-slate-900 shadow-[0_0_15px_rgba(0,195,255,0.5)]' :
                      activePowerup === 'timeFreeze' ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' :
                      activePowerup === 'answerShield' ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]' :
                      'bg-green-500 text-white shadow-[0_0_15px_rgba(74,222,128,0.5)]'
                    }`}
                  >
                    {activePowerup === 'scoreBooster' ? '🚀 2x Score Active!' :
                     activePowerup === 'timeFreeze' ? '❄️ Time Frozen!' :
                     activePowerup === 'answerShield' ? '🛡️ Shield Active!' :
                     '⚖️ 50/50 Applied!'}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
          <div className="flex space-x-2 items-center">
            {/* Game State Indicator */}
            {(gameState === 'PLAYING' || gameState === 'GAME_OVER' || isLoading) && (
              <div className="flex items-center space-x-1.5 px-3 py-1 bg-slate-800/50 rounded-full border border-slate-700/50 mr-1">
                {isLoading ? (
                  <><Loader2 size={10} className="text-blue-500 animate-spin" /><span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Loading</span></>
                ) : isPaused ? (
                  <><div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" /><span className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest">Paused</span></>
                ) : gameState === 'PLAYING' ? (
                  <><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /><span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Playing</span></>
                ) : gameState === 'GAME_OVER' ? (
                  <><div className="w-2 h-2 rounded-full bg-red-500" /><span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Finished</span></>
                ) : null}
              </div>
            )}
            
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
                        key="music-controls"
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
            <h1 className={`text-5xl font-display font-black text-center mb-2 text-white drop-shadow-md relative perspective-[1000px] ${theme === 'cyberpunk' ? 'text-transparent bg-clip-text bg-gradient-to-b from-[#00ff41] to-[#008f11] filter drop-shadow-[0_0_15px_rgba(0,255,65,0.8)]' : ''}`}>
              {theme === 'cyberpunk' && (
                <>
                  <span className="absolute inset-0 text-transparent pointer-events-none" style={{ WebkitTextStroke: '2px rgba(0,255,65,0.8)', transform: 'translateZ(-5px) translateY(2px)', filter: 'blur(3px)' }}>
                    TRIVIA<br/>GENIUS
                  </span>
                  <span className="absolute inset-0 text-transparent pointer-events-none" style={{ WebkitTextStroke: '1px #ffffff', transform: 'translateZ(5px)', opacity: 0.8 }}>
                    TRIVIA<br/>GENIUS
                  </span>
                </>
              )}
              TRIVIA<br/><span className={theme === 'cyberpunk' ? 'text-[#00ff41]' : 'text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary'}>GENIUS</span>
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
            <div className="flex flex-col w-full mb-6 relative z-10">
              <div className="relative w-full z-10 flex items-center">
                <div className="absolute left-4 pointer-events-none text-slate-400 z-20">
                  {category === 'General Knowledge' && <Brain size={20} />}
                  {category === 'Science' && <Lightbulb size={20} />}
                  {category === 'History' && <Calendar size={20} />}
                  {category === 'Pop Culture' && <Star size={20} />}
                </div>
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
                  className="w-full text-white p-4 pl-12 rounded-xl font-bold text-left border focus:border-primary outline-none transition-colors appearance-none bg-slate-800/80 relative z-10"
                >
                  <option value="General Knowledge">General Knowledge</option>
                  <option value="Science">Science</option>
                  <option value="History">History</option>
                  <option value="Pop Culture">Pop Culture</option>
                </motion.select>
                <div className="absolute right-4 pointer-events-none text-slate-400 z-20">
                  <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
            </div>

            <div className="flex flex-col w-full mb-4 relative z-10">
              <div className="flex space-x-2 bg-slate-800 p-1 rounded-full w-full relative z-20">
                {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map(level => (
                  <motion.button
                    whileHover={{ backgroundColor: difficulty === level ? undefined : 'rgba(51, 65, 85, 0.5)' }}
                    animate={difficulty === level ? { scale: 1.05, boxShadow: "0 0 10px rgba(0, 195, 255, 0.5)" } : { scale: 1, boxShadow: "none" }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    key={level}
                    onClick={() => { playSound.click(); setDifficulty(level); }}
                    className={`flex-1 py-3 px-4 rounded-full font-bold text-sm transition-colors duration-300 ${difficulty === level ? 'bg-secondary text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    {level}
                  </motion.button>
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

            <div className="flex flex-col space-y-3 w-full mb-4">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStartRequest}
                disabled={isLoading}
                className="w-full py-5 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-display font-bold text-xl sm:text-2xl shadow-xl hover:shadow-primary/50 transition-all flex items-center justify-center space-x-2 disabled:opacity-75"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" />
                    <span>WAIT...</span>
                  </>
                ) : (
                  <>
                    <Play fill="currentColor" />
                    <span>CLASSIC TRIVIA</span>
                  </>
                )}
              </motion.button>
              
              <div className="flex space-x-3 w-full">
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={startDailyChallenge}
                  disabled={isLoading}
                  className="flex-1 py-3 rounded-2xl bg-slate-800 border-2 border-accent text-accent font-display font-bold text-sm shadow-lg hover:bg-slate-800/80 transition-all flex flex-col items-center justify-center disabled:opacity-75 relative overflow-hidden"
                >
                  {isLoading ? (
                    <Loader2 size={24} className="animate-spin mb-1" />
                  ) : (
                    <Calendar size={24} className="mb-1" />
                  )}
                  <span>DAILY</span>
                  <span className="text-[10px] font-mono opacity-80 mt-0.5">{dailyTimeStr}</span>
                </motion.button>

                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={startSurvivalMode}
                  disabled={isLoading}
                  className="flex-1 py-3 rounded-2xl bg-slate-800 border-2 border-red-500 text-red-500 font-display font-bold text-sm shadow-lg hover:bg-slate-800/80 transition-all flex flex-col items-center justify-center disabled:opacity-75 relative overflow-hidden"
                >
                  {isLoading ? (
                    <Loader2 size={24} className="animate-spin mb-1" />
                  ) : (
                    <Timer size={24} className="mb-1" />
                  )}
                  <span>SURVIVAL</span>
                  <span className="text-[10px] font-mono opacity-80 mt-0.5">Sudden Death</span>
                </motion.button>
              </div>
            </div>
            
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
            className="flex-1 flex flex-col items-center justify-start p-6 w-full max-w-md mx-auto z-10 overflow-y-auto no-scrollbar pt-12 pb-24"
          >
            <div className="w-16 h-16 mb-4 rounded-3xl bg-slate-800 flex items-center justify-center shadow-lg shrink-0">
              <Settings size={32} className="text-secondary" />
            </div>
            <h2 className="text-3xl font-display font-black text-center mb-8 shrink-0">Settings</h2>
            
            {/* Audio Settings Section */}
            <div className="w-full mb-6 shrink-0">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 pl-2">Audio</h3>
              <div className="w-full bg-slate-800 rounded-2xl p-5 flex flex-col gap-6 border border-slate-700/50">
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold">Master Volume</span>
                    <span className="text-slate-400 font-mono text-sm">{Math.round(musicVolume * 100)}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="1" step="0.05"
                    value={musicVolume}
                    onChange={(e) => {
                      const vol = parseFloat(e.target.value);
                      setMusicVolume(vol);
                      setMasterVolume(vol);
                    }}
                    className="w-full accent-primary h-2 bg-slate-700 rounded-full appearance-none outline-none"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold whitespace-nowrap">Sound Effects</div>
                    <div className="text-slate-400 text-xs mt-0.5">UI & game noises</div>
                  </div>
                  <button onClick={toggleSound} className={`w-14 h-7 rounded-full flex items-center p-1 transition-colors ${soundEnabled ? 'bg-primary' : 'bg-slate-600'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${soundEnabled ? 'translate-x-7' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold whitespace-nowrap">Background Music</div>
                    <div className="text-slate-400 text-xs mt-0.5">Theme soundtracks</div>
                  </div>
                  <button onClick={toggleMusic} className={`w-14 h-7 rounded-full flex items-center p-1 transition-colors ${musicEnabled ? 'bg-primary' : 'bg-slate-600'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${musicEnabled ? 'translate-x-7' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold whitespace-nowrap">Resume After Ad</div>
                    <div className="text-slate-400 text-xs mt-0.5">Auto-play music</div>
                  </div>
                  <button onClick={toggleResumeMusic} className={`w-14 h-7 rounded-full flex items-center p-1 transition-colors ${resumeMusicAfterAd ? 'bg-primary' : 'bg-slate-600'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${resumeMusicAfterAd ? 'translate-x-7' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Game Settings Section */}
            <div className="w-full mb-6 shrink-0">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 pl-2">Game</h3>
              <div className="w-full bg-slate-800 rounded-2xl p-5 border border-slate-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold whitespace-nowrap">Timer Duration</div>
                    <div className="text-slate-400 text-xs mt-0.5">Time per question</div>
                  </div>
                  <select
                    value={timerDuration}
                    onChange={e => {
                      playSound.click();
                      const val = parseInt(e.target.value, 10);
                      setTimerDurationState(val);
                      localStorage.setItem('trivia_genius_timer_duration', val.toString());
                    }}
                    className="bg-slate-700 text-white px-3 py-1.5 rounded-lg font-bold border border-slate-600 focus:border-primary outline-none transition-colors appearance-none text-center text-sm"
                  >
                    <option value={10}>10s</option>
                    <option value={15}>15s</option>
                    <option value={20}>20s</option>
                    <option value={0}>No Timer</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Player Stats Section */}
            <div className="w-full mb-8 shrink-0">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 pl-2">Player Stats</h3>
              <div className="w-full bg-slate-800 rounded-2xl p-5 border border-slate-700/50 space-y-5">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-slate-700/50 rounded-xl p-3">
                    <div className="text-xl font-black text-white">{highScore}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold mt-1">High Score</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-xl p-3">
                    <div className="text-xl font-black text-white">{stats.gamesCompleted}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold mt-1">Games Played</div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-700/50 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-red-400 whitespace-nowrap">Reset Data</div>
                    <div className="text-slate-400 text-xs mt-0.5">Clear all statistics</div>
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
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-colors bg-red-900/30 text-red-500 hover:bg-red-900/50 hover:text-red-400 border border-red-500/30"
                  >
                    <Trophy size={16} />
                  </button>
                </div>
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
              className="w-full py-4 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition-colors shrink-0"
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
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Avg Score (All)</p>
                <p className="text-2xl font-display font-bold text-white">{stats.gamesCompleted > 0 ? Math.round((stats.totalScore || 0) / stats.gamesCompleted) : 0}</p>
              </div>
              <div className="bg-slate-800 p-3 rounded-2xl text-center border border-slate-700 flex flex-col justify-center overflow-hidden">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Top Category</p>
                <p className="text-sm font-display font-bold text-white truncate px-1">
                  {Object.entries(stats.categoryPlays || {}).sort((a,b)=>(b[1] as number)-(a[1] as number))[0] && (Object.entries(stats.categoryPlays || {}).sort((a,b)=>(b[1] as number)-(a[1] as number))[0][1] as number) > 0 ? Object.entries(stats.categoryPlays || {}).sort((a,b)=>(b[1] as number)-(a[1] as number))[0][0].replace('General Knowledge', 'Gen. Knowledge') : 'None'}
                </p>
              </div>
            </div>

            <div className="w-full bg-slate-800 rounded-2xl p-4 border border-slate-700 mb-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Avg Score by Category</h3>
              <div className="space-y-2">
                {Object.entries(stats.categoryPlays || {}).map(([cat, plays]) => (
                  <div key={cat} className="flex justify-between items-center text-sm">
                    <span className="text-slate-300">{cat}</span>
                    <span className="font-bold text-white">{(plays as number) > 0 && stats.categoryScores ? Math.round((stats.categoryScores[cat] || 0) / (plays as number)) : 0}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full bg-slate-800 rounded-2xl p-4 border border-slate-700 mb-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Correct By Type</h3>
              <div className="flex justify-around items-center text-sm">
                <div className="text-center">
                  <div className="text-slate-300 mb-1">Multiple Choice</div>
                  <div className="font-bold text-white text-lg">{stats.typeCorrect?.multiple_choice || 0}</div>
                </div>
                <div className="w-px h-8 bg-slate-700"></div>
                <div className="text-center">
                  <div className="text-slate-300 mb-1">True / False</div>
                  <div className="font-bold text-white text-lg">{stats.typeCorrect?.true_false || 0}</div>
                </div>
              </div>
            </div>

            <div className="w-full bg-slate-800 rounded-2xl p-4 border border-slate-700 mb-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Power-Up Inventory</h3>
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center bg-slate-900/50 p-2 rounded-xl">
                  <div className="text-xl mb-1">🚀</div>
                  <div className="font-bold text-white text-lg">{stats.powerups?.scoreBooster || 0}</div>
                </div>
                <div className="text-center bg-slate-900/50 p-2 rounded-xl">
                  <div className="text-xl mb-1">❄️</div>
                  <div className="font-bold text-white text-lg">{stats.powerups?.timeFreeze || 0}</div>
                </div>
                <div className="text-center bg-slate-900/50 p-2 rounded-xl">
                  <div className="text-xl mb-1">🛡️</div>
                  <div className="font-bold text-white text-lg">{stats.powerups?.answerShield || 0}</div>
                </div>
                <div className="text-center bg-slate-900/50 p-2 rounded-xl">
                  <div className="text-xl mb-1">⚖️</div>
                  <div className="font-bold text-white text-lg">{stats.powerups?.fiftyFifty || 0}</div>
                </div>
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
            exit={{ opacity: 0, y: -50 }}
            className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-md mx-auto z-10"
          >
            <AnimatePresence>
              {collectedPowerup && (
                <motion.div
                  key="collected-powerup"
                  initial={{ opacity: 0, y: -20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute top-24 z-50 bg-slate-800/90 backdrop-blur border-2 border-accent text-accent px-6 py-3 rounded-full flex items-center space-x-3 shadow-[0_0_15px_rgba(255,204,0,0.4)]"
                >
                  <span className="text-xl">
                    {collectedPowerup.type === 'scoreBooster' ? '🚀' : collectedPowerup.type === 'timeFreeze' ? '❄️' : '🛡️'}
                  </span>
                  <span className="font-bold tracking-wider uppercase text-sm">{collectedPowerup.name} Collected!</span>
                </motion.div>
              )}
            </AnimatePresence>
          
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
                <div className="flex items-center gap-2">
                  <span className="text-secondary font-bold tracking-widest text-sm uppercase">Question {currentIdx + 1} / {questions.length}</span>
                  <span className={`px-2 py-0.5 rounded shadow-sm text-[10px] font-bold uppercase tracking-widest ${
                    difficulty === 'Easy' ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 
                    difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' : 
                    'bg-red-500/20 text-red-500 border border-red-500/50'
                  }`}>
                    {difficulty}
                  </span>
                </div>
                <div className="flex items-center space-x-2 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                  <Timer size={16} className={timeLeft <= 5 ? 'text-primary' : 'text-slate-400'} />
                  <span className={`font-mono font-bold ${timeLeft <= 5 ? 'text-primary animate-pulse' : 'text-slate-300'}`}>00:{timeLeft.toString().padStart(2, '0')}</span>
                </div>
              </div>
              <h2 className="text-3xl font-display font-bold mt-2 leading-tight">
                {questions[currentIdx].question}
              </h2>
            </div>
            
            <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              <button
                onClick={useSkip}
                disabled={skipUsed || isAnswerRevealed || isPaused || showSecondChance}
                className={`flex justify-center items-center px-1 py-2 rounded-xl font-bold border transition-all ${
                  skipUsed || isAnswerRevealed || isPaused || showSecondChance
                    ? 'bg-slate-800/50 text-slate-500 border-slate-700 opacity-50'
                    : 'bg-slate-800 text-white border-slate-600 hover:bg-slate-700'
                }`}
              >
                <div className="flex flex-col items-center leading-none">
                  <span className="text-[10px] text-slate-400 mb-0.5 uppercase tracking-wider">{skipUsed ? 'Used' : 'Skip'}</span>
                  <span className="text-sm font-semibold">⏭️</span>
                </div>
              </button>
              
              <button
                onClick={() => handlePowerup('scoreBooster')}
                disabled={activePowerup !== null || (stats.powerups?.scoreBooster || 0) <= 0 || isAnswerRevealed || isPaused || showSecondChance}
                className={`flex justify-center items-center px-1 py-2 rounded-xl font-bold border transition-all ${
                  activePowerup === 'scoreBooster' 
                    ? 'bg-secondary/20 border-secondary text-secondary shadow-[0_0_10px_rgba(0,195,255,0.3)] animate-pulse'
                    : (stats.powerups?.scoreBooster || 0) <= 0 || isAnswerRevealed || isPaused || showSecondChance
                      ? 'bg-slate-800/50 text-slate-500 border-slate-700 opacity-50'
                      : 'bg-slate-800 text-white border-slate-600 hover:bg-slate-700'
                }`}
              >
                <div className="flex flex-col items-center leading-none relative">
                  <span className="text-[10px] text-secondary mb-0.5 uppercase tracking-wider">2x Score</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-sm">🚀</span>
                    <span className="text-xs bg-slate-700 px-1 rounded-full">{stats.powerups?.scoreBooster || 0}</span>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handlePowerup('timeFreeze')}
                disabled={activePowerup !== null || (stats.powerups?.timeFreeze || 0) <= 0 || isAnswerRevealed || isPaused || showSecondChance}
                className={`flex justify-center items-center px-1 py-2 rounded-xl font-bold border transition-all ${
                  frozenTimer 
                    ? 'bg-blue-500/20 border-blue-400 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.3)] animate-pulse'
                    : (stats.powerups?.timeFreeze || 0) <= 0 || isAnswerRevealed || isPaused || showSecondChance
                      ? 'bg-slate-800/50 text-slate-500 border-slate-700 opacity-50'
                      : 'bg-slate-800 text-white border-slate-600 hover:bg-slate-700'
                }`}
              >
                <div className="flex flex-col items-center leading-none">
                  <span className="text-[10px] text-blue-400 mb-0.5 uppercase tracking-wider">Freeze</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-sm">❄️</span>
                    <span className="text-xs bg-slate-700 px-1 rounded-full">{stats.powerups?.timeFreeze || 0}</span>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handlePowerup('answerShield')}
                disabled={activePowerup !== null || (stats.powerups?.answerShield || 0) <= 0 || isAnswerRevealed || isPaused || showSecondChance}
                className={`flex justify-center items-center px-1 py-2 rounded-xl font-bold border transition-all ${
                  activePowerup === 'answerShield'
                    ? 'bg-purple-500/20 border-purple-400 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.3)] animate-pulse'
                    : (stats.powerups?.answerShield || 0) <= 0 || isAnswerRevealed || isPaused || showSecondChance
                      ? 'bg-slate-800/50 text-slate-500 border-slate-700 opacity-50'
                      : 'bg-slate-800 text-white border-slate-600 hover:bg-slate-700'
                }`}
              >
                <div className="flex flex-col items-center leading-none">
                  <span className="text-[10px] text-purple-400 mb-0.5 uppercase tracking-wider">Shield</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-sm">🛡️</span>
                    <span className="text-xs bg-slate-700 px-1 rounded-full">{stats.powerups?.answerShield || 0}</span>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handlePowerup('fiftyFifty')}
                disabled={activePowerup !== null || (stats.powerups?.fiftyFifty || 0) <= 0 || isAnswerRevealed || isPaused || showSecondChance}
                className={`flex justify-center items-center px-1 py-2 rounded-xl font-bold border transition-all ${
                  activePowerup === 'fiftyFifty'
                    ? 'bg-green-500/20 border-green-400 text-green-300 shadow-[0_0_10px_rgba(74,222,128,0.3)] animate-pulse'
                    : (stats.powerups?.fiftyFifty || 0) <= 0 || isAnswerRevealed || isPaused || showSecondChance
                      ? 'bg-slate-800/50 text-slate-500 border-slate-700 opacity-50'
                      : 'bg-slate-800 text-white border-slate-600 hover:bg-slate-700'
                }`}
              >
                <div className="flex flex-col items-center leading-none">
                  <span className="text-[10px] text-green-400 mb-0.5 uppercase tracking-wider">50/50</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-sm">⚖️</span>
                    <span className="text-xs bg-slate-700 px-1 rounded-full">{stats.powerups?.fiftyFifty || 0}</span>
                  </div>
                </div>
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
                } else if (isProcessingOption === idx) {
                  btnStyle = "bg-slate-700 border-slate-500 text-white brightness-110 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]";
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
                    animate={
                      isProcessingOption === idx 
                        ? (idx === questions[currentIdx].correctOptionIndex 
                           ? { scale: [1, 1.05, 1], boxShadow: ["0px 0px 0px rgba(74,222,128,0)", "0px 0px 20px rgba(74,222,128,0.8)", "0px 0px 0px rgba(74,222,128,0)"] } 
                           : { scale: [1, 0.95, 1.05, 1] }) 
                        : (isAnswerRevealed && isTimeout && idx === questions[currentIdx].correctOptionIndex)
                          ? { scale: [1, 1.1, 1, 1.1, 1], boxShadow: ["0px 0px 0px rgba(74,222,128,0)", "0px 0px 20px rgba(74,222,128,0.8)", "0px 0px 0px rgba(74,222,128,0)"] }
                          : { scale: 1 }
                    }
                    transition={{ duration: (isProcessingOption === idx && idx === questions[currentIdx].correctOptionIndex) || (isAnswerRevealed && isTimeout && idx === questions[currentIdx].correctOptionIndex) ? 0.6 : 0.4 }}
                    whileHover={{ scale: (isAnswerRevealed || isEliminated || isPaused || showSecondChance || isProcessingOption !== null) ? 1 : 1.03, x: (isAnswerRevealed || isEliminated || isPaused || showSecondChance || isProcessingOption !== null) ? 0 : 2 }}
                    whileTap={{ scale: (isAnswerRevealed || isEliminated || isPaused || showSecondChance || isProcessingOption !== null) ? 1 : 0.95 }}
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
             
             <div className="flex justify-center mt-3 mb-1">
               <button
                 onClick={() => {
                   playSound.click();
                   fetchQuestions();
                 }}
                 disabled={isLoading || isPaused || isAnswerRevealed || showSecondChance}
                 className="px-4 py-2 bg-slate-800/80 text-slate-300 font-bold border border-slate-700/50 rounded-xl text-[10px] uppercase tracking-wider hover:bg-slate-700 transition-colors flex items-center space-x-2 w-full justify-center"
               >
                 <RotateCcw size={12} className={isLoading ? "animate-spin" : ""} />
                 <span>Fetch New Questions</span>
               </button>
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

            {/* POWERUP TUTORIAL OVERLAY */}
            <AnimatePresence>
              {showPowerupTutorial && (
                <motion.div
                  key="powerup-tutorial"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-900/95 backdrop-blur-xl z-50 flex flex-col items-center justify-center p-6 rounded-3xl border-2 border-accent"
                >
                  <motion.div 
                    initial={{ scale: 0.8, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className="w-full max-w-sm flex flex-col items-center text-center space-y-6"
                  >
                    <div className="w-20 h-20 rounded-full bg-accent/20 flex flex-col items-center justify-center mb-2 animate-bounce shadow-[0_0_30px_rgba(255,204,0,0.3)]">
                      <Lightbulb size={40} className="text-accent" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-display font-black text-white mb-3">Power-Ups!</h2>
                      <p className="text-slate-300 text-sm leading-relaxed mb-6">
                        You just earned a Power-Up! Keep answering questions correctly in a streak to earn more.
                      </p>
                      
                      <div className="grid grid-cols-2 gap-3 text-left mb-6">
                        <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                          <div className="text-secondary text-xl mb-1">🚀</div>
                          <div className="text-xs font-bold text-white mb-1">Score Booster</div>
                          <div className="text-[10px] text-slate-400">2x points for 15s</div>
                        </div>
                        <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                          <div className="text-blue-400 text-xl mb-1">❄️</div>
                          <div className="text-xs font-bold text-white mb-1">Time Freeze</div>
                          <div className="text-[10px] text-slate-400">Stops clock for 5s</div>
                        </div>
                        <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                          <div className="text-purple-400 text-xl mb-1">🛡️</div>
                          <div className="text-xs font-bold text-white mb-1">Answer Shield</div>
                          <div className="text-[10px] text-slate-400">Protects 1 wrong choice</div>
                        </div>
                        <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                          <div className="text-green-400 text-xl mb-1">⚖️</div>
                          <div className="text-xs font-bold text-white mb-1">50 / 50</div>
                          <div className="text-[10px] text-slate-400">Removes 2 wrong answers</div>
                        </div>
                      </div>
                    </div>
                    
                    <motion.button 
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => setShowPowerupTutorial(false)}
                      className="w-full py-4 rounded-xl bg-accent text-slate-900 font-bold tracking-widest uppercase hover:bg-yellow-400 transition-colors shadow-lg shadow-accent/20"
                    >
                      Skip / Got It
                    </motion.button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

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
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-md mx-auto z-10"
          >
            <div className="w-24 h-24 mb-6 rounded-full bg-slate-800 flex items-center justify-center shadow-lg relative">
              {isNewHighScore && (
                <motion.div 
                  className="absolute inset-0 rounded-full border-2 border-accent"
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                />
              )}
              <Trophy size={48} className={isNewHighScore ? "text-accent" : "text-slate-400"} />
            </div>
            <h2 className="text-4xl font-display font-black text-center mb-2">Round Over</h2>
            {playerName && <p className="text-lg text-slate-300 font-bold mb-2">Well played, {playerName}!</p>}
            <div className="text-center mb-8 w-full">
              <p className="text-slate-400 uppercase tracking-widest font-bold text-sm mb-1">Final Score</p>
              <motion.p 
                className="text-6xl font-display font-black text-white text-shadow-sm"
                animate={isNewHighScore ? { scale: [1, 1.1, 1], textShadow: ["0px 0px 0px rgba(255,204,0,0)", "0px 0px 20px rgba(255,204,0,1)", "0px 0px 0px rgba(255,204,0,0)"] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {score}
              </motion.p>
              
              <div className="w-full mt-4 bg-slate-800 rounded-full h-2 overflow-hidden relative">
                <motion.div 
                  className={`absolute top-0 left-0 bottom-0 ${isNewHighScore ? 'bg-accent' : 'bg-primary'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, Math.max(2, (score / Math.max(highScore, 100)) * 100))}%` }}
                  transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                />
              </div>
              <div className="flex justify-between w-full text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                <span>0</span>
                <span className={isNewHighScore ? "text-accent animate-pulse" : ""}>{isNewHighScore ? 'NEW RECORD!' : `High Score: ${highScore}`}</span>
              </div>
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
                animate={isNewHighScore ? { 
                  scale: [1, 1.03, 1],
                  boxShadow: ["0px 0px 0px rgba(0,195,255,0)", "0px 0px 20px rgba(0,195,255,0.6)", "0px 0px 0px rgba(0,195,255,0)"]
                } : undefined}
                transition={isNewHighScore ? { duration: 1.5, repeat: Infinity } : undefined}
                onClick={handleStartRequest}
                disabled={isLoading}
                className={`w-full py-4 mt-4 rounded-xl text-white font-black tracking-widest text-lg transition-colors flex justify-center items-center space-x-2 disabled:opacity-75 ${isNewHighScore ? 'bg-gradient-to-r from-primary to-secondary hover:opacity-90' : 'bg-primary hover:bg-primary/80'}`}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>GENERATING...</span>
                  </>
                ) : (
                  <>
                    <Play size={20} fill="currentColor" />
                    <span>PLAY AGAIN</span>
                  </>
                )}
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
              disabled={isLoading}
              className="w-full py-5 mb-4 rounded-2xl bg-secondary text-white font-display font-bold text-xl shadow-xl hover:shadow-secondary/50 transition-all flex items-center justify-center space-x-2 disabled:opacity-75"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" />
                  <span>GENERATING...</span>
                </>
              ) : (
                <>
                  <RotateCcw />
                  <span>PLAY AGAIN</span>
                </>
              )}
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

      <AnimatePresence>
        <motion.div
          key={themePreview || theme}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
          className="absolute inset-0 z-0 pointer-events-none"
        >
          <AnimatedBackground theme={themePreview || theme} />
        </motion.div>
      </AnimatePresence>
      
    </div>
  );
}
