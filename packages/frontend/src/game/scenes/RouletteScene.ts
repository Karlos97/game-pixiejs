import { Application, Container, Graphics, Text } from "pixi.js";
import gsap from "gsap";
import {
  ROULETTE_WHEEL_ORDER,
  rouletteColorForNumber,
  type RouletteSpinResponse,
} from "@experiments/shared";
import { useGameStore } from "../../store/gameStore";
import { burstParticles } from "../effects/Particles";

const WHEEL_OUTER_RADIUS = 180;
const WHEEL_INNER_RADIUS = 90;
const HUB_RADIUS = 35;
const LABEL_RADIUS = 140;
const OUTER_RING_RADIUS = 195;
const OUTER_RING_WIDTH = 6;
const BALL_RADIUS = 8;
const BALL_ORBIT_RADIUS = 150;
const CABINET_W = 480;
const CABINET_H = 480;
const CABINET_BORDER = 6;

const COLOR_RED = 0xc0392b;
const COLOR_BLACK = 0x1c1c1c;
const COLOR_GREEN = 0x27ae60;
const COLOR_FELT = 0x0e3c2c;
const COLOR_GOLD = 0xf1c40f;

const IDLE_WHEEL_SPEED = 0.15;
const SPIN_WHEEL_SPEED = 8;
const SPIN_BALL_SPEED = -12;
const STOP_DURATION = 3.0;
const EXTRA_REVOLUTIONS = 4;

const WHEEL_SLOTS = ROULETTE_WHEEL_ORDER.length;
const ANGLE_PER_SLOT = (Math.PI * 2) / WHEEL_SLOTS;

interface WedgeView {
  graphics: Graphics;
  index: number;
  number: number;
}

type SpinPhase = "idle" | "spinning" | "stopping";

export class RouletteScene {
  public container: Container;
  private cabinet: Container;
  private wheel: Container;
  private ballLayer: Container;
  private ball: Graphics;
  private highlightLayer: Container;
  private wedges: WedgeView[] = [];

  private phase: SpinPhase = "idle";
  private wheelAngularVelocity = IDLE_WHEEL_SPEED;
  private ballAngularVelocity = 0;
  private idleTicker: ((time: number, deltaTime: number) => void) | null = null;
  private wheelStopTween: gsap.core.Tween | null = null;
  private ballStopTween: gsap.core.Tween | null = null;

  private unsubscribe: (() => void) | null = null;
  private resizeHandler: (() => void) | null = null;
  private loaded = false;

  private activeHighlights: Array<gsap.core.Tween> = [];
  private highlightGraphics: Graphics | null = null;

  private currentSlotIndex = 0;

  constructor(private app: Application) {
    this.container = new Container();
    this.container.visible = false;

    this.cabinet = new Container();
    this.wheel = new Container();
    this.ballLayer = new Container();
    this.highlightLayer = new Container();
    this.ball = new Graphics();

    this.container.addChild(this.cabinet);
    this.cabinet.addChild(this.wheel);
    this.wheel.addChild(this.highlightLayer);
    this.cabinet.addChild(this.ballLayer);
    this.ballLayer.addChild(this.ball);
  }

  async load(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;

    this.buildCabinetBackground();
    this.buildWheel();
    this.buildOuterRing();
    this.buildHub();
    this.buildBall();
    this.placeBallOnSlot(0);
    this.centerContainer();

    this.resizeHandler = (): void => this.centerContainer();
    this.app.renderer.on("resize", this.resizeHandler);
  }

