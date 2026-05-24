import { Container, Text } from "pixi.js";
import type { NPC } from "@experiments/shared";

export class NPCEntity {
  public container: Container;

  constructor(public def: NPC) {
    this.container = new Container();
    this.container.x = def.position.x;
    this.container.y = def.position.y;

    const label = new Text({
      text: def.name,
      style: {
        fontFamily: "system-ui",
        fontSize: 13,
        fontWeight: "bold",
        fill: "#ffffff",
        stroke: { color: "#000000", width: 3 },
      },
    });
    label.anchor.set(0.5, 1);
    label.y = -32;
    this.container.addChild(label);
  }
}
