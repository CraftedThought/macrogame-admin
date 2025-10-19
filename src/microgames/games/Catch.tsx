import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MicrogameProps } from '../types';

// --- Constants ---
const PLAYER_SIZE = { width: 15, height: 5 };
const ITEM_SIZE = { width: 6, height: 10 };
const PLAYER_SPEED = 1.5;
const ITEM_FALL_SPEED = 0.8;
const GAME_DURATION = 10000;
const ITEM_SPAWN_INTERVAL = 900;
const REQUIRED_SCORE_TO_WIN = 5;
const BAD_ITEM_CHANCE = 0.3;

// --- Type Definitions ---
interface Item { id: number; x: number; y: number; isGood: boolean; }

// --- Main Component ---
const CatchGame: React.FC<MicrogameProps> = ({ onEnd, skinConfig, gameData }) => {
  const [playerX, setPlayerX] = useState<number>(50 - PLAYER_SIZE.width / 2);
  const [items, setItems] = useState<Item[]>([]);
  const [score, setScore] = useState(0);
  const [timerWidth, setTimerWidth] = useState(100);

  const gameLoopRef = useRef<number>();
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const isGameActive = useRef(true);
  const nextItemId = useRef(0);
  const scoreRef = useRef(score);
  useEffect(() => { scoreRef.current = score; }, [score]);

  const handleEndGame = useCallback((win: boolean) => {
    if (!isGameActive.current) return;
    isGameActive.current = false;
    cancelAnimationFrame(gameLoopRef.current!);
    onEnd({ win });
  }, [onEnd]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keysPressed.current[e.key.toLowerCase()] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp);
    
    const itemSpawner = setInterval(() => { if (!isGameActive.current) return; setItems(prevItems => [ ...prevItems, { id: nextItemId.current++, x: Math.random() * (100 - ITEM_SIZE.width), y: -ITEM_SIZE.height, isGood: Math.random() > BAD_ITEM_CHANCE, }, ]); }, ITEM_SPAWN_INTERVAL);
    const gameTimer = setTimeout(() => { handleEndGame(scoreRef.current >= REQUIRED_SCORE_TO_WIN); }, GAME_DURATION);
    const timerInterval = setInterval(() => { setTimerWidth(prev => Math.max(0, prev - (100 / (GAME_DURATION / 100)))); }, 100);
    
    return () => { clearTimeout(gameTimer); clearInterval(itemSpawner); clearInterval(timerInterval); window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); cancelAnimationFrame(gameLoopRef.current!); };
  }, [handleEndGame]);

  const runGameLoop = useCallback(() => {
    if (!isGameActive.current) return;

    setPlayerX(prevX => { let newX = prevX; if (keysPressed.current['a'] || keysPressed.current['arrowleft']) newX -= PLAYER_SPEED; if (keysPressed.current['d'] || keysPressed.current['arrowright']) newX += PLAYER_SPEED; return Math.max(0, Math.min(newX, 100 - PLAYER_SIZE.width)); });

    setItems(prevItems => {
      const updatedItems: Item[] = [];
      const playerRect = { x: playerX, y: 100 - PLAYER_SIZE.height, width: PLAYER_SIZE.width, height: PLAYER_SIZE.height };
      for (const item of prevItems) {
        const newItemY = item.y + ITEM_FALL_SPEED;
        const itemRect = { x: item.x, y: newItemY, width: ITEM_SIZE.width, height: ITEM_SIZE.height };
        const collided = playerRect.x < itemRect.x + itemRect.width && playerRect.x + playerRect.width > itemRect.x && playerRect.y < itemRect.y + itemRect.height && playerRect.y + playerRect.height > itemRect.y;
        if (collided) { if (item.isGood) { setScore(s => s + 1); } else { handleEndGame(false); } continue; }
        if (newItemY < 100) { updatedItems.push({ ...item, y: newItemY }); }
      }
      return updatedItems;
    });

    gameLoopRef.current = requestAnimationFrame(runGameLoop);
  }, [playerX, handleEndGame]);

  useEffect(() => {
    gameLoopRef.current = requestAnimationFrame(runGameLoop);
    return () => cancelAnimationFrame(gameLoopRef.current!);
  }, [runGameLoop]);

  const gameAreaStyle = skinConfig.background ? { ...styles.gameArea, backgroundImage: `url(${skinConfig.background})` } : styles.gameArea;

  return (
    <div style={gameAreaStyle}>
      <div style={styles.scoreDisplay}>SCORE: {score} / {REQUIRED_SCORE_TO_WIN}</div>

      <div style={{ ...styles.gameObject, ...styles.player, left: `${playerX}%` }}>
        {skinConfig.player ? <img src={skinConfig.player} style={styles.skinnedObject} alt="Player" /> : <div style={styles.playerPlaceholder} />}
      </div>

      {items.map(item => (
        <div key={item.id} style={{ ...styles.gameObject, ...styles.item, left: `${item.x}%`, top: `${item.y}%` }}>
          {item.isGood ? (
            skinConfig.goodItem ? <img src={skinConfig.goodItem} style={styles.skinnedObject} alt="Good Item" /> : <div style={styles.goodItemPlaceholder} />
          ) : (
            skinConfig.badItem ? <img src={skinConfig.badItem} style={styles.skinnedObject} alt="Bad Item" /> : <div style={styles.badItemPlaceholder} />
          )}
        </div>
      ))}

      <div style={styles.timerContainer}><div style={{ ...styles.timerBar, width: `${timerWidth}%` }} /></div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  gameArea: { width: '100%', height: '100%', backgroundColor: '#2c3e50', position: 'relative', overflow: 'hidden', fontFamily: 'inherit', backgroundSize: 'cover', backgroundPosition: 'center' },
  scoreDisplay: { position: 'absolute', top: '10px', left: '10px', color: 'white', fontSize: '1.5em', fontWeight: 'bold', textShadow: '2px 2px 4px rgba(0,0,0,0.5)', zIndex: 10 },
  gameObject: { position: 'absolute', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  player: { bottom: '0%', width: `${PLAYER_SIZE.width}%`, height: `${PLAYER_SIZE.height}%` },
  playerPlaceholder: { width: '100%', height: '100%', backgroundColor: '#ecf0f1' },
  item: { width: `${ITEM_SIZE.width}%`, height: `${ITEM_SIZE.height}%` },
  goodItemPlaceholder: { width: '100%', height: '100%', backgroundColor: '#45a049' },
  badItemPlaceholder: { width: '100%', height: '100%', backgroundColor: '#f44336' },
  skinnedObject: { width: '100%', height: '100%', objectFit: 'contain', userSelect: 'none' },
  timerContainer: { position: 'absolute', bottom: 0, left: 0, width: '100%', height: '8px', backgroundColor: 'rgba(0,0,0,0.3)' },
  timerBar: { height: '100%', backgroundColor: '#3498db', transition: 'width 0.1s linear' }
};

export default CatchGame;