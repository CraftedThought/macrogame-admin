/* src/components/previews/StaticSkinPreview.tsx */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ConfigurablePopupSkin from '../../skins/ConfigurablePopup';
import { SkinConfig } from '../../types';

const POPUP_WIDTH_MAP: { [key: string]: number } = {
    'small': 450,
    'medium': 650, 
    'large': 800,
};

interface StaticSkinPreviewProps {
    skinId: string;
    skinConfig: SkinConfig;
}

export const StaticSkinPreview: React.FC<StaticSkinPreviewProps> = ({ skinId, skinConfig }) => {
    
    // --- NEW SCALING STATE AND REF ---
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const { styling } = skinConfig;
    const configuredWidth = styling?.popupWidth || 'medium';
    const IDEAL_WIDTH = POPUP_WIDTH_MAP[configuredWidth]; // Use configured width for parent size
    // --- END NEW SCALING STATE AND REF ---

    // If the selected skin is not the configurable one, we show a placeholder message.
    if (skinId !== 'configurable-popup') {
        return (
            <div style={{ 
                width: '100%', 
                height: '100%', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                backgroundColor: '#f8f9fa', 
                color: '#6c757d',
                borderRadius: '8px',
                border: '1px dashed #dee2e6',
                padding: '2rem',
                textAlign: 'center'
            }}>
                <p>Live preview is currently only available for the "Configurable Popup" skin.</p>
            </div>
        );
    }

    // --- NEW SCALING EFFECT ---
    const calculateScale = useCallback(() => {
        if (wrapperRef.current) {
            // Determine the width that the container *would* occupy at 1x scale
            const currentContainerIdealWidth = POPUP_WIDTH_MAP[configuredWidth];
            const availableWidth = wrapperRef.current.offsetWidth;
            
            // If the available width is less than the current container's ideal size, scale down.
            if (availableWidth < currentContainerIdealWidth) {
                setScale(availableWidth / currentContainerIdealWidth);
            } else {
                setScale(1); // Do not scale up past the max-width
            }
        }
    }, [configuredWidth, POPUP_WIDTH_MAP]);

    useEffect(() => {
        // Run once on mount and every time the window resizes
        calculateScale();
        window.addEventListener('resize', calculateScale);
        return () => window.removeEventListener('resize', calculateScale);
    }, [calculateScale, configuredWidth, POPUP_WIDTH_MAP]);
    // --- END NEW SCALING EFFECT ---

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* The wrapper sets the area for measurement */}
            <h4 style={{ margin: '0 0 1rem 0', color: '#666' }}>Live Skin Preview</h4>
            
            <div ref={wrapperRef} style={{ 
                flex: 1, 
                backgroundColor: '#e9ecef', 
                borderRadius: '8px',
                padding: '2rem',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center', 
                overflowY: 'auto'
            }}>
                {/* The skin component gets the calculated transform scale */}
                <div style={{
                    transform: `scale(${scale})`,
                    transformOrigin: 'top center', // Scale from the top-center point
                    // Ensures the scaling doesn't affect the size reported by wrapperRef
                    width: IDEAL_WIDTH, 
                    height: 'auto',
                }}> 
                    <ConfigurablePopupSkin
                        isMuted={false}
                        onClose={() => {}} // No-op for preview
                        onMute={() => {}}  // No-op for preview
                        skinConfig={skinConfig}
                    >
                        {/* This div represents the {children} (the game area) */}
                        <div style={{ 
                            width: '100%', 
                            height: '100%', 
                            backgroundColor: '#000', 
                            display: 'flex', 
                            justifyContent: 'center', 
                            alignItems: 'center',
                            color: '#333',
                            position: 'relative'
                        }}>
                             {/* A simple text to indicate the game area */}
                            <span style={{ color: '#555', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                16:9 Game Area
                            </span>
                        </div>
                    </ConfigurablePopupSkin>
                </div>
            </div>
        </div>
    );
};