// src/components/modals/PopupEditorModal.tsx

import React, { useState, useEffect } from 'react';
import { styles } from '../../App.styles';
import { Popup, Macrogame } from '../../types';
import { UI_SKINS, SKIN_COLOR_SCHEMES } from '../../constants';
import { useData } from '../../context/DataContext';
import { hasMacrogameIssues } from '../../utils/helpers';

interface PopupEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    popup: Popup | null;
    onSave: (popupId: string, dataToUpdate: Partial<Popup>) => Promise<void>;
    macrogames: Macrogame[];
}

export const PopupEditorModal: React.FC<PopupEditorModalProps> = ({ isOpen, onClose, popup, onSave, macrogames }) => {
    const { allMicrogames } = useData();
    const [name, setName] = useState('');
    const [macrogameId, setMacrogameId] = useState('');
    const [skinId, setSkinId] = useState('');
    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [colorScheme, setColorScheme] = useState('');

    useEffect(() => {
        if (popup) {
            const initialSkinId = popup.skinId || '';
            const macrogameExists = macrogames.some(mg => mg.id === popup.macrogameId);

            setMacrogameId(macrogameExists ? popup.macrogameId : '');
            setName(popup.name || '');
            setSkinId(initialSkinId);
            setTitle(popup.title || '');
            setSubtitle(popup.subtitle || '');
            
            if (initialSkinId && SKIN_COLOR_SCHEMES[initialSkinId]) {
                const defaultColorScheme = Object.keys(SKIN_COLOR_SCHEMES[initialSkinId])[0];
                setColorScheme(popup.colorScheme || defaultColorScheme);
            } else {
                setColorScheme('');
            }
        }
    }, [popup, macrogames]);

    const handleSkinChange = (newSkinId: string) => {
        setSkinId(newSkinId);
        if (newSkinId && SKIN_COLOR_SCHEMES[newSkinId]) {
            const defaultColorScheme = Object.keys(SKIN_COLOR_SCHEMES[newSkinId])[0];
            setColorScheme(defaultColorScheme);
        } else {
            setColorScheme('');
        }
    };

    const handleSave = () => {
        if (!popup) return;
        if (!macrogameId) {
            alert('Please select a macrogame for the popup.');
            return;
        }
        const selectedMacrogame = macrogames.find(mg => mg.id === macrogameId);
        const updatedData: Partial<Popup> = { 
            name, 
            macrogameId,
            macrogameName: selectedMacrogame?.name || '',
            skinId, 
            title, 
            subtitle, 
            colorScheme, 
        };
        onSave(popup.id, updatedData).then(onClose);
    };

    if (!isOpen || !popup) return null;

    const selectedMacrogame = macrogames.find(m => m.id === macrogameId);
    const isCurrentSelectionInvalid = selectedMacrogame ? hasMacrogameIssues(selectedMacrogame, allMicrogames) : !selectedMacrogame && !!popup.macrogameId;
    const macrogameSelectStyle = isCurrentSelectionInvalid ? { ...styles.input, ...styles.inputAlert } : styles.input;

    return (
        <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
                <div style={styles.modalHeader}>
                    <h2>Edit Popup</h2>
                    <button onClick={onClose} style={styles.modalCloseButton}>&times;</button>
                </div>
                <div style={styles.modalBody}>
                    <div style={styles.configItem}><label>Popup Name</label><input type="text" value={name} onChange={e => setName(e.target.value)} style={styles.input} /></div>
                    
                    <div style={{...styles.configItem, marginTop: '1rem'}}>
                        <label>Macrogame</label>
                        <select value={macrogameId} onChange={e => setMacrogameId(e.target.value)} style={macrogameSelectStyle}>
                            <option value="">Select a macrogame...</option>
                            {macrogames.map(game => {
                                const hasIssues = hasMacrogameIssues(game, allMicrogames);
                                const isDisabled = hasIssues && game.id !== macrogameId;
                                return (
                                    <option key={game.id} value={game.id} disabled={isDisabled} style={{ color: hasIssues ? '#999' : 'inherit' }}>
                                        {hasIssues ? '⚠️ ' : ''}{game.name}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    <div style={{...styles.configItem, marginTop: '1rem'}}>
                        <label>Popup UI Skin</label>
                        <select value={skinId} onChange={e => handleSkinChange(e.target.value)} style={styles.input}>
                            <option value="">Select a Popup Skin...</option>
                            {UI_SKINS.map(skin => <option key={skin.id} value={skin.id}>{skin.name}</option>)}
                        </select>
                    </div>

                    {skinId && SKIN_COLOR_SCHEMES[skinId] && (
                        <div style={styles.configSection}>
                            <div style={styles.configItem}><label>Title</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} style={styles.input} placeholder="e.g., Special Offer!" /></div>
                            <div style={styles.configItem}><label>Subtitle</label><input type="text" value={subtitle} onChange={e => setSubtitle(e.target.value)} style={styles.input} placeholder="e.g., Play to win a prize" /></div>
                            <div style={styles.configItem}><label>Color Scheme</label><select value={colorScheme} onChange={e => setColorScheme(e.target.value)} style={styles.input}>{Object.entries(SKIN_COLOR_SCHEMES[skinId]).map(([id, name]) => (<option key={id} value={id}>{name}</option>))}</select></div>
                        </div>
                    )}
                </div>
                <div style={styles.modalFooter}>
                    <button onClick={onClose} style={styles.secondaryButton}>Cancel</button>
                    <button onClick={handleSave} style={styles.saveButton}>Save Changes</button>
                </div>
            </div>
        </div>
    );
};