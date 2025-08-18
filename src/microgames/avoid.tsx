import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MicrogameProps } from '../types';

// --- Constants ---
const PLAYER_SIZE = { width: 12, height: 21 };
const OBSTACLE_SIZE = { width: 10.5, height: 18 };
const PLAYER_SPEED = 1.2;
const GAME_DURATION = 8000;
const MIN_OBSTACLE_SPEED = 0.2;
const MAX_OBSTACLE_SPEED = 0.4;

// --- Type Definitions ---
interface Position { x: number; y: number; }
interface Obstacle extends Position { id: number; dx: number; dy: number; speed: number; }

// --- Helper Functions ---
const getRandomSpeed = () => MIN_OBSTACLE_SPEED + Math.random() * (MAX_OBSTACLE_SPEED - MIN_OBSTACLE_SPEED);
const getRandomDirection = () => { const angle = Math.random() * 2 * Math.PI; return { dx: Math.cos(angle), dy: Math.sin(angle) }; };

// --- Main Component ---
const AvoidGame: React.FC<MicrogameProps> = ({ onEnd, skinConfig, gameData }) => {
  const [player, setPlayer] = useState<Position>({ x: 50 - PLAYER_SIZE.width / 2, y: 50 - PLAYER_SIZE.height / 2 });
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [timerWidth, setTimerWidth] = useState(100);

  const gameLoopRef = useRef<number>();
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const isGameActive = useRef(true);

  const handleEndGame = useCallback((win: boolean) => {
    if (!isGameActive.current) return;
    isGameActive.current = false;
    cancelAnimationFrame(gameLoopRef.current!);
    onEnd({ win });
  }, [onEnd]);

  useEffect(() => {
    const initialObstacles: Obstacle[] = [
      { id: 1, x: 5, y: 5, ...getRandomDirection(), speed: getRandomSpeed() },
      { id: 2, x: 95 - OBSTACLE_SIZE.width, y: 5, ...getRandomDirection(), speed: getRandomSpeed() },
      { id: 3, x: 5, y: 95 - OBSTACLE_SIZE.height, ...getRandomDirection(), speed: getRandomSpeed() },
      { id: 4, x: 95 - OBSTACLE_SIZE.width, y: 95 - OBSTACLE_SIZE.height, ...getRandomDirection(), speed: getRandomSpeed() },
    ];
    setObstacles(initialObstacles);

    const handleKeyDown = (e: KeyboardEvent) => { keysPressed.current[e.key.toLowerCase()] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp);
    const gameTimer = setTimeout(() => handleEndGame(true), GAME_DURATION);
    const timerInterval = setInterval(() => { setTimerWidth(prev => Math.max(0, prev - (100 / (GAME_DURATION / 100)))); }, 100);
    return () => { clearTimeout(gameTimer); clearInterval(timerInterval); window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); cancelAnimationFrame(gameLoopRef.current!); };
  }, [handleEndGame]);

  const runGameLoop = useCallback(() => {
    if (!isGameActive.current) return;

    setPlayer(prevPlayer => {
      let { x, y } = prevPlayer;
      if (keysPressed.current['w'] || keysPressed.current['arrowup']) y -= PLAYER_SPEED;
      if (keysPressed.current['s'] || keysPressed.current['arrowdown']) y += PLAYER_SPEED;
      if (keysPressed.current['a'] || keysPressed.current['arrowleft']) x -= PLAYER_SPEED;
      if (keysPressed.current['d'] || keysPressed.current['arrowright']) x += PLAYER_SPEED;
      x = Math.max(0, Math.min(x, 100 - PLAYER_SIZE.width));
      y = Math.max(0, Math.min(y, 100 - PLAYER_SIZE.height));
      return { x, y };
    });

    setObstacles(prevObstacles => {
      const updatedObstacles = prevObstacles.map(obs => {
        let { x, y, dx, dy, speed } = obs;
        x += dx * speed; y += dy * speed;
        if (x <= 0 || x >= 100 - OBSTACLE_SIZE.width || y <= 0 || y >= 100 - OBSTACLE_SIZE.height) {
            ({ dx, dy } = getRandomDirection());
            speed = getRandomSpeed();
            x = Math.max(0, Math.min(x, 100 - OBSTACLE_SIZE.width));
            y = Math.max(0, Math.min(y, 100 - OBSTACLE_SIZE.height));
        }
        return { ...obs, x, y, dx, dy, speed };
      });

      const playerRect = { x: player.x, y: player.y, width: PLAYER_SIZE.width, height: PLAYER_SIZE.height };
      for (const obs of updatedObstacles) {
        const obsRect = { x: obs.x, y: obs.y, width: OBSTACLE_SIZE.width, height: OBSTACLE_SIZE.height };
        if (playerRect.x < obsRect.x + obsRect.width && playerRect.x + playerRect.width > obsRect.x && playerRect.y < obsRect.y + obsRect.height && playerRect.y + playerRect.height > obsRect.y) {
          handleEndGame(false);
        }
      }
      return updatedObstacles;
    });

    gameLoopRef.current = requestAnimationFrame(runGameLoop);
  }, [player.x, player.y, handleEndGame]);

  useEffect(() => {
    gameLoopRef.current = requestAnimationFrame(runGameLoop);
    return () => cancelAnimationFrame(gameLoopRef.current!);
  }, [runGameLoop]);

  const gameAreaStyle = skinConfig.background ? { ...styles.gameArea, backgroundImage: `url(${skinConfig.background})` } : styles.gameArea;

  return (
    <div style={gameAreaStyle}>
      <div style={{ ...styles.gameObject, ...styles.player, left: `${player.x}%`, top: `${player.y}%` }}>
        {skinConfig.player ? <img src={skinConfig.player} style={styles.skinnedObject} alt="Player" /> : <div style={styles.playerPlaceholder} />}
      </div>

      {obstacles.map(obs => (
        <div key={obs.id} style={{ ...styles.gameObject, ...styles.obstacle, left: `${obs.x}%`, top: `${obs.y}%` }}>
          {skinConfig.obstacle ? <img src={skinConfig.obstacle} style={styles.skinnedObject} alt="Obstacle" /> : <div style={styles.obstaclePlaceholder} />}
        </div>
      ))}
      
      <div style={styles.timerContainer}><div style={{...styles.timerBar, width: `${timerWidth}%`}}/></div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  gameArea: { width: '100%', height: '100%', backgroundColor: '#1a1a2e', position: 'relative', overflow: 'hidden', fontFamily: 'inherit', backgroundSize: 'cover', backgroundPosition: 'center' },
  gameObject: { position: 'absolute', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  player: { width: `${PLAYER_SIZE.width}%`, height: `${PLAYER_SIZE.height}%` },
  playerPlaceholder: { width: '100%', height: '100%', backgroundColor: '#e94560' },
  obstacle: { width: `${OBSTACLE_SIZE.width}%`, height: `${OBSTACLE_SIZE.height}%` },
  obstaclePlaceholder: { width: '100%', height: '100%', backgroundColor: '#f0e3e3' },
  skinnedObject: { width: '100%', height: '100%', objectFit: 'contain', userSelect: 'none' },
  timerContainer: { position: 'absolute', bottom: 0, left: 0, width: '100%', height: '8px', backgroundColor: 'rgba(0,0,0,0.3)' },
  timerBar: { height: '100%', backgroundColor: '#4CAF50', transition: 'width 0.1s linear' }
};

export default AvoidGame;