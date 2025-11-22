/* src/utils/helpers.ts */

import { useEffect } from 'react';
// --- REFACTOR: Import DeliveryContainer instead of Popup ---
import { Macrogame, Microgame, DeliveryContainer, Alert, CustomMicrogame } from '../types';
import { UI_SKINS } from '../constants';

/**
 * Checks if a given macrogame contains any microgames that are archived or deleted.
 * @param macrogame The macrogame to check.
 * @param allMicrogames The complete list of all base microgames.
 * @returns {boolean} True if the macrogame has issues, otherwise false.
 */
export const hasMacrogameIssues = (macrogame: Macrogame, allMicrogames: Microgame[]): boolean => {
  if (!macrogame || !macrogame.flow) return false;
  
  return macrogame.flow.some(flowItem => {
    const gameData = allMicrogames.find(g => g.id === flowItem.microgameId);
    // An issue exists if the game data isn't found OR if the game is explicitly marked as inactive.
    return !gameData || gameData.isActive === false;
  });
};
/**
 * Generates a standard RFC 4122 version 4 UUID.
 * @returns {string} A new unique identifier.
 */
export const generateUUID = (): string => {
  return crypto.randomUUID();
};
/**
 * --- REFACTOR: Renamed function and updated JSDoc ---
 * Checks a container for configuration issues and returns a structured alert object if any are found.
 * @param container The container to check.
 * @param macrogames The list of all macrogames.
 * @param allMicrogames The list of all microgames.
 * @returns {Alert | null} An Alert object if an issue is found, otherwise null.
 */
// --- REFACTOR: Renamed function and parameters ---
export const getContainerAlert = (container: DeliveryContainer, macrogames: Macrogame[], allMicrogames: Microgame[]): Alert | null => {
  // --- REFACTOR: Use 'container' variable ---
  if (!container.deliveryMethod) {
    return {
      code: 'CONFIG_MISSING_METHOD',
      message: 'Configuration Needed: Select a delivery container type.',
      severity: 'error'
    };
  }
  // --- REFACTOR: Use 'container' variable ---
  if (!container.skinId) {
    return {
      code: 'CONFIG_MISSING_SKIN',
      message: 'Configuration Needed: Select a UI skin.',
      severity: 'error'
    };
  }
  // --- REFACTOR: Use 'container' variable ---
  const macrogame = macrogames.find(m => m.id === container.macrogameId);
  if (!macrogame) {
    return {
      code: 'MACROGAME_DELETED',
      message: 'Needs Attention: The linked macrogame was deleted.',
      severity: 'error'
    };
  }
  if (hasMacrogameIssues(macrogame, allMicrogames)) {
    return {
      code: 'MACROGAME_HAS_ISSUES',
      message: 'Needs Attention: Contains an archived microgame.',
      severity: 'warning'
    };
  }

  return null; // No issues found
};


// A simple rule set for contextual adaptation. This can be expanded significantly.
const adaptationRules: { [key: string]: { [key: string]: { name?: string, description?: string } } } = {
  'catch': {
    'Beauty & Cosmetics': {
      name: 'Beauty Catch!',
      description: 'Catch the falling beauty products to fill your cart!'
    },
    'Gaming & Electronics': {
      name: 'Gadget Catch!',
      description: 'Catch the falling gadgets and avoid the viruses!'
    },
    'Pet Products': {
      name: 'Treat Catch!',
      description: 'Catch the falling treats for your furry friend!'
    },
    'Sporting Goods': {
      name: 'Gear Up!',
      description: 'Catch the essential sports gear for your next game!'
    }
  },
  'clean': {
    'Beauty & Cosmetics': {
      name: 'Skincare Cleanse!',
      description: 'Wipe away the impurities to reveal glowing skin!'
    },
    'Pet Products': {
      name: 'Paw Wash!',
      description: 'Clean the muddy paws before they track dirt in the house!'
    }
  }
};

