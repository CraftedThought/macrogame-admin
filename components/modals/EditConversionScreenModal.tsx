/* src/components/modals/EditConversionScreenModal.tsx */

import React, { useEffect } from 'react';
// --- REFACTOR: No longer imports notifications or useData ---
import { useForm, SubmitHandler, useFieldArray } from 'react-hook-form';
import { styles } from '../../App.styles';
import { ConversionScreen, ConversionMethod } from '../../types'; // <-- Import ConversionMethod
import { Modal } from '../ui/Modal';
import { generateUUID } from '../../utils/helpers';
// --- NEW: We need allConversionMethods passed in as a prop ---
import { useData } from '../../hooks/useData';


interface EditConversionScreenModalProps {
    isOpen: boolean;
    onClose: () => void;
    screen: ConversionScreen | null;
    // --- NEW: onSave prop to pass data up to the parent ---
    onSave: (screenId: string, data: Partial<Omit<ConversionScreen, 'id'>>) => Promise<void>;
}

type ScreenFormInputs = Partial<Omit<ConversionScreen, 'id'>>;

export const EditConversionScreenModal: React.FC<EditConversionScreenModalProps> = ({ isOpen, onClose, screen, onSave }) => {
    // --- REFACTOR: Only get allConversionMethods from useData for the dropdown ---
    const { allConversionMethods } = useData();
    const { register, handleSubmit, reset, control, watch, setValue } = useForm<ScreenFormInputs>({
        defaultValues: { methods: [] }
    });

    const { fields, append, remove, move, replace } = useFieldArray({ control, name: "methods", keyName: "key" });
    const watchedMethods = watch('methods', []);

    useEffect(() => {
        if (screen) {
            // "Clean" the data by ensuring every method has an instanceId
            const cleanedMethods = (screen.methods || []).map(method => ({
                ...method,
                // If instanceId is missing on an old method, generate a new one
                instanceId: method.instanceId || generateUUID(),
                // Ensure gate object exists if a type is set, for form compatibility
                gate: method.gate ? {
                    type: method.gate.type || 'on_success', // Default to 'on_success' if type is missing
                    methodInstanceId: method.gate.methodInstanceId
                } : {
                    type: 'none' // Default to 'none'
                }
            }));

            const screenWithCleanedMethods = { ...screen, methods: cleanedMethods };

            // Populate the form with the clean, upgraded data
            reset(screenWithCleanedMethods);
            replace(screenWithCleanedMethods.methods);
        }
    }, [screen, reset, replace]);

    const handleSave: SubmitHandler<ScreenFormInputs> = async (data) => {
        if (!screen) return;

        const finalData: Partial<Omit<ConversionScreen, 'id'>> = {
            name: data.name,
            headline: data.headline,
            bodyText: data.bodyText,
            layout: data.layout,
            methods: (data.methods || []).map(method => {
                // Create a clean copy to ensure we have all properties
                const newMethod = { ...method };
                
                // If the gate type is 'none' or doesn't exist, delete the gate property
                if (!newMethod.gate || newMethod.gate.type === 'none') {
                    delete newMethod.gate;
                } 
                // If it's 'on_points', keep the gate but remove methodInstanceId
                else if (newMethod.gate.type === 'on_points') {
                    delete newMethod.gate.methodInstanceId;
                }
                // If it's 'on_success' but no method is selected, delete the gate
                else if (newMethod.gate.type === 'on_success' && !newMethod.gate.methodInstanceId) {
                    delete newMethod.gate;
                }

                return newMethod;
            })
        };

        // --- REFACTOR: Call the onSave prop. No toasts, no onClose() ---
        await onSave(screen.id, finalData);
    };

    const modalFooter = (
        <>
            <button type="button" onClick={onClose} style={styles.secondaryButton}>Cancel</button>
            <button type="submit" form="edit-screen-form" style={styles.saveButton}>Save Changes</button>
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Conversion Screen" footer={modalFooter} size="large">
            <form id="edit-screen-form" onSubmit={handleSubmit(handleSave)}>
                <div style={styles.configItem}><label>Internal Name</label><input type="text" {...register("name")} style={styles.input} /></div>
                
                <h4 style={{...styles.h4, marginTop: '2rem'}}>Screen Content & Styling</h4>
                <div style={styles.configRow}>
                    <div style={styles.configItem}><label>Headline</label><input type="text" {...register("headline")} style={styles.input} /></div>
                    <div style={styles.configItem}><label>Body Text</label><input type="text" {...register("bodyText")} style={styles.input} /></div>
                    <div style={styles.configItem}><label>Layout</label><select {...register("layout")} style={styles.input}><option value="single_column">Single Column</option></select></div>
                </div>
                
                <h4 style={{...styles.h4, marginTop: '2rem'}}>Conversion Methods</h4>
                <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                    {fields.map((field, index) => {
                        // --- BUG FIX: This logic is now simpler ---
                        // We only show methods that are *before* the current one.
                        const availableGates = watchedMethods.filter((_, i) => i < index);
                        // --- END BUG FIX ---

                        const selectedMethodId = watch(`methods.${index}.methodId`);
                        const selectedMethod = allConversionMethods.find(m => m.id === selectedMethodId);
                        
                        const gateType = watch(`methods.${index}.gate.type`);
                        
                        return (
                             <div key={field.key} style={{border: '1px solid #ccc', borderRadius: '8px', padding: '1rem'}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                                    <strong style={{fontSize: '1.1rem'}}>Method {index + 1}: {selectedMethod?.name || 'New Method'}</strong>
                                    <div>
                                        <button type="button" onClick={() => move(index, index - 1)} disabled={index === 0} style={styles.flowCardButton}>▲</button>
                                        <button type="button" onClick={() => move(index, index + 1)} disabled={index === fields.length - 1} style={styles.flowCardButton}>▼</button>
                                        <button type="button" onClick={() => remove(index)} style={{...styles.deleteButton, marginLeft: '1rem'}}>Remove</button>
                                    </div>
                                </div>
                                <div style={styles.configRow}>
                                    <div style={styles.configItem}>
                                        <label>Method</label>
                                        <select {...register(`methods.${index}.methodId`)} style={styles.input}>
                                            <option value="">Select a method...</option>
                                            {allConversionMethods.map(m => <option key={m.id} value={m.id}>{m.name} ({m.type.replace(/_/g, ' ')})</option>)}
                                        </select>
                                    </div>
                                    <div style={styles.configItem}>
                                        <label>Gate Type (Locked Offer)</label>
                                        <select 
                                            {...register(`methods.${index}.gate.type`)} 
                                            style={styles.input}
                                            onChange={(e) => {
                                                setValue(`methods.${index}.gate.type`, e.target.value as 'none' | 'on_success' | 'on_points');
                                                if (e.target.value !== 'on_success') {
                                                    setValue(`methods.${index}.gate.methodInstanceId`, undefined);
                                                }
                                            }}
                                        >
                                            <option value="none">None (Always Visible)</option>
                                            <option value="on_success">On Method Success</option>
                                            <option value="on_points">On Point Threshold</option>
                                        </select>
                                    </div>
                                </div>
                                
                                {gateType === 'on_success' && (
                                    <div style={{...styles.configItem, marginTop: '1rem'}}>
                                        <label>Select Prerequisite Method</label>
                                        <select {...register(`methods.${index}.gate.methodInstanceId`)} style={styles.input}>
                                            <option value="">Select a method to complete...</option>
                                            {availableGates.map((gateField, gateIndex) => (
                                                <option key={gateField.instanceId || gateIndex} value={gateField.instanceId}>
                                                    Method {watchedMethods.findIndex(f => f.instanceId === gateField.instanceId) + 1}: {allConversionMethods.find(m => m.id === gateField.methodId)?.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                <button type="button" onClick={() => append({ instanceId: generateUUID(), methodId: '', gate: { type: 'none' } })} style={{...styles.secondaryButton, marginTop: '1rem'}}>Add New Method</button>
            </form>
        </Modal>
    );
};