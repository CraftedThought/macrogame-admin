/* src/components/views/MicrogamesPage.tsx */

import React, { useState, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { notifications } from '../../utils/notifications';
import { styles } from '../../App.styles';
import { Microgame, CustomMicrogame } from '../../types';
import { useData } from '../../hooks/useData';
import { MicrogameCard } from '../ui/MicrogameCard';
import { TEMPO_OPTIONS, LENGTH_OPTIONS, LENGTH_DEFINITIONS, UI_SKINS, CONVERSION_GOALS } from '../../constants';
import { PaginatedList } from '../ui/PaginatedList';
import { FilterBar, FilterConfig } from '../ui/FilterBar';
import { createSingleGamePreviewConfig, launchPreview } from '../../utils/helpers';

// --- Algolia & React InstantSearch Imports ---
import * as algoliasearch from 'algoliasearch';
import {
  InstantSearch,
  useHits,
  useSearchBox,
  useConfigure,
  useInstantSearch,
} from 'react-instantsearch';

// --- Initialize Algolia Search Client ---
const appId = import.meta.env.VITE_ALGOLIA_APP_ID;
const searchKey = import.meta.env.VITE_ALGOLIA_SEARCH_KEY;
const searchClient = algoliasearch.algoliasearch(appId, searchKey);

interface MicrogamesPageProps {
    onCustomize: (data: { baseGame: Microgame, variant?: CustomMicrogame }) => void;
}

// --- Helper: Grouped Custom Games Component ---
const GroupedCustomGames: React.FC<{
    groupName: string;
    variants: CustomMicrogame[];
    onEdit: (variant: CustomMicrogame) => void;
    onPreview: (variant: CustomMicrogame) => void;
    onDuplicate: (variant: CustomMicrogame) => void; // <--- Ensure this prop is here
    onDelete: (variantId: string) => void;
}> = ({ groupName, variants, onEdit, onPreview, onDuplicate, onDelete }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    return (
        <div style={{ ...styles.listItem, flexDirection: 'column', alignItems: 'stretch' }}>
            <div onClick={() => setIsExpanded(!isExpanded)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <strong>{groupName} ({variants.length} {variants.length === 1 ? 'Variant' : 'Variants'})</strong>
                <button style={styles.accordionButton}>{isExpanded ? '▲' : '▼'}</button>
            </div>
            {isExpanded && (
                <div style={{ marginTop: '1rem', borderTop: '1px solid #ddd', paddingTop: '1rem' }}>
                    {variants.map(variant => (
                        <div key={variant.id} style={{ ...styles.listItem, padding: '0.5rem 1rem', marginBottom: '0.5rem' }}>
                            <div>{variant.name}</div>
                            <div style={styles.managerActions}>
                                <button onClick={() => onPreview(variant)} style={styles.previewButton}>Preview</button>
                                {/* --- NEW DUPLICATE BUTTON --- */}
                                <button onClick={() => onDuplicate(variant)} style={styles.editButton}>Duplicate</button>
                                <button onClick={() => onEdit(variant)} style={styles.editButton}>Edit</button>
                                <button onClick={() => onDelete(variant.id)} style={styles.deleteButton}>Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- NEW: Local View Component ---
const LocalMicrogamesView = ({
    filters,
    allMicrogames,
    customMicrogames,
    toggleMicrogameFavorite,
    deleteCustomMicrogame,
    handlePreview,
    handlePreviewVariant,
    handleEditCustom,
    handleDuplicateCustom,
    onCustomize,
}: any) => {
    const [expandedCard, setExpandedCard] = useState<string | null>(null);

    // --- Local Filtering Logic ---
    const filteredGames = useMemo(() => {
        return allMicrogames
            .filter((game: Microgame) => game.isActive !== false)
            // Note: searchTerm logic moved to parent switching logic, but we keep basic filter here if needed
            // However, in Hybrid mode, if searchTerm exists, we use AlgoliaView. 
            // So this local view implies "No Search Term" or "Local Filtering Only".
            .filter((game: Microgame) => filters.goalFilter === 'All' || game.compatibleConversionGoals.includes(filters.goalFilter))
            .filter((game: Microgame) => filters.tempoFilter === 'All' || game.tempo === filters.tempoFilter)
            .filter((game: Microgame) => filters.lengthFilter === 'All' || LENGTH_DEFINITIONS[filters.lengthFilter](game.length))
            .filter((game: Microgame) => filters.experienceFilter === 'All' || game.gameplayExperience === filters.experienceFilter)
            .filter((game: Microgame) => {
                if (filters.experienceFilter !== 'Generalized' || filters.typeFilter === 'All') return true;
                const type = filters.typeFilter === 'Chance-Based' ? 'chance' : 'skill';
                return game.mechanicType === type;
            });
    }, [allMicrogames, filters]);
    
    const favoriteGames = filteredGames.filter((game: Microgame) => game.isFavorite);

    // --- Grouping Logic for Custom Variants ---
    const { validGroups, orphanedVariants } = useMemo(() => {
        const result = customMicrogames.reduce((acc: any, variant: CustomMicrogame) => {
            const baseGame = allMicrogames.find((g: Microgame) => g.id === variant.baseMicrogameId);
            if (!baseGame) {
                acc.orphaned.push(variant);
                return acc;
            }

            const baseId = variant.baseMicrogameId;
            if (!acc.valid[baseId]) {
                acc.valid[baseId] = { baseName: variant.baseMicrogameName, variants: [] };
            }
            acc.valid[baseId].variants.push(variant);
            return acc;
        }, { 
            valid: {} as { [key: string]: { baseName: string, variants: CustomMicrogame[] } },
            orphaned: [] as CustomMicrogame[]
        });

        return {
            validGroups: Object.values(result.valid),
            orphanedVariants: result.orphaned
        };
    }, [customMicrogames, allMicrogames]);

    // Update the render function to pass onDuplicate
    const renderCustomGroup = (group: any, isSelected: boolean, onToggleSelect: () => void) => (
        <li key={group.id} style={{ ...styles.rewardListItem, ...styles.listItemWithCheckbox, paddingLeft: 0, paddingRight: 0 }}>
            <input type="checkbox" checked={isSelected} onChange={onToggleSelect} style={{marginLeft: '1rem'}} />
            <div style={{flex: 1}}>
                <GroupedCustomGames 
                    groupName={group.baseName} 
                    variants={group.variants} 
                    onEdit={handleEditCustom} 
                    onPreview={handlePreviewVariant} 
                    onDuplicate={handleDuplicateCustom} // <--- Pass it here
                    onDelete={deleteCustomMicrogame} 
                />
            </div>
        </li>
    );

    return (
        <>
            {favoriteGames.length > 0 && (
                <>
                    <h3 style={styles.h3}>Favorite Microgames</h3>
                    <div style={styles.cardContainer}>
                        {favoriteGames.map((game: Microgame) => (
                             <MicrogameCard 
                                key={game.id} 
                                game={game} 
                                isExpanded={expandedCard === game.id} 
                                onExpand={() => setExpandedCard(expandedCard === game.id ? null : game.id)} 
                                context="library"
                                onToggleFavorite={() => toggleMicrogameFavorite(game.id, !game.isFavorite)} 
                                onPreview={() => handlePreview(game)} 
                                onCustomize={() => onCustomize({ baseGame: game })}
                            />
                        ))}
                    </div>
                </>
            )}

            <h3 style={styles.h3}>Base Microgames</h3>
            <p style={styles.descriptionText}>These are the core microgames available. Click "Customize" to create your own version with unique visuals.</p>
            <div style={styles.cardContainer}>
                {filteredGames.length > 0 ? (
                    filteredGames.map((game: Microgame) => (
                         <MicrogameCard 
                            key={game.id} 
                            game={game} 
                            isExpanded={expandedCard === game.id} 
                            onExpand={() => setExpandedCard(expandedCard === game.id ? null : game.id)} 
                            context="library"
                            onToggleFavorite={() => toggleMicrogameFavorite(game.id, !game.isFavorite)} 
                            onPreview={() => handlePreview(game)} 
                            onCustomize={() => onCustomize({ baseGame: game })}
                        />
                    ))
                ) : (<p>No microgames found matching your filters.</p>)}
            </div>

            <h3 style={styles.h3}>Custom Microgames</h3>
            <p style={styles.descriptionText}>These are variants that you have created.</p>
            {validGroups.length > 0 ? (
                <PaginatedList
                    items={validGroups.map((g: any) => ({...g, id: g.baseName}))}
                    renderItem={renderCustomGroup}
                    itemsPerPage={5}
                    listContainerStyle={styles.managerList}
                />
            ) : customMicrogames.length === 0 ? (
                <p>You haven't created any custom microgames yet.</p>
            ) : null}

            {orphanedVariants.length > 0 && (
                <>
                    <h4 style={{...styles.h4, marginTop: '2rem', color: '#e74c3c'}}>Orphaned Variants</h4>
                    <p style={styles.descriptionText}>
                        The following variants are linked to a base microgame that no longer exists. This can happen after a system update. You can safely delete them.
                    </p>
                    <ul style={styles.rewardsListFull}>
                        {orphanedVariants.map((variant: CustomMicrogame) => (
                            <li key={variant.id} style={{ ...styles.rewardListItem, backgroundColor: '#fff2f2' }}>
                                <div style={{opacity: 0.6}}>
                                    <strong>{variant.name}</strong>
                                    <div style={styles.rewardAnalytics}>
                                        <span>Base Game: {variant.baseMicrogameName} (Missing)</span>
                                    </div>
                                </div>
                                <div style={styles.managerActions}>
                                    <button onClick={() => deleteCustomMicrogame(variant.id)} style={styles.deleteButton}>Delete</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </>
    );
};

// --- NEW: Algolia View Component ---
const AlgoliaMicrogamesView = ({
    filters,
    handlePreview,
    onCustomize,
    toggleMicrogameFavorite
}: any) => {
    
    useConfigure({
        hitsPerPage: 1000,
        filters: useMemo(() => {
            const algoliaFilters = [];
            // We filter out inactive games same as local
            algoliaFilters.push('isActive != 0'); // Assuming boolean or int in Algolia

            if (filters.goalFilter !== 'All') {
                algoliaFilters.push(`compatibleConversionGoals:"${filters.goalFilter}"`);
            }
            if (filters.tempoFilter !== 'All') {
                algoliaFilters.push(`tempo:"${filters.tempoFilter}"`);
            }
            if (filters.experienceFilter !== 'All') {
                algoliaFilters.push(`gameplayExperience:"${filters.experienceFilter}"`);
            }
            // Logic for 'Type' which depends on Experience
            if (filters.experienceFilter === 'Generalized' && filters.typeFilter !== 'All') {
                const type = filters.typeFilter === 'Chance-Based' ? 'chance' : 'skill';
                algoliaFilters.push(`mechanicType:"${type}"`);
            }
            // Length Logic (Numeric Filter)
            if (filters.lengthFilter !== 'All') {
                if (filters.lengthFilter === 'Short') algoliaFilters.push('length <= 5');
                if (filters.lengthFilter === 'Medium') algoliaFilters.push('length > 5 AND length < 8');
                if (filters.lengthFilter === 'Long') algoliaFilters.push('length >= 8');
            }

            return algoliaFilters.join(' AND ');
        }, [filters]),
    });

    const { hits } = useHits();
    const { refresh } = useInstantSearch();
    const [expandedCard, setExpandedCard] = useState<string | null>(null);

    useEffect(() => { refresh(); }, [refresh]);

    // Local state for optimistic updates
    const [localHits, setLocalHits] = useState(hits);
    useEffect(() => { setLocalHits(hits); }, [hits]);

    const handleToggleFavorite = (id: string, currentStatus: boolean) => {
        toggleMicrogameFavorite(id, !currentStatus);
        setLocalHits(prev => prev.map(h => h.objectID === id ? { ...h, isFavorite: !currentStatus } : h));
    };

    return (
        <div>
            <h3 style={styles.h3}>Search Results</h3>
            <div style={styles.cardContainer}>
                {localHits.length > 0 ? (
                    localHits.map((hit: any) => {
                        // Reconstruct Microgame object from Algolia Hit
                        const gameData = { ...hit, id: hit.objectID } as Microgame;
                        return (
                            <MicrogameCard 
                                key={gameData.id} 
                                game={gameData} 
                                isExpanded={expandedCard === gameData.id} 
                                onExpand={() => setExpandedCard(expandedCard === gameData.id ? null : gameData.id)} 
                                context="library"
                                onToggleFavorite={() => handleToggleFavorite(gameData.id, !!gameData.isFavorite)} 
                                onPreview={() => handlePreview(gameData)} 
                                onCustomize={() => onCustomize({ baseGame: gameData })}
                            />
                        );
                    })
                ) : (
                    <p>No microgames found.</p>
                )}
            </div>
        </div>
    );
};

// --- Connected Search Box ---
const ConnectedSearchBox = ({ 
  searchTerm, 
  setSearchTerm
}: {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
}) => {
  const { refine } = useSearchBox();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    refine(value);
  };

  // Sync reset
  useEffect(() => {
    if (searchTerm === '') refine('');
  }, [searchTerm, refine]);

  return (
    <div style={styles.configItem}>
        <label>Search Microgames</label>
        <input
            type="text" placeholder="Search by name..." value={searchTerm}
            onChange={handleChange} style={styles.input}
        />
    </div>
  );
};

export const MicrogamesPage: React.FC<MicrogamesPageProps> = ({ onCustomize }) => {
    // 1. Get duplicate function
    const { allMicrogames, customMicrogames, toggleMicrogameFavorite, deleteCustomMicrogame, duplicateCustomMicrogame } = useData();
    const [searchKey, setSearchKey] = useState(Date.now());

    const [filters, setFilters] = useState({
        searchTerm: '',
        goalFilter: 'All',
        tempoFilter: 'All',
        lengthFilter: 'All',
        experienceFilter: 'All',
        typeFilter: 'All'
    });

    const handleFilterChange = (key: string, value: string) => {
        if (key === 'experienceFilter' && value !== 'Generalized') {
            setFilters(prev => ({ ...prev, [key]: value, typeFilter: 'All' }));
        } else {
            setFilters(prev => ({ ...prev, [key]: value }));
        }
    };

    const handleResetFilters = () => {
        setFilters({
            searchTerm: '', goalFilter: 'All', tempoFilter: 'All', lengthFilter: 'All',
            experienceFilter: 'All', typeFilter: 'All'
        });
        setSearchKey(Date.now());
    };

    const handlePreview = (game: Microgame) => {
        const previewConfig = createSingleGamePreviewConfig(game);
        launchPreview(previewConfig);
    };

    const handlePreviewVariant = (variant: CustomMicrogame) => {
        const baseGame = allMicrogames.find(g => g.id === variant.baseMicrogameId);
        if (baseGame) {
            const previewConfig = createSingleGamePreviewConfig(baseGame, variant);
            launchPreview(previewConfig);
        } else {
            notifications.error('Could not find the base microgame for this variant.');
        }
    };

    // --- NEW: Hybrid Duplicate Handler ---
    const handleDuplicateCustom = async (variant: CustomMicrogame) => {
        const isSearching = filters.searchTerm.trim().length > 0;
        
        // Show loading ONLY if searching (waiting for Algolia).
        // If local, the Firestore listener updates instantly.
        const loadingToast = isSearching ? notifications.loading('Duplicating variant...') : undefined;

        try {
            await duplicateCustomMicrogame(variant);

            if (isSearching && loadingToast) {
                await new Promise(resolve => setTimeout(resolve, 3000));
                setSearchKey(Date.now());
                notifications.dismiss(loadingToast);
            }
            
            notifications.success('Variant duplicated');
        } catch (error) {
            if (loadingToast) notifications.dismiss(loadingToast);
            notifications.error('Failed to duplicate variant.');
        }
    };

    // --- NEW: Hybrid Delete Handler (Fixed Double Notification) ---
    const handleDeleteCustom = async (variantId: string) => {
        const isSearching = filters.searchTerm.trim().length > 0;

        // The DataContext function handles the confirmation AND the success toast.
        const wasDeleted = await deleteCustomMicrogame(variantId);

        if (wasDeleted) {
            if (isSearching) {
                // If searching, we show a "Updating list..." loader to bridge the gap
                const loadingToast = notifications.loading('Updating list...');
                await new Promise(resolve => setTimeout(resolve, 3000));
                notifications.dismiss(loadingToast);
                setSearchKey(Date.now());
            } 
            // If Local, we do nothing. The DataContext toast showed success, 
            // and the list updates instantly via Firestore listener.
        }
    };
    
    const handleEditCustom = (variant: CustomMicrogame) => {
        const baseGame = allMicrogames.find(g => g.id === variant.baseMicrogameId);
        if (baseGame) {
            onCustomize({ baseGame, variant });
        } else {
            notifications.error('Could not find the base microgame for this variant.');
        }
    };
    
    const goalOptions = [
        { value: 'All', label: 'All' },
        ...Object.entries(CONVERSION_GOALS).map(([groupLabel, options]) => ({
            group: groupLabel,
            options: options.map(opt => ({ value: opt, label: opt }))
        }))
    ];

    const filterConfig: FilterConfig[] = [
        { type: 'select', label: 'Conversion Goal', options: goalOptions, stateKey: 'goalFilter' },
        { type: 'select', label: 'Gameplay Experience', options: ['All', 'Generalized', 'Rehearsal'], stateKey: 'experienceFilter' },
    ];

    if (filters.experienceFilter === 'Generalized') {
        filterConfig.push({ type: 'select', label: 'Type', options: ['All', 'Chance-Based', 'Skill'], stateKey: 'typeFilter' });
    }

    filterConfig.push(
        { type: 'select', label: 'Tempo', options: TEMPO_OPTIONS, stateKey: 'tempoFilter' },
        { type: 'select', label: 'Duration', options: LENGTH_OPTIONS, stateKey: 'lengthFilter' }
    );

    return (
        <div style={styles.creatorSection}>
            <div style={styles.managerHeader}><h2 style={styles.h2}>Microgame Manager</h2></div>
            
            <InstantSearch key={searchKey} searchClient={searchClient} indexName="microgames">
                <div style={{...styles.filterContainer, marginBottom: '1rem'}}>
                    <ConnectedSearchBox 
                        searchTerm={filters.searchTerm}
                        setSearchTerm={(val) => handleFilterChange('searchTerm', val)}
                    />
                </div>

                <FilterBar filters={filterConfig} filterValues={filters} onFilterChange={handleFilterChange} onResetFilters={handleResetFilters} />
                
                {/* HYBRID LOGIC */}
                {filters.searchTerm.trim().length > 0 ? (
                    <AlgoliaMicrogamesView 
                        filters={filters}
                        handlePreview={handlePreview}
                        onCustomize={onCustomize}
                        toggleMicrogameFavorite={toggleMicrogameFavorite}
                    />
                ) : (
                    <LocalMicrogamesView 
                        filters={filters}
                        allMicrogames={allMicrogames}
                        customMicrogames={customMicrogames}
                        toggleMicrogameFavorite={toggleMicrogameFavorite}
                        deleteCustomMicrogame={handleDeleteCustom} // Use Hybrid Handler
                        handleDuplicateCustom={handleDuplicateCustom} // Use Hybrid Handler
                        handlePreview={handlePreview}
                        handlePreviewVariant={handlePreviewVariant}
                        handleEditCustom={handleEditCustom}
                        onCustomize={onCustomize}
                    />
                )}
            </InstantSearch>
        </div>
    );
};