// src/components/modals/PopupEditorFormFields.tsx

import React, { useState, useEffect } from 'react';
import { styles } from '../../App.styles';
import { Popup, Macrogame } from '../../types';
import { UI_SKINS, SKIN_COLOR_SCHEMES } from '../../constants';
import { useData } from '../../hooks/useData';
import { hasMacrogameIssues } from '../../utils/helpers';

interface PopupEditorFormFieldsProps {
    initialData: Partial<Popup>;
    onSave: (popupId: string, dataToUpdate: Partial<Popup>) => Promise<void>;
    onClose: () => void;
    macrogames: Macrogame[];
}

export const PopupEditorFormFields: React.FC<PopupEditorFormFieldsProps> = ({ initialData, onSave, onClose, macrogames }) => {
    const { allMicrogames } = useData();
    
    // Form state is now managed here
    const [name, setName] = useState(initialData.name || '');
    const [macrogameId, setMacrogameId] = useState(initialData.macrogameId || '');
    const [skinId, setSkinId] = useState(initialData.skinId || '');
    const [title, setTitle] = useState(initialData.title || '');
    const [subtitle, setSubtitle] = useState(initialData.subtitle || '');
    const [colorScheme, setColorScheme] = useState(initialData.colorScheme || '');

    // Effect to set the default color scheme when a skin is chosen
    useEffect(() => {
        if (skinId && SKIN_COLOR_SCHEMES[skinId] && !colorScheme) {
            const defaultColorScheme = Object.keys(SKIN_COLOR_SCHEMES[skinId])[0];
            setColorScheme(defaultColorScheme);
        }
    }, [skinId, colorScheme]);


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
        if (!initialData.id) return;
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
            colorScheme 
        };
        onSave(initialData.id, updatedData).then(onClose);
    };

    const selectedMacrogame = macrogames.find(m => m.id === macrogameId);
    const isCurrentSelectionInvalid = selectedMacrogame 
        ? hasMacrogameIssues(selectedMacrogame, allMicrogames) 
        : !selectedMacrogame && !!initialData.macrogameId;
    
    const macrogameSelectStyle = isCurrentSelectionInvalid 
        ? { ...styles.input, ...styles.inputAlert } 
        : styles.input;

    return (
        <>
            <div>
                <div style={styles.configItem}><label>Popup Name</label><input type="text" value={name} onChange={e => setName(e.target.value)} style={styles.input} /></div>
                <div style={{...styles.configItem, marginTop: '1rem'}}>
                    <label>Macrogame</label>
                    <select value={macrogameId} onChange={e => setMacrogameId(e.target.value)} style={macrogameSelectStyle}>
                        <option value="">Select a macrogame...</option>
                        {macrogames.map(game => {
                            const hasIssues = hasMacrogameIssues(game, allMicrogames);
                            const isDisabled = hasIssues && game.id !== macrogameId;
                            return (<option key={game.id} value={game.id} disabled={isDisabled} style={{ color: hasIssues ? '#999' : 'inherit' }}>{hasIssues ? '⚠️ ' : ''}{game.name}</option>);
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
            {/* This button is hidden but allows the external footer to trigger form submission */}
            <button id="popup-editor-save-button" type="button" onClick={handleSave} style={{ display: 'none' }} />
        </>
    );
};