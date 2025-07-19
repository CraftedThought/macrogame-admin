import React, { useEffect, useState, useRef } from 'react';
import { MacroGame } from './MacroGame.js';
// Import the mock configuration directly
import { mockPreviewConfig } from '../data/mock-config.js'; 

const PreviewPlayer = () => {
    // The config is now sourced from our mock file, not localStorage
    const [config, setConfig] = useState(mockPreviewConfig);
    const [error, setError] = useState('');
    const gameAreaRef = useRef(null);
    const gameInstanceRef = useRef(null);

    // This useEffect is now streamlined. It runs once when the component mounts.
    useEffect(() => {
        if (config && gameAreaRef.current && !gameInstanceRef.current) {
            gameInstanceRef.current = new MacroGame(gameAreaRef.current, config);
            
            const bgAudio = gameInstanceRef.current.bgAudio;
            const startSequence = async () => {
                try {
                    // Audio now requires user interaction to play, but we can attempt it.
                    await bgAudio.play();
                } catch (playError) {
                    console.warn("Audio autoplay was blocked by the browser.", playError);
                } finally {
                    // The game will start regardless of audio playback success.
                    await gameInstanceRef.current.start();
                }
            };
            startSequence();
        }

        // Cleanup function remains the same
        return () => {
            if (gameInstanceRef.current) {
                gameInstanceRef.current.cleanup();
                gameInstanceRef.current = null;
            }
        };
    }, [config]); // Dependency array ensures this runs only if config changes.


    if (error) {
        return <div style={styles.errorContainer}>{error}</div>;
    }

    if (!config) {
        return <div style={styles.loadingContainer}>Loading Preview...</div>;
    }

    // The component's rendered output remains unchanged
    return (
        <div style={styles.scrim}>
            <div style={styles.container}>
                <button
                    style={styles.muteButton}
                    onClick={() => gameInstanceRef.current?.toggleMute()}
                >
                    🔊
                </button>
                <button
                    style={styles.closeButton}
                    onClick={() => window.close()}
                />
                <div id="game-area" ref={gameAreaRef} style={styles.gameView}>
                    {/* The MacroGame class will populate this div */}
                </div>
            </div>
        </div>
    );
};

// Styles remain the same
const styles = {
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