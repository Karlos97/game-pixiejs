import { Coin } from "../../atoms/Coin";
import styles from "./BalanceBadge.module.scss";

interface Props {
  amount: number;
}

export function BalanceBadge({ amount }: Props) {
  return (
    <div className={styles.badge} role="status" aria-label="Balance">
      <Coin />
      <span className={styles.amount}>{amount.toLocaleString()}</span>
    </div>
  );
}
