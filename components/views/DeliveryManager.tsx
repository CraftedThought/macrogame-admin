/* src/components/views/DeliveryManager.tsx */

import React, { useState, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ConfirmationToast } from '../ui/ConfirmationToast';
import { notifications } from '../../utils/notifications';
import { useLocation } from 'react-router-dom';
import { styles } from '../../App.styles';
// --- REFACTOR: Import DeliveryContainer, new types, and helpers ---
import {
    DeliveryContainer,
    SkinConfig,
    SkinContentBlock,
    Macrogame
} from '../../types';
import { useData } from '../../hooks/useData';
import { DeliveryMethodManagerTab } from './DeliveryMethodManagerTab';
import { StarIcon } from '../ui/StarIcon';
import { hasMacrogameIssues, generateUUID } from '../../utils/helpers'; // <-- IMPORT generateUUID
import { SKIN_COLOR_SCHEMES, UI_SKINS, YES_NO_ALL_OPTIONS } from '../../constants';
import { FilterBar, FilterConfig } from '../ui/FilterBar';

// --- Algolia & React InstantSearch Imports ---
import * as algoliasearch from 'algoliasearch';
import {
    InstantSearch,
    useHits,
    useSearchBox, // <-- THIS IS NEEDED
    useConfigure,
    Index,
    useInstantSearch,
} from 'react-instantsearch';
// --- END Algolia Imports ---

// --- Initialize Algolia Search Client ---
const appId = import.meta.env.VITE_ALGOLIA_APP_ID;
const searchKey = import.meta.env.VITE_ALGOLIA_SEARCH_KEY;
const searchClient = algoliasearch.algoliasearch(appId, searchKey);
// --- END Algolia Client ---

type DeliveryTab = 'Unconfigured' | 'Popup' | 'OnPageSection' | 'NewWebpage';

// --- REFACTOR: Update props interface ---
interface DeliveryManagerProps {
    handleEditContainer: (container: DeliveryContainer) => void;
}