  private buildCabinetBackground(): void {
    const bg = new Graphics();
    bg.roundRect(-CABINET_W / 2, -CABINET_H / 2, CABINET_W, CABINET_H, 24);
    bg.fill({ color: COLOR_FELT });
    bg.stroke({ color: COLOR_GOLD, width: CABINET_BORDER });
    this.cabinet.addChildAt(bg, 0);

    const title = new Text({
      text: "LUCKY WHEEL",
      style: {
        fontFamily: "monospace",
        fontSize: 22,
        fontWeight: "bold",
        fill: COLOR_GOLD,
        stroke: { color: 0x000000, width: 3 },
      },
    });
    title.anchor.set(0.5, 1);
    title.position.set(0, -CABINET_H / 2 - 6);
    this.cabinet.addChild(title);

    const hint = new Text({
      text: "ESC to leave",
      style: {
        fontFamily: "monospace",
        fontSize: 12,
        fill: 0xaab2c8,
      },
    });
    hint.anchor.set(0.5, 0);
    hint.position.set(0, CABINET_H / 2 + 6);
    this.cabinet.addChild(hint);
  }

  private buildWheel(): void {
    for (let i = 0; i < WHEEL_SLOTS; i++) {
      const number = ROULETTE_WHEEL_ORDER[i]!;
      const angleStart = i * ANGLE_PER_SLOT - Math.PI / 2 - ANGLE_PER_SLOT / 2;
      const angleEnd = angleStart + ANGLE_PER_SLOT;
      const color = rouletteColorForNumber(number);
      const fillColor =
        color === "red" ? COLOR_RED : color === "black" ? COLOR_BLACK : COLOR_GREEN;

      const wedge = new Graphics();
      wedge.moveTo(0, 0);
      wedge.arc(0, 0, WHEEL_OUTER_RADIUS, angleStart, angleEnd);
      wedge.lineTo(0, 0);
      wedge.fill({ color: fillColor });
      wedge.stroke({ color: 0x000000, width: 1, alpha: 0.5 });
      this.wheel.addChild(wedge);

      this.wedges.push({ graphics: wedge, index: i, number });

      const bisector = (angleStart + angleEnd) / 2;
      const label = new Text({
        text: String(number),
        style: {
          fontFamily: "monospace",
          fontSize: 14,
          fontWeight: "bold",
          fill: number === 0 ? 0xffeb3b : 0xffffff,
          stroke: { color: 0x000000, width: 2 },
          align: "center",
        },
      });
      label.anchor.set(0.5);
      label.position.set(
        Math.cos(bisector) * LABEL_RADIUS,
        Math.sin(bisector) * LABEL_RADIUS,
      );
      label.rotation = bisector + Math.PI / 2;
      this.wheel.addChild(label);
    }
  }

  private buildOuterRing(): void {
    const ring = new Graphics();
    ring.circle(0, 0, OUTER_RING_RADIUS);
    ring.stroke({ color: COLOR_GOLD, width: OUTER_RING_WIDTH });
    this.cabinet.addChild(ring);

    const innerRing = new Graphics();
    innerRing.circle(0, 0, WHEEL_OUTER_RADIUS + 2);
    innerRing.stroke({ color: 0x000000, width: 2, alpha: 0.6 });
    this.cabinet.addChild(innerRing);
  }

  private buildHub(): void {
    const hub = new Graphics();
    hub.circle(0, 0, HUB_RADIUS);
    hub.fill({ color: 0x101010 });
    hub.stroke({ color: COLOR_GOLD, width: 2 });
    this.wheel.addChild(hub);
  }

  private buildBall(): void {
    this.ball.clear();
    this.ball.circle(0, 0, BALL_RADIUS);
    this.ball.fill({ color: 0xffffff });
    this.ball.stroke({ color: 0x303030, width: 1, alpha: 0.6 });
    this.ball.circle(1.5, 1.5, BALL_RADIUS - 3);
    this.ball.stroke({ color: 0x000000, width: 1, alpha: 0.2 });
  }

  private placeBallOnSlot(slotIndex: number): void {
    this.currentSlotIndex = slotIndex;
    this.ball.position.set(0, -BALL_ORBIT_RADIUS);
    this.ballLayer.rotation = 0;
    this.wheel.rotation = this.wheelRotationForSlot(slotIndex);
  }

