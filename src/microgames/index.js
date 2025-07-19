// This file acts as a central registry for all microgame modules.
// It imports each game class and exports them in a single object,
// making them easily accessible throughout the application without
// relying on unreliable dynamic imports from the public folder.

import AvoidGame from './avoid.js';
import CatchGame from './catch.js';
import EscapeGame from './escape.js';
// As you create the other microgame files, you will import them here as well.
// For now, we can use a placeholder for the ones that don't exist yet.

// A placeholder class for games that haven't been fully implemented yet.
class PlaceholderGame {
    constructor(gameArea, onGameEnd) {
        this.gameArea = gameArea;
        this.onGameEnd = onGameEnd;
        this.timer = null;
    }
    start() {
        this.gameArea.innerHTML = `<div style="color: white; display: flex; justify-content: center; align-items: center; height: 100%; font-size: 1.5rem; padding: 1rem; text-align: center;">This game is not yet implemented.</div>`;
        this.timer = setTimeout(() => {
            this.onGameEnd({ win: true }); // Default to a win for placeholders
        }, 3000);
    }
    cleanup() {
        clearTimeout(this.timer);
    }
}

export const microgames = {
  'avoid_v1': AvoidGame,
  'catch_v1': CatchGame,
  'escape_v1': EscapeGame,
  'clean_v1': PlaceholderGame,
  'collect_v1': PlaceholderGame,
  'consume_v1': PlaceholderGame,
  'dance_v1': PlaceholderGame,
  'dress_up_v1': PlaceholderGame,
  'makeup_v1': PlaceholderGame,
  'plushie_catch_v1': PlaceholderGame,
};
