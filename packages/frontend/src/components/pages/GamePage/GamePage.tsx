import { GameTemplate } from "../../templates/GameTemplate";
import { GameCanvas } from "../../organisms/GameCanvas";
import { HUD } from "../../organisms/HUD";
import { InteractionLayer } from "../../organisms/InteractionLayer";
import { DialogBox } from "../../organisms/DialogBox";
import { SlotControls } from "../../organisms/SlotControls";
import { RouletteControls } from "../../organisms/RouletteControls";
import { OutOfCoinsModal } from "../../organisms/OutOfCoinsModal";
import { useGameStore } from "../../../store/gameStore";

export function GamePage() {
  const scene = useGameStore((s) => s.scene);

  return (
    <GameTemplate
      canvas={<GameCanvas />}
      hud={
        <>
          <HUD />
          <InteractionLayer />
        </>
      }
      overlays={
        <>
          <DialogBox />
          {scene === "slot" && <SlotControls />}
          {scene === "roulette" && <RouletteControls />}
          <OutOfCoinsModal />
        </>
      }
    />
  );
}
