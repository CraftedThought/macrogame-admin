// This file represents a mock configuration object fetched from a database.
// It follows the structure outlined in the Core Data Models blueprint and
// provides a complete data set for the PreviewPlayer component.

// A library of all microgames available to the admin
const MOCK_MICROGAMES = [
  { id: 'avoid_v1', name: 'Avoid', description: 'Dodge the bouncing shapes for 5 seconds.', controls: 'WASD/ARROWS TO MOVE', gameFile: 'avoid.js' },
  { id: 'collect_v1', name: 'Collect', description: 'Collect the good items, avoid the bad.', controls: 'LEFT/RIGHT ARROWS', gameFile: 'collect.js' },
  { id: 'clean_v1', name: 'Clean', description: 'Clean all the dirt off the object.', controls: 'CLICK TO CLEAN', gameFile: 'clean.js' },
];

// A library of all rewards an admin has created
const MOCK_REWARDS_LIBRARY = [
    { id: 'rew_10_percent', name: '10% Off Entire Order', type: 'percentage_discount', value: 10, redemptionCode: 'SAVE10' },
    { id: 'rew_free_ship', name: 'Free Shipping', type: 'free_shipping', value: null, redemptionCode: 'FREESHIP' },
    { id: 'rew_bogo', name: 'Buy One Get One Free', type: 'bogo', value: null, redemptionCode: 'BOGOFAST' },
];

// The main configuration object for a specific popup
export const mockPreviewConfig = {
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
    // The sequence of microgames. Note that the full microgame object is included,
    // as this is what the MacroGame class expects after a data lookup.
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
  // A complete list of all rewards, used by the end screen to look up reward details.
  // In a real app, this might be a separate fetch or included in the initial data load.
  rewards: MOCK_REWARDS_LIBRARY,
};