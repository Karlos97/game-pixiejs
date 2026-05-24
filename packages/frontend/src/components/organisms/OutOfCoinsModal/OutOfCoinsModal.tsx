import { useState } from "react";
import { useGameStore } from "../../../store/gameStore";
import { Button } from "../../atoms/Button";
import { resetBalance } from "../../../api";
import styles from "./OutOfCoinsModal.module.scss";

export function OutOfCoinsModal() {
  const open = useGameStore((s) => s.outOfCoinsModalOpen);
  const playerName = useGameStore((s) => s.playerName);
  const setCoins = useGameStore((s) => s.setCoins);
  const hide = useGameStore((s) => s.hideOutOfCoinsModal);

  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const handleRestart = async () => {
    if (playerName === null) return;
    setBusy(true);
    try {
      const newBalance = await resetBalance();
      setCoins(newBalance);
      hide();
    } catch (err) {
      console.warn("Reset failed:", err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true">
      <div className={styles.panel}>
        <h2 className={styles.title}>Out of coins</h2>
        <p className={styles.body}>
          That bet would exceed your balance. Restart your balance to 1000 coins and keep
          playing?
        </p>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={hide} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleRestart}
            disabled={busy}
            className={styles.restart}
          >
            {busy ? "Restarting…" : "Restart (free 1000)"}
          </Button>
        </div>
      </div>
    </div>
  );
}
