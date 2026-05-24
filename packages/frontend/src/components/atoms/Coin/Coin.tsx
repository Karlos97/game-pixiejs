import styles from "./Coin.module.scss";

export function Coin() {
  return (
    <span className={styles.coin} aria-hidden="true">
      ●
    </span>
  );
}
