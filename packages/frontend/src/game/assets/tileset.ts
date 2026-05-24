import { Assets, Rectangle, Texture } from "pixi.js";

export const TILE_SIZE = 32;
export const TILESET_PATH = "/assets/magecity.png";

export type TileCoord = readonly [col: number, row: number];

export const TILE = {
  GRASS: [0, 0],
  GRASS_TUFT_A: [2, 1],
  GRASS_TUFT_B: [3, 1],

  COBBLE_A: [0, 9],
  COBBLE_B: [1, 9],
  COBBLE_C: [2, 9],
  COBBLE_D: [3, 9],

  PATH_EDGE_TL: [4, 29],
  PATH_EDGE_TR: [5, 29],
  PATH_EDGE_BL: [6, 29],
  PATH_EDGE_BR: [7, 29],

  WALL_STONE: [0, 4],
  WALL_STONE_DARK: [0, 5],
  WALL_BRICK_GREY: [0, 35],
  WALL_BRICK_BROWN: [0, 37],
  WALL_WOOD_PLANK: [0, 23],

  TREE_BRANCHES: [2, 2],
  BUSH: [3, 1],
  BARREL: [1, 3],
  POT_PLANT: [4, 0],
  ORANGE_LEAVES: [2, 30],
  STONE_LANTERN: [5, 41],
  PUMPKIN: [6, 32],
} as const satisfies Record<string, TileCoord>;

export type TileKey = keyof typeof TILE;

let tilesetTexture: Texture | null = null;
const subTextureCache = new Map<string, Texture>();

export async function loadTileset(): Promise<Texture> {
  if (tilesetTexture) return tilesetTexture;
  tilesetTexture = await Assets.load<Texture>(TILESET_PATH);
  tilesetTexture.source.scaleMode = "nearest";
  return tilesetTexture;
}

export function getTileTexture(coord: TileCoord): Texture {
  if (!tilesetTexture) {
    throw new Error("Tileset not loaded — call loadTileset() first");
  }
  const [col, row] = coord;
  const key = `${col},${row}`;
  const cached = subTextureCache.get(key);
  if (cached) return cached;

  const frame = new Rectangle(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
  const sub = new Texture({ source: tilesetTexture.source, frame });
  subTextureCache.set(key, sub);
  return sub;
}
