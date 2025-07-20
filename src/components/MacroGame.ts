import { PreviewConfig } from '../data/mock-config';
import { Microgame } from '../types';
// We'll assume a microgame registry will be created at this path
import { microgames } from '../microgames';

// --- TYPE DEFINITIONS ---

// Defines the expected structure for a microgame's result
interface MicrogameResult {
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

// --- CORE GAME LOGIC ---

export class MacroGame {
    private gameArea: HTMLElement;
    private config: PreviewConfig;
    private bgAudio: HTMLAudioElement;
    private successAudio: HTMLAudioElement;
    private loseAudio: HTMLAudioElement;
    private points: number;
    private currentGameIndex: number;
    private activeGame: BaseMicrogame | null;
    private microGames: Microgame[];
    private selectedCouponEl: HTMLElement | null;

    constructor(gameArea: HTMLElement, config: PreviewConfig) {
        this.gameArea = gameArea;
        this.config = config;
        
        // Filter out any undefined games that might result from .find()
        this.microGames = this.config.macrogame.flow.filter((g): g is Microgame => !!g);

        this.bgAudio = new Audio('/sounds/background.wav');
        this.bgAudio.loop = true;
        this.successAudio = new Audio('/sounds/success.wav');
        this.loseAudio = new Audio('/sounds/lose.wav');
        
        this.points = 0;
        this.currentGameIndex = 0;
        this.activeGame = null;
        this.selectedCouponEl = null;
    }

    public async start(): Promise<void> {
        await this.showIntroScreen();
        this.startNextMicroGame();
    }

    public toggleMute(): void {
        this.bgAudio.muted = !this.bgAudio.muted;
    }

    private showIntroScreen(): Promise<void> {
        return new Promise((resolve) => {
            this.gameArea.innerHTML = ''; // Clear previous content
            const introDiv = document.createElement('div');
            introDiv.style.cssText = `text-align: center; color: black; padding: 20px; height: 100%; display: flex; flex-direction: column; justify-content: center; background: #4a5c42; font-family: 'Press Start 2P', cursive;`;
            
            const heading = document.createElement('h1');
            heading.textContent = this.config.macrogame.config.introScreenText || 'GET READY!';
            heading.style.cssText = `font-size: 2.5em; color: white; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);`;
            
            introDiv.appendChild(heading);
            this.gameArea.appendChild(introDiv);
            
            setTimeout(resolve, this.config.macrogame.config.introScreenDuration || 3000);
        });
    }

    private showTitleScreen(game: Microgame): Promise<void> {
        return new Promise((resolve) => {
            this.gameArea.innerHTML = '';
            const titleDiv = document.createElement('div');
            titleDiv.style.cssText = `background: #4a5c42; color: white; text-align: center; padding: 20px; height: 100%; display: flex; flex-direction: column; justify-content: center; font-family: 'Press Start 2P', cursive;`;

            const heading = document.createElement('h1');
            heading.textContent = game.name;
            heading.style.cssText = `font-size: 3em; margin: 0; text-transform: uppercase;`;

            titleDiv.appendChild(heading);
            this.gameArea.appendChild(titleDiv);
            setTimeout(resolve, this.config.macrogame.config.titleScreenDuration || 2000);
        });
    }

    private showControlsScreen(game: Microgame): Promise<void> {
        return new Promise((resolve) => {
            this.gameArea.innerHTML = '';
            const controlsDiv = document.createElement('div');
            controlsDiv.style.cssText = `height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: #fff; font-family: 'Press Start 2P', cursive; background: #4a5c42;`;
            
            const heading = document.createElement('h2');
            heading.textContent = 'CONTROLS';
            heading.style.cssText = `margin: 0 0 16px 0; font-size: 1.5em;`;

            const controlsText = document.createElement('p');
            controlsText.textContent = game.controls;
            controlsText.style.cssText = `margin: 0; font-size: 1.2em;`;
            
            controlsDiv.appendChild(heading);
            controlsDiv.appendChild(controlsText);
            this.gameArea.appendChild(controlsDiv);

            setTimeout(resolve, this.config.macrogame.config.controlsScreenDuration || 2000);
        });
    }

