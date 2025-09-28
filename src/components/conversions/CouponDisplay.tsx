// src/components/conversions/CouponDisplay.tsx

import React from 'react';
import { CouponDisplayMethod } from '../../types';
import { styles } from '../../App.styles'; // We'll borrow some basic styles

interface CouponDisplayProps {
  method: CouponDisplayMethod;
}

export const CouponDisplay: React.FC<CouponDisplayProps> = ({ method }) => {
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
    color: 'inherit'
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

  return (
    <div style={containerStyle}>
      <div style={codeBoxStyle}>
        <h4 style={{ margin: 0, fontSize: '1.2em' }}>{method.headline}</h4>
        <p style={{ margin: '0.5rem 0' }}>{method.subheadline}</p>
        <div style={couponCodeStyle}>
          {method.staticCode}
        </div>
      </div>
    </div>
  );
};