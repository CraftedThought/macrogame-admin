// src/components/modals/CampaignFormModal.tsx

import React, { useEffect } from 'react';
import { useForm, useFieldArray, SubmitHandler, FormProvider } from 'react-hook-form';
import { styles } from '../../App.styles';
import { Campaign, DisplayRule } from '../../types';
import { generateUUID } from '../../utils/helpers';
import { DisplayRuleForm } from '../forms/DisplayRuleForm';

interface CampaignFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<Campaign>, campaignId: string | null) => Promise<void>;
    existingCampaign?: Campaign | null;
}

// The form will now manage the entire Campaign object shape
type CampaignFormInputs = Omit<Campaign, 'id' | 'createdAt' | 'status'>;

const createNewRule = (): DisplayRule => ({
    id: generateUUID(),
    name: 'New Rule',
    trigger: 'exit_intent',
    audience: 'all_visitors',
    schedule: {
        days: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false },
        startTime: '09:00',
        endTime: '17:00',
        timezone: 'America/New_York',
    },
    popups: []
});

export const CampaignFormModal: React.FC<CampaignFormModalProps> = ({ isOpen, onClose, onSave, existingCampaign }) => {
    // We pass the entire form method context down to nested components
    const methods = useForm<CampaignFormInputs>();

    // useFieldArray is the hook for managing dynamic lists of fields
    const { fields, append, remove } = useFieldArray({
        control: methods.control,
        name: "displayRules",
        keyName: "key" // Use a different name for the key to avoid conflicts with our `id`
    });

    useEffect(() => {
        if (isOpen) {
            if (existingCampaign) {
                // Populate form with existing data for editing
                methods.reset({
                    name: existingCampaign.name,
                    goal: existingCampaign.goal,
                    displayRules: existingCampaign.displayRules,
                });
            } else {
                // Reset form for creation with one default rule
                methods.reset({
                    name: '',
                    goal: '',
                    displayRules: [createNewRule()],
                });
            }
        }
    }, [isOpen, existingCampaign, methods]);
    
    const handleSave: SubmitHandler<CampaignFormInputs> = async (data) => {
        const campaignId = existingCampaign ? existingCampaign.id : null;
        
        // Filter out any rules that have no popups assigned
        const validData = {
            ...data,
            displayRules: data.displayRules.filter(rule => rule.popups.length > 0)
        };
        
        if (validData.displayRules.length === 0) {
            alert('A campaign must have at least one display rule with one or more popups assigned.');
            return;
        }

        let saveData: Partial<Campaign> = validData;
        if (!campaignId) {
            saveData.status = 'Draft';
            saveData.createdAt = new Date().toISOString();
        }

        await onSave(saveData, campaignId);
    };

    if (!isOpen) return null;

    const modalTitle = existingCampaign ? 'Edit Campaign' : 'Create New Campaign';
    const saveButtonText = existingCampaign ? 'Save Changes' : 'Create Campaign';

    return (
        <div style={styles.modalOverlay}>
            <FormProvider {...methods}>
                <form onSubmit={methods.handleSubmit(handleSave)} style={{...styles.modalContent, maxWidth: '800px'}}>
                    <div style={styles.modalHeader}><h2>{modalTitle}</h2><button type="button" onClick={onClose} style={styles.modalCloseButton}>&times;</button></div>
                    <div style={styles.modalBody}>
                        <div style={styles.configItem}>
                            <label>Campaign Name</label>
                            <input type="text" placeholder="e.g., Summer Sale Campaign" {...methods.register("name", { required: true })} style={styles.input} />
                        </div>
                         <div style={{...styles.configItem, marginTop: '1rem'}}>
                            <label>Internal Goal</label>
                            <input type="text" placeholder="e.g., Increase AOV for summer items" {...methods.register("goal")} style={styles.input} />
                        </div>

                        <div style={{ ...styles.managerHeader, marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
                            <h3 style={{...styles.h3, margin: 0, border: 'none'}}>Display Rules</h3>
                            <button type="button" onClick={() => append(createNewRule())} style={styles.saveButton}>Add Rule</button>
                        </div>
                        
                        {fields.map((field, index) => (
                            <DisplayRuleForm
                                key={field.key}
                                index={index}
                                onRemove={remove}
                            />
                        ))}
                    </div>
                    <div style={styles.modalFooter}>
                        <button type="button" onClick={onClose} style={styles.secondaryButton}>Cancel</button>
                        <button type="submit" style={styles.saveButton}>{saveButtonText}</button>
                    </div>
                </form>
            </FormProvider>
        </div>
    );
};