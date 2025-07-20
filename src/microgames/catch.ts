import { BaseMicrogame } from '../components/MacroGame';

// The class now extends BaseMicrogame to ensure it has the required methods.
export default class CatchGame extends BaseMicrogame {
    // The timer property is now typed.
    private timer: NodeJS.Timeout | null = null;

    // The start method is required by the base class.
    public start(): void {
        this.gameArea.innerHTML = `<div style="color: white; display: flex; justify-content: center; align-items: center; height: 100%; font-size: 2rem;">CATCH!</div>`;
        
        // The game logic will go here. For now, it's a simple placeholder.
        this.timer = setTimeout(() => {
            // The onGameEnd callback is used to report the result.
            this.onGameEnd({ win: Math.random() > 0.5 });
        }, 5000); // Game lasts 5 seconds
    }

    // The cleanup method is also required, to prevent memory leaks.
    public cleanup(): void {
        if (this.timer) {
            clearTimeout(this.timer);
        }
    }
}
