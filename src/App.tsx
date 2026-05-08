import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, Brain, Check, X, Trophy, Timer, Lightbulb, Share2, Settings, Star, Calendar } from 'lucide-react';
import { AdPlaceholder } from './components/AdPlaceholder';
import { generateTriviaQuestions, TriviaQuestion } from './lib/gemini';
import { AnimatedNumber } from './components/AnimatedNumber';
import { playSound, getSoundEnabled, setSoundEnabled } from './lib/sounds';

type GameState = 'MENU' | 'LOADING' | 'PLAYING' | 'ADVERT' | 'ADVERT_REWARDED' | 'GAME_OVER' | 'SETTINGS' | 'ACHIEVEMENTS';
type Difficulty = 'Easy' | 'Medium' | 'Hard';
type Category = 'General Knowledge' | 'Science' | 'History' | 'Pop Culture';
type Theme = 'default' | 'space' | 'underwater' | 'fantasy' | 'cyberpunk' | 'tropical' | 'vintage';

type Stats = {
  totalCorrect: number;
  currentStreak: number;
  maxStreak: number;
  hardModePlayed: boolean;
  hintsUsed: number;
};

const defaultStats: Stats = {
  totalCorrect: 0,
  currentStreak: 0,
  maxStreak: 0,
  hardModePlayed: false,
  hintsUsed: 0,
};

const QUESTIONS_PER_ROUND = 5;
const SECONDS_PER_QUESTION = 15;
const DAILY_SECONDS = 10;


