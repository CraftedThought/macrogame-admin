// src/components/modals/ConversionScreenSelectModal.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { styles } from '../../App.styles';
import { Modal } from '../ui/Modal';
import { useData } from '../../hooks/useData';

interface ConversionScreenSelectModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentScreenId: string | null;
    onSave: (screenId: string | null) => void;
    isEditing?: boolean;
}

export const ConversionScreenSelectModal: React.FC<ConversionScreenSelectModalProps> = ({ isOpen, onClose, currentScreenId, onSave, isEditing }) => {
    const navigate = useNavigate();
    const { allConversionScreens } = useData();
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setSelectedId(currentScreenId);
        }
    }, [currentScreenId, isOpen]);

    const handleSave = () => {
        onSave(selectedId);
        onClose();
    };

    const handleCreateNew = () => {
        onClose();
        navigate('/conversions');
    };

    const modalFooter = (
        <>
            {!isEditing && <button onClick={handleCreateNew} style={styles.secondaryButton}>Create New Screen</button>}
            <button onClick={handleSave} style={styles.saveButton}>Save Selection</button>
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Set Conversion Screen" footer={modalFooter} size="medium">
            <div>
                <p style={styles.descriptionText}>Select one Conversion Screen to display at the end of your macrogame flow.</p>
                <ul style={{...styles.rewardsList, maxHeight: '40vh'}}>
                    {allConversionScreens.map(screen => (
                        <li key={screen.id} style={styles.rewardItem}>
                            <input
                                type="radio"
                                id={`screen-${screen.id}`}
                                name="screen-selection"
                                checked={selectedId === screen.id}
                                onChange={() => setSelectedId(screen.id)}
                            />
                            <label htmlFor={`screen-${screen.id}`} style={{ flex: 1, marginLeft: '0.5rem', cursor: 'pointer' }}>
                                <strong>{screen.name}</strong>
                            </label>
                        </li>
                    ))}
                </ul>
                {allConversionScreens.length === 0 && (
                    <p>No conversion screens have been created yet. Click "Create New Screen" to get started.</p>
                )}
            </div>
        </Modal>
    );
};