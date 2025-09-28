// src/hooks/useData.ts

import { useContext } from 'react';
import { DataContext, DataContextType } from '../context/DataContext';

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};