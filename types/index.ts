// src/types/index.ts

export type EntityStatus = {
  code: 'ok' | 'warning' | 'error';
  message: string;
}

export interface Alert {
  code: 'CONFIG_MISSING_SKIN' | 'MACROGAME_DELETED' | 'MACROGAME_HAS_ISSUES';
  message: string;
  severity: 'warning' | 'error';
}

// Represents a UI skin that can be applied to a popup.
export interface UISkin {
  id: string;
  name: string;
  fontFamily: string;
  fontUrl?: string;
}

// --- NEW: Configuration object for the ConfigurablePopupSkin ---
// (This will be stored on the DeliveryContainer document)

// Defines a single block of text content
export interface SkinContentBlock {
  id: string; // For React key
  position: 'above' | 'below';
  header?: string;
  subheader?: string;
  body?: string;
  alignment?: 'left' | 'center' | 'right';
}

// Defines the entire V1 configuration for the new skin
export interface SkinConfig {
  showMuteButton?: boolean;
  showExitButton?: boolean;
  header?: {
    title?: string;
    textColor?: string;
  };
  contentBlocks?: SkinContentBlock[];
  styling?: {
    backgroundColor?: string;
    headerBackground?: string;
    contentBackground?: string;
    popupWidth?: 'small' | 'medium' | 'large';
    borderRadius?: number;
    boxShadowStrength?: number; // 0-100 percentage
  };
}
// --- END NEW ---

// A reusable config for screens like Intro and Promo.
export interface ScreenConfig {
  enabled: boolean;
  text: string;
  duration: number; // in seconds
  clickToContinue: boolean;
  backgroundImageUrl?: string;
  spotlightImageUrl?: string;
  spotlightImageLayout?: 'left' | 'right' | 'top' | 'bottom';
}

// Configuration options for a single Macrogame.
export interface MacrogameConfig {
  titleScreenDuration: number;
  controlsScreenDuration: number;
  backgroundMusicUrl: string | null;
  screenFlowType?: 'Separate' | 'Combined' | 'Skip' | 'Overlay';
}

// Represents a single microgame within the flow of a macrogame.
export interface MacrogameFlowItem {
  microgameId: string;
  variantId: string | null;
  order: number;
  pointRules?: { [eventId: string]: number }; // Admin-defined points for each event
}

// The main data structure for a Macrogame experience.
export interface Macrogame {
  id: string;
  name: string;
  conversionGoal?: string;
  gameplayExperience?: 'Rehearsal' | 'Generalized';
  category: string;
  subcategory?: string;
  createdAt: string;
  config: MacrogameConfig;
  introScreen: ScreenConfig;
  promoScreen: ScreenConfig;
  flow: MacrogameFlowItem[];
  conversionScreenId: string | null; // ID of the linked Conversion Screen
  audioConfig?: { [key: string]: { playMusic: boolean; musicId?: string | null } };
  type: 'default' | 'wizard';
  isFavorite?: boolean;
  pointCosts?: { [methodInstanceId: string]: number }; // "Price list" for point-gated rewards
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
  gameplayExperience: 'Rehearsal' | 'Generalized';
  mechanicType?: 'skill' | 'chance';
  compatibleConversionGoals: string[];
  compatibleProductCategories: string[];
  compatibleCustomerTypes: string[];
  trackableEvents: { eventId: string, label: string, defaultPoints: number }[];
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

// Defines the schedule for when a popup or campaign can appear.
export interface Schedule {
  days: { [key: string]: boolean };
  startTime: string; // "09:00"
  endTime: string;   // "17:00"
  timezone: string;
}

// The data structure for a delivery container.
export interface DeliveryContainer {
    id: string;
    name: string;
    macrogameId: string;
    macrogameName: string;
    createdAt: string;

    // --- NEW ARCHITECTURE FIELDS ---
    // "deliveryMethod" maps to "Container Type" in the UI.
    // Defines the "type" of container
    deliveryMethod?: 'popup_modal' | 'on_page_section' | 'new_webpage'; 
    
