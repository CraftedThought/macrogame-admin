// A file to hold all of our custom types

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
    skinId?: string;
}

// UPDATED: Added exitButton details to the UISkin definition.
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
    exitButton: {
        top: number; // pixels from container top
        right: number; // pixels from container right
        width: number;
        height: number;
    };
}
