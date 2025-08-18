import React, { useState } from 'react';
import { styles } from '../../App.styles';
import { Microgame, CustomMicrogame } from '../../types';

interface MicrogameCardProps {
    game: Microgame;
    isExpanded: boolean;
    onExpand: () => void;
    onSelect: (baseGame: Microgame, customVariant?: CustomMicrogame) => void;
    customMicrogames: CustomMicrogame[];
}

export const MicrogameCard: React.FC<MicrogameCardProps> = ({ game, isExpanded, onExpand, onSelect, customMicrogames }) => {
    const variants = customMicrogames.filter(v => v.baseMicrogameId === game.id);
    const [selectedVariantId, setSelectedVariantId] = useState<string>('base');

    const handleAdd = () => {
        if (selectedVariantId === 'base') {
            onSelect(game);
        } else {
            const selectedVariant = variants.find(v => v.id === selectedVariantId);
            if (selectedVariant) {
                onSelect(game, selectedVariant);
            }
        }
    };

    return (
        <div style={styles.card}>
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
            <div style={styles.cardVariantSelector}>
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
                <button onClick={(e) => { e.stopPropagation(); handleAdd(); }} style={styles.cardAddButton}>
                    Add
                </button>
            </div>
        </div>
    );
};