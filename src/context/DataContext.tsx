// src/context/DataContext.tsx

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db, storage } from '../firebase/config';
import {
    collection, addDoc, onSnapshot, query, doc, updateDoc,
    deleteDoc, DocumentData, setDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Macrogame, Microgame, Popup, Reward, CustomMicrogame } from '../types';
import { seedMicrogames } from '../scripts/seedDatabase';

interface DataContextType {
    macrogames: Macrogame[];
    popups: Popup[];
    allRewards: Reward[];
    allMicrogames: Microgame[];
    customMicrogames: CustomMicrogame[];
    createMacrogame: (newMacrogame: Omit<Macrogame, 'id' | 'type'> & { id: string | null }) => Promise<void>;
    updateMacrogame: (updatedMacrogame: Omit<Macrogame, 'id' | 'type'> & { id: string | null }) => Promise<void>;
    deleteMacrogame: (id: string) => Promise<void>;
    duplicateMacrogame: (gameToDuplicate: Macrogame) => Promise<void>;
    createPopup: (newPopup: Omit<Popup, 'id'>) => Promise<void>; // <-- ADDED
    deletePopup: (id: string) => Promise<void>;
    updatePopup: (popupId: string, dataToUpdate: Partial<Popup>) => Promise<void>;
    duplicatePopup: (popupToDuplicate: Popup) => Promise<void>;
    saveCustomMicrogame: (baseGame: Microgame, variantName: string, skinFiles: { [key: string]: File }) => Promise<void>;
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
        if (window.confirm("Are you sure? This action cannot be undone.")) {
            await deleteDoc(doc(db, "macrogames", id));
        }
    };
    
    const duplicateMacrogame = async (gameToDuplicate: Macrogame) => {
        const { id, name, ...restOfGame } = gameToDuplicate;
        const newGameData = { ...restOfGame, name: `Copy of ${name}`, createdAt: new Date().toISOString() };
        await addDoc(collection(db, 'macrogames'), newGameData);
    };

    const createPopup = async (newPopup: Omit<Popup, 'id'>) => { // <-- ADDED
        await addDoc(collection(db, 'popups'), newPopup);
    };

    const deletePopup = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this popup?")) {
            await deleteDoc(doc(db, "popups", id));
        }
    };
    
    const updatePopup = async (popupId: string, dataToUpdate: Partial<Popup>) => {
        await updateDoc(doc(db, "popups", popupId), dataToUpdate);
    };

    const duplicatePopup = async (popupToDuplicate: Popup) => {
        const { id, name, ...restOfPopup } = popupToDuplicate;
        const newPopupData = { ...restOfPopup, name: `Copy of ${name}`, createdAt: new Date().toISOString(), views: 0, engagements: 0, status: 'Draft' as const };
        await addDoc(collection(db, 'popups'), newPopupData);
    };

    const saveCustomMicrogame = async (baseGame: Microgame, variantName: string, skinFiles: { [key: string]: File }) => {
        const skinData: { [key: string]: string } = {};
        const newVariantId = doc(collection(db, 'customMicrogames')).id;

        for (const key in skinFiles) {
            const file = skinFiles[key];
            const storageRef = ref(storage, `microgame-skins/${newVariantId}/${key}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
            skinData[key] = downloadURL;
        }

        const newVariant: Omit<CustomMicrogame, 'id'> = {
            name: variantName,
            baseMicrogameId: baseGame.id,
            createdAt: new Date().toISOString(),
            skinData,
        };

        await setDoc(doc(db, 'customMicrogames', newVariantId), newVariant);
        alert('Custom microgame variant saved successfully!');
    };


    const value = {
        macrogames,
        popups,
        allRewards,
        allMicrogames,
        customMicrogames,
        createMacrogame,
        updateMacrogame,
        deleteMacrogame,
        duplicateMacrogame,
        createPopup, // <-- ADDED
        deletePopup,
        updatePopup,
        duplicatePopup,
        saveCustomMicrogame,
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