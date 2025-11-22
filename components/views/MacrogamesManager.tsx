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

// --- Inner component to connect to Algolia ---
const MacrogameList = ({
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

  // --- 2. Update handleDuplicateClick to use blocking pattern ---
  const handleDuplicateClick = async (gameToDuplicate: Macrogame) => {
    // 1. Show a loading toast and get its ID
    const loadingToastId = notifications.loading('Duplicating macrogame...');

    try {
        // 2. Call the database function and *wait* for it to complete.
        await duplicateMacrogame(gameToDuplicate as any); // Cast as any to match DataContext

        // 3. Add a 4-second delay to allow Algolia to index the new item.
        await new Promise(resolve => setTimeout(resolve, 4000)); 

        // 4. NOW force a full refresh from Algolia.
        forceRefresh();

        // 5. Dismiss the loading toast and show success
        notifications.dismiss(loadingToastId);
        notifications.success('Macrogame duplicated');
    } catch (error) {
        // 5. If anything fails, dismiss the loading toast and show an error
        notifications.dismiss(loadingToastId);
        notifications.error('Failed to duplicate macrogame.');
        console.error("Duplicate failed:", error);
    }
  };

  // --- 3. Update handleDeleteClick to use blocking pattern ---
  const handleDeleteClick = async (gameId: string) => {
    // 1. Call deleteMacrogame and wait for the user to confirm.
    const wasDeleted = await deleteMacrogame(gameId);

    // 2. If deleted, run the full notification flow *before* refreshing.
    if (wasDeleted) {
        // 3. Show ONE loading toast
        const loadingToast = notifications.loading('Updating list...');

        // 4. Add a 4-second delay for Algolia.
        await new Promise(resolve => setTimeout(resolve, 4000));
        
        // 5. Dismiss the loading toast
        notifications.dismiss(loadingToast);
        
        // 6. Show the success toast.
        notifications.success('Macrogame deleted');

        // 7. NOW, force the component to unmount and refetch.
        forceRefresh();
    }
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
        // 1. Call the "silent" delete function and wait for confirmation
        const wasDeleted = await deleteMultipleMacrogames(ids);

        // 2. If confirmed, run our clean notification and refresh flow
        if (wasDeleted) {
            const loadingToast = notifications.loading(`Deleting ${ids.length} macrogames...`);
            // Add a delay for Algolia to process the batch deletion
            await new Promise(resolve => setTimeout(resolve, 4000));
            
            notifications.dismiss(loadingToast);
            notifications.success(`${ids.length} macrogames deleted`);
            
            // Force the component to unmount and refetch
            setSearchKey(Date.now());
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
                
                {/* This component now connects to Algolia,
                  gets the hits, and renders our PaginatedList.
                */}
                <MacrogameList 
                    filters={filters}
                    handleDeployMacrogame={handleDeployMacrogame}
                    handleEditMacrogame={handleEditMacrogame}
                    // --- UPDATED: handlePreview prop removed ---
                    duplicateMacrogame={duplicateMacrogame}
                    deleteMacrogame={deleteMacrogame}
                    toggleMacrogameFavorite={toggleMacrogameFavorite}
                    deleteMultipleMacrogames={handleDeleteMultipleMacrogames}
                    favoriteGames={favoriteGames}
                    setFavoriteGames={setFavoriteGames}
                    forceRefresh={() => setSearchKey(Date.now())} // --- 4. Pass new prop down ---
                />
            </InstantSearch>
        </div>
    );
};