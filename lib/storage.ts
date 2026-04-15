import type { GameState } from "./game/types";

export const GAME_STORAGE_KEY = "interruptor-game-state";
const STORAGE_SCHEMA_VERSION = 1;

interface StorageEnvelope {
  schemaVersion: number;
  savedAt: string;
  state: GameState;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isGameState(value: unknown): value is GameState {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.version === "number" &&
    typeof value.sessionSeed === "string" &&
    typeof value.phase === "string" &&
    Array.isArray(value.players) &&
    isObject(value.config) &&
    Array.isArray(value.history)
  );
}

export function saveGameState(state: GameState): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const envelope: StorageEnvelope = {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
      state,
    };

    window.localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(envelope));
    return true;
  } catch {
    return false;
  }
}

export function saveStoredGame(state: GameState): boolean {
  return saveGameState(state);
}

export function loadGameState(): GameState | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(GAME_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);

    if (
      !isObject(parsed) ||
      parsed.schemaVersion !== STORAGE_SCHEMA_VERSION ||
      !isGameState(parsed.state)
    ) {
      return null;
    }

    return parsed.state;
  } catch {
    return null;
  }
}

export function loadStoredGame(): GameState | null {
  return loadGameState();
}

export function clearGameState(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(GAME_STORAGE_KEY);
}

export function clearStoredGame(): void {
  clearGameState();
}
