/* src/components/views/CampaignsManager.tsx */

import React, { useMemo, useState, useEffect } from 'react';
import { notifications } from '../../utils/notifications';
import { styles } from '../../App.styles';
// --- REFACTOR: Import DeliveryContainer instead of Popup ---
import { Campaign, DeliveryContainer, Macrogame } from '../../types';
import { useData } from '../../hooks/useData';
import { PaginatedList } from '../ui/PaginatedList';
import { CampaignFormModal } from '../modals/CampaignFormModal';
import { FilterBar, FilterConfig } from '../ui/FilterBar';

// --- Algolia & React InstantSearch Imports ---
import * as algoliasearch from 'algoliasearch';
import {
  InstantSearch,
  useHits,
  useSearchBox, // <-- THIS IS NEEDED
  useConfigure,
  useInstantSearch,
} from 'react-instantsearch';
// --- END Algolia Imports ---

// --- Initialize Algolia Search Client ---
const appId = import.meta.env.VITE_ALGOLIA_APP_ID;
const searchKey = import.meta.env.VITE_ALGOLIA_SEARCH_KEY;
const searchClient = algoliasearch.algoliasearch(appId, searchKey);
// --- END Algolia Client ---


// --- Mappings for Human-Readable Filter Labels ---
const AUDIENCE_OPTIONS = [
    { value: 'All', label: 'All' },
    { value: 'all_visitors', label: 'All Visitors' },
    { value: 'new_visitors', label: 'New Visitors' },
    { value: 'returning_visitors', label: 'Returning Visitors' },
];

const TRIGGER_OPTIONS = [
    { value: 'All', label: 'All' },
    { value: 'exit_intent', label: 'Exit Intent' },
    { value: 'timed', label: 'Timed Delay' },
    { value: 'scroll', label: 'Scroll Percentage' },
];

// --- MAPPING FOR NEW DELIVERY METHOD FILTER ---
const DELIVERY_METHOD_OPTIONS = [
    { value: 'All', label: 'All' },
    { value: 'popup_modal', label: 'Popup Modal' },
    { value: 'on_page_section', label: 'On-Page Section' },
    { value: 'new_webpage', label: 'New Webpage' },
];

// This helper function is still needed for client-side date logic
const getEffectiveCampaignStatus = (campaign: Campaign): { status: 'Active' | 'Scheduled' | 'Expired' | 'Paused' | 'Draft', message: string } => {
    if (campaign.status === 'Draft') return { status: 'Draft', message: 'Campaign is a draft.' };
    if (campaign.status === 'Paused') return { status: 'Paused', message: 'Campaign is manually paused.' };

    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalize to the start of the current day for accurate date comparison

    const startDate = campaign.startDate ? new Date(campaign.startDate) : null;
    const endDate = campaign.endDate ? new Date(campaign.endDate) : null;

    if (startDate && now < startDate) return { status: 'Scheduled', message: `Scheduled to start on ${startDate.toLocaleDateString()}` };
    if (endDate && now > endDate) return { status: 'Expired', message: `Ended on ${endDate.toLocaleDateString()}` };

    return { status: 'Active', message: 'Campaign is currently active.' };
};

