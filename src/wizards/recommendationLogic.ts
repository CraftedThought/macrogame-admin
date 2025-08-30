// src/wizards/recommendationLogic.ts

import { Microgame } from "../types";

// --- Define Wizard Inputs ---
export const WIZARD_CONVERSION_GOALS = [
    'All',
    'Promote a Single Featured Product',
    'Promote Multiple Featured Products',
    'Promote a Product Line',
    'Push Limited-Time Offer',
    'Engage to Convert',
] as const;

export const WIZARD_CUSTOMER_TYPES = [
    'All',
    'Impulse Shopper',
    'Bargain Hunter',
    'Informed Shopper',
    'Window Shopper',
    'Indecisive Shopper',
] as const;

export const WIZARD_TEMPOS = ['All', 'Fast', 'Normal', 'Slow'] as const;

export type WizardConversionGoal = typeof WIZARD_CONVERSION_GOALS[number];
export type WizardCustomerType = typeof WIZARD_CUSTOMER_TYPES[number];
export type WizardTempo = typeof WIZARD_TEMPOS[number];

interface RecommendationData {
    id: string;
    compatibleGoals: WizardConversionGoal[];
    compatibleCustomerTypes: WizardCustomerType[];
}

// --- Data mapping microgame IDs to wizard criteria ---
export const recommendationData: RecommendationData[] = [
    { id: 'avoid', compatibleGoals: ['Promote a Single Featured Product', 'Promote Multiple Featured Products', 'Push Limited-Time Offer', 'Engage to Convert'], compatibleCustomerTypes: ['Impulse Shopper', 'Window Shopper', 'Indecisive Shopper'] },
    { id: 'build', compatibleGoals: ['Promote a Single Featured Product', 'Push Limited-Time Offer', 'Engage to Convert'], compatibleCustomerTypes: ['Bargain Hunter', 'Informed Shopper', 'Window Shopper', 'Indecisive Shopper'] },
    { id: 'catch', compatibleGoals: ['Promote a Single Featured Product', 'Promote Multiple Featured Products', 'Promote a Product Line', 'Engage to Convert'], compatibleCustomerTypes: ['Impulse Shopper', 'Indecisive Shopper'] },
    { id: 'claw', compatibleGoals: ['Promote a Single Featured Product', 'Promote Multiple Featured Products', 'Promote a Product Line', 'Engage to Convert'], compatibleCustomerTypes: ['Window Shopper', 'Indecisive Shopper'] },
    { id: 'clean', compatibleGoals: ['Promote a Single Featured Product', 'Promote Multiple Featured Products', 'Promote a Product Line', 'Engage to Convert'], compatibleCustomerTypes: ['Bargain Hunter', 'Informed Shopper', 'Window Shopper', 'Indecisive Shopper'] },
    { id: 'collect', compatibleGoals: ['Promote a Single Featured Product', 'Promote Multiple Featured Products', 'Promote a Product Line', 'Push Limited-Time Offer', 'Engage to Convert'], compatibleCustomerTypes: ['Impulse Shopper', 'Bargain Hunter', 'Informed Shopper', 'Indecisive Shopper'] },
    { id: 'consume', compatibleGoals: ['Promote a Single Featured Product', 'Promote Multiple Featured Products', 'Promote a Product Line', 'Engage to Convert'], compatibleCustomerTypes: ['Impulse Shopper', 'Bargain Hunter', 'Informed Shopper', 'Indecisive Shopper'] },
    { id: 'drop', compatibleGoals: ['Promote a Single Featured Product', 'Push Limited-Time Offer', 'Engage to Convert'], compatibleCustomerTypes: ['Impulse Shopper', 'Window Shopper', 'Indecisive Shopper'] },
    { id: 'escape', compatibleGoals: ['Push Limited-Time Offer', 'Engage to Convert'], compatibleCustomerTypes: ['Impulse Shopper', 'Indecisive Shopper'] },
    { id: 'frame', compatibleGoals: ['Promote a Single Featured Product', 'Promote Multiple Featured Products', 'Promote a Product Line', 'Engage to Convert'], compatibleCustomerTypes: ['Window Shopper', 'Indecisive Shopper'] },
    { id: 'grab', compatibleGoals: ['Promote a Single Featured Product', 'Promote Multiple Featured Products', 'Promote a Product Line', 'Engage to Convert'], compatibleCustomerTypes: ['Impulse Shopper', 'Window Shopper', 'Indecisive Shopper'] },
    { id: 'grow', compatibleGoals: ['Promote a Single Featured Product', 'Promote Multiple Featured Products', 'Promote a Product Line'], compatibleCustomerTypes: ['Bargain Hunter', 'Informed Shopper', 'Window Shopper'] },
    { id: 'like', compatibleGoals: ['Promote a Single Featured Product', 'Promote Multiple Featured Products', 'Promote a Product Line', 'Push Limited-Time Offer', 'Engage to Convert'], compatibleCustomerTypes: ['Impulse Shopper', 'Window Shopper', 'Indecisive Shopper'] },
    { id: 'lineup', compatibleGoals: ['Promote Multiple Featured Products', 'Promote a Product Line'], compatibleCustomerTypes: ['Bargain Hunter', 'Informed Shopper', 'Window Shopper'] },
    { id: 'match', compatibleGoals: ['Promote Multiple Featured Products', 'Promote a Product Line'], compatibleCustomerTypes: ['Bargain Hunter', 'Informed Shopper', 'Window Shopper'] },
    { id: 'matchup', compatibleGoals: ['Promote Multiple Featured Products', 'Promote a Product Line'], compatibleCustomerTypes: ['Bargain Hunter', 'Informed Shopper', 'Window Shopper'] },
    { id: 'organize', compatibleGoals: ['Promote a Single Featured Product', 'Promote Multiple Featured Products', 'Promote a Product Line', 'Push Limited-Time Offer'], compatibleCustomerTypes: ['Bargain Hunter', 'Informed Shopper', 'Window Shopper'] },
    { id: 'package', compatibleGoals: ['Promote a Single Featured Product', 'Promote Multiple Featured Products', 'Promote a Product Line', 'Push Limited-Time Offer'], compatibleCustomerTypes: ['Bargain Hunter', 'Informed Shopper', 'Window Shopper'] },
    { id: 'pop', compatibleGoals: ['Promote a Single Featured Product', 'Promote Multiple Featured Products', 'Promote a Product Line', 'Engage to Convert'], compatibleCustomerTypes: ['Impulse Shopper', 'Indecisive Shopper'] },
    { id: 'spot', compatibleGoals: ['Promote a Single Featured Product', 'Promote Multiple Featured Products', 'Promote a Product Line'], compatibleCustomerTypes: ['Bargain Hunter', 'Informed Shopper', 'Window Shopper'] },
    { id: 'trade', compatibleGoals: ['Promote a Single Featured Product', 'Engage to Convert'], compatibleCustomerTypes: ['Bargain Hunter', 'Informed Shopper', 'Indecisive Shopper'] },
    { id: 'vote', compatibleGoals: ['Promote a Single Featured Product', 'Promote a Product Line', 'Push Limited-Time Offer', 'Engage to Convert'], compatibleCustomerTypes: ['Impulse Shopper', 'Indecisive Shopper'] },
];

