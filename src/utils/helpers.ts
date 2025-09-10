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