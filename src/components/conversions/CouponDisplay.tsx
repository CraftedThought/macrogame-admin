// src/components/conversions/CouponDisplay.tsx

import React, { useState } from 'react';
import { CouponDisplayMethod } from '../../types';
import { styles } from '../../App.styles';

interface CouponDisplayProps {
  method: CouponDisplayMethod;
  onSuccess: () => void;
}

export const CouponDisplay: React.FC<CouponDisplayProps> = ({ method, onSuccess }) => {
  // isRevealed is false if clickToReveal is true, otherwise it's true.
  const [isRevealed, setIsRevealed] = useState(!method.clickToReveal);

  const handleRevealClick = () => {
    if (isRevealed) return; // Prevent re-triggering
    setIsRevealed(true);
    // Notify the parent that this action was completed
    onSuccess();
  };

  const containerStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '1rem',
    width: '100%',
    maxWidth: '400px',
    margin: '1rem auto'
  };

  const codeBoxStyle: React.CSSProperties = {
    border: '2px dashed #f1c40f',
    padding: '1rem',
    borderRadius: '8px',
    margin: '1rem 0',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: 'inherit',
    position: 'relative', // Needed for the overlay
    cursor: method.clickToReveal && !isRevealed ? 'pointer' : 'default',
  };

  const couponCodeStyle: React.CSSProperties = {
    background: 'rgba(0,0,0,0.5)',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    display: 'inline-block',
    letterSpacing: '2px',
    fontWeight: 'bold',
    marginTop: '0.5rem',
    color: '#fff'
  };

  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f1c40f',
    color: '#1c1e21',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    borderRadius: '6px', // Match the parent's border-radius
    opacity: isRevealed ? 0 : 1,
    transition: 'opacity 0.5s ease',
    pointerEvents: isRevealed ? 'none' : 'auto', // Make it unclickable after fading
  };

  return (
    <div style={containerStyle}>
      <div style={codeBoxStyle} onClick={method.clickToReveal ? handleRevealClick : undefined}>
        <h4 style={{ margin: 0, fontSize: '1.2em' }}>{method.headline}</h4>
        <p style={{ margin: '0.5rem 0' }}>{method.subheadline}</p>
        
        <div style={couponCodeStyle}>
          {method.staticCode}
        </div>
        
        {method.clickToReveal && (
          <div style={overlayStyle}>
            Click to Reveal Code
          </div>
        )}
      </div>
    </div>
  );
};