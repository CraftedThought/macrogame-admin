// src/components/views/MacrogamesManager.tsx

import React, { useState, useMemo } from 'react';
import { styles } from '../../App.styles';
import { Macrogame, Microgame, CurrentPage, Popup } from '../../types';
import { useData } from '../../hooks/useData';
import { PRODUCT_CATEGORIES, MACROGAME_LENGTH_OPTIONS, NUMBER_OF_GAMES_OPTIONS, NUMBER_OF_REWARDS_OPTIONS, YES_NO_ALL_OPTIONS, MUSIC_OPTIONS, UI_SKINS } from '../../constants';
import { PaginatedList } from '../ui/PaginatedList';
import { hasMacrogameIssues } from '../../utils/helpers';
import { FilterBar, FilterConfig } from '../ui/FilterBar';

interface MacrogamesManagerProps {
    handleDeployMacrogame: (macrogame: Macrogame) => Promise<void>;
    handleEditMacrogame: (macrogame: Macrogame) => void;
    setCurrentPage: React.Dispatch<React.SetStateAction<CurrentPage>>;
}

const StarIcon: React.FC<{ isFavorite: boolean }> = ({ isFavorite }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
         fill={isFavorite ? '#ffc107' : 'none'}
         stroke={isFavorite ? '#ffc107' : 'currentColor'}
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
         style={{ cursor: 'pointer', color: '#606770' }}>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>
);

