// src/components/ui/FilterBar.tsx

import React from 'react';
import { styles } from '../../App.styles';

// Define the shape of a filter configuration object
export type FilterConfig = {
    type: 'select';
    stateKey: string;
    label: string;
    options?: string[];
};

interface FilterBarProps {
    filters: FilterConfig[];
    filterValues: { [key: string]: string };
    onFilterChange: (key: string, value: string) => void;
    onResetFilters: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ filters, filterValues, onFilterChange, onResetFilters }) => {
    return (
        <div style={styles.filterBarContainer}>
            {filters.map(filter => (
                <div key={filter.stateKey} style={styles.filterItem}>
                    <label style={styles.filterLabel}>{filter.label}</label>
                    <select
                        value={filterValues[filter.stateKey] || 'All'}
                        onChange={e => onFilterChange(filter.stateKey, e.target.value)}
                        style={styles.input}
                    >
                        {filter.options?.map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                </div>
            ))}
            <button onClick={onResetFilters} style={{...styles.resetButton, alignSelf: 'flex-end', marginBottom: '0.2rem' }}>
                Reset Filters
            </button>
        </div>
    );
};