export const CITY_TEXTURE_PATH = "/assets/citymap.png";
export const COLLISION_JSON_PATH = "/assets/citymap_collision.json";

export const TILE_SIZE = 32;
export const MAP_COLS = 40;
export const MAP_ROWS = 40;
export const MAP_WIDTH_PX = MAP_COLS * TILE_SIZE;
export const MAP_HEIGHT_PX = MAP_ROWS * TILE_SIZE;

export async function loadCollision(): Promise<boolean[][]> {
  const res = await fetch(COLLISION_JSON_PATH);
  if (!res.ok) {
    throw new Error(`Failed to load collision: ${res.status}`);
  }
  const data = (await res.json()) as boolean[][];
  return data;
}
