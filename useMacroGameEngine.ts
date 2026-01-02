/* src/hooks/useMacroGameEngine.ts */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Macrogame, Microgame as MicrogameData, MicrogameResult } from '../types';
import { MACROGAME_MUSIC_LIBRARY, UI_SOUND_EFFECTS } from '../constants';

export const useMacroGameEngine = (macrogame?: Macrogame) => {
    const [view, setView] = useState<'loading' | 'intro' | 'title' | 'controls' | 'game' | 'result' | 'promo' | 'end' | 'combined'>('loading');
    const [activeGameData, setActiveGameData] = useState<MicrogameData | null>(null);
    const [result, setResult] = useState<MicrogameResult | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [totalScore, setTotalScore] = useState(0);
    const [progressText, setProgressText] = useState('');
  
    const audioRef = useRef<{ [key: string]: HTMLAudioElement }>({});
    const gameIndexRef = useRef(0);
    const currentTrackRef = useRef<HTMLAudioElement | null>(null);
    const isOverlayVisible = macrogame?.config.screenFlowType === 'Overlay' && view === 'game';

    const onInteraction = useCallback(() => {
        // This function currently does nothing, but it acts as a stable signal
        // from the microgame to the engine that the user has started the game.
        // We could add analytics tracking here in the future.
    }, []);

    // --- NEW, ADVANCED AUDIO MANAGEMENT ---
    const manageBackgroundMusic = useCallback((currentView: string, microgameIndex?: number) => {
        if (!macrogame?.config) return;

        let key: string | null = null;
        if (['title', 'controls', 'game', 'result'].includes(currentView) && microgameIndex !== undefined && microgameIndex < macrogame.flow.length) {
            key = `flow_${microgameIndex}`;
        } else if (currentView === 'intro') {
            key = 'intro';
        } else if (currentView === 'promo') {
            key = 'promo';
        } else if (currentView === 'end') {
            if (macrogame.conversionScreenId) {
                key = 'conversion';
            }
        }

        const shouldPlay = key ? (macrogame.audioConfig?.[key]?.playMusic ?? true) : false;
        if (!shouldPlay) {
            currentTrackRef.current?.pause();
            return;
        }

        const overrideId = key ? macrogame.audioConfig?.[key]?.musicId : null;
        const mainMusicUrl = macrogame.config.backgroundMusicUrl;

        let targetTrackPath: string | null = null;
        if (overrideId && overrideId !== 'none') {
            targetTrackPath = MACROGAME_MUSIC_LIBRARY.find(t => t.id === overrideId)?.path || mainMusicUrl;
        } else if (overrideId === 'none') {
            targetTrackPath = null;
        } else {
            targetTrackPath = mainMusicUrl;
        }

        if (!targetTrackPath) {
            currentTrackRef.current?.pause();
            return;
        }

        if (currentTrackRef.current?.src.endsWith(targetTrackPath) && !currentTrackRef.current.paused) {
            return; // Correct track is already playing
        }

        currentTrackRef.current?.pause();
        const newTrack = new Audio(targetTrackPath);
        newTrack.loop = true;
        newTrack.muted = isMuted;
        newTrack.play().catch(err => console.error('Audio play failed:', err));
        currentTrackRef.current = newTrack;

    }, [macrogame, isMuted]);

    // ... (rest of the hooks are largely the same)
    const transitionToEnd = useCallback(() => setView('end'), []);
    const runFlow = useCallback(async () => {
        if (!macrogame) return;
        if (gameIndexRef.current >= macrogame.flow.length) {
            setView(macrogame.promoScreen?.enabled ? 'promo' : 'end');
            return;
        }

        // The flow array now contains pointRules, but the microgame components
        // only need the base MicrogameData. We cast it to ensure type safety.
        const gameFlow = macrogame.flow as unknown as MicrogameData[];
        const gameData = gameFlow[gameIndexRef.current];
        setActiveGameData(gameData);

        const flowType = macrogame.config.screenFlowType || 'Separate';

        switch (flowType) {
            case 'Skip':
            case 'Overlay':
                setView('game');
                break;
            case 'Combined':
                setView('combined');
                break;
            case 'Separate':
            default:
                setView('title');
                await new Promise(resolve => setTimeout(resolve, macrogame.config.titleScreenDuration));
                // After the title screen duration, transition to controls, then game.
                setView('controls');
                await new Promise(resolve => setTimeout(resolve, macrogame.config.controlsScreenDuration));
                setView('game');
                break;
        }
    }, [macrogame]);
    const advanceFromIntro = useCallback(() => { if (view === 'intro') runFlow(); }, [view, runFlow]);
    const advanceFromPromo = useCallback(() => { if (view === 'promo') transitionToEnd(); }, [view, transitionToEnd]);

    const onGameEnd = useCallback((gameResult: MicrogameResult) => {
        setResult(gameResult);

        // Scoring logic is now handled by onReportEvent

        const soundToPlay = gameResult.win ? audioRef.current.win : audioRef.current.lose;
        soundToPlay?.play().catch(console.warn);

        gameIndexRef.current++;
        setView('result');
    }, []);

    /**
     * NEW: Handles scoring based on events reported by the microgame.
     */
    const onReportEvent = useCallback((eventName: string) => {
        if (!macrogame) return;

        // Find the point rules for the current game in the flow
        const flowItem = macrogame.flow[gameIndexRef.current];
        const pointRules = flowItem?.pointRules;
        
        // Find the specific point value for the reported event
        const pointsToAdd = pointRules?.[eventName];

        // If a point value is defined, update the total score
        if (typeof pointsToAdd === 'number') {
            setTotalScore(prevScore => prevScore + pointsToAdd);
        }
    }, [macrogame]); // This callback depends on the macrogame's configuration

    /**
    * NEW: Allows the conversion screen to deduct points when a reward is redeemed.
    */
    const redeemPoints = useCallback((amount: number) => {
        setTotalScore(prevScore => prevScore - amount);
    }, []);

    useEffect(() => {
        // When showing the result, use the index of the game that just finished.
        const musicIndex = view === 'result' ? gameIndexRef.current - 1 : gameIndexRef.current;
        manageBackgroundMusic(view, musicIndex);

        // --- Generate Progress Text ---
        const totalGames = macrogame?.flow.length || 0;
        switch (view) {
            case 'intro':
                setProgressText('Introduction');
                break;
            case 'title':
            case 'controls':
            case 'game':
            case 'result':
            case 'combined':
                setProgressText(`Game ${Math.min(gameIndexRef.current + 1, totalGames)} of ${totalGames}`);
                break;
            case 'promo':
                setProgressText('Promotion');
                break;
            case 'end':
                setProgressText('Reward');
                break;
            default:
                setProgressText(''); // Set to empty for loading or other states
        }
        // --- End Generate Progress Text ---

        if (view === 'result') {
            const timer = setTimeout(() => { runFlow(); }, 1500);
            return () => clearTimeout(timer);
        }
        if (view === 'combined') {
            const timer = setTimeout(() => {
                setView('game');
            }, macrogame?.config.titleScreenDuration || 2000);
            return () => clearTimeout(timer);
        }
        if (view === 'intro' && macrogame?.introScreen.enabled && !macrogame.introScreen.clickToContinue) {
            const timer = setTimeout(() => advanceFromIntro(), (macrogame.introScreen.duration || 3) * 1000);
            return () => clearTimeout(timer);
        }
        if (view === 'promo' && macrogame?.promoScreen?.enabled && !macrogame.promoScreen.clickToContinue) {
            const timer = setTimeout(() => advanceFromPromo(), (macrogame.promoScreen.duration || 5) * 1000);
            return () => clearTimeout(timer);
        }
    }, [view, runFlow, macrogame, advanceFromIntro, advanceFromPromo, manageBackgroundMusic]);
  
    useEffect(() => {
        if (currentTrackRef.current) {
            currentTrackRef.current.muted = isMuted;
        }
        if (audioRef.current.win) audioRef.current.win.muted = isMuted;
        if (audioRef.current.lose) audioRef.current.lose.muted = isMuted;
    }, [isMuted]);

    const toggleMute = useCallback(() => setIsMuted(prev => !prev), []);

    const start = useCallback(async () => {
        if (!macrogame) return;
        gameIndexRef.current = 0;
        setTotalScore(0);
    
        // Pre-load UI sound effects
        if (!audioRef.current.win) audioRef.current.win = new Audio(UI_SOUND_EFFECTS['Success']!);
        if (!audioRef.current.lose) audioRef.current.lose = new Audio(UI_SOUND_EFFECTS['Lose']!);
    
        // Stop any currently playing track before starting a new session
        currentTrackRef.current?.pause();
        currentTrackRef.current = null;
    
        const startingView = macrogame.introScreen.enabled ? 'intro' : 'title';
        setView(startingView);

        if (startingView === 'intro') {
            manageBackgroundMusic('intro', 0);
        } else {
            runFlow();
        }
    }, [macrogame, runFlow, manageBackgroundMusic]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            currentTrackRef.current?.pause();
        }
    }, []);

    return { 
        view, result, activeGameData, macrogame, start, onGameEnd, isMuted, toggleMute, 
        advanceFromIntro, advanceFromPromo, isOverlayVisible, onInteraction,
        onReportEvent,
        totalScore,
        currentGameIndex: gameIndexRef.current,
        totalGamesInFlow: macrogame?.flow.length || 0,
        progressText,
        redeemPoints,
    };
};