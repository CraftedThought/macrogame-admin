import React, { ReactNode } from 'react';
import styles from './ModernHandheld.module.css';

// SVG icons encoded as data URIs
const MUTE_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M3 9v6h4l5 5V4L7 9H3zm13.59 3L15 10.41 16.41 9 18 10.59 19.59 9 21 10.41 19.41 12 21 13.59 19.59 15 18 13.41 16.41 15 15 13.59z'/%3E%3C/svg%3E";
const UNMUTE_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z'/%3E%3C/svg%3E";

interface Props {
  children: ReactNode;
  isMuted: boolean;
  onClose: () => void;
  onMute: () => void;
}

const ModernHandheldSkin: React.FC<Props> = ({ children, isMuted, onClose, onMute }) => {
  return (
    <div className={styles.container}>
      {/* Decorative SVGs */}
      <img src="/assets/svgs/handheld-modern-dpad.svg" className={styles.dpad} alt="D-pad graphic" />
      <img src="/assets/svgs/handheld-modern-select-start.svg" className={styles.selectStart} alt="Select and Start buttons graphic" />
      <img src="/assets/svgs/handheld-modern-buttons.svg" className={styles.buttons} alt="Action buttons graphic" />

      {/* Game Screen Trim */}
      <div className={styles.screenTrimFrame} />
      
      {/* Game Area */}
      <div className={styles.gameArea}>
        {children}
      </div>

      {/* Functional Buttons */}
      <button onClick={onMute} className={styles.muteButton} aria-label={isMuted ? 'Unmute' : 'Mute'}>
        <img src={isMuted ? MUTE_ICON : UNMUTE_ICON} alt="Mute/Unmute audio" />
      </button>
      <button onClick={onClose} className={styles.exitButton} aria-label="Close popup">
        <img src="/assets/svgs/handheld-classic-exit-button.svg" alt="Exit icon" />
      </button>
    </div>
  );
};

export default ModernHandheldSkin;