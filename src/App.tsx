// src/App.tsx

import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { Macrogame, Microgame, Popup, CustomMicrogame } from './types';
import { styles } from './App.styles';
import { useData } from './hooks/useData';

// Import components
import { Nav } from './components/views/Nav';
import { MacrogameCreator } from './components/views/MacrogameCreator';
import { MacrogamesManager } from './components/views/MacrogamesManager';
import { MicrogamesPage } from './components/views/MicrogamesPage';
import { DeliveryManager } from './components/views/DeliveryManager';
import { CampaignsManager } from './components/views/CampaignsManager';
import { ConversionsManagerPage } from './components/views/ConversionsManagerPage';
import { MacrogameForm } from './components/views/MacrogameForm';
import { Modal } from './components/ui/Modal';
import { PopupEditorModal } from './components/modals/PopupEditorModal';
import { MicrogameCustomizerModal } from './components/modals/MicrogameCustomizerModal';
import { MacrogameWizardModal } from './components/wizards/MacrogameWizardModal';

export default function App() {
    const navigate = useNavigate();
    
    // UI state management for modals
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
            navigate('/delivery', { state: { defaultTab: 'Unconfigured' } });
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
                initialData={wizardData}
                onContinue={(newFlow) => {
                    setFlowFromWizard(newFlow);
                    setWizardData(null);
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
                        <button type="button" onClick={() => document.getElementById('macrogame-form-save-button')?.click()} style={styles.saveButton}>Save Changes</button>
                    </>
                )}
            >
                <MacrogameForm
                    existingMacrogame={editingMacrogame}
                    onSave={handleUpdateAndCloseMacrogame}
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
                <Nav />
            </header>
            
            <main style={styles.main}>
                <Routes>
                    <Route path="/" element={<Navigate to="/creator" replace />} />
                    <Route path="/creator" element={<MacrogameCreator onLaunchWizard={(data) => setWizardData(data)} flowFromWizard={flowFromWizard} onClearWizardFlow={() => setFlowFromWizard(null)} />} />
                    <Route path="/manager" element={<MacrogamesManager handleDeployMacrogame={handleDeployMacrogame} handleEditMacrogame={setEditingMacrogame} />} />
                    <Route path="/delivery" element={<DeliveryManager handleEditPopup={setEditingPopup} />} />
                    <Route path="/campaigns" element={<CampaignsManager />} />
                    <Route path="/microgames" element={<MicrogamesPage onCustomize={setCustomizingMicrogame} />} />
                    <Route path="/conversions" element={<ConversionsManagerPage />} />
                </Routes>
            </main>
            <Toaster position="bottom-center" />
        </div>
    );
}