// --- Inner component to connect to Algolia ---
const CampaignList = ({
    filters,
    handleToggleStatus,
    duplicateCampaign,
    handleEdit,
    deleteCampaign,
    deleteMultipleCampaigns,
}: {
    filters: any;
    handleToggleStatus: (campaign: Campaign) => void;
    duplicateCampaign: (campaign: Campaign) => Promise<void>;
    handleEdit: (campaign: Campaign) => void;
    deleteCampaign: (campaignId: string) => Promise<void>;
    deleteMultipleCampaigns: (ids: string[]) => Promise<void>;
}) => {
    // --- FIX: Remove useSearchBox from here ---

    // This hook configures all our filters for Algolia
    useConfigure({
        hitsPerPage: 1000,
        filters: useMemo(() => {
            const algoliaFilters = [];

            if (filters.statusFilter !== 'All') algoliaFilters.push(`status:"${filters.statusFilter}"`);
            
            // --- NEW: Filter by delivery container type ---
            if (filters.deliveryMethodsFilter !== 'All') algoliaFilters.push(`deliveryMethods:"${filters.deliveryMethodsFilter}"`);
            
            // --- Server-side filters ---
            if (filters.audienceFilter !== 'All') algoliaFilters.push(`audiences:"${filters.audienceFilter}"`);
            if (filters.triggerFilter !== 'All') algoliaFilters.push(`triggers:"${filters.triggerFilter}"`);
            if (filters.abTestFilter !== 'All') algoliaFilters.push(`isAbTesting = ${filters.abTestFilter === 'Yes' ? 1 : 0}`);
            if (filters.scheduleFilter !== 'All') algoliaFilters.push(`schedules:"${filters.scheduleFilter}"`);
            // --- END filters ---

            // --- REFACTOR: Handle containerIdList filter ---
            if (filters.containersFilter.length > 0) {
                const containerFilters = filters.containersFilter.map((cid: string) => `containerIdList:"${cid}"`);
                if (filters.containersFilterLogic === 'all') {
                    // "Match ALL" is a standard AND
                    algoliaFilters.push(containerFilters.join(' AND '));
                } else {
                    // "Match ANY" is a standard OR
                    algoliaFilters.push(`(${containerFilters.join(' OR ')})`);
                }
            }

            return algoliaFilters.join(' AND ');
        // --- FIX: Isolate dependencies from searchTerm ---
        }, [
            filters.statusFilter,
            filters.deliveryMethodsFilter, // <-- ADDED
            filters.audienceFilter,
            filters.triggerFilter,
            filters.abTestFilter,
            filters.scheduleFilter,
            filters.containersFilter,
            filters.containersFilterLogic
        ]),
    });

    const { hits } = useHits();
    // --- FIX: Add refresh effect ---
    const { refresh } = useInstantSearch();
    useEffect(() => {
        refresh();
    }, [refresh]);

    const renderCampaignItem = (campaign: Campaign, isSelected: boolean, onToggleSelect: () => void) => {
        const effectiveStatus = getEffectiveCampaignStatus(campaign);
        const statusColors = {
            Active: '#28a745', Scheduled: '#17a2b8', Expired: '#6c757d', Paused: '#fd7e14', Draft: '#6c757d'
        };
        const statusStyle = { fontWeight: 'bold', color: statusColors[effectiveStatus.status] };
        const scheduleText = [campaign.startDate, campaign.endDate].filter(Boolean).join(' – ') || 'Always Active';

        return (
            <li key={campaign.id} style={{ ...styles.rewardListItem, ...styles.listItemWithCheckbox }}>
                <input type="checkbox" checked={isSelected} onChange={onToggleSelect} />
                <div style={{...styles.rewardInfo, flex: 1}}>
                    <strong>{campaign.name}</strong>
                    <div style={styles.rewardAnalytics}>
                        <span>Status: <span style={statusStyle} title={effectiveStatus.message}>{effectiveStatus.status}</span></span>
                        <span>Schedule: {scheduleText}</span>
                    </div>
                </div>
                <div style={styles.rewardActions}>
                    <button onClick={() => handleToggleStatus(campaign)} style={styles.publishButton} disabled={campaign.status === 'Paused'}>
                        {campaign.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => duplicateCampaign(campaign)} style={styles.editButton}>Duplicate</button>
                    <button onClick={() => handleEdit(campaign)} style={styles.editButton}>Edit</button>
                    <button onClick={() => deleteCampaign(campaign.id)} style={styles.deleteButton}>Delete</button>
                </div>
            </li>
        );
    };

    return (
        <PaginatedList
            items={hits as Campaign[]}
            renderItem={renderCampaignItem}
            bulkActions={[{
                label: 'Delete Selected',
                onAction: (selectedItems) => deleteMultipleCampaigns(selectedItems.map(item => item.id))
            }]}
            listContainerComponent="ul"
            listContainerStyle={styles.rewardsListFull}
        />
    );
};
// --- END Inner Component ---

// --- FIX: Add ConnectedSearchBox ---
const ConnectedSearchBox = ({ 
  searchTerm, 
  handleFilterChange
}: {
  searchTerm: string;
  handleFilterChange: (key: string, value: string) => void;
}) => {
  const { refine } = useSearchBox();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    handleFilterChange('searchTerm', value);
    refine(value);
  };

  useEffect(() => {
    if (searchTerm === '') {
      refine('');
    }
  }, [searchTerm, refine]);

  return (
    <div style={styles.configItem}>
        <label>Search Campaigns</label>
        <input
            type="text"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={handleChange}
            style={styles.input}
        />
    </div>
  );
};
// --- END ConnectedSearchBox ---


