import { BaseMicrogame } from '../components/MacroGame';

// --- Import all microgame classes ---
// Note: These paths will be correct once you rename the .js files to .ts
import AvoidGame from './avoid';
import CatchGame from './catch';
import CleanGame from './clean';
import CollectGame from './collect';
import ConsumeGame from './consume';
import DanceGame from './dance';
import DressGame from './dress';
import EscapeGame from './escape';
import MakeupGame from './makeup';
// import PlushieCatchGame from './plushie_catch'; // Assuming this will be created

// --- Placeholder for unimplemented games ---
// This class now correctly implements the BaseMicrogame abstract class.
class PlaceholderGame extends BaseMicrogame {
    private timer: NodeJS.Timeout | null = null;

    start() {
        this.gameArea.innerHTML = `<div style="color: white; display: flex; justify-content: center; align-items: center; height: 100%; font-size: 1.5rem; padding: 1rem; text-align: center;">This game is not yet implemented.</div>`;
        this.timer = setTimeout(() => {
            this.onGameEnd({ win: true }); // Default to a win for placeholders
        }, 3000);
    }

    cleanup() {
        if (this.timer) {
            clearTimeout(this.timer);
        }
    }
}

// --- Microgame Registry ---
// This registry maps game IDs to their corresponding class constructors.
// Typing it ensures that every entry is a valid microgame class.
export const microgames: { [key: string]: typeof BaseMicrogame } = {
  'avoid_v1': AvoidGame,
  'catch_v1': CatchGame,
  'escape_v1': EscapeGame,
  'clean_v1': CleanGame,
  'collect_v1': CollectGame,
  'consume_v1': ConsumeGame,
  'dance_v1': DanceGame,
  'dress_up_v1': DressGame,
  'makeup_v1': MakeupGame,
  'plushie_catch_v1': PlaceholderGame, // Using placeholder for now
};
