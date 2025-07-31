import { useState, useEffect, useRef, useCallback } from 'react';
import { microgames } from '../microgames';
import { BaseMicrogame, MicrogameResult } from '../components/BaseMicrogame';
import { Macrogame, Reward, Microgame as MicrogameData } from '../types';

const WIN_SOUND_SRC = '/sounds/success.wav';
const LOSE_SOUND_SRC = '/sounds/lose.wav';

export const useMacroGameEngine = (
  gameAreaRef: React.RefObject<HTMLDivElement>,
  macrogame?: Macrogame,
  allRewards?: Reward[]
) => {
  const [view, setView] = useState<'loading' | 'intro' | 'title' | 'controls' | 'game' | 'result' | 'end'>('loading');
  const [points, setPoints] = useState(0);
  const [activeGameData, setActiveGameData] = useState<MicrogameData | null>(null);
  const [result, setResult] = useState<MicrogameResult | null>(null);
  
  const activeGameRef = useRef<BaseMicrogame | null>(null);
  const audioRef = useRef<{ [key: string]: HTMLAudioElement }>({});
  const gameIndexRef = useRef(0);

  const onGameEnd = useCallback((gameResult: MicrogameResult) => {
    // First, clean up the microgame's internal logic (e.g., timers)
    activeGameRef.current?.cleanup();
    activeGameRef.current = null;
    
    // CRITICAL FIX: Manually clear the DOM managed by the microgame class
    if (gameAreaRef.current) {
        gameAreaRef.current.innerHTML = '';
    }

    setResult(gameResult);

    if (gameResult.win) {
        setPoints(p => p + 100);
        audioRef.current.win?.play().catch(console.warn);
    } else {
        audioRef.current.lose?.play().catch(console.warn);
    }
    
    gameIndexRef.current++;
    setView('result'); // Now, let React take over rendering again
  }, [gameAreaRef]);

  const runFlow = useCallback(async () => {
    if (!macrogame) return;

    if (gameIndexRef.current >= macrogame.flow.length) {
      audioRef.current.bg?.pause();
      setView('end');
      return;
    }

    const gameFlow = macrogame.flow as unknown as MicrogameData[];
    const gameData = gameFlow[gameIndexRef.current];
    setActiveGameData(gameData);
    
    setView('title');
    await new Promise(resolve => setTimeout(resolve, macrogame.config.titleScreenDuration));
    
    setView('controls');
    await new Promise(resolve => setTimeout(resolve, macrogame.config.controlsScreenDuration));
    
    setView('game');

    setTimeout(() => {
        const GameClass = microgames[gameData.id];
        if (GameClass && gameAreaRef.current) {
            gameAreaRef.current.innerHTML = '';
            const gameInstance = new GameClass(gameAreaRef.current, onGameEnd, {});
            activeGameRef.current = gameInstance;
            gameInstance.start();
        } else {
            console.error(`Game class for ${gameData.id} not found or gameAreaRef is not available.`);
            gameIndexRef.current++;
            runFlow();
        }
    }, 50);

  }, [macrogame, gameAreaRef, onGameEnd]);

  useEffect(() => {
    if (view === 'result') {
      const timer = setTimeout(() => {
        runFlow();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [view, runFlow]);

  const start = useCallback(async () => {
    if (!macrogame) return;
    gameIndexRef.current = 0;
    setPoints(0);

    if (macrogame.config.backgroundMusicUrl) {
      const bg = new Audio(macrogame.config.backgroundMusicUrl);
      bg.loop = true;
      audioRef.current.bg = bg;
      bg.play().catch(console.warn);
    }
    audioRef.current.win = new Audio(WIN_SOUND_SRC);
    audioRef.current.lose = new Audio(LOSE_SOUND_SRC);
    
    setView('intro');
    await new Promise(resolve => setTimeout(resolve, macrogame.config.introScreenDuration));
    
    runFlow();
  }, [macrogame, runFlow]);

  return { view, points, result, activeGameData, macrogame, allRewards, start };
};