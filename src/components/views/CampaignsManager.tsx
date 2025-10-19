// src/components/views/CampaignsManager.tsx

import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { styles } from '../../App.styles';
import { Campaign } from '../../types';
import { useData } from '../../hooks/useData';
import { PaginatedList } from '../ui/PaginatedList';
import { CampaignFormModal } from '../modals/CampaignFormModal';
import { FilterBar, FilterConfig } from '../ui/FilterBar';

export const CampaignsManager: React.FC = () => {
    const { campaigns, popups, createCampaign, updateCampaign, updateCampaignStatus, duplicateCampaign, deleteCampaign } = useData();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

    const [filters, setFilters] = useState({
        searchTerm: '',
        statusFilter: 'All',
        popupsFilter: [] as string[],
        popupsFilterLogic: 'any' as 'any' | 'all',
        audienceFilter: 'All',
        triggerFilter: 'All',
        scheduleFilter: 'All',
        abTestFilter: 'All',
    });

    const handleFilterChange = (key: string, value: string | string[]) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleResetFilters = () => {
        setFilters({
            searchTerm: '', statusFilter: 'All', popupsFilter: [], popupsFilterLogic: 'any',
            audienceFilter: 'All', triggerFilter: 'All', scheduleFilter: 'All', abTestFilter: 'All',
        });
    };
    
    const handleSaveCampaign = async (campaignData: Partial<Campaign>, campaignId: string | null) => {
        try {
            if (campaignId) {
                await updateCampaign(campaignId, campaignData);
                toast.success('Campaign updated successfully!');
            } else {
                await createCampaign(campaignData as Omit<Campaign, 'id'>);
                toast.success('Campaign created successfully!');
            }
            setEditingCampaign(null);
            setIsCreateModalOpen(false);
        } catch (error) {
            console.error("Failed to save campaign:", error);
            toast.error("There was an error saving the campaign.");
        }
    };
    
    const handleCreateNew = () => setIsCreateModalOpen(true);
    const handleEdit = (campaign: Campaign) => setEditingCampaign(campaign);
    
    const sortedCampaigns = useMemo(() => {
        return [...campaigns].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [campaigns]);

    const filteredCampaigns = useMemo(() => {
        return sortedCampaigns
            .filter(c => c.name.toLowerCase().includes(filters.searchTerm.toLowerCase()))
            .filter(c => filters.statusFilter === 'All' || c.status === filters.statusFilter)
            .filter(c => filters.audienceFilter === 'All' || c.displayRules.some(r => r.audience === filters.audienceFilter))
            .filter(c => filters.triggerFilter === 'All' || c.displayRules.some(r => r.trigger === filters.triggerFilter))
            .filter(c => {
                if (filters.popupsFilter.length === 0) return true;
                const campaignPopupIds = new Set(c.displayRules.flatMap(r => r.popups.map(p => p.popupId)));
                if (filters.popupsFilterLogic === 'all') {
                    // "Match ALL" (AND) logic
                    return filters.popupsFilter.every(selectedId => campaignPopupIds.has(selectedId));
                } else {
                    // "Match ANY" (OR) logic
                    return filters.popupsFilter.some(selectedId => campaignPopupIds.has(selectedId));
                }
            })
            .filter(c => {
                if (filters.abTestFilter === 'All') return true;
                const isAbTesting = c.displayRules.some(r => r.popups.length >= 2);
                return filters.abTestFilter === 'Yes' ? isAbTesting : !isAbTesting;
            })
            .filter(c => {
                if (filters.scheduleFilter === 'All') return true;
                return c.displayRules.some(r => {
                    const { days, startTime, endTime } = r.schedule;
                    if (filters.scheduleFilter === 'Weekdays' && (days.monday || days.tuesday || days.wednesday || days.thursday || days.friday)) return true;
                    if (filters.scheduleFilter === 'Weekends' && (days.saturday || days.sunday)) return true;
                    if (filters.scheduleFilter === 'AM' && startTime < '12:00') return true;
                    if (filters.scheduleFilter === 'PM' && endTime > '12:00') return true;
                    return false;
                });
            });
    }, [sortedCampaigns, filters]);

    const handleToggleStatus = (campaign: Campaign) => {
        const newStatus = campaign.status === 'Active' ? 'Draft' : 'Active';
        updateCampaignStatus(campaign.id, newStatus);
    };

    const renderCampaignItem = (campaign: Campaign, isSelected: boolean, onToggleSelect: () => void) => {
        const statusStyle = {
            fontWeight: 'bold',
            color: campaign.status === 'Active' ? '#28a745' : (campaign.status === 'Paused' ? '#fd7e14' : '#6c757d')
        };
        
        return (
            <li key={campaign.id} style={{ ...styles.rewardListItem, ...styles.listItemWithCheckbox }}>
                <input type="checkbox" checked={isSelected} onChange={onToggleSelect} />
                <div style={{...styles.rewardInfo, flex: 1}}>
                    <strong>{campaign.name}</strong>
                    <div style={styles.rewardAnalytics}>
                        <span>Popups: {campaign.displayRules.reduce((sum, r) => sum + r.popups.length, 0)}</span>
                        <span>Status: <span style={statusStyle}>{campaign.status}</span></span>
                    </div>
                </div>
                <div style={styles.rewardActions}>
                    <button onClick={() => handleToggleStatus(campaign)} style={styles.publishButton}>
                        {campaign.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => duplicateCampaign(campaign)} style={styles.editButton}>Duplicate</button>
                    <button onClick={() => handleEdit(campaign)} style={styles.editButton}>Edit</button>
                    <button onClick={() => deleteCampaign(campaign.id)} style={styles.deleteButton}>Delete</button>
                </div>
            </li>
        );
    };

    const filterConfig: FilterConfig[] = [
        { type: 'select', stateKey: 'statusFilter', label: 'Status', options: ['All', 'Active', 'Draft', 'Paused'] },
        { type: 'multiselect', stateKey: 'popupsFilter', label: 'Popups', options: popups.map(p => ({ value: p.id, label: p.name })) },
        { type: 'select', stateKey: 'audienceFilter', label: 'Audience', options: ['All', 'all_visitors', 'new_visitors', 'returning_visitors'] },
        { type: 'select', stateKey: 'triggerFilter', label: 'Trigger', options: ['All', 'exit_intent', 'timed', 'scroll'] },
        { type: 'select', stateKey: 'scheduleFilter', label: 'Schedule', options: ['All', 'AM', 'PM', 'Weekdays', 'Weekends'] },
        { type: 'select', stateKey: 'abTestFilter', label: 'A/B Testing', options: ['All', 'Yes', 'No'] },
    ];

    return (
        <div style={styles.creatorSection}>
             <CampaignFormModal 
                isOpen={isCreateModalOpen || !!editingCampaign}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    setEditingCampaign(null);
                }}
                onSave={handleSaveCampaign}
                existingCampaign={editingCampaign}
            />
            <div style={styles.managerHeader}>
                <h2 style={styles.h2}>Campaigns</h2>
                <button onClick={handleCreateNew} style={styles.saveButton}>Create New</button>
            </div>
            <p style={styles.descriptionText}>
                Campaigns control when and how your popups are shown to visitors. Create a campaign to set schedules, triggers, and audiences for one or more popups.
            </p>

            <div style={styles.filterContainer}>
                <div style={styles.configItem}>
                    <label>Search Campaigns</label>
                    <input
                        type="text"
                        placeholder="Search by name..."
                        value={filters.searchTerm}
                        onChange={e => handleFilterChange('searchTerm', e.target.value)}
                        style={styles.input}
                    />
                </div>
                <FilterBar filters={filterConfig} filterValues={filters} onFilterChange={handleFilterChange} onResetFilters={handleResetFilters} />
                <div style={{ padding: '0 1rem' }}>
                    {filters.popupsFilter.length > 0 && (
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.9rem' }}>
                            <label style={{ ...styles.filterLabel, marginBottom: 0 }}>Popup Match Logic:</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input
                                    type="radio"
                                    id="match-any"
                                    name="popupMatchLogic"
                                    value="any"
                                    checked={filters.popupsFilterLogic === 'any'}
                                    onChange={() => handleFilterChange('popupsFilterLogic', 'any')}
                                />
                                <label htmlFor="match-any">Match ANY</label>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input
                                    type="radio"
                                    id="match-all"
                                    name="popupMatchLogic"
                                    value="all"
                                    checked={filters.popupsFilterLogic === 'all'}
                                    onChange={() => handleFilterChange('popupsFilterLogic', 'all')}
                                />
                                <label htmlFor="match-all">Match ALL</label>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div style={styles.rewardsListContainer}>
                <h3 style={{...styles.h3, marginTop: '2rem'}}>All Campaigns</h3>
                {campaigns.length > 0 ? (
                    <PaginatedList
                        items={filteredCampaigns}
                        renderItem={renderCampaignItem}
                        // bulkActions={[{
                        //     label: 'Delete Selected',
                        //     onAction: (selectedItems) => alert(`Deleting ${selectedItems.length} campaigns`)
                        // }]}
                        listContainerComponent="ul"
                        listContainerStyle={styles.rewardsListFull}
                    />
                ) : <p>No campaigns created yet. Click "Create New Campaign" to get started.</p>}
            </div>
        </div>
    );
};