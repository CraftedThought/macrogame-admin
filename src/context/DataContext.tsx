// src/context/DataContext.tsx

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db, storage } from '../firebase/config';
import {
    collection, addDoc, onSnapshot, query, doc, updateDoc,
    deleteDoc, DocumentData, setDoc, writeBatch, getDocs, where
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { Macrogame, Microgame, Popup, Reward, CustomMicrogame } from '../types';
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

interface DataContextType {
    macrogames: Macrogame[];
    popups: Popup[];
    allRewards: Reward[];
    allMicrogames: Microgame[];
    customMicrogames: CustomMicrogame[];
    createMacrogame: (newMacrogame: Omit<Macrogame, 'id' | 'type'> & { id: string | null }) => Promise<void>;
    updateMacrogame: (updatedMacrogame: Omit<Macrogame, 'id' | 'type'> & { id: string | null }) => Promise<void>;
    deleteMacrogame: (id: string) => Promise<void>;
    deleteMultipleMacrogames: (ids: string[]) => Promise<void>;
    duplicateMacrogame: (gameToDuplicate: Macrogame) => Promise<void>;
    toggleMacrogameFavorite: (macrogameId: string, isFavorite: boolean) => Promise<void>;
    createPopup: (newPopup: Omit<Popup, 'id'>) => Promise<void>;
    deletePopup: (id: string) => Promise<void>;
    deleteMultiplePopups: (ids: string[]) => Promise<void>;
    updatePopup: (popupId: string, dataToUpdate: Partial<Popup>) => Promise<void>;
    duplicatePopup: (popupToDuplicate: Popup) => Promise<void>;
    togglePopupFavorite: (popupId: string, isFavorite: boolean) => Promise<void>;
    saveCustomMicrogame: (baseGame: Microgame, variantName: string, skinFiles: { [key: string]: File }, existingVariant?: CustomMicrogame) => Promise<void>;
    toggleMicrogameFavorite: (gameId: string, isFavorite: boolean) => Promise<void>;
    deleteCustomMicrogame: (variantId: string) => Promise<void>;
    createReward: (newReward: Omit<Reward, 'id'>) => Promise<void>;
    updateReward: (rewardId: string, updatedReward: Partial<Omit<Reward, 'id'>>) => Promise<void>;
    deleteReward: (rewardId: string) => Promise<void>;
    deleteMultipleRewards: (ids: string[]) => Promise<void>;
    duplicateReward: (rewardToDuplicate: Reward) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [macrogames, setMacrogames] = useState<Macrogame[]>([]);
    const [popups, setPopups] = useState<Popup[]>([]);
    const [allRewards, setAllRewards] = useState<Reward[]>([]);
    const [allMicrogames, setAllMicrogames] = useState<Microgame[]>([]);
    const [customMicrogames, setCustomMicrogames] = useState<CustomMicrogame[]>([]);

    useEffect(() => {
        (window as any).seedMicrogames = seedMicrogames;

        const unsubMacrogames = onSnapshot(query(collection(db, 'macrogames')), snap => setMacrogames(snap.docs.map(doc => ({ ...doc.data() as Omit<Macrogame, 'id'>, id: doc.id }))));
        const unsubPopups = onSnapshot(query(collection(db, 'popups')), snap => setPopups(snap.docs.map(doc => ({ ...doc.data() as Omit<Popup, 'id'>, id: doc.id }))));
        const unsubRewards = onSnapshot(query(collection(db, 'rewards')), snap => setAllRewards(snap.docs.map(doc => ({ ...doc.data() as Omit<Reward, 'id'>, id: doc.id }))));
        const unsubMicrogames = onSnapshot(query(collection(db, 'microgames')), snap => setAllMicrogames(snap.docs.map(doc => ({ ...doc.data() as Microgame, id: doc.id }))));
        const unsubCustomMicrogames = onSnapshot(query(collection(db, 'customMicrogames')), snap => { setCustomMicrogames(snap.docs.map(doc => ({ ...doc.data() as Omit<CustomMicrogame, 'id'>, id: doc.id }))); });
        
        return () => {
            unsubMacrogames();
            unsubPopups();
            unsubRewards();
            unsubMicrogames();
            unsubCustomMicrogames();
        };
    }, []);

    // --- Macrogame Functions ---
    const createMacrogame = async (newMacrogame: Omit<Macrogame, 'id' | 'type'> & { id: string | null }) => {
        const { id, ...gameData } = newMacrogame;
        await addDoc(collection(db, "macrogames"), gameData);
    };
    const updateMacrogame = async (updatedMacrogame: Omit<Macrogame, 'id' | 'type'> & { id: string | null }) => {
        if (!updatedMacrogame.id) return;
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
        await addDoc(collection(db, 'popups'), newPopup);
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

    // --- Reward Functions ---
    const createReward = async (newReward: Omit<Reward, 'id'>) => {
        await addDoc(collection(db, 'rewards'), newReward);
    };
    const updateReward = async (rewardId: string, updatedReward: Partial<Omit<Reward, 'id'>>) => {
        await updateDoc(doc(db, 'rewards', rewardId), updatedReward);
    };
    const deleteReward = async (rewardId: string) => {
        if (window.confirm("Are you sure? This reward will be removed from all macrogames that use it.")) {
            const batch = writeBatch(db);
            const macrogamesQuery = await getDocs(collection(db, 'macrogames'));
            macrogamesQuery.forEach(gameDoc => {
                const macrogame = gameDoc.data() as Macrogame;
                const newRewards = macrogame.rewards.filter(r => r.rewardId !== rewardId);
                if (newRewards.length !== macrogame.rewards.length) {
                    batch.update(doc(db, 'macrogames', gameDoc.id), { rewards: newRewards });
                }
            });
            await batch.commit();
            await deleteDoc(doc(db, 'rewards', rewardId));
        }
    };
    const deleteMultipleRewards = async (ids: string[]) => {
        if (window.confirm(`Are you sure you want to delete ${ids.length} rewards? This cannot be undone.`)) {
            // Note: This bulk delete does not currently clean up references in macrogames.
            // For simplicity, we are deleting directly. A more robust solution would expand this.
            const batch = writeBatch(db);
            ids.forEach(id => batch.delete(doc(db, 'rewards', id)));
            await batch.commit();
        }
    };
    const duplicateReward = async (rewardToDuplicate: Reward) => {
        const { id, name, ...restOfReward } = rewardToDuplicate;
        const existingNames = new Set(allRewards.map(r => r.name));
        const newName = generateUniqueName(name, existingNames);
        const newRewardData = {
            ...restOfReward,
            name: newName,
            createdAt: new Date().toISOString(),
            redemptions: 0,
            conversionRate: 0,
        };
        await addDoc(collection(db, 'rewards'), newRewardData);
    };

    const value = {
        macrogames, popups, allRewards, allMicrogames, customMicrogames,
        createMacrogame, updateMacrogame, deleteMacrogame, deleteMultipleMacrogames,
        duplicateMacrogame, toggleMacrogameFavorite,
        createPopup, deletePopup, deleteMultiplePopups, updatePopup,
        duplicatePopup, togglePopupFavorite,
        saveCustomMicrogame, toggleMicrogameFavorite, deleteCustomMicrogame,
        createReward, updateReward, deleteReward, deleteMultipleRewards,
        duplicateReward,
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};