// --- REFACTOR: Inner component to render a list of containers from Algolia ---
const ContainerList = ({
    tab,
    filters,
    searchTerm, // <-- This prop is no longer used by hooks, but that's fine
    handleEditContainer,
    duplicateDeliveryContainer,
    toggleDeliveryContainerFavorite,
    deleteDeliveryContainer,
    deleteMultipleDeliveryContainers,
    macrogames,
    allMicrogames,
    forceRefresh, // --- 1. Receive new prop ---
}: {
    tab: 'Unconfigured' | 'Popup';
    filters: { [key: string]: string | string[] };
    searchTerm: string;
    handleEditContainer: (container: DeliveryContainer) => void;
    duplicateDeliveryContainer: (containerToDuplicate: DeliveryContainer) => Promise<DeliveryContainer | undefined>;
    toggleDeliveryContainerFavorite: (containerId: string, isFavorite: boolean) => Promise<void>;
    deleteDeliveryContainer: (id: string) => Promise<boolean>;
    deleteMultipleDeliveryContainers: (ids: string[]) => Promise<void>;
    macrogames: any[];
    allMicrogames: any[];
    forceRefresh: () => void; // --- 1. Receive new prop ---
}) => {
    // --- THIS IS THE FIX (Part 1) ---
    // We REMOVE the useSearchBox({ query: ... }) from here.
    // It will be handled by its own component.

    // This hook configures all our filters for Algolia
    useConfigure({
        hitsPerPage: 1000, // We get all hits and use our own PaginatedList
        filters: useMemo(() => {
            const algoliaFilters = [];

            // This is the primary filter for this tab
            if (tab === 'Unconfigured') {
                algoliaFilters.push('status.code:"error"');
            } else {
                // The "Popup" tab must be 'ok' AND be a 'popup_modal'
                algoliaFilters.push('status.code:"ok"');
                algoliaFilters.push('deliveryMethod:"popup_modal"');
            }

            // Apply UI filters
            if (filters.macrogameFilter && filters.macrogameFilter !== 'All') {
                algoliaFilters.push(`macrogameName:"${filters.macrogameFilter}"`);
            }
            if (filters.skinFilter && filters.skinFilter !== 'All') {
                const skinId = UI_SKINS.find(s => s.name === filters.skinFilter)?.id;
                if (skinId) {
                    algoliaFilters.push(`skinId:"${skinId}"`);
                }
            }
            if (filters.campaignFilter && filters.campaignFilter !== 'All') {
                const hasCampaign = filters.campaignFilter === 'Yes';
                // Use the new, simple boolean facet filter
                algoliaFilters.push(`isCampaignLinked:${hasCampaign}`);
            }
            
            return algoliaFilters.join(' AND ');
        // --- THIS IS THE FIX (Part 2) ---
        // The dependency array is now isolated from the search term.
        }, [tab, filters.macrogameFilter, filters.skinFilter, filters.campaignFilter]),
    });

    const { hits } = useHits();
    // We keep useInstantSearch here to get `refresh`
    const { refresh } = useInstantSearch();
    // This useEffect is for CUD operations, not search. It is correct.
    useEffect(() => {
        refresh();
    }, [refresh]);
    
    // This local state will "shadow" the hits from Algolia
    // and allow us to make instant, optimistic UI updates.
    const [localHits, setLocalHits] = useState(hits);

    // This effect ensures our local state is updated
    // whenever a new search or filter is applied.
    useEffect(() => {
        setLocalHits(hits);
    }, [hits]);

    // We can still use it for more descriptive warnings
    // --- REFACTOR: Rename function and parameter ---
    const getClientSideContainerAlert = (container: DeliveryContainer) => {
        if (!container.deliveryMethod) return { message: 'Configuration Needed: Select a delivery container type.' };
        if (!container.skinId) return { message: 'Configuration Needed: Select a UI skin.' };
        if (!container.macrogameId) return { message: 'Configuration Needed: Select a Macrogame.' };
        const macrogame = macrogames.find(m => m.id === container.macrogameId);
        if (!macrogame) return { message: 'Needs Attention: The linked macrogame was deleted.' };
        if (hasMacrogameIssues(macrogame, allMicrogames)) {
            return { message: 'Needs Attention: Contains an archived microgame.' };
        }
        return null; // No issues
    };
    
    // --- REFACTOR: Rename parameter and update logic ---
    const handlePreview = (container: DeliveryContainer) => {
        if (!container.skinId || !container.macrogameId) {
            notifications.error("This container needs a Macrogame and a UI skin configured before it can be previewed.");
            return;
        }
        const previewConfig = { 
            macrogameId: container.macrogameId,
            skinId: container.skinId,
            container: container, // Use 'container' key
            isPreviewMode: 'full_macrogame'
        };
        localStorage.setItem('macrogame_preview_data', JSON.stringify(previewConfig));
        window.open('/preview.html', '_blank');
    };
    
    const confirmAction = (message: string, onConfirm: () => void) => {
        toast.custom((t) => (
            <ConfirmationToast t={t} message={message} onConfirm={onConfirm} />
        ), { duration: 6000, position: 'top-center' });
    };

    // --- 3. Update handleDeleteContainer to use blocking pattern ---
    const handleDeleteContainer = async (containerId: string) => {
        // 1. Call the delete function and wait for confirmation.
        const wasDeleted = await deleteDeliveryContainer(containerId);

        // 2. If deleted, run our *full* notification flow *before* refreshing.
        if (wasDeleted) {
            // 3. Show ONE loading toast
            const loadingToast = notifications.loading('Deleting container...');

            // 4. Add a 4-second delay for Algolia to index the deletion.
            await new Promise(resolve => setTimeout(resolve, 4000));
            
            // 5. Dismiss the loading toast
            notifications.dismiss(loadingToast);

            // 6. Show the success toast. The user will see this.
            notifications.success('Container deleted');
            
            // 7. NOW, as the very last step, force the component to unmount and refetch.
            forceRefresh();
        }
    };
    
    // --- 4. Create handleDuplicateClick with blocking pattern ---
    const handleDuplicateClick = async (container: DeliveryContainer) => {
        const loadingToast = notifications.loading('Duplicating container...');
        try {
            await duplicateDeliveryContainer(container);
            // Add a 4-second delay to allow Algolia to index the new item.
            await new Promise(resolve => setTimeout(resolve, 4000));
            forceRefresh(); // Force Algolia to refetch
            notifications.dismiss(loadingToast);
            notifications.success('Container duplicated');
        } catch (error) {
            notifications.dismiss(loadingToast);
            notifications.error('Failed to duplicate container.');
            console.error("Duplicate failed:", error);
        }
    };

    // --- 5. Create handleToggleFavoriteClick with optimistic pattern ---
    const handleToggleFavoriteClick = (containerId: string, isFavorite: boolean) => {
        // 1. Fire-and-forget the database update
        toggleDeliveryContainerFavorite(containerId, isFavorite);

        // 2. Optimistically update our local UI state *immediately*
        setLocalHits(currentHits =>
            currentHits.map(hit =>
                (hit as any).objectID === containerId
                    ? { ...hit, isFavorite: isFavorite }
                    : hit
            )
        );
    };

    // --- REFACTOR: Rename function and parameter ---
    const renderContainerItem = (container: DeliveryContainer, isSelected: boolean, onToggleSelect: () => void) => {
        const isUnconfigured = tab === 'Unconfigured';
        const alert = getClientSideContainerAlert(container);
        
        return (
            <li key={(container as any).objectID} style={{ ...styles.rewardListItem, ...styles.listItemWithCheckbox }}>
                <input type="checkbox" checked={isSelected} onChange={onToggleSelect} />
                <div style={{...styles.rewardInfo, flex: 1}}>
                    <strong>{container.name}</strong>
                    {alert && <span style={styles.warningTag}>{alert.message}</span>}
                    <div style={styles.rewardAnalytics}>
                        <span>Macrogame: {container.macrogameName || 'N/A'}</span>
                        <span>Skin: {UI_SKINS.find(s => s.id === container.skinId)?.name || 'N/A'}</span>
                    </div>
                </div>
                {/* --- 6. Update button onClicks to use new handlers --- */}
                <div style={styles.rewardActions}>
                    {!isUnconfigured && (
                        <button onClick={() => handlePreview(container)} style={styles.previewButton} disabled={!container.skinId || !container.macrogameId}>Preview</button>
                    )}
                    <button onClick={() => handleDuplicateClick(container)} style={styles.editButton}>Duplicate</button>
                    <button onClick={() => handleEditContainer(container)} style={styles.editButton}>Edit</button>
                    <button onClick={() => handleDeleteContainer(container.id)} style={styles.deleteButton}>Delete</button>
                    <button onClick={() => handleToggleFavoriteClick((container as any).objectID, !container.isFavorite)} style={{ background: 'none', border: 'none', padding: '0 0 0 0.5rem' }}>
                        <StarIcon isFavorite={!!container.isFavorite} />
                    </button>
                </div>
            </li>
        );
    };

    const allItems = localHits as DeliveryContainer[];
    const favoriteItems = allItems.filter(p => p.isFavorite);
    
    // --- REMOVED: Unused handleDuplicateClick function that was here ---

    return (
        <DeliveryMethodManagerTab
            items={allItems}
            favoriteItems={favoriteItems}
            // --- REFACTOR: Pass renamed render function and update item name ---
            renderItem={renderContainerItem}
            onDeleteMultiple={deleteMultipleDeliveryContainers}
            itemTypeName={tab === 'Unconfigured' ? 'Unconfigured Items' : 'Popup Containers'}
            isLoading={false} // Loading is handled by Algolia
        />
    );
};
// --- END Inner Component ---

