import { Assets, Container, Sprite, Texture } from "pixi.js";
import { CITY_TEXTURE_PATH, MAP_HEIGHT_PX, MAP_WIDTH_PX } from "../assets/tilemap";

export class TilemapRenderer {
  public container: Container;

  constructor() {
    this.container = new Container();
  }

  async load(): Promise<void> {
    const texture = await Assets.load<Texture>(CITY_TEXTURE_PATH);
    texture.source.scaleMode = "nearest";

    const sprite = new Sprite(texture);
    sprite.x = 0;
    sprite.y = 0;
    sprite.width = MAP_WIDTH_PX;
    sprite.height = MAP_HEIGHT_PX;
    this.container.addChild(sprite);
  }
}
