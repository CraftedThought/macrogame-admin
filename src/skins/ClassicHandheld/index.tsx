import React, { ReactNode } from 'react';
import styles from './ClassicHandheld.module.css';

interface Props {
  children: ReactNode;
  gameAreaRef: React.RefObject<HTMLDivElement>;
}

const ClassicHandheldSkin: React.FC<Props> = ({ children, gameAreaRef }) => {
  return (
    <div className={styles.container}>
      {/* Decorative SVGs (Bottom Layer) */}
      <img src="/assets/svgs/handheld-classic-accents.svg" className={styles.accents} alt="" />
      <img src="/assets/svgs/handheld-classic-dpad.svg" className={styles.dpad} alt="D-pad graphic" />
      <img src="/assets/svgs/handheld-classic-select-start.svg" className={styles.selectStart} alt="Select and Start buttons graphic" />
      <img src="/assets/svgs/handheld-classic-ba-buttons.svg" className={styles.baButtons} alt="B and A buttons graphic" />

      {/* Game Area (Middle Layer) - Now correctly defined and styled here */}
      <div ref={gameAreaRef} className={styles.gameArea}>
        {children}
      </div>

      {/* SVG Frame with Cutout (Top Layer) */}
      <img 
        src="/assets/svgs/handheld-classic-trim-cutout.svg" 
        className={styles.screenTrimFrame} 
        alt="" 
      />
    </div>
  );
};

export default ClassicHandheldSkin;