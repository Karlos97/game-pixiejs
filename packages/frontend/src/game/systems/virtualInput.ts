import type { Vec2 } from "@experiments/shared";

type InteractHandler = () => void;

class VirtualInput {
  private direction: Vec2 = { x: 0, y: 0 };
  private interactHandlers = new Set<InteractHandler>();

  setDirection(x: number, y: number): void {
    this.direction.x = Math.max(-1, Math.min(1, x));
    this.direction.y = Math.max(-1, Math.min(1, y));
  }

  clearDirection(): void {
    this.direction.x = 0;
    this.direction.y = 0;
  }

  getDirection(): Vec2 {
    return this.direction;
  }

  triggerInteract(): void {
    for (const h of this.interactHandlers) h();
  }

  onInteract(handler: InteractHandler): () => void {
    this.interactHandlers.add(handler);
    return () => this.interactHandlers.delete(handler);
  }
}

export const virtualInput = new VirtualInput();
