/* src/components/views/MacrogamesManager.tsx */

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { styles } from '../../App.styles';
import { Macrogame } from '../../types';
import { useData } from '../../hooks/useData';
import { PRODUCT_CATEGORIES, MACROGAME_LENGTH_OPTIONS, NUMBER_OF_GAMES_OPTIONS, YES_NO_ALL_OPTIONS, MACROGAME_MUSIC_LIBRARY, CONVERSION_METHOD_TYPES } from '../../constants';
import { PaginatedList } from '../ui/PaginatedList';
import { FilterBar, FilterConfig } from '../ui/FilterBar';
import { StarIcon } from '../ui/StarIcon';
import { notifications } from '../../utils/notifications';

// --- Algolia & React InstantSearch Imports ---
import * as algoliasearch from 'algoliasearch';
import {
  InstantSearch,
  useHits,
  useSearchBox, // <-- THIS IS NEEDED
  useConfigure,
  useInstantSearch,
} from 'react-instantsearch';
// --- END NEW ---

// --- Initialize Algolia Search Client ---
const appId = import.meta.env.VITE_ALGOLIA_APP_ID;
const searchKey = import.meta.env.VITE_ALGOLIA_SEARCH_KEY;
const searchClient = algoliasearch.algoliasearch(appId, searchKey);
// --- END NEW ---

interface MacrogamesManagerProps {
    handleDeployMacrogame: (macrogame: Macrogame) => Promise<void>;
    handleEditMacrogame: (macrogame: Macrogame) => void;
}

