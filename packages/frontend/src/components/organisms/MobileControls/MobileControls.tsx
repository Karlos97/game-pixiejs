import { useCallback, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useGameStore } from "../../../store/gameStore";
import { virtualInput } from "../../../game/systems/virtualInput";
import styles from "./MobileControls.module.scss";

type Direction = "up" | "down" | "left" | "right";

const DIRECTION_VECTOR: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function MobileControls() {
  const nearbyNPC = useGameStore((s) => s.nearbyNPC);
  const dialogOpen = useGameStore((s) => s.dialogOpen);

  const pointerIdRef = useRef<number | null>(null);
  const activeDirRef = useRef<Direction | null>(null);

  const setActive = useCallback((dir: Direction | null) => {
    if (dir === activeDirRef.current) return;
    activeDirRef.current = dir;
    if (dir === null) {
      virtualInput.clearDirection();
    } else {
      const v = DIRECTION_VECTOR[dir];
      virtualInput.setDirection(v.x, v.y);
    }
  }, []);

  const dirAtPoint = (clientX: number, clientY: number): Direction | null => {
    const el = document.elementFromPoint(clientX, clientY);
    if (!el) return null;
    const button = (el as HTMLElement).closest<HTMLElement>("[data-dir]");
    if (!button) return null;
    const dir = button.dataset.dir;
    if (dir === "up" || dir === "down" || dir === "left" || dir === "right") return dir;
    return null;
  };

  const handlePadPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== null) return;
    pointerIdRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    setActive(dirAtPoint(e.clientX, e.clientY));
  };

  const handlePadPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    setActive(dirAtPoint(e.clientX, e.clientY));
  };

  const releasePad = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    pointerIdRef.current = null;
    setActive(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleActionPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    virtualInput.triggerInteract();
  };

  const actionEnabled = Boolean(nearbyNPC) && !dialogOpen;

  return (
    <div className={styles.root} aria-hidden={false}>
      <div
        className={styles.dpad}
        role="group"
        aria-label="Movement controls"
        onPointerDown={handlePadPointerDown}
        onPointerMove={handlePadPointerMove}
        onPointerUp={releasePad}
        onPointerCancel={releasePad}
      >
        <button
          type="button"
          className={`${styles.arrow} ${styles.up}`}
          data-dir="up"
          aria-label="Move up"
        >
          <Chevron direction="up" />
        </button>
        <button
          type="button"
          className={`${styles.arrow} ${styles.left}`}
          data-dir="left"
          aria-label="Move left"
        >
          <Chevron direction="left" />
        </button>
        <div className={styles.center} aria-hidden="true" />
        <button
          type="button"
          className={`${styles.arrow} ${styles.right}`}
          data-dir="right"
          aria-label="Move right"
        >
          <Chevron direction="right" />
        </button>
        <button
          type="button"
          className={`${styles.arrow} ${styles.down}`}
          data-dir="down"
          aria-label="Move down"
        >
          <Chevron direction="down" />
        </button>
      </div>

      <button
        type="button"
        className={`${styles.action} ${actionEnabled ? styles.actionActive : ""}`}
        aria-label="Interact"
        onPointerDown={handleActionPointerDown}
      >
        <span className={styles.actionLabel}>E</span>
      </button>
    </div>
  );
}

function Chevron({ direction }: { direction: Direction }) {
  const rotations: Record<Direction, number> = {
    up: 0,
    right: 90,
    down: 180,
    left: 270,
  };
  return (
    <svg
      viewBox="0 0 24 24"
      width="28"
      height="28"
      style={{ transform: `rotate(${rotations[direction]}deg)` }}
      aria-hidden="true"
    >
      <path
        d="M12 6 L4 16 L8 16 L12 11 L16 16 L20 16 Z"
        fill="currentColor"
      />
    </svg>
  );
}
