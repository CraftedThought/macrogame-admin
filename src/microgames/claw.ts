import { BaseMicrogame } from '../components/BaseMicrogame';

export default class ClawGame extends BaseMicrogame {
    private timer: NodeJS.Timeout | null = null;

    public start(): void {
        this.gameArea.innerHTML = `<div style="color: white; display: flex; justify-content: center; align-items: center; height: 100%; font-size: 2rem;">CLAW!</div>`;
        
        this.timer = setTimeout(() => {
            this.onEnd({ win: Math.random() > 0.5 });
        }, 5000);
    }

    public cleanup(): void {
        if (this.timer) {
            clearTimeout(this.timer);
        }
    }
}