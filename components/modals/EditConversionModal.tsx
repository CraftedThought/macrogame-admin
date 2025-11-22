/* src/components/modals/EditConversionModal.tsx */

import React, { useEffect, useState } from 'react';
// --- REFACTOR: No longer imports notifications or useData ---
import { useForm, SubmitHandler, useFieldArray } from 'react-hook-form';
import { styles } from '../../App.styles';
import { ConversionMethod } from '../../types';
import { Modal } from '../ui/Modal';

interface EditConversionModalProps {
    isOpen: boolean;
    onClose: () => void;
    conversion: ConversionMethod | null;
    // --- NEW: onSave prop to pass data up to the parent ---
    onSave: (methodId: string, data: Partial<Omit<ConversionMethod, 'id'>>) => Promise<void>;
}

type ConversionFormInputs = Partial<Omit<ConversionMethod, 'id' | 'createdAt'>>;

// Define a complete set of default values for all possible fields
const formDefaultValues: ConversionFormInputs = {
    name: '',
    headline: '',
    subheadline: '',
    // Coupon Display
    codeType: 'static',
    staticCode: '',
    discountType: 'percentage',
    discountValue: 0,
    clickToReveal: false,
    // Link Redirect
    buttonText: '',
    url: '',
    utmEnabled: false,
    // Email & Form
    submitButtonText: '',
    fields: [],
    // Social Follow
    links: [],
};

// A dedicated component for the form itself. It will only render when it has complete data.
const ConversionMethodForm: React.FC<{
    defaultData: ConversionFormInputs;
    onSave: (data: ConversionFormInputs) => void;
}> = ({ defaultData, onSave }) => {
    const { register, handleSubmit, watch, control } = useForm<ConversionFormInputs>({
        defaultValues: defaultData
    });
    
    const { fields, append: appendFormField, remove: removeFormField } = useFieldArray({ control, name: "fields" });
    const { fields: socialLinks, append: appendSocialLink, remove: removeSocialLink } = useFieldArray({ control, name: "links" });
    const selectedType = watch('type');

    return (
        <form id="edit-conversion-form" onSubmit={handleSubmit(onSave)}>
            <div style={styles.configRow}>
                <div style={styles.configItem}><label>Internal Name</label><input type="text" {...register("name")} style={styles.input} /></div>
                <div style={styles.configItem}><label>Conversion Type (Read-only)</label><input type="text" readOnly disabled value={selectedType?.replace(/_/g, ' ').toUpperCase()} style={{...styles.input, backgroundColor: '#f0f2f5'}}/></div>
            </div>
            
            <h4 style={{...styles.h4, marginTop: '2rem'}}>Configuration</h4>
            
            <div style={styles.configRow}>
                <div style={styles.configItem}><label>Headline</label><input type="text" {...register("headline")} style={styles.input} /></div>
                <div style={styles.configItem}><label>Subheadline</label><input type="text" {...register("subheadline")} style={styles.input} /></div>
            </div>

            <div style={{marginTop: '1.5rem'}}>
                 {selectedType === 'coupon_display' && (
                    <div style={styles.configRow}>
                        <div style={styles.configItem}><label>Coupon Type</label><select {...register("codeType")} style={styles.input}><option value="static">Static Code</option><option value="dynamic" disabled>Dynamic Codes (Coming Soon)</option></select></div>
                        <div style={styles.configItem}><label>Static Code</label><input type="text" placeholder="SUMMER25" {...register("staticCode")} style={styles.input} /></div>
                        <div style={styles.configItem}><label>Discount Type</label><select {...register("discountType")} style={styles.input}><option value="percentage">% Percentage</option><option value="fixed_amount">$ Fixed Amount</option></select></div>
                        <div style={styles.configItem}><label>Discount Value</label><input type="number" step="0.01" {...register("discountValue")} style={styles.input} /></div>
                        <div style={{...styles.configItem, justifyContent: 'center', alignSelf: 'flex-end', paddingBottom: '0.6rem'}}>
                            <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                <input type="checkbox" {...register("clickToReveal")} />
                                <span>Click to Reveal</span>
                            </label>
                        </div>
                    </div>
                )}
                {selectedType === 'link_redirect' && (
                    <div>
                        <div style={styles.configRow}>
                            <div style={styles.configItem}><label>Button Text</label><input type="text" {...register("buttonText")} style={styles.input} /></div>
                            <div style={styles.configItem}><label>Destination URL</label><input type="url" {...register("url")} style={styles.input} /></div>
                        </div>
                        <div style={{...styles.configItem, marginTop: '1rem'}}><label><input type="checkbox" {...register("utmEnabled")} /> Enable UTM Tracking</label></div>
                    </div>
                )}
                {selectedType === 'email_capture' && (
                     <div style={styles.configItem}><label>Submit Button Text</label><input type="text" {...register("submitButtonText")} style={styles.input} /></div>
                )}
                {selectedType === 'form_submit' && (
                    <div>
                        {fields.map((field, index) => (
                            <div key={field.id} style={{...styles.configRow, border: '1px solid #eee', padding: '1rem', borderRadius: '6px', marginBottom: '1rem'}}>
                                <div style={styles.configItem}><label>Field Label</label><input {...register(`fields.${index}.label`)} style={styles.input}/></div>
                                <div style={styles.configItem}><label>Field Type</label><select {...register(`fields.${index}.type`)} style={styles.input}><option value="text">Text</option><option value="email">Email</option><option value="tel">Phone</option><option value="number">Number</option></select></div>
                                <div style={{...styles.configItem, flex: '0 0 auto', justifyContent: 'center'}}><label><input type="checkbox" {...register(`fields.${index}.required`)} /> Required</label></div>
                                <button type="button" onClick={() => removeFormField(index)} style={{...styles.deleteButton, alignSelf: 'flex-end'}}>Remove</button>
                            </div>
                        ))}
                        <button type="button" onClick={() => appendFormField({ label: '', type: 'text', required: true, name: `field_${fields.length + 1}` })} style={styles.secondaryButton}>Add Field</button>
                        <div style={{...styles.configItem, marginTop: '1rem'}}><label>Submit Button Text</label><input type="text" {...register("submitButtonText")} style={styles.input} /></div>
                    </div>
                )}
                {selectedType === 'social_follow' && (
                    <div>
                        {socialLinks.map((link, index) => (
                            <div key={link.id} style={{...styles.configRow, border: '1px solid #eee', padding: '1rem', borderRadius: '6px', marginBottom: '1rem'}}>
                                <div style={styles.configItem}><label>Platform</label><select {...register(`links.${index}.platform`)} style={styles.input}><option value="instagram">Instagram</option><option value="tiktok">TikTok</option><option value="x">X (Twitter)</option><option value="facebook">Facebook</option><option value="youtube">YouTube</option><option value="pinterest">Pinterest</option></select></div>
                                <div style={styles.configItem}><label>Profile URL</label><input type="url" {...register(`links.${index}.url`)} style={styles.input}/></div>
                                <button type="button" onClick={() => removeSocialLink(index)} style={{...styles.deleteButton, alignSelf: 'flex-end'}}>Remove</button>
                            </div>
                        ))}
                        <button type="button" onClick={() => appendSocialLink({ platform: 'instagram', url: '' })} style={styles.secondaryButton}>Add Link</button>
                    </div>
                )}
            </div>
        </form>
    );
}


