import { MAP_COLS, MAP_ROWS, TILE_SIZE } from "../assets/tilemap";

const PLAYER_RADIUS = 12;

export class CollisionSystem {
  constructor(private collision: boolean[][]) {}

  isBlocked(x: number, y: number): boolean {
    const minCol = Math.floor((x - PLAYER_RADIUS) / TILE_SIZE);
    const maxCol = Math.floor((x + PLAYER_RADIUS) / TILE_SIZE);
    const minRow = Math.floor((y - PLAYER_RADIUS) / TILE_SIZE);
    const maxRow = Math.floor((y + PLAYER_RADIUS) / TILE_SIZE);

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS) {
          return true;
        }
        if (this.collision[row]?.[col]) return true;
      }
    }
    return false;
  }

  resolveMove(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
  ): { x: number; y: number } {
    let x = fromX;
    let y = fromY;
    if (!this.isBlocked(toX, fromY)) x = toX;
    if (!this.isBlocked(x, toY)) y = toY;
    return { x, y };
  }
}
