// src/components/ui/FilterBar.tsx

import React, { useState, useRef, useEffect } from 'react';
import { styles } from '../../App.styles';

// Define the shape for different filter types
type SelectFilter = {
    type: 'select';
    stateKey: string;
    label: string;
    options: string[];
};

type MultiSelectFilter = {
    type: 'multiselect';
    stateKey: string;
    label: string;
    options: { value: string; label: string }[];
};

export type FilterConfig = SelectFilter | MultiSelectFilter;

interface FilterBarProps {
    filters: FilterConfig[];
    filterValues: { [key: string]: string | string[] };
    onFilterChange: (key: string, value: string | string[]) => void;
    onResetFilters: () => void;
}

const MultiSelectDropdown: React.FC<{ filter: MultiSelectFilter, value: string[], onChange: (value: string[]) => void }> = ({ filter, value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleSelect = (optionValue: string) => {
        const newValue = value.includes(optionValue)
            ? value.filter(v => v !== optionValue)
            : [...value, optionValue];
        onChange(newValue);
    };

    const buttonText = value.length > 0 ? `${filter.label} (${value.length} selected)` : filter.label;

    return (
        <div ref={wrapperRef} style={{ position: 'relative', flex: 1 }}>
            <button type="button" onClick={() => setIsOpen(!isOpen)} style={{ ...styles.input, textAlign: 'left', width: '100%' }}>
                {buttonText}
            </button>
            {isOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '6px', zIndex: 10, maxHeight: '200px', overflowY: 'auto' }}>
                    {filter.options.map(option => (
                        <div key={option.value} style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center' }}>
                            <input
                                type="checkbox"
                                id={`${filter.stateKey}-${option.value}`}
                                checked={value.includes(option.value)}
                                onChange={() => handleSelect(option.value)}
                                style={{ marginRight: '0.75rem' }}
                            />
                            <label htmlFor={`${filter.stateKey}-${option.value}`} style={{ flex: 1 }}>{option.label}</label>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


export const FilterBar: React.FC<FilterBarProps> = ({ filters, filterValues, onFilterChange, onResetFilters }) => {
    return (
        <div style={styles.filterBarContainer}>
            {filters.map(filter => (
                <div key={filter.stateKey} style={styles.filterItem}>
                    <label style={styles.filterLabel}>{filter.label}</label>
                    {filter.type === 'select' ? (
                        <select
                            value={filterValues[filter.stateKey] as string || 'All'}
                            onChange={e => onFilterChange(filter.stateKey, e.target.value)}
                            style={styles.input}
                        >
                            {filter.options?.map(option => <option key={option} value={option}>{option}</option>)}
                        </select>
                    ) : (
                         <MultiSelectDropdown
                            filter={filter}
                            value={filterValues[filter.stateKey] as string[] || []}
                            onChange={(value) => onFilterChange(filter.stateKey, value)}
                        />
                    )}
                </div>
            ))}
            <button onClick={onResetFilters} style={{...styles.resetButton, alignSelf: 'flex-end', marginBottom: '0.2rem' }}>
                Reset Filters
            </button>
        </div>
    );
};