// src/types/index.ts

// Represents a UI skin that can be applied to a popup.
export interface UISkin {
  id: string;
  name: string;
  fontFamily: string;
  fontUrl?: string; // Optional URL for custom fonts
}

// Configuration for a custom promotional screen shown after the games.
export interface PromoScreenConfig {
  enabled: boolean;
  backgroundImageUrl?: string;
  text?: string;
  duration?: number;      // Duration in seconds for the screen to show
  clickToContinue?: boolean; // If true, user must click to advance
}

// Configuration options for a single Macrogame.
export interface MacrogameConfig {
  showIntroScreen: boolean; // NEW: Toggle for the intro screen's visibility.
  introScreenText: string;
  introScreenDuration: number;
  titleScreenDuration: number;
  controlsScreenDuration: number;
  backgroundMusicUrl: string | null;
}

// Represents a single microgame within the flow of a macrogame.
export interface MacrogameFlowItem {
  microgameId: string;
  variantId: string | null; // ID of a custom microgame variant, if used
  order: number;
}

// The main data structure for a Macrogame experience.
export interface Macrogame {
  id: string;
  name: string;
  category: string;
  createdAt: string;
  config: MacrogameConfig;
  flow: MacrogameFlowItem[];
  rewards: { rewardId: string; name: string; pointsCost: number }[];
  promoScreen?: PromoScreenConfig; // NEW: Holds config for the new promo screen.
  type: 'default' | 'wizard';
}

// Base properties for all microgames, stored in the database.
export interface Microgame {
  id: string;
  name:string;
  baseType: string;
  controls: string;
  length: number; // in seconds
  tempo: 'Fast' | 'Normal' | 'Slow';
  skins: {
      [category: string]: {
          description: string;
          // skin elements will be defined here, e.g., player_svg: 'url'
      }
  };
}

// A user-created variant of a base microgame.
export interface CustomMicrogame {
    id: string;
    name: string;
    baseMicrogameId: string;
    createdAt: string;
    skinData: { [key: string]: string }; // URLs to custom assets
}

// Defines the schedule for when a popup can appear.
export interface PopupSchedule {
  days: { [key: string]: boolean }; // e.g., { monday: true, ... }
  startTime: string; // e.g., "09:00"
  endTime: string;   // e.g., "17:00"
  timezone: string;
}

// The data structure for a deployable Popup.
export interface Popup {
  id: string;
  name: string;
  macrogameId: string;
  macrogameName: string;
  status: 'Draft' | 'Active';
  views: number;
  engagements: number;
  createdAt: string;
  // NEW/OPTIONAL fields for popup configuration
  skinId?: string;
  title?: string;
  subtitle?: string;
  colorScheme?: string;
  trigger?: 'exit_intent' | 'timed' | 'scroll';
  audience?: 'all_visitors' | 'new_visitors' | 'returning_visitors';
  schedule?: PopupSchedule;
}

// Data for a single reward that can be earned.
export interface Reward {
  id: string;
  name: string;
  type: 'percentage_discount' | 'fixed_discount' | 'free_shipping';
  value: string;
  codeType: 'single' | 'unique';
  createdAt: string;
  redemptions: number;
  conversionRate: number;
}

// The result of a single microgame play.
export interface MicrogameResult {
  win: boolean;
  // score?: number; // Optional score, if applicable
}

// Props passed to every microgame component.
export interface MicrogameProps {
  onEnd: (result: MicrogameResult) => void;
  skinConfig: { [key: string]: string }; // URLs to assets for the current skin
  gameData: Microgame; // The microgame's own metadata
}

// Represents the currently active page in the main App component.
export interface CurrentPage {
  page: 'creator' | 'manager' | 'popups' | 'microgames' | 'rewards';
  // params?: { [key: string]: any }; // For future use, e.g., editing a specific ID
}