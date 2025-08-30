// src/types/index.ts

// Represents a UI skin that can be applied to a popup.
export interface UISkin {
  id: string;
  name: string;
  fontFamily: string;
  fontUrl?: string; // Optional URL for custom fonts
}

// A reusable config for screens like Intro and Promo.
export interface ScreenConfig {
  enabled: boolean;
  text: string;
  duration: number; // Duration in seconds
  backgroundImageUrl?: string;
  clickToContinue: boolean;
}

// Configuration options for a single Macrogame.
export interface MacrogameConfig {
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
  introScreen: ScreenConfig;
  promoScreen: ScreenConfig;
  flow: MacrogameFlowItem[];
  rewards: { rewardId: string; name: string; pointsCost: number }[];
  type: 'default' | 'wizard';
  isFavorite?: boolean;
}

// Base properties for all microgames, stored in the database.
export interface Microgame {
  isActive?: boolean;
  id: string;
  name:string;
  baseType: string;
  controls: string;
  length: number; // in seconds
  tempo: 'Fast' | 'Normal' | 'Slow';
  skins: {
      [category: string]: {
          description: string;
      }
  };
  isFavorite?: boolean;
}

// A user-created variant of a base microgame.
export interface CustomMicrogame {
    id: string;
    name: string;
    baseMicrogameId: string;
    baseMicrogameName: string;
    createdAt: string;
    skinData: { [key: string]: { url: string; fileName: string } };
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
  status: 'Draft' | 'Active' | 'Paused';
  views: number;
  engagements: number;
  createdAt: string;
  skinId?: string;
  title?: string;
  subtitle?: string;
  colorScheme?: string;
  trigger?: 'exit_intent' | 'timed' | 'scroll';
  audience?: 'all_visitors' | 'new_visitors' | 'returning_visitors';
  schedule?: PopupSchedule;
  isFavorite?: boolean; // This is the intended addition
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
  appliesTo?: 'entire_order' | 'specific_products' | 'specific_collections';
  minimumPurchaseAmount?: number;
  limitToOneUsePerCustomer?: boolean;
  startDate?: string;
  endDate?: string;
}

// The result of a single microgame play.
export interface MicrogameResult {
  win: boolean;
}

// Props passed to every microgame component.
export interface MicrogameProps {
  onEnd: (result: MicrogameResult) => void;
  skinConfig: { [key: string]: string };
  gameData: Microgame;
}

// Represents the currently active page in the main App component.
export interface CurrentPage {
  page: 'creator' | 'manager' | 'popups' | 'microgames' | 'rewards';
}