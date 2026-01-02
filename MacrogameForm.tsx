// src/components/views/MacrogameForm.tsx

import React, { useState, useEffect } from 'react';
import { Macrogame, Microgame, CurrentPage } from '../../types';
import { MacrogameFormFields } from './MacrogameFormFields';

interface MacrogameFormProps {
    existingMacrogame?: Macrogame | null;
    onSave: (macrogame: Omit<Macrogame, 'id' | 'type'> & { id: string | null }) => void;
    setCurrentPage: React.Dispatch<React.SetStateAction<CurrentPage>>;
    onLaunchWizard: (data: object) => void;
    flowFromWizard: Microgame[] | null;
    onClearWizardFlow: () => void;
}

// Define the complete, "clean" default state for a new macrogame
const createDefaultMacrogame = (): Omit<Macrogame, 'id' | 'type'> & { id: string | null } => ({
    id: null,
    name: '',
    conversionGoal: '',
    gameplayExperience: '',
    category: '',
    createdAt: new Date().toISOString(),
    config: {
        titleScreenDuration: 2000,
        controlsScreenDuration: 3000,
        backgroundMusicUrl: null,
        screenFlowType: 'Separate',
    },
    introScreen: {
        enabled: true,
        text: 'GET READY!',
        duration: 2,
        clickToContinue: false,
        backgroundImageUrl: null, // Explicitly set to null
    },
    promoScreen: {
        enabled: false,
        text: 'Check out this cool product!',
        duration: 5,
        clickToContinue: false,
        backgroundImageUrl: null, // Explicitly set to null
        spotlightImageUrl: null,  // Explicitly set to null
        spotlightImageLayout: null, // Explicitly set to null
    },
    flow: [],
    conversionScreenId: null,
    audioConfig: {}, // Explicitly set to an empty object
});

export const MacrogameForm: React.FC<MacrogameFormProps> = ({ existingMacrogame, onSave, onLaunchWizard, flowFromWizard, onClearWizardFlow }) => {
    // This state will hold the clean, complete data for the form.
    const [cleanData, setCleanData] = useState<Omit<Macrogame, 'id' | 'type'> & { id: string | null } | null>(null);

    useEffect(() => {
        // --- This is the "Prepare" step ---
        let dataForForm: Omit<Macrogame, 'id' | 'type'> & { id: string | null };

        if (existingMacrogame) {
            // If editing, merge the existing data with the defaults to ensure all fields are present
            const defaults = createDefaultMacrogame();
            dataForForm = {
                ...defaults,
                ...existingMacrogame,
                config: { ...defaults.config, ...existingMacrogame.config },
                introScreen: { ...defaults.introScreen, ...existingMacrogame.introScreen },
                promoScreen: { ...defaults.promoScreen, ...existingMacrogame.promoScreen },
            };
        } else {
            // If creating, use a fresh set of defaults
            dataForForm = createDefaultMacrogame();
        }
        
        setCleanData(dataForForm);

    }, [existingMacrogame]);

    // --- This is the "Render" step ---
    // Only render the form component when we have clean data ready.
    // The `key` prop is crucial: it forces React to re-mount the component when we switch
    // between creating a new game and editing a different one, preventing state leakage.
    return cleanData ? (
        <MacrogameFormFields
            key={cleanData.id || 'new'}
            initialData={cleanData}
            onSave={onSave}
            onLaunchWizard={onLaunchWizard}
            flowFromWizard={flowFromWizard}
            onClearWizardFlow={onClearWizardFlow}
        />
    ) : null; // Render nothing while data is being prepared
};