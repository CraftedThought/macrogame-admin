// src/constants.ts

import { UISkin } from './types';

export const USER_SELECTABLE_CATEGORIES: string[] = ['Cannabis', 'Gaming & Electronics', 'Pet Products'];

// NEW: Constant for the "Tempo / Feel" filter dropdown in the creator form.
// Sourced from the 'tempo' metadata field on each microgame.
export const TEMPO_OPTIONS = ['All', 'Fast', 'Normal', 'Slow'];

// NEW: Constant for the "Length" filter dropdown in the creator form.
export const LENGTH_OPTIONS = ['All', 'Short', 'Medium', 'Long'];

// NEW: Defines the logic for what each length category means in seconds.
// This allows for easy adjustment of these ranges in the future.
export const LENGTH_DEFINITIONS: { [key: string]: (len: number) => boolean } = {
    'Short': (len: number) => len <= 5,
    'Medium': (len: number) => len > 5 && len < 8,
    'Long': (len: number) => len >= 8,
};

export const SKINNABLE_ELEMENTS: { [key: string]: { id: string, name: string }[] } = {
    'avoid': [
        { id: 'player', name: 'Player Object' },
        { id: 'obstacle', name: 'Obstacle' },
        { id: 'background', name: 'Background Image' },
    ],
    'catch': [
        { id: 'player', name: 'Catcher Object' },
        { id: 'goodItem', name: 'Good Item' },
        { id: 'badItem', name: 'Bad Item' },
        { id: 'background', name: 'Background Image' },
    ]
};

export const MUSIC_OPTIONS: {[key: string]: string | null} = {
    'None': null, 'Default': '/sounds/background.wav', 'Success': '/sounds/success.wav',
    'Caught Ball': '/sounds/caughtball.wav', 'Lose': '/sounds/lose.wav',
};

export const UI_SKINS: UISkin[] = [
    { id: 'classic-handheld', name: 'Classic Handheld', fontFamily: "'Press Start 2P'", fontUrl: '/fonts/PressStart2P-Regular.ttf' },
    { id: 'modern-handheld', name: 'Modern Handheld', fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif" },
    { id: 'tablet', name: 'Tablet', fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif" },
    { id: 'barebones', name: 'Barebones (for preview)', fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif" }
];

export const SKIN_COLOR_SCHEMES: { [key: string]: { [key: string]: string } } = {
    'classic-handheld': { 'light-gray': 'Light Gray', 'purple': 'Purple' },
    'modern-handheld': { 'black': 'Black', 'red': 'Red' },
    'tablet': { 'white': 'White', 'black': 'Black' },
};

export const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];