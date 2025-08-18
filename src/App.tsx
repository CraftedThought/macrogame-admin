// src/App.tsx

import React, { useState } from 'react';
import { Macrogame, Microgame, Popup, CurrentPage } from './types';
import { styles } from './App.styles';
import { useData } from './context/DataContext';

// Import components
import { Nav } from './components/views/Nav';
import { MacrogameCreator } from './components/views/MacrogameCreator';
import { MacrogamesManager } from './components/views/MacrogamesManager';
import { MicrogamesPage } from './components/views/MicrogamesPage';
import { PopupManager } from './components/views/PopupManager';
import { RewardsPage } from './components/views/RewardsPage';
import { MacrogameForm } from './components/views/MacrogameForm';
import { PopupEditorModal } from './components/modals/PopupEditorModal';
import { MicrogameCustomizerModal } from './components/modals/MicrogameCustomizerModal';
import { MacrogameWizardModal } from './components/wizards/MacrogameWizardModal'; // <-- IMPORT WIZARD

export default function App() {
    // UI state management
    const [currentPage, setCurrentPage] = useState<CurrentPage>({ page: 'creator' });
    const [editingMacrogame, setEditingMacrogame] = useState<Macrogame | null>(null);
    const [editingPopup, setEditingPopup] = useState<Popup | null>(null);
    const [customizingMicrogame, setCustomizingMicrogame] = useState<Microgame | null>(null);
    const [isWizardOpen, setIsWizardOpen] = useState(false); // <-- ADDED WIZARD STATE

    const { updateMacrogame, updatePopup, saveCustomMicrogame, createPopup } = useData();

    const handleDeployMacrogame = async (macrogame: Macrogame) => {
        const newPopup: Omit<Popup, 'id'> = {
            name: `${macrogame.name} Popup`, macrogameId: macrogame.id, macrogameName: macrogame.name, status: 'Draft',
            views: 0, engagements: 0, createdAt: new Date().toISOString()
        };
        try {
            await createPopup(newPopup);
            setCurrentPage({ page: 'popups' });
        } catch (error) { console.error("Error creating popup:", error); }
    };

    const handleUpdateAndCloseMacrogame = async (macrogame: Omit<Macrogame, 'id' | 'type'> & { id: string | null }) => {
        await updateMacrogame(macrogame);
        setEditingMacrogame(null);
    };

    return (
        <div style={styles.page}>
            {/* RENDER THE WIZARD MODAL */}
            <MacrogameWizardModal 
                isOpen={isWizardOpen} 
                onClose={() => setIsWizardOpen(false)}
                setCurrentPage={setCurrentPage}
            />

            {editingMacrogame && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContentLarge}>
                        <MacrogameForm
                            existingMacrogame={editingMacrogame}
                            onSave={handleUpdateAndCloseMacrogame}
                            onCancel={() => setEditingMacrogame(null)}
                            setCurrentPage={setCurrentPage}
                        />
                    </div>
                </div>
            )}
            <PopupEditorModal
                isOpen={!!editingPopup}
                onClose={() => setEditingPopup(null)}
                popup={editingPopup}
                onSave={updatePopup}
            />
            <MicrogameCustomizerModal
                microgame={customizingMicrogame}
                onClose={() => setCustomizingMicrogame(null)}
                onSave={saveCustomMicrogame}
            />
            <header style={styles.header}>
                <h1>Macrogame Admin Portal</h1>
                <Nav currentPage={currentPage} setCurrentPage={setCurrentPage} />
            </header>
            <main style={styles.main}>
                {currentPage.page === 'creator' && <MacrogameCreator setCurrentPage={setCurrentPage} onLaunchWizard={() => setIsWizardOpen(true)} />}
                {currentPage.page === 'manager' && <MacrogamesManager handleDeployMacrogame={handleDeployMacrogame} handleEditMacrogame={setEditingMacrogame} />}
                {currentPage.page === 'microgames' && <MicrogamesPage onCustomize={setCustomizingMicrogame} />}
                {currentPage.page === 'popups' && <PopupManager handleEditPopup={setEditingPopup} />}
                {currentPage.page === 'rewards' && <RewardsPage />}
            </main>
        </div>
    );
}