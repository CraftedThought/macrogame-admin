// src/components/modals/CampaignFormFields.tsx

import React, { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray, SubmitHandler, FormProvider } from 'react-hook-form';
import { styles } from '../../App.styles';
import { Campaign, DisplayRule, Macrogame, Popup } from '../../types';
import { generateUUID } from '../../utils/helpers';
import { DisplayRuleForm } from '../forms/DisplayRuleForm';
import { CONVERSION_GOALS } from '../../constants';
import { useData } from '../../hooks/useData';

// --- Reusable Accordion Card for Macrogame Selection ---
const MacrogameSelectionCard: React.FC<{
    macrogame: Macrogame;
    availablePopups: Popup[];
    selectedPopupIds: Set<string>;
    onToggleSelect: (popupId: string) => void;
}> = ({ macrogame, availablePopups, selectedPopupIds, onToggleSelect }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const deliveryMethodCount = availablePopups.length;

    return (
        <div style={{ ...styles.listItem, flexDirection: 'column', alignItems: 'stretch', marginBottom: '0.5rem' }}>
            <div onClick={() => setIsExpanded(!isExpanded)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <strong>{macrogame.name} ({deliveryMethodCount} {deliveryMethodCount === 1 ? 'Delivery Method' : 'Delivery Methods'})</strong>
                <button type="button" style={styles.accordionButton}>{isExpanded ? '▲' : '▼'}</button>
            </div>
            {isExpanded && (
                <div style={{ marginTop: '1rem', borderTop: '1px solid #ddd', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {availablePopups.map(popup => (
                         <div key={popup.id} style={styles.rewardItem}>
                             <input
                                 type="checkbox"
                                 id={`select-popup-${popup.id}`}
                                 checked={selectedPopupIds.has(popup.id)}
                                 onChange={() => onToggleSelect(popup.id)}
                             />
                             <label htmlFor={`select-popup-${popup.id}`} style={{ flex: 1, cursor: 'pointer' }}>{popup.name}</label>
                             <span style={styles.tag}>Popup Modal</span>
                         </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- Main Form Component ---
interface CampaignFormFieldsProps {
    initialData: Partial<Campaign>;
    onSave: (data: Partial<Campaign>, campaignId: string | null) => Promise<void>;
    onClose: () => void;
}

type CampaignFormInputs = Omit<Campaign, 'id' | 'createdAt' | 'status'>;

const createNewRule = (selectedPopups: {popupId: string, name: string}[]): DisplayRule => ({
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
    popups: selectedPopups.map(p => ({ popupId: p.popupId, weight: 100 })),
});


export const CampaignFormFields: React.FC<CampaignFormFieldsProps> = ({ initialData, onSave, onClose }) => {
    const { macrogames, popups } = useData();
    const [step, setStep] = useState(1);
    const [selectedPopupIds, setSelectedPopupIds] = useState<Set<string>>(
        new Set(initialData.displayRules?.flatMap(rule => rule.popups.map(p => p.popupId)) || [])
    );
    
    const methods = useForm<CampaignFormInputs>({
        defaultValues: {
            name: initialData.name || '',
            goal: initialData.goal || '',
            displayRules: initialData.displayRules || []
        }
    });
    
    const { fields, append, remove, replace } = useFieldArray({
        control: methods.control,
        name: "displayRules",
        keyName: "key"
    });

    const campaignGoal = methods.watch('goal');

    const handleSave: SubmitHandler<CampaignFormInputs> = async (data) => {
        const campaignId = initialData.id || null;
        if (data.displayRules.length === 0) {
            alert('A campaign must have at least one display rule.');
            return;
        }
        let saveData: Partial<Campaign> = data;
        if (!campaignId) {
            saveData.status = 'Draft';
            saveData.createdAt = new Date().toISOString();
        }
        await onSave(saveData, campaignId);
    };

    const handleNextStep = () => {
        if (selectedPopupIds.size === 0) {
            alert("Please select at least one delivery method to include in the campaign.");
            return;
        }
        // Sync the form state with the selected popups before moving to the next step
        const selectedPopupDetails = Array.from(selectedPopupIds).map(id => {
            const popup = popups.find(p => p.id === id);
            return { popupId: id, name: popup?.name || 'Unknown Popup' };
        });

        // Smartly update or create rules
        const currentRules = methods.getValues('displayRules');
        if (currentRules.length === 0) {
            replace([createNewRule(selectedPopupDetails)]);
        } else {
            // Update existing rules to only contain selected popups
            const updatedRules = currentRules.map(rule => ({
                ...rule,
                popups: rule.popups.filter(p => selectedPopupIds.has(p.popupId))
            }));
            replace(updatedRules);
        }
        setStep(2);
    };

    const recommendedMacrogames = useMemo(() => {
        if (!campaignGoal) return [];
        return macrogames.filter(mg => mg.conversionGoal === campaignGoal);
    }, [campaignGoal, macrogames]);

    const handleToggleSelect = (popupId: string) => {
        setSelectedPopupIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(popupId)) {
                newSet.delete(popupId);
            } else {
                newSet.add(popupId);
            }
            return newSet;
        });
    };

    const saveButtonText = initialData.id ? 'Save Changes' : 'Create Campaign';
    
    return (
        <FormProvider {...methods}>
            <form id="campaign-form" onSubmit={methods.handleSubmit(handleSave)}>
                {/* --- STEP 1: Selection --- */}
                {step === 1 && (
                    <div>
                         <div style={styles.configItem}>
                            <label>Campaign Name</label>
                            <input type="text" placeholder="e.g., Summer Sale Campaign" {...methods.register("name", { required: true })} style={styles.input} />
                        </div>
                        <div style={{...styles.configItem, marginTop: '1rem'}}>
                            <label>Campaign Goal</label>
                            <select {...methods.register("goal", { required: true })} style={styles.input}>
                                <option value="" disabled>Choose a goal to see recommendations...</option>
                                {Object.entries(CONVERSION_GOALS).map(([groupLabel, options]) => ( <optgroup label={groupLabel} key={groupLabel}> {options.map(option => <option key={option} value={option}>{option}</option>)} </optgroup> ))}
                            </select>
                        </div>

                        {campaignGoal && (
                            <div style={{marginTop: '2rem'}}>
                                <h4 style={styles.h4}>Recommended Macrogames</h4>
                                <p style={styles.descriptionText}>Select one or more Macrogame iterations to include in this campaign.</p>
                                <div style={{maxHeight: '40vh', overflowY: 'auto'}}>
                                    {recommendedMacrogames.map(mg => {
                                        const availablePopups = popups.filter(p => p.macrogameId === mg.id);
                                        if (availablePopups.length === 0) return null;
                                        return <MacrogameSelectionCard key={mg.id} macrogame={mg} availablePopups={availablePopups} selectedPopupIds={selectedPopupIds} onToggleSelect={handleToggleSelect} />
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- STEP 2: Configuration --- */}
                {step === 2 && (
                    <div>
                        <div style={{ ...styles.managerHeader, marginTop: '1rem' }}>
                            <h3 style={{...styles.h3, margin: 0, border: 'none'}}>Display Rules</h3>
                            <button type="button" onClick={() => append(createNewRule([]))} style={styles.saveButton}>Add Another Rule</button>
                        </div>
                         {fields.map((field, index) => (
                            <DisplayRuleForm
                                key={field.key}
                                index={index}
                                onRemove={remove}
                                selectedPopups={popups.filter(p => selectedPopupIds.has(p.id))}
                            />
                        ))}
                    </div>
                )}
            </form>
            <div style={styles.modalFooter}>
                {step === 1 && (
                    <>
                        <button type="button" onClick={onClose} style={styles.secondaryButton}>Cancel</button>
                        <button type="button" onClick={handleNextStep} style={styles.saveButton}>Next</button>
                    </>
                )}
                {step === 2 && (
                    <>
                        <button type="button" onClick={() => setStep(1)} style={styles.secondaryButton}>Back</button>
                        <button type="submit" form="campaign-form" style={styles.saveButton}>{saveButtonText}</button>
                    </>
                )}
            </div>
        </FormProvider>
    );
};