// src/components/views/DeliveryManager.tsx

import React, { useState, useMemo } from 'react';
import { styles } from '../../App.styles';
import { Macrogame, Popup, Microgame, Campaign } from '../../types';
import { UI_SKINS, SKIN_COLOR_SCHEMES, YES_NO_ALL_OPTIONS } from '../../constants';
import { useData } from '../../hooks/useData';
import { PaginatedList } from '../ui/PaginatedList';
import { hasMacrogameIssues } from '../../utils/helpers';
import { FilterBar, FilterConfig } from '../ui/FilterBar';

const StarIcon: React.FC<{ isFavorite: boolean }> = ({ isFavorite }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
         fill={isFavorite ? '#ffc107' : 'none'}
         stroke={isFavorite ? '#ffc107' : 'currentColor'}
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
         style={{ cursor: 'pointer', color: '#606770' }}>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>
);

const getPopupDisplayInfo = (popup: Popup, macrogames: Macrogame[], allMicrogames: Microgame[], campaigns: Campaign[]) => {
    let alert: string | null = null;
    let effectiveStatus: Popup['status'] = 'Draft';

    if (!popup.skinId) alert = 'Configuration Needed: Select a UI skin.';
    const macrogame = macrogames.find(m => m.id === popup.macrogameId);
    if (!macrogame) alert = 'Needs Attention: The linked macrogame was deleted.';
    else if (hasMacrogameIssues(macrogame, allMicrogames)) alert = 'Needs Attention: Contains an archived microgame.';
    
    if (alert) {
        return { status: 'Paused' as const, alert };
    }

    if (popup.campaignId) {
        const campaign = campaigns.find(c => c.id === popup.campaignId);
        if (campaign) {
            effectiveStatus = campaign.status;
        }
    }
    
    return { status: effectiveStatus, alert: null };
};

interface DeliveryManagerProps {
    handleEditPopup: (popup: Popup) => void;
}

