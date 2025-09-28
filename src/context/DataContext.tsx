// src/context/DataContext.tsx

import { createContext, useState, useEffect, ReactNode } from 'react';
import { db, storage } from '../firebase/config';
import {
    collection, addDoc, onSnapshot, query, doc, updateDoc,
    deleteDoc, DocumentData, setDoc, writeBatch, getDocs, where
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { Macrogame, Microgame, Popup, ConversionMethod, CustomMicrogame, Campaign, ConversionScreen } from '../types';
import { seedMicrogames } from '../scripts/seedDatabase';

// Helper function to generate a unique name for duplicated items
const generateUniqueName = (name: string, existingNames: Set<string>): string => {
    const baseName = `Copy of ${name}`;
    if (!existingNames.has(baseName)) {
        return baseName;
    }
    let counter = 2;
    while (existingNames.has(`${baseName} (${counter})`)) {
        counter++;
    }
    return `${baseName} (${counter})`;
};

export interface DataContextType {
    macrogames: Macrogame[];
    popups: Popup[];
    campaigns: Campaign[];
    allConversionMethods: ConversionMethod[];
    allConversionScreens: ConversionScreen[];
    allMicrogames: Microgame[];
    customMicrogames: CustomMicrogame[];
    // Campaign Functions
    createCampaign: (newCampaign: Omit<Campaign, 'id'>) => Promise<void>;
    updateCampaign: (campaignId: string, dataToUpdate: Partial<Campaign>) => Promise<void>;
    updateCampaignStatus: (campaignId: string, status: Campaign['status']) => Promise<void>;
    deleteCampaign: (campaignId: string) => Promise<void>;
    duplicateCampaign: (campaignToDuplicate: Campaign) => Promise<void>;
    // Macrogame Functions
    createMacrogame: (newMacrogame: Omit<Macrogame, 'id' | 'type'> & { id: string | null }) => Promise<void>;
    updateMacrogame: (updatedMacrogame: Omit<Macrogame, 'id' | 'type'> & { id: string | null }) => Promise<void>;
    deleteMacrogame: (id: string) => Promise<void>;
    deleteMultipleMacrogames: (ids: string[]) => Promise<void>;
    duplicateMacrogame: (gameToDuplicate: Macrogame) => Promise<void>;
    toggleMacrogameFavorite: (macrogameId: string, isFavorite: boolean) => Promise<void>;
    // Popup Functions
    createPopup: (newPopup: Omit<Popup, 'id'>) => Promise<void>;
    deletePopup: (id: string) => Promise<void>;
    deleteMultiplePopups: (ids: string[]) => Promise<void>;
    updatePopup: (popupId: string, dataToUpdate: Partial<Popup>) => Promise<void>;
    duplicatePopup: (popupToDuplicate: Popup) => Promise<void>;
    togglePopupFavorite: (popupId: string, isFavorite: boolean) => Promise<void>;
    // Microgame Functions
    saveCustomMicrogame: (baseGame: Microgame, variantName: string, skinFiles: { [key: string]: File }, existingVariant?: CustomMicrogame) => Promise<void>;
    toggleMicrogameFavorite: (gameId: string, isFavorite: boolean) => Promise<void>;
    deleteCustomMicrogame: (variantId: string) => Promise<void>;
    // Conversion Method Functions
    createConversionMethod: (newMethod: Omit<ConversionMethod, 'id'>) => Promise<void>;
    updateConversionMethod: (methodId: string, updatedMethod: Partial<Omit<ConversionMethod, 'id'>>) => Promise<void>;
    deleteConversionMethod: (methodId: string) => Promise<void>;
    deleteMultipleConversionMethods: (ids: string[]) => Promise<void>;
    duplicateConversionMethod: (methodToDuplicate: ConversionMethod) => Promise<void>;
    // Conversion Screen Functions
    createConversionScreen: (newScreen: Omit<ConversionScreen, 'id'>) => Promise<void>;
    updateConversionScreen: (screenId: string, updatedScreen: Partial<Omit<ConversionScreen, 'id'>>) => Promise<void>;
    deleteConversionScreen: (screenId: string) => Promise<void>;
    duplicateConversionScreen: (screenToDuplicate: ConversionScreen) => Promise<void>;
}

export const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [macrogames, setMacrogames] = useState<Macrogame[]>([]);
    const [popups, setPopups] = useState<Popup[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [allConversionMethods, setAllConversionMethods] = useState<ConversionMethod[]>([]);
    const [allConversionScreens, setAllConversionScreens] = useState<ConversionScreen[]>([]);
    const [allMicrogames, setAllMicrogames] = useState<Microgame[]>([]);
    const [customMicrogames, setCustomMicrogames] = useState<CustomMicrogame[]>([]);

    useEffect(() => {
        (window as any).seedMicrogames = seedMicrogames;

        const unsubMacrogames = onSnapshot(query(collection(db, 'macrogames')), snap => setMacrogames(snap.docs.map(doc => ({ ...doc.data() as Omit<Macrogame, 'id'>, id: doc.id }))));
        const unsubPopups = onSnapshot(query(collection(db, 'popups')), snap => setPopups(snap.docs.map(doc => ({ ...doc.data() as Omit<Popup, 'id'>, id: doc.id }))));
        const unsubCampaigns = onSnapshot(query(collection(db, 'campaigns')), snap => setCampaigns(snap.docs.map(doc => ({ ...doc.data() as Omit<Campaign, 'id'>, id: doc.id }))));
        const unsubConversionMethods = onSnapshot(query(collection(db, 'conversionMethods')), snap => setAllConversionMethods(snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as ConversionMethod))));
        const unsubConversionScreens = onSnapshot(query(collection(db, 'conversionScreens')), snap => setAllConversionScreens(snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as ConversionScreen))));
        const unsubMicrogames = onSnapshot(query(collection(db, 'microgames')), snap => setAllMicrogames(snap.docs.map(doc => ({ ...doc.data() as Microgame, id: doc.id }))));
        const unsubCustomMicrogames = onSnapshot(query(collection(db, 'customMicrogames')), snap => { setCustomMicrogames(snap.docs.map(doc => ({ ...doc.data() as Omit<CustomMicrogame, 'id'>, id: doc.id }))); });
        
        return () => {
            unsubMacrogames();
            unsubPopups();
            unsubCampaigns();
            unsubConversionMethods();
            unsubConversionScreens();
            unsubMicrogames();
            unsubCustomMicrogames();
        };
    }, []);
    
    // --- Campaign Functions ---
    const createCampaign = async (newCampaign: Omit<Campaign, 'id'>) => {
        const docRef = await addDoc(collection(db, 'campaigns'), newCampaign);
        const campaignId = docRef.id;
        const batch = writeBatch(db);
        newCampaign.displayRules.forEach(rule => {
            rule.popups.forEach(p => {
                const popupRef = doc(db, 'popups', p.popupId);
                batch.update(popupRef, { campaignId: campaignId });
            });
        });
        await batch.commit();
    };
    const updateCampaign = async (campaignId: string, dataToUpdate: Partial<Campaign>) => {
        const campaignRef = doc(db, 'campaigns', campaignId);
        const oldPopupsQuery = query(collection(db, 'popups'), where('campaignId', '==', campaignId));
        const oldPopupsSnap = await getDocs(oldPopupsQuery);
        const newPopupIds = new Set(dataToUpdate.displayRules?.flatMap(rule => rule.popups.map(p => p.popupId)) || []);
        const batch = writeBatch(db);
        oldPopupsSnap.forEach(popupDoc => {
            if (!newPopupIds.has(popupDoc.id)) {
                batch.update(popupDoc.ref, { campaignId: null });
            }
        });
        newPopupIds.forEach(popupId => {
            const popupRef = doc(db, 'popups', popupId);
            batch.update(popupRef, { campaignId: campaignId });
        });
        batch.update(campaignRef, dataToUpdate);
        await batch.commit();
    };
    const updateCampaignStatus = async (campaignId: string, status: Campaign['status']) => {
        await updateDoc(doc(db, 'campaigns', campaignId), { status });
    };
    const deleteCampaign = async (campaignId: string) => {
        if (window.confirm("Are you sure? This will not delete the popups inside, but they will become unassigned.")) {
            const batch = writeBatch(db);
            const popupsQuery = await getDocs(query(collection(db, 'popups'), where('campaignId', '==', campaignId)));
            popupsQuery.forEach(popupDoc => {
                batch.update(popupDoc.ref, { campaignId: null });
            });
            await batch.commit();
            await deleteDoc(doc(db, 'campaigns', campaignId));
        }
    };
    const duplicateCampaign = async (campaignToDuplicate: Campaign) => {
        const { id, name, ...rest } = campaignToDuplicate;
        const existingNames = new Set(campaigns.map(c => c.name));
        const newName = generateUniqueName(name, existingNames);
        const newData = { ...rest, name: newName, createdAt: new Date().toISOString(), status: 'Draft' as const };
        await addDoc(collection(db, 'campaigns'), newData);
    };

    // --- Macrogame Functions ---
    const createMacrogame = async (newMacrogame: Omit<Macrogame, 'id' | 'type'> & { id: string | null }) => {
        const { id, ...gameData } = newMacrogame;
        await addDoc(collection(db, "macrogames"), gameData);
    };
    const updateMacrogame = async (updatedMacrogame: Omit<Macrogame, 'id' | 'type'> & { id: string | null }) => {
        if (!updatedMacrogame.id) return;

        // --- OPTIMISTIC UPDATE ---
        // Immediately update our local state with the new data.
        setMacrogames(prevMacrogames =>
            prevMacrogames.map(game =>
                game.id === updatedMacrogame.id ? { ...game, ...updatedMacrogame } : game
            )
        );

        // Then, send the update to Firestore to persist the change.
        const { id, ...gameData } = updatedMacrogame;
        await updateDoc(doc(db, "macrogames", id), gameData as DocumentData);
    };
    const deleteMacrogame = async (id: string) => {
        if (window.confirm("Are you sure? This will also unlink this macrogame from any popups using it.")) {
            const batch = writeBatch(db);
            const popupsQuery = await getDocs(query(collection(db, 'popups'), where('macrogameId', '==', id)));
            popupsQuery.forEach(popupDoc => {
                const popupRef = doc(db, 'popups', popupDoc.id);
                batch.update(popupRef, { macrogameId: '', macrogameName: '', status: 'Draft' });
            });
            await batch.commit();
            await deleteDoc(doc(db, "macrogames", id));
        }
    };
    const deleteMultipleMacrogames = async (ids: string[]) => {
        if (window.confirm(`Are you sure you want to delete ${ids.length} macrogames? This cannot be undone.`)) {
            const batch = writeBatch(db);
            ids.forEach(id => batch.delete(doc(db, 'macrogames', id)));
            await batch.commit();
        }
    };
    const duplicateMacrogame = async (gameToDuplicate: Macrogame) => {
        const { id, name, ...restOfGame } = gameToDuplicate;
        const existingNames = new Set(macrogames.map(m => m.name));
        const newName = generateUniqueName(name, existingNames);
        const newGameData = { ...restOfGame, name: newName, createdAt: new Date().toISOString() };
        await addDoc(collection(db, 'macrogames'), newGameData);
    };
    const toggleMacrogameFavorite = async (macrogameId: string, isFavorite: boolean) => {
        await updateDoc(doc(db, 'macrogames', macrogameId), { isFavorite });
    };

    // --- Popup Functions ---
    const createPopup = async (newPopup: Omit<Popup, 'id'>) => {
        const docRef = await addDoc(collection(db, 'popups'), newPopup);
        // Optimistic Update
        const finalNewPopup = { ...newPopup, id: docRef.id } as Popup;
        setPopups(prevPopups => [...prevPopups, finalNewPopup]);
    };
    const deletePopup = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this popup?")) {
            await deleteDoc(doc(db, "popups", id));
        }
    };
    const deleteMultiplePopups = async (ids: string[]) => {
        if (window.confirm(`Are you sure you want to delete ${ids.length} popups? This cannot be undone.`)) {
            const batch = writeBatch(db);
            ids.forEach(id => batch.delete(doc(db, 'popups', id)));
            await batch.commit();
        }
    };
    const updatePopup = async (popupId: string, dataToUpdate: Partial<Popup>) => {
        // Optimistic Update
        setPopups(prevPopups =>
            prevPopups.map(p =>
                p.id === popupId ? { ...p, ...dataToUpdate } : p
            )
        );
        // Persist to Firestore
        await updateDoc(doc(db, "popups", popupId), dataToUpdate);
    };
    const duplicatePopup = async (popupToDuplicate: Popup) => {
        const { id, name, ...restOfPopup } = popupToDuplicate;
        const existingNames = new Set(popups.map(p => p.name));
        const newName = generateUniqueName(name, existingNames);
        const newPopupData = { ...restOfPopup, name: newName, createdAt: new Date().toISOString(), views: 0, engagements: 0, status: 'Draft' as const };
        await addDoc(collection(db, 'popups'), newPopupData);
    };
    const togglePopupFavorite = async (popupId: string, isFavorite: boolean) => {
        await updateDoc(doc(db, 'popups', popupId), { isFavorite });
    };

    // --- Microgame Functions ---
    const toggleMicrogameFavorite = async (gameId: string, isFavorite: boolean) => {
        await updateDoc(doc(db, 'microgames', gameId), { isFavorite });
    };
    const saveCustomMicrogame = async (baseGame: Microgame, variantName: string, skinFiles: { [key: string]: File }, existingVariant?: CustomMicrogame) => {
        const variantId = existingVariant ? existingVariant.id : doc(collection(db, 'customMicrogames')).id;
        const skinData: { [key: string]: { url: string; fileName: string } } = existingVariant ? { ...existingVariant.skinData } : {};
        for (const key in skinFiles) {
            const file = skinFiles[key];
            if (file) {
                const storageRef = ref(storage, `microgame-skins/${variantId}/${file.name}`);
                await uploadBytes(storageRef, file);
                const downloadURL = await getDownloadURL(storageRef);
                skinData[key] = { url: downloadURL, fileName: file.name };
            }
        }
        const variantData: Omit<CustomMicrogame, 'id'> = {
            name: variantName,
            baseMicrogameId: baseGame.id,
            baseMicrogameName: baseGame.name,
            createdAt: existingVariant ? existingVariant.createdAt : new Date().toISOString(),
            skinData,
        };
        await setDoc(doc(db, 'customMicrogames', variantId), variantData);
        alert(`Custom microgame variant ${existingVariant ? 'updated' : 'saved'} successfully!`);
    };
    const deleteCustomMicrogame = async (variantId: string) => {
        if (window.confirm("Are you sure? This variant will be removed from all macrogames using it.")) {
            const batch = writeBatch(db);
            const macrogamesQuery = await getDocs(collection(db, 'macrogames'));
            macrogamesQuery.forEach(gameDoc => {
                const macrogame = gameDoc.data() as Macrogame;
                const newFlow = macrogame.flow.map(flowItem => {
                    if (flowItem.variantId === variantId) {
                        return { ...flowItem, variantId: null };
                    }
                    return flowItem;
                });
                if (JSON.stringify(newFlow) !== JSON.stringify(macrogame.flow)) {
                    batch.update(doc(db, 'macrogames', gameDoc.id), { flow: newFlow });
                }
            });
            await batch.commit();
            await deleteDoc(doc(db, 'customMicrogames', variantId));
            const storageFolderRef = ref(storage, `microgame-skins/${variantId}`);
            const files = await listAll(storageFolderRef);
            await Promise.all(files.items.map(fileRef => deleteObject(fileRef)));
        }
    };

    // --- Conversion Method Functions ---
    const createConversionMethod = async (newMethod: Omit<ConversionMethod, 'id'>) => {
        await addDoc(collection(db, 'conversionMethods'), newMethod);
    };
    const updateConversionMethod = async (methodId: string, updatedMethod: Partial<Omit<ConversionMethod, 'id'>>) => {
        await updateDoc(doc(db, 'conversionMethods', methodId), updatedMethod);
    };
    const deleteConversionMethod = async (methodId: string) => {
        if (window.confirm("Are you sure? This method will be removed from all conversion screens that use it.")) {
            const batch = writeBatch(db);
            const screensQuery = await getDocs(query(collection(db, 'conversionScreens')));
            screensQuery.forEach(screenDoc => {
                const screen = screenDoc.data() as ConversionScreen;
                if (screen.methodIds.includes(methodId)) {
                    const newMethodIds = screen.methodIds.filter(id => id !== methodId);
                    batch.update(screenDoc.ref, { methodIds: newMethodIds });
                }
            });
            await batch.commit();
            await deleteDoc(doc(db, 'conversionMethods', methodId));
        }
    };
    const deleteMultipleConversionMethods = async (ids: string[]) => {
        if (window.confirm(`Are you sure you want to delete ${ids.length} methods? This cannot be undone.`)) {
            const batch = writeBatch(db);
            ids.forEach(id => batch.delete(doc(db, 'conversionMethods', id)));
            await batch.commit();
        }
    };
    const duplicateConversionMethod = async (methodToDuplicate: ConversionMethod) => {
        const { id, name, ...rest } = methodToDuplicate;
        const existingNames = new Set(allConversionMethods.map(c => c.name));
        const newName = generateUniqueName(name, existingNames);
        const newData = { ...rest, name: newName, createdAt: new Date().toISOString() };
        await addDoc(collection(db, 'conversionMethods'), newData);
    };

    // --- Conversion Screen Functions ---
    const createConversionScreen = async (newScreen: Omit<ConversionScreen, 'id'>) => {
        await addDoc(collection(db, 'conversionScreens'), newScreen);
    };
    const updateConversionScreen = async (screenId: string, updatedScreen: Partial<Omit<ConversionScreen, 'id'>>) => {
        await updateDoc(doc(db, 'conversionScreens', screenId), updatedScreen);
    };
    const deleteConversionScreen = async (screenId: string) => {
        if (window.confirm("Are you sure? This screen will be unlinked from all macrogames that use it.")) {
            const batch = writeBatch(db);
            const macrogamesQuery = await getDocs(query(collection(db, 'macrogames'), where('conversionScreenId', '==', screenId)));
            macrogamesQuery.forEach(gameDoc => {
                batch.update(doc(db, 'macrogames', gameDoc.id), { conversionScreenId: null });
            });
            await batch.commit();
            await deleteDoc(doc(db, 'conversionScreens', screenId));
        }
    };
    const duplicateConversionScreen = async (screenToDuplicate: ConversionScreen) => {
        const { id, name, ...rest } = screenToDuplicate;
        const existingNames = new Set(allConversionScreens.map(c => c.name));
        const newName = generateUniqueName(name, existingNames);
        const newData = { ...rest, name: newName };
        await addDoc(collection(db, 'conversionScreens'), newData);
    };

    const value: DataContextType = {
        macrogames, popups, campaigns, allConversionMethods, allConversionScreens, allMicrogames, customMicrogames,
        createMacrogame, updateMacrogame, deleteMacrogame, deleteMultipleMacrogames,
        duplicateMacrogame, toggleMacrogameFavorite,
        createPopup, deletePopup, deleteMultiplePopups, updatePopup,
        duplicatePopup, togglePopupFavorite,
        saveCustomMicrogame, toggleMicrogameFavorite, deleteCustomMicrogame,
        createConversionMethod, updateConversionMethod, deleteConversionMethod, deleteMultipleConversionMethods,
        duplicateConversionMethod,
        createConversionScreen, updateConversionScreen, deleteConversionScreen, duplicateConversionScreen,
        createCampaign, updateCampaign, updateCampaignStatus, deleteCampaign, duplicateCampaign
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};