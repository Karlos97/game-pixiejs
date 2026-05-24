import { Assets, Container, Graphics, Sprite, Texture } from "pixi.js";
import type { Vec2 } from "@experiments/shared";

const SPEED = 250;
const AVATAR_PATH = "/assets/player_avatar.png";
const AVATAR_SIZE = 40;
const REPORT_THRESHOLD = 0.5;

export interface PlayerOptions {
  onPositionChange?: (pos: Vec2) => void;
}

export class Player {
  public container: Container;
  public position: Vec2;
  private body: Graphics;
  private avatar: Sprite | null = null;
  private onPositionChange: ((pos: Vec2) => void) | undefined;
  private lastReportedPosition: Vec2;

  constructor(spawn: Vec2, options: PlayerOptions = {}) {
    this.position = { ...spawn };
    this.lastReportedPosition = { ...spawn };
    this.onPositionChange = options.onPositionChange;
    this.container = new Container();
    this.container.x = spawn.x;
    this.container.y = spawn.y;

    this.body = new Graphics();
    this.body
      .circle(0, 0, AVATAR_SIZE / 2)
      .fill("#ffcc00")
      .stroke({ width: 2, color: "#000" });
    this.container.addChild(this.body);

    void this.loadAvatar();
  }

  private async loadAvatar(): Promise<void> {
    const texture = await Assets.load<Texture>(AVATAR_PATH);
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.width = AVATAR_SIZE;
    sprite.height = AVATAR_SIZE;

    const mask = new Graphics();
    mask.circle(0, 0, AVATAR_SIZE / 2 - 1).fill(0xffffff);
    sprite.mask = mask;

    this.container.addChild(sprite);
    this.container.addChild(mask);

    const ring = new Graphics();
    ring.circle(0, 0, AVATAR_SIZE / 2).stroke({ width: 2, color: "#000" });
    this.container.addChild(ring);

    this.body.visible = false;
    this.avatar = sprite;
  }

  move(dir: Vec2, dt: number): void {
    const len = Math.hypot(dir.x, dir.y);
    if (len === 0) return;
    const nx = dir.x / len;
    const ny = dir.y / len;
    this.position.x += nx * SPEED * dt;
    this.position.y += ny * SPEED * dt;
  }

  sync(): void {
    this.container.x = this.position.x;
    this.container.y = this.position.y;

    if (!this.onPositionChange) return;
    const dx = Math.abs(this.position.x - this.lastReportedPosition.x);
    const dy = Math.abs(this.position.y - this.lastReportedPosition.y);
    if (dx > REPORT_THRESHOLD || dy > REPORT_THRESHOLD) {
      this.lastReportedPosition.x = this.position.x;
      this.lastReportedPosition.y = this.position.y;
      this.onPositionChange({ x: this.position.x, y: this.position.y });
    }
  }
}
