import { getCategoryById } from "@/data/categories";
import { GAME_PHASES } from "./constants";
import type {
  GamePlayer,
  GameRoundSummary,
  GameState,
  GameVoteOption,
  RoundSummaryView,
  VisibleRoleData,
} from "./types";

export function getPlayerById(state: GameState, playerId: string | null): GamePlayer | null {
  if (!playerId) {
    return null;
  }

  return state.players.find((player) => player.id === playerId) ?? null;
}

export function getCurrentPlayer(state: GameState): GamePlayer | null {
  if (!state.round) {
    return null;
  }

  if (state.phase === "round_result" || state.phase === "setup") {
    return null;
  }

  if (state.phase === "impostor_guess") {
    return getPlayerById(state, state.round.impostorId);
  }

  return getPlayerById(state, state.round.currentTurnPlayerId);
}

export function getVoteOptions(state: GameState): GameVoteOption[] {
  if (!state.round) {
    return [];
  }

  const currentPlayer = getCurrentPlayer(state);
  const currentPlayerId = currentPlayer?.id ?? null;
  const allowedIds =
    state.phase === "tie_break"
      ? state.round.tieCandidates.filter((playerId) => playerId !== currentPlayerId)
      : state.players
          .filter((player) => player.isActive && player.id !== currentPlayerId)
          .map((player) => player.id);

  return allowedIds
    .map((playerId) => {
      const player = getPlayerById(state, playerId);

      if (!player) {
        return null;
      }

      return {
        playerId: player.id,
        name: player.name,
        isCurrentPlayer: player.id === currentPlayerId,
      } satisfies GameVoteOption;
    })
    .filter((entry): entry is GameVoteOption => entry !== null);
}

export function getVisibleRoleData(state: GameState, playerId: string): VisibleRoleData {
  const player = getPlayerById(state, playerId);
  const currentPlayer = getCurrentPlayer(state);
  const isCurrentPlayer = currentPlayer?.id === playerId;
  const category = getCategoryById(state.round?.categoryId ?? state.config.categoryId);
  const round = state.round;

  if (!player) {
    return {
      playerId: null,
      playerName: null,
      role: "hidden",
      phase: state.phase,
      categoryId: category?.id ?? null,
      categoryName: category?.name ?? null,
      secretWord: null,
      impostorName: null,
      instructions: ["No se encontro a este jugador."],
      isCurrentPlayer: false,
      canProceed: false,
    };
  }

  const revealToEveryone = state.phase === "round_result";
  const revealToCurrentPlayer =
    !revealToEveryone &&
    isCurrentPlayer &&
    state.round !== null &&
    GAME_PHASES.includes(state.phase);
  const canSeeRole = revealToEveryone || revealToCurrentPlayer;

  if (!round || !canSeeRole) {
    return {
      playerId: player.id,
      playerName: player.name,
      role: "hidden",
      phase: state.phase,
      categoryId: category?.id ?? null,
      categoryName: category?.name ?? null,
      secretWord: null,
      impostorName: null,
      instructions: isCurrentPlayer
        ? ["Pasa el dispositivo al jugador correcto para continuar."]
        : ["Espera tu turno y pasa el dispositivo cuando te toque mirar tu rol."],
      isCurrentPlayer,
      canProceed: isCurrentPlayer,
    };
  }

  const isImpostor = round.impostorId === player.id;

  return {
    playerId: player.id,
    playerName: player.name,
    role: isImpostor ? "impostor" : "civilian",
    phase: state.phase,
    categoryId: round.categoryId,
    categoryName: round.categoryName,
    secretWord: isImpostor ? null : round.secretWord,
    impostorName: round.impostorName,
    instructions: isImpostor
      ? [
          "Sos el impostor.",
          "Escucha las pistas sin revelar que no conoces la palabra.",
          "Si te expulsan, todavia tenes una ultima oportunidad.",
        ]
      : [
          "Sos un jugador normal.",
          "Memorizala y pasale el dispositivo a la siguiente persona.",
          "No la digas literal cuando toque dar tu pista.",
        ],
    isCurrentPlayer,
    canProceed: isCurrentPlayer || revealToEveryone,
  };
}

export function getRoundSummary(state: GameState): RoundSummaryView {
  const round = state.round;
  const currentPlayer = getCurrentPlayer(state);
  const category = getCategoryById(round?.categoryId ?? state.config.categoryId);
  const summary: GameRoundSummary | null = round
    ? {
        roundId: round.roundId,
        roundNumber: round.roundNumber,
        categoryId: round.categoryId,
        categoryName: round.categoryName,
        secretWord: round.secretWord,
        impostorId: round.impostorId,
        impostorName: round.impostorName,
        winner: round.outcome?.winner ?? null,
        reason: round.outcome?.reason ?? null,
        eliminatedPlayerId: round.outcome?.eliminatedPlayerId ?? round.eliminatedPlayerId,
        eliminatedPlayerName: round.outcome?.eliminatedPlayerName ?? null,
        impostorGuess: round.outcome?.impostorGuess ?? round.impostorGuess,
        clueCount: Object.keys(round.cluesByPlayerId).length,
        voteCount:
          Object.keys(round.votesByPlayerId).length +
          Object.keys(round.tieBreakVotesByPlayerId).length,
        tieCandidates: round.tieCandidates.slice(),
      }
    : null;

  if (!summary) {
    return {
      phase: state.phase,
      roundNumber: null,
      categoryId: category?.id ?? null,
      categoryName: category?.name ?? null,
      secretWord: null,
      impostorId: null,
      impostorName: null,
      winner: null,
      reason: null,
      eliminatedPlayerId: null,
      eliminatedPlayerName: null,
      impostorGuess: null,
      clueCount: 0,
      voteCount: 0,
      tieCandidates: [],
      currentPlayerId: currentPlayer?.id ?? null,
      currentPlayerName: currentPlayer?.name ?? null,
      nextAction: "Configurando la partida.",
    };
  }

  let nextAction = "La ronda esta en curso.";

  if (state.phase === "reveal") {
    nextAction = "Cada jugador debe mirar su rol.";
  } else if (state.phase === "clue") {
    nextAction = "Es momento de dar pistas.";
  } else if (state.phase === "vote") {
    nextAction = "Se esta votando al sospechoso.";
  } else if (state.phase === "tie_break") {
    nextAction = "Hubo empate y ahora se desempata.";
  } else if (state.phase === "impostor_guess") {
    nextAction = "El impostor tiene una ultima oportunidad.";
  } else if (state.phase === "round_result") {
    nextAction = "La ronda termino. Podes empezar la siguiente.";
  }

  return {
    phase: state.phase,
    roundNumber: summary.roundNumber,
    categoryId: summary.categoryId,
    categoryName: summary.categoryName,
    secretWord: state.phase === "round_result" ? summary.secretWord : null,
    impostorId: summary.impostorId,
    impostorName: state.phase === "round_result" ? summary.impostorName : null,
    winner: summary.winner,
    reason: summary.reason,
    eliminatedPlayerId: summary.eliminatedPlayerId,
    eliminatedPlayerName: summary.eliminatedPlayerName,
    impostorGuess: summary.impostorGuess,
    clueCount: summary.clueCount,
    voteCount: summary.voteCount,
    tieCandidates: summary.tieCandidates,
    currentPlayerId: currentPlayer?.id ?? null,
    currentPlayerName: currentPlayer?.name ?? null,
    nextAction,
  };
}
