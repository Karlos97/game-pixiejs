import { useEffect, useMemo, useRef, useState } from "react";
import type { RouletteBet, RouletteBetKind } from "@experiments/shared";
import { rouletteColorForNumber } from "@experiments/shared";
import { useGameStore } from "../../../store/gameStore";
import { Button } from "../../atoms/Button";
import { BalanceBadge } from "../../molecules/BalanceBadge";
import { spinRoulette, RouletteInsufficientFundsError } from "../../../api";
import styles from "./RouletteControls.module.scss";

const TOP_ROW: number[] = Array.from({ length: 12 }, (_, i) => 3 + i * 3);
const MIDDLE_ROW: number[] = Array.from({ length: 12 }, (_, i) => 2 + i * 3);
const BOTTOM_ROW: number[] = Array.from({ length: 12 }, (_, i) => 1 + i * 3);

type BetKey = string;

function keyFor(bet: RouletteBet): BetKey {
  if (bet.kind === "straight") return `straight:${String(bet.number)}`;
  return bet.kind;
}

function aggregate(bets: RouletteBet[]): Map<BetKey, number> {
  const map = new Map<BetKey, number>();
  for (const b of bets) {
    map.set(keyFor(b), (map.get(keyFor(b)) ?? 0) + b.amount);
  }
  return map;
}

interface ChipProps {
  amount: number;
}

function Chip({ amount }: ChipProps) {
  return (
    <span className={styles.chip} aria-label={`Chip ${amount}`}>
      {amount}
    </span>
  );
}