    private async startNextMicroGame(): Promise<void> {
        if (this.currentGameIndex >= this.microGames.length) {
            this.showEndScreen();
            return;
        }

        const nextGameData = this.microGames[this.currentGameIndex];
        const MicroGameClass = microgames[nextGameData.id];

        if (!MicroGameClass) {
            console.error(`Microgame "${nextGameData.name}" (${nextGameData.id}) not found in registry.`);
            this.gameArea.innerHTML = `<div style="color: red; padding: 20px;">Failed to load game: ${nextGameData.name}.</div>`;
            await new Promise(resolve => setTimeout(resolve, 2000));
            this.currentGameIndex++;
            this.startNextMicroGame();
            return;
        }
    
        try {
            await this.showTitleScreen(nextGameData);
            await this.showControlsScreen(nextGameData);
      
            this.activeGame = new MicroGameClass(
                this.gameArea,
                (result: MicrogameResult) => this.onGameEnd(result),
                {} // skinConfig can be added later
            );
            this.activeGame.start();
        } catch (error) {
            console.error("Game initialization failed:", error);
            this.gameArea.innerHTML = `<div style="color: red; padding: 20px;">Failed to run game: ${nextGameData.name}.</div>`;
            await new Promise(resolve => setTimeout(resolve, 2000));
            this.currentGameIndex++;
            this.startNextMicroGame();
        }
    }
  
    private async onGameEnd(result: MicrogameResult): Promise<void> {
        if (result.win) {
            this.successAudio.play();
            this.points += 100; // Example point value
        } else {
            this.loseAudio.play();
        }
    
        const resultScreen = document.createElement("div");
        resultScreen.textContent = result.win ? "W" : "L";
        resultScreen.style.cssText = `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 10002; font-size: 100px; color: ${result.win ? "#2ecc71" : "#e74c3c"}; pointer-events: none; font-family: 'Press Start 2P', cursive; animation: growAndBounce 2s ease-out;`;
        this.gameArea.appendChild(resultScreen);
    
        await new Promise(resolve => setTimeout(resolve, 2000));
    
        if(resultScreen.parentNode) {
            resultScreen.remove();
        }
        this.currentGameIndex++;
        this.startNextMicroGame();
    }

    private showEndScreen(): void {
        this.gameArea.innerHTML = ''; // Clear the game area
    
        const endScreen = document.createElement("div");
        endScreen.style.cssText = `width: 100%; height: 100%; padding: 20px; display: flex; flex-direction: column; font-family: 'Press Start 2P', cursive; overflow: hidden; background: #2c3e50; color: white; box-sizing: border-box;`;
    
        endScreen.innerHTML = `
            <h2 style="margin: 0 0 10px 0; font-size: 1.5em; text-align: center;">Game Over!</h2>
            <p id="points-display" style="margin: 0 0 15px 0; font-size: 1em; text-align: center; color: #FFD700;">Total Points: ${this.points}</p>
            <h3 style="margin: 0 0 10px 0; font-size: 0.8em;">Available Coupons:</h3>
            <div id="coupon-container" style="flex: 1; overflow-y: auto; border: 2px solid #4a5c42; border-radius: 8px; padding: 10px; background: rgba(0, 0, 0, 0.3);"></div>
            <div style="display: flex; justify-content: space-between; gap: 10px; padding-top: 10px; border-top: 2px solid #4a5c42; margin-top: 10px;">
                <button id="restart-button" style="padding: 10px 15px; font-size: 0.8em; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; flex: 1;">Play Again</button>
                <button id="redeem-button" style="padding: 10px 15px; font-size: 0.8em; background: #6c3483; color: white; border: none; border-radius: 4px; cursor: not-allowed; opacity: 0.6; flex: 1;" disabled>Redeem</button>
            </div>
        `;
        this.gameArea.appendChild(endScreen);
        this.buildRewardsList();

        endScreen.querySelector('#restart-button')?.addEventListener('click', () => this.restartGame());
        endScreen.querySelector('#redeem-button')?.addEventListener('click', () => this.redeemReward());
    }

