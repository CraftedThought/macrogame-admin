// src/PreviewHost.tsx

import React, { useEffect, useState, useRef, useCallback, useLayoutEffect } from 'react';
import { DeliveryContainer, Macrogame, UISkin, Microgame as MicrogameData, MicrogameResult, ScreenConfig } from '../types';
import { UI_SKINS } from './constants';
import { useMacroGameEngine } from './hooks/useMacroGameEngine';
import { MacrogameChrome } from './components/ui/MacrogameChrome';
import { microgames } from './microgames';
import { preloadMicrogames } from './microgames/preloader';
import { preloadImages } from './utils/helpers';
import { ConversionScreenHost } from './components/conversions/ConversionScreenHost';
import { useDebouncedResize } from './utils/helpers';
import ClassicHandheldSkin from './skins/ClassicHandheld';
import ModernHandheldSkin from './skins/ModernHandheld';
import TabletSkin from './skins/Tablet';
import BarebonesSkin from './skins/Barebones';
import ConfigurablePopupSkin from './skins/ConfigurablePopup';
import ConfigurablePopupLiveSkin from './skins/ConfigurablePopupLive';
import { useData } from './hooks/useData';

const skinRegistry: { [key: string]: React.FC<any> } = {
  'classic-handheld': ClassicHandheldSkin,
  'modern-handheld': ModernHandheldSkin,
  'tablet': TabletSkin,
  'barebones': BarebonesSkin,
  'configurable-popup': ConfigurablePopupSkin,
  'configurable-popup-live': ConfigurablePopupLiveSkin,
};

