// src/components/views/DeliveryMethodManagerTab.tsx

import React, { useState, useMemo } from 'react';
import { styles } from '../../App.styles';
import { Popup } from '../../types';
import { PaginatedList } from '../ui/PaginatedList';
import { FilterBar, FilterConfig } from '../ui/FilterBar';

interface DeliveryMethodManagerTabProps {
    items: Popup[];
    filterConfig: FilterConfig[];
    renderItem: (item: Popup, isSelected: boolean, onToggleSelect: () => void) => React.ReactNode;
    onDeleteMultiple: (ids: string[]) => void;
    itemTypeName: string;
    favoriteItemTypeName?: string;
}

export const DeliveryMethodManagerTab: React.FC<DeliveryMethodManagerTabProps> = ({ items, filterConfig, renderItem, onDeleteMultiple, itemTypeName, favoriteItemTypeName }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterValues, setFilterValues] = useState<{ [key: string]: string | string[] }>({});

    const handleFilterChange = (key: string, value: string | string[]) => {
        setFilterValues(prev => ({ ...prev, [key]: value }));
    };

    const handleResetFilters = () => {
        setFilterValues({});
        setSearchTerm('');
    };

    const filteredItems = useMemo(() => {
        return items.filter(item => {
            if (!item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
                return false;
            }

            // --- APPLY DYNAMIC FILTERS ---
            for (const key in filterValues) {
                const filterValue = filterValues[key];
                if (!filterValue || filterValue === 'All' || (Array.isArray(filterValue) && filterValue.length === 0)) {
                    continue; // Skip this filter if it's not set
                }

                // Simple key-value mapping for now. Can be expanded.
                // Example: if key is 'skinFilter', check item.skinId
                if (key === 'macrogameFilter' && item.macrogameName !== filterValue) return false;
                if (key === 'skinFilter' && item.skinId !== filterValue) return false;
                if (key === 'campaignFilter') {
                    const hasCampaign = !!item.campaignId;
                    if (filterValue === 'Yes' && !hasCampaign) return false;
                    if (filterValue === 'No' && hasCampaign) return false;
                }
            }

            return true;
        });
    }, [items, searchTerm, filterValues]);

    const favoriteItems = useMemo(() => {
        return filteredItems.filter(item => item.isFavorite);
    }, [filteredItems]);

    return (
        <div>
            <div style={styles.filterContainer}>
                <div style={styles.configItem}>
                    <label>Search {itemTypeName}</label>
                    <input
                        type="text"
                        placeholder={`Search by name...`}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={styles.input}
                    />
                </div>
                {/* Render the FilterBar if a configuration is provided */}
                {filterConfig.length > 0 && (
                     <FilterBar 
                        filters={filterConfig} 
                        filterValues={filterValues} 
                        onFilterChange={handleFilterChange} 
                        onResetFilters={handleResetFilters} 
                    />
                )}
            </div>

            {favoriteItems.length > 0 && (
                <>
                    <h3 style={styles.h3}>{favoriteItemTypeName || `Favorite ${itemTypeName}`}</h3>
                    <PaginatedList items={favoriteItems} renderItem={renderItem} /* ...props */ />
                </>
            )}

            <h3 style={styles.h3}>All {itemTypeName}</h3>
            {items.length > 0 ? (
                <PaginatedList
                    items={filteredItems}
                    renderItem={renderItem}
                    bulkActions={[{ label: 'Delete Selected', onAction: (selectedItems) => onDeleteMultiple(selectedItems.map(item => item.id)) }]}
                    listContainerComponent="ul"
                    listContainerStyle={styles.rewardsListFull}
                />
            ) : <p>No {itemTypeName.toLowerCase()} in this category.</p>}
        </div>
    );
};