// --- THIS IS THE FIX (Part 1) ---
// This new component lives *inside* InstantSearch and *imperatively*
// controls the search query.
const ConnectedSearchBox = ({ 
  searchTerm, 
  setSearchTerm
}: {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
}) => {
  // This hook is now called *inside* <InstantSearch> and is safe
  const { refine } = useSearchBox();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // 1. Update the parent's React state (to keep the input text)
    setSearchTerm(value);
    // 2. Imperatively update Algolia's search state
    refine(value);
  };

  // When the "Reset Filters" button is clicked, the parent
  // state `searchTerm` becomes '', and this effect syncs
  // Algolia's state.
  useEffect(() => {
    if (searchTerm === '') {
      refine('');
    }
  }, [searchTerm, refine]);

  return (
    <div style={styles.configItem}>
        <label>Search</label>
        <input
            type="text" placeholder="Search by name..." value={searchTerm}
            onChange={handleChange} style={styles.input}
        />
    </div>
  );
};
// --- END FIX (Part 1) ---


// --- REFACTOR: Define the default filter state ---
const initialFilterState = {
    macrogameFilter: 'All',
    skinFilter: 'All',
    campaignFilter: 'All',
};

// --- NEW: Helper components (copied from DeliveryContainerEditorFormFields) ---
const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div style={styles.configSection}>
        <h4 style={{ ...styles.h4, marginTop: 0, borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>
            {title}
        </h4>
        {children}
    </div>
);

const ColorPicker: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => (
    <div style={{ ...styles.configItem, flex: '1 1 30%' }}>
        <label>{label}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
                type="color"
                value={value}
                onChange={e => onChange(e.target.value)}
                style={{ width: '40px', height: '40px', padding: '0.25rem', border: 'none', borderRadius: '4px' }}
            />
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                style={{ ...styles.input, flex: 1 }}
                placeholder="#1c1e21"
            />
        </div>
    </div>
);

// --- NEW: Default state for a new skin configuration ---
const defaultSkinConfig: SkinConfig = {
    showMuteButton: true,
    showExitButton: true,
    header: {
        title: '',
        subtitle: '',
        textColor: '#FFFFFF',
    },
    contentBlocks: [],
    styling: {
        backgroundColor: '#1c1e21',
        headerBackground: '#2a2d30',
        contentBackground: '#2a2d30',
    }
};

export const DeliveryManager: React.FC<DeliveryManagerProps> = ({ handleEditContainer }) => {
    // --- REFACTOR: Get new actions from useData ---
    const { 
      createDeliveryContainer, 
      deleteDeliveryContainer, 
      duplicateDeliveryContainer, 
      toggleDeliveryContainerFavorite, 
      deleteMultipleDeliveryContainers, 
      macrogames, 
      allMicrogames 
    } = useData();
    
    const location = useLocation();
    
    // --- STATE MANAGEMENT ---
    const [activeTab, setActiveTab] = useState<DeliveryTab>(location.state?.defaultTab || 'Unconfigured');

    // --- Listen for navigation events to switch tabs or refresh ---
    useEffect(() => {
        if (location.state?.defaultTab) {
            setActiveTab(location.state.defaultTab);
            // Force Algolia to refresh the list when we navigate here (e.g. after a save)
            setSearchKey(Date.now());
        }
    }, [location.state]);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [filterValues, setFilterValues] = useState<{ [key: string]: string | string[] }>(initialFilterState);
    // --- Add a key to force re-mounting InstantSearch to bust cache ---
    const [searchKey, setSearchKey] = useState(Date.now());
    
    // --- REFACTOR: Replace old newDeliveryData state ---
    const [newName, setNewName] = useState('');
    const [newDeliveryMethod, setNewDeliveryMethod] = useState('popup_modal');
    const [newMacrogameId, setNewMacrogameId] = useState('');
    const [newSkinId, setNewSkinId] = useState('');
    const [newSkinConfig, setNewSkinConfig] = useState<SkinConfig>(defaultSkinConfig);
    // --- END REFACTOR ---

    // --- (REMOVED: Old client-side data fetching and filtering logic) ---

    const handleFilterChange = (key: string, value: string | string[]) => {
        setFilterValues(prev => ({ ...prev, [key]: value }));
    };
    const handleResetFilters = () => {
        setFilterValues(initialFilterState);
        setSearchTerm('');
        // --- Update the key to force a re-mount ---
        // We no longer call refine() here; the useEffect in
        // ConnectedSearchBox will handle it.
        setSearchKey(Date.now());
    };

    // --- FORM & ACTION HANDLERS ---
    
    // --- REMOVED: Old handleInputChange function ---

    // --- NEW: Immutable state helper functions for the "Create" form ---
    const handleConfigChange = <K extends keyof SkinConfig>(key: K, value: SkinConfig[K]) => {
        setNewSkinConfig(prev => ({ ...prev, [key]: value }));
    };
    const handleHeaderChange = <K extends keyof SkinConfig['header']>(key: K, value: SkinConfig['header'][K]) => {
        setNewSkinConfig(prev => ({ ...prev, header: { ...prev.header, [key]: value } }));
    };
    const handleStylingChange = <K extends keyof SkinConfig['styling']>(key: K, value: SkinConfig['styling'][K]) => {
        setNewSkinConfig(prev => ({ ...prev, styling: { ...prev.styling, [key]: value } }));
    };
    const addContentBlock = (position: 'above' | 'below') => {
        const newBlock: SkinContentBlock = { id: generateUUID(), position, header: '', subheader: '', body: '' };
        handleConfigChange('contentBlocks', [...(newSkinConfig.contentBlocks || []), newBlock]);
    };
    const updateContentBlock = (id: string, field: keyof Omit<SkinContentBlock, 'id' | 'position'>, value: string) => {
        const newBlocks = (newSkinConfig.contentBlocks || []).map(block =>
            block.id === id ? { ...block, [field]: value } : block
        );
        handleConfigChange('contentBlocks', newBlocks);
    };
    const removeContentBlock = (id: string) => {
        const newBlocks = (newSkinConfig.contentBlocks || []).filter(block => block.id !== id);
        handleConfigChange('contentBlocks', newBlocks);
    };
    // --- END NEW HELPERS ---

    // --- 7. Create forceRefresh function ---
    const forceRefresh = () => setSearchKey(Date.now());

    // --- REFACTOR: Update save handler to create a DeliveryContainer ---
    const handleSaveDelivery = async (e: React.FormEvent) => {
        e.preventDefault();
        // --- REFACTOR: Validate against new state ---
        if (!newName || !newDeliveryMethod || !newMacrogameId || !newSkinId) {
            notifications.error('Please provide a name and select a container type, Macrogame, and UI.');
            return;
        }
        const selectedGame = macrogames.find(g => g.id === newMacrogameId);
        if (!selectedGame) {
            notifications.error('Selected macrogame not found.');
            return;
        }

        // --- REFACTOR: Build container with new data structure ---
        const newContainer: Omit<DeliveryContainer, 'id'> = {
            name: newName,
            deliveryMethod: newDeliveryMethod as 'popup_modal',
            macrogameId: selectedGame.id,
            macrogameName: selectedGame.name,
            skinId: newSkinId,
            skinConfig: newSkinId === 'configurable-popup' ? newSkinConfig : null, // Only save config if it's the right skin
            status: { code: 'ok', message: '' }, // Status will be verified by backend
            campaignId: null,
            views: 0,
            engagements: 0,
            createdAt: new Date().toISOString(),
        };
        
        // --- 7. Update create flow to use blocking pattern ---
        const loadingToast = notifications.loading('Creating container...');
        try {
            await createDeliveryContainer(newContainer);
            // Add a 4-second delay to allow Algolia to index the new item.
            await new Promise(resolve => setTimeout(resolve, 4000));
            forceRefresh(); // Refresh the list
            
            // --- REFACTOR: Reset new state hooks ---
            setNewName('');
            setNewMacrogameId('');
            setNewSkinId('');
            setNewSkinConfig(defaultSkinConfig);
            // --- END REFACTOR ---
            
            notifications.dismiss(loadingToast);
            notifications.success('Container created');
        } catch (error) {
            notifications.dismiss(loadingToast);
            notifications.error('Failed to create container.');
        }
    };

    const handleDeleteMultiple = async (ids: string[]) => {
        // 1. Call the "silent" delete function and wait for confirmation
        const wasDeleted = await deleteMultipleDeliveryContainers(ids);

        // 2. If confirmed, run our clean notification and refresh flow
        if (wasDeleted) {
            const loadingToast = notifications.loading(`Deleting ${ids.length} containers...`);
            // Add a delay for Algolia to process the batch deletion
            await new Promise(resolve => setTimeout(resolve, 4000));
            
            notifications.dismiss(loadingToast);
            notifications.success(`${ids.length} containers deleted`);
            
            // Force the component to unmount and refetch
            forceRefresh();
        }
    };
    
    // --- REFACTOR: Update button text ---
    const getCreateButtonText = () => {
        switch (newDeliveryMethod) {
            case 'popup_modal': return 'Create Popup Container';
            default: return 'Create';
        }
    };
    
    // --- REFACTOR: Rename config object ---
    const containerFilterConfig: FilterConfig[] = useMemo(() => ([
        { type: 'select', label: 'Macrogame', options: ['All', ...new Set(macrogames.map(m => m.name))], stateKey: 'macrogameFilter' },
        { type: 'select', label: 'UI Skin', options: ['All', ...UI_SKINS.map(s => s.name)], stateKey: 'skinFilter' },
        { type: 'select', label: 'In Campaign', options: YES_NO_ALL_OPTIONS, stateKey: 'campaignFilter' },
    ]), [macrogames]);
    
    // --- NEW: Helper to render the content block editor (for "Create" form) ---
    const renderContentBlockEditor = (block: SkinContentBlock) => (
        <div key={block.id} style={styles.configSection}>
            <input
                type="text"
                value={block.header}
                onChange={e => updateContentBlock(block.id, 'header', e.target.value)}
                style={styles.input}
                placeholder="Content Header (Optional)"
            />
            <input
                type="text"
                value={block.subheader}
                onChange={e => updateContentBlock(block.id, 'subheader', e.target.value)}
                style={{...styles.input, marginTop: '0.5rem'}}
                placeholder="Content Subheader (Optional)"
            />
            <textarea
                value={block.body}
                onChange={e => updateContentBlock(block.id, 'body', e.target.value)}
                style={{...styles.input, marginTop: '0.5rem', minHeight: '60px'}}
                placeholder="Body text (Optional)"
            />
            <button
                type="button"
                onClick={() => removeContentBlock(block.id)}
                style={{...styles.deleteButton, marginTop: '0.5rem', alignSelf: 'flex-start'}}
            >
                Remove Block
            </button>
        </div>
    );
    
    // --- RENDER ---
    return (
        <div style={styles.creatorSection}>
            <h2 style={styles.h2}>Delivery Manager</h2>

            {/* --- REFACTOR: Create New Form --- */}
            <form onSubmit={handleSaveDelivery}>
                <h3 style={styles.h3}>Create New Delivery Container</h3>
                
                {/* --- 1. GENERAL SETTINGS (from "Create" form) --- */}
                <FormSection title="General Settings">
                    <div style={styles.configRow}>
                        <div style={styles.configItem}>
                            <label>Container Name</label>
                            <input 
                                type="text" 
                                placeholder="e.g., Summer Sale Popup" 
                                value={newName} 
                                onChange={e => setNewName(e.target.value)} 
                                style={styles.input} 
                            />
                        </div>
                        <div style={styles.configItem}>
                            <label>Select Container Type</label>
                            <select 
                                value={newDeliveryMethod} 
                                onChange={e => setNewDeliveryMethod(e.target.value)} 
                                style={styles.input}
                            >
                                <option value="popup_modal">Popup Modal</option>
                                <option value="new_webpage" disabled>New Webpage (Coming Soon)</option>
                                <option value="on_page_section" disabled>On-Page Section (Coming Soon)</option>
                            </select>
                        </div>
                    </div>

                    {newDeliveryMethod === 'popup_modal' && (
                        <>
                            <div style={{...styles.configItem, marginTop: '1rem'}}>
                                <label>Select Macrogame</label>
                                <select value={newMacrogameId} onChange={e => setNewMacrogameId(e.target.value)} style={styles.input}>
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
                                <label>UI Skin</label>
                                <select value={newSkinId} onChange={e => setNewSkinId(e.target.value)} style={styles.input}>
                                    <option value="">Select a UI Skin...</option>
                                    {/* Filter out 'barebones' as it's not a valid *selection* */}
                                    {UI_SKINS.filter(s => s.id !== 'barebones').map(skin => <option key={skin.id} value={skin.id}>{skin.name}</option>)}
                                </select>
                            </div>
                        </>
                    )}
                </FormSection>
                
                {/* --- 2. POPUP CUSTOMIZATION (V1 BUILDER) --- */}
                {/* This UI only appears if the correct skin is selected */}
                {newSkinId === 'configurable-popup' && (
                    <>
                        <FormSection title="Popup Header">
                            <div style={styles.configItem}>
                                <label>Title</label>
                                <input
                                    type="text"
                                    value={newSkinConfig.header.title}
                                    onChange={e => handleHeaderChange('title', e.target.value)}
                                    style={styles.input}
                                    placeholder="e.g., Special Offer!"
                                />
                            </div>
                            <div style={{ ...styles.configItem, marginTop: '1rem' }}>
                                <label>Subtitle</label>
                                <input
                                    type="text"
                                    value={newSkinConfig.header.subtitle}
                                    onChange={e => handleHeaderChange('subtitle', e.target.value)}
                                    style={styles.input}
                                    placeholder="e.g., Play to win a prize"
                                />
                            </div>
                            <div style={{ ...styles.configItem, marginTop: '1rem' }}>
                                <label>Header Text Color</label>
                                <ColorPicker
                                    label="Header Text Color"
                                    value={newSkinConfig.header.textColor}
                                    onChange={value => handleHeaderChange('textColor', value)}
                                />
                            </div>
                        </FormSection>
                        
                        <FormSection title="Popup Content Blocks">
                            <p style={styles.descriptionText}>Add text blocks above or below the game area.</p>
                            {(newSkinConfig.contentBlocks || []).filter(b => b.position === 'above').map(renderContentBlockEditor)}
                            <button type="button" onClick={() => addContentBlock('above')} style={{...styles.secondaryButton, marginTop: '0.5rem'}}>
                                + Add Block (Above Game)
                            </button>
                            
                            <div style={{...styles.configItem, textAlign: 'center', margin: '1rem 0', color: '#888', fontWeight: 'bold'}}>
                                --- 16:9 Game Area ---
                            </div>
                            
                            {(newSkinConfig.contentBlocks || []).filter(b => b.position === 'below').map(renderContentBlockEditor)}
                            <button type="button" onClick={() => addContentBlock('below')} style={{...styles.secondaryButton, marginTop: '0.5rem'}}>
                                + Add Block (Below Game)
                            </button>
                        </FormSection>
                        
                        <FormSection title="Popup Controls">
                            <div style={styles.configItem}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={newSkinConfig.showExitButton}
                                        onChange={e => handleConfigChange('showExitButton', e.target.checked)}
                                    />
                                    Show Exit (Close) Button
                                </label>
                            </div>
                            <div style={{ ...styles.configItem, marginTop: '0.5rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={newSkinConfig.showMuteButton}
                                        onChange={e => handleConfigChange('showMuteButton', e.target.checked)}
                                    />
                                    Show Mute/Unmute Button
                                </label>
                            </div>
                        </FormSection>

                        <FormSection title="Popup Styling">
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                                <ColorPicker
                                    label="Container Background"
                                    value={newSkinConfig.styling.backgroundColor}
                                    onChange={value => handleStylingChange('backgroundColor', value)}
                                />
                                <ColorPicker
                                    label="Header Background"
                                    value={newSkinConfig.styling.headerBackground}
                                    onChange={value => handleStylingChange('headerBackground', value)}
                                />
                                <ColorPicker
                                    label="Content Block Background"
                                    value={newSkinConfig.styling.contentBackground}
                                    onChange={value => handleStylingChange('contentBackground', value)}
                                />
                            </div>
                        </FormSection>
                    </>
                )}
                
                <button type="submit" style={{...styles.createButton, marginTop: '1.5rem'}}>{getCreateButtonText()}</button>
            </form>
            {/* --- End Create New Form --- */}

            <div style={{...styles.tabContainer, marginTop: '3rem'}}>
                <button onClick={() => setActiveTab('Unconfigured')} style={activeTab === 'Unconfigured' ? {...styles.tabButton, ...styles.tabButtonActive} : styles.tabButton}>Unconfigured</button>
                <button onClick={() => setActiveTab('Popup')} style={activeTab === 'Popup' ? {...styles.tabButton, ...styles.tabButtonActive} : styles.tabButton}>Popup</button>
                <button disabled style={styles.tabButton}>On-Page Section</button>
                <button disabled style={styles.tabButton}>New Webpage</button>
            </div>
            
            {/* --- REFACTOR: Update Algolia indexName --- */}
            <InstantSearch key={searchKey} searchClient={searchClient} indexName="deliveryContainers">
                <div style={styles.filterContainer}>
                    
                    {/* --- THIS IS THE FIX (Part 2) --- */}
                    {/* We render the new component *inside* InstantSearch */}
                    <ConnectedSearchBox 
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                    />
                    
                    <FilterBar
                        // --- REFACTOR: Pass new config object ---
                        filters={containerFilterConfig}
                        filterValues={filterValues}
                        onFilterChange={handleFilterChange}
                        onResetFilters={handleResetFilters}
                    />
                </div>

                {/* --- REFACTOR: Render a SINGLE ContainerList, not multiple <Index> wrappers --- */}
                {activeTab === 'Unconfigured' && (
                    <ContainerList
                        tab="Unconfigured"
                        filters={filterValues}
                        searchTerm={searchTerm}
                        handleEditContainer={handleEditContainer}
                        duplicateDeliveryContainer={duplicateDeliveryContainer}
                        toggleDeliveryContainerFavorite={toggleDeliveryContainerFavorite}
                        deleteDeliveryContainer={deleteDeliveryContainer}
                        deleteMultipleDeliveryContainers={handleDeleteMultiple}
                        macrogames={macrogames}
                        allMicrogames={allMicrogames}
                        forceRefresh={forceRefresh} // --- 8. Pass prop down ---
                    />
                )}

                {activeTab === 'Popup' && (
                    <ContainerList
                        tab="Popup"
                        filters={filterValues}
                        searchTerm={searchTerm}
                        handleEditContainer={handleEditContainer}
                        duplicateDeliveryContainer={duplicateDeliveryContainer}
                        toggleDeliveryContainerFavorite={toggleDeliveryContainerFavorite}
                        deleteDeliveryContainer={deleteDeliveryContainer}
                        deleteMultipleDeliveryContainers={handleDeleteMultiple}
                        macrogames={macrogames}
                        allMicrogames={allMicrogames}
                        forceRefresh={forceRefresh} // --- 8. Pass prop down ---
                    />
                )}
                {/* --- END REFACTOR --- */}
            </InstantSearch>
        </div>
    );
};