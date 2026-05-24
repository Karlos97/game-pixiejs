import { useEffect } from "react";
import { useGameStore } from "../../../store/gameStore";
import { Button } from "../../atoms/Button";
import { DialogLine } from "../../molecules/DialogLine";
import styles from "./DialogBox.module.scss";

export function DialogBox() {
  const npc = useGameStore((s) => s.activeDialogNPC);
  const closeDialog = useGameStore((s) => s.closeDialog);
  const openSlot = useGameStore((s) => s.openSlot);
  const openRoulette = useGameStore((s) => s.openRoulette);

  const isSlotMachine = npc?.kind === "slot-machine";
  const isRouletteTable = npc?.kind === "roulette-table";
  const isPlayable = isSlotMachine || isRouletteTable;

  const handlePlay = (): void => {
    if (isSlotMachine) {
      openSlot();
    } else if (isRouletteTable) {
      openRoulette();
    }
  };

  useEffect(() => {
    if (!npc) return;
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDialog();
        return;
      }
      if (isPlayable && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        handlePlay();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [npc, isPlayable, isSlotMachine, isRouletteTable, closeDialog]);

  if (!npc) return null;

  const greeting = isRouletteTable
    ? "Care to try the wheel? Place your chips and let it ride!"
    : "Hey there! Got some lucky coins burning a hole in your pocket? Wanna spin the reels with me?";

  return (
    <div className={styles.overlay} onClick={closeDialog}>
      <div className={styles.box} onClick={(e) => e.stopPropagation()}>
        <DialogLine speaker={npc.name} text={greeting} />
        <div className={styles.actions}>
          {isPlayable && (
            <Button variant="primary" onClick={handlePlay}>
              Play
            </Button>
          )}
          <Button variant="secondary" onClick={closeDialog}>
            {isPlayable ? "Maybe later" : "Close"}
          </Button>
        </div>
      </div>
    </div>
  );
}