interface GenerateOptions {
    goal: WizardConversionGoal;
    customerType: WizardCustomerType;
    tempo: WizardTempo;
    maxLength: number | ''; // Allow empty string
    allMicrogames: Microgame[];
}

export function generateMacrogameFlow({ goal, customerType, tempo, maxLength, allMicrogames }: GenerateOptions): Microgame[] {
    const validMaxLength = Number(maxLength) || 30; // Default to 30s if empty or invalid

    let candidateGames = allMicrogames;

    // Filter by Goal if a specific goal is selected
    if (goal !== 'All') {
        const matchingGameIds = recommendationData
            .filter(data => data.compatibleGoals.includes(goal))
            .map(data => data.id);
        candidateGames = candidateGames.filter(game => matchingGameIds.includes(game.id));
    }

    // Filter by Customer Type if a specific type is selected
    if (customerType !== 'All') {
        const matchingGameIds = recommendationData
            .filter(data => data.compatibleCustomerTypes.includes(customerType))
            .map(data => data.id);
        candidateGames = candidateGames.filter(game => matchingGameIds.includes(game.id));
    }
    
    // Filter by Tempo if a specific tempo is selected
    if (tempo !== 'All') {
        candidateGames = candidateGames.filter(game => game.tempo === tempo);
    }
    
    if (candidateGames.length === 0) return [];
    
    candidateGames.sort(() => Math.random() - 0.5);
    const generatedFlow: Microgame[] = [];
    let currentLength = 0;

    for (const game of candidateGames) {
        if (currentLength + game.length <= validMaxLength) {
            generatedFlow.push(game);
            currentLength += game.length;
        }
    }
    
    if (generatedFlow.length === 0 && candidateGames.length > 0) {
        candidateGames.sort((a, b) => a.length - b.length);
        if (candidateGames[0].length <= validMaxLength) {
            return [candidateGames[0]];
        }
    }

    return generatedFlow;
}
