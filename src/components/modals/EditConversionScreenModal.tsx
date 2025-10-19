// src/components/modals/EditConversionScreenModal.tsx

import React, { useEffect } from 'react';
import { useForm, SubmitHandler, useFieldArray } from 'react-hook-form';
import { styles } from '../../App.styles';
import { ConversionScreen } from '../../types';
import { useData } from '../../hooks/useData';
import { Modal } from '../ui/Modal';
import { generateUUID } from '../../utils/helpers';

interface EditConversionScreenModalProps {
    isOpen: boolean;
    onClose: () => void;
    screen: ConversionScreen | null;
}

type ScreenFormInputs = Partial<Omit<ConversionScreen, 'id'>>;

export const EditConversionScreenModal: React.FC<EditConversionScreenModalProps> = ({ isOpen, onClose, screen }) => {
    const { allConversionMethods, updateConversionScreen } = useData();
    const { register, handleSubmit, reset, control, watch } = useForm<ScreenFormInputs>({
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
                instanceId: method.instanceId || generateUUID()
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
                // If the gate isn't valid, delete the property entirely before saving
                if (!newMethod.gate?.methodInstanceId) {
                    delete newMethod.gate;
                }
                return newMethod;
            })
        };

        await updateConversionScreen(screen.id, finalData);
        alert('Conversion screen updated successfully!');
        onClose();
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
                        const availableGates = watchedMethods
                            .filter((_, i) => i < index)
                            .filter(method => {
                                const methodData = allConversionMethods.find(m => m.id === method.methodId);
                                if (!methodData) return false;

                                switch (methodData.type) {
                                    case 'email_capture':
                                    case 'form_submit':
                                    case 'link_redirect':
                                    case 'social_follow':
                                        return true;
                                    case 'coupon_display':
                                        // Only allow coupons as a gate IF they require a click
                                        return !!methodData.clickToReveal;
                                    default:
                                        return false;
                                }
                            });
                        const selectedMethodId = watch(`methods.${index}.methodId`);
                        const selectedMethod = allConversionMethods.find(m => m.id === selectedMethodId);
                        
                        return (
                             <div key={field.key} style={{border: '1px solid #ccc', borderRadius: '8px', padding: '1rem'}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                                    <strong style={{fontSize: '1.1rem'}}>Step {index + 1}: {selectedMethod?.name || 'New Method'}</strong>
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
                                        <label>Gate (Locked Offer)</label>
                                        <select {...register(`methods.${index}.gate.methodInstanceId`)} style={styles.input}>
                                            <option value="">None (Always Visible)</option>
                                            {availableGates.map((gateField, gateIndex) => (
                                                <option key={gateField.instanceId || gateIndex} value={gateField.instanceId}>
                                                    Show after completing: Step {watchedMethods.findIndex(f => f.instanceId === gateField.instanceId) + 1}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <button type="button" onClick={() => append({ instanceId: generateUUID(), methodId: '', gate: undefined })} style={{...styles.secondaryButton, marginTop: '1rem'}}>Add Method to Screen</button>
            </form>
        </Modal>
    );
};