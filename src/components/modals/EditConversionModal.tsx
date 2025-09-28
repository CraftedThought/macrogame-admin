// src/components/modals/EditConversionModal.tsx

import React, { useEffect } from 'react';
import { useForm, SubmitHandler, useFieldArray } from 'react-hook-form';
import { styles } from '../../App.styles';
import { ConversionMethod } from '../../types';
import { useData } from '../../hooks/useData';
import { Modal } from '../ui/Modal';

interface EditConversionModalProps {
    isOpen: boolean;
    onClose: () => void;
    conversion: ConversionMethod | null;
}

type ConversionFormInputs = Partial<Omit<ConversionMethod, 'id' | 'createdAt'>>;

export const EditConversionModal: React.FC<EditConversionModalProps> = ({ isOpen, onClose, conversion }) => {
    const { updateConversionMethod } = useData();
    const { register, handleSubmit, reset, watch, control } = useForm<ConversionFormInputs>();
    
    const { fields, append: appendFormField, remove: removeFormField, replace: replaceFormFields } = useFieldArray({ control, name: "fields" });
    const { fields: socialLinks, append: appendSocialLink, remove: removeSocialLink, replace: replaceSocialLinks } = useFieldArray({ control, name: "links" });

    const selectedType = watch('type');

    useEffect(() => {
        if (conversion) {
            reset(conversion);
            // react-hook-form's reset doesn't always play well with useFieldArray, so we manually replace the arrays
            if (conversion.type === 'form_submit') {
                replaceFormFields(conversion.fields);
            } else if (conversion.type === 'social_follow') {
                replaceSocialLinks(conversion.links);
            }
        }
    }, [conversion, reset, replaceFormFields, replaceSocialLinks]);

    const handleSave: SubmitHandler<ConversionFormInputs> = async (data) => {
        if (!conversion) return;
        
        // Clean the data to ensure only relevant fields for the selected type are saved
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
                break;
            case 'link_redirect':
                finalData.buttonText = data.buttonText;
                finalData.url = data.url;
                finalData.utmEnabled = data.utmEnabled;
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
        
        await updateConversionMethod(conversion.id, finalData);
        alert('Conversion method updated successfully!');
        onClose();
    };

    const modalFooter = (
        <>
            <button type="button" onClick={onClose} style={styles.secondaryButton}>Cancel</button>
            <button type="submit" form="edit-conversion-form" style={styles.saveButton}>Save Changes</button>
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Conversion Method" footer={modalFooter} size="large">
            <form id="edit-conversion-form" onSubmit={handleSubmit(handleSave)}>
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
        </Modal>
    );
};