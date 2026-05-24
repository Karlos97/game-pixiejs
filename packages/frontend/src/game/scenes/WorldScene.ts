import { Application, Container, Text } from "pixi.js";
import type { NPC, Vec2 } from "@experiments/shared";
import { Player } from "../entities/Player";
import { NPCEntity } from "../entities/NPC";
import { InputSystem } from "../systems/InputSystem";
import { TilemapRenderer } from "../systems/TilemapRenderer";
import { CollisionSystem } from "../systems/CollisionSystem";
import { DebugOverlay } from "../systems/DebugOverlay";
import {
  loadCollision,
  MAP_COLS,
  MAP_HEIGHT_PX,
  MAP_ROWS,
  MAP_WIDTH_PX,
  TILE_SIZE,
} from "../assets/tilemap";

interface WorldSceneCallbacks {
  onNearbyNPCChange: (npc: NPC | null) => void;
  onInteract: (npc: NPC) => void;
  onPlayerPositionChange?: (pos: Vec2) => void;
}

interface WorldSceneOptions {
  initialPlayerPosition?: Vec2;
  npcs?: NPC[];
}

const INTERACTION_RADIUS = 60;

const PLAYER_SPAWN = { col: 20, row: 17 };
const MIN_WALKABLE_NEIGHBORS = 3;

export class WorldScene {
  public container: Container;
  private worldContainer: Container;
  private hudContainer: Container;
  private player!: Player;
  private npcs: NPCEntity[] = [];
  private input: InputSystem;
  private collision!: CollisionSystem;
  private debugOverlay: DebugOverlay | null = null;
  private debugLabel: Text | null = null;
  private currentNearbyNPC: NPC | null = null;

  constructor(
    private app: Application,
    private callbacks: WorldSceneCallbacks,
    private options: WorldSceneOptions = {},
  ) {
    this.container = new Container();
    this.worldContainer = new Container();
    this.hudContainer = new Container();
    this.container.addChild(this.worldContainer);
    this.container.addChild(this.hudContainer);
    this.input = new InputSystem();
  }

  async load(): Promise<void> {
    const tilemap = new TilemapRenderer();
    await tilemap.load();
    this.worldContainer.addChild(tilemap.container);

    const collision = await loadCollision();
    this.collision = new CollisionSystem(collision);

    const initial = this.options.initialPlayerPosition;
    const spawnPos: Vec2 = initial
      ? { x: initial.x, y: initial.y }
      : (() => {
          const spawn = this.findWalkable(collision, PLAYER_SPAWN.col, PLAYER_SPAWN.row);
          return {
            x: spawn.col * TILE_SIZE + TILE_SIZE / 2,
            y: spawn.row * TILE_SIZE + TILE_SIZE / 2,
          };
        })();
    this.spawnPlayer(spawnPos);

    this.spawnNPCs();

    this.debugOverlay = new DebugOverlay(collision);
    this.worldContainer.addChild(this.debugOverlay.container);

    this.debugLabel = new Text({
      text: "",
      style: {
        fontFamily: "monospace",
        fontSize: 14,
        fill: 0xffffff,
        stroke: { color: 0x000000, width: 3 },
      },
    });
    this.debugLabel.x = 12;
    this.debugLabel.y = this.app.screen.height - 28;
    this.debugLabel.visible = false;
    this.hudContainer.addChild(this.debugLabel);

    this.input.attach();
    this.input.onInteract(() => {
      if (this.currentNearbyNPC) {
        this.callbacks.onInteract(this.currentNearbyNPC);
      }
    });
    this.input.onDebugToggle(() => {
      this.debugOverlay?.toggle();
      if (this.debugLabel) {
        this.debugLabel.visible = this.debugOverlay?.visible ?? false;
      }
    });

    this.app.ticker.add(this.update, this);
  }

  private spawnPlayer(position: Vec2): void {
    this.player = new Player(position, {
      onPositionChange: this.callbacks.onPlayerPositionChange,
    });
    this.worldContainer.addChild(this.player.container);
  }

  private spawnNPCs(): void {
    const defs = this.options.npcs ?? [];
    for (const def of defs) {
      const npc = new NPCEntity(def);
      this.npcs.push(npc);
      this.worldContainer.addChild(npc.container);
    }
  }

  private findWalkable(
    collision: boolean[][],
    col: number,
    row: number,
  ): { col: number; row: number } {
    const ok = (c: number, r: number): boolean =>
      r >= 0 && r < MAP_ROWS && c >= 0 && c < MAP_COLS && !collision[r]?.[c];

    const walkableNeighbors = (c: number, r: number): number => {
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          if (ok(c + dc, r + dr)) count++;
        }
      }
      return count;
    };

    if (ok(col, row) && walkableNeighbors(col, row) >= MIN_WALKABLE_NEIGHBORS) {
      return { col, row };
    }

    for (let radius = 1; radius < Math.max(MAP_COLS, MAP_ROWS); radius++) {
      let best: { col: number; row: number; n: number } | null = null;
      for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
          const r = row + dr;
          const c = col + dc;
          if (!ok(c, r)) continue;
          const n = walkableNeighbors(c, r);
          if (n < MIN_WALKABLE_NEIGHBORS) continue;
          if (!best || n > best.n) best = { col: c, row: r, n };
        }
      }
      if (best) return { col: best.col, row: best.row };
    }
    return { col, row };
  }

  private update = (): void => {
    const dt = this.app.ticker.deltaMS / 1000;
    const dir = this.input.getDirection();

    const prevX = this.player.position.x;
    const prevY = this.player.position.y;
    this.player.move(dir, dt);

    const resolved = this.collision.resolveMove(
      prevX,
      prevY,
      this.player.position.x,
      this.player.position.y,
    );
    this.player.position.x = resolved.x;
    this.player.position.y = resolved.y;

    this.player.sync();

    if (this.debugLabel?.visible) {
      const col = Math.floor(this.player.position.x / TILE_SIZE);
      const row = Math.floor(this.player.position.y / TILE_SIZE);
      this.debugLabel.text = `tile [${col}, ${row}]   \`=hide`;
      this.debugLabel.y = this.app.screen.height - 28;
    }

    this.updateCamera();

    let closest: { npc: NPC; dist: number } | null = null;
    for (const npc of this.npcs) {
      const dx = npc.def.position.x - this.player.position.x;
      const dy = npc.def.position.y - this.player.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < INTERACTION_RADIUS && (!closest || dist < closest.dist)) {
        closest = { npc: npc.def, dist };
      }
    }

    const nearby = closest?.npc ?? null;
    if (nearby?.id !== this.currentNearbyNPC?.id) {
      this.currentNearbyNPC = nearby;
      this.callbacks.onNearbyNPCChange(nearby);
    }
  };

  private updateCamera(): void {
    const screen = this.app.screen;

    let x: number;
    if (MAP_WIDTH_PX <= screen.width) {
      x = (screen.width - MAP_WIDTH_PX) / 2;
    } else {
      const target = screen.width / 2 - this.player.position.x;
      x = Math.max(screen.width - MAP_WIDTH_PX, Math.min(0, target));
    }

    let y: number;
    if (MAP_HEIGHT_PX <= screen.height) {
      y = (screen.height - MAP_HEIGHT_PX) / 2;
    } else {
      const target = screen.height / 2 - this.player.position.y;
      y = Math.max(screen.height - MAP_HEIGHT_PX, Math.min(0, target));
    }

    this.worldContainer.x = x;
    this.worldContainer.y = y;
  }

  destroy(): void {
    this.app.ticker.remove(this.update, this);
    this.input.detach();
    this.container.destroy({ children: true });
  }
}
