import type { GameConfig, GamePhase } from "./types";

export const GAME_STATE_VERSION = 1;

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 12;
export const DEFAULT_IMPOSTOR_COUNT = 1;

export const MIN_PLAYER_NAME_LENGTH = 1;
export const MAX_PLAYER_NAME_LENGTH = 24;

export const MIN_CLUE_LENGTH = 1;
export const MAX_CLUE_LENGTH = 80;

export const MIN_GUESS_LENGTH = 1;
export const MAX_GUESS_LENGTH = 64;

export const DEFAULT_CLUE_SECONDS = 60;
export const DEFAULT_VOTE_SECONDS = 45;
export const DEFAULT_TARGET_SCORE = 3;

export const DEFAULT_GAME_CONFIG = {
  categoryId: null,
  clueSeconds: DEFAULT_CLUE_SECONDS,
  voteSeconds: DEFAULT_VOTE_SECONDS,
} satisfies GameConfig;

export const GAME_PHASES: readonly GamePhase[] = [
  "setup",
  "reveal",
  "clue",
  "vote",
  "tie_break",
  "impostor_guess",
  "round_result",
  "tiebreak",
  "finalGuess",
  "result",
] as const;
