// src/components/modals/PopupEditorModal.tsx

import React, { useState, useEffect } from 'react';
import { Popup, Macrogame } from '../../types';
import { Modal } from '../ui/Modal';
import { PopupEditorFormFields } from './PopupEditorFormFields';
import { styles } from '../../App.styles';

interface PopupEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    popup: Popup | null;
    onSave: (popupId: string, dataToUpdate: Partial<Popup>) => Promise<void>;
    macrogames: Macrogame[];
}

const createDefaultPopup = (): Partial<Popup> => ({
    name: '',
    macrogameId: '',
    macrogameName: '',
    skinId: '',
    title: '',
    subtitle: '',
    colorScheme: '',
});

export const PopupEditorModal: React.FC<PopupEditorModalProps> = ({ isOpen, onClose, popup, onSave, macrogames }) => {
    const [cleanData, setCleanData] = useState<Partial<Popup> | null>(null);

    useEffect(() => {
        if (isOpen && popup) {
            // "Prepare" step: Merge existing data with defaults
            const dataForForm = {
                ...createDefaultPopup(),
                ...popup,
            };
            setCleanData(dataForForm);
        } else {
            // Clear data when modal closes
            setCleanData(null);
        }
    }, [isOpen, popup]);

    if (!isOpen) return null;

    const modalFooter = (
        <>
            <button type="button" onClick={onClose} style={styles.secondaryButton}>Cancel</button>
            <button type="button" onClick={() => document.getElementById('popup-editor-save-button')?.click()} style={styles.saveButton}>Save Changes</button>
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Popup" size="small" footer={modalFooter}>
            {/* "Render" step: Conditionally render form with clean data */}
            {cleanData && (
                <PopupEditorFormFields
                    key={cleanData.id}
                    initialData={cleanData}
                    onSave={onSave}
                    onClose={onClose}
                    macrogames={macrogames}
                />
            )}
        </Modal>
    );
};