// src/components/views/MacrogameCreator.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { styles } from '../../App.styles';
import { Macrogame, Microgame } from '../../types';
import { useData } from '../../hooks/useData';
import { MacrogameForm } from './MacrogameForm';

interface MacrogameCreatorProps {
    onLaunchWizard: (data: object) => void;
    flowFromWizard: Microgame[] | null;
    onClearWizardFlow: () => void;
}

export const MacrogameCreator: React.FC<MacrogameCreatorProps> = ({ onLaunchWizard, flowFromWizard, onClearWizardFlow }) => {
    const navigate = useNavigate();
    const { macrogames, createMacrogame } = useData();
    const [formKey, setFormKey] = useState(0);
    const [listPage, setListPage] = useState(1);
    const ITEMS_PER_PAGE = 5;

    const handleSave = async (newMacrogame: Omit<Macrogame, 'id' | 'type'> & { id: string | null }) => {
        await createMacrogame(newMacrogame);
        setFormKey(prevKey => prevKey + 1);
    };

    const sortedMacrogames = [...macrogames].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const totalPages = Math.ceil(sortedMacrogames.length / ITEMS_PER_PAGE);
    const paginatedMacrogames = sortedMacrogames.slice((listPage - 1) * ITEMS_PER_PAGE, (listPage - 1) * ITEMS_PER_PAGE + ITEMS_PER_PAGE);

    return (
        <>
            <MacrogameForm key={formKey} onSave={handleSave} onLaunchWizard={onLaunchWizard} flowFromWizard={flowFromWizard} onClearWizardFlow={onClearWizardFlow} />
            <div>
                <div style={styles.managerHeader}>
                    <h2 style={styles.h2}>Recently Created Macrogames</h2>
                    <button onClick={() => navigate('/manager')} style={styles.secondaryButton}>Manage All</button>
                </div>
                {paginatedMacrogames.map(game => (
                    <div key={game.id} style={styles.listItem}>
                        <div><strong>{game.name}</strong></div>
                        <div style={styles.listItemRight}>
                            <span style={styles.tag}>#{game.category}</span>
                            <span>{game.flow?.length || 0} microgames</span>
                        </div>
                    </div>
                ))}
                {totalPages > 1 && (
                    <div style={styles.paginationContainer}>
                        <button onClick={() => setListPage(p => p - 1)} disabled={listPage === 1} style={styles.paginationButton}>Previous</button>
                        <span style={styles.paginationText}>Page {listPage} of {totalPages}</span>
                        <button onClick={() => setListPage(p => p + 1)} disabled={listPage === totalPages} style={styles.paginationButton}>Next</button>
                    </div>
                )}
            </div>
            <div style={{ height: '30px' }}></div>
        </>
    );
};