import React from 'react';
import { styles } from '../../App.styles';
import { Microgame, CustomMicrogame } from '../../types';

interface FlowCardProps {
    flowItem: { baseGame: Microgame; customVariant?: CustomMicrogame };
    index: number;
    onMove: (direction: 'up' | 'down') => void;
    onDuplicate: () => void;
    onRemove: () => void;
    isFirst: boolean;
    isLast: boolean;
}

export const FlowCard: React.FC<FlowCardProps> = ({ flowItem, index, onMove, onDuplicate, onRemove, isFirst, isLast }) => {
    const displayName = flowItem.customVariant ? `${flowItem.baseGame.name} (${flowItem.customVariant.name})` : flowItem.baseGame.name;
    return (
        <div style={{ ...styles.flowCard }}>
            <div style={styles.flowCardStep}>{index + 1}</div>
            <button title="Remove" onClick={onRemove} style={styles.flowCardRemoveButton}>&times;</button>
            <span>{displayName}</span>
            <div style={styles.flowCardActions}>
                <button title="Duplicate" onClick={onDuplicate} style={styles.flowCardButton}>❐</button>
                <button title="Move Up" disabled={isFirst} onClick={() => onMove('up')} style={styles.flowCardButton}>▲</button>
                <button title="Move Down" disabled={isLast} onClick={() => onMove('down')} style={styles.flowCardButton}>▼</button>
            </div>
        </div>
    );
};