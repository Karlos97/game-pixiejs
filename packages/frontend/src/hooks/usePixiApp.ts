import { useEffect, useRef } from "react";
import { GameApp } from "../game/GameApp";

export function usePixiApp() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<GameApp | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const app = new GameApp();
    appRef.current = app;
    app.init(containerRef.current);

    return () => {
      app.destroy();
      appRef.current = null;
    };
  }, []);

  return containerRef;
}
