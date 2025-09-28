// src/wizards/recommendationLogic.ts

import { Microgame } from "../types";

// --- Define Wizard Inputs ---
// These are now the only constants needed for the wizard's UI
export const WIZARD_TEMPOS = ['All', 'Fast', 'Normal', 'Slow'] as const;

export type WizardTempo = typeof WIZARD_TEMPOS[number];

interface GenerateOptions {
    goal: string; // The specific sub-goal e.g., "Increase AOV"
    tempo: WizardTempo;
    maxLength: number | '';
    allMicrogames: Microgame[];
    gameplayExperience: string; // "Generalized" or "Rehearsal"
    numGames: number;
}

export function generateMacrogameFlow({ goal, tempo, maxLength, allMicrogames, gameplayExperience, numGames }: GenerateOptions): Microgame[] {
    // --- 1. INITIAL FILTERING ---
    let candidateGames = allMicrogames.filter(game => game.isActive);

    if (gameplayExperience) {
        candidateGames = candidateGames.filter(game => game.gameplayExperience === gameplayExperience);
    }
    if (goal) {
        candidateGames = candidateGames.filter(game => game.compatibleConversionGoals.includes(goal));
    }
    if (tempo !== 'All') {
        candidateGames = candidateGames.filter(game => game.tempo === tempo);
    }

    // If no games match the basic criteria, exit early.
    if (candidateGames.length === 0) return [];

    // If numGames is not specified, use the old maxLength logic.
    if (!numGames || numGames <= 0) {
        const validMaxLength = Number(maxLength) || 30;
        candidateGames.sort(() => Math.random() - 0.5); // Shuffle for variety
        const generatedFlow: Microgame[] = [];
        let currentLength = 0;
        for (const game of candidateGames) {
            if (currentLength + game.length <= validMaxLength) {
                generatedFlow.push(game);
                currentLength += game.length;
            }
        }
        return generatedFlow;
    }

    // --- 2. CONSTRAINT VALIDATION (for when numGames is specified) ---
    
    // Scenario 1: Not enough unique games available to fulfill the request.
    if (candidateGames.length < numGames) {
        return []; // Impossible request
    }

    const validMaxLength = Number(maxLength) || 999; // Use a high number if no max length is set

    // Scenario 2: The shortest possible combination of games is still too long.
    const shortestCombination = [...candidateGames].sort((a, b) => a.length - b.length).slice(0, numGames);
    const minPossibleDuration = shortestCombination.reduce((sum, game) => sum + game.length, 0);

    if (minPossibleDuration > validMaxLength) {
        return []; // Impossible request
    }

    // --- 3. INTELLIGENT SELECTION LOOP ---
    const MAX_ATTEMPTS = 50; // Try up to 50 times to find a random valid combo
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
        const shuffledCandidates = [...candidateGames].sort(() => Math.random() - 0.5);
        const potentialFlow = shuffledCandidates.slice(0, numGames);
        const totalDuration = potentialFlow.reduce((sum, game) => sum + game.length, 0);

        if (totalDuration <= validMaxLength) {
            return potentialFlow; // Found a valid random combination
        }
    }

    // --- 4. GUARANTEED FALLBACK ---
    // If random attempts failed, return the shortest possible valid combination.
    return shortestCombination;
}