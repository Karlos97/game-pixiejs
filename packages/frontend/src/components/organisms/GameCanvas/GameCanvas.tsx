import { usePixiApp } from "../../../hooks/usePixiApp";
import styles from "./GameCanvas.module.scss";

export function GameCanvas() {
  const containerRef = usePixiApp();
  return <div ref={containerRef} className={styles.canvas} />;
}
