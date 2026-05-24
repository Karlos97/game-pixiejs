import { useEffect } from "react";
import { GamePage } from "./components/pages/GamePage";
import { useGameStore } from "./store/gameStore";
import {
  apiBaseUrl,
  createPlayer,
  fetchNPCs,
  fetchPlayerState,
  PlayerNotFoundError,
  UnauthenticatedError,
} from "./api";
import { usePlayerStatePersist } from "./hooks/usePlayerStatePersist";

export function App() {
  const setCoins = useGameStore((state) => state.setCoins);
  const setPlayerPosition = useGameStore((state) => state.setPlayerPosition);
  const setHasLoadedState = useGameStore((state) => state.setHasLoadedState);
  const setNPCs = useGameStore((state) => state.setNPCs);
  const setPlayerName = useGameStore((state) => state.setPlayerName);
  const hasLoadedState = useGameStore((state) => state.hasLoadedState);
  const playerName = useGameStore((state) => state.playerName);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async (): Promise<void> => {
      try {
        const state = await fetchPlayerState();
        if (cancelled) return;
        setPlayerName(state.name);
        setCoins(state.coins);
        setPlayerPosition({ x: state.posX, y: state.posY });
        return;
      } catch (err) {
        if (
          !(err instanceof UnauthenticatedError) &&
          !(err instanceof PlayerNotFoundError)
        ) {
          console.warn("Failed to fetch player state, will re-register:", err);
        }
      }

      const created = await createPlayer();
      if (cancelled) return;
      setPlayerName(created.name);
      setCoins(created.coins);
      setPlayerPosition({ x: 1000, y: 1000 });
    };

    Promise.allSettled([bootstrap(), fetchNPCs()]).then(([_, npcsResult]) => {
      if (cancelled) return;
      if (npcsResult.status === "fulfilled") {
        setNPCs(npcsResult.value);
      } else {
        console.warn("Failed to fetch NPCs:", npcsResult.reason);
      }
      setHasLoadedState(true);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  usePlayerStatePersist();

  useEffect(() => {
    if (playerName === null) return;
    const handleBeforeUnload = (): void => {
      const pos = useGameStore.getState().playerPosition;
      if (!pos) return;
      try {
        const body = new Blob([JSON.stringify({ posX: pos.x, posY: pos.y })], {
          type: "application/json",
        });
        navigator.sendBeacon(`${apiBaseUrl}/me/state`, body);
      } catch (err) {
        console.warn("beforeunload sendBeacon failed:", err);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [playerName]);

  if (!hasLoadedState || playerName === null) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          color: "#cfd6e4",
          fontFamily: "monospace",
        }}
      >
        Loading…
      </div>
    );
  }

  return <GamePage />;
}
