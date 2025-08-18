import React, { useState } from 'react';
import { styles } from '../../App.styles';
import { Macrogame, Reward, Popup, Microgame, CustomMicrogame, PopupSchedule } from '../../types';
import { UI_SKINS } from '../../constants';
import { ScheduleInput } from '../ui/ScheduleInput';
import { useData } from '../../context/DataContext'; // <-- IMPORT HOOK

const getDefaultSchedule = (): PopupSchedule => ({
    days: { monday: false, tuesday: false, wednesday: false, thursday: false, friday: false, saturday: false, sunday: false },
    startTime: '00:00',
    endTime: '23:59',
    timezone: 'America/New_York',
});

interface PopupManagerProps {
    // Props passed from App.tsx (UI state control)
    handleEditPopup: (popup: Popup) => void;
}

export const PopupManager: React.FC<PopupManagerProps> = ({ handleEditPopup }) => {
    // Get data and data-related functions from the hook
    const { macrogames, popups, allRewards, allMicrogames, customMicrogames, createPopup, deletePopup, duplicatePopup } = useData();

    const [newPopupName, setNewPopupName] = useState('');
    const [selectedMacrogameId, setSelectedMacrogameId] = useState('');
    const [schedule, setSchedule] = useState<PopupSchedule>(getDefaultSchedule());

    const handleSavePopup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPopupName || !selectedMacrogameId) {
            alert('Please provide a popup name and select a macrogame.');
            return;
        }
        const selectedGame = macrogames.find(g => g.id === selectedMacrogameId);
        if (!selectedGame) {
            alert('Selected macrogame not found.');
            return;
        }
        const newPopup: Omit<Popup, 'id'> = {
            name: newPopupName,
            macrogameId: selectedGame.id,
            macrogameName: selectedGame.name,
            status: 'Draft',
            views: 0,
            engagements: 0,
            createdAt: new Date().toISOString(),
            trigger: 'exit_intent',
            audience: 'all_visitors',
            schedule: schedule,
        };
        await createPopup(newPopup); // Use function from context
        setNewPopupName('');
        setSelectedMacrogameId('');
        setSchedule(getDefaultSchedule());
    };

    const handlePreview = (popup: Popup) => {
        if (!popup.skinId) {
            alert("This popup needs a UI skin configured before it can be previewed. Please click 'Edit' to select one.");
            return;
        }
        const macrogameData = macrogames.find(mg => mg.id === popup.macrogameId);
        const skinData = UI_SKINS.find(s => s.id === popup.skinId);
        if (!macrogameData || !skinData) {
            alert("Macrogame or Skin data not found for this popup!");
            return;
        }

        const flowWithDetails = macrogameData.flow.map(flowItem => {
            const baseGame = allMicrogames.find(mg => mg.id === flowItem.microgameId);
            if (!baseGame) return null;
            if (flowItem.variantId) {
                const customVariant = customMicrogames.find(v => v.id === flowItem.variantId);
                return { ...baseGame, customSkinData: customVariant?.skinData || {} };
            }
            return { ...baseGame, customSkinData: {} };
        }).filter((game): game is Microgame & { customSkinData: any } => !!game);

        const previewConfig = { popup, macrogame: { ...macrogameData, flow: flowWithDetails }, rewards: allRewards, skin: skinData };
        localStorage.setItem('macrogame_preview_data', JSON.stringify(previewConfig));
        window.open('/preview.html', '_blank');
    };

    return (
        <div style={styles.creatorSection}>
            <h2 style={styles.h2}>Popup Manager</h2>
            <div style={styles.rewardsPageLayout}>
                <div style={styles.rewardsListContainer}>
                    <h3 style={styles.h3}>Existing Popups</h3>
                    {popups.length > 0 ? (
                        <ul style={styles.rewardsListFull}>
                            {popups.map(popup => (
                                <li key={popup.id} style={styles.rewardListItem}>
                                    <div style={styles.rewardInfo}>
                                        <strong>{popup.name}</strong>
                                        {!popup.skinId && <span style={styles.warningTag}>Configuration Needed!</span>}
                                        <div style={styles.rewardAnalytics}>
                                            <span>Macrogame: {popup.macrogameName}</span>
                                            <span>Status: <span style={popup.status === 'Active' ? styles.statusActive : styles.statusDraft}>{popup.status}</span></span>
                                        </div>
                                    </div>
                                    <div style={styles.rewardActions}>
                                        <button onClick={() => { }} style={styles.publishButton}>Publish</button>
                                        <button onClick={() => handlePreview(popup)} style={styles.previewButton} disabled={!popup.skinId} title={!popup.skinId ? "Edit popup to select a UI first" : "Preview Popup"}>Preview</button>
                                        <button onClick={() => duplicatePopup(popup)} style={styles.editButton}>Duplicate</button>
                                        <button onClick={() => handleEditPopup(popup)} style={styles.editButton}>Edit</button>
                                        <button onClick={() => deletePopup(popup.id)} style={styles.deleteButton}>Delete</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : <p>No popups created yet.</p>}
                </div>
                <form onSubmit={handleSavePopup} style={styles.rewardsCreateForm}>
                    <h3 style={styles.h3}>Create New Popup</h3>
                    <div style={styles.configItem}><label>Popup Name</label><input type="text" placeholder="e.g., Summer Sale Popup" value={newPopupName} onChange={e => setNewPopupName(e.target.value)} style={styles.input} /></div>
                    <div style={styles.configItem}><label>Macrogame</label><select value={selectedMacrogameId} onChange={e => setSelectedMacrogameId(e.target.value)} style={styles.input}><option value="">Select a macrogame...</option>{macrogames.map(game => (<option key={game.id} value={game.id}>{game.name}</option>))}</select></div>
                    <div style={styles.configItem}><label>Trigger</label><select style={styles.input}><option>On Exit Intent</option></select></div>
                    <div style={styles.configItem}><label>Audience</label><select style={styles.input}><option>All Visitors</option></select></div>
                    <div style={styles.configItem}><label>Schedule</label><ScheduleInput schedule={schedule} onChange={setSchedule} /></div>
                    <button type="submit" style={styles.createButton}>Save Popup</button>
                </form>
            </div>
        </div>
    );
};