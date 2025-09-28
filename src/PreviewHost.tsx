// src/PreviewHost.tsx

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Popup, Macrogame, UISkin, Microgame as MicrogameData, MicrogameResult, ConversionScreen, ConversionMethod, EmailCaptureMethod, LinkRedirectMethod, CouponDisplayMethod } from '../types';
import { UI_SKINS } from './constants';
import { useMacroGameEngine } from './hooks/useMacroGameEngine';
import { microgames } from './microgames';
import { preloadMicrogames } from './microgames/preloader';
import { ConversionScreenHost } from './components/conversions/ConversionScreenHost';
import ClassicHandheldSkin from './skins/ClassicHandheld';
import ModernHandheldSkin from './skins/ModernHandheld';
import TabletSkin from './skins/Tablet';
import BarebonesSkin from './skins/Barebones';
import { useData } from './hooks/useData';

const skinRegistry: { [key: string]: React.FC<any> } = {
  'classic-handheld': ClassicHandheldSkin,
  'modern-handheld': ModernHandheldSkin,
  'tablet': TabletSkin,
  'barebones': BarebonesSkin,
};

// --- Conversion Method Renderer Components (Defined outside the main component) ---
const CouponDisplay: React.FC<{ method: CouponDisplayMethod }> = ({ method }) => (
    <div style={{ border: '2px dashed #f1c40f', padding: '1rem', borderRadius: '8px', margin: '1rem 0', backgroundColor: 'rgba(255,255,255,0.1)' }}>
        <h4 style={{ margin: 0, fontSize: '1.2em' }}>{method.headline}</h4>
        <p style={{ margin: '0.5rem 0' }}>{method.subheadline}</p>
        <div style={{ background: 'rgba(0,0,0,0.5)', padding: '0.5rem 1rem', borderRadius: '4px', display: 'inline-block', letterSpacing: '2px', fontWeight: 'bold' }}>
            {method.couponCode}
        </div>
    </div>
);

const EmailCapture: React.FC<{ method: EmailCaptureMethod }> = ({ method }) => (
    <div style={{ margin: '1rem 0', width: '90%' }}>
        <h4 style={{ margin: 0, fontSize: '1.2em' }}>{method.headline}</h4>
        <p style={{ margin: '0.5rem 0' }}>{method.subheadline}</p>
        <form onSubmit={e => { e.preventDefault(); alert('Submission captured!'); }}>
            <input type="email" required placeholder="Enter your email..." style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', color: '#333' }}/>
            <button type="submit" style={{ width: '100%', padding: '0.75rem', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '4px', marginTop: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}>
                {method.submitButtonText}
            </button>
        </form>
    </div>
);

const LinkRedirect: React.FC<{ method: LinkRedirectMethod }> = ({ method }) => (
    <div style={{ margin: '1rem 0', width: '90%' }}>
        <h4 style={{ margin: 0, fontSize: '1.2em' }}>{method.headline}</h4>
        <p style={{ margin: '0.5rem 0' }}>{method.subheadline}</p>
        <a href={method.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', padding: '0.75rem', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', textDecoration: 'none', fontWeight: 'bold' }}>
            {method.buttonText}
        </a>
    </div>
);


