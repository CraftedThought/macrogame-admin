// A file to hold all of our custom types

// UPDATED: The Microgame interface is now more detailed to support modular skins.
export interface Microgame {
    id: string; // e.g., 'clean'
    name: string; // e.g., 'Clean!'
    baseType: string; // The core mechanic, e.g., 'Click and Drag'
    controls: string;
    length: number; // in seconds
    skins: {
        [category: string]: { // e.g., 'Gaming & Electronics'
            description: string;
            visuals: string; // Placeholder for visual assets
            sfx: string; // Placeholder for sound effects
        }
    }
}

export interface Macrogame {
    id:string;
    name: string;
    category: string; // This is now just a tag, e.g., 'Gaming & Electronics'
    type: string;
    createdAt: string;
    config: {
        introScreenText: string;
        introScreenDuration: number; // in ms
        titleScreenDuration: number; // in ms
        controlsScreenDuration: number; // in ms
        backgroundMusicUrl: string | null;
    };
    flow: { microgameId: string; order: number }[];
    rewards: { rewardId: string; name: string; pointsCost: number }[];
}

export interface Reward {
    id: string;
    name: string;
    type: 'percentage_discount' | 'fixed_discount' | 'free_shipping' | 'free_gift' | 'loyalty_points';
    value: string;
    codeType: 'single' | 'unique';
    createdAt: string;
    redemptions: number;
    conversionRate: number;
}

export interface Popup {
    id: string;
    name:string;
    macrogameId: string;
    macrogameName: string;
    status: 'Draft' | 'Active';
    views: number;
    engagements: number;
    createdAt: string;
    skinId?: string; // Optional: The ID of the UI skin to apply
}

export interface UISkin {
    id: string;
    name: string;
    category: 'Gaming' | 'General';
    type: 'Retro' | 'Modern' | 'All';
    imageUrl: string;
    fontFamily: string;
    fontUrl?: string;
    gameArea: {
        top: number;
        left: number;
        width: number;
        height: number;
    };
}
