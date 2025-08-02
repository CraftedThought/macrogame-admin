import { useState, useEffect, useRef, useCallback } from 'react';
import { Macrogame, Reward, Microgame as MicrogameData, MicrogameResult } from '../types';

const WIN_SOUND_SRC = '/sounds/success.wav';
const LOSE_SOUND_SRC = '/sounds/lose.wav';

export const useMacroGameEngine = (macrogame?: Macrogame, allRewards?: Reward[]) => {
  const [view, setView] = useState<'loading' | 'intro' | 'title' | 'controls' | 'game' | 'result' | 'end'>('loading');
  const [points, setPoints] = useState(0);
  const [activeGameData, setActiveGameData] = useState<MicrogameData | null>(null);
  const [result, setResult] = useState<MicrogameResult | null>(null);
  const [isMuted, setIsMuted] = useState(false); // Add muted state
  
  const audioRef = useRef<{ [key: string]: HTMLAudioElement }>({});
  const gameIndexRef = useRef(0);

  const onGameEnd = useCallback((gameResult: MicrogameResult) => {
    setResult(gameResult);

    if (gameResult.win) {
        setPoints(p => p + 100);
        audioRef.current.win?.play().catch(console.warn);
    } else {
        audioRef.current.lose?.play().catch(console.warn);
    }
    
    gameIndexRef.current++;
    setView('result');
  }, []);

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
  }, [macrogame]);

  useEffect(() => {
    if (view === 'result') {
      const timer = setTimeout(() => {
        runFlow();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [view, runFlow]);
  
  // Sync the isMuted state with the audio element
  useEffect(() => {
      const bgAudio = audioRef.current.bg;
      if (bgAudio) {
          bgAudio.muted = isMuted;
      }
  }, [isMuted]);

  // Function to toggle mute state
  const toggleMute = useCallback(() => {
      setIsMuted(prev => !prev);
  }, []);

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

  // Return the new mute controls
  return { view, points, result, activeGameData, macrogame, allRewards, start, onGameEnd, isMuted, toggleMute };
};