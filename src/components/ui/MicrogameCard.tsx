// src/components/ui/MicrogameCard.tsx

import React, { useState, useMemo } from 'react';
import { styles } from '../../App.styles';
import { Microgame, CustomMicrogame } from '../../types';

type CardContext = 'creator' | 'library';

interface MicrogameCardProps {
    game: Microgame;
    isExpanded: boolean;
    onExpand: () => void;
    context: CardContext;
    // For 'creator' context
    onSelect?: (baseGame: Microgame, customVariant?: CustomMicrogame) => void;
    customMicrogames?: CustomMicrogame[];
    macrogameFlow?: { baseGame: Microgame; customVariant?: CustomMicrogame }[]; // New prop
    // For 'library' context
    onToggleFavorite?: () => void;
    onPreview?: () => void;
    onCustomize?: () => void;
}

const StarIcon: React.FC<{ isFavorite: boolean; isReadOnly?: boolean }> = ({ isFavorite, isReadOnly }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24"
         fill={isFavorite ? '#ffc107' : 'none'}
         stroke={isFavorite ? '#ffc107' : 'currentColor'}
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
         style={{ cursor: isReadOnly ? 'default' : 'pointer', color: '#606770' }}>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>
);

export const MicrogameCard: React.FC<MicrogameCardProps> = (props) => {
    const { game, isExpanded, onExpand, context, macrogameFlow = [] } = props;
    const variants = props.customMicrogames?.filter(v => v.baseMicrogameId === game.id) || [];
    const [selectedVariantId, setSelectedVariantId] = useState<string>('base');

    // Check if the current game/variant selection is already in the flow
    const isAdded = useMemo(() => {
        return macrogameFlow.some(flowItem => 
            flowItem.baseGame.id === game.id &&
            (selectedVariantId === 'base' ? !flowItem.customVariant : flowItem.customVariant?.id === selectedVariantId)
        );
    }, [macrogameFlow, selectedVariantId, game.id]);

    const handleAdd = () => {
        if (isAdded) return; // Prevent adding if already added
        if (selectedVariantId === 'base') {
            props.onSelect?.(game);
        } else {
            const selectedVariant = variants.find(v => v.id === selectedVariantId);
            if (selectedVariant) {
                props.onSelect?.(game, selectedVariant);
            }
        }
    };
    
    const cardContent = (
        <div style={{ padding: '1rem' }}>
            <div style={styles.cardHeader}>
                <span>{game.name}</span>
                <button style={styles.accordionButton} onClick={(e) => { e.stopPropagation(); onExpand(); }}>{isExpanded ? '▲' : '▼'}</button>
            </div>
            {isExpanded && (
                <div style={styles.cardDetails}>
                    <p><strong>Mechanic:</strong> {game.baseType}</p>
                    <p><strong>Controls:</strong> {game.controls}</p>
                    <p><strong>Length:</strong> {game.length}s</p>
                </div>
            )}
        </div>
    );

    if (context === 'creator') {
        return (
            <div style={styles.card}>
                {cardContent}
                <div style={{...styles.cardVariantSelector, padding: '0 1rem 1rem 1rem'}}>
                    {variants.length > 0 && (
                        <select
                            value={selectedVariantId}
                            onChange={(e) => setSelectedVariantId(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            style={styles.variantDropdown}
                        >
                            <option value="base">Base Game</option>
                            {variants.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                    )}
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleAdd(); }} 
                        style={isAdded ? styles.cardAddButtonAdded : styles.cardAddButton}
                        disabled={isAdded}
                    >
                        {isAdded ? 'Added' : 'Add'}
                    </button>
                </div>
                <div style={{...styles.cardActions, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button onClick={props.onPreview} style={styles.editButton}>Preview</button>
                    {game.isFavorite && <StarIcon isFavorite={true} isReadOnly={true} />}
                </div>
            </div>
        );
    }

    // Default to 'library' context
    return (
        <div style={styles.cardWithActions}>
            {cardContent}
            <div style={{...styles.cardActions, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <button onClick={props.onPreview} style={{...styles.editButton, marginRight: '0.5rem'}}>Preview</button>
                    <button onClick={props.onCustomize} style={styles.editButton}>Customize</button>
                </div>
                <button onClick={props.onToggleFavorite} style={{ background: 'none', border: 'none', padding: 0 }}>
                    <StarIcon isFavorite={!!game.isFavorite} />
                </button>
            </div>
        </div>
    );
};