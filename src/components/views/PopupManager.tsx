// src/components/views/PopupManager.tsx

import React, { useState, useMemo } from 'react';
import { styles } from '../../App.styles';
import { Macrogame, Popup, Microgame, PopupSchedule } from '../../types';
import { UI_SKINS } from '../../constants';
import { ScheduleInput } from '../ui/ScheduleInput';
import { useData } from '../../context/DataContext';
import { PaginatedList } from '../ui/PaginatedList';
import { hasMacrogameIssues } from '../../utils/helpers';

const StarIcon: React.FC<{ isFavorite: boolean }> = ({ isFavorite }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24"
         fill={isFavorite ? '#ffc107' : 'none'}
         stroke={isFavorite ? '#ffc107' : 'currentColor'}
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
         style={{ cursor: 'pointer', color: '#606770' }}>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>
);

const getDefaultSchedule = (): PopupSchedule => ({
    days: { monday: false, tuesday: false, wednesday: false, thursday: false, friday: false, saturday: false, sunday: false },
    startTime: '00:00',
    endTime: '23:59',
    timezone: 'America/New_York',
});

const getPopupDisplayInfo = (popup: Popup, macrogames: Macrogame[], allMicrogames: Microgame[]) => {
    let alert: string | null = null;
    let effectiveStatus = popup.status;

    if (!popup.skinId) {
        alert = 'Configuration Needed: Select a UI skin.';
    }

    if (!popup.macrogameId) {
        alert = 'Configuration Needed: No macrogame linked.';
    } else {
        const macrogame = macrogames.find(m => m.id === popup.macrogameId);
        if (!macrogame) {
            alert = 'Needs Attention: The linked macrogame was deleted.';
            if (effectiveStatus === 'Active') effectiveStatus = 'Paused';
        } else if (hasMacrogameIssues(macrogame, allMicrogames)) {
            alert = 'Needs Attention: Contains an archived microgame.';
            if (effectiveStatus === 'Active') effectiveStatus = 'Paused';
        }
    }
    
    return { status: effectiveStatus, alert };
};

interface PopupManagerProps {
    handleEditPopup: (popup: Popup) => void;
}