export const EditConversionModal: React.FC<EditConversionModalProps> = ({ isOpen, onClose, conversion, onSave }) => {
    // This state will hold the clean, complete data for the form. The form will not render until this is ready.
    const [formData, setFormData] = useState<ConversionFormInputs | null>(null);

    useEffect(() => {
        if (conversion) {
            // Manually merge the loaded data with defaults to prevent 'undefined'
            const dataForForm = {
                ...formDefaultValues,
                ...conversion,
                // Explicitly provide fallbacks for any fields that could be problematic
                clickToReveal: conversion.clickToReveal || false,
                utmEnabled: conversion.utmEnabled || false,
                fields: (conversion.fields || []).map(field => ({
                    label: '', type: 'text', required: true, name: '', ...field
                })),
                links: (conversion.links || []).map(link => ({
                    platform: 'instagram', url: '', ...link
                })),
            };
            setFormData(dataForForm);
        } else {
            // When the modal closes, clear the form data
            setFormData(null);
        }
    }, [conversion]);

    const handleSave: SubmitHandler<ConversionFormInputs> = async (data) => {
        if (!conversion) return;
        
        // The data from the form is already clean, but we'll rebuild the object to be safe
        const finalData: Partial<ConversionMethod> = {
            name: data.name,
            headline: data.headline,
            subheadline: data.subheadline,
            type: data.type,
        };

        switch (data.type) {
            case 'coupon_display':
                finalData.codeType = data.codeType;
                finalData.staticCode = data.staticCode;
                finalData.discountType = data.discountType;
                finalData.discountValue = data.discountValue;
                finalData.clickToReveal = data.clickToReveal;
                break;
            case 'link_redirect':
                finalData.buttonText = data.buttonText;
                finalData.url = data.url;
                finalData.utmEnabled = data.utmEnabled || false;
                break;
            case 'email_capture':
                finalData.submitButtonText = data.submitButtonText;
                break;
            case 'form_submit':
                finalData.fields = data.fields;
                finalData.submitButtonText = data.submitButtonText;
                break;
            case 'social_follow':
                finalData.links = data.links;
                break;
        }
        
        // --- REFACTOR: Call the onSave prop. No toasts, no onClose() ---
        await onSave(conversion.id, finalData);
    };

    const modalFooter = (
        <>
            <button type="button" onClick={onClose} style={styles.secondaryButton}>Cancel</button>
            <button type="submit" form="edit-conversion-form" style={styles.saveButton}>Save Changes</button>
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Conversion Method" footer={modalFooter} size="large">
            {/* Conditionally render the form ONLY when we have clean data ready */}
            {formData && <ConversionMethodForm key={conversion?.id} defaultData={formData} onSave={handleSave} />}
        </Modal>
    );
};