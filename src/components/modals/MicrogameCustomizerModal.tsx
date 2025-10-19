// src/components/modals/MicrogameCustomizerModal.tsx

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { styles } from '../../App.styles';
import { Microgame, CustomMicrogame } from '../../types';
import { SKINNABLE_ELEMENTS } from '../../constants';
import { Modal } from '../ui/Modal';

interface MicrogameCustomizerModalProps {
    microgame: Microgame | null;
    existingVariant?: CustomMicrogame | null;
    onClose: () => void;
    onSave: (baseGame: Microgame, variantName: string, skinFiles: { [key: string]: File }, existingVariant?: CustomMicrogame) => Promise<void>;
}

export const MicrogameCustomizerModal: React.FC<MicrogameCustomizerModalProps> = ({ microgame, existingVariant, onClose, onSave }) => {
    const [variantName, setVariantName] = useState('');
    const [skinFiles, setSkinFiles] = useState<{ [key: string]: File | null }>({});
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (microgame) {
            setVariantName(existingVariant ? existingVariant.name : `${microgame.name} - Custom`);
            setSkinFiles({});
        }
    }, [microgame, existingVariant]);

    const handleFileChange = (elementId: string, file: File | null) => {
        setSkinFiles(prev => ({ ...prev, [elementId]: file }));
    };

    const handleSave = async () => {
        if (!microgame || !variantName.trim()) { toast.error('Please provide a name for your custom variant.'); return; }
        setIsLoading(true);
        const filesToUpload = Object.entries(skinFiles).reduce((acc, [key, file]) => {
            if (file) acc[key] = file;
            return acc;
        }, {} as { [key: string]: File });
        try {
            await onSave(microgame, variantName, filesToUpload, existingVariant || undefined);
            onClose();
        } catch (error) {
            console.error("Failed to save custom microgame:", error);
            toast.error("An error occurred while saving.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!microgame) return null;

    const modalTitle = existingVariant ? `Edit '${existingVariant.name}'` : `Customize '${microgame.name}'`;
    const modalFooter = (
        <>
            <button onClick={onClose} style={styles.secondaryButton}>Cancel</button>
            <button onClick={handleSave} style={styles.saveButton} disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Variant'}</button>
        </>
    );

    return (
        <Modal isOpen={!!microgame} onClose={onClose} title={modalTitle} footer={modalFooter} size="small">
            <div>
                <div style={styles.configItem}><label>Variant Name</label><input type="text" value={variantName} onChange={e => setVariantName(e.target.value)} style={styles.input} /></div>
                <h4 style={{ ...styles.h4, marginTop: '2rem' }}>Skinnable Elements</h4>
                <p style={styles.descriptionText}>Upload new assets or leave fields blank to keep existing ones.</p>
                {(SKINNABLE_ELEMENTS[microgame.id] || []).map(element => (
                    <div style={styles.configItem} key={element.id}>
                        <label>{element.name}</label>
                        {existingVariant?.skinData[element.id] && (
                            <p style={{fontSize: '0.8rem', color: '#606770'}}>Current: <a href={existingVariant.skinData[element.id].url} target="_blank" rel="noopener noreferrer">{existingVariant.skinData[element.id].fileName}</a></p>
                        )}
                        <input type="file" accept="image/svg+xml,image/png,image/jpeg" onChange={e => handleFileChange(element.id, e.target.files ? e.target.files[0] : null)} style={styles.input} />
                    </div>
                ))}
            </div>
        </Modal>
    );
};