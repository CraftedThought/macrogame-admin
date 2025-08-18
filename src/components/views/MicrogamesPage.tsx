// src/components/views/MicrogamesPage.tsx

import React, { useState } from 'react';
import { styles } from '../../App.styles';
import { Microgame } from '../../types';
import { useData } from '../../context/DataContext'; // <-- IMPORT HOOK
import { MicrogameCard } from '../ui/MicrogameCard';

interface MicrogamesPageProps {
    onCustomize: (microgame: Microgame) => void;
}

export const MicrogamesPage: React.FC<MicrogamesPageProps> = ({ onCustomize }) => {
    const { allMicrogames, customMicrogames } = useData(); // <-- GET DATA FROM HOOK
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedCard, setExpandedCard] = useState<string | null>(null);

    const filteredGames = allMicrogames.filter(game => game.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return (
        <div style={styles.creatorSection}>
            <div style={styles.managerHeader}>
                <h2 style={styles.h2}>Microgame Library</h2>
                <input type="text" placeholder="Search library..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={styles.input} />
            </div>
            <h3 style={styles.h3}>Base Microgames</h3>
            <p style={styles.descriptionText}>These are the core microgames available. Click "Customize" to create your own version with unique visuals.</p>
            <div style={styles.cardContainer}>
                {filteredGames.length > 0 ? (
                    filteredGames.map(game => (
                        <div key={game.id} style={styles.cardWithActions}>
                            <MicrogameCard game={game} isExpanded={expandedCard === game.id} onExpand={() => setExpandedCard(expandedCard === game.id ? null : game.id)} onSelect={() => { }} customMicrogames={[]} />
                            <div style={styles.cardActions}>
                                <button onClick={() => onCustomize(game)} style={styles.editButton}>Customize</button>
                            </div>
                        </div>
                    ))
                ) : (
                    <p>No microgames found.</p>
                )}
            </div>
            <h3 style={styles.h3}>Custom Microgames</h3>
            <p style={styles.descriptionText}>These are variants that you have created.</p>
            {customMicrogames.length > 0 ? (
                <div style={styles.managerList}>
                    {customMicrogames.map(game => (
                        <div key={game.id} style={styles.listItem}>
                            <div><strong>{game.name}</strong></div>
                            <div style={styles.managerActions}>
                                <span style={styles.tag}>Variant of: {allMicrogames.find(b => b.id === game.baseMicrogameId)?.name || 'Unknown'}</span>
                                <button onClick={() => { /* TODO: Open Modal for editing */ }} style={styles.editButton}>Edit</button>
                                <button onClick={() => { /* TODO: Add delete logic */ }} style={styles.deleteButton}>Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : <p>You haven't created any custom microgames yet.</p>}
        </div>
    );
};