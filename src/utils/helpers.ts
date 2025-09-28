// src/utils/helpers.ts

import { Macrogame, Microgame } from '../types';

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