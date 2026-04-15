import type { Metadata } from "next";

import { GameClient } from "@/components/game/game-client";

export const metadata: Metadata = {
  title: "Interruptor",
  description: "Juego web del impostor para jugar en pass & play.",
};

export default function InterruptorPage() {
  return <GameClient />;
}
