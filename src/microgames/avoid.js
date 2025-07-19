export default class AvoidGame {
    constructor(gameArea, onGameEnd, skinConfig) {
        this.gameArea = gameArea;
        this.onGameEnd = onGameEnd;
        this.timer = null;
    }

    start() {
        this.gameArea.innerHTML = `<div style="color: white; display: flex; justify-content: center; align-items: center; height: 100%; font-size: 2rem;">AVOID!</div>`;
        this.timer = setTimeout(() => {
            this.onGameEnd({ win: Math.random() > 0.5 });
        }, 5000); [cite_start]// Game lasts 5 seconds [cite: 91]
    }

    cleanup() {
        clearTimeout(this.timer);
    }
}