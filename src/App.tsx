// src/App.tsx

import React, { useState } from 'react';
import { Macrogame, Microgame, Popup, CurrentPage, CustomMicrogame } from './types';
import { styles } from './App.styles';
import { useData } from './hooks/useData';

// Import components
import { Nav } from './components/views/Nav';
import { MacrogameCreator } from './components/views/MacrogameCreator';
import { MacrogamesManager } from './components/views/MacrogamesManager';
import { MicrogamesPage } from './components/views/MicrogamesPage';
import { DeliveryManager } from './components/views/DeliveryManager';
import { EditRewardModal } from './components/modals/EditRewardModal';
import { CampaignsManager } from './components/views/CampaignsManager';
import { ConversionsManagerPage } from './components/views/ConversionsManagerPage';
import { MacrogameForm } from './components/views/MacrogameForm';
import { Modal } from './components/ui/Modal';
import { PopupEditorModal } from './components/modals/PopupEditorModal';
import { MicrogameCustomizerModal } from './components/modals/MicrogameCustomizerModal';
import { MacrogameWizardModal } from './components/wizards/MacrogameWizardModal';

export default function App() {
    // UI state management
    const [currentPage, setCurrentPage] = useState<CurrentPage>({ page: 'creator' });
    const [editingMacrogame, setEditingMacrogame] = useState<Macrogame | null>(null);
    const [editingPopup, setEditingPopup] = useState<Popup | null>(null);
    const [customizingMicrogame, setCustomizingMicrogame] = useState<{ baseGame: Microgame, variant?: CustomMicrogame } | null>(null);
    const [wizardData, setWizardData] = useState<object | null>(null);
    const [flowFromWizard, setFlowFromWizard] = useState<Microgame[] | null>(null);

    const { macrogames, updateMacrogame, updatePopup, saveCustomMicrogame, createPopup } = useData();

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
            <MacrogameWizardModal 
                isOpen={!!wizardData} 
                onClose={() => setWizardData(null)}
                setCurrentPage={setCurrentPage}
                initialData={wizardData}
                onContinue={(newFlow) => {
                    setFlowFromWizard(newFlow);
                    setWizardData(null); // Close the modal
                }}
            />

            <Modal
                isOpen={!!editingMacrogame}
                onClose={() => setEditingMacrogame(null)}
                title="Edit Macrogame"
                size="large"
                footer={(
                    <>
                        <button type="button" onClick={() => setEditingMacrogame(null)} style={styles.secondaryButton}>Cancel</button>
                        {/* This button finds and clicks the hidden save button inside the form */}
                        <button type="button" onClick={() => document.getElementById('macrogame-form-save-button')?.click()} style={styles.saveButton}>Save Changes</button>
                    </>
                )}
            >
                {/* [FIX APPLIED] The MacrogameForm is now rendered unconditionally. 
                  Its internal useEffect hook will handle populating data when 'existingMacrogame' prop changes from null to a Macrogame object.
                  This avoids the expensive component mounting operation that was causing the scroll-lock race condition.
                */}
                <MacrogameForm
                    existingMacrogame={editingMacrogame}
                    onSave={handleUpdateAndCloseMacrogame}
                    setCurrentPage={setCurrentPage}
                    onLaunchWizard={(data) => setWizardData(data)}
                    flowFromWizard={flowFromWizard}
                    onClearWizardFlow={() => setFlowFromWizard(null)}
                />
            </Modal>
            <PopupEditorModal
                isOpen={!!editingPopup}
                onClose={() => setEditingPopup(null)}
                popup={editingPopup}
                onSave={updatePopup}
                macrogames={macrogames}
            />
            <MicrogameCustomizerModal
                microgame={customizingMicrogame?.baseGame || null}
                existingVariant={customizingMicrogame?.variant || null}
                onClose={() => setCustomizingMicrogame(null)}
                onSave={saveCustomMicrogame}
            />
            <header style={styles.header}>
                <h1>Macrogame Admin Portal</h1>
                <Nav currentPage={currentPage} setCurrentPage={setCurrentPage} />
            </header>
            <main style={styles.main}>
                {currentPage.page === 'creator' && <MacrogameCreator setCurrentPage={setCurrentPage} onLaunchWizard={(data) => setWizardData(data)} flowFromWizard={flowFromWizard} onClearWizardFlow={() => setFlowFromWizard(null)} />}
                {currentPage.page === 'manager' && <MacrogamesManager handleDeployMacrogame={handleDeployMacrogame} handleEditMacrogame={setEditingMacrogame} setCurrentPage={setCurrentPage} />}
                {currentPage.page === 'delivery' && <DeliveryManager handleEditPopup={setEditingPopup} />}
                {currentPage.page === 'campaigns' && <CampaignsManager />}
                {currentPage.page === 'microgames' && <MicrogamesPage onCustomize={setCustomizingMicrogame} />}
                {currentPage.page === 'conversions' && <ConversionsManagerPage />}
            </main>
        </div>
    );
}