export const MacrogamesManager: React.FC<MacrogamesManagerProps> = ({ handleDeployMacrogame, handleEditMacrogame, setCurrentPage }) => {
    const { macrogames, deleteMacrogame, duplicateMacrogame, toggleMacrogameFavorite, deleteMultipleMacrogames, allMicrogames, customMicrogames, allRewards } = useData();
    
    const [filters, setFilters] = useState({
        searchTerm: '', themeFilter: 'All', numGamesFilter: 'All', lengthFilter: 'All',
        hasConversionFilter: 'All', introScreenFilter: 'All', promoScreenFilter: 'All',
        customGameFilter: 'All', musicFilter: 'All'
    });

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleResetFilters = () => {
        setFilters({
            searchTerm: '', themeFilter: 'All', numGamesFilter: 'All', lengthFilter: 'All',
            numRewardsFilter: 'All', introScreenFilter: 'All', promoScreenFilter: 'All',
            customGameFilter: 'All', musicFilter: 'All'
        });
    };
    
    const handlePreview = (macrogameId: string) => {
        // We only pass the ID of the macrogame to the preview page.
        const previewConfig = { 
            macrogameId: macrogameId,
            skinId: 'barebones', // The preview will always use the simple barebones skin
            isPreviewMode: 'full_macrogame'
        };
        localStorage.setItem('macrogame_preview_data', JSON.stringify(previewConfig));
        window.open('/preview.html', '_blank');
    };

    const filteredGames = useMemo(() => {
        const calculateLength = (game: Macrogame): number => {
            let totalLength = 0;
            if (game.introScreen.enabled) totalLength += game.introScreen.duration * 1000;
            if (game.promoScreen?.enabled) totalLength += (game.promoScreen.duration || 0) * 1000;
            const flowLength = game.flow.reduce((sum, flowItem) => {
                const microgame = allMicrogames.find(mg => mg.id === flowItem.microgameId);
                return sum + (microgame?.length || 0) * 1000 + game.config.titleScreenDuration + game.config.controlsScreenDuration;
            }, 0);
            return (totalLength + flowLength) / 1000;
        };
        return macrogames
            .filter(game => game.name.toLowerCase().includes(filters.searchTerm.toLowerCase()))
            .filter(game => filters.themeFilter === 'All' || game.category === filters.themeFilter)
            .filter(game => {
                if (filters.numGamesFilter === 'All') return true;
                const count = game.flow.length;
                if (filters.numGamesFilter === '4+') return count >= 4;
                return count === parseInt(filters.numGamesFilter);
            })
            .filter(game => {
                if (filters.lengthFilter === 'All') return true;
                const length = calculateLength(game);
                if (filters.lengthFilter === 'Short (< 20s)') return length < 20;
                if (filters.lengthFilter === 'Medium (20s-30s)') return length >= 20 && length <= 30;
                if (filters.lengthFilter === 'Long (> 30s)') return length > 30;
                return true;
            })
            .filter(game => {
                if (filters.hasConversionFilter === 'All') return true;
                const hasConversion = !!game.conversionId;
                return filters.hasConversionFilter === 'Yes' ? hasConversion : !hasConversion;
            })
            .filter(game => {
                if (filters.introScreenFilter === 'All') return true;
                return filters.introScreenFilter === 'Yes' ? game.introScreen.enabled : !game.introScreen.enabled;
            })
            .filter(game => {
                if (filters.promoScreenFilter === 'All') return true;
                return filters.promoScreenFilter === 'Yes' ? game.promoScreen?.enabled : !game.promoScreen?.enabled;
            })
            .filter(game => {
                if (filters.customGameFilter === 'All') return true;
                const hasCustom = game.flow.some(f => f.variantId !== null);
                return filters.customGameFilter === 'Yes' ? hasCustom : !hasCustom;
            })
            .filter(game => {
                if (filters.musicFilter === 'All') return true;
                if (filters.musicFilter === 'None') return game.config.backgroundMusicUrl === null;
                return game.config.backgroundMusicUrl === MUSIC_OPTIONS[filters.musicFilter];
            });
    }, [macrogames, filters, allMicrogames, allRewards]);

    const favoriteGames = filteredGames.filter(g => g.isFavorite);

    const renderMacrogameItem = (game: Macrogame, isSelected: boolean, onToggleSelect: () => void) => {
        const hasAlert = hasMacrogameIssues(game, allMicrogames);
        return (
            <div key={game.id} style={{ ...styles.listItem, ...styles.listItemWithCheckbox }}>
                <input type="checkbox" checked={isSelected} onChange={onToggleSelect} />
                <div style={{flex: 1}}><strong>{game.name}</strong></div>
                <div style={styles.managerActions}>
                    {hasAlert && <span style={styles.warningTag}>Needs Attention</span>}
                    <span style={styles.tag}>#{game.category}</span>
                    <span>{game.flow?.length || 0} microgames</span>
                    <button onClick={() => handlePreview(game.id)} style={styles.previewButton}>Preview</button>
                    <button onClick={() => handleDeployMacrogame(game)} style={styles.publishButton} disabled={hasAlert} title={hasAlert ? "Cannot deploy: contains an archived microgame" : ""}>Deploy</button>
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

    const filterConfig: FilterConfig[] = [
        { type: 'select', label: 'Theme', options: ['All', ...Object.keys(PRODUCT_CATEGORIES)], stateKey: 'themeFilter' },
        { type: 'select', label: '# of Microgames', options: NUMBER_OF_GAMES_OPTIONS, stateKey: 'numGamesFilter' },
        { type: 'select', label: 'Length', options: MACROGAME_LENGTH_OPTIONS, stateKey: 'lengthFilter' },
        { type: 'select', label: 'Has Conversion', options: YES_NO_ALL_OPTIONS, stateKey: 'hasConversionFilter' },
        { type: 'select', label: 'Intro Screen', options: YES_NO_ALL_OPTIONS, stateKey: 'introScreenFilter' },
        { type: 'select', label: 'Promo Screen', options: YES_NO_ALL_OPTIONS, stateKey: 'promoScreenFilter' },
        { type: 'select', label: 'Custom Microgame', options: YES_NO_ALL_OPTIONS, stateKey: 'customGameFilter' },
        { type: 'select', label: 'Background Music', options: ['All', ...Object.keys(MUSIC_OPTIONS)], stateKey: 'musicFilter' },
    ];

    return (
        <div style={styles.creatorSection}>
            <div style={styles.managerHeader}>
                <h2 style={styles.h2}>Macrogames</h2>
                <button onClick={() => setCurrentPage({ page: 'creator' })} style={styles.saveButton}>Create New</button>
            </div>
            
            <div style={styles.filterContainer}>
                <div style={styles.configItem}>
                    <label>Search Macrogames</label>
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
        </div>
    );
};