export default function App() {
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
  const [category, setCategory] = useState<Category>('General Knowledge');
  const [theme, setTheme] = useState<Theme>('default');
  const [playerName, setPlayerName] = useState('');
  
  const [timeLeft, setTimeLeft] = useState(SECONDS_PER_QUESTION);
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
  }, []);

  const toggleSound = () => {
    playSound.click();
    const next = !soundEnabled;
    setSoundToggle(next);
    setSoundEnabled(next);
    localStorage.setItem('trivia_genius_sound', String(next));
  };

  const startGame = async () => {
    playSound.click();
    localStorage.setItem('trivia_genius_player_name', playerName);
    localStorage.setItem('trivia_genius_theme', theme);
    if (difficulty === 'Hard' && !stats.hardModePlayed) updateStats({ hardModePlayed: true });
    setScore(0);
    setIsNewHighScore(false);
    setIsDailyChallenge(false);
    setGameState('LOADING');
    await fetchQuestions();
  };

  const startDailyChallenge = async () => {
    playSound.click();
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
    const newQuestions = await generateTriviaQuestions(10, 'Hard', 'General Knowledge'); // 10 hard questions
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

  const fetchQuestions = async () => {
    setIsLoading(true);
    const newQuestions = await generateTriviaQuestions(QUESTIONS_PER_ROUND, difficulty, category);
    setQuestions(newQuestions);
    setCurrentIdx(0);
    setSelectedOption(null);
    setIsAnswerRevealed(false);
    setHintUsed(false);
    setSkipUsed(false);
    setSecondChanceUsed(false);
    setEliminatedOptions([]);
    setTimeLeft(isDailyChallenge ? DAILY_SECONDS : SECONDS_PER_QUESTION);
    setIsLoading(false);
    setGameState('PLAYING');
  };

  useEffect(() => {
    if (gameState === 'PLAYING' && !isAnswerRevealed && timeLeft > 0 && !isPaused && !showSecondChance) {
      const timerId = setTimeout(() => {
        setTimeLeft(t => t - 1);
      }, 1000);
      return () => clearTimeout(timerId);
    } else if (gameState === 'PLAYING' && !isAnswerRevealed && timeLeft === 0 && !isPaused && !showSecondChance) {
      handleOptionClick(-1); // -1 signifies timeout
    }
  }, [gameState, isAnswerRevealed, timeLeft, isPaused, showSecondChance]);

  const fireConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFCC00', '#FF3366', '#00C3FF']
    });
  };

  const advanceQuestion = () => {
    const isRoundOver = currentIdx + 1 >= questions.length;
    if (isRoundOver) {
      setGameState(isDailyChallenge ? 'GAME_OVER' : 'ADVERT');
    } else {
      setCurrentIdx(i => i + 1);
      setSelectedOption(null);
      setIsAnswerRevealed(false);
      setEliminatedOptions([]);
      setTimeLeft(isDailyChallenge ? DAILY_SECONDS : SECONDS_PER_QUESTION);
      setShimmerScore(false);
    }
  };

  const handleOptionClick = (idx: number) => {
    if (isAnswerRevealed || isPaused || showSecondChance) return;
    
    playSound.click();
    setSelectedOption(idx);
    setIsAnswerRevealed(true);

    const isCorrect = idx === questions[currentIdx].correctOptionIndex;
    
    if (isCorrect) {
      const newScore = score + 100;
      setScore(newScore);
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

      playSound.correct();
      if (!newHighScoreTriggered) fireConfetti();
      
      setTimeout(() => advanceQuestion(), 1500);
    } else {
      updateStats({ currentStreak: 0 });
      playSound.incorrect();
      
      if (!secondChanceUsed && !isDailyChallenge && idx !== -1) {
         setTimeout(() => setShowSecondChance(true), 1000);
      } else {
         setTimeout(() => advanceQuestion(), 1500);
      }
    }
  };

  const useSkip = () => {
    if (skipUsed || isAnswerRevealed || gameState !== 'PLAYING' || isPaused || showSecondChance) return;
    playSound.click();
    setSkipUsed(true);
    advanceQuestion();
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
    
    if (incorrectIndices.length > 0) {
      const toEliminate = incorrectIndices[Math.floor(Math.random() * incorrectIndices.length)];
      setEliminatedOptions(prev => [...prev, toEliminate]);
    }
  };

  const handleSecondChanceWatchAd = () => {
    playSound.click();
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
    setSecondChanceUsed(true);
    setGameState('PLAYING');
    setSelectedOption(null);
    setIsAnswerRevealed(false);
    setTimeLeft(isDailyChallenge ? DAILY_SECONDS : SECONDS_PER_QUESTION);
  };

  const handleAdClose = async () => {
    // Show game over if they answered incorrectly before the ad? 
    // Actually, let's just do endless mode where you accumulate score 
    // until you explicitly quit, or just endless rounds!
    setGameState('LOADING');
    await fetchQuestions();
  };

  const endGame = () => {
    playSound.click();
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('trivia_genius_high_score', score.toString());
    }
    setGameState('GAME_OVER');
  };

  const getThemeClasses = () => {
    switch(theme) {
      case 'space': return 'bg-violet-950 text-indigo-100';
      case 'underwater': return 'bg-cyan-950 text-cyan-100';
      case 'fantasy': return 'bg-emerald-950 text-emerald-100';
      case 'cyberpunk': return 'bg-black text-[#00ff41] border-[#00ff41]';
      case 'tropical': return 'bg-teal-900 text-teal-50';
      case 'vintage': return 'bg-[#4a3b32] text-[#f4ebd0]';
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
            <motion.span 
              key={score}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="text-2xl font-display font-bold text-accent inline-block origin-left"
            >
              <AnimatedNumber value={score} />
            </motion.span>
          </motion.div>
          <div className="flex space-x-2">
            {gameState === 'PLAYING' && (
              <button 
                onClick={() => { playSound.click(); setIsPaused(true); }}
                className="px-4 py-2 bg-slate-800 rounded-full text-xs font-bold uppercase tracking-wider text-slate-300 hover:bg-slate-700"
              >
                Pause
              </button>
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
            
            <div className="flex flex-col items-center mb-6 w-full gap-3">
              <input 
                type="text" 
                placeholder="Enter your name (optional)" 
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                className="w-full bg-slate-800 text-white p-4 rounded-xl text-center font-bold border border-slate-700 focus:border-primary outline-none transition-colors"
                maxLength={20}
              />
              <select
                value={category}
                onChange={e => { playSound.click(); setCategory(e.target.value as Category); }}
                className="w-full bg-slate-800 text-white p-4 rounded-xl font-bold text-center border border-slate-700 focus:border-primary outline-none transition-colors appearance-none"
              >
                <option value="General Knowledge">General Knowledge</option>
                <option value="Science">Science</option>
                <option value="History">History</option>
                <option value="Pop Culture">Pop Culture</option>
              </select>
            </div>

            <div className="flex space-x-2 mb-4 bg-slate-800 p-1 rounded-full w-full">
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

            <div className="flex space-x-1 mb-8 bg-slate-800 p-1 rounded-full w-full overflow-x-auto no-scrollbar">
              {(['default', 'space', 'underwater', 'fantasy', 'cyberpunk', 'tropical', 'vintage'] as Theme[]).map(t => (
                <button
                  key={t}
                  onClick={() => { playSound.click(); setTheme(t); }}
                  className={`flex-1 py-2 px-4 rounded-full font-bold text-xs uppercase transition-all whitespace-nowrap ${theme === t ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                  {t}
                </button>
              ))}
            </div>

            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startGame}
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
            
            <div className="w-full bg-slate-800 rounded-2xl p-6 mb-8 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Sound Effects</h3>
                <p className="text-slate-400 text-sm">Toggle all game sounds</p>
              </div>
              <button 
                onClick={toggleSound}
                className={`w-16 h-8 rounded-full flex items-center p-1 transition-colors ${soundEnabled ? 'bg-primary' : 'bg-slate-600'}`}
              >
                <div className={`w-6 h-6 rounded-full bg-white transition-transform ${soundEnabled ? 'translate-x-8' : 'translate-x-0'}`} />
              </button>
            </div>

            <button 
              onClick={() => { playSound.click(); setGameState('MENU'); }}
              className="w-full py-4 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition-colors"
            >
              BACK TO MENU
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
            <h2 className="text-4xl font-display font-black text-center mb-8">Achievements</h2>
            
            <div className="w-full space-y-4 mb-8 overflow-y-auto max-h-[60vh] no-scrollbar">
               {[
                 { id: 'centurion', title: 'Centurion', desc: 'Answer 100 questions correctly', 
                   progress: Math.min(stats.totalCorrect, 100), max: 100, done: stats.totalCorrect >= 100 },
                 { id: 'streak_master', title: 'Streak Master', desc: 'Achieve a 10-question streak', 
                   progress: Math.min(stats.maxStreak, 10), max: 10, done: stats.maxStreak >= 10 },
                 { id: 'brave', title: 'Brave Soul', desc: 'Play on Hard difficulty', 
                   progress: stats.hardModePlayed ? 1 : 0, max: 1, done: stats.hardModePlayed },
                 { id: 'hint_lover', title: 'Hint Lover', desc: 'Use a hint 5 times', 
                   progress: Math.min(stats.hintsUsed, 5), max: 5, done: stats.hintsUsed >= 5 },
               ].map(ach => (
                 <div key={ach.id} className={`p-4 rounded-2xl flex items-center space-x-4 border-2 ${ach.done ? 'bg-accent/10 border-accent' : 'bg-slate-800 border-slate-700'}`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${ach.done ? 'bg-accent text-slate-900' : 'bg-slate-700 text-slate-500'}`}>
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
                 </div>
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
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-16 h-16 border-4 border-slate-700 border-t-secondary rounded-full mb-6"
            />
            <h2 className="text-2xl font-display font-bold text-white mb-2">Asking the AI...</h2>
            <p className="text-slate-400">Generating fresh questions just for you.</p>
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
            <div className="w-full bg-slate-800 rounded-full h-2 mb-8 overflow-hidden">
               <motion.div 
                className="h-full bg-secondary"
                initial={{ width: 0 }}
                animate={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
                transition={{ duration: 0.3 }}
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
                <span>{hintUsed ? 'Hint Used' : 'Use Hint (1/Round)'}</span>
              </button>
            </div>

            <div className="w-full space-y-3">
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
                    disabled={isAnswerRevealed || isEliminated || isPaused || showSecondChance}
                    onClick={() => handleOptionClick(idx)}
                    whileHover={{ scale: (isAnswerRevealed || isEliminated || isPaused || showSecondChance) ? 1 : 1.02 }}
                    whileTap={{ scale: (isAnswerRevealed || isEliminated || isPaused || showSecondChance) ? 1 : 0.98 }}
                    className={`w-full p-4 rounded-xl border-b-4 font-bold text-lg text-left transition-colors flex justify-between items-center ${btnStyle}`}
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
                <button 
                  onClick={() => { playSound.click(); setIsPaused(false); }}
                  className="w-full py-4 mb-4 rounded-xl bg-primary text-white font-bold tracking-widest uppercase hover:bg-primary/80 transition-colors"
                >
                  Resume
                </button>
                <button 
                  onClick={() => { playSound.click(); setIsPaused(false); setGameState('SETTINGS'); }}
                  className="w-full py-4 mb-4 rounded-xl bg-slate-800 text-slate-300 font-bold tracking-widest uppercase hover:bg-slate-700 transition-colors"
                >
                  Settings
                </button>
                <button 
                  onClick={() => { playSound.click(); setIsPaused(false); endGame(); }}
                  className="w-full py-4 rounded-xl bg-red-900/30 text-red-400 font-bold tracking-widest uppercase border border-red-900/50 hover:bg-red-900/50 transition-colors"
                >
                  End Game
                </button>
              </div>
            )}

            {/* SECOND CHANCE MODAL */}
            {showSecondChance && (
              <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 rounded-3xl border-4 border-slate-800">
                <h2 className="text-3xl font-display font-black text-white mb-2 text-center">Incorrect!</h2>
                <p className="text-slate-400 text-center mb-8">Watch a short ad to get a second chance?</p>
                <button 
                  onClick={handleSecondChanceWatchAd}
                  className="w-full py-4 mb-4 rounded-xl bg-secondary text-slate-900 font-bold tracking-widest uppercase hover:bg-cyan-400 transition-colors shadow-[0_0_20px_rgba(0,195,255,0.4)]"
                >
                  Watch Ad
                </button>
                <button 
                  onClick={handleSecondChanceDecline}
                  className="w-full py-4 rounded-xl bg-transparent text-slate-500 font-bold tracking-widest uppercase hover:text-slate-300 transition-colors"
                >
                  No Thanks
                </button>
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

            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleShare}
              className="w-full py-4 mb-4 rounded-xl bg-[#1DA1F2] text-white font-bold tracking-wider hover:bg-[#1a91da] transition-colors flex justify-center items-center space-x-2"
            >
              <Share2 size={20} />
              <span>SHARE SCORE</span>
            </motion.button>

            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startGame}
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

      </AnimatePresence>

      {/* Persistent Banner Ad AT THE BOTTOM */}
      {(gameState === 'MENU' || gameState === 'GAME_OVER') && (
        <div className="fixed bottom-0 left-0 w-full flex justify-center pb-2 bg-slate-900 z-50">
           <AdPlaceholder type="banner" />
        </div>
      )}

      {/* Decorative Background Elements */}
      <div className="fixed top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/10 blur-[100px] pointer-events-none" />
      
    </div>
  );
}
