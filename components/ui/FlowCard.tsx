// src/components/ui/FlowCard.tsx

import React from 'react';
import { styles } from '../../App.styles';
import { Microgame, CustomMicrogame } from '../../types';

interface FlowCardProps {
    flowItem: { baseGame: Microgame; customVariant?: CustomMicrogame; points?: number };
    index: number;
    onMove: (direction: 'up' | 'down') => void;
    onDuplicate: () => void;
    onRemove: () => void;
    isFirst: boolean;
    isLast: boolean;
    onPointsChange?: (newPoints: number) => void;
}

export const FlowCard: React.FC<FlowCardProps> = ({ flowItem, index, onMove, onDuplicate, onRemove, isFirst, isLast, onPointsChange = undefined }) => {
    const isArchived = flowItem.baseGame.isActive === false;
    const displayName = flowItem.customVariant ? `${flowItem.baseGame.name} (${flowItem.customVariant.name})` : flowItem.baseGame.name;
    
    const cardStyle = isArchived
        ? { ...styles.flowCard, ...styles.flowCardArchived }
        : styles.flowCard;

    return (
        <div style={cardStyle}>
            <div style={styles.flowCardStep}>{index + 1}</div>
            <button title="Remove" onClick={onRemove} style={styles.flowCardRemoveButton}>&times;</button>
            <span>{displayName}</span>
            {onPointsChange !== undefined && (
                <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                    <label htmlFor={`points-${index}`}>Points:</label>
                    <input
                        id={`points-${index}`}
                        type="number"
                        value={flowItem.points || 0}
                        onChange={(e) => {
                            if (onPointsChange) {
                                onPointsChange(parseInt(e.target.value, 10) || 0);
                            }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: '60px', padding: '0.2rem', border: '1px solid #ccc', borderRadius: '4px' }}
                    />
                </div>
            )}
            {isArchived && <span style={styles.archivedText}>(Archived)</span>}
            <div style={styles.flowCardActions}>
                <button title="Duplicate" onClick={onDuplicate} style={styles.flowCardButton}>❐</button>
                <button title="Move Up" disabled={isFirst} onClick={() => onMove('up')} style={styles.flowCardButton}>▲</button>
                <button title="Move Down" disabled={isLast} onClick={() => onMove('down')} style={styles.flowCardButton}>▼</button>
            </div>
        </div>
    );
};