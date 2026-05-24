import type { ReactNode } from "react";
import styles from "./GameTemplate.module.scss";

interface Props {
  canvas: ReactNode;
  hud: ReactNode;
  overlays: ReactNode;
}

export function GameTemplate({ canvas, hud, overlays }: Props) {
  return (
    <div className={styles.template}>
      {canvas}
      {hud}
      {overlays}
    </div>
  );
}
