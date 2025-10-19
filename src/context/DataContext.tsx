// src/context/DataContext.tsx

import { createContext, useState, useEffect, ReactNode } from 'react';
import toast from 'react-hot-toast';
import { db, storage } from '../firebase/config';
import {
    collection, addDoc, onSnapshot, query, doc, updateDoc,
    deleteDoc, DocumentData, setDoc, writeBatch, getDocs, where
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { Macrogame, Microgame, Popup, ConversionMethod, CustomMicrogame, Campaign, ConversionScreen, EntityStatus } from '../types';
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

// --- NEW --- Confirmation Toast Component
const ConfirmationToast: React.FC<{ t: any; message: string; onConfirm: () => void; }> = ({ t, message, onConfirm }) => (
    <div style={{
        background: '#333', color: 'white', padding: '12px 16px', borderRadius: '8px',
        boxShadow: '0 3px 10px rgba(0, 0, 0, 0.2)', display: 'flex', alignItems: 'center', gap: '16px'
    }}>
        <span>{message}</span>
        <div style={{ display: 'flex', gap: '8px' }}>
            <button
                style={{ background: '#27ae60', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}
                onClick={() => {
                    onConfirm();
                    toast.dismiss(t.id);
                }}
            >
                Confirm
            </button>
            <button
                style={{ background: '#7f8c8d', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}
                onClick={() => toast.dismiss(t.id)}
            >
                Cancel
            </button>
        </div>
    </div>
);


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

    // --- NEW --- Reusable confirmation action
    const confirmAction = (message: string, onConfirm: () => void) => {
        toast.custom((t) => (
            <ConfirmationToast t={t} message={message} onConfirm={onConfirm} />
        ), { duration: 6000, position: 'top-center' }); // Auto-dismiss after 6s if no action
    };

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
        confirmAction("Delete campaign? Popups inside will become unassigned.", async () => {
            const batch = writeBatch(db);
            const popupsQuery = await getDocs(query(collection(db, 'popups'), where('campaignId', '==', campaignId)));
            popupsQuery.forEach(popupDoc => {
                batch.update(popupDoc.ref, { campaignId: null });
            });
            await batch.commit();
            await deleteDoc(doc(db, 'campaigns', campaignId));
            toast.success('Campaign deleted.');
        });
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
        const { id, ...gameData } = updatedMacrogame;
        await updateDoc(doc(db, "macrogames", id), gameData as DocumentData);
    };
    const deleteMacrogame = async (id: string) => {
        confirmAction("Delete macrogame? It will be unlinked from any popups.", async () => {
            const batch = writeBatch(db);
            const popupsQuery = await getDocs(query(collection(db, 'popups'), where('macrogameId', '==', id)));
            popupsQuery.forEach(popupDoc => {
                const popupRef = doc(db, 'popups', popupDoc.id);
                batch.update(popupRef, { macrogameId: '', macrogameName: '', status: 'Draft' });
            });
            await batch.commit();
            await deleteDoc(doc(db, "macrogames", id));
            toast.success('Macrogame deleted.');
        });
    };
    const deleteMultipleMacrogames = async (ids: string[]) => {
        if (ids.length === 0) return;
        confirmAction(`Delete ${ids.length} macrogames? This cannot be undone.`, async () => {
            const batch = writeBatch(db);
            ids.forEach(id => batch.delete(doc(db, 'macrogames', id)));
            await batch.commit();
            toast.success(`${ids.length} macrogames deleted.`);
        });
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
        await deleteDoc(doc(db, "popups", id));
    };
    const deleteMultiplePopups = async (ids: string[]) => {
        if (ids.length === 0) return;
        const batch = writeBatch(db);
        ids.forEach(id => batch.delete(doc(db, 'popups', id)));
        await batch.commit();
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
        toast.success(`Custom microgame variant ${existingVariant ? 'updated' : 'saved'}!`);
    };
    const deleteCustomMicrogame = async (variantId: string) => {
        confirmAction("Delete variant? It will be removed from all macrogames.", async () => {
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
            toast.success('Variant deleted.');
        });
    };

    // --- Conversion Method Functions ---
    const createConversionMethod = async (newMethod: Omit<ConversionMethod, 'id'>) => {
        await addDoc(collection(db, 'conversionMethods'), newMethod);
    };
    const updateConversionMethod = async (methodId: string, updatedMethod: Partial<Omit<ConversionMethod, 'id'>>) => {
        await updateDoc(doc(db, 'conversionMethods', methodId), updatedMethod);
    };
    const deleteConversionMethod = async (methodId: string) => {
        confirmAction("Delete method? It will be removed from all conversion screens.", async () => {
            const batch = writeBatch(db);
            const screensCollection = collection(db, 'conversionScreens');
            const allScreensSnap = await getDocs(screensCollection);

            allScreensSnap.forEach(screenDoc => {
                const screen = screenDoc.data() as ConversionScreen;
                if (screen.methods?.some(m => m.methodId === methodId)) {
                    const newMethods = screen.methods.filter(m => m.methodId !== methodId);
                    const newStatus: EntityStatus = newMethods.length === 0 
                        ? { code: 'error', message: 'This screen has no methods.' } 
                        : { code: 'warning', message: 'A linked method was deleted.' };
                    batch.update(screenDoc.ref, { methods: newMethods, status: newStatus });
                }
            });
            batch.delete(doc(db, 'conversionMethods', methodId));
            await batch.commit();
            toast.success('Conversion method deleted.');
        });
    };
    const deleteMultipleConversionMethods = async (ids: string[]) => {
        if (ids.length === 0) return;
        confirmAction(`Delete ${ids.length} methods? They will be removed from all screens.`, async () => {
            const batch = writeBatch(db);
            const screensCollection = collection(db, 'conversionScreens');
            const allScreensSnap = await getDocs(screensCollection);
            const idsToDelete = new Set(ids);

            allScreensSnap.forEach(screenDoc => {
                const screen = screenDoc.data() as ConversionScreen;
                let wasModified = false;
                const newMethods = (screen.methods || []).filter(method => {
                    if (idsToDelete.has(method.methodId)) { wasModified = true; return false; } return true;
                });

                if (wasModified) {
                    const newStatus: EntityStatus = newMethods.length === 0
                        ? { code: 'error', message: 'This screen has no methods.' }
                        : { code: 'warning', message: 'Linked methods were deleted.' };
                    batch.update(screenDoc.ref, { methods: newMethods, status: newStatus });
                }
            });
            ids.forEach(id => { batch.delete(doc(db, 'conversionMethods', id)); });
            await batch.commit();
            toast.success(`${ids.length} methods deleted.`);
        });
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
        const dataToUpdate = { ...updatedScreen };
        if (dataToUpdate.methods && dataToUpdate.methods.length > 0) {
            dataToUpdate.status = { code: 'ok', message: '' };
        } else {
            dataToUpdate.status = { code: 'error', message: 'This screen has no methods and will not function.' };
        }
        await updateDoc(doc(db, 'conversionScreens', screenId), dataToUpdate);
    };
    const deleteConversionScreen = async (screenId: string) => {
        confirmAction("Delete screen? It will be unlinked from all macrogames.", async () => {
            const batch = writeBatch(db);
            const macrogamesQuery = await getDocs(query(collection(db, 'macrogames'), where('conversionScreenId', '==', screenId)));
            macrogamesQuery.forEach(gameDoc => {
                batch.update(doc(db, 'macrogames', gameDoc.id), { conversionScreenId: null });
            });
            await batch.commit();
            await deleteDoc(doc(db, 'conversionScreens', screenId));
            toast.success('Conversion screen deleted.');
        });
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