// src/types/index.ts

export interface Microgame {
  id: string;
  name: string;
  category: string;
  type: string;
  description: string;
  controls: string;
  length: number;
  gameFile: string;
}

export interface Macrogame {
  id: string;
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
  flow: {
    microgameId: string;
    order: number;
  }[];
  rewards: {
    rewardId: string;
    name: string;
    pointsCost: number;
  }[];
}

export interface Reward {
    id: string;
    name: string;
    type: string;
    value: string;
    codeType: 'single' | 'unique';
    createdAt: string;
    redemptions: number;
    conversionRate: number;
}

export interface Popup {
    id: string;
    name: string;
    macrogameId: string;
    macrogameName: string;
    status: 'Draft' | 'Active';
    views: number;
    engagements: number;
    createdAt: string;
}