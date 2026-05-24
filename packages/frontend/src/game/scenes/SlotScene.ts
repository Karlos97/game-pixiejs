import { Application, Container, Graphics, Text } from "pixi.js";
import gsap from "gsap";
import {
  SLOT_REELS,
  SLOT_ROWS,
  SLOT_SYMBOLS,
  type Payline,
  type SlotSpinResponse,
  type SlotSymbol,
} from "@experiments/shared";
import { useGameStore } from "../../store/gameStore";
import { burstParticles } from "../effects/Particles";

const CELL_SIZE = 100;
const CELL_GAP = 8;
const REEL_STRIP_LENGTH = 20;
const CABINET_PADDING = 24;
const CABINET_BORDER = 6;
const REEL_STOP_STAGGER = 0.2;
const REEL_STOP_DURATION = 0.9;
const HIGHLIGHT_AUTO_FADE = 1.6;

const SYMBOL_GLYPH: Record<SlotSymbol, string> = {
  CHERRY: "🍒",
  LEMON: "🍋",
  BELL: "🔔",
  STAR: "⭐",
  GEM: "💎",
  SEVEN: "7",
};

const SYMBOL_COLOR: Record<SlotSymbol, number> = {
  CHERRY: 0xc0392b,
  LEMON: 0xf1c40f,
  BELL: 0xe67e22,
  STAR: 0xf39c12,
  GEM: 0x3498db,
  SEVEN: 0x8e44ad,
};

interface CellView {
  container: Container;
  bg: Graphics;
  text: Text;
  symbol: SlotSymbol;
}

interface ReelView {
  strip: Container;
  viewport: Container;
  cells: CellView[];
  scrollY: number;
  loopTicker: ((time: number, deltaTime: number) => void) | null;
  landTween: gsap.core.Tween | null;
}

const CELL_PITCH = CELL_SIZE + CELL_GAP;

function randomSymbol(): SlotSymbol {
  return SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]!;
}

export class SlotScene {
  public container: Container;
  private cabinet: Container;
  private reelsContainer: Container;
  private highlightLayer: Container;
  private reels: ReelView[] = [];
  private unsubscribe: (() => void) | null = null;
  private resizeHandler: (() => void) | null = null;
  private loaded = false;
  private activeHighlights: gsap.core.Tween[] = [];

  constructor(private app: Application) {
    this.container = new Container();
    this.container.visible = false;
    this.cabinet = new Container();
    this.reelsContainer = new Container();
    this.highlightLayer = new Container();
    this.container.addChild(this.cabinet);
    this.cabinet.addChild(this.reelsContainer);
    this.cabinet.addChild(this.highlightLayer);
  }

  async load(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;

    this.buildCabinet();
    this.buildReels();
    this.centerContainer();

    this.resizeHandler = () => this.centerContainer();
    this.app.renderer.on("resize", this.resizeHandler);
  }

  private buildCabinet(): void {
    const innerW = SLOT_REELS * CELL_SIZE + (SLOT_REELS - 1) * CELL_GAP;
    const innerH = SLOT_ROWS * CELL_SIZE + (SLOT_ROWS - 1) * CELL_GAP;
    const totalW = innerW + CABINET_PADDING * 2;
    const totalH = innerH + CABINET_PADDING * 2;

    const bg = new Graphics();
    bg.roundRect(-totalW / 2, -totalH / 2, totalW, totalH, 20);
    bg.fill({ color: 0x121a2a });
    bg.stroke({ color: 0xf1c40f, width: CABINET_BORDER });

    const title = new Text({
      text: "SLOTS",
      style: {
        fontFamily: "monospace",
        fontSize: 22,
        fontWeight: "bold",
        fill: 0xf1c40f,
        stroke: { color: 0x000000, width: 3 },
      },
    });
    title.anchor.set(0.5, 1);
    title.position.set(0, -totalH / 2 - 6);

    const hint = new Text({
      text: "ESC to leave",
      style: {
        fontFamily: "monospace",
        fontSize: 12,
        fill: 0xaab2c8,
      },
    });
    hint.anchor.set(0.5, 0);
    hint.position.set(0, totalH / 2 + 6);

    this.cabinet.addChildAt(bg, 0);
    this.cabinet.addChild(title, hint);

    this.reelsContainer.position.set(-innerW / 2, -innerH / 2);
    this.highlightLayer.position.set(-innerW / 2, -innerH / 2);
  }

