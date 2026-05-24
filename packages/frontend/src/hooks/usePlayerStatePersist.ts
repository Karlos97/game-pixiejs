import { useEffect, useRef } from "react";
import { useGameStore } from "../store/gameStore";
import { savePlayerPosition } from "../api";

const DEBOUNCE_MS = 1000;

export function usePlayerStatePersist(): void {
  const playerPosition = useGameStore((state) => state.playerPosition);
  const hasLoadedState = useGameStore((state) => state.hasLoadedState);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!hasLoadedState) return;
    if (!playerPosition) return;

    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }

    const pos = playerPosition;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      savePlayerPosition(pos.x, pos.y).catch((err) => {
        console.warn("Failed to save player position:", err);
      });
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [hasLoadedState, playerPosition]);
}