export function RouletteControls() {
  const coins = useGameStore((s) => s.coins);
  const selectedChip = useGameStore((s) => s.selectedChip);
  const chipOptions = useGameStore((s) => s.chipOptions);
  const pendingBets = useGameStore((s) => s.pendingBets);
  const isRouletteSpinning = useGameStore((s) => s.isRouletteSpinning);
  const lastRouletteResult = useGameStore((s) => s.lastRouletteResult);
  const playerName = useGameStore((s) => s.playerName);
  const setSelectedChip = useGameStore((s) => s.setSelectedChip);
  const addBet = useGameStore((s) => s.addBet);
  const clearBets = useGameStore((s) => s.clearBets);
  const setIsRouletteSpinning = useGameStore((s) => s.setIsRouletteSpinning);
  const setLastRouletteResult = useGameStore((s) => s.setLastRouletteResult);
  const setCoins = useGameStore((s) => s.setCoins);
  const closeRoulette = useGameStore((s) => s.closeRoulette);
  const showOutOfCoinsModal = useGameStore((s) => s.showOutOfCoinsModal);

  const [error, setError] = useState<string | null>(null);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [showScrollHint, setShowScrollHint] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeRoulette();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
    };
  }, [closeRoulette]);

  useEffect(() => {
    return () => {
      if (safetyTimerRef.current !== null) {
        clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      const overflowing = el.scrollHeight > el.clientHeight + 4;
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
      setShowScrollHint(overflowing && !atBottom);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [lastRouletteResult, pendingBets.length]);

  const totalBet = useMemo(
    () => pendingBets.reduce((acc, b) => acc + b.amount, 0),
    [pendingBets],
  );

  const aggregated = useMemo(() => aggregate(pendingBets), [pendingBets]);

  const canSpin = !isRouletteSpinning && pendingBets.length > 0;

  const placeBet = (kind: RouletteBetKind, num?: number) => {
    if (isRouletteSpinning) return;
    if (totalBet + selectedChip > coins) {
      showOutOfCoinsModal();
      return;
    }
    const bet: RouletteBet =
      kind === "straight"
        ? { kind, number: num, amount: selectedChip }
        : { kind, amount: selectedChip };
    addBet(bet);
  };

  const handleSpin = async () => {
    if (playerName === null) return;
    setError(null);
    if (totalBet > coins) {
      showOutOfCoinsModal();
      return;
    }
    setIsRouletteSpinning(true);
    setLastRouletteResult(null);

    if (safetyTimerRef.current !== null) {
      clearTimeout(safetyTimerRef.current);
    }
    safetyTimerRef.current = setTimeout(() => {
      setIsRouletteSpinning(false);
      safetyTimerRef.current = null;
    }, 5000);

    try {
      const result = await spinRoulette({
        bets: pendingBets,
      });
      setCoins(result.newCoinBalance);
      setLastRouletteResult(result);
    } catch (err) {
      setIsRouletteSpinning(false);
      if (safetyTimerRef.current !== null) {
        clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = null;
      }
      if (err instanceof RouletteInsufficientFundsError) {
        if (typeof err.balance === "number") {
          setCoins(err.balance);
        }
        showOutOfCoinsModal();
      } else {
        setError("Spin failed. Please try again.");
        console.warn("Roulette spin error:", err);
      }
    }
  };

  const renderNumberCell = (n: number) => {
    const color = rouletteColorForNumber(n);
    const amount = aggregated.get(`straight:${String(n)}`);
    return (
      <button
        key={n}
        type="button"
        className={`${styles.numberCell} ${color === "red" ? styles.red : styles.black}`}
        disabled={isRouletteSpinning}
        onClick={() => placeBet("straight", n)}
        aria-label={`Bet straight on ${n}`}
      >
        <span className={styles.numberLabel}>{n}</span>
        {amount !== undefined && <Chip amount={amount} />}
      </button>
    );
  };

  const renderOutsideButton = (
    kind: RouletteBetKind,
    label: string,
    extraClass?: string,
  ) => {
    const amount = aggregated.get(kind);
    return (
      <button
        type="button"
        className={`${styles.outsideCell} ${extraClass ?? ""}`}
        disabled={isRouletteSpinning}
        onClick={() => placeBet(kind)}
        aria-label={`Bet ${label}`}
      >
        <span>{label}</span>
        {amount !== undefined && <Chip amount={amount} />}
      </button>
    );
  };

  const result = lastRouletteResult;

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <div className={styles.scrollFade}>
          <div className={styles.scroll} ref={scrollRef}>
            <div className={styles.header}>
              <h2 className={styles.title}>🎡 Lucky Wheel</h2>
              <div className={styles.headerRight}>
                <div className={styles.totalBet}>
                  <span className={styles.label}>BET</span>
                  <span className={styles.totalAmount}>{totalBet}</span>
                </div>
                <BalanceBadge amount={coins} />
              </div>
            </div>

            <div className={styles.chipSection}>
              <span className={styles.label}>CHIP</span>
              <div className={styles.chipOptions}>
                {chipOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`${styles.chipPill} ${
                      option === selectedChip ? styles.chipPillActive : ""
                    }`}
                    disabled={isRouletteSpinning}
                    onClick={() => setSelectedChip(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.board}>
              <button
                type="button"
                className={`${styles.zeroCell}`}
                disabled={isRouletteSpinning}
                onClick={() => placeBet("straight", 0)}
                aria-label="Bet straight on 0"
              >
                <span className={styles.numberLabel}>0</span>
                {aggregated.get("straight:0") !== undefined && (
                  <Chip amount={aggregated.get("straight:0") as number} />
                )}
              </button>

              <div className={styles.grid}>
                <div className={styles.gridRow}>{TOP_ROW.map(renderNumberCell)}</div>
                <div className={styles.gridRow}>{MIDDLE_ROW.map(renderNumberCell)}</div>
                <div className={styles.gridRow}>{BOTTOM_ROW.map(renderNumberCell)}</div>
              </div>

              <div className={styles.columnButtons}>
                {renderOutsideButton("column-3", "2 to 1")}
                {renderOutsideButton("column-2", "2 to 1")}
                {renderOutsideButton("column-1", "2 to 1")}
              </div>
            </div>

            <div className={styles.dozenRow}>
              {renderOutsideButton("dozen-1", "1st 12")}
              {renderOutsideButton("dozen-2", "2nd 12")}
              {renderOutsideButton("dozen-3", "3rd 12")}
            </div>

            <div className={styles.outsideRow}>
              {renderOutsideButton("low", "1-18")}
              {renderOutsideButton("even", "EVEN")}
              {renderOutsideButton("red", "RED", styles.redOutside)}
              {renderOutsideButton("black", "BLACK", styles.blackOutside)}
              {renderOutsideButton("odd", "ODD")}
              {renderOutsideButton("high", "19-36")}
            </div>

            {error && <div className={styles.error}>{error}</div>}

            {result && (
              <div className={styles.resultPanel}>
                <div className={styles.resultHeader}>
                  <span className={styles.label}>WINNING</span>
                  <span
                    className={`${styles.winningNumber} ${
                      result.winningColor === "red"
                        ? styles.red
                        : result.winningColor === "black"
                          ? styles.black
                          : styles.green
                    }`}
                  >
                    {result.winningNumber} ({result.winningColor.toUpperCase()})
                  </span>
                  <span
                    className={result.totalPayout > 0 ? styles.winAmount : styles.muted}
                  >
                    {result.totalPayout > 0 ? `+${result.totalPayout}` : "no win"}
                  </span>
                </div>
                <ul className={styles.breakdown}>
                  {result.betResults.map((br, i) => (
                    <li
                      key={i}
                      className={br.won ? styles.breakdownWin : styles.breakdownLoss}
                    >
                      <span>
                        {br.bet.kind}
                        {br.bet.kind === "straight" && br.bet.number !== undefined
                          ? ` ${br.bet.number}`
                          : ""}{" "}
                        ({br.bet.amount})
                      </span>
                      <span>{br.won ? `+${br.payout}` : "lost"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {showScrollHint && (
            <div className={styles.scrollHint} aria-hidden="true">
              ▼ scroll for more bets
            </div>
          )}
        </div>

        <div className={styles.stickyFooter}>
          <div className={styles.actions}>
            <Button
              variant="secondary"
              onClick={closeRoulette}
              disabled={isRouletteSpinning}
            >
              Exit
            </Button>
            <Button
              variant="secondary"
              onClick={clearBets}
              disabled={isRouletteSpinning || pendingBets.length === 0}
            >
              Clear
            </Button>
            <Button
              variant="primary"
              onClick={handleSpin}
              disabled={!canSpin}
              className={styles.spinButton}
            >
              {isRouletteSpinning ? "Spinning…" : "SPIN"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