const StaticScreen: React.FC<{
    view: string;
    data: any;
    activeGameData: MicrogameData | null;
    result: MicrogameResult | null;
    start: () => Promise<void>;
    advanceFromIntro: () => void;
    advanceFromPromo: () => void;
    handleRestart: () => void;
    activeConversionScreen: ConversionScreen | null;
    activeMethods: ConversionMethod[];
}> = ({ view, data, activeGameData, result, start, advanceFromIntro, advanceFromPromo, handleRestart, activeConversionScreen, activeMethods }) => {
    const textStyles: React.CSSProperties = { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'white', textAlign: 'center', fontFamily: data.skin.fontFamily || 'sans-serif', textShadow: '2px 2px 4px rgba(0,0,0,0.6)', padding: '20px', boxSizing: 'border-box', backgroundSize: 'cover', backgroundPosition: 'center' };

    switch (view) {
        case 'intro':
            const introConfig = data.macrogame.introScreen;
            const introStyle = { ...textStyles, ...(introConfig.backgroundImageUrl && { backgroundImage: `url(${introConfig.backgroundImageUrl})` }), ...(introConfig.clickToContinue && { cursor: 'pointer' }) };
            return ( <div style={introStyle} onClick={introConfig.clickToContinue ? advanceFromIntro : undefined}> <h1 style={{ fontSize: '2.5em' }}>{introConfig.text}</h1> {introConfig.clickToContinue && ( <p style={{ marginTop: '20px', fontSize: '1rem', background: 'rgba(0,0,0,0.7)', padding: '5px 10px', borderRadius: '5px' }}> Click to continue </p> )} </div> );
        case 'title':
            return <div style={textStyles}><h1 style={{ fontSize: '3em', textTransform: 'uppercase' }}>{activeGameData?.name}</h1></div>;
        case 'controls':
             const skin = activeGameData?.skins?.[data.macrogame.category] ?? Object.values(activeGameData?.skins || {})[0];
             const description = skin?.description ?? 'Get ready!';
            return <div style={textStyles}><h2 style={{ fontSize: '1.5em' }}>{activeGameData?.controls}</h2><p style={{marginTop: '1rem'}}>{description}</p></div>;
        case 'result':
            return <div style={textStyles}><h1 style={{ fontSize: '100px', fontWeight: 'bold', color: result?.win ? '#2ecc71' : '#e74c3c' }}>{result?.win ? 'WIN!' : 'LOSE'}</h1></div>;
        case 'promo':
            const promoConfig = data.macrogame.promoScreen;
            const promoStyle: React.CSSProperties = { ...textStyles, ...(promoConfig.backgroundImageUrl && { backgroundImage: `url(${promoConfig.backgroundImageUrl})` }), ...(!promoConfig.backgroundImageUrl && { backgroundColor: '#1a1a2e' }), ...(promoConfig.clickToContinue && { cursor: 'pointer' }) };
            return ( <div style={promoStyle} onClick={promoConfig.clickToContinue ? advanceFromPromo : undefined}> <h1 style={{ fontSize: '2em', backgroundColor: 'rgba(0,0,0,0.5)', padding: '1rem' }}> {promoConfig.text} </h1> {promoConfig.clickToContinue && ( <p style={{ marginTop: '20px', fontSize: '1rem', background: 'rgba(0,0,0,0.7)', padding: '5px 10px', borderRadius: '5px' }}> Click to continue </p> )} </div> );
        case 'end':
            // If it's a single game preview, show the restart button.
            if (data.isPreviewMode === 'single_game') {
                return (
                    <div style={{...textStyles, justifyContent: 'center' }}>
                        <h2 style={{ margin: '0 0 20px', fontSize: '2em' }}>Preview Finished</h2>
                        <button onClick={handleRestart} style={{ padding: '10px 20px', background: '#4CAF50', color: 'white', border: 'none', fontFamily: 'inherit', fontSize: '1.2em', cursor: 'pointer', borderRadius: '6px' }}>
                            Play Again
                        </button>
                    </div>
                );
            }
            // If a conversion screen is linked, render our new host.
            if (activeConversionScreen) {
                return <ConversionScreenHost screen={activeConversionScreen} />;
            }
            // Fallback if no conversion screen is configured.
            return (
                <div style={{...textStyles, justifyContent: 'center' }}>
                    <h2>Game Over!</h2>
                    <p>(No conversion screen was configured)</p>
                    <button onClick={start} style={{ marginTop: '15px', padding: '10px', background: '#4CAF50', color: 'white', border: 'none' }}>
                        Play Again
                    </button>
                </div>
            );
        default: return null;
    }
}

// --- NEW PREVIEW HOST LOGIC ---

