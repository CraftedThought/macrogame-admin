import React, { useEffect, useState, useRef } from 'react';
import { MacroGame } from './MacroGame';
import { mockPreviewConfig } from '../data/mock-config';
import type { PreviewConfig } from '../data/mock-config';

const PreviewPlayer: React.FC = () => {
    // The config is now strongly typed
    const [config] = useState<PreviewConfig>(mockPreviewConfig);
    const [error, setError] = useState<string>('');
    
    // Refs are typed to hold the specific element or class instance
    const gameAreaRef = useRef<HTMLDivElement | null>(null);
    const gameInstanceRef = useRef<MacroGame | null>(null);

    useEffect(() => {
        // Ensure the refs are current and an instance doesn't already exist
        if (config && gameAreaRef.current && !gameInstanceRef.current) {
            gameInstanceRef.current = new MacroGame(gameAreaRef.current, config);
            
            const gameInstance = gameInstanceRef.current;
            
            const startSequence = async () => {
                try {
                    // Start the game logic
                    await gameInstance.start();
                } catch (startError) {
                    console.error("Game failed to start:", startError);
                    setError('Could not start the game preview.');
                }
            };
            startSequence();
        }

        // Cleanup function to be run when the component unmounts
        return () => {
            if (gameInstanceRef.current) {
                gameInstanceRef.current.cleanup();
                gameInstanceRef.current = null;
            }
        };
    }, [config]); // Dependency array ensures this runs only once on mount

    const handleMute = () => {
        if (gameInstanceRef.current) {
            gameInstanceRef.current.toggleMute();
            // You could also update the button text/icon here if you add state for it
        }
    };

    if (error) {
        return <div style={styles.errorContainer}>{error}</div>;
    }

    if (!config) {
        return <div style={styles.loadingContainer}>Loading Preview...</div>;
    }

    return (
        <div style={styles.scrim}>
            <div style={styles.container}>
                <button style={styles.muteButton} onClick={handleMute}>🔊</button>
                <button style={styles.closeButton} onClick={() => window.close()} />
                <div id="game-area" ref={gameAreaRef} style={styles.gameView}>
                    {/* The MacroGame class will populate this div */}
                </div>
            </div>
        </div>
    );
};

// Styles are now typed for better safety and autocompletion
const styles: { [key: string]: React.CSSProperties } = {
    errorContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '1.2rem',
        color: '#333'
    },
    loadingContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '1.2rem',
        color: '#333'
    },
    scrim: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 9999,
        backdropFilter: 'blur(3px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
    },
    container: {
        position: 'relative',
        width: '675px',
        height: '526px',
        background: 'url(/modal-bg.png)',
        backgroundSize: 'cover',
        fontFamily: "'Press Start 2P', cursive",
    },
    muteButton: {
        position: 'absolute',
        top: '7px',
        right: '54px',
        width: '33px',
        height: '33px',
        background: 'none',
        border: 'none',
        fontSize: '1.5rem',
        cursor: 'pointer',
        padding: 0,
        zIndex: 10001,
    },
    closeButton: {
        position: 'absolute',
        top: '7px',
        right: '11px',
        width: '33px',
        height: '33px',
        opacity: 0,
        cursor: 'pointer',
        zIndex: 10001,
        border: 'none',
        background: 'transparent',
    },
    gameView: {
        position: 'absolute',
        top: '93px',
        left: '65px',
        width: '545px',
        height: '265px',
        background: '#4a5c42',
        overflow: 'hidden',
        fontFamily: "'Press Start 2P', cursive",
    },
};

export default PreviewPlayer;
