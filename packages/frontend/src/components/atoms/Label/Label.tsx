import type { ReactNode } from "react";
import styles from "./Label.module.scss";

interface Props {
  children: ReactNode;
  muted?: boolean;
}

export function Label({ children, muted = false }: Props) {
  return <span className={muted ? styles.muted : styles.label}>{children}</span>;
}
