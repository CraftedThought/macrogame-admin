// src/components/views/MicrogamesPage.tsx

import React, { useState, useMemo } from 'react';
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

interface MicrogamesPageProps {
    onCustomize: (data: { baseGame: Microgame, variant?: CustomMicrogame }) => void;
}

const GroupedCustomGames: React.FC<{
    groupName: string;
    variants: CustomMicrogame[];
    onEdit: (variant: CustomMicrogame) => void;
    onPreview: (variant: CustomMicrogame) => void;
    onDelete: (variantId: string) => void;
}> = ({ groupName, variants, onEdit, onPreview, onDelete }) => {
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

export const MicrogamesPage: React.FC<MicrogamesPageProps> = ({ onCustomize }) => {
    const { allMicrogames, customMicrogames, toggleMicrogameFavorite, deleteCustomMicrogame } = useData();
    const [expandedCard, setExpandedCard] = useState<string | null>(null);
    const [filters, setFilters] = useState({
        searchTerm: '',
        goalFilter: 'All',
        tempoFilter: 'All',
        lengthFilter: 'All',
        experienceFilter: 'All', // <-- NEW STATE
        typeFilter: 'All'        // <-- NEW STATE
    });

    const handleFilterChange = (key: string, value: string) => {
        // If experience is changed, reset the type filter
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

    const filteredGames = useMemo(() => {
        return allMicrogames
            .filter(game => game.isActive !== false)
            .filter(game => game.name.toLowerCase().includes(filters.searchTerm.toLowerCase()))
            .filter(game => filters.goalFilter === 'All' || game.compatibleConversionGoals.includes(filters.goalFilter))
            .filter(game => filters.tempoFilter === 'All' || game.tempo === filters.tempoFilter)
            .filter(game => filters.lengthFilter === 'All' || LENGTH_DEFINITIONS[filters.lengthFilter](game.length))
            // <-- NEW FILTER LOGIC
            .filter(game => filters.experienceFilter === 'All' || game.gameplayExperience === filters.experienceFilter)
            .filter(game => {
                if (filters.experienceFilter !== 'Generalized' || filters.typeFilter === 'All') return true;
                const type = filters.typeFilter === 'Chance-Based' ? 'chance' : 'skill';
                return game.mechanicType === type;
            });
            // <-- END NEW LOGIC
    }, [allMicrogames, filters]);
    
    const favoriteGames = filteredGames.filter(game => game.isFavorite);

    const { validGroups, orphanedVariants } = useMemo(() => {
        const result = customMicrogames.reduce((acc, variant) => {
            const baseGame = allMicrogames.find(g => g.id === variant.baseMicrogameId);
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

    const handleEditCustom = (variant: CustomMicrogame) => {
        const baseGame = allMicrogames.find(g => g.id === variant.baseMicrogameId);
        if (baseGame) {
            onCustomize({ baseGame, variant });
        } else {
            notifications.error('Could not find the base microgame for this variant.');
        }
    };
    
    // Create the grouped options for the Conversion Goal filter
    const goalOptions = [
        { value: 'All', label: 'All' },
        ...Object.entries(CONVERSION_GOALS).map(([groupLabel, options]) => ({
            group: groupLabel,
            options: options.map(opt => ({ value: opt, label: opt }))
        }))
    ];

    const renderCustomGroup = (group: { baseName: string, variants: CustomMicrogame[], id: string }, isSelected: boolean, onToggleSelect: () => void) => (
        <li key={group.id} style={{ ...styles.rewardListItem, ...styles.listItemWithCheckbox, paddingLeft: 0, paddingRight: 0 }}>
            <input type="checkbox" checked={isSelected} onChange={onToggleSelect} style={{marginLeft: '1rem'}} />
            <div style={{flex: 1}}>
                <GroupedCustomGames groupName={group.baseName} variants={group.variants} onEdit={handleEditCustom} onPreview={handlePreviewVariant} onDelete={deleteCustomMicrogame} />
            </div>
        </li>
    );

    const filterConfig: FilterConfig[] = [
        { type: 'select', label: 'Conversion Goal', options: goalOptions, stateKey: 'goalFilter' },
        { type: 'select', label: 'Gameplay Experience', options: ['All', 'Generalized', 'Rehearsal'], stateKey: 'experienceFilter' },
    ];

    // Conditionally add the Type filter
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
            
            <div style={{...styles.filterContainer, marginBottom: '1rem'}}>
                <div style={styles.configItem}>
                    <label>Search Microgames</label>
                    <input
                        type="text"
                        placeholder="Search by name..."
                        value={filters.searchTerm}
                        onChange={e => handleFilterChange('searchTerm', e.target.value)}
                        style={styles.input}
                    />
                </div>
            </div>

            <FilterBar filters={filterConfig} filterValues={filters} onFilterChange={handleFilterChange} onResetFilters={handleResetFilters} />
            
            {favoriteGames.length > 0 && (
                <>
                    <h3 style={styles.h3}>Favorite Microgames</h3>
                    <div style={styles.cardContainer}>
                        {favoriteGames.map(game => (
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
                    filteredGames.map(game => (
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
                    items={validGroups.map(g => ({...g, id: g.baseName}))}
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
                        {orphanedVariants.map(variant => (
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
        </div>
    );
};