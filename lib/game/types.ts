export type GamePhase =
  | "setup"
  | "reveal"
  | "timer"
  | "clue"
  | "vote"
  | "tie_break"
  | "impostor_guess"
  | "round_result"
  | "tiebreak"
  | "finalGuess"
  | "result";

export type GameRole = "civilian" | "impostor";
export type ImpostorCountSetting = number | "random";

export type VisibleRole = "hidden" | GameRole;

export type RoundWinner = "civilians" | "impostor";

export type RoundOutcomeReason =
  | "wrong_vote"
  | "correct_guess"
  | "wrong_guess"
  | "impostor_survived";

export interface GameCategory {
  id: string;
  name: string;
  description: string;
  accent: string;
  words: readonly string[];
}

export interface GamePlayer {
  id: string;
  name: string;
  isActive: boolean;
  score: number;
}

export interface GamePlayerInput {
  id: string;
  name: string;
  isActive?: boolean;
}

export interface GameConfig {
  categoryId: string | null;
  roundMinutes: number;
  clueSeconds: number;
  voteSeconds: number;
}

export interface GameSetupState {
  players: GamePlayer[];
  categoryId: string | null;
  targetScore: number;
  revealCategoryToImpostor: boolean;
  impostorCount: ImpostorCountSetting;
}

export interface GameClue {
  playerId: string;
  playerName: string;
  text: string;
}

export interface GameVote {
  voterId: string;
  voterName: string;
  targetId: string;
  targetName: string;
}

export interface GameRoundOutcome {
  winner: RoundWinner;
  reason: RoundOutcomeReason;
  eliminatedPlayerId: string | null;
  eliminatedPlayerName: string | null;
  impostorGuess: string | null;
  secretWord: string | null;
}

export interface GameRound {
  roundId: string;
  roundNumber: number;
  categoryId: string;
  categoryName: string;
  secretWord: string;
  impostorIds: string[];
  impostorNames: string[];
  impostorId: string;
  impostorName: string;
  revealOrder: string[];
  clueOrder: string[];
  voteOrder: string[];
  currentTurnIndex: number;
  currentTurnPlayerId: string | null;
  timerEndsAt: number | null;
  revealIndex: number;
  clueIndex: number;
  revealedPlayerIds: string[];
  clueSubmittedBy: string[];
  voteSubmittedBy: string[];
  cluesByPlayerId: Record<string, GameClue>;
  votesByPlayerId: Record<string, GameVote>;
  tieBreakVotesByPlayerId: Record<string, GameVote>;
  tieCandidates: string[];
  eliminatedPlayerId: string | null;
  impostorGuess: string | null;
  finalGuess: string | null;
  outcome: GameRoundOutcome | null;
}

export interface GameRoundSummary {
  roundId: string;
  roundNumber: number;
  categoryId: string;
  categoryName: string;
  secretWord: string;
  impostorIds: string[];
  impostorNames: string[];
  impostorId: string;
  impostorName: string;
  winner: RoundWinner | null;
  reason: RoundOutcomeReason | null;
  eliminatedPlayerId: string | null;
  eliminatedPlayerName: string | null;
  impostorGuess: string | null;
  clueCount: number;
  voteCount: number;
  tieCandidates: string[];
}

export interface GameState {
  version: number;
  sessionSeed: string;
  phase: GamePhase;
  players: GamePlayer[];
  config: GameConfig;
  setup: GameSetupState;
  round: GameRound | null;
  currentRound: GameRound | null;
  history: GameRoundSummary[];
  lastError: string | null;
}

export interface VisibleRoleData {
  playerId: string | null;
  playerName: string | null;
  role: VisibleRole;
  phase: GamePhase;
  categoryId: string | null;
  categoryName: string | null;
  secretWord: string | null;
  impostorName: string | null;
  impostorNames: string[];
  instructions: string[];
  isCurrentPlayer: boolean;
  canProceed: boolean;
  team: "civilian" | "impostor" | "hidden";
  roleLabel: string;
  description: string;
}

export interface GameVoteOption {
  id: string;
  playerId: string;
  name: string;
  isCurrentPlayer: boolean;
}

export interface RoundSummaryView {
  phase: GamePhase;
  roundNumber: number | null;
  categoryId: string | null;
  categoryName: string | null;
  secretWord: string | null;
  impostorId: string | null;
  impostorName: string | null;
  winner: RoundWinner | null;
  reason: RoundOutcomeReason | null;
  winningReason: string;
  eliminatedPlayerId: string | null;
  eliminatedPlayerName: string | null;
  impostorGuess: string | null;
  finalGuess: string | null;
  clueCount: number;
  voteCount: number;
  tieCandidates: string[];
  currentPlayerId: string | null;
  currentPlayerName: string | null;
  nextAction: string;
  category: GameCategory | null;
  impostorNames: string[];
  impostor: GamePlayer | null;
  eliminated: GamePlayer | null;
  champion: GamePlayer | null;
}

export interface ValidationIssue {
  code: string;
  message: string;
  field?: string;
}

export type GameAction =
  | { type: "hydrate_state"; state: GameState }
  | { type: "game/hydrate"; payload: GameState }
  | { type: "reset_game" }
  | { type: "game/reset" }
  | { type: "set_players"; players: GamePlayerInput[] }
  | { type: "setup/setPlayerCount"; payload: number }
  | { type: "setup/setPlayerName"; payload: { playerId: string; name: string } }
  | { type: "setup/setTargetScore"; payload: number }
  | { type: "setup/toggleRevealCategory"; payload: boolean }
  | { type: "setup/setCategory"; payload: string }
  | { type: "setup/setImpostorCount"; payload: ImpostorCountSetting }
  | {
      type: "update_player";
      playerId: string;
      name?: string;
      isActive?: boolean;
    }
  | { type: "remove_player"; playerId: string }
  | { type: "update_config"; config: Partial<GameConfig> }
  | { type: "select_category"; categoryId: string }
  | { type: "start_round"; seed?: string }
  | { type: "game/startRound"; payload?: string }
  | { type: "confirm_reveal"; playerId: string }
  | { type: "reveal/next" }
  | { type: "submit_clue"; playerId: string; clue: string }
  | { type: "clue/next" }
  | { type: "submit_vote"; voterId: string; targetId: string }
  | { type: "vote/cast"; payload: { targetId: string } }
  | { type: "tiebreak/cast"; payload: { targetId: string } }
  | { type: "submit_impostor_guess"; guess: string }
  | { type: "finalGuess/submit"; payload: { guess: string } }
  | { type: "round/finish" }
  | { type: "start_next_round"; seed?: string }
  | { type: "round/next" };
