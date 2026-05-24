import type { Application } from "pixi.js";
import { WorldScene } from "./WorldScene";
import { SlotScene } from "./SlotScene";
import { RouletteScene } from "./RouletteScene";
import { useGameStore } from "../../store/gameStore";
import type { NPC, Vec2 } from "@experiments/shared";

type SceneKind = "world" | "slot" | "roulette";

export class SceneManager {
  private worldScene: WorldScene | null = null;
  private slotScene: SlotScene | null = null;
  private rouletteScene: RouletteScene | null = null;
  private currentScene: SceneKind = "world";
  private unsubscribe: (() => void) | null = null;

  constructor(private app: Application) {}

  async start(): Promise<void> {
    const initialPosition = useGameStore.getState().playerPosition ?? undefined;
    const npcs = useGameStore.getState().npcs;
    this.worldScene = new WorldScene(
      this.app,
      {
        onNearbyNPCChange: (npc: NPC | null) => useGameStore.getState().setNearbyNPC(npc),
        onInteract: (npc: NPC) => useGameStore.getState().openDialog(npc),
        onPlayerPositionChange: (pos: Vec2) =>
          useGameStore.getState().setPlayerPosition({ x: pos.x, y: pos.y }),
      },
      { initialPlayerPosition: initialPosition, npcs },
    );
    await this.worldScene.load();
    this.app.stage.addChild(this.worldScene.container);

    const initial = (useGameStore.getState().scene ?? "world") as SceneKind;
    if (initial === "slot") {
      await this.switchTo("slot");
    } else if (initial === "roulette") {
      await this.switchTo("roulette");
    } else {
      this.currentScene = "world";
    }

    let prevScene: SceneKind = this.currentScene;
    this.unsubscribe = useGameStore.subscribe((state) => {
      const next = (state.scene ?? "world") as unknown as SceneKind;
      if (next !== prevScene) {
        prevScene = next;
        void this.switchTo(next);
      }
    });
  }

  private async switchTo(next: SceneKind): Promise<void> {
    if (next === this.currentScene) return;

    if (next === "slot") {
      this.detachWorld();
      this.detachRoulette();
      if (!this.slotScene) {
        this.slotScene = new SlotScene(this.app);
        await this.slotScene.load();
      }
      if (this.slotScene.container.parent !== this.app.stage) {
        this.app.stage.addChild(this.slotScene.container);
      }
      this.slotScene.show();
      this.currentScene = "slot";
      return;
    }

    if (next === "roulette") {
      this.detachWorld();
      this.detachSlot();
      if (!this.rouletteScene) {
        this.rouletteScene = new RouletteScene(this.app);
        await this.rouletteScene.load();
      }
      if (this.rouletteScene.container.parent !== this.app.stage) {
        this.app.stage.addChild(this.rouletteScene.container);
      }
      this.rouletteScene.show();
      this.currentScene = "roulette";
      return;
    }

    this.detachSlot();
    this.detachRoulette();
    if (this.worldScene && this.worldScene.container.parent !== this.app.stage) {
      this.app.stage.addChild(this.worldScene.container);
    }
    this.currentScene = "world";
  }

  private detachWorld(): void {
    if (this.worldScene && this.worldScene.container.parent === this.app.stage) {
      this.app.stage.removeChild(this.worldScene.container);
    }
  }

  private detachSlot(): void {
    if (this.slotScene) {
      this.slotScene.hide();
      if (this.slotScene.container.parent === this.app.stage) {
        this.app.stage.removeChild(this.slotScene.container);
      }
    }
  }

  private detachRoulette(): void {
    if (this.rouletteScene) {
      this.rouletteScene.hide();
      if (this.rouletteScene.container.parent === this.app.stage) {
        this.app.stage.removeChild(this.rouletteScene.container);
      }
    }
  }

  destroy(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.slotScene?.destroy();
    this.slotScene = null;
    this.rouletteScene?.destroy();
    this.rouletteScene = null;
    this.worldScene?.destroy();
    this.worldScene = null;
  }
}