export const PopupManager: React.FC<PopupManagerProps> = ({ handleEditPopup }) => {
    const { macrogames, popups, allMicrogames, customMicrogames, allRewards, createPopup, deletePopup, duplicatePopup, updatePopup, togglePopupFavorite, deleteMultiplePopups } = useData();

    const [newPopupName, setNewPopupName] = useState('');
    const [selectedMacrogameId, setSelectedMacrogameId] = useState('');
    const [schedule, setSchedule] = useState<PopupSchedule>(getDefaultSchedule());

    const sortedPopups = useMemo(() => [...popups].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [popups]);
    const favoritePopups = sortedPopups.filter(p => p.isFavorite);

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
        await createPopup(newPopup);
        setNewPopupName('');
        setSelectedMacrogameId('');
        setSchedule(getDefaultSchedule());
        alert('Popup created successfully!');
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
            if (!baseGame || baseGame.isActive === false) return null;
            if (flowItem.variantId) {
                const customVariant = customMicrogames.find(v => v.id === flowItem.variantId);
                const skinDataObject = customVariant?.skinData || {};
                const customSkinData = Object.keys(skinDataObject).reduce((acc, key) => {
                    acc[key] = skinDataObject[key].url;
                    return acc;
                }, {} as {[key: string]: string});
                return { ...baseGame, customSkinData };
            }
            return { ...baseGame, customSkinData: {} };
        }).filter((game): game is Microgame & { customSkinData: any } => !!game);

        const previewConfig = { popup, macrogame: { ...macrogameData, flow: flowWithDetails }, rewards: allRewards, skin: skinData };
        localStorage.setItem('macrogame_preview_data', JSON.stringify(previewConfig));
        window.open('/preview.html', '_blank');
    };
    
    const renderPopupItem = (popup: Popup, isSelected: boolean, onToggleSelect: () => void) => {
        const { status: effectiveStatus, alert } = getPopupDisplayInfo(popup, macrogames, allMicrogames);

        const statusStyle = {
            fontWeight: 'bold',
            color: effectiveStatus === 'Active' ? '#28a745' : (effectiveStatus === 'Paused' ? '#fd7e14' : '#6c757d')
        };
        
        return (
            <li key={popup.id} style={{ ...styles.rewardListItem, ...styles.listItemWithCheckbox }}>
                <input type="checkbox" checked={isSelected} onChange={onToggleSelect} />
                <div style={{...styles.rewardInfo, flex: 1}}>
                    <strong>{popup.name}</strong>
                    {alert && <span style={styles.warningTag}>{alert}</span>}
                    <div style={styles.rewardAnalytics}>
                        <span>Macrogame: {popup.macrogameName || 'N/A'}</span>
                        <span>Status: <span style={statusStyle}>{effectiveStatus}</span></span>
                    </div>
                </div>
                <div style={styles.rewardActions}>
                    <button onClick={() => handlePreview(popup)} style={styles.previewButton} disabled={!popup.skinId || effectiveStatus === 'Paused'} title={!popup.skinId ? "Edit popup to select a UI first" : "Preview Popup"}>Preview</button>
                    <button onClick={() => duplicatePopup(popup)} style={styles.editButton}>Duplicate</button>
                    <button onClick={() => handleEditPopup(popup)} style={styles.editButton}>Edit</button>
                    <button onClick={() => deletePopup(popup.id)} style={styles.deleteButton}>Delete</button>
                    <button onClick={() => togglePopupFavorite(popup.id, !popup.isFavorite)} style={{ background: 'none', border: 'none', padding: '0 0 0 0.5rem' }}>
                        <StarIcon isFavorite={!!popup.isFavorite} />
                    </button>
                </div>
            </li>
        );
    };

    return (
        <div style={styles.creatorSection}>
            <h2 style={styles.h2}>Popup Manager</h2>
            
            <form onSubmit={handleSavePopup}>
                <h3 style={styles.h3}>Create New Popup</h3>
                <div style={styles.formRow}><div style={styles.configItem}><label>Popup Name</label><input type="text" placeholder="e.g., Summer Sale Popup" value={newPopupName} onChange={e => setNewPopupName(e.target.value)} style={styles.input} /></div></div>
                <div style={styles.configRow}>
                    <div style={styles.configItem}>
                        <label>Macrogame</label>
                        <select value={selectedMacrogameId} onChange={e => setSelectedMacrogameId(e.target.value)} style={styles.input}>
                            <option value="">Select a macrogame...</option>
                            {macrogames.map(game => {
                                const hasIssues = hasMacrogameIssues(game, allMicrogames);
                                return (
                                    <option key={game.id} value={game.id} disabled={hasIssues} style={{ color: hasIssues ? '#999' : 'inherit' }}>
                                        {hasIssues ? '⚠️ ' : ''}{game.name}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                    <div style={styles.configItem}><label>Trigger</label><select style={styles.input}><option>On Exit Intent</option></select></div>
                    <div style={styles.configItem}><label>Audience</label><select style={styles.input}><option>All Visitors</option></select></div>
                </div>
                <div style={styles.formRow}><div style={styles.configItem}><label>Schedule</label><ScheduleInput schedule={schedule} onChange={setSchedule} /></div></div>
                <button type="submit" style={{...styles.createButton, marginTop: '1rem'}}>Create Popup</button>
            </form>

            <div style={styles.rewardsListContainer}>
                {favoritePopups.length > 0 && (
                    <>
                        <h3 style={{...styles.h3, marginTop: '3rem'}}>Favorite Popups</h3>
                        <PaginatedList
                            items={favoritePopups}
                            renderItem={renderPopupItem}
                            bulkActions={[{
                                label: 'Delete Selected',
                                onAction: (selectedItems) => deleteMultiplePopups(selectedItems.map(item => item.id))
                            }]}
                            listContainerComponent="ul"
                            listContainerStyle={styles.rewardsListFull}
                        />
                    </>
                )}
                <h3 style={{...styles.h3, marginTop: '3rem'}}>All Popups</h3>
                {popups.length > 0 ? (
                    <PaginatedList
                        items={sortedPopups}
                        renderItem={renderPopupItem}
                        bulkActions={[{
                            label: 'Delete Selected',
                            onAction: (selectedItems) => deleteMultiplePopups(selectedItems.map(item => item.id))
                        }]}
                        listContainerComponent="ul"
                        listContainerStyle={styles.rewardsListFull}
                    />
                ) : <p>No popups created yet.</p>}
            </div>
        </div>
    );
};