  private wheelRotationForSlot(slotIndex: number): number {
    return -slotIndex * ANGLE_PER_SLOT;
  }

  show(): void {
    this.container.visible = true;
    this.centerContainer();
    this.clearHighlights();
    this.startIdleTicker();
    this.subscribeStore();
    const state = this.readStore();
    if (state.isRouletteSpinning) {
      this.startSpinning();
    }
  }

  hide(): void {
    this.container.visible = false;
    this.unsubscribeStore();
    this.stopIdleTicker();
    this.killStopTweens();
    this.clearHighlights();
    this.phase = "idle";
    this.wheelAngularVelocity = IDLE_WHEEL_SPEED;
    this.ballAngularVelocity = 0;
  }

  destroy(): void {
    this.hide();
    if (this.resizeHandler) {
      this.app.renderer.off("resize", this.resizeHandler);
      this.resizeHandler = null;
    }
    this.container.destroy({ children: true });
  }

  private centerContainer(): void {
    this.container.position.set(
      this.app.renderer.width / 2,
      this.app.renderer.height * 0.36,
    );
  }

  private readStore(): {
    isRouletteSpinning: boolean;
    lastRouletteResult: RouletteSpinResponse | null;
    scene: string;
  } {
    const state = useGameStore.getState() as unknown as Record<string, unknown>;
    return {
      isRouletteSpinning: Boolean(state.isRouletteSpinning),
      lastRouletteResult:
        (state.lastRouletteResult as RouletteSpinResponse | null | undefined) ?? null,
      scene: typeof state.scene === "string" ? (state.scene as string) : "world",
    };
  }

  private setSpinningFalseInStore(): void {
    const state = useGameStore.getState() as unknown as Record<string, unknown>;
    const fn = state.setIsRouletteSpinning;
    if (typeof fn === "function") {
      (fn as (v: boolean) => void)(false);
    }
  }

  private subscribeStore(): void {
    if (this.unsubscribe) return;
    let prev = this.readStore();
    this.unsubscribe = useGameStore.subscribe(() => {
      const next = this.readStore();
      const prior = prev;
      prev = next;

      if (next.isRouletteSpinning && !prior.isRouletteSpinning) {
        this.startSpinning();
      }
      if (
        next.lastRouletteResult &&
        next.lastRouletteResult !== prior.lastRouletteResult
      ) {
        this.stopOn(next.lastRouletteResult);
      }
    });
  }

