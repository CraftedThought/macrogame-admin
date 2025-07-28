/**
 * This script runs on the preview.html page.
 * It reads the popup configuration from localStorage, builds the UI,
 * and runs the macrogame experience.
 */

// --- GLOBAL CONFIGURATION ---
const WIN_SOUND_SRC = '/sounds/success.wav';
const LOSE_SOUND_SRC = '/sounds/lose.wav';

// --- MAIN INITIALIZATION ---
window.addEventListener('load', () => {
    const rawData = localStorage.getItem('macrogame_preview_data');
    if (!rawData) {
        displayError("No preview data found. Please try previewing from the admin portal again.");
        return;
    }

    try {
        const { popup, macrogame, rewards, skin } = JSON.parse(rawData);
        if (!popup || !macrogame || !rewards || !skin) {
            throw new Error("Preview data is incomplete. Skin data is missing.");
        }
        
        const ui = new UIManager(skin);
        ui.createPopup().then(() => {
            const game = new MacroGame(macrogame, rewards, ui.gameArea);
            game.start();
        }).catch(err => {
            console.error(err);
            displayError(err.message);
        });

    } catch (error) {
        console.error("Failed to initialize preview:", error);
        displayError(`Error initializing preview: ${error.message}`);
    }
});

function displayError(message) {
    document.body.innerHTML = `<div class="preview-error"><h2>Preview Error</h2><p>${message}</p></div>`;
}

// --- UI MANAGER CLASS ---
class UIManager {
    constructor(skin) {
        this.skin = skin;
        this.scrim = null;
        this.container = null;
        this.gameArea = null;
        this.closeHandler = null;
    }

