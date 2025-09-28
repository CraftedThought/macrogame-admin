// src/components/ui/Modal.tsx

import React, { ReactNode, useEffect } from 'react';
import { styles } from '../../App.styles';

// --- [FIX APPLIED] ---
// Module-level variables to track open modals and original body style.
// This ensures that multiple modals don't conflict with each other.
let openModalCount = 0;
let originalBodyOverflow: string | null = null;

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    footer?: ReactNode;
    size?: 'small' | 'medium' | 'large';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, size = 'small' }) => {
    useEffect(() => {
        if (isOpen) {
            // If this is the first modal to open, capture the original style and hide scrollbar.
            if (openModalCount === 0) {
                originalBodyOverflow = window.getComputedStyle(document.body).overflow;
                document.body.style.overflow = 'hidden';
            }
            openModalCount++;
        }

        // The cleanup function runs when the modal closes (isOpen becomes false) or unmounts.
        return () => {
            if (isOpen) { // This ensures we only decrement if it was previously open
                openModalCount--;
                // If this was the last modal to close, restore the original body style.
                if (openModalCount === 0) {
                    document.body.style.overflow = originalBodyOverflow || '';
                    originalBodyOverflow = null;
                }
            }
        };
    }, [isOpen]); // Only re-run the effect if isOpen changes
    
    if (!isOpen) {
        return null;
    }

    const getSizeStyle = () => {
        switch (size) {
            case 'large':
                return styles.modalContentLarge;
            case 'medium':
                return styles.modalContentMedium;
            case 'small':
            default:
                return styles.modalContent;
        }
    };

    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={getSizeStyle()} onClick={e => e.stopPropagation()}>
                <div style={styles.modalHeader}>
                    <h2 style={{...styles.h2, margin: 0, fontSize: '1.5rem'}}>{title}</h2>
                    <button onClick={onClose} style={styles.modalCloseButton}>&times;</button>
                </div>
                <div style={styles.modalBody}>
                    {children}
                </div>
                {footer && (
                    <div style={styles.modalFooter}>
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};