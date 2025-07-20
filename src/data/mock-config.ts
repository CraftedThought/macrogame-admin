import { Microgame, Reward } from '../types';

// --- TYPE DEFINITION for the main config object ---
export interface PreviewConfig {
  popup: {
    popupId: string;
    name: string;
    trigger: string;
    conversionGoal: string;
  };
  macrogame: {
    macrogameId: string;
    name: string;
    config: {
      introScreenText: string;
      introScreenDuration: number;
      titleScreenDuration: number;
      controlsScreenDuration: number;
      backgroundMusicUrl: string | null;
    };
    flow: (Microgame | undefined)[]; // Array can contain undefined if find fails
    rewards: {
      rewardId: string;
      pointsCost: number;
    }[];
  };
  rewards: Reward[];
}


// --- MOCK DATA LIBRARIES ---

// A library of all microgames available to the admin
const MOCK_MICROGAMES: Omit<Microgame, 'category' | 'type'>[] = [
  { id: 'avoid_v1', name: 'Avoid', description: 'Dodge the bouncing shapes for 5 seconds.', controls: 'WASD/ARROWS TO MOVE', length: 5, gameFile: 'avoid.js' },
  { id: 'collect_v1', name: 'Collect', description: 'Collect the good items, avoid the bad.', controls: 'LEFT/RIGHT ARROWS', length: 7, gameFile: 'collect.js' },
  { id: 'clean_v1', name: 'Clean', description: 'Clean all the dirt off the object.', controls: 'CLICK TO CLEAN', length: 5, gameFile: 'clean.js' },
];

// A library of all rewards an admin has created
const MOCK_REWARDS_LIBRARY: Reward[] = [
    { id: 'rew_10_percent', name: '10% Off Entire Order', type: 'percentage_discount', value: '10', codeType: 'single', createdAt: new Date().toISOString(), redemptions: 0, conversionRate: 0 },
    { id: 'rew_free_ship', name: 'Free Shipping', type: 'free_shipping', value: '', codeType: 'single', createdAt: new Date().toISOString(), redemptions: 0, conversionRate: 0 },
    { id: 'rew_bogo', name: 'Buy One Get One Free', type: 'bogo', value: '', codeType: 'single', createdAt: new Date().toISOString(), redemptions: 0, conversionRate: 0 },
];


// --- MAIN MOCK CONFIGURATION OBJECT ---

// This object is now strongly typed with the PreviewConfig interface.
export const mockPreviewConfig: PreviewConfig = {
  // Data from the 'popups' collection
  popup: {
    popupId: "pop_123xyz",
    name: "Summer Sale Gaming Popup",
    trigger: "on_exit_intent",
    conversionGoal: "reward_redemption",
  },
  // Data from the 'macrogames' collection, with linked data expanded
  macrogame: {
    macrogameId: "mg_abc123",
    name: "Default Catch & Avoid Game",
    // Configuration settings for the macrogame experience
    config: {
      introScreenText: 'Get Ready To Play!',
      introScreenDuration: 2500,
      titleScreenDuration: 2000,
      controlsScreenDuration: 2000,
      backgroundMusicUrl: "/sounds/background.wav",
    },
    // The sequence of microgames.
    flow: [
      MOCK_MICROGAMES.find(g => g.id === 'collect_v1'),
      MOCK_MICROGAMES.find(g => g.id === 'avoid_v1'),
      MOCK_MICROGAMES.find(g => g.id === 'clean_v1'),
    ],
    // The rewards available for this specific macrogame and their point costs
    rewards: [
      { rewardId: "rew_10_percent", pointsCost: 100 },
      { rewardId: "rew_bogo", pointsCost: 200 },
    ]
  },
  // A complete list of all rewards for the end screen to look up details.
  rewards: MOCK_REWARDS_LIBRARY,
};
