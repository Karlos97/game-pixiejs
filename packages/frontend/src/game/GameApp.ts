import { Application } from "pixi.js";
import { SceneManager } from "./scenes/SceneManager";

export class GameApp {
  private app: Application;
  private sceneManager: SceneManager | null = null;
  private initialized = false;
  private destroyRequested = false;

  constructor() {
    this.app = new Application();
  }

  async init(container: HTMLDivElement): Promise<void> {
    await this.app.init({
      resizeTo: container,
      background: "#1a2030",
      antialias: true,
    });

    if (this.destroyRequested) {
      this.app.destroy(true, { children: true });
      return;
    }

    container.appendChild(this.app.canvas);

    this.sceneManager = new SceneManager(this.app);
    await this.sceneManager.start();
    this.initialized = true;
  }

  destroy(): void {
    if (!this.initialized) {
      this.destroyRequested = true;
      return;
    }
    this.sceneManager?.destroy();
    this.sceneManager = null;
    this.app.destroy(true, { children: true });
  }
}
