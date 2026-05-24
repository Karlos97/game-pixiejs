import { Container, Graphics, Text } from "pixi.js";
import { MAP_COLS, MAP_ROWS, TILE_SIZE } from "../assets/tilemap";

export class DebugOverlay {
  public container: Container;
  private mask: Graphics;
  private labels: Container;
  private visible_ = false;

  constructor(private collision: boolean[][]) {
    this.container = new Container();
    this.container.visible = false;
    this.container.eventMode = "none";

    this.mask = new Graphics();
    this.container.addChild(this.mask);

    this.labels = new Container();
    this.container.addChild(this.labels);

    this.draw();
  }

  toggle(): void {
    this.visible_ = !this.visible_;
    this.container.visible = this.visible_;
  }

  get visible(): boolean {
    return this.visible_;
  }

  private draw(): void {
    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        if (this.collision[row]?.[col]) {
          this.mask
            .rect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE)
            .fill({ color: 0xff0000, alpha: 0.45 });
        }
      }
    }
    for (let i = 0; i <= MAP_COLS; i++) {
      this.mask
        .moveTo(i * TILE_SIZE, 0)
        .lineTo(i * TILE_SIZE, MAP_ROWS * TILE_SIZE)
        .stroke({ color: 0x000000, alpha: 0.25, width: 1 });
    }
    for (let j = 0; j <= MAP_ROWS; j++) {
      this.mask
        .moveTo(0, j * TILE_SIZE)
        .lineTo(MAP_COLS * TILE_SIZE, j * TILE_SIZE)
        .stroke({ color: 0x000000, alpha: 0.25, width: 1 });
    }
    for (let row = 0; row < MAP_ROWS; row += 5) {
      for (let col = 0; col < MAP_COLS; col += 5) {
        const t = new Text({
          text: `${col},${row}`,
          style: {
            fontFamily: "monospace",
            fontSize: 10,
            fill: 0xffffff,
            stroke: { color: 0x000000, width: 2 },
          },
        });
        t.x = col * TILE_SIZE + 2;
        t.y = row * TILE_SIZE + 2;
        this.labels.addChild(t);
      }
    }
  }
}
