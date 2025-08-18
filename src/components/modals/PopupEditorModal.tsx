import React, { useState, useEffect } from 'react';
import { styles } from '../../App.styles';
import { Popup, PopupSchedule } from '../../types';
import { UI_SKINS, SKIN_COLOR_SCHEMES } from '../../constants';
import { ScheduleInput } from '../ui/ScheduleInput';

const getDefaultSchedule = (): PopupSchedule => ({
    days: { monday: false, tuesday: false, wednesday: false, thursday: false, friday: false, saturday: false, sunday: false },
    startTime: '00:00',
    endTime: '23:59',
    timezone: 'America/New_York',
});

interface PopupEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    popup: Popup | null;
    onSave: (popupId: string, dataToUpdate: Partial<Popup>) => Promise<void>;
}

export const PopupEditorModal: React.FC<PopupEditorModalProps> = ({ isOpen, onClose, popup, onSave }) => {
    const [skinId, setSkinId] = useState('');
    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [colorScheme, setColorScheme] = useState('');
    const [trigger, setTrigger] = useState('exit_intent');
    const [audience, setAudience] = useState('all_visitors');
    const [schedule, setSchedule] = useState<PopupSchedule>(getDefaultSchedule());

    useEffect(() => {
        if (popup) {
            const initialSkinId = popup.skinId || '';
            setSkinId(initialSkinId);
            setTitle(popup.title || '');
            setSubtitle(popup.subtitle || '');
            setTrigger(popup.trigger || 'exit_intent');
            setAudience(popup.audience || 'all_visitors');
            setSchedule(popup.schedule || getDefaultSchedule());
            if (initialSkinId && SKIN_COLOR_SCHEMES[initialSkinId]) {
                const defaultColorScheme = Object.keys(SKIN_COLOR_SCHEMES[initialSkinId])[0];
                setColorScheme(popup.colorScheme || defaultColorScheme);
            } else {
                setColorScheme('');
            }
        }
    }, [popup]);

    const handleSkinChange = (newSkinId: string) => {
        setSkinId(newSkinId);
        if (newSkinId && SKIN_COLOR_SCHEMES[newSkinId]) {
            const defaultColorScheme = Object.keys(SKIN_COLOR_SCHEMES[newSkinId])[0];
            setColorScheme(defaultColorScheme);
        } else {
            setColorScheme('');
        }
    };

    if (!isOpen || !popup) return null;

    const handleSave = () => {
        const updatedData: Partial<Popup> = { skinId, title, subtitle, colorScheme, trigger, audience, schedule };
        onSave(popup.id, updatedData).then(onClose);
    };

    return (
        <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
                <div style={styles.modalHeader}>
                    <h2>Edit Popup: {popup.name}</h2>
                    <button onClick={onClose} style={styles.modalCloseButton}>&times;</button>
                </div>
                <div style={styles.modalBody}>
                    <div style={styles.configItem}>
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
                            <div style={styles.configItem}>
                                <label>Color Scheme</label>
                                <select value={colorScheme} onChange={e => setColorScheme(e.target.value)} style={styles.input}>
                                    {Object.entries(SKIN_COLOR_SCHEMES[skinId]).map(([id, name]) => (<option key={id} value={id}>{name}</option>))}
                                </select>
                            </div>
                            <div style={styles.configItem}><label>Trigger</label><select value={trigger} onChange={e => setTrigger(e.target.value)} style={styles.input}><option value="exit_intent">On Exit Intent</option></select></div>
                            <div style={styles.configItem}><label>Audience</label><select value={audience} onChange={e => setAudience(e.target.value)} style={styles.input}><option value="all_visitors">All Visitors</option></select></div>
                            <div style={styles.configItem}><label>Schedule</label><ScheduleInput schedule={schedule} onChange={setSchedule} /></div>
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