/* src/context/DataContext.tsx */

import { createContext, useEffect, ReactNode, useState } from 'react';
import { User } from 'firebase/auth';
import { onAuthChange } from '../firebase/auth';
import toast from 'react-hot-toast';
import { ConfirmationToast } from '../components/ui/ConfirmationToast';
import { notifications } from '../utils/notifications';
import { db, storage } from '../firebase/config';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  doc,
  updateDoc,
  deleteDoc,
  DocumentData,
  setDoc,
  writeBatch,
  getDocs,
  where,
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
} from 'firebase/storage';
// --- REFACTOR: Import DeliveryContainer instead of Popup ---
import {
  Macrogame,
  Microgame,
  DeliveryContainer,
  ConversionMethod,
  CustomMicrogame,
  Campaign,
  ConversionScreen,
  EntityStatus,
} from '../types';
// Note: We no longer need hasMacrogameIssues here, as the server handles status
import { seedMicrogames } from '../scripts/seedDatabase';
import { useStore } from '../store/useStore';
import { generateUUID, ensureUniqueName } from '../utils/helpers'; // Import helpers

// --- REFACTOR: Update interface with new types and return values ---
export interface DataContextType {
  user: User | null;
  // Campaign Functions
  createCampaign: (
    newCampaign: Omit<Campaign, 'id' | 'status'>,
  ) => Promise<Campaign | undefined>;
  updateCampaign: (
    campaignId: string,
    dataToUpdate: Partial<Campaign>,
  ) => Promise<void>;
  deleteCampaign: (campaignId: string) => Promise<boolean>;
  deleteMultipleCampaigns: (ids: string[]) => Promise<void>;
  duplicateCampaign: (
    campaignToDuplicate: Campaign,
  ) => Promise<Campaign | undefined>;
  // Macrogame Functions
  createMacrogame: (
    newMacrogame: Omit<Macrogame, 'id' | 'type' | 'status'>,
  ) => Promise<Macrogame | undefined>;
  updateMacrogame: (
    updatedMacrogame: Omit<Macrogame, 'id' | 'type'> & { id: string | null },
  ) => Promise<void>;
  deleteMacrogame: (id: string) => Promise<boolean>;
  deleteMultipleMacrogames: (ids: string[]) => Promise<void>;
  duplicateMacrogame: (
    gameToDuplicate: Macrogame,
  ) => Promise<Macrogame | undefined>;
  toggleMacrogameFavorite: (
    macrogameId: string,
    isFavorite: boolean,
  ) => Promise<void>;
  // Delivery Container Functions
  createDeliveryContainer: (
    newContainer: Omit<DeliveryContainer, 'id' | 'status'>,
  ) => Promise<DeliveryContainer | undefined>;
  deleteDeliveryContainer: (id: string) => Promise<boolean>;
  deleteMultipleDeliveryContainers: (ids: string[]) => Promise<void>;
  updateDeliveryContainer: (
    containerId: string,
    dataToUpdate: Partial<DeliveryContainer>,
  ) => Promise<void>;
  duplicateDeliveryContainer: (
    containerToDuplicate: DeliveryContainer,
  ) => Promise<DeliveryContainer | undefined>;
  toggleDeliveryContainerFavorite: (
    containerId: string,
    isFavorite: boolean,
  ) => Promise<void>;
  // Microgame Functions
  saveCustomMicrogame: (
    baseGame: Microgame,
    variantName: string,
    skinFiles: { [key: string]: File },
    existingVariant?: CustomMicrogame,
  ) => Promise<void>;
  toggleMicrogameFavorite: (
    gameId: string,
    isFavorite: boolean,
  ) => Promise<void>;
  deleteCustomMicrogame: (variantId: string) => Promise<boolean>;
  // Conversion Method Functions
  createConversionMethod: (
    newMethod: Omit<ConversionMethod, 'id' | 'status'>,
  ) => Promise<ConversionMethod | undefined>;
  updateConversionMethod: (
    methodId: string,
    updatedMethod: Partial<Omit<ConversionMethod, 'id'>>,
  ) => Promise<void>;
  deleteConversionMethod: (methodId: string) => Promise<boolean>;
  deleteMultipleConversionMethods: (ids: string[]) => Promise<void>;
  duplicateConversionMethod: (
    methodToDuplicate: ConversionMethod,
  ) => Promise<ConversionMethod | undefined>;
  // Conversion Screen Functions
  createConversionScreen: (
    newScreen: Omit<ConversionScreen, 'id' | 'status'>,
  ) => Promise<ConversionScreen | undefined>;
  updateConversionScreen: (
    screenId: string,
    updatedScreen: Partial<Omit<ConversionScreen, 'id'>>,
  ) => Promise<void>;
  deleteConversionScreen: (screenId: string) => Promise<boolean>;
  deleteMultipleConversionScreens: (ids: string[]) => Promise<boolean>;
  duplicateConversionScreen: (
    screenToDuplicate: ConversionScreen,
  ) => Promise<ConversionScreen | undefined>;
}

