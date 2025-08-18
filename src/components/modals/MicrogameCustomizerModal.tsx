import React, { useState, useEffect } from 'react';
import { styles } from '../../App.styles';
import { Microgame } from '../../types';
import { SKINNABLE_ELEMENTS } from '../../constants';

interface MicrogameCustomizerModalProps {
    microgame: Microgame | null;
    onClose: () => void;
    onSave: (microgame: Microgame, variantName: string, skinFiles: { [key: string]: File }) => Promise<void>;
}

export const MicrogameCustomizerModal: React.FC<MicrogameCustomizerModalProps> = ({ microgame, onClose, onSave }) => {
    const [variantName, setVariantName] = useState('');
    const [skinFiles, setSkinFiles] = useState<{ [key: string]: File | null }>({});
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (microgame) {
            setVariantName(`${microgame.name} - Custom`);
            setSkinFiles({});
        }
    }, [microgame]);

    const handleFileChange = (elementId: string, file: File | null) => {
        setSkinFiles(prev => ({ ...prev, [elementId]: file }));
    };

    const handleSave = async () => {
        if (!microgame || !variantName.trim()) {
            alert('Please provide a name for your custom variant.');
            return;
        }
        setIsLoading(true);
        const filesToUpload = Object.entries(skinFiles).reduce((acc, [key, file]) => {
            if (file) acc[key] = file;
            return acc;
        }, {} as { [key: string]: File });

        try {
            await onSave(microgame, variantName, filesToUpload);
            onClose();
        } catch (error) {
            console.error("Failed to save custom microgame:", error);
            alert("An error occurred while saving. Please check the console.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!microgame) return null;

    return (
        <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
                <div style={styles.modalHeader}><h2>Customize '{microgame.name}'</h2><button onClick={onClose} style={styles.modalCloseButton}>&times;</button></div>
                <div style={styles.modalBody}>
                    <div style={styles.configItem}><label>Variant Name</label><input type="text" value={variantName} onChange={e => setVariantName(e.target.value)} style={styles.input} /></div>
                    <h4 style={{ ...styles.h4, marginTop: '2rem' }}>Skinnable Elements</h4>
                    {(SKINNABLE_ELEMENTS[microgame.id] || []).map(element => (
                        <div style={styles.configItem} key={element.id}>
                            <label>{element.name}</label>
                            <input type="file" accept="image/svg+xml,image/png,image/jpeg" onChange={e => handleFileChange(element.id, e.target.files ? e.target.files[0] : null)} style={styles.input} />
                        </div>
                    ))}
                </div>
                <div style={styles.modalFooter}><button onClick={onClose} style={styles.secondaryButton}>Cancel</button><button onClick={handleSave} style={styles.saveButton} disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Variant'}</button></div>
            </div>
        </div>
    );
};