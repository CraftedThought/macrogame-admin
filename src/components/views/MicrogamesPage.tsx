// src/components/views/MicrogamesPage.tsx

import React, { useState, useMemo } from 'react';
import { styles } from '../../App.styles';
import { Microgame, CustomMicrogame, Popup } from '../../types';
import { useData } from '../../context/DataContext';
import { MicrogameCard } from '../ui/MicrogameCard';
import { TEMPO_OPTIONS, LENGTH_OPTIONS, LENGTH_DEFINITIONS, UI_SKINS } from '../../constants';
import { WIZARD_CONVERSION_GOALS, WIZARD_CUSTOMER_TYPES, recommendationData } from '../../wizards/recommendationLogic';
import { PaginatedList } from '../ui/PaginatedList';
import { FilterBar, FilterConfig } from '../ui/FilterBar';

interface MicrogamesPageProps {
    onCustomize: (data: { baseGame: Microgame, variant?: CustomMicrogame }) => void;
}

const GroupedCustomGames: React.FC<{
    groupName: string;
    variants: CustomMicrogame[];
    onEdit: (variant: CustomMicrogame) => void;
    onDelete: (variantId: string) => void;
}> = ({ groupName, variants, onEdit, onDelete }) => {
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
        searchTerm: '', goalFilter: 'All', customerTypeFilter: 'All', tempoFilter: 'All', lengthFilter: 'All'
    });

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleResetFilters = () => {
        setFilters({ searchTerm: '', goalFilter: 'All', customerTypeFilter: 'All', tempoFilter: 'All', lengthFilter: 'All' });
    };

    const handlePreview = (game: Microgame) => {
        const barebonesSkin = UI_SKINS.find(s => s.id === 'barebones');
        if (!barebonesSkin) {
            alert("Preview skin not found.");
            return;
        }
        const previewMacrogame: Omit<Macrogame, 'id' | 'type' | 'createdAt'> & { flow: any[] } = {
            name: `${game.name} - Preview`,
            category: '',
            config: {
                titleScreenDuration: 1500,
                controlsScreenDuration: 2500,
                backgroundMusicUrl: null
            },
            introScreen: { enabled: false, text: '', duration: 0, clickToContinue: false },
            promoScreen: { enabled: false, text: '', duration: 0, clickToContinue: false },
            flow: [{ ...game, customSkinData: {} }],
            rewards: [],
        };
        const previewPopup: Partial<Popup> = { name: "Microgame Preview" };
        const previewConfig = { popup: previewPopup, macrogame: previewMacrogame, rewards: [], skin: barebonesSkin, isPreviewMode: 'single_game' };
        localStorage.setItem('macrogame_preview_data', JSON.stringify(previewConfig));
        window.open('/preview.html', '_blank');
    };

    const filteredGames = useMemo(() => {
        return allMicrogames
            .filter(game => game.isActive !== false)
            .filter(game => game.name.toLowerCase().includes(filters.searchTerm.toLowerCase()))
            .filter(game => {
                if (filters.goalFilter === 'All') return true;
                const gameRecData = recommendationData.find(rec => rec.id === game.id);
                return gameRecData?.compatibleGoals.includes(filters.goalFilter as any);
            })
            .filter(game => {
                if (filters.customerTypeFilter === 'All') return true;
                const gameRecData = recommendationData.find(rec => rec.id === game.id);
                return gameRecData?.compatibleCustomerTypes.includes(filters.customerTypeFilter as any);
            })
            .filter(game => filters.tempoFilter === 'All' || game.tempo === filters.tempoFilter)
            .filter(game => filters.lengthFilter === 'All' || LENGTH_DEFINITIONS[filters.lengthFilter](game.length));
    }, [allMicrogames, filters]);
    
    const favoriteGames = filteredGames.filter(game => game.isFavorite);

    const groupedCustomMicrogames = useMemo(() => {
        return Object.values(customMicrogames.reduce((acc, variant) => {
            const baseId = variant.baseMicrogameId;
            if (!acc[baseId]) {
                acc[baseId] = { baseName: variant.baseMicrogameName, variants: [] };
            }
            acc[baseId].variants.push(variant);
            return acc;
        }, {} as { [key: string]: { baseName: string, variants: CustomMicrogame[] } }));
    }, [customMicrogames]);

    const handleEditCustom = (variant: CustomMicrogame) => {
        const baseGame = allMicrogames.find(g => g.id === variant.baseMicrogameId);
        if (baseGame) {
            onCustomize({ baseGame, variant });
        } else {
            alert('Could not find the base microgame for this variant.');
        }
    };
    
    const renderCustomGroup = (group: { baseName: string, variants: CustomMicrogame[], id: string }, isSelected: boolean, onToggleSelect: () => void) => (
        <li key={group.id} style={{ ...styles.rewardListItem, ...styles.listItemWithCheckbox, paddingLeft: 0, paddingRight: 0 }}>
            <input type="checkbox" checked={isSelected} onChange={onToggleSelect} style={{marginLeft: '1rem'}} />
            <div style={{flex: 1}}>
                <GroupedCustomGames groupName={group.baseName} variants={group.variants} onEdit={handleEditCustom} onDelete={deleteCustomMicrogame} />
            </div>
        </li>
    );

    const filterConfig: FilterConfig[] = [
        { type: 'select', label: 'Conversion Goal', options: WIZARD_CONVERSION_GOALS as any, stateKey: 'goalFilter' },
        { type: 'select', label: 'Customer Type', options: WIZARD_CUSTOMER_TYPES as any, stateKey: 'customerTypeFilter' },
        { type: 'select', label: 'Tempo', options: TEMPO_OPTIONS, stateKey: 'tempoFilter' },
        { type: 'select', label: 'Length', options: LENGTH_OPTIONS, stateKey: 'lengthFilter' },
    ];

    return (
        <div style={styles.creatorSection}>
            <div style={styles.managerHeader}><h2 style={styles.h2}>Microgame Library</h2></div>
            
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
            {customMicrogames.length > 0 ? (
                <PaginatedList
                    items={groupedCustomMicrogames.map(g => ({...g, id: g.baseName}))}
                    renderItem={renderCustomGroup}
                    itemsPerPage={5}
                    listContainerStyle={styles.managerList}
                />
            ) : <p>You haven't created any custom microgames yet.</p>}
        </div>
    );
};