  private unsubscribeStore(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  private startIdleTicker(): void {
    if (this.idleTicker) return;
    const tick = (_t: number, deltaTime: number): void => {
      const dt = deltaTime / 1000;
      if (this.phase !== "stopping") {
        this.wheel.rotation += this.wheelAngularVelocity * dt;
        this.ballLayer.rotation += this.ballAngularVelocity * dt;
      }
    };
    this.idleTicker = tick;
    gsap.ticker.add(tick);
  }

  private stopIdleTicker(): void {
    if (this.idleTicker) {
      gsap.ticker.remove(this.idleTicker);
      this.idleTicker = null;
    }
  }

  private startSpinning(): void {
    this.killStopTweens();
    this.clearHighlights();
    this.phase = "spinning";
    gsap.to(this, {
      wheelAngularVelocity: SPIN_WHEEL_SPEED,
      ballAngularVelocity: SPIN_BALL_SPEED,
      duration: 0.6,
      ease: "power1.in",
      overwrite: "auto",
    });
  }

  private stopOn(result: RouletteSpinResponse): void {
    const winningNumber = result.winningNumber;
    const slotIndex = ROULETTE_WHEEL_ORDER.indexOf(winningNumber);
    if (slotIndex < 0) {
      this.coastToStop();
      return;
    }

    this.phase = "stopping";
    this.killStopTweens();

    const baseTarget = this.wheelRotationForSlot(slotIndex);
    const currentRot = this.wheel.rotation;
    const twoPi = Math.PI * 2;
    let target = baseTarget;
    while (target < currentRot) target += twoPi;
    target += EXTRA_REVOLUTIONS * twoPi;

    const ballCurrent = this.ballLayer.rotation;
    let ballTarget = 0;
    while (ballTarget > ballCurrent) ballTarget -= twoPi;
    ballTarget -= EXTRA_REVOLUTIONS * twoPi;

    this.wheelStopTween = gsap.to(this.wheel, {
      rotation: target,
      duration: STOP_DURATION,
      ease: "power3.out",
      onComplete: () => {
        this.wheel.rotation = baseTarget;
        this.currentSlotIndex = slotIndex;
        this.wheelStopTween = null;
        this.finalizeStop(slotIndex, result.totalPayout);
      },
    });

    this.ballStopTween = gsap.to(this.ballLayer, {
      rotation: ballTarget,
      duration: STOP_DURATION,
      ease: "power4.out",
      onComplete: () => {
        this.ballLayer.rotation = 0;
        this.ballStopTween = null;
      },
    });
  }

  private coastToStop(): void {
    this.phase = "stopping";
    gsap.to(this, {
      wheelAngularVelocity: IDLE_WHEEL_SPEED,
      ballAngularVelocity: 0,
      duration: 1.2,
      ease: "power2.out",
      onComplete: () => {
        this.phase = "idle";
        this.setSpinningFalseInStore();
      },
      overwrite: "auto",
    });
  }

  private finalizeStop(slotIndex: number, totalPayout: number): void {
    this.wheelAngularVelocity = IDLE_WHEEL_SPEED;
    this.ballAngularVelocity = 0;
    this.phase = "idle";
    this.setSpinningFalseInStore();
    this.highlightWinningWedge(slotIndex);
    if (totalPayout > 0) {
      burstParticles(this.cabinet, {
        x: 0,
        y: -BALL_ORBIT_RADIUS * 0.4,
        count: 48,
        spread: 360,
        duration: 1.6,
      });
    }
  }

  private killStopTweens(): void {
    if (this.wheelStopTween) {
      this.wheelStopTween.kill();
      this.wheelStopTween = null;
    }
    if (this.ballStopTween) {
      this.ballStopTween.kill();
      this.ballStopTween = null;
    }
  }

  private clearHighlights(): void {
    for (const tween of this.activeHighlights) tween.kill();
    this.activeHighlights = [];
    if (this.highlightGraphics) {
      this.highlightGraphics.destroy();
      this.highlightGraphics = null;
    }
  }

  private highlightWinningWedge(slotIndex: number): void {
    this.clearHighlights();
    const angleStart = slotIndex * ANGLE_PER_SLOT - Math.PI / 2 - ANGLE_PER_SLOT / 2;
    const angleEnd = angleStart + ANGLE_PER_SLOT;

    const graphic = new Graphics();
    graphic.moveTo(0, 0);
    graphic.arc(0, 0, WHEEL_OUTER_RADIUS + 4, angleStart, angleEnd);
    graphic.lineTo(0, 0);
    graphic.stroke({ color: COLOR_GOLD, width: 4 });
    this.highlightLayer.addChild(graphic);
    this.highlightGraphics = graphic;

    graphic.alpha = 0;
    const fadeIn = gsap.to(graphic, {
      alpha: 1,
      duration: 0.25,
      ease: "power2.out",
    });
    const pulse = gsap.to(graphic.scale, {
      x: 1.05,
      y: 1.05,
      duration: 0.35,
      ease: "sine.inOut",
      yoyo: true,
      repeat: 3,
    });
    const fadeOut = gsap.to(graphic, {
      alpha: 0,
      duration: 0.5,
      delay: 2.0,
      ease: "power2.in",
      onComplete: () => {
        if (this.highlightGraphics === graphic) {
          graphic.destroy();
          this.highlightGraphics = null;
        }
      },
    });
    this.activeHighlights.push(fadeIn, pulse, fadeOut);
  }
}
