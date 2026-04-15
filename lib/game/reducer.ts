import { CATEGORIES } from "@/data/categories";
import {
  DEFAULT_GAME_CONFIG,
  DEFAULT_IMPOSTOR_COUNT,
  DEFAULT_TARGET_SCORE,
  GAME_STATE_VERSION,
} from "./constants";
import { createGameSeed } from "./rng";
import {
  confirmReveal,
  finishRound,
  startNextRound,
  startRound,
  submitClue,
  submitImpostorGuess,
  submitVote,
} from "./engine";
import { normalizePlayerName } from "./validation";
import type { GameAction, GamePlayer, GameSetupState, GameState } from "./types";

function toLegacyPhase(phase: GameState["phase"]): GameState["phase"] {
  if (phase === "tie_break") {
    return "tiebreak";
  }

  if (phase === "impostor_guess") {
    return "finalGuess";
  }

  if (phase === "round_result") {
    return "result";
  }

  return phase;
}

function createDefaultPlayer(index: number): GamePlayer {
  return {
    id: `player-${index + 1}`,
    name: `Jugador ${index + 1}`,
    isActive: true,
    score: 0,
  };
}

function normalizePlayers(players: GamePlayer[]): GamePlayer[] {
  return players
    .filter((player) => player.id.trim().length > 0)
    .map((player) => ({
      ...player,
      name: normalizePlayerName(player.name),
      isActive: player.isActive !== false,
      score: Number.isFinite(player.score) ? player.score : 0,
    }));
}

function buildSetup(state: GameState, players: GamePlayer[]): GameSetupState {
  const maxImpostors = Math.max(DEFAULT_IMPOSTOR_COUNT, players.length - 1);

  return {
    players,
    categoryId: state.config.categoryId,
    targetScore: state.setup?.targetScore ?? DEFAULT_TARGET_SCORE,
    revealCategoryToImpostor: state.setup?.revealCategoryToImpostor ?? false,
    impostorCount: Math.min(
      maxImpostors,
      Math.max(DEFAULT_IMPOSTOR_COUNT, state.setup?.impostorCount ?? DEFAULT_IMPOSTOR_COUNT),
    ),
  };
}

function syncCompatState(state: GameState): GameState {
  const normalizedPlayers = normalizePlayers(state.players);
  const setup = buildSetup(
    {
      ...state,
      players: normalizedPlayers,
      setup: state.setup,
    },
    normalizedPlayers,
  );

  return {
    ...state,
    phase: toLegacyPhase(state.phase),
    players: normalizedPlayers,
    setup,
    currentRound: state.round ?? null,
  };
}

function normalizeHydratedState(state: GameState): GameState {
  const players = normalizePlayers(state.players ?? []);
  const config = {
    ...DEFAULT_GAME_CONFIG,
    ...(state.config ?? {}),
    categoryId: state.config?.categoryId ?? state.setup?.categoryId ?? CATEGORIES[0]?.id ?? null,
  };
  const baseRound = state.round ?? state.currentRound ?? null;
  const shouldResumeAsTimer =
    baseRound !== null &&
    ["clue", "vote", "tie_break", "tiebreak", "impostor_guess", "finalGuess"].includes(
      state.phase ?? "",
    );
  const round =
    baseRound === null
      ? null
      : {
          ...baseRound,
          currentTurnPlayerId: shouldResumeAsTimer ? null : baseRound.currentTurnPlayerId,
          currentTurnIndex: shouldResumeAsTimer ? 0 : baseRound.currentTurnIndex,
          timerEndsAt:
            shouldResumeAsTimer && !baseRound.timerEndsAt
              ? Date.now() + config.roundMinutes * 60 * 1000
              : baseRound.timerEndsAt ?? null,
        };
  const setup = {
    players,
    categoryId: config.categoryId,
    targetScore: state.setup?.targetScore ?? DEFAULT_TARGET_SCORE,
    revealCategoryToImpostor: state.setup?.revealCategoryToImpostor ?? false,
    impostorCount: Math.min(
      Math.max(DEFAULT_IMPOSTOR_COUNT, players.length - 1),
      Math.max(DEFAULT_IMPOSTOR_COUNT, state.setup?.impostorCount ?? DEFAULT_IMPOSTOR_COUNT),
    ),
  };

  return syncCompatState({
    ...state,
    version: typeof state.version === "number" ? state.version : GAME_STATE_VERSION,
    players,
    config,
    setup,
    round,
    currentRound: round,
    history: Array.isArray(state.history) ? state.history : [],
    lastError: state.lastError ?? null,
    sessionSeed: state.sessionSeed || createGameSeed(),
    phase: shouldResumeAsTimer ? "timer" : state.phase ?? "setup",
  });
}

export function createInitialGameState(): GameState {
  const defaultPlayers = Array.from({ length: 4 }, (_, index) => createDefaultPlayer(index));

  return syncCompatState({
    version: GAME_STATE_VERSION,
    sessionSeed: createGameSeed(),
    phase: "setup",
    players: defaultPlayers,
    config: {
      ...DEFAULT_GAME_CONFIG,
      categoryId: CATEGORIES[0]?.id ?? null,
    },
    setup: {
      players: defaultPlayers,
      categoryId: CATEGORIES[0]?.id ?? null,
      targetScore: DEFAULT_TARGET_SCORE,
      revealCategoryToImpostor: false,
      impostorCount: DEFAULT_IMPOSTOR_COUNT,
    },
    round: null,
    currentRound: null,
    history: [],
    lastError: null,
  });
}

function clearError(state: GameState): GameState {
  if (!state.lastError) {
    return state;
  }

  return {
    ...state,
    lastError: null,
  };
}

