import React, { ReactNode } from 'react';
import baseStyles from './ClassicHandheld.module.css';
import purpleStyles from './ClassicHandheld-purple.module.css';

// SVG icons encoded as data URIs to prevent broken links
const MUTE_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M3 9v6h4l5 5V4L7 9H3zm13.59 3L15 10.41 16.41 9 18 10.59 19.59 9 21 10.41 19.41 12 21 13.59 19.59 15 18 13.41 16.41 15 15 13.59z'/%3E%3C/svg%3E";
const UNMUTE_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z'/%3E%3C/svg%3E";

interface Props {
  children: ReactNode;
  isMuted: boolean;
  onClose: () => void;
  onMute: () => void;
  title?: string;
  subtitle?: string;
  colorScheme?: string;
}

const ClassicHandheldSkin: React.FC<Props> = ({ children, isMuted, onClose, onMute, title, subtitle, colorScheme }) => {
  const colorStyles = colorScheme === 'purple' ? purpleStyles : {};
  
  return (
    <div className={`${baseStyles.container} ${colorStyles.container || ''}`}>
      <h1 className={`${baseStyles.title} ${colorStyles.title || ''}`}>{title}</h1>
      
      <img src={`/assets/svgs/handheld-classic-accents${colorScheme === 'purple' ? '-purple' : ''}.svg`} className={baseStyles.accents} alt="" />
      <img src={`/assets/svgs/handheld-classic-dpad${colorScheme === 'purple' ? '-purple' : ''}.svg`} className={baseStyles.dpad} alt="D-pad graphic" />
      <img src={`/assets/svgs/handheld-classic-select-start${colorScheme === 'purple' ? '-purple' : ''}.svg`} className={baseStyles.selectStart} alt="Select/Start graphic" />
      <img src={`/assets/svgs/handheld-classic-ba-buttons${colorScheme === 'purple' ? '-purple' : ''}.svg`} className={baseStyles.baButtons} alt="B and A buttons" />

      <div className={`${baseStyles.screenTrimFrame} ${colorStyles.screenTrimFrame || ''}`} />
      
      <div className={baseStyles.gameArea}>
        {children}
      </div>

      <h2 className={`${baseStyles.subtitle} ${colorStyles.subtitle || ''}`}>{subtitle}</h2>

      <button onClick={onMute} className={baseStyles.muteButton} aria-label="Mute"><img src={isMuted ? MUTE_ICON : UNMUTE_ICON} alt="Mute" /></button>
      <button onClick={onClose} className={baseStyles.exitButton} aria-label="Close"><img src="/assets/svgs/handheld-classic-exit-button.svg" alt="Exit" /></button>
    </div>
  );
};

export default ClassicHandheldSkin;