const PreviewHost: React.FC = () => {
    // Get all data collections from the central context
    const { macrogames, allConversionScreens, allConversionMethods, allMicrogames, customMicrogames } = useData();
    
    // State for the data loaded from localStorage and the resolved objects
    const [previewConfig, setPreviewConfig] = useState<{ macrogameId: string, skinId: string, popup?: Popup, isPreviewMode?: string } | null>(null);
    const [activeMacrogame, setActiveMacrogame] = useState<Macrogame | null>(null);
    const [activeSkin, setActiveSkin] = useState<UISkin | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const engine = useMacroGameEngine(activeMacrogame, allConversionScreens, allConversionMethods);
    
    // Step 1: On component mount, load the basic config from localStorage
    useEffect(() => {
        try {
            const rawData = localStorage.getItem('macrogame_preview_data');
            if (!rawData) throw new Error("No preview data found.");
            setPreviewConfig(JSON.parse(rawData));
        } catch (e: any) {
            setError(e.message);
        }
    }, []);

    // Step 2: When the config is loaded AND the data from the context is ready, find the specific objects we need
    useEffect(() => {
        // Ensure we have the necessary data to proceed
        if (previewConfig && macrogames.length > 0 && allMicrogames.length > 0) {
            const foundMacrogame = macrogames.find(m => m.id === previewConfig.macrogameId);
            const foundSkin = UI_SKINS.find(s => s.id === previewConfig.skinId);

            if (!foundMacrogame) {
                setError(`Could not find Macrogame with ID: ${previewConfig.macrogameId}`);
                return;
            }
            if (!foundSkin) {
                setError(`Could not find Skin with ID: ${previewConfig.skinId}`);
                return;
            }

            // --- THE FIX IS HERE ---
            // Hydrate the simple flow with full microgame details.
            const flowWithDetails = foundMacrogame.flow.map(flowItem => {
                const baseGame = allMicrogames.find(mg => mg.id === flowItem.microgameId);
                if (!baseGame || baseGame.isActive === false) return null;

                // Logic for custom variants can be added back here later if needed
                const customVariant = flowItem.variantId ? customMicrogames.find(v => v.id === flowItem.variantId) : undefined;
                const skinDataObject = customVariant?.skinData || {};
                const customSkinData = Object.keys(skinDataObject).reduce((acc, key) => {
                    acc[key] = skinDataObject[key].url;
                    return acc;
                }, {} as {[key: string]: string});

                return { ...baseGame, customSkinData };
            }).filter((game): game is MicrogameData & { customSkinData: any } => !!game);

            // Create a new macrogame object with the hydrated flow
            const hydratedMacrogame = { ...foundMacrogame, flow: flowWithDetails };

            // Preload assets and then set the state
            preloadMicrogames(flowWithDetails.map(g => g.id))
                .then(() => {
                    setActiveMacrogame(hydratedMacrogame);
                    setActiveSkin(foundSkin);
                    setIsLoading(false); // Everything is ready
                });
        }
    }, [previewConfig, macrogames, allMicrogames, customMicrogames]);

    // Step 3: When the active macrogame is finally set, start the engine
    const hasStarted = useRef(false);
    useEffect(() => {
        if (activeMacrogame && !isLoading && !hasStarted.current) {
            engine.start();
            hasStarted.current = true;
        }
    }, [activeMacrogame, isLoading, engine]);
    
    const handleRestart = useCallback(() => { engine.start(); }, [engine]);

    if (error) { return <div className="preview-error"><h2>Preview Error</h2><p>{error}</p></div>; }
    if (isLoading || !activeMacrogame || !activeSkin) { return <div className="preview-error"><h2>Loading Preview...</h2></div>; }

    const SkinComponent = skinRegistry[activeSkin.id];
    if (!SkinComponent) { return <div className="preview-error"><h2>Error</h2><p>UI Skin "{activeSkin.name}" is not registered.</p></div>; }

    // --- This rendering logic is now much cleaner ---
    let content: React.ReactNode = null;
    if (engine.view === 'game' && engine.activeGameData) {
        const ActiveMicrogame = microgames[engine.activeGameData.id];
        const skinConfig = (engine.activeGameData as any).customSkinData || {};
        content = <ActiveMicrogame onEnd={engine.onGameEnd} skinConfig={skinConfig} gameData={engine.activeGameData} />;
    } else {
        const dataForStaticScreen = {
            macrogame: activeMacrogame,
            skin: activeSkin,
            isPreviewMode: previewConfig?.isPreviewMode,
            popup: { name: `${activeMacrogame.name} - Preview` } // Create a mock popup object
        };
        content = <StaticScreen {...engine} data={dataForStaticScreen} handleRestart={handleRestart} />;
    }

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}>
            <SkinComponent skin={activeSkin} isMuted={engine.isMuted} onClose={() => window.close()} onMute={engine.toggleMute} title={previewConfig?.popup?.title} subtitle={previewConfig?.popup?.subtitle}>
                {content}
            </SkinComponent>
        </div>
    );
};

export default PreviewHost;