  private buildReels(): void {
    for (let col = 0; col < SLOT_REELS; col++) {
      const viewport = new Container();
      viewport.x = col * CELL_PITCH;
      viewport.y = 0;

      const mask = new Graphics();
      const maskH = SLOT_ROWS * CELL_SIZE + (SLOT_ROWS - 1) * CELL_GAP;
      mask.rect(0, 0, CELL_SIZE, maskH);
      mask.fill({ color: 0xffffff });
      viewport.addChild(mask);
      viewport.mask = mask;

      const strip = new Container();
      viewport.addChild(strip);

      const cells: CellView[] = [];
      for (let i = 0; i < REEL_STRIP_LENGTH; i++) {
        const symbol = randomSymbol();
        const cell = this.createCell(symbol);
        cell.container.y = i * CELL_PITCH;
        strip.addChild(cell.container);
        cells.push(cell);
      }

      this.reelsContainer.addChild(viewport);
      this.reels.push({
        strip,
        viewport,
        cells,
        scrollY: 0,
        loopTicker: null,
        landTween: null,
      });

      this.setReelScroll(this.reels[col]!, 0);
    }
  }

  private createCell(symbol: SlotSymbol): CellView {
    const container = new Container();
    const bg = new Graphics();
    this.paintCellBg(bg, symbol);
    container.addChild(bg);

    const isSeven = symbol === "SEVEN";
    const text = new Text({
      text: SYMBOL_GLYPH[symbol],
      style: {
        fontFamily: isSeven
          ? "monospace"
          : '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", system-ui, sans-serif',
        fontSize: isSeven ? 56 : 52,
        fontWeight: isSeven ? "bold" : "normal",
        fill: isSeven ? 0xffffff : 0xffffff,
        stroke: isSeven ? { color: 0x000000, width: 4 } : undefined,
        align: "center",
      },
    });
    text.anchor.set(0.5);
    text.position.set(CELL_SIZE / 2, CELL_SIZE / 2);
    container.addChild(text);

    return { container, bg, text, symbol };
  }

  private paintCellBg(graphic: Graphics, symbol: SlotSymbol): void {
    graphic.clear();
    graphic.roundRect(0, 0, CELL_SIZE, CELL_SIZE, 12);
    graphic.fill({ color: SYMBOL_COLOR[symbol], alpha: 0.85 });
    graphic.stroke({ color: 0x0a0e18, width: 2 });
  }

  private setCellSymbol(cell: CellView, symbol: SlotSymbol): void {
    cell.symbol = symbol;
    cell.text.text = SYMBOL_GLYPH[symbol];
    this.paintCellBg(cell.bg, symbol);
  }

  private setReelScroll(reel: ReelView, scrollY: number): void {
    reel.scrollY = scrollY;
    const stripHeight = REEL_STRIP_LENGTH * CELL_PITCH;
    reel.strip.y = 0;
    const offset = CELL_PITCH;
    for (let i = 0; i < reel.cells.length; i++) {
      const raw = i * CELL_PITCH - scrollY + offset;
      const wrapped = ((raw % stripHeight) + stripHeight) % stripHeight;
      reel.cells[i]!.container.y = wrapped - offset;
    }
  }

  show(): void {
    this.container.visible = true;
    this.centerContainer();
    this.clearHighlights();
    const state = useGameStore.getState();
    if (state.isSpinning) {
      this.startSpinLoop();
    }
    this.subscribeStore();
  }

