import type { Vec2 } from "@experiments/shared";
import { useGameStore } from "../../store/gameStore";

export class InputSystem {
  private keys = new Set<string>();
  private interactHandlers: Array<() => void> = [];
  private debugToggleHandlers: Array<() => void> = [];

  attach(): void {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  detach(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }

  onInteract(handler: () => void): void {
    this.interactHandlers.push(handler);
  }

  onDebugToggle(handler: () => void): void {
    this.debugToggleHandlers.push(handler);
  }

  getDirection(): Vec2 {
    // Freeze movement when a casino scene is active.
    const scene = useGameStore.getState().scene as unknown as string;
    if (scene === "slot" || scene === "roulette") return { x: 0, y: 0 };

    let x = 0;
    let y = 0;
    if (this.keys.has("w") || this.keys.has("arrowup")) y -= 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) y += 1;
    if (this.keys.has("a") || this.keys.has("arrowleft")) x -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) x += 1;
    return { x, y };
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    const key = e.key.toLowerCase();
    const isRepeat = this.keys.has(key);
    this.keys.add(key);
    if (isRepeat) return;

    const state = useGameStore.getState() as unknown as Record<string, unknown>;
    const scene = typeof state.scene === "string" ? (state.scene as string) : "world";
    const inSlot = scene === "slot";
    const inRoulette = scene === "roulette";

    if (key === "escape") {
      if (inSlot) {
        e.preventDefault();
        const close = state.closeSlot;
        if (typeof close === "function") (close as () => void)();
        return;
      }
      if (inRoulette) {
        e.preventDefault();
        const close = state.closeRoulette;
        if (typeof close === "function") (close as () => void)();
      }
      return;
    }

    if (inSlot || inRoulette) {
      // Suppress world-level inputs while a casino scene owns the screen.
      return;
    }

    if (key === "e") {
      for (const h of this.interactHandlers) h();
    }
    if (key === "`" || key === "~") {
      e.preventDefault();
      for (const h of this.debugToggleHandlers) h();
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.key.toLowerCase());
  };
}
