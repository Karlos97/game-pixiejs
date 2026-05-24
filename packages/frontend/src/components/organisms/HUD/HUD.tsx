import { useGameStore } from "../../../store/gameStore";
import { BalanceBadge } from "../../molecules/BalanceBadge";
import { Label } from "../../atoms/Label";
import styles from "./HUD.module.scss";

export function HUD() {
  const coins = useGameStore((s) => s.coins);
  const playerName = useGameStore((s) => s.playerName);

  return (
    <div className={styles.hud}>
      <div className={styles.left}>
        <Label muted>Player</Label>
        <div className={styles.playerName}>{playerName ?? "—"}</div>
      </div>
      <div className={styles.right}>
        <BalanceBadge amount={coins} />
      </div>
    </div>
  );
}
