// A file to hold all of our custom types

export interface MicrogameResult {
    win: boolean;
}

export interface MicrogameProps {
    onEnd: (result: MicrogameResult) => void;
    skinConfig: any;
}

export interface Microgame {
    id: string;
    name: string;
    baseType: string;
    controls: string;
    length: number; // in seconds
    skins: {
        [category: string]: {
            description: string;
            visuals: string;
            sfx: string;
        }
    }
}

export interface Macrogame {
    id:string;
    name: string;
    category: string;
    type: string;
    createdAt: string;
    config: {
        introScreenText: string;
        introScreenDuration: number;
        titleScreenDuration: number;
        controlsScreenDuration: number;
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
    skinId?: string;
}

// Updated: Simplified UISkin without category or type
export interface UISkin {
    id: string;
    name: string;
    fontFamily: string;
    fontUrl?: string;
}