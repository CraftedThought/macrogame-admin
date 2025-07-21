// --- TYPE DEFINITIONS ---

// Defines the expected structure for a microgame's result
export interface MicrogameResult {
    win: boolean;
}

// A base class for all microgames to ensure they have a consistent structure
export abstract class BaseMicrogame {
    protected gameArea: HTMLElement;
    protected onEnd: (result: MicrogameResult) => void;
    protected skinConfig: any; // Can be typed more strictly later

    constructor(gameArea: HTMLElement, onEnd: (result: MicrogameResult) => void, skinConfig: any) {
        this.gameArea = gameArea;
        this.onEnd = onEnd;
        this.skinConfig = skinConfig;
    }

    abstract start(): void;
    abstract cleanup(): void;
}
