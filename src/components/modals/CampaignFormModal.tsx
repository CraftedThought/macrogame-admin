// src/components/modals/CampaignFormModal.tsx

import React, { useState, useEffect } from 'react';
import { Campaign } from '../../types';
import { Modal } from '../ui/Modal';
import { CampaignFormFields } from './CampaignFormFields';

interface CampaignFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<Campaign>, campaignId: string | null) => Promise<void>;
    existingCampaign?: Campaign | null;
}

// Define a complete, "clean" default state for a new campaign
const createDefaultCampaign = (): Partial<Campaign> => ({
    name: '',
    goal: '',
    displayRules: [],
    status: 'Draft',
    createdAt: new Date().toISOString(),
});

export const CampaignFormModal: React.FC<CampaignFormModalProps> = ({ isOpen, onClose, onSave, existingCampaign }) => {
    // This state will hold the clean, complete data for the form.
    const [cleanData, setCleanData] = useState<Partial<Campaign> | null>(null);

    useEffect(() => {
        if (isOpen) {
            // --- This is the "Prepare" step ---
            let dataForForm: Partial<Campaign>;

            if (existingCampaign) {
                // If editing, merge existing data with defaults
                dataForForm = {
                    ...createDefaultCampaign(),
                    ...existingCampaign
                };
            } else {
                // If creating, use a fresh set of defaults
                dataForForm = createDefaultCampaign();
            }
            setCleanData(dataForForm);
        } else {
            // When modal closes, clear the data to ensure it's fresh next time
            setCleanData(null);
        }
    }, [isOpen, existingCampaign]);
    
    const modalTitle = existingCampaign ? 'Edit Campaign' : 'Create New Campaign';

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={modalTitle}
            size="large"
        >
            {/* --- This is the "Render" step --- */}
            {/* Conditionally render the form only when cleanData is ready */}
            {cleanData && (
                <CampaignFormFields
                    key={cleanData.id || 'new'}
                    initialData={cleanData}
                    onSave={onSave}
                    onClose={onClose}
                />
            )}
        </Modal>
    );
};