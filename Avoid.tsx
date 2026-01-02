/* src/microgames/games/Avoid.tsx */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MicrogameProps } from '../types';

// --- Constants ---
const PLAYER_SIZE = { width: 7, height: 13 };
const OBSTACLE_SIZE = { width: 9, height: 17 };
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

const createInitialObstacles = (): Obstacle[] => [
    { id: 1, x: 5, y: 5, ...getRandomDirection(), speed: getRandomSpeed() },
    { id: 2, x: 95 - OBSTACLE_SIZE.width, y: 5, ...getRandomDirection(), speed: getRandomSpeed() },
    { id: 3, x: 5, y: 95 - OBSTACLE_SIZE.height, ...getRandomDirection(), speed: getRandomSpeed() },
    { id: 4, x: 95 - OBSTACLE_SIZE.width, y: 95 - OBSTACLE_SIZE.height, ...getRandomDirection(), speed: getRandomSpeed() },
];

// --- Main Component ---
const AvoidGame: React.FC<MicrogameProps> = ({ onEnd, onReportEvent, skinConfig, gameData, isOverlayVisible, onInteraction }) => {
  const [player, setPlayer] = useState<Position>({ x: 50 - PLAYER_SIZE.width / 2, y: 50 - PLAYER_SIZE.height / 2 });
  const [obstacles, setObstacles] = useState(createInitialObstacles);
  const [timerWidth, setTimerWidth] = useState(100);
  const [isPausedForOverlay, setIsPausedForOverlay] = useState(isOverlayVisible);

  const gameLoopRef = useRef<number>();
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const isGameActive = useRef(true);

  const handleEndGame = useCallback((win: boolean) => {
    if (!isGameActive.current) return;
    isGameActive.current = false;
    cancelAnimationFrame(gameLoopRef.current!);

    // --- NEW EVENT-BASED LOGIC ---
    if (win) {
      // Report the 'win' event for scoring
      onReportEvent && onReportEvent('win');
    } else {
      // Report the 'lose' event for scoring
      onReportEvent && onReportEvent('lose');
    }
    // --- END NEW LOGIC ---

    // Signal the engine that the game is over
    onEnd({ win });
  }, [onEnd, onReportEvent]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (isPausedForOverlay && onInteraction) {
            onInteraction(); // Signal the engine that the user has interacted
            setIsPausedForOverlay(false); // Hide the overlay
        }
        keysPressed.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.key.toLowerCase()] = false; };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let gameTimer: NodeJS.Timeout;
    let timerInterval: NodeJS.Timeout;

    if (!isPausedForOverlay) {
        gameTimer = setTimeout(() => handleEndGame(true), GAME_DURATION);
        timerInterval = setInterval(() => { setTimerWidth(prev => Math.max(0, prev - (100 / (GAME_DURATION / 100)))); }, 100);
    }

    return () => {
        clearTimeout(gameTimer);
        clearInterval(timerInterval);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [handleEndGame, isPausedForOverlay, onInteraction]);

  const runGameLoop = useCallback(() => {
    if (!isGameActive.current || isPausedForOverlay) return;

    // 1. Calculate next player position
    let nextPlayerX = player.x;
    let nextPlayerY = player.y;
    if (keysPressed.current['w'] || keysPressed.current['arrowup']) nextPlayerY -= PLAYER_SPEED;
    if (keysPressed.current['s'] || keysPressed.current['arrowdown']) nextPlayerY += PLAYER_SPEED;
    if (keysPressed.current['a'] || keysPressed.current['arrowleft']) nextPlayerX -= PLAYER_SPEED;
    if (keysPressed.current['d'] || keysPressed.current['arrowright']) nextPlayerX += PLAYER_SPEED;
    nextPlayerX = Math.max(0, Math.min(nextPlayerX, 100 - PLAYER_SIZE.width));
    nextPlayerY = Math.max(0, Math.min(nextPlayerY, 100 - PLAYER_SIZE.height));
    
    const playerRect = { x: nextPlayerX, y: nextPlayerY, width: PLAYER_SIZE.width, height: PLAYER_SIZE.height };

    // 2. Calculate next obstacle positions
    const updatedObstacles = obstacles.map(obs => {
        let { x, y, dx, dy, speed } = obs;
        x += dx * speed;
        y += dy * speed;

        if (x <= 0 || x >= 100 - OBSTACLE_SIZE.width) dx = -dx;
        if (y <= 0 || y >= 100 - OBSTACLE_SIZE.height) dy = -dy;

        x = Math.max(0, Math.min(x, 100 - OBSTACLE_SIZE.width));
        y = Math.max(0, Math.min(y, 100 - OBSTACLE_SIZE.height));

        return { ...obs, x, y, dx, dy, speed };
    });

    // 3. Check for collision
    for (const obs of updatedObstacles) {
        const obsRect = { x: obs.x, y: obs.y, width: OBSTACLE_SIZE.width, height: OBSTACLE_SIZE.height };
        if (playerRect.x < obsRect.x + obsRect.width && playerRect.x + playerRect.width > obsRect.x && playerRect.y < obsRect.y + obsRect.height && playerRect.y + playerRect.height > obsRect.y) {
            // 4. If collision, call handleEndGame and stop the loop
            handleEndGame(false);
            return; // Stop this frame
        }
    }

    // 5. If no collision, update state
    setPlayer({ x: nextPlayerX, y: nextPlayerY });
    setObstacles(updatedObstacles);

    // 6. Request next frame
    gameLoopRef.current = requestAnimationFrame(runGameLoop);
  }, [handleEndGame, isPausedForOverlay, player.x, player.y, obstacles]); // Add obstacles to dependency array

  useEffect(() => {
    // Only start the game loop if the game is not paused for the overlay.
    if (!isPausedForOverlay) {
      gameLoopRef.current = requestAnimationFrame(runGameLoop);
    }

    // The cleanup function will stop the animation frame if the component unmounts.
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [runGameLoop, isPausedForOverlay]); // Add isPausedForOverlay to the dependency array

  const gameAreaStyle = skinConfig.background ? { ...styles.gameArea, backgroundImage: `url(${skinConfig.background})` } : styles.gameArea;

  return (
    <div style={gameAreaStyle}>
      {isPausedForOverlay && (
        <div style={styles.overlay}>
            <h1>{gameData.name}</h1>
            <p>{gameData.controls}</p>
            <span>Press any key to start</span>
        </div>
      )}
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
  skinnedObject: { width: '100%', height: '100%', objectFit: 'cover', userSelect: 'none' },
  timerContainer: { position: 'absolute', bottom: 0, left: 0, width: '100%', height: '8px', backgroundColor: 'rgba(0,0,0,0.3)' },
  timerBar: { height: '100%', backgroundColor: '#4CAF50', transition: 'width 0.1s linear' },
  overlay: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)', color: 'white', zIndex: 10,
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      alignItems: 'center', textAlign: 'center', backdropFilter: 'blur(3px)',
      padding: '1rem',
  }
};

export default AvoidGame;