  hide(): void {
    this.container.visible = false;
    this.unsubscribeStore();
    this.stopAllReelLoops();
    this.killAllLandTweens();
    this.clearHighlights();
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

  private subscribeStore(): void {
    if (this.unsubscribe) return;
    let prev = useGameStore.getState();
    this.unsubscribe = useGameStore.subscribe((state) => {
      const prior = prev;
      prev = state;

      if (state.isSpinning && !prior.isSpinning) {
        this.startSpinLoop();
      }

      if (state.lastSpinResult && state.lastSpinResult !== prior.lastSpinResult) {
        this.scheduleReelsStop(state.lastSpinResult);
      }
    });
  }

  private unsubscribeStore(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  private startSpinLoop(): void {
    this.clearHighlights();
    for (const reel of this.reels) {
      this.startReelLoop(reel);
    }
  }

  private startReelLoop(reel: ReelView): void {
    if (reel.landTween) {
      reel.landTween.kill();
      reel.landTween = null;
    }
    if (reel.loopTicker) return;
    const speed = 1800;
    const tick = (_time: number, deltaTime: number): void => {
      const dt = deltaTime / 1000;
      this.setReelScroll(reel, reel.scrollY + speed * dt);
      this.refreshOffscreenCellSymbols(reel);
    };
    reel.loopTicker = tick;
    gsap.ticker.add(tick);
  }

  private stopReelLoop(reel: ReelView): void {
    if (reel.loopTicker) {
      gsap.ticker.remove(reel.loopTicker);
      reel.loopTicker = null;
    }
  }

  private stopAllReelLoops(): void {
    for (const reel of this.reels) this.stopReelLoop(reel);
  }

  private killAllLandTweens(): void {
    for (const reel of this.reels) {
      if (reel.landTween) {
        reel.landTween.kill();
        reel.landTween = null;
      }
    }
  }

  private refreshOffscreenCellSymbols(reel: ReelView): void {
    const stripHeight = REEL_STRIP_LENGTH * CELL_PITCH;
    const scrollWithin = ((reel.scrollY % stripHeight) + stripHeight) % stripHeight;
    const topVisibleIdx = Math.floor(scrollWithin / CELL_PITCH);
    for (let i = 0; i < reel.cells.length; i++) {
      const visible =
        i === topVisibleIdx ||
        i === (topVisibleIdx + 1) % REEL_STRIP_LENGTH ||
        i === (topVisibleIdx + 2) % REEL_STRIP_LENGTH ||
        i === (topVisibleIdx + 3) % REEL_STRIP_LENGTH;
      if (!visible && Math.random() < 0.02) {
        this.setCellSymbol(reel.cells[i]!, randomSymbol());
      }
    }
  }

  private scheduleReelsStop(result: SlotSpinResponse): void {
    for (let col = 0; col < SLOT_REELS; col++) {
      const reel = this.reels[col];
      if (!reel) continue;
      const finalSymbols = this.extractColumnSymbols(result, col);
      const delay = col * REEL_STOP_STAGGER;
      window.setTimeout(() => this.stopReelOn(reel, finalSymbols), delay * 1000);
    }

    const totalDelayMs =
      (SLOT_REELS - 1) * REEL_STOP_STAGGER * 1000 + REEL_STOP_DURATION * 1000;
    window.setTimeout(() => {
      const store = useGameStore.getState();
      if (store.isSpinning) {
        store.setIsSpinning(false);
      }
      this.showPaylines(result);
    }, totalDelayMs);
  }

  private extractColumnSymbols(result: SlotSpinResponse, col: number): SlotSymbol[] {
    const grid = result.symbols;
    if (!grid || grid.length === 0) {
      return [randomSymbol(), randomSymbol(), randomSymbol()];
    }
    const looksColumnFirst = grid.length === SLOT_REELS && grid[0]?.length === SLOT_ROWS;
    if (looksColumnFirst) {
      const column = grid[col];
      if (column && column.length >= SLOT_ROWS) {
        return [column[0]!, column[1]!, column[2]!];
      }
    }
    return [
      grid[0]?.[col] ?? randomSymbol(),
      grid[1]?.[col] ?? randomSymbol(),
      grid[2]?.[col] ?? randomSymbol(),
    ];
  }

  private stopReelOn(reel: ReelView, finalSymbols: SlotSymbol[]): void {
    this.stopReelLoop(reel);

    const stripHeight = REEL_STRIP_LENGTH * CELL_PITCH;

    const scrollWithin = ((reel.scrollY % stripHeight) + stripHeight) % stripHeight;
    const currentTopIdx = Math.floor(scrollWithin / CELL_PITCH);
    const landingTopIdx = (currentTopIdx + 6) % REEL_STRIP_LENGTH;

    for (let r = 0; r < SLOT_ROWS; r++) {
      const idx = (landingTopIdx + r) % REEL_STRIP_LENGTH;
      this.setCellSymbol(reel.cells[idx]!, finalSymbols[r]!);
    }

    const targetWithin = landingTopIdx * CELL_PITCH;
    let target = reel.scrollY - scrollWithin + targetWithin;
    if (target < reel.scrollY + CELL_PITCH * 3) {
      target += stripHeight;
    }

    const proxy = { y: reel.scrollY };
    reel.landTween = gsap.to(proxy, {
      y: target,
      duration: REEL_STOP_DURATION,
      ease: "power3.out",
      onUpdate: () => this.setReelScroll(reel, proxy.y),
      onComplete: () => {
        this.setReelScroll(reel, target);
        reel.landTween = null;
      },
    });
  }

  private clearHighlights(): void {
    for (const tween of this.activeHighlights) tween.kill();
    this.activeHighlights = [];
    this.highlightLayer
      .removeChildren()
      .forEach((child) => child.destroy({ children: true }));
  }

  private showPaylines(result: SlotSpinResponse): void {
    this.clearHighlights();
    if (!result.paylines || result.paylines.length === 0) return;

    for (const line of result.paylines) {
      this.drawPayline(line);
    }

    if (result.payout > 0) {
      for (const line of result.paylines) {
        const points = this.paylinePoints(line);
        if (points.length === 0) continue;
        const mid = points[Math.floor(points.length / 2)] ?? points[0]!;
        burstParticles(this.cabinet, {
          x: this.reelsContainer.x + mid.x,
          y: this.reelsContainer.y + mid.y,
          count: 26,
          spread: 220,
        });
      }
    }
  }

  private drawPayline(payline: Payline): void {
    const points = this.paylinePoints(payline);
    if (points.length < 2) return;

    const graphic = new Graphics();
    graphic.moveTo(points[0]!.x, points[0]!.y);
    for (let i = 1; i < points.length; i++) graphic.lineTo(points[i]!.x, points[i]!.y);
    graphic.stroke({ color: 0xffeb3b, width: 6, alpha: 0.95 });
    graphic.alpha = 0;
    this.highlightLayer.addChild(graphic);

    const fade = gsap.to(graphic, {
      alpha: 1,
      duration: 0.25,
      ease: "power2.out",
      onComplete: () => {
        const out = gsap.to(graphic, {
          alpha: 0,
          duration: 0.4,
          delay: HIGHLIGHT_AUTO_FADE,
          ease: "power2.in",
          onComplete: () => {
            graphic.destroy();
          },
        });
        this.activeHighlights.push(out);
      },
    });
    this.activeHighlights.push(fade);

    const cells = this.paylineCells(payline);
    for (const { col, row } of cells) {
      const cell = this.visibleCellAt(col, row);
      if (!cell) continue;
      const punch = gsap.fromTo(
        cell.container.scale,
        { x: 1, y: 1 },
        {
          x: 1.15,
          y: 1.15,
          duration: 0.18,
          ease: "back.out(2)",
          yoyo: true,
          repeat: 1,
        },
      );
      this.activeHighlights.push(punch);
    }
  }

  private paylinePoints(payline: Payline): Array<{ x: number; y: number }> {
    const cells = this.paylineCells(payline);
    return cells.map(({ col, row }) => ({
      x: col * CELL_PITCH + CELL_SIZE / 2,
      y: row * CELL_PITCH + CELL_SIZE / 2,
    }));
  }

  private paylineCells(payline: Payline): Array<{ col: number; row: number }> {
    if (payline.kind === "row") {
      const r = payline.index;
      return [
        { col: 0, row: r },
        { col: 1, row: r },
        { col: 2, row: r },
      ];
    }
    if (payline.kind === "diag-down") {
      return [
        { col: 0, row: 0 },
        { col: 1, row: 1 },
        { col: 2, row: 2 },
      ];
    }
    return [
      { col: 0, row: 2 },
      { col: 1, row: 1 },
      { col: 2, row: 0 },
    ];
  }

  private visibleCellAt(col: number, row: number): CellView | null {
    const reel = this.reels[col];
    if (!reel) return null;
    const stripHeight = REEL_STRIP_LENGTH * CELL_PITCH;
    const scrollWithin = ((reel.scrollY % stripHeight) + stripHeight) % stripHeight;
    const topIdx = Math.floor(scrollWithin / CELL_PITCH);
    const idx = (topIdx + row) % REEL_STRIP_LENGTH;
    return reel.cells[idx] ?? null;
  }
}
