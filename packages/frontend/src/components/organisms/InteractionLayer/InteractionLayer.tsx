import { useGameStore } from "../../../store/gameStore";
import { InteractionPrompt } from "../../molecules/InteractionPrompt";
import styles from "./InteractionLayer.module.scss";

export function InteractionLayer() {
  const nearbyNPC = useGameStore((s) => s.nearbyNPC);
  const dialogOpen = useGameStore((s) => s.dialogOpen);

  if (!nearbyNPC || dialogOpen) return null;

  return (
    <div className={styles.layer}>
      <InteractionPrompt npcName={nearbyNPC.name} />
    </div>
  );
}