const StaticScreen: React.FC<{
    view: string;
    data: any;
    activeGameData: MicrogameData | null;
    result: MicrogameResult | null;
    handleRestart: () => void;
    advanceFromIntro: () => void;
    advanceFromPromo: () => void;
    totalScore: number;
    pointCosts: { [key: string]: number };
    redeemPoints: (amount: number) => void;
}> = ({ view, data, activeGameData, result, handleRestart, advanceFromIntro, advanceFromPromo, totalScore, pointCosts, redeemPoints }) => {

    const textStyles: React.CSSProperties = { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'white', textAlign: 'center', fontFamily: data.skin.fontFamily || 'sans-serif', textShadow: '2px 2px 4px rgba(0,0,0,0.6)', padding: '1.5em', boxSizing: 'border-box', backgroundSize: 'cover', backgroundPosition: 'center' };

    switch (view) {
        case 'intro': {
            const introConfig = data.macrogame.introScreen;
            const introStyle = { ...textStyles, ...(introConfig.backgroundImageUrl && { backgroundImage: `url("${introConfig.backgroundImageUrl}")` }), ...(introConfig.clickToContinue && { cursor: 'pointer' }) };
            return ( <div style={introStyle} onClick={introConfig.clickToContinue ? advanceFromIntro : undefined}> <h1 style={{ fontSize: '2.8em' }}>{introConfig.text}</h1> {introConfig.clickToContinue && ( <p style={{ marginTop: '1.5em', fontSize: '1.4em', background: 'rgba(0,0,0,0.7)', padding: '0.5em 0.8em', borderRadius: '5px' }}> Click to continue </p> )} </div> );
        }
        case 'title':
            return <div style={textStyles}><h1 style={{ fontSize: '4em', textTransform: 'uppercase' }}>{activeGameData?.name}</h1></div>;
        
        case 'controls': {
             const skin = activeGameData?.skins?.[data.macrogame.category] ?? Object.values(activeGameData?.skins || {})[0];
             const description = skin?.description ?? 'Get ready!';
            return <div style={textStyles}><h2 style={{ fontSize: '2.2em' }}>{activeGameData?.controls}</h2><p style={{marginTop: '1em', fontSize: '1.4em'}}>{description}</p></div>;
        }
        case 'combined': {
            const skin = activeGameData?.skins?.[data.macrogame.category] ?? Object.values(activeGameData?.skins || {})[0];
            const description = skin?.description ?? 'Get ready!';
            return (
                <div style={textStyles}>
                    <h1 style={{ fontSize: '3.5em', textTransform: 'uppercase', marginBottom: '1em' }}>{activeGameData?.name}</h1>
                    <h2 style={{ fontSize: '2.2em' }}>{activeGameData?.controls}</h2>
                    <p style={{marginTop: '1em', fontSize: '1.4em'}}>{description}</p>
                </div>
            );
        }
        case 'result':
            return <div style={textStyles}><h1 style={{ fontSize: '8em', fontWeight: 'bold', color: result?.win ? '#2ecc71' : '#e74c3c' }}>{result?.win ? 'WIN!' : 'LOSE'}</h1></div>;
        
        case 'promo': {
            const promoConfig = data.macrogame.promoScreen as ScreenConfig;
            const promoBaseStyle: React.CSSProperties = { ...textStyles, ...(promoConfig.backgroundImageUrl && { backgroundImage: `url("${promoConfig.backgroundImageUrl}")` }), ...(!promoConfig.backgroundImageUrl && { backgroundColor: '#1a1a2e' }), ...(promoConfig.clickToContinue && { cursor: 'pointer' }) };
            
            const layout = promoConfig.spotlightImageLayout;
            const contentContainerStyle: React.CSSProperties = { display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', gap: '1em' };
            if (layout === 'left') contentContainerStyle.flexDirection = 'row';
            if (layout === 'right') contentContainerStyle.flexDirection = 'row-reverse';
            if (layout === 'top') contentContainerStyle.flexDirection = 'column';
            if (layout === 'bottom') contentContainerStyle.flexDirection = 'column-reverse';

            const imageStyle: React.CSSProperties = { objectFit: 'cover', borderRadius: '8px', };
            if (layout === 'left' || layout === 'right') {
                imageStyle.width = '40%';
                imageStyle.height = '70%';
            } else { // top or bottom
                imageStyle.width = '70%';
                imageStyle.height = '40%';
            }

            return (
                <div style={promoBaseStyle} onClick={promoConfig.clickToContinue ? advanceFromPromo : undefined}>
                    <div style={contentContainerStyle}>
                        {promoConfig.spotlightImageUrl && <img src={promoConfig.spotlightImageUrl} style={imageStyle} alt="Promo" />}
                        <div style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', padding: '1em', borderRadius: '8px' }}>
                            <h1 style={{ fontSize: '2.2em' }}>{promoConfig.text}</h1>
                        </div>
                    </div>
                    {promoConfig.clickToContinue && ( <p style={{ position: 'absolute', bottom: '1em', fontSize: '1.4em', background: 'rgba(0,0,0,0.7)', padding: '0.5em 0.8em', borderRadius: '5px' }}> Click to continue </p> )}
                </div>
            );
        }
        case 'end':
            if (data.isPreviewMode === 'single_game') {
                return ( <div style={{...textStyles, justifyContent: 'center' }}> <h2 style={{ margin: '0 0 1.5em', fontSize: '2.2em' }}>Preview Finished</h2> <button onClick={handleRestart} style={{ padding: '0.8em 1.5em', background: '#4CAF50', color: 'white', border: 'none', fontFamily: 'inherit', fontSize: '1.5em', cursor: 'pointer', borderRadius: '6px' }}> Play Again </button> </div> );
            }
            if (data.macrogame.conversionScreenId) {
                const screen = data.allConversionScreens.find((s: ConversionScreen) => s.id === data.macrogame.conversionScreenId);
                return screen ? <ConversionScreenHost screen={screen} totalScore={totalScore} pointCosts={pointCosts} redeemPoints={redeemPoints} /> : <div style={textStyles}><h2>Game Over!</h2><p>(Error: Configured conversion screen not found)</p></div>;
            }
            return ( <div style={{...textStyles, justifyContent: 'center' }}> <h2>Game Over!</h2> <p>(No conversion screen was configured)</p> <button onClick={handleRestart} style={{ marginTop: '1.5em', padding: '0.8em', background: '#4CAF50', color: 'white', border: 'none' }}> Play Again </button> </div> );
        
        default: return null;
    }
}

const PreviewHost: React.FC = () => {
    const { macrogames, allConversionScreens, allMicrogames, customMicrogames } = useData();
    useDebouncedResize();
    const gameAreaRef = useRef<HTMLDivElement>(null);
    const [gameAreaFontSize, setGameAreaFontSize] = useState(16);
    const [previewConfig, setPreviewConfig] = useState<any | null>(null);
    const [activeMacrogame, setActiveMacrogame] = useState<Macrogame | null>(null);
    const [activeSkin, setActiveSkin] = useState<UISkin | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [runId, setRunId] = useState(0);

    const engine = useMacroGameEngine(activeMacrogame);
    
    useEffect(() => {
        try {
            const rawData = localStorage.getItem('macrogame_preview_data');
            if (!rawData) throw new Error("No preview data found.");
            setPreviewConfig(JSON.parse(rawData));
        } catch (e: any) { setError(e.message); }
    }, []);

    // src/PreviewHost.tsx

    // --- UPDATED --- Preloading logic now handles a full macrogame object or an ID
    useEffect(() => {
        if (!previewConfig || !allMicrogames.length) return;

        let macrogameToPreview: Macrogame | undefined;

        // PRIORITY 1: Use the full macrogame object from the preview config if it exists.
        if (previewConfig.macrogame) {
            macrogameToPreview = previewConfig.macrogame as Macrogame;
        } 
        // PRIORITY 2: Fallback to finding the macrogame by ID from the database data.
        else if (macrogames.length > 0) {
            macrogameToPreview = macrogames.find(m => m.id === previewConfig.macrogameId);
        } else {
            return;
        }
        
        console.log("DEBUG: Found macrogame object to preview:", macrogameToPreview);

        const foundSkin = UI_SKINS.find(s => s.id === previewConfig.skinId);
        if (!macrogameToPreview || !foundSkin) {
            setError("Could not find the macrogame or UI skin for the preview.");
            setIsLoading(false);
            return;
        }

        // Hydrate flow with full microgame details for the engine
        const flowWithDetails = macrogameToPreview.flow.map((flowItem: any) => {
            if (flowItem.baseType) return flowItem; 
            const baseGame = allMicrogames.find(mg => mg.id === flowItem.microgameId);
            if (!baseGame || baseGame.isActive === false) return null;
            const customVariant = flowItem.variantId ? customMicrogames.find(v => v.id === flowItem.variantId) : undefined;
            const skinDataObject = customVariant?.skinData || {};
            const customSkinData = Object.keys(skinDataObject).reduce((acc: any, key: string) => { acc[key] = skinDataObject[key].url; return acc; }, {} as {[key: string]: string});
            return { ...baseGame, ...flowItem, customSkinData };
        }).filter(Boolean);

        const hydratedMacrogame = { ...macrogameToPreview, flow: flowWithDetails as any[] };

        console.log('--- DEBUG 1: Hydrated Macrogame Data ---');
        console.log('Intro Screen:', hydratedMacrogame.introScreen);
        console.log('Promo Screen:', hydratedMacrogame.promoScreen);

        const gameIdsToPreload = flowWithDetails.map(g => g.id);
        const imageUrlsToPreload: string[] = [];
        if (hydratedMacrogame.introScreen.backgroundImageUrl) {
            imageUrlsToPreload.push(hydratedMacrogame.introScreen.backgroundImageUrl);
        }
        if (hydratedMacrogame.promoScreen?.backgroundImageUrl) {
            imageUrlsToPreload.push(hydratedMacrogame.promoScreen.backgroundImageUrl);
        }
        if (hydratedMacrogame.promoScreen?.spotlightImageUrl) {
            imageUrlsToPreload.push(hydratedMacrogame.promoScreen.spotlightImageUrl);
        }

        const microgamePromise = preloadMicrogames(gameIdsToPreload);
        const imagePromise = preloadImages(imageUrlsToPreload);

        Promise.all([microgamePromise, imagePromise])
            .then(() => {
                setActiveMacrogame(hydratedMacrogame);
                setActiveSkin(foundSkin);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Preloading failed:", err);
                setError("Failed to preload assets for the preview.");
                setIsLoading(false);
            });
            
    }, [previewConfig, macrogames, allMicrogames, customMicrogames]);

    const hasStarted = useRef(false);
    useEffect(() => {
        if (activeMacrogame && !isLoading && !hasStarted.current) {
            engine.start();
            hasStarted.current = true;
        }
    }, [activeMacrogame, isLoading, engine]);
    
    const handleRestart = useCallback(() => { hasStarted.current = false; engine.start(); setRunId(c => c + 1); }, [engine]);

    useLayoutEffect(() => {
        const calculateFontSize = () => {
            if (gameAreaRef.current) {
                // Base the font size on the container's width. 
                // The number 50 is a "magic number" that can be tweaked, but it's a good starting point.
                const newSize = gameAreaRef.current.clientWidth / 50;
                setGameAreaFontSize(newSize);
            }
        };

        // Calculate on initial render and on window resize
        calculateFontSize();
        window.addEventListener('resize', calculateFontSize);
        return () => window.removeEventListener('resize', calculateFontSize);
    }, [activeMacrogame]); // Rerun if the macrogame changes

    if (error) { return <div className="preview-error"><h2>Preview Error</h2><p>{error}</p></div>; }
    if (isLoading || !activeMacrogame || !activeSkin) { return <div className="preview-error"><h2>Loading Preview...</h2></div>; }

    const skinIdToUse = activeSkin.id === 'configurable-popup' ? 'configurable-popup-live' : activeSkin.id; // <-- USE THE LIVE SKIN HERE
    const SkinComponent = skinRegistry[skinIdToUse];
    if (!SkinComponent) { return <div className="preview-error"><h2>Error</h2><p>UI Skin "{activeSkin.name}" is not registered.</p></div>; }

    let content: React.ReactNode = null;
    if (engine.view === 'game' && engine.activeGameData) {
        const ActiveMicrogame = microgames[engine.activeGameData.id];
        const skinConfig = (engine.activeGameData as any).customSkinData || {};
        content = <ActiveMicrogame key={runId} onEnd={engine.onGameEnd} onReportEvent={engine.onReportEvent} skinConfig={skinConfig} gameData={engine.activeGameData} isOverlayVisible={engine.isOverlayVisible} onInteraction={engine.onInteraction} />;
    } else {
        const dataForStaticScreen = {
            macrogame: activeMacrogame,
            skin: activeSkin,
            isPreviewMode: previewConfig?.isPreviewMode,
            allConversionScreens: allConversionScreens
        };
        content = <StaticScreen {...engine} data={dataForStaticScreen} handleRestart={handleRestart} totalScore={engine.totalScore} pointCosts={activeMacrogame.pointCosts || {}} redeemPoints={engine.redeemPoints} />;
    }

    // --- NEW: Conditionally build props for the skin component ---
    const skinProps: any = {
      isMuted: engine.isMuted,
      onClose: () => window.close(),
      onMute: engine.toggleMute,
    };

    if (activeSkin.id === 'configurable-popup') {
        // Our new skin expects the full skinConfig object
        skinProps.skinConfig = previewConfig?.container?.skinConfig || {};
    } else {
        // Legacy skins (like handhelds) expect the 'skin' prop
        skinProps.skin = activeSkin;
        
        // Barebones and other potential future skins might
        // read these flat props (which are now deprecated
        // but we pass them for backward compatibility).
        skinProps.title = previewConfig?.container?.title;
        skinProps.subtitle = previewConfig?.container?.subtitle;
        skinProps.colorScheme = previewConfig?.container?.colorScheme;
    }
    // --- END NEW ---



    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}>
            <SkinComponent {...skinProps}>
                <div 
                    ref={gameAreaRef} 
                    style={{ width: '100%', height: '100%', fontSize: gameAreaFontSize }}
                >
                    {activeMacrogame.config.showPoints || activeMacrogame.config.showProgress ? (
                      <MacrogameChrome
                        showPoints={activeMacrogame.config.showPoints ?? false}
                        showProgress={activeMacrogame.config.showProgress ?? false}
                        totalScore={engine.totalScore}
                        progressText={engine.progressText}
                      >
                        {content}
                      </MacrogameChrome>
                    ) : (
                      content
                    )}
                </div>
            </SkinComponent>
        </div>
    );
};

export default PreviewHost;