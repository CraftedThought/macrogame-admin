/* src/App.tsx */

import { ensureUniqueName, getContainerAlert } from './utils/helpers';
import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { notifications } from './utils/notifications';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
// --- REFACTOR: Import DeliveryContainer instead of Popup ---
import { Macrogame, Microgame, DeliveryContainer, CustomMicrogame } from './types';
import { useEffect } from 'react';
import { User } from 'firebase/auth';
import { Login } from './components/views/Login';
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
// --- REFACTOR: Rename PopupEditorModal import. We will rename this file later. ---
import { DeliveryContainerEditorModal } from "./components/modals/DeliveryContainerEditorModal";
import { MicrogameCustomizerModal } from './components/modals/MicrogameCustomizerModal';
import { MacrogameWizardModal } from './components/wizards/MacrogameWizardModal';

export default function App() {
    const navigate = useNavigate();
    
    // UI state management for modals
    const [editingMacrogame, setEditingMacrogame] = useState<Macrogame | null>(null);
    // --- REFACTOR: Rename state from 'Popup' to 'Container' ---
    const [editingContainer, setEditingContainer] = useState<DeliveryContainer | null>(null);
    const [customizingMicrogame, setCustomizingMicrogame] = useState<{ baseGame: Microgame, variant?: CustomMicrogame } | null>(null);
    const [wizardData, setWizardData] = useState<object | null>(null);
    const [flowFromWizard, setFlowFromWizard] = useState<Microgame[] | null>(null);

    // --- REFACTOR: Get new functions from useData ---
    const { 
      user,
      macrogames,
      deliveryContainers,
      allMicrogames, 
      updateMacrogame, 
      updateDeliveryContainer,
      saveCustomMicrogame, 
      createDeliveryContainer,
      isDataLoading 
    } = useData();

    // --- NEW: This function now receives an ID ---
    const handleEditMacrogame = (macrogameId: string) => {
        // Find the full, complete macrogame object from our Firestore-backed state
        const fullMacrogame = macrogames.find(m => m.id === macrogameId);
        if (fullMacrogame) {
            setEditingMacrogame(fullMacrogame);
        } else {
            notifications.error("Could not find the macrogame to edit. It may have been deleted.");
        }
    };

    // --- REFACTOR: This function now creates a DeliveryContainer ---
    const handleDeployMacrogame = async (macrogame: Macrogame) => {
        // 1. Show a loading toast
        const loadingToast = notifications.loading('Deploying macrogame...');
        
        // 1. Get all existing container names
        const existingNames = new Set(deliveryContainers.map(c => c.name));
        // 2. Define the new desired base name
        const baseName = `${macrogame.name} Delivery Container`;
        // 3. Generate a unique name
        const newName = ensureUniqueName(baseName, existingNames);

        // Create a new DeliveryContainer
        const newContainer: Omit<DeliveryContainer, 'id'> = {
            // Use objectID here, as the 'macrogame' object comes from Algolia
            name: newName,
            macrogameId: macrogame.objectID,
            macrogameName: macrogame.name,
            
            // Set an error status so it appears in the "Unconfigured" tab.
            status: { code: 'error', message: 'Needs configuration' },
            campaignId: null,
            
            // Set other fields to null so they are not 'undefined'
            deliveryMethod: null,
            skinId: null,
            // as they are the first things to configure.
            
            views: 0,
            engagements: 0,
            createdAt: new Date().toISOString()
        };
        try {
            // 2. Wait for the database action to complete
            await createDeliveryContainer(newContainer); // Use new function

            // 3. Add a 4-second delay for Algolia to index the *new* item
            await new Promise(resolve => setTimeout(resolve, 4000));

            // 4. Dismiss loading and show success
            notifications.dismiss(loadingToast);
            notifications.success('Deployed to Unconfigured');

            // 5. NOW, navigate to the page.
            navigate('/delivery', { state: { defaultTab: 'Unconfigured' } });
        } catch (error) { 
            notifications.dismiss(loadingToast);
            notifications.error('Deploy failed.');
            console.error("Error creating container:", error); 
        } // Updated log
    };

    const handleUpdateAndCloseMacrogame = async (macrogame: Omit<Macrogame, 'id' | 'type'> & { id: string | null }) => {
        const newName = macrogame.name?.trim();
        if (!newName) {
            notifications.error("Macrogame name cannot be empty.");
            return;
        }

        const isNameTaken = macrogames.some(m => m.name === newName && m.id !== macrogame.id);
        if (isNameTaken) {
            notifications.error(`A macrogame named "${newName}" already exists. Please choose a unique name.`);
            return;
        }

        const loadingToast = notifications.loading('Saving macrogame...');

        try {
            await updateMacrogame(macrogame);
            
            // Add delay for Algolia consistency (4 seconds)
            await new Promise(resolve => setTimeout(resolve, 4000));

            notifications.dismiss(loadingToast);
            notifications.success('Macrogame saved');
            setEditingMacrogame(null);

            // Send a signal to the MacrogamesManager to refresh its list
            navigate('/manager', { state: { refreshTimestamp: Date.now() } });

        } catch (error) {
            notifications.dismiss(loadingToast);
            notifications.error('Failed to save macrogame.');
        }
    };

    const handleSaveContainer = async (containerId: string, dataToUpdate: Partial<DeliveryContainer>) => {
        // 1. Show loading toast
        const loadingToast = notifications.loading('Saving container...');
        
        try {
            // --- THIS IS THE FIX ---
            // We must calculate and save the new status so Firestore is accurate.
            
            // 1. Create the merged object to check for errors
            const mergedContainer = { ...editingContainer, ...dataToUpdate } as DeliveryContainer;
            
            // 2. Check for alerts/errors
            const alert = getContainerAlert(mergedContainer, macrogames, allMicrogames);
            
            // 3. Determine the status based on the alert
            // Note: We treat 'warning' as 'ok' for status code so it appears in lists,
            // but we preserve the message so the UI can show the warning icon.
            const newStatus = {
                code: (alert && alert.severity === 'error') ? 'error' : 'ok',
                message: alert ? alert.message : ''
            };

            // 4. Add status to the data we save
            const finalDataToUpdate = {
                ...dataToUpdate,
                status: newStatus
            };

            // 5. Update database with the Data AND the Status
            await updateDeliveryContainer(containerId, finalDataToUpdate);
            // --- END FIX ---

            // 3. Wait for Algolia to index the update
            await new Promise(resolve => setTimeout(resolve, 4000));

            // 4. Dismiss loading and show success
            notifications.dismiss(loadingToast);
            notifications.success('Container saved');

            // 5. Smartly determine the new tab based on the SAME check we just did
            const hasError = alert && alert.severity === 'error';
            const newTab = hasError ? 'Unconfigured' : (mergedContainer.deliveryMethod === 'popup_modal' ? 'Popup' : 'Unconfigured');
            
            // 6. Navigate to the Delivery page on the correct tab
            navigate('/delivery', { state: { defaultTab: newTab, timestamp: Date.now() } });
            
        } catch (error) {
            notifications.dismiss(loadingToast);
            notifications.error('Failed to save container.');
            console.error("Error saving container:", error);
        }
    };

    return (
        <>
            <Toaster position="bottom-center" />
            {isDataLoading ? (
                <div>Loading...</div> // Or a proper loading spinner component
            ) : !user ? (
                <Login />
            ) : (
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

                    {/* --- Rename component and props --- */}
                    <DeliveryContainerEditorModal
                        isOpen={!!editingContainer}
                        onClose={() => setEditingContainer(null)}
                        container={editingContainer}
                        onSave={handleSaveContainer}
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
                            {/* --- UPDATED: Pass the new handleEditMacrogame function --- */}
                            <Route path="/manager" element={<MacrogamesManager handleDeployMacrogame={handleDeployMacrogame} handleEditMacrogame={handleEditMacrogame} />} />
                            {/* --- REFACTOR: Pass renamed prop to DeliveryManager --- */}
                            <Route path="/delivery" element={<DeliveryManager handleEditContainer={setEditingContainer} />} />
                            <Route path="/campaigns" element={<CampaignsManager />} />
                            <Route path="/microgames" element={<MicrogamesPage onCustomize={setCustomizingMicrogame} />} />
                            <Route path="/conversions" element={<ConversionsManagerPage />} />
                        </Routes>
                    </main>
                </div>
            )}
        </>
    );
}
