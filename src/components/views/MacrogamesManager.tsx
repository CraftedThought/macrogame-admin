// src/components/views/MacrogamesManager.tsx

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { styles } from '../../App.styles';
import { Macrogame } from '../../types';
import { useData } from '../../hooks/useData';
import { PRODUCT_CATEGORIES, MACROGAME_LENGTH_OPTIONS, NUMBER_OF_GAMES_OPTIONS, YES_NO_ALL_OPTIONS, MACROGAME_MUSIC_LIBRARY, UI_SKINS } from '../../constants';
import { PaginatedList } from '../ui/PaginatedList';
import { hasMacrogameIssues } from '../../utils/helpers';
import { FilterBar, FilterConfig } from '../ui/FilterBar';
import { StarIcon } from '../ui/StarIcon';

interface MacrogamesManagerProps {
    handleDeployMacrogame: (macrogame: Macrogame) => Promise<void>;
    handleEditMacrogame: (macrogame: Macrogame) => void;
}

export const MacrogamesManager: React.FC<MacrogamesManagerProps> = ({ handleDeployMacrogame, handleEditMacrogame }) => {
    const navigate = useNavigate();
    const { macrogames, deleteMacrogame, duplicateMacrogame, toggleMacrogameFavorite, deleteMultipleMacrogames, allMicrogames, allConversionScreens, allConversionMethods } = useData();
    
    // ... (rest of the component state and logic is unchanged)
    const [filters, setFilters] = useState({
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
    };
    
    const handlePreview = (macrogameId: string) => {
        const previewConfig = { 
            macrogameId: macrogameId,
            skinId: 'barebones',
            isPreviewMode: 'full_macrogame'
        };
        localStorage.setItem('macrogame_preview_data', JSON.stringify(previewConfig));
        window.open('/preview.html', '_blank');
    };

    const filteredGames = useMemo(() => {
        // Helper function to calculate duration
        const calculateDuration = (game: Macrogame): number => {
            let totalLength = 0;
            if (game.introScreen.enabled) totalLength += game.introScreen.duration;
            if (game.promoScreen?.enabled) totalLength += (game.promoScreen.duration || 0);
            const flowLength = game.flow.reduce((sum, flowItem) => {
                const microgame = allMicrogames.find(mg => mg.id === flowItem.microgameId);
                return sum + (microgame?.length || 0) + (game.config.titleScreenDuration / 1000) + (game.config.controlsScreenDuration / 1000);
            }, 0);
            return totalLength + flowLength;
        };

        return macrogames
            .filter(game => game.name.toLowerCase().includes(filters.searchTerm.toLowerCase()))
            .filter(game => filters.categoryFilter === 'All' || game.category === filters.categoryFilter)
            .filter(game => {
                if (filters.categoryFilter === 'All' || filters.subcategoryFilter === 'All') return true;
                return game.subcategory === filters.subcategoryFilter;
            })
            .filter(game => {
                if (filters.durationFilter === 'All') return true;
                const duration = calculateDuration(game);
                if (filters.durationFilter === 'Short (< 20s)') return duration < 20;
                if (filters.durationFilter === 'Medium (20s-30s)') return duration >= 20 && duration <= 30;
                if (filters.durationFilter === 'Long (> 30s)') return duration > 30;
                return true;
            })
            // --- LOGIC FOR numGamesFilter RESTORED ---
            .filter(game => {
                if (filters.numGamesFilter === 'All') return true;
                const count = game.flow.length;
                if (filters.numGamesFilter === '4+') return count >= 4;
                return count === parseInt(filters.numGamesFilter);
            })
            .filter(game => {
                if (filters.conversionMethodFilter === 'All') return true;
                const hasConversion = !!game.conversionScreenId;
                if (filters.conversionMethodFilter === 'None') return !hasConversion;

                const screen = allConversionScreens.find(s => s.id === game.conversionScreenId);
                if (!screen) return false;

                const methodTypesInScreen = new Set(screen.methods.map(m => allConversionMethods.find(base => base.id === m.methodId)?.type));
                return methodTypesInScreen.has(filters.conversionMethodFilter);
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
                const selectedTrack = MACROGAME_MUSIC_LIBRARY.find(track => track.name === filters.musicFilter);
                return game.config.backgroundMusicUrl === (selectedTrack?.path || null);
            });
    }, [macrogames, filters, allMicrogames, allConversionScreens, allConversionMethods]);

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
                    <button onClick={() => handleDeployMacrogame(game)} style={styles.publishButton} disabled={hasAlert} title={hasAlert ? "Cannot deliver: contains an archived microgame" : ""}>Deliver</button>
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

    const filterConfig = useMemo(() => {
        const conversionMethodTypes = ['All', 'None', ...new Set(allConversionMethods.map(m => m.type))];

        const config: FilterConfig[] = [
            { type: 'select', label: 'Product Category', options: ['All', ...Object.keys(PRODUCT_CATEGORIES)], stateKey: 'categoryFilter' },
            // Subcategory will be inserted here if needed
            { type: 'select', label: 'Duration', options: MACROGAME_LENGTH_OPTIONS, stateKey: 'durationFilter' },
            { type: 'select', label: '# of Microgames', options: NUMBER_OF_GAMES_OPTIONS, stateKey: 'numGamesFilter' },
            { type: 'select', label: 'Conversion Method', options: conversionMethodTypes, stateKey: 'conversionMethodFilter' },
            { type: 'select', label: 'Intro Screen', options: YES_NO_ALL_OPTIONS, stateKey: 'introScreenFilter' },
            { type: 'select', label: 'Promo Screen', options: YES_NO_ALL_OPTIONS, stateKey: 'promoScreenFilter' },
            { type: 'select', label: 'Custom Microgame', options: YES_NO_ALL_OPTIONS, stateKey: 'customGameFilter' },
            { type: 'select', label: 'Background Music', options: ['All', ...MACROGAME_MUSIC_LIBRARY.map(track => track.name)], stateKey: 'musicFilter' },
        ];

        // If a specific product category is selected, add the subcategory filter right after it
        if (filters.categoryFilter !== 'All' && PRODUCT_CATEGORIES[filters.categoryFilter]) {
            config.splice(1, 0, {
                type: 'select',
                label: 'Subcategory',
                options: ['All', ...PRODUCT_CATEGORIES[filters.categoryFilter]],
                stateKey: 'subcategoryFilter'
            });
        }

        return config;
    }, [filters.categoryFilter, allConversionMethods]);
    
    return (
        <div style={styles.creatorSection}>
            <div style={styles.managerHeader}>
                <h2 style={styles.h2}>Macrogames</h2>
                <button onClick={() => navigate('/creator')} style={styles.saveButton}>Create New</button>
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