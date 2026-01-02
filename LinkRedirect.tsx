/* src/components/conversions/LinkRedirect.tsx */

import React, { useEffect, useState, useRef } from 'react';
import { LinkRedirectMethod } from '../../types';
import { styles } from '../../App.styles';
import 'react-quill-new/dist/quill.snow.css'; // Import Quill Styles

interface LinkRedirectProps {
  method: LinkRedirectMethod;
  onSuccess: () => void;
  isPortrait?: boolean; // New Prop
}

export const LinkRedirect: React.FC<LinkRedirectProps> = ({ method, onSuccess, isPortrait = false }) => {
  const m = method as any; 
  const isAuto = m.redirectType === 'auto';
  
  const [timeLeft, setTimeLeft] = useState(m.autoRedirectDelay ?? 5);
  const hasTriggeredRef = useRef(false);

  // --- Helper: Empty String = 0 Logic ---
  const safeVal = (val: any, fallback: number) => {
      const num = Number(val);
      // If it's a valid number (including 0), use it. Otherwise use fallback.
      // Note: We set fallback to 0 for spacing so clearing the field removes the gap.
      return !isNaN(num) && val !== '' && val !== null && val !== undefined ? num : fallback;
  };

  // --- Styles ---
  // Fallback to 0 so empty inputs collapse the space completely
  const contentSpacing = safeVal(method.style?.spacing, 0);
  const buttonSpacing = safeVal(m.style?.buttonSpacing, 0);
  
  // Width logic (Structural, so fallback to 50 is safer than 0)
  const widthPercent = typeof m.style?.size === 'number' ? m.style.size : 50;
  const finalWidth = isPortrait ? '100%' : `${widthPercent}%`;
  
  const buttonColor = m.style?.buttonColor ?? '#1532c1';
  const buttonTextColor = m.style?.buttonTextColor ?? '#ffffff';
  // Retrieve autoCountdownColor from style (handled by Theme Merger)
  const countdownColor = m.style?.autoCountdownColor ?? '#ffffff'; 

  // --- UTM Logic ---
  const getUrlWithUtm = () => {
    if (!method.url) return '#';
    try {
      const url = new URL(method.url);
      if (method.utmEnabled) {
          url.searchParams.set('utm_source', 'macrogame_platform');
          url.searchParams.set('utm_medium', 'conversion_screen');
          url.searchParams.set('utm_campaign', 'MACROGAME_ID_123'); 
          url.searchParams.set('utm_content', 'SCREEN_ID_456');
      }
      return url.toString();
    } catch (error) {
        return '#';
    }
  };

  const handleManualClick = (e: React.MouseEvent) => {
      e.preventDefault(); 
      onSuccess();
  };

  useEffect(() => {
      setTimeLeft(m.autoRedirectDelay ?? 5);
      hasTriggeredRef.current = false; 
  }, [m.autoRedirectDelay, method]);

  useEffect(() => {
      if (!isAuto) return;
      if (timeLeft > 0) {
          const timer = setInterval(() => {
              setTimeLeft((prev: number) => Math.max(0, prev - 1));
          }, 1000);
          return () => clearInterval(timer);
      } else {
          if (!hasTriggeredRef.current) {
              hasTriggeredRef.current = true; 
              onSuccess();
          }
      }
  }, [isAuto, timeLeft, onSuccess]);

  const cssBlock = `
    /* Force reset padding and margins for Quill editor */
    .link-content-wrapper.ql-editor {
        height: auto !important;
        min-height: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
        line-height: 1.25;
        color: inherit;
    }
    
    /* Target all children to ensure no margins leak */
    .link-content-wrapper.ql-editor > * {
        margin-top: 0 !important;
        margin-bottom: 0 !important;
        padding-top: 0 !important;
        padding-bottom: 0 !important;
    }

    /* Standard Quill Resets */
    .link-content-wrapper.ql-editor h1,
    .link-content-wrapper.ql-editor h2,
    .link-content-wrapper.ql-editor h3,
    .link-content-wrapper.ql-editor h4,
    .link-content-wrapper.ql-editor p { 
        margin: 0; 
        padding: 0; 
    }
    .link-content-wrapper.ql-editor h1, .link-content-wrapper.ql-editor h2, .link-content-wrapper.ql-editor h3 { line-height: 1.1; }
    .link-content-wrapper.ql-editor h4 { font-size: 0.75em; font-weight: normal; }
    .link-content-wrapper.ql-editor ul, .link-content-wrapper.ql-editor ol { padding-left: 0 !important; margin-left: 0 !important; list-style-position: inside !important; }
    .link-content-wrapper.ql-editor li { padding: 0 !important; margin: 0 !important; }
  `;

  // --- UNIFIED RENDER ---
  const containerStyle: React.CSSProperties = {
    textAlign: 'left', 
    width: finalWidth,
    maxWidth: '100%', 
    margin: '0 auto',
    color: 'inherit',
    display: 'flex',
    flexDirection: 'column',
    gap: `${contentSpacing}px`, 
    alignItems: 'center' 
  };

  return (
    <div style={containerStyle}>
      <style>{cssBlock}</style>

      {/* 1. Countdown (Auto Mode Only) */}
      {isAuto && m.showCountdown && (
         <div style={{ 
              fontSize: '4rem', 
              fontWeight: 'bold', 
              lineHeight: 1,
              color: countdownColor 
         }}>
            {timeLeft}
         </div>
      )}

      {/* 2. Headline */}
      {method.headline && (
        <div 
            className="link-content-wrapper ql-editor" 
            style={{ width: '100%' }}
            dangerouslySetInnerHTML={{ __html: method.headline }} 
        />
      )}

      {/* 3. Body */}
      {method.subheadline && (
        <div 
            className="link-content-wrapper ql-editor" 
            style={{ width: '100%' }}
            dangerouslySetInnerHTML={{ __html: method.subheadline }} 
        />
      )}

      {/* 4. Button (Manual Mode Only) */}
      {!isAuto && (
          <div style={{ marginTop: 0, width: '100%' }}>
              <a
                href={getUrlWithUtm()}
                target={m.openInNewTab ? "_blank" : "_self"}
                rel="noopener noreferrer"
                onClick={handleManualClick}
                style={{ 
                    ...styles.saveButton, 
                    display: 'block', 
                    textDecoration: 'none', 
                    width: '100%', 
                    textAlign: 'center',
                    backgroundColor: buttonColor,
                    color: buttonTextColor,
                    border: 'none',
                    cursor: 'pointer'
                }}
              >
                {/* Update: Respect empty string to hide text in preview if field is cleared */}
                {(m.buttonText !== undefined && m.buttonText !== null && m.buttonText !== '') 
                    ? m.buttonText 
                    : (m.buttonText === '' ? '' : (method.buttonText || 'Continue'))
                }
              </a>
          </div>
      )}
    </div>
  );
};