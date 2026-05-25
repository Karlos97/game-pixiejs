import { GameTemplate } from "../../templates/GameTemplate";
import { GameCanvas } from "../../organisms/GameCanvas";
import { HUD } from "../../organisms/HUD";
import { InteractionLayer } from "../../organisms/InteractionLayer";
import { DialogBox } from "../../organisms/DialogBox";
import { SlotControls } from "../../organisms/SlotControls";
import { RouletteControls } from "../../organisms/RouletteControls";
import { OutOfCoinsModal } from "../../organisms/OutOfCoinsModal";
import { MobileControls } from "../../organisms/MobileControls";
import { useGameStore } from "../../../store/gameStore";
import { useIsTouchDevice } from "../../../hooks/useIsTouchDevice";

export function GamePage() {
  const scene = useGameStore((s) => s.scene);
  const isTouch = useIsTouchDevice();
  const showMobileControls = isTouch && scene === "world";

  return (
    <GameTemplate
      canvas={<GameCanvas />}
      hud={
        <>
          <HUD />
          <InteractionLayer />
          {showMobileControls && <MobileControls />}
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