export const CampaignsManager: React.FC = () => {
    // --- REFACTOR: Get deliveryContainers from useData ---
    const { deliveryContainers, macrogames, createCampaign, updateCampaign, deleteCampaign, deleteMultipleCampaigns, duplicateCampaign, campaigns: allCampaigns } = useData();
    
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
    // --- Add a key to force re-mounting InstantSearch to bust cache ---
    const [searchKey, setSearchKey] = useState(Date.now());

    // --- REFACTOR: Rename state variables ---
    const [filters, setFilters] = useState({
        searchTerm: '',
        statusFilter: 'All',
        deliveryMethodsFilter: 'All', // <-- RENAMED
        containersFilter: [] as string[],
        containersFilterLogic: 'any' as 'any' | 'all',
        audienceFilter: 'All',
        triggerFilter: 'All',
        scheduleFilter: 'All',
        abTestFilter: 'All',
    });

    const handleFilterChange = (key: string, value: string | string[]) => {
        if (key === 'deliveryMethodsFilter') { // <-- RENAMED
            // --- REFACTOR: Reset containersFilter ---
            setFilters(prev => ({ ...prev, [key]: value, containersFilter: [] }));
        } else {
            setFilters(prev => ({ ...prev, [key]: value }));
        }
    };

    const handleResetFilters = () => {
        // --- REFACTOR: Reset new state variables ---
        setFilters({
            searchTerm: '', statusFilter: 'All', deliveryMethodsFilter: 'All', containersFilter: [], // <-- RENAMED
            containersFilterLogic: 'any', audienceFilter: 'All', triggerFilter: 'All', 
            scheduleFilter: 'All', abTestFilter: 'All',
        });
        // --- Update the key to force a re-mount ---
        setSearchKey(Date.now());
    };
    
    const handleSaveCampaign = async (campaignData: Partial<Campaign>, campaignId: string | null) => {
        const newName = campaignData.name?.trim();
        if (!newName) {
            notifications.error("Campaign name cannot be empty.");
            return;
        }

        const isNameTaken = allCampaigns.some(c => c.name === newName && c.id !== campaignId);
        if (isNameTaken) {
            notifications.error(`A campaign named "${newName}" already exists. Please choose a unique name.`);
            return;
        }

        const { startDate, endDate } = campaignData;
        if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
            notifications.error("The campaign's end date cannot be before its start date.");
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (!campaignId && startDate && new Date(startDate) < today) {
            notifications.error("The campaign's start date cannot be in the past.");
            return;
        }

        if (endDate && new Date(endDate) < today) {
            notifications.error("The campaign's end date cannot be in the past.");
            return;
        }
        
        // --- FIX: Apply Blocking Refresh Pattern ---
        const loadingToast = notifications.loading(campaignId ? 'Updating campaign...' : 'Creating campaign...');

        try {
            if (campaignId) {
                await updateCampaign(campaignId, campaignData);
            } else {
                // --- REFACTOR: Pass correct Omit type ---
                await createCampaign(campaignData as Omit<Campaign, 'id' | 'status'>);
            }
            
            // Wait for Algolia
            await new Promise(resolve => setTimeout(resolve, 4000));
            setSearchKey(Date.now()); // Refresh list

            notifications.dismiss(loadingToast);
            notifications.success(campaignId ? 'Campaign updated' : 'Campaign created');
            
            setEditingCampaign(null);
            setIsCreateModalOpen(false);
        } catch (error) {
            notifications.dismiss(loadingToast);
            console.error("Failed to save campaign:", error);
            notifications.error("There was an error saving the campaign.");
        }
    };
    
    const handleCreateNew = () => setIsCreateModalOpen(true);
    const handleEdit = (campaign: Campaign) => setEditingCampaign(campaign);
    
    // --- FIX: Apply Blocking Pattern to Actions ---
    
    const handleToggleStatus = async (campaign: Campaign) => {
        const newStatus = campaign.status === 'Active' ? 'Draft' : 'Active';
        const loadingToast = notifications.loading(newStatus === 'Active' ? 'Activating...' : 'Deactivating...');
        
        try {
            await updateCampaign(campaign.id, { status: newStatus });
            await new Promise(resolve => setTimeout(resolve, 4000));
            setSearchKey(Date.now());
            notifications.dismiss(loadingToast);
            notifications.success(`Campaign ${newStatus === 'Active' ? 'activated' : 'deactivated'}`);
        } catch (error) {
            notifications.dismiss(loadingToast);
            notifications.error('Failed to update status.');
        }
    };

    const handleDuplicateCampaign = async (campaign: Campaign) => {
        const loadingToast = notifications.loading('Duplicating campaign...');
        try {
            await duplicateCampaign(campaign);
            await new Promise(resolve => setTimeout(resolve, 4000));
            setSearchKey(Date.now());
            notifications.dismiss(loadingToast);
            notifications.success('Campaign duplicated');
        } catch (error) {
            notifications.dismiss(loadingToast);
            notifications.error('Failed to duplicate campaign.');
        }
    };

    const handleDeleteCampaign = async (campaignId: string) => {
        // deleteCampaign in DataContext handles the confirmation dialog
        const wasDeleted = await deleteCampaign(campaignId);
        
        if (wasDeleted) {
            const loadingToast = notifications.loading('Deleting campaign...');
            await new Promise(resolve => setTimeout(resolve, 4000));
            notifications.dismiss(loadingToast);
            notifications.success('Campaign deleted');
            setSearchKey(Date.now());
        }
    };

    const handleDeleteMultiple = async (ids: string[]) => {
        // 1. Silent delete + confirm
        const wasConfirmed = await deleteMultipleCampaigns(ids);

        // 2. Loading -> Delay -> Success -> Refresh
        if (wasConfirmed) {
            const loadingToast = notifications.loading(`Deleting ${ids.length} campaigns...`);
            await new Promise(resolve => setTimeout(resolve, 4000));
            notifications.dismiss(loadingToast);
            notifications.success(`${ids.length} campaigns deleted`);
            setSearchKey(Date.now());
        }
    };

    const filterConfig = useMemo(() => {
        const config: FilterConfig[] = [
            // --- RENAMED: stateKey, label, and options ---
            { type: 'select', stateKey: 'statusFilter', label: 'Status', options: ['All', 'Active', 'Draft', 'Paused'] },
            { type: 'select', stateKey: 'deliveryMethodsFilter', label: 'Delivery Container Type', options: DELIVERY_METHOD_OPTIONS},
        ];

        // --- REFACTOR: Use deliveryContainers to build options ---
        // --- RENAMED: Check new filter state key and value ---
        if (filters.deliveryMethodsFilter === 'popup_modal') {
            const containerOptions = deliveryContainers
                .filter(c => c.deliveryMethod === 'popup_modal') // Filter for popups
                .map(c => {
                    const macrogameName = macrogames.find(m => m.id === c.macrogameId)?.name || 'N/A';
                    return { value: c.id, label: `${c.name} (${macrogameName})`};
                });
            // --- REFACTOR: Update stateKey and label ---
            config.push({ type: 'multiselect', stateKey: 'containersFilter', label: 'Specific Popup Containers', options: containerOptions });
        }
        
        config.push(
            { type: 'select', stateKey: 'audienceFilter', label: 'Audience', options: AUDIENCE_OPTIONS },
            { type: 'select', stateKey: 'triggerFilter', label: 'Trigger', options: TRIGGER_OPTIONS },
            { type: 'select', stateKey: 'scheduleFilter', label: 'Schedule', options: ['All', 'Weekdays', 'Weekends'] },
            { type: 'select', stateKey: 'abTestFilter', label: 'A/B Testing', options: ['All', 'Yes', 'No'] }
        );

        return config;
    // --- REFACTOR: Update dependency array ---
    }, [filters.deliveryMethodsFilter, deliveryContainers, macrogames]);

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
                <h2 style={styles.h2}>Campaign Manager</h2>
                <button onClick={handleCreateNew} style={styles.saveButton}>Create New</button>
            </div>
            <p style={styles.descriptionText}>
                Deployed Macrogames can be published in live Campaigns, which control when and how they are shown to visitors of your website. Create a campaign to set schedules, triggers, and audiences for one or more deployed Macrogames.
            </p>

            {/* --- Wrap filtering UI in InstantSearch --- */}
            <InstantSearch key={searchKey} searchClient={searchClient} indexName="campaigns">
                <div style={styles.filterContainer}>
                    {/* --- FIX: Use ConnectedSearchBox --- */}
                    <ConnectedSearchBox 
                        searchTerm={filters.searchTerm}
                        handleFilterChange={handleFilterChange}
                    />

                    <FilterBar filters={filterConfig} filterValues={filters} onFilterChange={handleFilterChange} onResetFilters={handleResetFilters} />
                    {/* --- REFACTOR: Update filter check and logic state --- */}
                    <div style={{ padding: '0 1rem' }}>
                        {filters.containersFilter.length > 0 && (
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.9rem' }}>
                                <label style={{ ...styles.filterLabel, marginBottom: 0 }}>Container Match Logic:</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input
                                        type="radio"
                                        id="match-any"
                                        name="containerMatchLogic"
                                        value="any"
                                        checked={filters.containersFilterLogic === 'any'}
                                        onChange={() => handleFilterChange('containersFilterLogic', 'any')}
                                    />
                                    <label htmlFor="match-any">Match ANY</label>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input
                                        type="radio"
                                        id="match-all"
                                        name="containerMatchLogic"
        
                                        value="all"
                                        checked={filters.containersFilterLogic === 'all'}
                                        onChange={() => handleFilterChange('containersFilterLogic', 'all')}
                                    />
                                    <label htmlFor="match-all">Match ALL</label>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div style={styles.rewardsListContainer}>
                    <h3 style={{...styles.h3, marginTop: '2rem'}}>All Campaigns</h3>
                    {/* This component now connects to Algolia */}
                    <CampaignList 
                        filters={filters}
                        handleToggleStatus={handleToggleStatus}
                        duplicateCampaign={handleDuplicateCampaign}
                        handleEdit={handleEdit}
                        deleteCampaign={handleDeleteCampaign}
                        deleteMultipleCampaigns={handleDeleteMultiple}
                    />
                </div>
            </InstantSearch>
        </div>
    );
};