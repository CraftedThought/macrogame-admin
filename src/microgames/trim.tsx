import React, { useEffect } from 'react';
import { MicrogameProps } from '../types';

const TrimGame: React.FC<MicrogameProps> = ({ onEnd }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onEnd({ win: Math.random() > 0.5 });
    }, 5000);

    return () => clearTimeout(timer);
  }, [onEnd]);

  const style: React.CSSProperties = {
    color: 'white',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    width: '100%',
    fontSize: '2rem',
    fontFamily: 'inherit',
  };

  return <div style={style}>TRIM!</div>;
};

export default TrimGame;