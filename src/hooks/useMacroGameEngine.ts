// src/hooks/useMacroGameEngine.ts

import { useState, useEffect, useRef, useCallback } from 'react';
import { Macrogame, Reward, Microgame as MicrogameData, MicrogameResult } from '../types';

const WIN_SOUND_SRC = '/sounds/success.wav';
const LOSE_SOUND_SRC = '/sounds/lose.wav';

// The useMacroGameEngine hook encapsulates all logic for running a macrogame sequence.
export const useMacroGameEngine = (macrogame?: Macrogame, allRewards?: Reward[]) => {
  // The 'view' state determines which screen is currently visible to the user.
  // NEW: Added 'promo' to the list of possible views.
  const [view, setView] = useState<'loading' | 'intro' | 'title' | 'controls' | 'game' | 'result' | 'promo' | 'end'>('loading');
  const [points, setPoints] = useState(0);
  const [activeGameData, setActiveGameData] = useState<MicrogameData | null>(null);
  const [result, setResult] = useState<MicrogameResult | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  
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

    // Check if we've finished all microgames.
    if (gameIndexRef.current >= macrogame.flow.length) {
      // NEW (Req 4): Before ending, check if there's an enabled promo screen.
      if (macrogame.promoScreen?.enabled) {
        setView('promo');
      } else {
        audioRef.current.bg?.pause();
        setView('end'); // If no promo screen, go directly to the end/rewards screen.
      }
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
      const timer = setTimeout(() => { runFlow(); }, 1500);
      return () => clearTimeout(timer);
    }
    // NEW (Req 4): Handle transition away from the promo screen.
    // NOTE: This currently only handles the timed duration. 'Click to continue' would require an additional callback.
    if (view === 'promo' && macrogame?.promoScreen?.enabled) {
      const promoDuration = (macrogame.promoScreen.duration || 5) * 1000;
      const timer = setTimeout(() => {
        audioRef.current.bg?.pause();
        setView('end');
      }, promoDuration);
      return () => clearTimeout(timer);
    }
  }, [view, runFlow, macrogame]);
  
  useEffect(() => {
      const bgAudio = audioRef.current.bg;
      if (bgAudio) { bgAudio.muted = isMuted; }
  }, [isMuted]);

  const toggleMute = useCallback(() => { setIsMuted(prev => !prev); }, []);

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
    
    // NEW (Req 3 & 5): Only show the intro screen if it's enabled in the config.
    if (macrogame.config.showIntroScreen) {
      setView('intro');
      await new Promise(resolve => setTimeout(resolve, macrogame.config.introScreenDuration));
    }
    
    runFlow();
  }, [macrogame, runFlow]);

  return { view, points, result, activeGameData, macrogame, allRewards, start, onGameEnd, isMuted, toggleMute };
};