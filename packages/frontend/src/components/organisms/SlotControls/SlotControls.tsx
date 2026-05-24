import { useEffect, useRef, useState } from "react";
import { useGameStore } from "../../../store/gameStore";
import { Button } from "../../atoms/Button";
import { BalanceBadge } from "../../molecules/BalanceBadge";
import { spin, resetBalance, InsufficientFundsError } from "../../../api";
import styles from "./SlotControls.module.scss";

export function SlotControls() {
  const coins = useGameStore((s) => s.coins);
  const bet = useGameStore((s) => s.bet);
  const betOptions = useGameStore((s) => s.betOptions);
  const isSpinning = useGameStore((s) => s.isSpinning);
  const lastSpinResult = useGameStore((s) => s.lastSpinResult);
  const playerName = useGameStore((s) => s.playerName);
  const setBet = useGameStore((s) => s.setBet);
  const setIsSpinning = useGameStore((s) => s.setIsSpinning);
  const setLastSpinResult = useGameStore((s) => s.setLastSpinResult);
  const setCoins = useGameStore((s) => s.setCoins);
  const closeSlot = useGameStore((s) => s.closeSlot);

  const [error, setError] = useState<string | null>(null);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeSlot();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
    };
  }, [closeSlot]);

  useEffect(() => {
    return () => {
      if (safetyTimerRef.current !== null) {
        clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = null;
      }
    };
  }, []);

  const minBet = Math.min(...betOptions);
  const isBroke = coins < minBet;
  const canSpin = !isSpinning && bet <= coins && !isBroke;
  const [isResetting, setIsResetting] = useState(false);

  const handleRestart = async () => {
    if (playerName === null) return;
    setError(null);
    setIsResetting(true);
    try {
      const newBalance = await resetBalance();
      setCoins(newBalance);
      setLastSpinResult(null);
    } catch (err) {
      setError("Restart failed. Please try again.");

      console.warn("Reset error:", err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleSpin = async () => {
    if (playerName === null) return;
    setError(null);
    setIsSpinning(true);
    setLastSpinResult(null);

    if (safetyTimerRef.current !== null) {
      clearTimeout(safetyTimerRef.current);
    }
    safetyTimerRef.current = setTimeout(() => {
      setIsSpinning(false);
      safetyTimerRef.current = null;
    }, 4000);

    try {
      const result = await spin({ bet });
      setCoins(result.newCoinBalance);
      setLastSpinResult(result);
    } catch (err) {
      setIsSpinning(false);
      if (safetyTimerRef.current !== null) {
        clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = null;
      }
      if (err instanceof InsufficientFundsError) {
        if (typeof err.balance === "number") {
          setCoins(err.balance);
        }
        setError("Not enough coins for this bet.");
      } else {
        setError("Spin failed. Please try again.");

        console.warn("Spin error:", err);
      }
    }
  };

  const payout = lastSpinResult?.payout ?? 0;
  const hasWin = payout > 0;
  const winningSymbols = lastSpinResult?.paylines.length ?? 0;

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <h2 className={styles.title}>🎰 Lucky Reels</h2>
          <BalanceBadge amount={coins} />
        </div>

        <div className={styles.betSection}>
          <span className={styles.label}>BET</span>
          <div className={styles.betOptions}>
            {betOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={`${styles.betPill} ${
                  option === bet ? styles.betPillActive : ""
                }`}
                disabled={isSpinning}
                onClick={() => setBet(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.payoutBox}>
          {lastSpinResult ? (
            hasWin ? (
              <div className={styles.win}>
                <span className={styles.winAmount}>WIN +{payout}</span>
                {winningSymbols > 0 && (
                  <span className={styles.winLines}>
                    {winningSymbols} line{winningSymbols === 1 ? "" : "s"}
                  </span>
                )}
              </div>
            ) : (
              <span className={styles.muted}>no win</span>
            )
          ) : (
            <span className={styles.muted}>place your bet and spin</span>
          )}
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {isBroke && !isSpinning && (
          <div className={styles.brokeMessage}>
            You&apos;re out of coins. Restart to play again.
          </div>
        )}

        <div className={styles.actions}>
          <Button variant="secondary" onClick={closeSlot} disabled={isSpinning}>
            Exit
          </Button>
          {isBroke ? (
            <Button
              variant="primary"
              onClick={handleRestart}
              disabled={isResetting || isSpinning}
              className={styles.spinButton}
            >
              {isResetting ? "Restarting…" : "RESTART (free 1000)"}
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleSpin}
              disabled={!canSpin}
              className={styles.spinButton}
            >
              {isSpinning ? "Spinning…" : "SPIN"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
