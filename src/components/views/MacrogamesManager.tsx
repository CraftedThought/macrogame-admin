// src/components/views/MacrogamesManager.tsx

import React, { useState } from 'react';
import { styles } from '../../App.styles';
import { Macrogame } from '../../types';
import { useData } from '../../context/DataContext'; // <-- IMPORT HOOK

interface MacrogamesManagerProps {
    handleDeployMacrogame: (macrogame: Macrogame) => Promise<void>;
    handleEditMacrogame: (macrogame: Macrogame) => void;
}

export const MacrogamesManager: React.FC<MacrogamesManagerProps> = ({ handleDeployMacrogame, handleEditMacrogame }) => {
    // Get data and data-related functions from the hook
    const { macrogames, deleteMacrogame, duplicateMacrogame } = useData();
    
    const [searchTerm, setSearchTerm] = useState('');
    const filteredGames = macrogames.filter(game => game.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div style={styles.creatorSection}>
            <div style={styles.managerHeader}>
                <h2 style={styles.h2}>Macrogames</h2>
                <input type="text" placeholder="Search macrogames..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={styles.input} />
            </div>
            <div style={styles.managerList}>
                {filteredGames.map(game => (
                    <div key={game.id} style={styles.listItem}>
                        <div><strong>{game.name}</strong></div>
                        <div style={styles.managerActions}>
                            <span style={styles.tag}>#{game.category}</span>
                            <span>{game.flow?.length || 0} microgames</span>
                            <button onClick={() => handleDeployMacrogame(game)} style={styles.publishButton}>Deploy</button>
                            <button onClick={() => duplicateMacrogame(game)} style={styles.editButton}>Duplicate</button>
                            <button onClick={() => handleEditMacrogame(game)} style={styles.editButton}>Edit</button>
                            <button onClick={() => deleteMacrogame(game.id)} style={styles.deleteButton}>Delete</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};