import type { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.scss";

type Variant = "primary" | "secondary" | "danger";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className, ...rest }: Props) {
  return (
    <button
      className={`${styles.button} ${styles[variant]} ${className ?? ""}`}
      {...rest}
    />
  );
}
