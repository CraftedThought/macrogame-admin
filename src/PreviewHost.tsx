// src/PreviewHost.tsx

import React, { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { Popup, Macrogame, Reward, UISkin, Microgame as MicrogameData, MicrogameResult } from '../types';
import { useMacroGameEngine } from './hooks/useMacroGameEngine';
import { microgames } from './microgames';
import { preloadMicrogames } from './microgames/preloader'; // Import the new preloader
import ClassicHandheldSkin from './skins/ClassicHandheld';
import ModernHandheldSkin from './skins/ModernHandheld';
import TabletSkin from './skins/Tablet';
import BarebonesSkin from './skins/Barebones';

const skinRegistry: { [key: string]: React.FC<any> } = {
  'classic-handheld': ClassicHandheldSkin,
  'modern-handheld': ModernHandheldSkin,
  'tablet': TabletSkin,
  'barebones': BarebonesSkin,
};

const StaticScreen: React.FC<{
    view: string;
    data: any;
    activeGameData: MicrogameData | null;
    result: MicrogameResult | null;
    points: number;
    start: () => Promise<void>;
    advanceFromIntro: () => void;
    advanceFromPromo: () => void;
    handleRestart: () => void;
}> = ({ view, data, activeGameData, result, points, start, advanceFromIntro, advanceFromPromo, handleRestart }) => {
    const textStyles: React.CSSProperties = { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'white', textAlign: 'center', fontFamily: data.skin.fontFamily || 'sans-serif', textShadow: '3px 3px 3px rgba(0,0,0,0.5)', padding: '20px', boxSizing: 'border-box', backgroundSize: 'cover', backgroundPosition: 'center' };

    switch (view) {
        case 'intro':
            const introConfig = data.macrogame.introScreen;
            const introStyle = {
                ...textStyles,
                ...(introConfig.backgroundImageUrl && { backgroundImage: `url(${introConfig.backgroundImageUrl})` }),
                ...(introConfig.clickToContinue && { cursor: 'pointer' })
            };
            return (
                <div style={introStyle} onClick={introConfig.clickToContinue ? advanceFromIntro : undefined}>
                    <h1 style={{ fontSize: '2.5em' }}>{introConfig.text}</h1>
                    {introConfig.clickToContinue && (
                        <p style={{ marginTop: '20px', fontSize: '1rem', background: 'rgba(0,0,0,0.7)', padding: '5px 10px', borderRadius: '5px' }}>
                            Click to continue
                        </p>
                    )}
                </div>
            );
        case 'title':
            return <div style={textStyles}><h1 style={{ fontSize: '3em', textTransform: 'uppercase' }}>{activeGameData?.name}</h1></div>;
        case 'controls':
             const skin = activeGameData?.skins[data.macrogame.category] ?? Object.values(activeGameData?.skins || {})[0];
             const description = skin?.description ?? 'Get ready!';
            return <div style={textStyles}><h2 style={{ fontSize: '1.5em' }}>{activeGameData?.controls}</h2><p style={{marginTop: '1rem'}}>{description}</p></div>;
        case 'result':
            return <div style={textStyles}><h1 style={{ fontSize: '100px', fontWeight: 'bold', color: result?.win ? '#2ecc71' : '#e74c3c' }}>{result?.win ? 'WIN!' : 'LOSE'}</h1></div>;
        case 'promo':
            const promoConfig = data.macrogame.promoScreen;
            const promoStyle: React.CSSProperties = {
                ...textStyles,
                ...(promoConfig.backgroundImageUrl && { backgroundImage: `url(${promoConfig.backgroundImageUrl})` }),
                ...(!promoConfig.backgroundImageUrl && { backgroundColor: '#1a1a2e' }),
                ...(promoConfig.clickToContinue && { cursor: 'pointer' })
            };
            return (
                <div style={promoStyle} onClick={promoConfig.clickToContinue ? advanceFromPromo : undefined}>
                    <h1 style={{ fontSize: '2em', backgroundColor: 'rgba(0,0,0,0.5)', padding: '1rem' }}>
                        {promoConfig.text}
                    </h1>
                    {promoConfig.clickToContinue && (
                        <p style={{ marginTop: '20px', fontSize: '1rem', background: 'rgba(0,0,0,0.7)', padding: '5px 10px', borderRadius: '5px' }}>
                            Click to continue
                        </p>
                    )}
                </div>
            );
        case 'end':
             if (data.isPreviewMode === 'single_game') {
                 return (
                     <div style={{...textStyles, justifyContent: 'center' }}>
                         <h2 style={{ margin: '0 0 20px', fontSize: '2em' }}>Preview Finished</h2>
                         <button onClick={handleRestart} style={{ padding: '10px 20px', background: '#4CAF50', color: 'white', border: 'none', fontFamily: 'inherit', fontSize: '1.2em', cursor: 'pointer', borderRadius: '6px' }}>
                             Play Again
                         </button>
                     </div>
                 )
             }
             const linkedRewards = data.macrogame.rewards || []; const allRewardsData = data.rewards || [];
             const rewardsToShow = linkedRewards.map((linked: any) => ({ ...allRewardsData.find((r: any) => r.id === linked.rewardId), ...linked }));
             return (
                 <div style={{...textStyles, justifyContent: 'flex-start' }}>
                     <h2 style={{ margin: '0 0 10px', fontSize: '1.5em' }}>Game Over!</h2>
                     <p style={{ margin: '0 0 15px', color: '#FFD700' }}>Total Points: {points}</p>
                     <h3 style={{ margin: '0 0 10px', fontSize: '0.8em', alignSelf: 'flex-start' }}>Your Rewards:</h3>
                     <div style={{ flex: 1, overflowY: 'auto', width: '100%', textAlign: 'left' }}>
                         {rewardsToShow.length > 0 ? (
                             rewardsToShow.map((reward: any) => (
                                 <div key={reward.rewardId} style={{ padding: '10px', marginBottom: '8px', border: `2px solid ${points >= reward.pointsCost ? '#2ecc71' : '#6c3483'}`, borderRadius: '4px', background: 'rgba(255, 255, 255, 0.1)', opacity: points >= reward.pointsCost ? 1 : 0.6 }}>
                                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                         <strong style={{ fontSize: '1em', color: '#f1c40f' }}>{reward.name}</strong>
                                         <span style={{ background: '#6c3483', padding: '3px 8px', borderRadius: '4px', fontSize: '0.8em' }}>{reward.pointsCost} pts</span>
                                     </div>
                                 </div>
                             ))
                         ) : ( <p>No rewards available.</p> )}
                     </div>
                     <button onClick={start} style={{ marginTop: '15px', padding: '10px', background: '#4CAF50', color: 'white', border: 'none', fontFamily: 'inherit', fontSize: '1em', cursor: 'pointer', width: '100%' }}>Play Again</button>
                 </div>
             );
        default: return null;
    }
}

const PreviewHost: React.FC = () => {
  const [data, setData] = useState<{ popup: Popup, macrogame: Macrogame, rewards: Reward[], skin: UISkin, isPreviewMode?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPreloading, setIsPreloading] = useState(true); // New state for preloading
  const engine = useMacroGameEngine(data?.macrogame, data?.rewards);

  useEffect(() => {
    const initialize = async () => {
        try {
            const rawData = localStorage.getItem('macrogame_preview_data');
            if (!rawData) throw new Error("No preview data found.");
            
            const parsedData = JSON.parse(rawData);
            setData(parsedData);

            // Preload all necessary microgames before starting the engine
            if (parsedData.macrogame?.flow) {
                const gameIdsToLoad = parsedData.macrogame.flow.map((item: any) => item.id || item.microgameId);
                const uniqueGameIds = [...new Set(gameIdsToLoad)];
                await preloadMicrogames(uniqueGameIds);
            }
            setIsPreloading(false); // Preloading is done
        } catch (e: any) {
            setError(e.message);
            setIsPreloading(false);
        }
    };
    initialize();
  }, []);

  const hasStarted = useRef(false);
  useEffect(() => {
    // Start the engine only after data is loaded and preloading is finished
    if (data && !isPreloading && !hasStarted.current) {
      engine.start();
      hasStarted.current = true;
    }
  }, [data, isPreloading, engine]);

  const handleRestart = useCallback(() => {
      engine.start();
  }, [engine]);
  
  if (error) { return <div className="preview-error"><h2>Preview Error</h2><p>{error}</p></div>; }
  
  // Display a single loading screen during data fetching and preloading
  if (isPreloading || !data || (engine.view === 'loading' && !isPreloading)) { 
      return <div className="preview-error"><h2>Loading Preview...</h2></div>; 
  }
  
  const SkinComponent = skinRegistry[data.skin.id];
  if (!SkinComponent) { return <div className="preview-error"><h2>Error</h2><p>UI Skin "{data.skin.name}" is not registered.</p></div>; }

  let content: React.ReactNode = null;
  if (engine.view === 'game' && engine.activeGameData) {
      const ActiveMicrogame = microgames[engine.activeGameData.id];
      const skinConfig = (engine.activeGame-data as any).customSkinData || {};
      if (ActiveMicrogame) { 
        // No Suspense needed here anymore because we preloaded
        content = <ActiveMicrogame onEnd={engine.onGameEnd} skinConfig={skinConfig} gameData={engine.activeGameData} />;
      } else { content = <div>Error: Microgame "{engine.activeGameData.name}" not found.</div> }
  } else {
      content = <StaticScreen {...engine} data={data} handleRestart={handleRestart} />;
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}>
        <SkinComponent skin={data.skin} isMuted={engine.isMuted} onClose={() => window.close()} onMute={engine.toggleMute} title={data.popup.title} subtitle={data.popup.subtitle} colorScheme={data.popup.colorScheme}>
          {content}
        </SkinComponent>
    </div>
  );
};

export default PreviewHost;