function setPlayersFromCount(state: GameState, count: number): GameState {
  const safeCount = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : state.players.length;
  const nextPlayers = state.players.slice(0, safeCount);

  while (nextPlayers.length < safeCount) {
    nextPlayers.push(createDefaultPlayer(nextPlayers.length));
  }

  return syncCompatState({
    ...state,
    players: nextPlayers,
    setup: {
      ...state.setup,
      players: nextPlayers,
    },
    lastError: null,
  });
}

function setPlayerName(state: GameState, playerId: string, name: string): GameState {
  return syncCompatState({
    ...state,
    players: state.players.map((player) =>
      player.id === playerId
        ? {
            ...player,
            name: normalizePlayerName(name),
          }
        : player,
    ),
    lastError: null,
  });
}

function updateSetupField(state: GameState, patch: Partial<GameSetupState>): GameState {
  return syncCompatState({
    ...state,
    setup: {
      ...state.setup,
      ...patch,
      players: state.players,
    },
    config: {
      ...state.config,
      ...(patch.categoryId !== undefined ? { categoryId: patch.categoryId } : {}),
    },
    lastError: null,
  });
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  const currentState = syncCompatState(state);

  switch (action.type) {
    case "hydrate_state":
      return normalizeHydratedState(action.state);
    case "game/hydrate":
      return normalizeHydratedState(action.payload);
    case "reset_game":
    case "game/reset":
      return createInitialGameState();
    case "set_players":
      return syncCompatState({
        ...currentState,
        players: normalizePlayers(action.players.map((player, index) => ({
          id: player.id || `player-${index + 1}`,
          name: player.name,
          isActive: player.isActive !== false,
          score: 0,
        }))),
        setup: {
          ...currentState.setup,
          players: normalizePlayers(action.players.map((player, index) => ({
            id: player.id || `player-${index + 1}`,
            name: player.name,
            isActive: player.isActive !== false,
            score: 0,
          }))),
        },
        lastError: null,
      });
    case "setup/setPlayerCount":
      return setPlayersFromCount(currentState, action.payload);
    case "setup/setPlayerName":
      return setPlayerName(currentState, action.payload.playerId, action.payload.name);
    case "setup/setTargetScore":
      return updateSetupField(currentState, { targetScore: action.payload });
    case "setup/toggleRevealCategory":
      return updateSetupField(currentState, { revealCategoryToImpostor: action.payload });
    case "setup/setImpostorCount":
      return updateSetupField(currentState, { impostorCount: action.payload });
    case "setup/setCategory":
      return syncCompatState({
        ...currentState,
        config: {
          ...currentState.config,
          categoryId: action.payload,
        },
        setup: {
          ...currentState.setup,
          categoryId: action.payload,
        },
        lastError: null,
      });
    case "update_player":
      return syncCompatState({
        ...currentState,
        players: currentState.players.map((player) =>
          player.id === action.playerId
            ? {
                ...player,
                ...(action.name !== undefined ? { name: normalizePlayerName(action.name) } : {}),
                ...(action.isActive !== undefined ? { isActive: action.isActive } : {}),
              }
            : player,
        ),
        lastError: null,
      });
    case "remove_player":
      return syncCompatState({
        ...currentState,
        players: currentState.players.filter((player) => player.id !== action.playerId),
        lastError: null,
      });
    case "update_config":
      return syncCompatState({
        ...currentState,
        config: {
          ...currentState.config,
          ...action.config,
        },
        setup: {
          ...currentState.setup,
          categoryId: action.config.categoryId ?? currentState.setup.categoryId,
        },
        lastError: null,
      });
    case "select_category":
      return syncCompatState({
        ...currentState,
        config: {
          ...currentState.config,
          categoryId: action.categoryId,
        },
        setup: {
          ...currentState.setup,
          categoryId: action.categoryId,
        },
        lastError: null,
      });
    case "start_round":
      return syncCompatState(startRound(clearError(currentState), action.seed));
    case "game/startRound":
      return syncCompatState(startRound(clearError(currentState), action.payload));
    case "confirm_reveal":
      return syncCompatState(confirmReveal(clearError(currentState), action.playerId));
    case "reveal/next":
      return syncCompatState(
        confirmReveal(clearError(currentState), currentState.round?.currentTurnPlayerId ?? ""),
      );
    case "submit_clue":
      return syncCompatState(submitClue(clearError(currentState), action.playerId, action.clue));
    case "clue/next": {
      const currentPlayerId = currentState.round?.currentTurnPlayerId ?? "";
      const currentPlayer = currentState.players.find((player) => player.id === currentPlayerId);
      return syncCompatState(
        submitClue(clearError(currentState), currentPlayerId, currentPlayer?.name ?? "pista verbal"),
      );
    }
    case "submit_vote":
      return syncCompatState(submitVote(clearError(currentState), action.voterId, action.targetId));
    case "vote/cast":
      return syncCompatState(
        submitVote(
          clearError(currentState),
          currentState.round?.currentTurnPlayerId ?? "",
          action.payload.targetId,
        ),
      );
    case "tiebreak/cast":
      return syncCompatState(
        submitVote(
          clearError(currentState),
          currentState.round?.currentTurnPlayerId ?? "",
          action.payload.targetId,
        ),
      );
    case "submit_impostor_guess":
      return syncCompatState(submitImpostorGuess(clearError(currentState), action.guess));
    case "finalGuess/submit":
      return syncCompatState(submitImpostorGuess(clearError(currentState), action.payload.guess));
    case "round/finish":
      return syncCompatState(finishRound(clearError(currentState)));
    case "start_next_round":
      return syncCompatState(startNextRound(clearError(currentState), action.seed));
    case "round/next":
      return syncCompatState(startNextRound(clearError(currentState)));
    default:
      return currentState;
  }
}
