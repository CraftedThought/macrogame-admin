// src/components/views/DeliveryManager.tsx

import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';
import { styles } from '../../App.styles';
import { Popup } from '../../types';
import { useData } from '../../hooks/useData';
import { DeliveryMethodManagerTab } from './DeliveryMethodManagerTab';
import { StarIcon } from '../ui/StarIcon';
import { hasMacrogameIssues } from '../../utils/helpers';
import { SKIN_COLOR_SCHEMES, UI_SKINS } from '../../constants';

const ConfirmationToast: React.FC<{ t: any; message: string; onConfirm: () => void; }> = ({ t, message, onConfirm }) => (
    <div style={{ background: '#333', color: 'white', padding: '12px 16px', borderRadius: '8px', boxShadow: '0 3px 10px rgba(0, 0, 0, 0.2)', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span>{message}</span>
        <div style={{ display: 'flex', gap: '8px' }}>
            <button style={{ background: '#27ae60', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }} onClick={() => { onConfirm(); toast.dismiss(t.id); }}>Confirm</button>
            <button style={{ background: '#7f8c8d', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }} onClick={() => toast.dismiss(t.id)}>Cancel</button>
        </div>
    </div>
);

type DeliveryTab = 'Unconfigured' | 'Popup' | 'OnPageSection' | 'NewWebpage';

interface DeliveryManagerProps {
    handleEditPopup: (popup: Popup) => void;
}

export const DeliveryManager: React.FC<DeliveryManagerProps> = ({ handleEditPopup }) => {
    const { popups, createPopup, deletePopup, duplicatePopup, togglePopupFavorite, deleteMultiplePopups, macrogames, allMicrogames } = useData();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState<DeliveryTab>(location.state?.defaultTab || 'Unconfigured');

    // --- CREATE FORM LOGIC (Unchanged) ---
    const [newDeliveryData, setNewDeliveryData] = useState({ name: '', deliveryMethod: '', macrogameId: '', skinId: '', title: '', subtitle: '', colorScheme: '' });

    const handleInputChange = (field: keyof typeof newDeliveryData, value: string) => {
        setNewDeliveryData(prev => ({...prev, [field]: value}));
        if (field === 'skinId' && value && SKIN_COLOR_SCHEMES[value]) {
            const defaultColorScheme = Object.keys(SKIN_COLOR_SCHEMES[value])[0];
            setNewDeliveryData(prev => ({...prev, colorScheme: defaultColorScheme}));
        }
    };

    const handleSaveDelivery = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDeliveryData.name || !newDeliveryData.macrogameId || !newDeliveryData.skinId) {
            toast.error('Please provide a name, select a macrogame, and select a skin.');
            return;
        }
        const selectedGame = macrogames.find(g => g.id === newDeliveryData.macrogameId);
        if (!selectedGame) {
            toast.error('Selected macrogame not found.');
            return;
        }

        const newPopup: Omit<Popup, 'id'> = {
            name: newDeliveryData.name, macrogameId: selectedGame.id, macrogameName: selectedGame.name,
            skinId: newDeliveryData.skinId, title: newDeliveryData.title, subtitle: newDeliveryData.subtitle,
            colorScheme: newDeliveryData.colorScheme, status: 'Draft', views: 0, engagements: 0,
            createdAt: new Date().toISOString(),
        };
        await createPopup(newPopup);
        setNewDeliveryData({ name: '', deliveryMethod: '', macrogameId: '', skinId: '', title: '', subtitle: '', colorScheme: ''});
        toast.success('Popup created successfully!');
    };
    // --- END CREATE FORM LOGIC ---

    // Pre-filter popups into categories
    const { configuredPopups, unconfiguredPopups } = useMemo(() => {
        const configured: Popup[] = [];
        const unconfigured: Popup[] = [];
        popups.forEach(p => {
            if (!p.macrogameId || !p.skinId || hasMacrogameIssues(macrogames.find(m => m.id === p.macrogameId)!, allMicrogames)) {
                unconfigured.push(p);
            } else {
                configured.push(p);
            }
        });
        return { configuredPopups: configured, unconfiguredPopups: unconfigured };
    }, [popups, macrogames, allMicrogames]);

    const confirmAction = (message: string, onConfirm: () => void) => {
        toast.custom((t) => (
            <ConfirmationToast t={t} message={message} onConfirm={onConfirm} />
        ), { duration: 6000, position: 'top-center' });
    };

    const handleDeletePopup = (popupId: string) => {
        const itemType = activeTab === 'Unconfigured' ? 'unconfigured item' : 'popup';
        confirmAction(`Delete this ${itemType}?`, async () => {
            await deletePopup(popupId);
            toast.success(`${itemType.charAt(0).toUpperCase() + itemType.slice(1)} deleted.`);
        });
    };

    const handleDeleteMultiplePopups = (ids: string[]) => {
        if (ids.length === 0) return;
        const itemType = activeTab === 'Unconfigured' ? 'items' : 'popups';
        confirmAction(`Delete ${ids.length} ${itemType}?`, async () => {
            await deleteMultiplePopups(ids);
            toast.success(`${ids.length} ${itemType} deleted.`);
        });
    };

    const handlePreview = (popup: Popup) => {
        if (!popup.skinId || !popup.macrogameId) {
            alert("This popup needs a Macrogame and a UI skin configured before it can be previewed.");
            return;
        }

        // We now pass the necessary IDs and the popup object itself to the preview.
        const previewConfig = { 
            macrogameId: popup.macrogameId,
            skinId: popup.skinId,
            popup: popup, // Pass the whole popup so the preview can use its title/subtitle
            isPreviewMode: 'full_macrogame'
        };
        localStorage.setItem('macrogame_preview_data', JSON.stringify(previewConfig));
        window.open('/preview.html', '_blank');
    };

    const renderPopupItem = (popup: Popup, isSelected: boolean, onToggleSelect: () => void) => (
        <li key={popup.id} style={{ ...styles.rewardListItem, ...styles.listItemWithCheckbox }}>
            <input type="checkbox" checked={isSelected} onChange={onToggleSelect} />
            <div style={{...styles.rewardInfo, flex: 1}}>
                <strong>{popup.name}</strong>
                {(!popup.macrogameId || !popup.skinId) && <span style={styles.warningTag}>Configuration Needed</span>}
                <div style={styles.rewardAnalytics}>
                    <span>Macrogame: {popup.macrogameName || 'N/A'}</span>
                    <span>Skin: {UI_SKINS.find(s => s.id === popup.skinId)?.name || 'N/A'}</span>
                </div>
            </div>
            <div style={styles.rewardActions}>
                <button onClick={() => handlePreview(popup)} style={styles.previewButton} disabled={!popup.skinId}>Preview</button>
                <button onClick={() => duplicatePopup(popup)} style={styles.editButton}>Duplicate</button>
                <button onClick={() => handleEditPopup(popup)} style={styles.editButton}>Edit</button>
                <button onClick={() => handleDeletePopup(popup.id)} style={styles.deleteButton}>Delete</button>
                <button onClick={() => togglePopupFavorite(popup.id, !popup.isFavorite)} style={{ background: 'none', border: 'none', padding: '0 0 0 0.5rem' }}>
                    <StarIcon isFavorite={!!popup.isFavorite} />
                </button>
            </div>
        </li>
    );

    const popupFilterConfig: FilterConfig[] = [
        { type: 'select', label: 'Macrogame', options: ['All', ...new Set(macrogames.map(m => m.name))], stateKey: 'macrogameFilter' },
        { type: 'select', label: 'UI Skin', options: ['All', ...UI_SKINS.map(s => s.name)], stateKey: 'skinFilter' },
        { type: 'select', label: 'In Campaign', options: ['All', 'Yes', 'No'], stateKey: 'campaignFilter' },
    ];

    return (
        <div style={styles.creatorSection}>
            <h2 style={styles.h2}>Delivery Manager</h2>

            {/* CREATE FORM - Stays at the top */}
            <form onSubmit={handleSaveDelivery}>
                <h3 style={styles.h3}>Create New Delivery Method</h3>
                <div style={styles.configRow}>
                    <div style={styles.configItem}><label>Delivery Name</label><input type="text" placeholder="e.g., Summer Sale Popup" value={newDeliveryData.name} onChange={e => handleInputChange('name', e.target.value)} style={styles.input} /></div>
                    <div style={styles.configItem}>
                        <label>Select Delivery Method</label>
                        <select value={newDeliveryData.deliveryMethod} onChange={e => handleInputChange('deliveryMethod', e.target.value)} style={styles.input}>
                            <option value="">Select a method...</option>
                            <option value="popup_modal">Popup Modal</option>
                            <option value="new_webpage" disabled>New Webpage (Coming Soon)</option>
                            <option value="section_of_webpage" disabled>Section of Existing Webpage (Coming Soon)</option>
                        </select>
                    </div>
                </div>

                {newDeliveryData.deliveryMethod === 'popup_modal' && (
                    <>
                        <div style={{...styles.configItem, marginTop: '1rem'}}>
                            <label>Select Macrogame</label>
                            <select value={newDeliveryData.macrogameId} onChange={e => handleInputChange('macrogameId', e.target.value)} style={styles.input}>
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
                        <div style={{...styles.configItem, marginTop: '1rem'}}>
                            <label>Popup UI Skin</label>
                            <select value={newDeliveryData.skinId} onChange={e => handleInputChange('skinId', e.target.value)} style={styles.input}>
                                <option value="">Select a Popup Skin...</option>
                                {UI_SKINS.map(skin => <option key={skin.id} value={skin.id}>{skin.name}</option>)}
                            </select>
                        </div>
                        {newDeliveryData.skinId && SKIN_COLOR_SCHEMES[newDeliveryData.skinId] && (
                            <div style={styles.configSection}>
                                <div style={styles.configRow}>
                                    <div style={styles.configItem}><label>Title</label><input type="text" value={newDeliveryData.title} onChange={e => handleInputChange('title', e.target.value)} style={styles.input} placeholder="e.g., Special Offer!" /></div>
                                    <div style={styles.configItem}><label>Subtitle</label><input type="text" value={newDeliveryData.subtitle} onChange={e => handleInputChange('subtitle', e.target.value)} style={styles.input} placeholder="e.g., Play to win a prize" /></div>
                                    <div style={styles.configItem}><label>Color Scheme</label><select value={newDeliveryData.colorScheme} onChange={e => handleInputChange('colorScheme', e.target.value)} style={styles.input}>{Object.entries(SKIN_COLOR_SCHEMES[newDeliveryData.skinId]).map(([id, name]) => (<option key={id} value={id}>{name}</option>))}</select></div>
                                </div>
                            </div>
                        )}
                    </>
                )}
                <button type="submit" style={{...styles.createButton, marginTop: '1.5rem'}}>Create Popup</button>
            </form>

            {/* TABS */}
            <div style={{...styles.tabContainer, marginTop: '3rem'}}>
                <button onClick={() => setActiveTab('Unconfigured')} style={activeTab === 'Unconfigured' ? {...styles.tabButton, ...styles.tabButtonActive} : styles.tabButton}>Unconfigured</button>
                <button onClick={() => setActiveTab('Popup')} style={activeTab === 'Popup' ? {...styles.tabButton, ...styles.tabButtonActive} : styles.tabButton}>Popup</button>
                <button disabled style={styles.tabButton}>On-Page Section</button>
                <button disabled style={styles.tabButton}>New Webpage</button>
            </div>

            {/* TAB CONTENT */}
            {activeTab === 'Unconfigured' && (
                <DeliveryMethodManagerTab
                    items={unconfiguredPopups}
                    renderItem={renderPopupItem}
                    onDeleteMultiple={handleDeleteMultiplePopups}
                    filterConfig={popupFilterConfig} // <-- PASS FILTERS
                    itemTypeName={"Unconfigured Items"}
                />
            )}
            {activeTab === 'Popup' && (
                <DeliveryMethodManagerTab
                    items={configuredPopups}
                    renderItem={renderPopupItem}
                    onDeleteMultiple={handleDeleteMultiplePopups}
                    filterConfig={popupFilterConfig} // <-- PASS FILTERS
                    itemTypeName={"Popups"}
                />
            )}
        </div>
    );
};