    // Defines the "state" of the container
    // 'unconfigured': Newly deployed, needs setup
    // 'ok': Configured and healthy
    // 'error': Configured but broken (e.g., bad link)
    status: EntityStatus & { code: 'unconfigured' | 'ok' | 'error' };

    // --- POPUP-SPECIFIC FIELDS (optional) ---
    skinId?: string; // This will ID which skin to use (e.g., 'configurable-popup')
    skinConfig?: SkinConfig; // This will hold the new dynamic configuration
    
    // --- (FUTURE) SECTION-SPECIFIC FIELDS ---
    // elementSelector?: string; 

    // --- CAMPAIGN & ANALYTICS ---
    campaignId?: string | null;
    views: number;
    engagements: number;
    isFavorite?: boolean;
}

export interface DisplayRule {
  id: string; // A unique identifier for the rule (e.g., a UUID)
  name: string; // e.g., "Weekday Mornings for New Visitors"
  trigger: 'exit_intent' | 'timed' | 'scroll';
  audience: 'all_visitors' | 'new_visitors' | 'returning_visitors';
  schedule: Schedule;
  containers: { containerId: string, weight: number }[];
}

export interface Campaign {
  id: string;
  name: string;
  status: 'Draft' | 'Active' | 'Paused';
  createdAt: string;
  goal: string;
  displayRules: DisplayRule[];
  startDate?: string | null;
  endDate?: string | null;
  // --- NEW: For Algolia indexing ---
  containerIdList?: string[];
}

// --- Conversion Method Interfaces ---

// Base properties shared by all conversion types
interface ConversionMethodBase {
  id: string;
  name: string; // Internal name for management
  headline: string;
  subheadline: string;
  createdAt: string;
}

export interface EmailCaptureMethod extends ConversionMethodBase {
  type: 'email_capture';
  submitButtonText: string;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number';
  required: boolean;
}

export interface FormSubmitMethod extends ConversionMethodBase {
  type: 'form_submit';
  fields: FormField[];
  submitButtonText: string;
}

export interface LinkRedirectMethod extends ConversionMethodBase {
  type: 'link_redirect';
  buttonText: string;
  url: string;
  utmEnabled?: boolean;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface CouponDisplayMethod extends ConversionMethodBase {
  type: 'coupon_display';
  codeType: 'static' | 'dynamic';
  staticCode: string;
  dynamicCodeListId?: string; // ID linking to a list of unique codes
  discountType: 'percentage' | 'fixed_amount';
  discountValue: number;
  clickToReveal?: boolean;
}

export interface SocialFollowMethod extends ConversionMethodBase {
    type: 'social_follow';
    links: {
        platform: 'facebook' | 'instagram' | 'tiktok' | 'x' | 'youtube' | 'pinterest';
        url: string;
    }[];
}

// A union type to represent any possible conversion method
export type ConversionMethod = EmailCaptureMethod | FormSubmitMethod | LinkRedirectMethod | CouponDisplayMethod | SocialFollowMethod;

// Represents the final screen in a macrogame, which hosts conversion methods.
export interface ConversionScreen {
  id: string;
  name: string; // Internal name for management
  status?: EntityStatus;

  // Content & Styling
  headline: string;
  bodyText: string;
  backgroundImageUrl?: string;
  backgroundColor?: string;
  textColor?: string;
  layout: 'single_column'; // Preparing for future layouts like 'two_column'

  // Hosted Methods with Gating Logic
  methods: {
    instanceId: string; // Unique ID for this specific instance on the screen
    methodId: string;   // ID of the ConversionMethod being used
    gate?: {
        type: 'on_success' | 'on_points';
        // 'on_success' uses methodInstanceId. 'on_points' cost is set in the Macrogame.
        methodInstanceId?: string; 
    }
  }[];
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
  isOverlayVisible?: boolean;
  onInteraction?: () => void;
  onReportEvent?: (eventName: string) => void;
}

// Represents the currently active page in the main App component.
export interface CurrentPage {
  page: 'creator' | 'manager' | 'delivery' | 'microgames' | 'conversions' | 'campaigns';
}