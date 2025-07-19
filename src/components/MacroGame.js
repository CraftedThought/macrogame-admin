// This is an adapted version of your macrogame.js, designed to work in this web context
import { microgames } from '../microgames/index.js'; // Import the new registry

export class MacroGame {
  constructor(gameArea, config) {
    this.gameArea = gameArea;
    this.config = config;
    this.bgAudio = new Audio('/sounds/background.wav');
    this.bgAudio.loop = true;
    this.successAudio = new Audio('/sounds/success.wav');
    this.loseAudio = new Audio('/sounds/lose.wav');
    this.points = 0;
    this.currentGameIndex = 0;
    this.activeGame = null;
    this.microGames = this.config.macrogame.flow;
    this.selectedCoupon = null;
  }

  async start() {
    await this.showIntroScreen();
    this.startNextMicroGame();
  }

  toggleMute() {
      this.bgAudio.muted = !this.bgAudio.muted;
  }

  async showIntroScreen() {
    return new Promise((resolve) => {
      this.gameArea.innerHTML = `
        <div style="text-align: center; color: black; padding: 20px; height: 100%; display: flex; flex-direction: column; justify-content: center; background: #4a5c42; font-family: 'Press Start 2P', cursive !important;">
          <h1 style="font-size: 2.5em; color: white; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.5); font-family: 'Press Start 2P', cursive !important;">
            ${this.config.macrogame.config.introScreenText || 'GET READY!'}
          </h1>
        </div>
      `;
      setTimeout(resolve, this.config.macrogame.config.introScreenDuration || 3000);
    });
  }

  async showTitleScreen(game) {
    return new Promise((resolve) => {
      this.gameArea.innerHTML = `
        <div style="background: #4a5c42; color: white; text-align: center; padding: 20px; height: 100%; display: flex; flex-direction: column; justify-content: center; font-family: 'Press Start 2P', cursive !important;">
          <h1 style="font-size: 3em; margin: 0; text-transform: uppercase; font-family: 'Press Start 2P', cursive !important;">
            ${game.name}
          </h1>
        </div>
      `;
      setTimeout(resolve, this.config.macrogame.config.titleScreenDuration || 2000);
    });
  }

  async showControlsScreen(game) {
    return new Promise((resolve) => {
      this.gameArea.innerHTML = `
        <div style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: #fff; font-family: 'Press Start 2P', cursive !important; background: #4a5c42;">
          <h2 style="margin: 0 0 16px 0; font-size: 1.5em;">CONTROLS</h2>
          <p style="margin: 0; font-size: 1.2em;">${game.controls}</p>
        </div>
      `;
      setTimeout(resolve, this.config.macrogame.config.controlsScreenDuration || 2000);
    });
  }

