/* src/skins/components/ui/MacrogameChrome.tsx */

import React, { ReactNode } from 'react';

interface MacrogameChromeProps {
  showPoints: boolean;
  showProgress: boolean;
  totalScore: number;
  progressText: string;
  children: ReactNode;
}

export const MacrogameChrome: React.FC<MacrogameChromeProps> = ({
  showPoints,
  showProgress,
  totalScore,
  progressText,
  children,
}) => {
  const chromeStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    fontFamily: 'inherit', // Inherit the font from the skin
  };

  const headerStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4em', // Use 'em' to scale with the container's font size
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 1.5em',
    color: 'white',
    zIndex: 20, // Ensure it's on top of game content
    pointerEvents: 'none', // Allow clicks to pass through to the game
    textShadow: '1px 1px 3px rgba(0,0,0,0.7)',
  };

  const textElementStyle: React.CSSProperties = {
    fontSize: '1.2em',
    fontWeight: 'bold',
  };

  return (
    <div style={chromeStyle}>
      <div style={headerStyle}>
        {showPoints ? (
          <div style={textElementStyle}>Points: {totalScore}</div>
        ) : <div />}
        
        {showProgress && progressText ? (
          <div style={textElementStyle}>
            Progress: {progressText}
          </div>
        ) : <div />}
      </div>
      
      {/* This is where the actual game or static screen will be rendered */}
      {children}
    </div>
  );
};