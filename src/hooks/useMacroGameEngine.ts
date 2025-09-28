// src/hooks/useMacroGameEngine.ts

import { useState, useEffect, useRef, useCallback } from 'react';
import { Macrogame, Microgame as MicrogameData, MicrogameResult, ConversionScreen, ConversionMethod } from '../types';

const WIN_SOUND_SRC = '/sounds/success.wav';
const LOSE_SOUND_SRC = '/sounds/lose.wav';

export const useMacroGameEngine = (macrogame?: Macrogame, allConversionScreens?: ConversionScreen[], allConversionMethods?: ConversionMethod[]) => {
  const [view, setView] = useState<'loading' | 'intro' | 'title' | 'controls' | 'game' | 'result' | 'promo' | 'end'>('loading');
  const [points, setPoints] = useState(0);
  const [activeGameData, setActiveGameData] = useState<MicrogameData | null>(null);
  const [result, setResult] = useState<MicrogameResult | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [activeConversionScreen, setActiveConversionScreen] = useState<ConversionScreen | null>(null);
  const [activeMethods, setActiveMethods] = useState<ConversionMethod[]>([]);

  const audioRef = useRef<{ [key: string]: HTMLAudioElement }>({});
  const gameIndexRef = useRef(0);

  const transitionToEnd = useCallback(() => {
    if (!macrogame || !allConversionScreens || !allConversionMethods) {
        setView('end'); // Go to a blank end screen if data is missing
        return;
    }

    if (macrogame.conversionScreenId) {
        const screen = allConversionScreens.find(s => s.id === macrogame.conversionScreenId);
        if (screen) {
            setActiveConversionScreen(screen);
            const methods = screen.methods.map(m => allConversionMethods.find(fullMethod => fullMethod.id === m.methodId)).filter(Boolean) as ConversionMethod[];
            setActiveMethods(methods);
        }
    }

    audioRef.current.bg?.pause();
    setView('end');
  }, [macrogame, allConversionScreens, allConversionMethods]);

  const runFlow = useCallback(async () => {
    if (!macrogame) return;
      if (gameIndexRef.current >= macrogame.flow.length) {
        if (macrogame.promoScreen?.enabled) {
          setView('promo');
        } else {
          transitionToEnd();
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
  
  const advanceFromIntro = useCallback(() => {
    if (view === 'intro') {
        runFlow();
    }
  }, [view, runFlow]);

  const advanceFromPromo = useCallback(() => {
    if (view === 'promo') {
      transitionToEnd();
    }
  }, [view]);

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

  useEffect(() => {
    if (view === 'result') {
      const timer = setTimeout(() => { runFlow(); }, 1500);
      return () => clearTimeout(timer);
    }

    if (view === 'intro' && macrogame?.introScreen.enabled) {
        if (macrogame.introScreen.clickToContinue) {
            return; // Wait for user to click
        }
        const introDuration = (macrogame.introScreen.duration || 3) * 1000;
        const timer = setTimeout(() => advanceFromIntro(), introDuration);
        return () => clearTimeout(timer);
    }

    if (view === 'promo' && macrogame?.promoScreen?.enabled) {
      if (macrogame.promoScreen.clickToContinue) {
        return; 
      }
      const promoDuration = (macrogame.promoScreen.duration || 5) * 1000;
      const timer = setTimeout(() => advanceFromPromo(), promoDuration);
      return () => clearTimeout(timer);
    }
  }, [view, runFlow, macrogame, advanceFromIntro, advanceFromPromo]);
  
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
    
    if (macrogame.introScreen.enabled) {
      setView('intro');
    } else {
        runFlow();
    }
  }, [macrogame, runFlow]);

  return { view, points, result, activeGameData, macrogame, start, onGameEnd, isMuted, toggleMute, advanceFromIntro, advanceFromPromo, activeConversionScreen, activeMethods };
};