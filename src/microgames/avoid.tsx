import React, { useEffect } from 'react';
import { MicrogameProps } from '../types';

const AvoidGame: React.FC<MicrogameProps> = ({ onEnd }) => {
  // useEffect handles the timer and its cleanup automatically when the component is unmounted.
  useEffect(() => {
    const timer = setTimeout(() => {
      // Signal that the game has ended with a random result
      onEnd({ win: Math.random() > 0.5 });
    }, 5000); // Game length

    // The return function from useEffect is the cleanup function.
    return () => clearTimeout(timer);
  }, [onEnd]); // The effect depends on the onEnd function

  const style: React.CSSProperties = {
    color: 'white',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    width: '100%',
    fontSize: '2rem',
    fontFamily: 'inherit', // Inherits the font from the skin
  };

  return <div style={style}>AVOID!</div>;
};

export default AvoidGame;