export const DeliveryManager: React.FC<DeliveryManagerProps> = ({ handleEditPopup }) => {
    const { campaigns, macrogames, popups, allMicrogames, customMicrogames, allRewards, createPopup, deletePopup, duplicatePopup, togglePopupFavorite, deleteMultiplePopups } = useData();

    const [filters, setFilters] = useState({
        searchTerm: '', macrogameFilter: 'All', skinFilter: 'All',
        titleFilter: 'All', subtitleFilter: 'All', campaignFilter: 'All',
        statusFilter: 'All'
    });

    const [newDeliveryData, setNewDeliveryData] = useState({
        name: '',
        deliveryMethod: '', // 'popup_modal', 'new_webpage', 'section_of_webpage'
        macrogameId: '',
        skinId: '',
        title: '',
        subtitle: '',
        colorScheme: ''
    });

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleResetFilters = () => {
        setFilters({
            searchTerm: '', macrogameFilter: 'All', skinFilter: 'All',
            titleFilter: 'All', subtitleFilter: 'All', campaignFilter: 'All',
            statusFilter: 'All'
        });
    };

    const sortedPopups = useMemo(() => [...popups].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [popups]);

    const filteredPopups = useMemo(() => {
        return sortedPopups
            .filter(p => p.name.toLowerCase().includes(filters.searchTerm.toLowerCase()))
            .filter(p => filters.macrogameFilter === 'All' || p.macrogameName === filters.macrogameFilter)
            .filter(p => {
                if (filters.skinFilter === 'All') return true;
                const skin = UI_SKINS.find(s => s.name === filters.skinFilter);
                return p.skinId === skin?.id;
            })
            .filter(p => {
                if (filters.titleFilter === 'All') return true;
                return filters.titleFilter === 'Yes' ? !!p.title : !p.title;
            })
            .filter(p => {
                if (filters.subtitleFilter === 'All') return true;
                return filters.subtitleFilter === 'Yes' ? !!p.subtitle : !p.subtitle;
            })
            .filter(p => {
                if (filters.campaignFilter === 'All') return true;
                return filters.campaignFilter === 'Yes' ? !!p.campaignId : !p.campaignId;
            })
            .filter(p => {
                if (filters.statusFilter === 'All') return true;
                const { status } = getPopupDisplayInfo(p, macrogames, allMicrogames, campaigns);
                return status === filters.statusFilter;
            });
    }, [sortedPopups, filters, macrogames, allMicrogames, campaigns]);

    const favoritePopups = useMemo(() => filteredPopups.filter(p => p.isFavorite), [filteredPopups]);

    const handleInputChange = (field: keyof typeof newDeliveryData, value: string) => {
        setNewDeliveryData(prev => ({...prev, [field]: value}));
        if (field === 'skinId') {
            if (value && SKIN_COLOR_SCHEMES[value]) {
                const defaultColorScheme = Object.keys(SKIN_COLOR_SCHEMES[value])[0];
                setNewDeliveryData(prev => ({...prev, colorScheme: defaultColorScheme}));
            } else {
                setNewDeliveryData(prev => ({...prev, colorScheme: ''}));
            }
        }
    };

    const resetForm = () => {
        setNewDeliveryData({ name: '', deliveryMethod: '', macrogameId: '', skinId: '', title: '', subtitle: '', colorScheme: ''});
    };

    const handleSaveDelivery = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Handle based on delivery method
        if (newDeliveryData.deliveryMethod === 'popup_modal') {
             if (!newDeliveryData.name || !newDeliveryData.macrogameId || !newDeliveryData.skinId) {
                alert('Please provide a name, select a macrogame, and select a skin for the popup.');
                return;
            }
            const selectedGame = macrogames.find(g => g.id === newDeliveryData.macrogameId);
            if (!selectedGame) { alert('Selected macrogame not found.'); return; }

            const newPopup: Omit<Popup, 'id'> = {
                name: newDeliveryData.name,
                macrogameId: selectedGame.id,
                macrogameName: selectedGame.name,
                skinId: newDeliveryData.skinId,
                title: newDeliveryData.title,
                subtitle: newDeliveryData.subtitle,
                colorScheme: newDeliveryData.colorScheme,
                status: 'Draft',
                views: 0,
                engagements: 0,
                createdAt: new Date().toISOString(),
            };
            await createPopup(newPopup);
            resetForm();
            alert('Popup created successfully!');
        }
        // Future logic for other delivery methods will go here
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
    
    const renderPopupItem = (popup: Popup, isSelected: boolean, onToggleSelect: () => void) => {
        const { status: effectiveStatus, alert } = getPopupDisplayInfo(popup, macrogames, allMicrogames, campaigns);
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

    const filterConfig: FilterConfig[] = [
        { type: 'select', label: 'Macrogame', options: ['All', ...macrogames.map(m => m.name)], stateKey: 'macrogameFilter' },
        { type: 'select', label: 'UI Skin', options: ['All', ...UI_SKINS.map(s => s.name)], stateKey: 'skinFilter' },
        { type: 'select', label: 'Has Title', options: YES_NO_ALL_OPTIONS, stateKey: 'titleFilter' },
        { type: 'select', label: 'Has Subtitle', options: YES_NO_ALL_OPTIONS, stateKey: 'subtitleFilter' },
        { type: 'select', label: 'In Campaign', options: YES_NO_ALL_OPTIONS, stateKey: 'campaignFilter' },
        { type: 'select', label: 'Status', options: ['All', 'Active', 'Draft', 'Paused'], stateKey: 'statusFilter' },
    ];

    const getButtonText = () => {
        switch (newDeliveryData.deliveryMethod) {
            case 'popup_modal': return 'Create Popup';
            case 'new_webpage': return 'Create Webpage';
            case 'section_of_webpage': return 'Create Section';
            default: return 'Create';
        }
    };

    return (
        <div style={styles.creatorSection}>
            <h2 style={styles.h2}>Delivery Manager</h2>
            
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
                <button type="submit" style={{...styles.createButton, marginTop: '1.5rem'}}>{getButtonText()}</button>
            </form>

            <div style={{...styles.managerHeader, marginTop: '3rem'}}>
                <h3 style={{...styles.h3, border: 'none', margin: 0}}>Manage Existing Delivery Methods</h3>
                <div style={styles.configItem}>
                    <label>Showing:</label>
                    <select style={styles.input} disabled>
                        <option>Popups</option>
                    </select>
                </div>
            </div>

            <div style={styles.filterContainer}>
                <div style={styles.configItem}>
                    <label>Search Popups</label>
                    <input
                        type="text"
                        placeholder="Search by name..."
                        value={filters.searchTerm}
                        onChange={e => handleFilterChange('searchTerm', e.target.value)}
                        style={styles.input}
                    />
                </div>
                <FilterBar filters={filterConfig} filterValues={filters} onFilterChange={handleFilterChange} onResetFilters={handleResetFilters} />
            </div>

            <div style={styles.rewardsListContainer}>
                {favoritePopups.length > 0 && (
                    <>
                        <h3 style={{...styles.h3, marginTop: '1rem'}}>Favorite Popups</h3>
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
                        items={filteredPopups}
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