export const adaptMicrogame = (microgame: Microgame, productCategory: string): Microgame => {
  const rulesForGame = adaptationRules[microgame.id];
  if (rulesForGame && rulesForGame[productCategory]) {
    const adaptations = rulesForGame[productCategory];
    // Return a new object with the original game properties plus the adaptations
    return {
      ...microgame,
      name: adaptations.name || microgame.name,
      skins: { // A placeholder for the description adaptation
        ...microgame.skins,
        [productCategory]: {
          description: adaptations.description || ''
        }
      }
    };
  }
  // If no specific rule applies, return the original game
  return microgame;
};

/**
 * Preloads an array of image URLs.
 * @param {string[]} urls The array of image URLs to preload.
 * @returns {Promise<any[]>} A promise that resolves when all images have been loaded or erroed.
 */
export const preloadImages = (urls: string[]): Promise<any[]> => {
  const promises = urls.map(url => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = resolve;
      img.onerror = resolve; // We resolve on error too, so one bad image doesn't stop the preview.
      img.src = url;
    });
  });
  return Promise.all(promises);
};

/**
 * Creates the configuration object needed to preview a single microgame.
 * @param game The base microgame.
 * @param variant An optional custom variant of the microgame.
 * @returns {object} The configuration object for localStorage.
 */
export const createSingleGamePreviewConfig = (game: Microgame, variant?: CustomMicrogame) => {
    const barebonesSkin = UI_SKINS.find(s => s.id === 'barebones');
    let customSkinData = {};

    if (variant?.skinData) {
        customSkinData = Object.keys(variant.skinData).reduce((acc: any, key: string) => {
            acc[key] = variant.skinData[key].url;
            return acc;
        }, {} as { [key: string]: string });
    }

    const previewMacrogame: Omit<Macrogame, 'id' | 'type' | 'createdAt'> & { flow: any[] } = {
        name: `${game.name} - Preview`,
        category: 'All',
        config: { titleScreenDuration: 1500, controlsScreenDuration: 2500, backgroundMusicUrl: null },
        introScreen: { enabled: false, text: '', duration: 0, clickToContinue: false },
        promoScreen: { enabled: false, text: '', duration: 0, clickToContinue: false },
        flow: [{ ...game, customSkinData }], // The flow is just this one game with its skin
        conversionScreenId: null,
        conversionGoal: '',
        gameplayExperience: 'Generalized'
    };
    
    return { 
        macrogame: previewMacrogame,
        skinId: barebonesSkin?.id || 'barebones',
        isPreviewMode: 'single_game'
    };
};

/**
 * Launches the preview window with a given configuration.
 * @param {object} config The configuration object from createSingleGamePreviewConfig.
 */
export const launchPreview = (config: object) => {
    localStorage.setItem('macrogame_preview_data', JSON.stringify(config));
    window.open('/preview.html', '_blank');
};

/**
 * A hook that adds a CSS class to the body during window resizing and removes it shortly after.
 */
export const useDebouncedResize = () => {
    useEffect(() => {
        let resizeTimer: number;

        const handleResize = () => {
            document.body.classList.add('is-resizing');
            clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(() => {
                document.body.classList.remove('is-resizing');
            }, 150); // The class is removed 150ms after the user stops resizing
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
};

/**
 * --- NEW ---
 * Ensures a new name is unique within a set of existing names.
 * If "My Name" exists, it will try "My Name (1)", then "My Name (2)", etc.
 * @param baseName The desired starting name (e.a., "Copy of X" or "X - Deployed")
 * @param existingNames A Set of all names to check against.
 */
export const ensureUniqueName = (baseName: string, existingNames: Set<string>): string => {
  let finalName = baseName;
  let counter = 1; // Start counter at 1

  // Keep checking until we find a name that is *not* in the set
  while (existingNames.has(finalName)) {
    finalName = `${baseName} (${counter})`;
    counter++;
  }

  return finalName;
};