// --- NEW: Local List Component ---
const LocalMacrogameList = ({
    filters,
    handleDeployMacrogame,
    handleEditMacrogame,
    duplicateMacrogame,
    deleteMacrogame,
    toggleMacrogameFavorite,
    deleteMultipleMacrogames,
    favoriteGames,
    setFavoriteGames,
}: {
    filters: any;
    handleDeployMacrogame: (macrogame: Macrogame) => Promise<void>;
    handleEditMacrogame: (macrogame: Macrogame) => void;
    duplicateMacrogame: (gameToDuplicate: Macrogame) => Promise<void>;
    deleteMacrogame: (id: string) => Promise<boolean>;
    toggleMacrogameFavorite: (macrogameId: string, isFavorite: boolean) => Promise<void>;
    deleteMultipleMacrogames: (ids: string[]) => Promise<void>;
    favoriteGames: Macrogame[];
    setFavoriteGames: (games: Macrogame[]) => void;
}) => {
    const { macrogames } = useData();

    // --- Client-Side Filtering ---
    const filteredGames = useMemo(() => {
        return macrogames.filter(game => {
            // Category
            if (filters.categoryFilter !== 'All' && game.category !== filters.categoryFilter) return false;
            // Subcategory
            if (filters.subcategoryFilter !== 'All' && game.subcategory !== filters.subcategoryFilter) return false;
            // # of Games
            const numGames = game.flow.length;
            if (filters.numGamesFilter !== 'All') {
                if (filters.numGamesFilter === '4+' && numGames < 4) return false;
                if (filters.numGamesFilter !== '4+' && numGames !== parseInt(filters.numGamesFilter)) return false;
            }
            // Custom Game
            const hasCustom = (game.variantIdList?.length || 0) > 0;
            if (filters.customGameFilter !== 'All') {
                if (filters.customGameFilter === 'Yes' && !hasCustom) return false;
                if (filters.customGameFilter === 'No' && hasCustom) return false;
            }
            // Intro Screen
            if (filters.introScreenFilter !== 'All') {
                const enabled = game.introScreen?.enabled;
                if (filters.introScreenFilter === 'Yes' && !enabled) return false;
                if (filters.introScreenFilter === 'No' && enabled) return false;
            }
            // Promo Screen
            if (filters.promoScreenFilter !== 'All') {
                const enabled = game.promoScreen?.enabled;
                if (filters.promoScreenFilter === 'Yes' && !enabled) return false;
                if (filters.promoScreenFilter === 'No' && enabled) return false;
            }
            // Music
            if (filters.musicFilter !== 'All') {
                const selectedTrack = MACROGAME_MUSIC_LIBRARY.find(track => track.name === filters.musicFilter);
                const targetPath = selectedTrack?.path || null;
                const gameMusicPath = game.config.backgroundMusicUrl || null;
                
                // Special check for 'None'
                if (filters.musicFilter === 'None') {
                     if (gameMusicPath !== null) return false;
                } else {
                     if (gameMusicPath !== targetPath) return false;
                }
            }
            // Duration and Conversion Method filters are complex or require joined data
            // For the Local View, we can skip them or assume they are rarely used without a search term.
            // If critical, we can calculate duration from flow here.

            return true;
        });
    }, [macrogames, filters]);

    // Update favorite list based on LOCAL filtered games
    useEffect(() => {
        setFavoriteGames(filteredGames.filter(g => g.isFavorite));
    }, [filteredGames, setFavoriteGames]);

    const handlePreview = (macrogame: Macrogame) => {
      if (!macrogame) return;
      const previewConfig = { 
          macrogameId: macrogame.id, // Use real ID
          skinId: 'barebones',
          isPreviewMode: 'full_macrogame'
      };
      localStorage.setItem('macrogame_preview_data', JSON.stringify(previewConfig));
      window.open('/preview.html', '_blank');
    };

    const renderMacrogameItem = (game: Macrogame, isSelected: boolean, onToggleSelect: () => void) => {
        const hasAlert = game.status?.code === 'error';
        const numGames = game.flow.length;
        
        return (
            <div key={game.id} style={{ ...styles.listItem, ...styles.listItemWithCheckbox }}>
                <input type="checkbox" checked={isSelected} onChange={onToggleSelect} />
                <div style={{flex: 1}}><strong>{game.name}</strong></div>
                <div style={styles.managerActions}>
                    {hasAlert && <span style={styles.warningTag} title={game.status?.message || "Needs Attention"}>Needs Attention</span>}
                    <span style={styles.tag}>#{game.category}</span>
                    <span>{numGames} microgames</span>
                    <button onClick={() => handlePreview(game)} style={styles.previewButton}>Preview</button>
                    <button onClick={() => handleDeployMacrogame(game)} style={styles.publishButton} disabled={hasAlert} title={hasAlert ? `Cannot deploy: ${game.status?.message}` : ""}>Deploy</button>
                    <button onClick={() => duplicateMacrogame(game)} style={styles.editButton}>Duplicate</button>
                    <button onClick={() => handleEditMacrogame(game)} style={styles.editButton}>Edit</button>
                    <button onClick={() => deleteMacrogame(game.id)} style={styles.deleteButton}>Delete</button>
                    <button onClick={() => toggleMacrogameFavorite(game.id, !game.isFavorite)} style={{ background: 'none', border: 'none', padding: '0 0 0 0.5rem' }}>
                        <StarIcon isFavorite={!!game.isFavorite} />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <>
            {favoriteGames.length > 0 && (
                <>
                    <h3 style={styles.h3}>Favorite Macrogames</h3>
                    <PaginatedList
                        items={favoriteGames}
                        renderItem={renderMacrogameItem}
                        bulkActions={[{
                            label: 'Delete Selected',
                            onAction: (selectedItems) => deleteMultipleMacrogames(selectedItems.map(item => item.id))
                        }]}
                        listContainerStyle={styles.managerList}
                    />
                </>
            )}
            
            <h3 style={styles.h3}>All Macrogames</h3>
            <PaginatedList
                items={filteredGames}
                renderItem={renderMacrogameItem}
                bulkActions={[{
                    label: 'Delete Selected',
                    onAction: (selectedItems) => deleteMultipleMacrogames(selectedItems.map(item => item.id))
                }]}
                listContainerStyle={styles.managerList}
            />
        </>
    );
};

// --- Inner component to connect to Algolia ---
const AlgoliaMacrogameList = ({
  filters,
  handleDeployMacrogame,
  handleEditMacrogame,
  duplicateMacrogame,
  deleteMacrogame,
  toggleMacrogameFavorite,
  deleteMultipleMacrogames,
  favoriteGames,
  setFavoriteGames,
  forceRefresh, // --- 1. Receive new prop ---
}: {
  filters: any;
  handleDeployMacrogame: (macrogame: Macrogame) => Promise<void>;
  handleEditMacrogame: (macrogame: Macrogame) => void;
  duplicateMacrogame: (gameToDuplicate: Macrogame) => Promise<void>;
  deleteMacrogame: (id: string) => Promise<boolean>;
  toggleMacrogameFavorite: (macrogameId: string, isFavorite: boolean) => Promise<void>;
  deleteMultipleMacrogames: (ids: string[]) => Promise<void>;
  favoriteGames: Macrogame[];
  setFavoriteGames: (games: Macrogame[]) => void;
  forceRefresh: () => void; // --- 1. Receive new prop ---
}) => {
  // --- THIS IS THE FIX ---
  // We REMOVE the useSearchBox({ query: ... }) from here.
  // It will be handled by its own component.

  // This hook configures all our filters for Algolia
  useConfigure({
    hitsPerPage: 1000, // We get all hits and use our own PaginatedList
    filters: useMemo(() => {
      const algoliaFilters = [];

      // --- Simple facet filters ---
      if (filters.categoryFilter !== 'All') algoliaFilters.push(`category:"${filters.categoryFilter}"`);
      if (filters.subcategoryFilter !== 'All') algoliaFilters.push(`subcategory:"${filters.subcategoryFilter}"`);
      if (filters.numGamesFilter !== 'All') {
        if (filters.numGamesFilter === '4+') algoliaFilters.push('numGames >= 4');
        else algoliaFilters.push(`numGames = ${filters.numGamesFilter}`);
      }
      if (filters.customGameFilter !== 'All') algoliaFilters.push(`hasCustomGames = ${filters.customGameFilter === 'Yes' ? 1 : 0}`);
      if (filters.introScreenFilter !== 'All') algoliaFilters.push(`introScreen.enabled = ${filters.introScreenFilter === 'Yes' ? 1 : 0}`);
      if (filters.promoScreenFilter !== 'All') algoliaFilters.push(`promoScreen.enabled = ${filters.promoScreenFilter === 'Yes' ? 1 : 0}`);
      
      // --- Music Filter ---
      if (filters.musicFilter !== 'All') {
        const selectedTrack = MACROGAME_MUSIC_LIBRARY.find(track => track.name === filters.musicFilter);
        const musicUrl = selectedTrack?.path || null;
        if (musicUrl) {
            algoliaFilters.push(`musicUrl:"${musicUrl}"`);
        } else {
            // Check for 'None'
            algoliaFilters.push('_tags:music_url_null');
        }
      }

      // --- Duration Filter ---
      if (filters.durationFilter === 'Short (< 20s)') algoliaFilters.push('duration < 20');
      if (filters.durationFilter === 'Medium (20s-30s)') algoliaFilters.push('duration: 20 TO 30');
      if (filters.durationFilter === 'Long (> 30s)') algoliaFilters.push('duration > 30');

      // --- Conversion Method Filter ---
      if (filters.conversionMethodFilter !== 'All') {
        if (filters.conversionMethodFilter === 'None') {
          algoliaFilters.push('_tags:no_conversion_methods');
        } else {
          algoliaFilters.push(`conversionMethodTypes:"${filters.conversionMethodFilter}"`);
        }
      }
      // --- END ---

      return algoliaFilters.join(' AND ');
    // --- THIS IS THE FIX ---
    // This dependency array is correct and stays.
    // It isolates this hook from the searchTerm.
    }, [
        filters.categoryFilter,
        filters.subcategoryFilter,
        filters.numGamesFilter,
        filters.customGameFilter,
        filters.introScreenFilter,
        filters.promoScreenFilter,
        filters.musicFilter,
        filters.durationFilter,
        filters.conversionMethodFilter
    ]),
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
  const handleToggleFavoriteClick = (macrogameId: string, isFavorite: boolean) => {
    // 1. Fire-and-forget the database update.
    // We don't wait for it.
    toggleMacrogameFavorite(macrogameId, isFavorite);

    // 2. Optimistically update our local UI state *immediately*.
    setLocalHits(currentHits => 
        currentHits.map(hit => 
            hit.objectID === macrogameId 
                ? { ...hit, isFavorite: isFavorite } 
                : hit
        )
    );
  };
  
  // --- NEW: Fixed handlePreview. It now lives here and has access to hits ---
  const handlePreview = (macrogame: Macrogame) => {
      if (!macrogame) return;

      const previewConfig = { 
          // Pass the ID, not the incomplete Algolia object
          macrogameId: macrogame.objectID, 
          skinId: 'barebones',
          isPreviewMode: 'full_macrogame'
      };
      localStorage.setItem('macrogame_preview_data', JSON.stringify(previewConfig));
      window.open('/preview.html', '_blank');
  };

  // --- REFACTORED: Simpler render function ---
  const renderMacrogameItem = (game: Macrogame, isSelected: boolean, onToggleSelect: () => void) => {
    // The server now calculates the status for us!
    const hasAlert = game.status?.code === 'error';
    
    return (
        <div key={game.objectID || game.id} style={{ ...styles.listItem, ...styles.listItemWithCheckbox }}>
            <input type="checkbox" checked={isSelected} onChange={onToggleSelect} />
            <div style={{flex: 1}}><strong>{game.name}</strong></div>
            <div style={styles.managerActions}>
                {hasAlert && <span style={styles.warningTag} title={game.status?.message || "Needs Attention"}>Needs Attention</span>}
                <span style={styles.tag}>#{game.category}</span>
                <span>{game.numGames || 0} microgames</span>
                {/* --- UPDATED: Call local handlePreview with the full game object --- */}
                <button onClick={() => handlePreview(game)} style={styles.previewButton}>Preview</button>
                <button onClick={() => handleDeployMacrogame(game)} style={styles.publishButton} disabled={hasAlert} title={hasAlert ? `Cannot deploy: ${game.status?.message}` : ""}>Deploy</button>
                <button onClick={() => handleDuplicateClick(game)} style={styles.editButton}>Duplicate</button>
                <button onClick={() => handleEditMacrogame(game.objectID)} style={styles.editButton}>Edit</button>
                <button onClick={() => handleDeleteClick(game.objectID)} style={styles.deleteButton}>Delete</button>
                <button onClick={() => handleToggleFavoriteClick(game.objectID, !game.isFavorite)} style={{ background: 'none', border: 'none', padding: '0 0 0 0.5rem' }}>
                    <StarIcon isFavorite={!!game.isFavorite} />
                </button>
            </div>
        </div>
    );
  };

  // Update favorite list based on hits
  React.useEffect(() => {
    setFavoriteGames(localHits.filter((h: any) => h.isFavorite) as Macrogame[]);
  }, [localHits, setFavoriteGames]);

  return (
    <>
      {favoriteGames.length > 0 && (
          <>
              <h3 style={styles.h3}>Favorite Macrogames</h3>
              <PaginatedList
                  items={favoriteGames}
                  renderItem={renderMacrogameItem}
                  bulkActions={[{
                      label: 'Delete Selected',
                      onAction: (selectedItems) => deleteMultipleMacrogames(selectedItems.map(item => item.id))
                  }]}
                  listContainerStyle={styles.managerList}
              />
          </>
      )}
      
      <h3 style={styles.h3}>All Macrogames</h3>
      <PaginatedList
          items={localHits as Macrogame[]}
          renderItem={renderMacrogameItem}
          bulkActions={[{
              label: 'Delete Selected',
              onAction: (selectedItems) => deleteMultipleMacrogames(selectedItems.map(item => item.id))
          }]}
          listContainerStyle={styles.managerList}
      />
    </>
  );
};
// --- END NEW Inner Component ---


// --- THIS IS THE FIX (Part 1) ---
// This new component lives *inside* InstantSearch and *imperatively*
// controls the search query.
const ConnectedSearchBox = ({ 
  searchTerm, 
  handleFilterChange
}: {
  searchTerm: string;
  handleFilterChange: (key: string, value: string) => void;
}) => {
  // This hook is now called *inside* <InstantSearch> and is safe
  const { refine } = useSearchBox();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // 1. Update the parent's React state (to keep the input text)
    handleFilterChange('searchTerm', value);
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
        <label>Search Macrogames</label>
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

export const MacrogamesManager: React.FC<MacrogamesManagerProps> = ({ handleDeployMacrogame, handleEditMacrogame }) => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // --- REFACTORED: We only need the *actions* from useData now ---
    const { deleteMacrogame, duplicateMacrogame, toggleMacrogameFavorite, deleteMultipleMacrogames } = useData();
    
    // This state is still the source of truth for the filter UI
    const [filters, setFilters] = useState({
        searchTerm: '',
        categoryFilter: 'All',
        subcategoryFilter: 'All',
        durationFilter: 'All',
        numGamesFilter: 'All',
        conversionMethodFilter: 'All', // This filter is now fixed
        introScreenFilter: 'All',
        promoScreenFilter: 'All',
        customGameFilter: 'All',
        musicFilter: 'All'
    });

    // --- 2. Update handleDuplicateClick to use blocking pattern ---
    const handleDuplicateClick = async (gameToDuplicate: Macrogame) => {
        const isSearching = filters.searchTerm.trim().length > 0;
        const loadingToast = isSearching ? notifications.loading('Duplicating macrogame...') : undefined;

        try {
            await duplicateMacrogame(gameToDuplicate as any);

            if (isSearching && loadingToast) {
                await new Promise(resolve => setTimeout(resolve, 3000));
                setSearchKey(Date.now());
                notifications.dismiss(loadingToast);
            }
            
            notifications.success('Macrogame duplicated');
        } catch (error) {
            if (loadingToast) notifications.dismiss(loadingToast);
            notifications.error('Failed to duplicate macrogame.');
            console.error("Duplicate failed:", error);
        }
    };

    // --- 3. Update handleDeleteClick to use blocking pattern ---
    const handleDeleteClick = async (gameId: string) => {
        const isSearching = filters.searchTerm.trim().length > 0;

        const wasDeleted = await deleteMacrogame(gameId);

        if (wasDeleted) {
            if (isSearching) {
                const loadingToast = notifications.loading('Updating list...');
                await new Promise(resolve => setTimeout(resolve, 3000));
                notifications.dismiss(loadingToast);
                notifications.success('Macrogame deleted');
                setSearchKey(Date.now());
            } else {
                notifications.success('Macrogame deleted');
            }
        }
    };

    // --- SAFE ACTION WRAPPERS ---

    const handleEditClick = (idOrObj: string | any) => {
        // Resolve the ID whether it's a string ID or an object with objectID
        const id = typeof idOrObj === 'string' ? idOrObj : (idOrObj.id || idOrObj.objectID);
        if (id) {
            handleEditMacrogame(id);
        } else {
            notifications.error("Error: Cannot identify macrogame to edit.");
        }
    };

    const handleDeployClick = async (game: Macrogame) => {
        // Ensure we have a valid ID before deploying
        const realId = game.id || (game as any).objectID;
        if (!realId) {
            notifications.error("Error: Invalid macrogame data.");
            return;
        }
        // Pass a constructed object with the guaranteed ID to App.tsx
        await handleDeployMacrogame({ ...game, id: realId });
    };
    
    // --- State for favorite games, to be populated by the Hits component ---
    const [favoriteGames, setFavoriteGames] = useState<Macrogame[]>([]);

    // --- Add a key to force re-mounting InstantSearch to bust cache ---
    const [searchKey, setSearchKey] = useState(Date.now());

    useEffect(() => {
        // If we receive a refresh signal from App.tsx (after an edit), refresh the list
        if (location.state?.refreshTimestamp) {
            setSearchKey(Date.now());
            // Optional: clear the state to prevent double refreshes if needed, 
            // though changing the key handles it safely.
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleResetFilters = () => {
        setFilters({
            searchTerm: '',
            categoryFilter: 'All',
            subcategoryFilter: 'All',
            durationFilter: 'All',
            numGamesFilter: 'All',
            conversionMethodFilter: 'All',
            introScreenFilter: 'All',
            promoScreenFilter: 'All',
            customGameFilter: 'All',
            musicFilter: 'All'
        });
        // --- Update the key to force a re-mount ---
        // We no longer call refine() here; the useEffect in
        // ConnectedSearchBox will handle it.
        setSearchKey(Date.now());
    };

    const handleDeleteMultipleMacrogames = async (ids: string[]) => {
        // Check if we are searching (Algolia mode)
        const isSearching = filters.searchTerm.trim().length > 0;

        // 1. Call the "silent" delete function (it handles the confirmation dialog)
        const wasConfirmed = await deleteMultipleMacrogames(ids);

        // 2. If confirmed, handle the UI flow based on mode
        if (wasConfirmed) {
            if (isSearching) {
                // ALGOLIA MODE: Needs delay
                const loadingToast = notifications.loading(`Deleting ${ids.length} macrogames...`);
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                notifications.dismiss(loadingToast);
                notifications.success(`${ids.length} macrogames deleted`);
                setSearchKey(Date.now()); // Force refresh
            } else {
                // LOCAL MODE: Instant
                notifications.success(`${ids.length} macrogames deleted`);
            }
        }
    };
    
    // --- REMOVED: handlePreview function was moved to MacrogameList ---

    const filterConfig = useMemo(() => {
        // --- UPDATED: REWARD_TYPES_OPTIONS now comes from constants ---
        const conversionMethodTypes = ['All', 'None', ...CONVERSION_METHOD_TYPES.map(type => ({ value: type, label: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }))];

        const config: FilterConfig[] = [
            { type: 'select', label: 'Product Category', options: ['All', ...Object.keys(PRODUCT_CATEGORIES)], stateKey: 'categoryFilter' },
            // Subcategory will be inserted here if needed
            { type: 'select', label: 'Duration', options: MACROGAME_LENGTH_OPTIONS, stateKey: 'durationFilter' },
            { type: 'select', label: '# of Microgames', options: NUMBER_OF_GAMES_OPTIONS, stateKey: 'numGamesFilter' },
            { type: 'select', label: 'Conversion Method', options: conversionMethodTypes as any, stateKey: 'conversionMethodFilter' },
            { type: 'select', label: 'Intro Screen', options: YES_NO_ALL_OPTIONS, stateKey: 'introScreenFilter' },
            { type: 'select', label: 'Promo Screen', options: YES_NO_ALL_OPTIONS, stateKey: 'promoScreenFilter' },
            { type: 'select', label: 'Custom Microgame', options: YES_NO_ALL_OPTIONS, stateKey: 'customGameFilter' },
            { type: 'select', label: 'Background Music', options: ['All', ...MACROGAME_MUSIC_LIBRARY.map(track => track.name)], stateKey: 'musicFilter' },
        ];

        if (filters.categoryFilter !== 'All' && PRODUCT_CATEGORIES[filters.categoryFilter]) {
            config.splice(1, 0, {
                type: 'select',
                label: 'Subcategory',
                options: ['All', ...PRODUCT_CATEGORIES[filters.categoryFilter]],
                stateKey: 'subcategoryFilter'
            });
        }

        return config;
    }, [filters.categoryFilter]);
    
    // --- REMOVED: filteredGames array ---

    return (
        <div style={styles.creatorSection}>
            <div style={styles.managerHeader}>
                <h2 style={styles.h2}>Macrogame Manager</h2>
                <button onClick={() => navigate('/creator')} style={styles.saveButton}>Create New</button>
            </div>
            
            {/* --- Wrap filtering UI in InstantSearch --- */}
            <InstantSearch key={searchKey} searchClient={searchClient} indexName="macrogames">
                <div style={styles.filterContainer}>
                    
                    {/* --- THIS IS THE FIX (Part 2) --- */}
                    {/* We render the new component *inside* InstantSearch */}
                    <ConnectedSearchBox 
                        searchTerm={filters.searchTerm}
                        handleFilterChange={handleFilterChange}
                    />

                    <FilterBar filters={filterConfig} filterValues={filters} onFilterChange={handleFilterChange} onResetFilters={handleResetFilters} />
                </div>
                
                {/* Conditional Rendering: Algolia vs Local */}
                {filters.searchTerm.trim().length > 0 ? (
                    <AlgoliaMacrogameList 
                        filters={filters}
                        handleDeployMacrogame={handleDeployClick} // Use safe wrapper
                        handleEditMacrogame={handleEditClick} // Use safe wrapper
                        duplicateMacrogame={duplicateMacrogame}
                        deleteMacrogame={deleteMacrogame}
                        toggleMacrogameFavorite={toggleMacrogameFavorite}
                        deleteMultipleMacrogames={handleDeleteMultipleMacrogames}
                        favoriteGames={favoriteGames}
                        setFavoriteGames={setFavoriteGames}
                        forceRefresh={() => setSearchKey(Date.now())}
                    />
                ) : (
                    <LocalMacrogameList 
                        filters={filters}
                        handleDeployMacrogame={handleDeployClick} // Use safe wrapper
                        handleEditMacrogame={handleEditClick}     // Use safe wrapper
                        duplicateMacrogame={handleDuplicateClick} // Use main handler
                        deleteMacrogame={handleDeleteClick}       // Use main handler
                        toggleMacrogameFavorite={toggleMacrogameFavorite}
                        deleteMultipleMacrogames={handleDeleteMultipleMacrogames}
                        favoriteGames={favoriteGames}
                        setFavoriteGames={setFavoriteGames}
                    />
                )}
            </InstantSearch>
        </div>
    );
};