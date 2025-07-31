import React, { useEffect, useState, useRef } from 'react';
import { Popup, Macrogame, Reward, UISkin, Microgame, MicrogameResult } from './types';
import { useMacroGameEngine } from './hooks/useMacroGameEngine';
import ClassicHandheldSkin from './skins/ClassicHandheld';

// --- Legacy PngSkin Component ---
// This component is now fully responsible for its own layout.
const LegacyPngSkin: React.FC<{ skin: UISkin, children: React.ReactNode, gameAreaRef: React.RefObject<HTMLDivElement> }> = ({ skin, children, gameAreaRef }) => {
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = skin.imageUrl;
    img.onload = () => setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => setDimensions({ width: 600, height: 500 }); 
  }, [skin.imageUrl]);

  if (!dimensions) return null; 

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: `${dimensions.width}px`,
    height: `${dimensions.height}px`,
    backgroundImage: `url(${skin.imageUrl})`,
    backgroundSize: '100% 100%',
  };
  
  const gameAreaStyle: React.CSSProperties = {
    position: 'absolute',
    top: `${skin.gameArea.top}px`,
    left: `${skin.gameArea.left}px`,
    width: `${skin.gameArea.width}px`,
    height: `${skin.gameArea.height}px`,
    overflow: 'hidden',
    background: 'black'
  };

  return (
    <div style={containerStyle}>
      <div ref={gameAreaRef} style={gameAreaStyle}>{children}</div>
    </div>
  );
};

// --- Skin Registry ---
const skinRegistry: { [key:string]: React.FC<any> } = {
  'gaming-retro': ClassicHandheldSkin,
};

// --- Game Screen Content Component ---
const GameScreenContent: React.FC<{
    view: string;
    data: any;
    activeGameData: Microgame | null;
    result: MicrogameResult | null;
    points: number;
    start: () => Promise<void>;
}> = ({ view, data, activeGameData, result, points, start }) => {
    const textStyles: React.CSSProperties = {
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center', color: 'white',
        textAlign: 'center', fontFamily: data.skin.fontFamily || 'sans-serif',
        textShadow: '3px 3px 3px rgba(0,0,0,0.5)', padding: '20px', boxSizing: 'border-box'
    };

    switch (view) {
        case 'intro':
            return <div style={textStyles}><h1 style={{ fontSize: '2.5em' }}>{data.macrogame.config.introScreenText}</h1></div>;
        case 'title':
            return <div style={textStyles}><h1 style={{ fontSize: '3em', textTransform: 'uppercase' }}>{activeGameData?.name}</h1></div>;
        case 'controls':
             const skin = activeGameData?.skins[data.macrogame.category] ?? Object.values(activeGameData?.skins || {})[0];
             const description = skin?.description ?? 'Get ready!';
            return <div style={textStyles}><h2 style={{ fontSize: '1.5em' }}>{activeGameData?.controls}</h2><p style={{marginTop: '1rem'}}>{description}</p></div>;
        case 'result':
            return <div style={textStyles}><h1 style={{ fontSize: '100px', fontWeight: 'bold', color: result?.win ? '#2ecc71' : '#e74c3c' }}>{result?.win ? 'WIN!' : 'LOSE'}</h1></div>;
        case 'end':
            const linkedRewards = data.macrogame.rewards || [];
            const allRewardsData = data.rewards || [];
            const rewardsToShow = linkedRewards.map((linked: any) => {
                const fullReward = allRewardsData.find((r: any) => r.id === linked.rewardId);
                return { ...fullReward, ...linked };
            });

            return (
                <div style={{...textStyles, justifyContent: 'flex-start' }}>
                    <h2 style={{ margin: '0 0 10px', fontSize: '1.5em' }}>Game Over!</h2>
                    <p style={{ margin: '0 0 15px', color: '#FFD700' }}>Total Points: {points}</p>
                    <h3 style={{ margin: '0 0 10px', fontSize: '0.8em', alignSelf: 'flex-start' }}>Your Rewards:</h3>
                    <div style={{ flex: 1, overflowY: 'auto', width: '100%', textAlign: 'left' }}>
                        {rewardsToShow.length > 0 ? (
                            rewardsToShow.map((reward: any) => (
                                <div key={reward.rewardId} style={{ 
                                    padding: '10px', marginBottom: '8px', 
                                    border: `2px solid ${points >= reward.pointsCost ? '#2ecc71' : '#6c3483'}`,
                                    borderRadius: '4px', background: 'rgba(255, 255, 255, 0.1)',
                                    opacity: points >= reward.pointsCost ? 1 : 0.6
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <strong style={{ fontSize: '1em', color: '#f1c40f' }}>{reward.name}</strong>
                                        <span style={{ background: '#6c3483', padding: '3px 8px', borderRadius: '4px', fontSize: '0.8em' }}>{reward.pointsCost} pts</span>
                                    </div>
                                </div>
                            ))
                        ) : ( <p>No rewards available.</p> )}
                    </div>
                    <button onClick={start} style={{ marginTop: '15px', padding: '10px', background: '#4CAF50', color: 'white', border: 'none', fontFamily: 'inherit', fontSize: '1em', cursor: 'pointer', width: '100%' }}>
                        Play Again
                    </button>
                </div>
            );
        case 'game':
        case 'loading':
        default:
            return null;
    }
}

// --- Main Preview Host Component ---
const PreviewHost: React.FC = () => {
  const [data, setData] = useState<{ popup: Popup, macrogame: Macrogame, rewards: Reward[], skin: UISkin } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  
  const engine = useMacroGameEngine(gameAreaRef, data?.macrogame, data?.rewards);

  useEffect(() => {
    try {
      const rawData = localStorage.getItem('macrogame_preview_data');
      if (!rawData) throw new Error("No preview data found.");
      setData(JSON.parse(rawData));
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    if (data) {
      engine.start();
    }
  }, [data, engine.start]);
  
  if (error) {
    return <div className="preview-error"><h2>Preview Error</h2><p>{error}</p></div>;
  }

  if (!data || !engine.view || engine.view === 'loading') {
    return null;
  }
  
  const SkinComponent = skinRegistry[data.skin.id] || LegacyPngSkin;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}>
        <SkinComponent skin={data.skin} gameAreaRef={gameAreaRef}>
          <GameScreenContent {...engine} data={data} />
        </SkinComponent>
    </div>
  );
};

export default PreviewHost;