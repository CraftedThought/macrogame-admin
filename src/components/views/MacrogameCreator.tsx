// src/components/views/MacrogameCreator.tsx

import React, { useState } from 'react';
import { styles } from '../../App.styles';
import { Macrogame, CurrentPage } from '../../types';
import { useData } from '../../context/DataContext';
import { MacrogameForm } from './MacrogameForm';

interface MacrogameCreatorProps {
    setCurrentPage: React.Dispatch<React.SetStateAction<CurrentPage>>;
    onLaunchWizard: () => void; // <-- ADDED PROP
}

export const MacrogameCreator: React.FC<MacrogameCreatorProps> = ({ setCurrentPage, onLaunchWizard }) => {
    const { macrogames, createMacrogame } = useData();
    
    const [listPage, setListPage] = useState(1);
    const ITEMS_PER_PAGE = 5;

    const handleSave = async (newMacrogame: Omit<Macrogame, 'id' | 'type'> & { id: string | null }) => {
        await createMacrogame(newMacrogame);
        alert('Macrogame created successfully!');
    };

    const sortedMacrogames = [...macrogames].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const totalPages = Math.ceil(sortedMacrogames.length / ITEMS_PER_PAGE);
    const paginatedMacrogames = sortedMacrogames.slice((listPage - 1) * ITEMS_PER_PAGE, (listPage - 1) * ITEMS_PER_PAGE + ITEMS_PER_PAGE);

    return (
        <>
            {/* --- NEW WIZARD LAUNCHER SECTION --- */}
            <div style={{...styles.creatorSection, marginBottom: '2rem'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div>
                        <h2 style={{...styles.h2, marginBottom: '0.5rem'}}>Macrogame Wizard</h2>
                        <p style={styles.descriptionText}>Need help getting started? Use the wizard to generate a macrogame based on your goals.</p>
                    </div>
                    <button onClick={onLaunchWizard} style={styles.createButton}>Launch Wizard</button>
                </div>
            </div>
            {/* --- END NEW SECTION --- */}

            <MacrogameForm onSave={handleSave} setCurrentPage={setCurrentPage} />

            <div>
                <div style={styles.managerHeader}>
                    <h2 style={styles.h2}>Recently Created Macrogames</h2>
                    <button onClick={() => setCurrentPage({ page: 'manager' })} style={styles.secondaryButton}>Manage All</button>
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
            <div style={{ height: '50vh' }}></div>
        </>
    );
};