export const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // State is now managed by Zustand, but we get access to the state and setState action here.
  // --- REFACTOR: Use deliveryContainers instead of popups ---
  const [user, setUser] = useState<User | null>(null);
  const {
    setState,
    macrogames,
    deliveryContainers,
    campaigns,
    allMicrogames,
    allConversionMethods,
    allConversionScreens,
    customMicrogames,
  } = useStore();

  useEffect(() => {
    // Listen for authentication changes
    const unsubscribe = onAuthChange((firebaseUser) => {
        setUser(firebaseUser); // Set the user (or null if logged out)

        if (firebaseUser) {
            // User is logging IN. Set loading to true.
            // The data-fetching effect will set it to false when done.
            setState({ isDataLoading: true });
        } else {
            // User is logging OUT, or it's the initial auth check (null).
            // Stop loading and clear all data.
            setState({ 
                isDataLoading: false, // <-- THIS IS THE FIX
                macrogames: [], 
                deliveryContainers: [], 
                campaigns: [],
                allConversionMethods: [],
                allConversionScreens: [],
                allMicrogames: [],
                customMicrogames: [],
            });
        }
    });
    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [setState]);


  const confirmAction = (
    message: string,
    onConfirm: () => void,
  ): Promise<boolean> => {
    let isResolved = false;
    // This helper creates a toast and returns a promise
    // that resolves to true if 'Confirm' is clicked,
    // or false if it's dismissed.
    return new Promise((resolve) => {
      const toastId = `confirm-${generateUUID()}`;
      toast.custom(
        (t) => (
          <ConfirmationToast
            t={t}
            message={message}
            onConfirm={() => {
              if (isResolved) return; // Prevent double-resolve
              isResolved = true;
              onConfirm();
              toast.dismiss(t.id);
              resolve(true); // User confirmed
            }}
          />
        ),
        {
          duration: 6000,
          position: 'top-center',
          id: toastId,
          onDismiss: () => {
            if (isResolved) return; // Don't resolve if already confirmed
            isResolved = true;
            resolve(false); // User cancelled or it timed out
          },
        },
      );
    });
  };

  useEffect(() => {
    // An array to hold all our listener unsubscribe functions
    const unsubscribers: (() => void)[] = [];

    // Only attach listeners if we have an authenticated user
    if (user) {
    (window as any).seedMicrogames = seedMicrogames;

    // --- FIX: Implement correct data loading flag ---
    let initialLoadComplete = false;
    let loadCount = 0;
    // We listen to 6 main collections for the initial load
    const totalCollections = 6;

    const handleLoad = () => {
      loadCount++;
      if (loadCount === totalCollections && !initialLoadComplete && user) {
        initialLoadComplete = true;
        setState({ isDataLoading: false });
        console.log('All initial data loaded.');
      }
    };
    // --- End Fix ---

    // --- THIS IS THE FIX ---
    // We create the listener first, then push it.
    // This is syntactically simpler for Vite's scanner.
    
    const unsubMacrogames = onSnapshot(
      query(collection(db, 'macrogames')),
      (snap) => {
        const data = snap.docs.map(
          (doc) => ({ ...(doc.data() as Omit<Macrogame, 'id'>), id: doc.id }),
        );
        setState({ macrogames: data });
        handleLoad();
      },
      (error) => {
        console.error('Error fetching macrogames:', error);
        handleLoad();
      },
    );
    unsubscribers.push(unsubMacrogames);


    // --- REFACTOR: Listen to deliveryContainers ---
    const unsubDeliveryContainers = onSnapshot(
      query(collection(db, 'deliveryContainers')),
      (snap) => {
        const data = snap.docs.map(
          (doc) =>
            ({
              ...(doc.data() as Omit<DeliveryContainer, 'id'>),
              id: doc.id,
            } as DeliveryContainer),
        );
        setState({ deliveryContainers: data });
        handleLoad();
      },
      (error) => {
        console.error('Error fetching delivery containers:', error);
        handleLoad();
      },
    );
    unsubscribers.push(unsubDeliveryContainers);


    const unsubCampaigns = onSnapshot(
      query(collection(db, 'campaigns')),
      (snap) => {
        const data = snap.docs.map(
          (doc) => ({ ...(doc.data() as Omit<Campaign, 'id'>), id: doc.id }),
        );
        setState({ campaigns: data });
        handleLoad();
      },
      (error) => {
        console.error('Error fetching campaigns:', error);
        handleLoad();
      },
    );
    unsubscribers.push(unsubCampaigns);


    const unsubConversionMethods = onSnapshot(
      query(collection(db, 'conversionMethods')),
      (snap) => {
        const data = snap.docs.map(
          (doc) => ({ ...doc.data(), id: doc.id } as ConversionMethod),
        );
        setState({ allConversionMethods: data });
        handleLoad();
      },
      (error) => {
        console.error('Error fetching conversion methods:', error);
        handleLoad();
      },
    );
    unsubscribers.push(unsubConversionMethods);


    const unsubConversionScreens = onSnapshot(
      query(collection(db, 'conversionScreens')),
      (snap) => {
        const data = snap.docs.map(
          (doc) => ({ ...doc.data(), id: doc.id } as ConversionScreen),
        );
        setState({ allConversionScreens: data });
        handleLoad();
      },
      (error) => {
        console.error('Error fetching conversion screens:', error);
        handleLoad();
      },
    );
    unsubscribers.push(unsubConversionScreens);


    const unsubMicrogames = onSnapshot(
      query(collection(db, 'microgames')),
      (snap) => {
        const data = snap.docs.map(
          (doc) => ({ ...(doc.data() as Microgame), id: doc.id }),
        );
        setState({ allMicrogames: data });
        handleLoad();
      },
      (error) => {
        console.error('Error fetching microgames:', error);
        handleLoad();
      },
    );
    unsubscribers.push(unsubMicrogames);


    const unsubCustomMicrogames = onSnapshot(
      query(collection(db, 'customMicrogames')),
      (snap) => {
        const data = snap.docs.map(
          (doc) =>
            ({
              ...(doc.data() as Omit<CustomMicrogame, 'id'>),
              id: doc.id,
            } as CustomMicrogame),
        );
        setState({ customMicrogames: data });
        // This collection is not part of the initial "all loaded"
        // count because it's not critical for startup.
      },
      (error) => console.error('Error fetching custom microgames:', error),
    );
    unsubscribers.push(unsubCustomMicrogames);

  } // <-- This brace closes the 'if (user)' block

    // --- REMOVED: isDataLoading: false was here, which was a bug ---

    // When the effect cleans up (due to user logout or unmount),
    // call all the unsubscribe functions.
    return () => {
        unsubscribers.forEach(unsub => unsub());
    };
  }, [setState, user]);

  // --- REFACTORED ---
  // The complex useEffect for auto-pausing campaigns [lines 104-127 in original]
  // has been REMOVED. This logic is now handled server-side by the
  // `onContainerWritten` and `onMacrogameWritten` Cloud Functions.

  // --- Campaign Functions ---
  const createCampaign = async (
    newCampaign: Omit<Campaign, 'id' | 'status'>,
  ): Promise<Campaign | undefined> => {
    // --- REFACTOR: Add denormalized containerIdList ---
    const containerIdList = (newCampaign.displayRules || []).flatMap((r: any) =>
      (r.containers || []).map((c: any) => c.containerId),
    );
    const uniqueContainerIds = [...new Set(containerIdList)];
    const newId = generateUUID();

    const dataToSave: Campaign = {
        ...newCampaign,
        id: newId,
        containerIdList: uniqueContainerIds,
        // Use the string status passed from the form (e.g., 'Draft'),
        // not an EntityStatus object.
        status: newCampaign.status || 'Draft',
    };

    await setDoc(doc(db, 'campaigns', newId), dataToSave);

    // This part is still needed to link containers to the campaign
    const batch = writeBatch(db);
    newCampaign.displayRules.forEach((rule) => {
      // --- REFACTOR: Loop over 'containers' ---
      rule.containers.forEach((c) => {
        const containerRef = doc(db, 'deliveryContainers', c.containerId);
        batch.update(containerRef, { campaignId: newId });
      });
    });
    await batch.commit();
    return dataToSave;
  };

  const updateCampaign = async (
    campaignId: string,
    dataToUpdate: Partial<Campaign>,
  ) => {
    const campaignRef = doc(db, 'campaigns', campaignId);

    // --- REFACTOR: Add denormalized containerIdList if rules are changing ---
    if (dataToUpdate.displayRules) {
      const containerIdList = (dataToUpdate.displayRules || []).flatMap(
        (r: any) => (r.containers || []).map((c: any) => c.containerId),
      );
      dataToUpdate.containerIdList = [...new Set(containerIdList)];
    }
    // --- End New ---

    // --- REFACTOR: This logic must be updated to use 'deliveryContainers' ---
    const oldContainersQuery = query(
      collection(db, 'deliveryContainers'),
      where('campaignId', '==', campaignId),
    );
    const oldContainersSnap = await getDocs(oldContainersQuery);
    const newContainerIds = new Set(
      dataToUpdate.displayRules?.flatMap((rule) =>
        rule.containers.map((c) => c.containerId),
      ) || [],
    );
    const batch = writeBatch(db);
    oldContainersSnap.forEach((containerDoc) => {
      if (!newContainerIds.has(containerDoc.id)) {
        batch.update(containerDoc.ref, { campaignId: null });
      }
    });
    newContainerIds.forEach((containerId) => {
      const containerRef = doc(db, 'deliveryContainers', containerId);
      batch.update(containerRef, { campaignId: campaignId });
    });
    batch.update(campaignRef, dataToUpdate);
    await batch.commit();
  };
  // --- REFACTORED: Removed updateCampaignStatus function ---

  const deleteCampaign = async (campaignId: string): Promise<boolean> => {
    // --- REFACTORED ---
    // The `onCampaignDeleted` server function now handles
    // unlinking all delivery containers.
    const wasConfirmed = await confirmAction(
      'Delete campaign? Containers inside will become unassigned.',
      async () => {
        try {
          await deleteDoc(doc(db, 'campaigns', campaignId));
        } catch (error) {
          console.error('Error deleting campaign:', error);
        }
      },
    );
    return wasConfirmed;
  };

  const deleteMultipleCampaigns = async (ids: string[]) => {
    if (ids.length === 0) return;
    const wasConfirmed = await confirmAction(
      `Delete ${ids.length} campaigns?`,
      async () => {
        try {
          const batch = writeBatch(db);
          // Server-side triggers will handle unlinking containers
          ids.forEach((id) => batch.delete(doc(db, 'campaigns', id)));
          await batch.commit();
        } catch (error) {
          console.error('Failed to delete campaigns:', error);
        }
      },
    );
    return wasConfirmed;
  };

  const duplicateCampaign = async (
    campaignToDuplicate: Campaign,
  ): Promise<Campaign | undefined> => {
    const { id, name, ...rest } = campaignToDuplicate;
    const existingNames = new Set(campaigns.map((c) => c.name));
    const baseName = `Copy of ${name}`;
    const newName = ensureUniqueName(baseName, existingNames);
    const newData = {
      ...rest,
      name: newName,
      createdAt: new Date().toISOString(),
      status: 'Draft' as const,
    };
    // Create function will handle denormalization and return the new doc
    return await createCampaign(newData);
  };

  // --- Macrogame Functions ---
  const createMacrogame = async (
    gameData: Omit<Macrogame, 'id' | 'type' | 'status'>,
  ): Promise<Macrogame | undefined> => {
    const newId = generateUUID();
    // --- NEW: Add denormalized lists ---
    const variantIdList = (gameData.flow || [])
      .map((f: any) => f.variantId)
      .filter(Boolean);
    const flowMicrogameIds = (gameData.flow || []).map((f: any) => f.microgameId);
    const dataToSave: Macrogame = {
      ...gameData,
      id: newId,
      variantIdList: variantIdList as string[],
      flowMicrogameIds,
      status: { code: 'ok', message: '' }, // Initialize status
    };
    // --- End New ---

    await setDoc(doc(db, 'macrogames', newId), dataToSave);

    // Return the final data (with the new ID) so the UI can update optimistically
    return dataToSave;
  };

  const updateMacrogame = async (
    updatedMacrogame: Omit<Macrogame, 'id' | 'type'> & { id: string | null },
  ) => {
    if (!updatedMacrogame.id) return;
    const { id, ...gameData } = updatedMacrogame;

    // --- NEW: Add denormalized lists ---
    const variantIdList = (gameData.flow || [])
      .map((f: any) => f.variantId)
      .filter(Boolean);
    const flowMicrogameIds = (gameData.flow || []).map((f: any) => f.microgameId);
    const dataToUpdate = {
      ...gameData,
      variantIdList,
      flowMicrogameIds,
    };
    // --- End New ---

    await updateDoc(doc(db, 'macrogames', id), dataToUpdate as DocumentData);
  };

  const deleteMacrogame = async (id: string): Promise<boolean> => {
    // --- REFACTORED: Use confirmAction toast instead of window.confirm ---
    const wasConfirmed = await confirmAction(
      'Delete macrogame? It will be unlinked from any containers.',
      async () => {
        try {
          // --- REFACTORED ---
          // The `onMacrogameDeleted` server function will handle
          // unlinking all delivery containers.
          await deleteDoc(doc(db, 'macrogames', id));
        } catch (error) {
          console.error('Failed to delete macrogame:', error);
        }
      },
    );
    return wasConfirmed;
  };

  const deleteMultipleMacrogames = async (ids: string[]) => {
    if (ids.length === 0) return;
    const wasConfirmed = await confirmAction(
      `Delete ${ids.length} macrogames? This cannot be undone.`,
      async () => {
        try {
          const batch = writeBatch(db);
          // Server-side triggers will handle cleanup for each deletion
          ids.forEach((id) => batch.delete(doc(db, 'macrogames', id)));
          await batch.commit();
        } catch (error) {
          console.error('Failed to delete macrogames:', error);
        }
      },
    );
    return wasConfirmed;
  };

  const duplicateMacrogame = async (
    gameToDuplicate: Macrogame,
  ): Promise<Macrogame | undefined> => {
    // 1. Get the FULL, complete macrogame object from the main state
    //    using the ID from the (incomplete) Algolia object.
    //    (gameToDuplicate.objectID is the ID from Algolia hits)
    const fullGame = macrogames.find(
      (m) => m.id === (gameToDuplicate as any).objectID,
    );

    // 2. If we can't find it (which should be rare), stop.
    if (!fullGame) {
      notifications.error('Could not find original macrogame to duplicate.');
      return;
    }

    // 3. Now, we duplicate the FULL object, not the Algolia one.
    //    Destructure 'id' (from Firestore) to remove it.
    const { id, name, ...restOfGame } = fullGame;

    // 4. Generate the new unique name
    const existingNames = new Set(macrogames.map((m) => m.name));
    const baseName = `Copy of ${name}`;
    const newName = ensureUniqueName(baseName, existingNames);

    // 5. Create the new game data, using the complete 'restOfGame'
    //    This object WILL have the real 'config', 'flow', 'introScreen' etc.
    const newGameData = {
      ...restOfGame,
      name: newName,
      createdAt: new Date().toISOString(),
      isFavorite: false, // Don't duplicate favorite status
    };

    // 6. Call createMacrogame, which expects the full game data
    //    and returns the newly created game object
    return await createMacrogame(
      newGameData as Omit<Macrogame, 'id' | 'type' | 'status'>,
    );
  };

  const toggleMacrogameFavorite = async (
    macrogameId: string,
    isFavorite: boolean,
  ) => {
    await updateDoc(doc(db, 'macrogames', macrogameId), { isFavorite });
  };

  // --- REFACTOR: Popup Functions -> Delivery Container Functions ---
  const createDeliveryContainer = async (
    newContainer: Omit<DeliveryContainer, 'id'>,
  ): Promise<DeliveryContainer | undefined> => {
    const newId = generateUUID();
    const dataToSave: DeliveryContainer = {
      ...newContainer,
      id: newId,
      // Use the status passed in from the caller (e.g., 'error' from deploy, 'ok' from manual create)
      status: newContainer.status || { code: 'ok', message: '' },
    };
    await setDoc(doc(db, 'deliveryContainers', newId), dataToSave);
    return dataToSave;
  };

  const deleteDeliveryContainer = async (id: string): Promise<boolean> => {
    const wasConfirmed = await confirmAction(
      'Delete this container?',
      async () => {
        try {
          // `onContainerDeleted` server function will handle campaign cleanup
          await deleteDoc(doc(db, 'deliveryContainers', id));
        } catch (error) {
          console.error('Failed to delete container:', error);
        }
      },
    );
    return wasConfirmed;
  };

  const deleteMultipleDeliveryContainers = async (ids: string[]) => {
    if (ids.length === 0) return;
    const wasConfirmed = await confirmAction(
      `Delete ${ids.length} containers?`,
      async () => {
        try {
          const batch = writeBatch(db);
          // `onContainerDeleted` server function will handle campaign cleanup for each
          ids.forEach((id) =>
            batch.delete(doc(db, 'deliveryContainers', id)),
          );
          await batch.commit();
        } catch (error) {
          console.error('Failed to delete containers:', error);
        }
      },
    );
    return wasConfirmed;
  };

  const updateDeliveryContainer = async (
    containerId: string,
    dataToUpdate: Partial<DeliveryContainer>,
  ) => {
    await updateDoc(doc(db, 'deliveryContainers', containerId), dataToUpdate);
  };

  const duplicateDeliveryContainer = async (
    containerToDuplicate: DeliveryContainer,
  ): Promise<DeliveryContainer | undefined> => {
    const { id, name, ...restOfContainer } = containerToDuplicate;
    const existingNames = new Set(deliveryContainers.map((c) => c.name));
    const baseName = `Copy of ${name}`;
    const newName = ensureUniqueName(baseName, existingNames);
    const newContainerData = {
      ...restOfContainer,
      name: newName,
      deliveryMethod: containerToDuplicate.deliveryMethod,
      createdAt: new Date().toISOString(),
      views: 0,
      engagements: 0,
      status: 'Draft' as const, // Reset status
      campaignId: null, // Do not link to old campaign
      isFavorite: false, // Do not duplicate favorite
    };
    // `createDeliveryContainer` will handle status initialization and return the new doc
    return await createDeliveryContainer(
      newContainerData as Omit<DeliveryContainer, 'id' | 'status'>,
    );
  };

  const toggleDeliveryContainerFavorite = async (
    containerId: string,
    isFavorite: boolean,
  ) => {
    await updateDoc(doc(db, 'deliveryContainers', containerId), { isFavorite });
  };

  // --- Microgame Functions ---
  const toggleMicrogameFavorite = async (
    gameId: string,
    isFavorite: boolean,
  ) => {
    await updateDoc(doc(db, 'microgames', gameId), { isFavorite });
  };
  const saveCustomMicrogame = async (
    baseGame: Microgame,
    variantName: string,
    skinFiles: { [key: string]: File },
    existingVariant?: CustomMicrogame,
  ) => {
    const variantId =
      existingVariant?.id || doc(collection(db, 'customMicrogames')).id;
    const skinData: { [key: string]: { url: string; fileName: string } } =
      existingVariant ? { ...existingVariant.skinData } : {};
    for (const key in skinFiles) {
      const file = skinFiles[key];
      if (file) {
        const storageRef = ref(
          storage,
          `microgame-skins/${variantId}/${file.name}`,
        );
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        skinData[key] = { url: downloadURL, fileName: file.name };
      }
    }
    const variantData: Omit<CustomMicrogame, 'id'> = {
      name: variantName,
      baseMicrogameId: baseGame.id,
      baseMicrogameName: baseGame.name,
      createdAt:
        existingVariant?.createdAt || new Date().toISOString(),
      skinData,
    };
    await setDoc(doc(db, 'customMicrogames', variantId), variantData);
    notifications.success(
      `Custom microgame variant ${existingVariant ? 'updated' : 'saved'}`,
    );
  };
  const deleteCustomMicrogame = async (variantId: string): Promise<boolean> => {
    // --- REFACTORED ---
    // The `onCustomMicrogameDeleted` server function now handles DB cleanup.
    // We just need to delete the doc and the storage files.
    const wasConfirmed = await confirmAction(
      'Delete variant? It will be removed from all macrogames.',
      async () => {
        const loadingToast = notifications.loading('Deleting variant...');
        try {
          await deleteDoc(doc(db, 'customMicrogames', variantId));

          // Still need to delete files from storage on the client
          const storageFolderRef = ref(storage, `microgame-skins/${variantId}`);
          const files = await listAll(storageFolderRef);
          await Promise.all(files.items.map((fileRef) => deleteObject(fileRef)));
          notifications.dismiss(loadingToast);
          notifications.success('Variant deleted');
        } catch (error) {
          notifications.dismiss(loadingToast);
          notifications.error('Failed to delete variant.');
          console.error('Error deleting variant:', error);
        }
      },
    );
    return wasConfirmed;
  };

  // --- Conversion Method Functions ---
  const createConversionMethod = async (
    newMethod: Omit<ConversionMethod, 'id' | 'status'>,
  ): Promise<ConversionMethod | undefined> => {
    const newId = generateUUID();
    const dataToSave: ConversionMethod = {
      ...newMethod,
      id: newId,
      status: { code: 'ok', message: '' }, // Initialize status
    };
    await setDoc(doc(db, 'conversionMethods', newId), dataToSave);
    return dataToSave;
  };
  const updateConversionMethod = async (
    methodId: string,
    updatedMethod: Partial<Omit<ConversionMethod, 'id'>>,
  ) => {
    await updateDoc(doc(db, 'conversionMethods', methodId), updatedMethod);
  };
  const deleteConversionMethod = async (methodId: string): Promise<boolean> => {
    // --- REFACTORED ---
    // The `onConversionMethodDeleted` server function now handles this.
    const wasConfirmed = await confirmAction(
      'Delete method? It will be removed from all conversion screens.',
      async () => {
        try {
            await deleteDoc(doc(db, 'conversionMethods', methodId));
        } catch (error) {
            notifications.error('Failed to delete method.');
            console.error("Error deleting conversion method:", error);
        }
      },
    );
    return wasConfirmed;
  };
  const deleteMultipleConversionMethods = async (ids: string[]) => {
    if (ids.length === 0) return;
    // --- REFACTORED ---
    // The `onConversionMethodDeleted` server function now handles this for each.
    const wasConfirmed = await confirmAction(
      `Delete ${ids.length} methods? They will be removed from all screens.`,
      async () => {
        try {
            const batch = writeBatch(db);
            ids.forEach((id) => {
                batch.delete(doc(db, 'conversionMethods', id));
            });
            await batch.commit();
        } catch (error) {
            notifications.error('Failed to delete methods.');
            console.error("Error deleting multiple methods:", error);
        }
      },
    );
    return wasConfirmed;
  };
  const deleteMultipleConversionScreens = async (ids: string[]): Promise<boolean> => {
    if (ids.length === 0) return false;
    const wasConfirmed = await confirmAction(
        `Delete ${ids.length} screens? They will be removed from all macrogames.`,
        async () => {
            try {
                const batch = writeBatch(db);
                ids.forEach((id) => {
                    batch.delete(doc(db, 'conversionScreens', id));
                });
                await batch.commit();
            } catch (error) {
                notifications.error('Failed to delete screens.');
                console.error("Error deleting multiple screens:", error);
            }
        },
    );
    return wasConfirmed;
  };
  const duplicateConversionMethod = async (
    methodToDuplicate: ConversionMethod,
  ): Promise<ConversionMethod | undefined> => {
    const { id, name, ...rest } = methodToDuplicate;
    const existingNames = new Set(allConversionMethods.map((c) => c.name));
    const baseName = `Copy of ${name}`;
    const newName = ensureUniqueName(baseName, existingNames);
    const newData = { ...rest, name: newName, createdAt: new Date().toISOString() };
    // `createConversionMethod` will handle status and return the new doc
    return await createConversionMethod(
      newData as Omit<ConversionMethod, 'id' | 'status'>,
    );
  };

  // --- Conversion Screen Functions ---
  const createConversionScreen = async (
    newScreen: Omit<ConversionScreen, 'id' | 'status'>,
  ): Promise<ConversionScreen | undefined> => {
    const newId = generateUUID();
    // --- NEW: Add denormalized methodIdList ---
    const methodIdList = (newScreen.methods || []).map((m: any) => m.methodId);
    const dataToSave: ConversionScreen = {
      ...newScreen,
      id: newId,
      methodIdList,
      status:
        newScreen.methods.length > 0
          ? { code: 'ok', message: '' }
          : { code: 'error', message: 'This screen has no methods.' },
    };
    // --- End New ---
    await setDoc(doc(db, 'conversionScreens', newId), dataToSave);
    return dataToSave;
  };
  const updateConversionScreen = async (
    screenId: string,
    updatedScreen: Partial<Omit<ConversionScreen, 'id'>>,
  ) => {
    const dataToUpdate = { ...updatedScreen } as any;

    // --- NEW: Add denormalized methodIdList if methods are changing ---
    if (updatedScreen.methods) {
      dataToUpdate.methodIdList = (updatedScreen.methods || []).map(
        (m: any) => m.methodId,
      );
    }
    // --- End New ---

    if (dataToUpdate.methods && dataToUpdate.methods.length > 0) {
      dataToUpdate.status = { code: 'ok', message: '' };
    } else if (dataToUpdate.methods) {
      // e.g., if methods array is set to []
      dataToUpdate.status = {
        code: 'error',
        message: 'This screen has no methods and will not function.',
      };
    }

    await updateDoc(doc(db, 'conversionScreens', screenId), dataToUpdate);
  };
  const deleteConversionScreen = async (screenId: string): Promise<boolean> => {
    // --- REFACTORED ---
    // The `onConversionScreenDeleted` server function now handles this.
    const wasConfirmed = await confirmAction(
      'Delete screen? It will be unlinked from all macrogames.',
      async () => {
        try {
            await deleteDoc(doc(db, 'conversionScreens', screenId));
        } catch (error) {
            notifications.error('Failed to delete screen.');
            console.error("Error deleting conversion screen:", error);
        }
      },
    );
    return wasConfirmed;
  };
  const duplicateConversionScreen = async (
    screenToDuplicate: ConversionScreen,
  ): Promise<ConversionScreen | undefined> => {
    const { id, name, ...rest } = screenToDuplicate;
    const existingNames = new Set(allConversionScreens.map((c) => c.name));
    const baseName = `Copy of ${name}`;
    const newName = ensureUniqueName(baseName, existingNames);
    const newData = { ...rest, name: newName };
    // `createConversionScreen` will handle denormalization
    return await createConversionScreen(
      newData as Omit<ConversionScreen, 'id' | 'status'>,
    );
  };

  const value: DataContextType = {
    user,
    createMacrogame,
    updateMacrogame,
    deleteMacrogame,
    deleteMultipleMacrogames,
    duplicateMacrogame,
    toggleMacrogameFavorite,
    // --- REFACTOR: Pass renamed functions ---
    createDeliveryContainer,
    deleteDeliveryContainer,
    deleteMultipleDeliveryContainers,
    updateDeliveryContainer,
    duplicateDeliveryContainer,
    toggleDeliveryContainerFavorite,
    saveCustomMicrogame,
    toggleMicrogameFavorite,
    deleteCustomMicrogame,
    createConversionMethod,
    updateConversionMethod,
    deleteConversionMethod,
    deleteMultipleConversionMethods,
    duplicateConversionMethod,
    createConversionScreen,
    updateConversionScreen,
    deleteConversionScreen,
    deleteMultipleConversionScreens,
    duplicateConversionScreen,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    deleteMultipleCampaigns,
    duplicateCampaign,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};