  async startNextMicroGame() {
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
        (result) => this.onGameEnd(result),
        {} // skinConfig can be added later
      );
      this.activeGame.start();
    } 
    catch (error) {
      console.error("Game initialization failed:", error);
      this.gameArea.innerHTML = `<div style="color: red; padding: 20px;">Failed to run game: ${nextGameData.name}.</div>`;
      await new Promise(resolve => setTimeout(resolve, 2000));
      this.currentGameIndex++;
      this.startNextMicroGame();
    }
  }
  
  async onGameEnd(result) {
    if (result.win) {
      this.successAudio.play();
      this.points += 100;
    } else {
      this.loseAudio.play();
    }
    
    const resultScreen = document.createElement("div");
    resultScreen.textContent = result.win ? "W" : "L";
    resultScreen.style.cssText = `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 10002; font-size: 100px; color: ${result.win ? "#2ecc71" : "#e74c3c"}; pointer-events: none; font-family: 'Press Start 2P', cursive !important;`;
    this.gameArea.appendChild(resultScreen);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if(resultScreen.parentNode) {
      this.gameArea.removeChild(resultScreen);
    }
    this.currentGameIndex++;
    this.startNextMicroGame();
  }

  showEndScreen() {
    this.gameArea.innerHTML = ''; // Clear the game area
    
    const endScreen = document.createElement("div");
    endScreen.style.cssText = `width: 100%; height: 100%; padding: 20px; display: flex; flex-direction: column; font-family: 'Press Start 2P', cursive; overflow: hidden; background: #2c3e50; color: white;`;
    
    endScreen.innerHTML = `
        <h2 style="margin: 0 0 10px 0; font-size: 1.5em; text-align: center;">Game Over!</h2>
        <p id="points-display" style="margin: 0 0 15px 0; font-size: 1em; text-align: center; color: #FFD700;">Total Points: ${this.points}</p>
        <h3 style="margin: 0 0 10px 0; font-size: 0.8em;">Available Coupons:</h3>
        <div id="coupon-container" style="flex: 1; overflow-y: auto; border: 2px solid #4a5c42; border-radius: 8px; padding: 10px; background: rgba(0, 0, 0, 0.3);"></div>
        <div style="display: flex; justify-content: space-between; gap: 10px; padding-top: 10px; border-top: 2px solid #4a5c42;">
            <button id="restart-button" style="padding: 10px 15px; font-size: 0.8em; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; flex: 1;">Play Again</button>
            <button id="redeem-button" style="padding: 10px 15px; font-size: 0.8em; background: #6c3483; color: white; border: none; border-radius: 4px; cursor: not-allowed; opacity: 0.6; flex: 1;" disabled>Redeem</button>
        </div>
    `;
    this.gameArea.appendChild(endScreen);
    this.buildRewardsList();

    endScreen.querySelector('#restart-button').addEventListener('click', () => this.restartGame());
    endScreen.querySelector('#redeem-button').addEventListener('click', () => this.redeemReward());
  }

  buildRewardsList() {
    const container = this.gameArea.querySelector('#coupon-container');
    container.innerHTML = '';
    const redeemBtn = this.gameArea.querySelector('#redeem-button');

    const macrogameRewards = this.config.macrogame.rewards.map(rewardRef => {
        const rewardDetails = this.config.rewards.find(r => r.id === rewardRef.rewardId);
        return { ...rewardDetails, ...rewardRef };
    });

    macrogameRewards.forEach(coupon => {
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
            <div style="font-size: 0.7em; margin-top: 5px; color: #ddd;">${coupon.type.replace(/_/g, ' ')}</div>
        `;

        couponEl.addEventListener("click", () => {
            if (this.points < coupon.pointsCost) return;

            if (this.selectedCoupon) {
                this.selectedCoupon.style.background = "rgba(255, 255, 255, 0.1)";
            }
            
            couponEl.style.background = "rgba(108, 52, 131, 0.5)";
            this.selectedCoupon = couponEl;
            
            redeemBtn.disabled = false;
            redeemBtn.style.opacity = "1";
            redeemBtn.style.cursor = "pointer";
        });
        container.appendChild(couponEl);
    });
  }

  redeemReward() {
      if (!this.selectedCoupon) return;
      
      const couponId = this.selectedCoupon.dataset.id;
      const coupon = this.config.rewards.find(c => c.id === couponId);
      const macrogameReward = this.config.macrogame.rewards.find(r => r.rewardId === couponId);

      if (coupon && this.points >= macrogameReward.pointsCost) {
          this.points -= macrogameReward.pointsCost;
          this.gameArea.querySelector('#points-display').textContent = `Total Points: ${this.points}`;
          
          alert(`Redeemed: ${coupon.name}!`); // Simple confirmation
          
          this.selectedCoupon = null;
          this.buildRewardsList(); // Re-render rewards to update affordability
          const redeemBtn = this.gameArea.querySelector('#redeem-button');
          redeemBtn.disabled = true;
          redeemBtn.style.opacity = "0.6";
          redeemBtn.style.cursor = "not-allowed";
      }
  }

  restartGame() {
    this.points = 0;
    this.currentGameIndex = 0;
    this.activeGame = null;
    this.selectedCoupon = null;
    this.start();
  }

  cleanup() {
    this.bgAudio.pause();
    this.bgAudio.currentTime = 0;
    if (this.activeGame && typeof this.activeGame.cleanup === 'function') {
      this.activeGame.cleanup();
    }
  }
}