    private buildRewardsList(): void {
        const container = this.gameArea.querySelector<HTMLDivElement>('#coupon-container');
        if (!container) return;
        container.innerHTML = '';
        
        const redeemBtn = this.gameArea.querySelector<HTMLButtonElement>('#redeem-button');
        
        const macrogameRewards = this.config.macrogame.rewards.map(rewardRef => {
            const rewardDetails = this.config.rewards.find(r => r.id === rewardRef.rewardId);
            return { ...rewardDetails, ...rewardRef };
        });

        macrogameRewards.forEach(coupon => {
            if (!coupon.id) return;
            const couponEl = document.createElement("div");
            couponEl.className = "coupon";
            couponEl.dataset.id = coupon.id;
            couponEl.style.cssText = `padding: 10px; margin-bottom: 8px; border: 2px solid #6c3483; border-radius: 4px; background: rgba(255, 255, 255, 0.1); cursor: pointer; transition: all 0.2s ease;`;

            if (this.points < coupon.pointsCost) {
                couponEl.style.opacity = "0.6";
                couponEl.style.cursor = "not-allowed";
            } else {
                couponEl.style.borderColor = "#2ecc71";
            }

            couponEl.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <strong style="font-size: 1.1em; color: #f1c40f;">${coupon.name}</strong>
                  <span style="background: #6c3483; padding: 3px 8px; border-radius: 4px; font-size: 0.8em;">${coupon.pointsCost} pts</span>
                </div>
                <div style="font-size: 0.7em; margin-top: 5px; color: #ddd;">${coupon.type?.replace(/_/g, ' ')}</div>
            `;

            couponEl.addEventListener("click", () => {
                if (this.points < coupon.pointsCost) return;

                if (this.selectedCouponEl) {
                    this.selectedCouponEl.style.background = "rgba(255, 255, 255, 0.1)";
                }
            
                couponEl.style.background = "rgba(108, 52, 131, 0.5)";
                this.selectedCouponEl = couponEl;
            
                if (redeemBtn) {
                    redeemBtn.disabled = false;
                    redeemBtn.style.opacity = "1";
                    redeemBtn.style.cursor = "pointer";
                }
            });
            container.appendChild(couponEl);
        });
    }

    private redeemReward(): void {
        if (!this.selectedCouponEl) return;
      
        const couponId = this.selectedCouponEl.dataset.id;
        const coupon = this.config.rewards.find(c => c.id === couponId);
        const macrogameReward = this.config.macrogame.rewards.find(r => r.rewardId === couponId);

        if (coupon && macrogameReward && this.points >= macrogameReward.pointsCost) {
            this.points -= macrogameReward.pointsCost;
            const pointsDisplay = this.gameArea.querySelector<HTMLParagraphElement>('#points-display');
            if (pointsDisplay) {
                pointsDisplay.textContent = `Total Points: ${this.points}`;
            }
          
            this.showRedemptionMessage(`Redeemed: ${coupon.name}!`);
          
            this.selectedCouponEl = null;
            this.buildRewardsList(); // Re-render rewards to update affordability
            const redeemBtn = this.gameArea.querySelector<HTMLButtonElement>('#redeem-button');
            if (redeemBtn) {
                redeemBtn.disabled = true;
                redeemBtn.style.opacity = "0.6";
                redeemBtn.style.cursor = "not-allowed";
            }
        }
    }

    private showRedemptionMessage(message: string): void {
        const messageEl = document.createElement('div');
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: #2ecc71;
            padding: 15px 30px;
            border-radius: 8px;
            z-index: 10003;
            font-size: 1.2em;
            font-family: 'Press Start 2P', cursive;
            animation: fadeOut 2.5s forwards;
        `;
        this.gameArea.appendChild(messageEl);
        setTimeout(() => messageEl.remove(), 2500);
    }

    private restartGame(): void {
        this.points = 0;
        this.currentGameIndex = 0;
        this.activeGame = null;
        this.selectedCouponEl = null;
        this.start();
    }

    public cleanup(): void {
        this.bgAudio.pause();
        this.bgAudio.currentTime = 0;
        if (this.activeGame && typeof this.activeGame.cleanup === 'function') {
            this.activeGame.cleanup();
        }
    }
}