    loadFont() {
        if (!this.skin.fontUrl) return;
        const fontName = this.skin.fontFamily.replace(/'/g, '');
        const style = document.createElement('style');
        style.textContent = `
            @font-face {
                font-family: '${fontName}';
                src: url('${this.skin.fontUrl}') format('truetype');
            }
        `;
        document.head.appendChild(style);
    }

    createPopup() {
        return new Promise((resolve, reject) => {
            this.loadFont();

            this.scrim = document.createElement('div');
            this.scrim.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5); z-index: 9999; backdrop-filter: blur(3px);`;

            this.container = document.createElement('div');
            this.container.style.cssText = `
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                z-index: 10000;
                background-repeat: no-repeat;
                background-position: center;
                background-size: contain;
                font-family: ${this.skin.fontFamily}, cursive;
            `;

            this.gameArea = document.createElement('div');
            this.gameArea.style.cssText = `
                position: absolute;
                top: ${this.skin.gameArea.top}px;
                left: ${this.skin.gameArea.left}px;
                width: ${this.skin.gameArea.width}px;
                height: ${this.skin.gameArea.height}px;
                background: #000;
                overflow: hidden;
            `;

            const closeButton = document.createElement('button');
            closeButton.style.cssText = `position: absolute; top: 7px; right: 11px; width: 33px; height: 33px; opacity: 0; cursor: pointer; z-index: 10001; border: none; background: transparent;`;
            closeButton.addEventListener('click', () => this.cleanup());

            const img = new Image();
            img.src = this.skin.imageUrl;
            img.onload = () => {
                this.container.style.width = `${img.naturalWidth}px`;
                this.container.style.height = `${img.naturalHeight}px`;
                this.container.style.backgroundImage = `url(${this.skin.imageUrl})`;

                this.container.appendChild(this.gameArea);
                this.container.appendChild(closeButton);
                document.body.appendChild(this.scrim);
                document.body.appendChild(this.container);
                resolve();
            };
            img.onerror = () => {
                reject(new Error(`Failed to load skin image: ${this.skin.imageUrl}`));
            };
        });
    }

    cleanup() {
        if (this.scrim) this.scrim.remove();
        if (this.container) this.container.remove();
        if (this.closeHandler) this.closeHandler();
        window.close();
    }
}

// --- MACROGAME LOGIC CLASS ---
class MacroGame {
    constructor(macrogameConfig, allRewards, gameArea) {
        this.config = macrogameConfig.config;
        this.flow = macrogameConfig.flow;
        this.macrogameCategory = macrogameConfig.category; // Store the macrogame's category
        this.linkedRewards = macrogameConfig.rewards;
        this.allRewards = allRewards;
        this.gameArea = gameArea;
        this.points = 0;
        this.currentGameIndex = 0;
        this.activeGame = null;
        this.bgAudio = this.config.backgroundMusicUrl ? new Audio(this.config.backgroundMusicUrl) : null;
        if (this.bgAudio) this.bgAudio.loop = true;
        this.winAudio = new Audio(WIN_SOUND_SRC);
        this.loseAudio = new Audio(LOSE_SOUND_SRC);
    }

    async start() {
        if (this.bgAudio) {
            try { await this.bgAudio.play(); } 
            catch (e) { console.warn("Background audio playback failed."); }
        }
        await this.showIntroScreen();
        this.startNextMicroGame();
    }

    async showScreen(htmlContent, duration) {
        return new Promise(resolve => {
            this.gameArea.innerHTML = htmlContent;
            setTimeout(resolve, duration);
        });
    }

    async showIntroScreen() {
        const html = `<div style="width:100%; height:100%; display:flex; justify-content:center; align-items:center; color:white; font-size: 2.5em; text-align:center; padding: 20px; text-shadow: 3px 3px 0px rgba(0,0,0,0.5);">${this.config.introScreenText}</div>`;
        await this.showScreen(html, this.config.introScreenDuration);
    }
    
    async showTitleScreen(game) {
        const html = `<div style="width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; color:white; text-align:center;"><div style="font-size: 1.2em; opacity: 0.8;">Game ${this.currentGameIndex + 1}/${this.flow.length}</div><h1 style="font-size: 3em; margin: 10px 0; text-transform: uppercase;">${game.name}</h1></div>`;
        await this.showScreen(html, this.config.titleScreenDuration);
    }

    async showControlsScreen(game) {
        // UPDATED: Added the "Theme:" text to the controls screen for visual confirmation.
        const html = `
            <div style="width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; color:white; text-align:center; padding: 20px;">
                <h2 style="margin: 0 0 16px 0; font-size: 1.5em;">CONTROLS</h2>
                <p style="margin: 0; font-size: 1.2em;">${game.controls}</p>
                <p style="margin-top: 20px; font-size: 0.8em; opacity: 0.7;">Theme: ${this.macrogameCategory}</p>
            </div>`;
        await this.showScreen(html, this.config.controlsScreenDuration);
    }

    async startNextMicroGame() {
        if (this.currentGameIndex >= this.flow.length) { this.showEndScreen(); return; }
        const nextGameData = this.flow[this.currentGameIndex];
        await this.showTitleScreen(nextGameData);
        await this.showControlsScreen(nextGameData);
        this.activeGame = new MicroGame(this.gameArea, nextGameData, (result) => this.onGameEnd(result));
        this.activeGame.start();
    }

    onGameEnd(result) {
        this.gameArea.innerHTML = '';
        if (result.win) { this.points += 100; this.winAudio.play().catch(e => console.warn("Win audio failed")); } 
        else { this.loseAudio.play().catch(e => console.warn("Lose audio failed")); }

        const resultEl = document.createElement('div');
        resultEl.textContent = result.win ? 'WIN!' : 'LOSE';
        resultEl.style.cssText = `width:100%; height:100%; display:flex; justify-content:center; align-items:center; font-size: 100px; font-weight: bold; color: ${result.win ? '#2ecc71' : '#e74c3c'}; animation: growAndFade 1.5s ease-out;`;
        const style = document.createElement('style');
        style.textContent = `@keyframes growAndFade { 0% { transform: scale(0); opacity: 0; } 50% { transform: scale(1.2); opacity: 1; } 100% { transform: scale(1); opacity: 0; }}`;
        this.gameArea.appendChild(style);
        this.gameArea.appendChild(resultEl);

        setTimeout(() => { this.currentGameIndex++; this.startNextMicroGame(); }, 1500);
    }

    showEndScreen() {
        if (this.bgAudio) this.bgAudio.pause();
        const rewardsToShow = this.linkedRewards.map(linked => ({ ...this.allRewards.find(r => r.id === linked.rewardId), ...linked }));
        let rewardsHtml = rewardsToShow.map(reward => `<div class="reward-item" style="padding: 10px; margin-bottom: 8px; border: 2px solid ${this.points >= reward.pointsCost ? '#2ecc71' : '#6c3483'}; border-radius: 4px; background: rgba(255, 255, 255, 0.1); opacity: ${this.points >= reward.pointsCost ? '1' : '0.6'};"><div style="display: flex; justify-content: space-between; align-items: center;"><strong style="font-size: 1em; color: #f1c40f;">${reward.name}</strong><span style="background: #6c3483; padding: 3px 8px; border-radius: 4px; font-size: 0.8em;">${reward.pointsCost} pts</span></div></div>`).join('');
        const html = `<div style="width:100%; height:100%; display:flex; flex-direction:column; color:white; padding: 20px; box-sizing: border-box;"><h2 style="text-align:center; margin:0 0 10px;">Game Over!</h2><p style="text-align:center; margin:0 0 15px; font-size: 1em; color: #FFD700;">Total Points: ${this.points}</p><h3 style="margin: 0 0 10px 0; font-size: 0.8em;">Your Rewards:</h3><div style="flex: 1; overflow-y: auto;">${rewardsHtml || '<p>No rewards available.</p>'}</div><button id="play-again-btn" style="margin-top: 15px; padding: 10px; background: #4CAF50; color: white; border: none; font-family: inherit; font-size: 1em; cursor: pointer;">Play Again</button></div>`;
        this.gameArea.innerHTML = html;
        document.getElementById('play-again-btn').addEventListener('click', () => { this.points = 0; this.currentGameIndex = 0; this.start(); });
    }
}


// --- MICROGAME PLACEHOLDER CLASS ---
class MicroGame {
    constructor(gameArea, gameData, onEndCallback) {
        this.gameArea = gameArea;
        this.gameData = gameData;
        this.onEnd = onEndCallback;
        this.timer = null;
    }

    start() {
        this.gameArea.innerHTML = `<div style="width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; color:white; padding:20px; box-sizing:border-box;"><h2 style="margin:0;">Playing: ${this.gameData.name}</h2><p>This is a placeholder game.</p><p>It will end in ${this.gameData.length} seconds.</p></div>`;
        this.timer = setTimeout(() => { const didWin = Math.random() > 0.3; this.onEnd({ win: didWin }); }, this.gameData.length * 1000);
    }

    cleanup() { clearTimeout(this.timer); }
}
