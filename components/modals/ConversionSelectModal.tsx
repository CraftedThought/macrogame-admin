// src/components/modals/ConversionSelectModal.tsx

import React, { useState, useEffect } from 'react';
import { styles } from '../../App.styles';
import { Conversion, CurrentPage } from '../../types';
import { Modal } from '../ui/Modal';
import { useData } from '../../hooks/useData';

interface ConversionSelectModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentConversionId: string | null;
    onSave: (conversionId: string | null) => void;
    setCurrentPage: React.Dispatch<React.SetStateAction<CurrentPage>>;
}

export const ConversionSelectModal: React.FC<ConversionSelectModalProps> = ({ isOpen, onClose, currentConversionId, onSave, setCurrentPage }) => {
    const { allConversions } = useData();
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setSelectedId(currentConversionId);
        }
    }, [currentConversionId, isOpen]);

    const handleSave = () => {
        onSave(selectedId);
        onClose();
    };

    const modalFooter = (
        <>
            <button onClick={() => { onClose(); setCurrentPage({ page: 'conversions' }); }} style={styles.secondaryButton}>Create New</button>
            <button onClick={handleSave} style={styles.saveButton}>Save Selection</button>
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Set Conversion Step" footer={modalFooter} size="medium">
            <div>
                <p style={styles.descriptionText}>Select one conversion method to display at the end of your macrogame flow. You can manage your conversion methods on the 'Conversions' page.</p>
                <ul style={{...styles.rewardsList, maxHeight: '40vh'}}>
                    {allConversions.map(conv => (
                        <li key={conv.id} style={styles.rewardItem}>
                            <input
                                type="radio"
                                id={`conv-${conv.id}`}
                                name="conversion-selection"
                                checked={selectedId === conv.id}
                                onChange={() => setSelectedId(conv.id)}
                            />
                            <label htmlFor={`conv-${conv.id}`} style={{ flex: 1, marginLeft: '0.5rem', cursor: 'pointer' }}>
                                <strong>{conv.name}</strong>
                                <span style={{...styles.tag, marginLeft: '1rem'}}>{conv.type.replace('_', ' ').toUpperCase()}</span>
                            </label>
                        </li>
                    ))}
                </ul>
                {allConversions.length === 0 && (
                    <p>No conversion methods have been created yet. Click "Create New" to get started.</p>
                )}
            </div>
        </Modal>
    );
};