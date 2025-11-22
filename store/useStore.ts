/* src/store/useStore.ts */

import { create } from 'zustand';
import { Macrogame, Microgame, DeliveryContainer, ConversionMethod, CustomMicrogame, Campaign, ConversionScreen, EntityStatus } from '../types';

interface State {
    isDataLoading: boolean; // <-- 1. ADD THIS FLAG TO THE INTERFACE
    macrogames: (Macrogame & { status?: EntityStatus })[];
    deliveryContainers: (DeliveryContainer & { status?: EntityStatus })[];
    campaigns: Campaign[];
    allConversionMethods: ConversionMethod[];
    allConversionScreens: ConversionScreen[];
    allMicrogames: Microgame[];
    customMicrogames: CustomMicrogame[];
    setState: (newState: Partial<State>) => void;
}

const useStore = create<State>((set) => ({
    isDataLoading: true, // <-- 2. INITIALIZE THE FLAG TO 'true'
    macrogames: [],
    deliveryContainers: [],
    campaigns: [],
    allConversionMethods: [],
    allConversionScreens: [],
    allMicrogames: [],
    customMicrogames: [],
    setState: (newState) => set(newState),
}));

export { useStore };