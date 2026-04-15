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

function buildRoleCopy(role: "hidden" | "civilian" | "impostor") {
  if (role === "impostor") {
    return {
      team: "impostor" as const,
      roleLabel: "Impostor",
      description: "No conoces la palabra y debes mezclarte sin quedar expuesto.",
    };
  }

  if (role === "civilian") {
    return {
      team: "civilian" as const,
      roleLabel: "Civil",
      description: "Conoces la palabra y debes ayudar sin regalarla.",
    };
  }

  return {
    team: "hidden" as const,
    roleLabel: "Oculto",
    description: "Pasa el dispositivo para no revelar informacion.",
  };
}

export function getCurrentPlayer(state: GameState): GamePlayer | null {
  if (!state.round) {
    return null;
  }

  if (state.phase === "round_result" || state.phase === "setup" || state.phase === "result") {
    return null;
  }

  if (state.phase === "impostor_guess" || state.phase === "finalGuess") {
    return getPlayerById(state, state.round.eliminatedPlayerId ?? state.round.impostorId);
  }

  return getPlayerById(state, state.round.currentTurnPlayerId);
}

export function getVoteOptions(state: GameState): GameVoteOption[] {
  if (!state.round) {
    return [];
  }

  const currentPlayer = getCurrentPlayer(state);
  const currentPlayerId = currentPlayer?.id ?? null;
  const inTieBreak = state.phase === "tie_break" || state.phase === "tiebreak";
  const allowedIds = inTieBreak
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
        id: player.id,
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
  const revealToEveryone = state.phase === "round_result" || state.phase === "result";

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
      ...buildRoleCopy("hidden"),
    };
  }

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
      ...buildRoleCopy("hidden"),
    };
  }

  const isImpostor = round.impostorIds.includes(player.id);
  const visibleRole = isImpostor ? "impostor" : "civilian";

  return {
    playerId: player.id,
    playerName: player.name,
    role: visibleRole,
    phase: state.phase,
    categoryId: round.categoryId,
    categoryName: round.categoryName,
    secretWord: isImpostor ? null : round.secretWord,
    impostorName: round.impostorName,
    instructions: isImpostor
      ? [
          "Sos el impostor.",
          "Conoces la categoria, pero no la palabra secreta.",
          "Mezclate en la conversacion sin revelar que te falta esa informacion.",
        ]
      : [
          "Sos un jugador normal.",
          "Memoriza la palabra y pasale el dispositivo a la siguiente persona.",
          "Durante la charla, no la digas literal ni la regales demasiado.",
        ],
    isCurrentPlayer,
    canProceed: isCurrentPlayer || revealToEveryone,
    ...buildRoleCopy(visibleRole),
  };
}

export function getRoundSummary(state: GameState): RoundSummaryView {
  const round = state.round;
  const currentPlayer = getCurrentPlayer(state);
  const category = getCategoryById(round?.categoryId ?? state.config.categoryId) ?? null;
  const summary: GameRoundSummary | null = round
    ? {
        roundId: round.roundId,
        roundNumber: round.roundNumber,
        categoryId: round.categoryId,
        categoryName: round.categoryName,
        secretWord: round.secretWord,
        impostorIds: round.impostorIds,
        impostorNames: round.impostorNames,
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
      winningReason: "La partida todavia no empezo.",
      eliminatedPlayerId: null,
      eliminatedPlayerName: null,
      impostorGuess: null,
      finalGuess: null,
      clueCount: 0,
      voteCount: 0,
      tieCandidates: [],
      currentPlayerId: currentPlayer?.id ?? null,
      currentPlayerName: currentPlayer?.name ?? null,
      nextAction: "Configurando la partida.",
      category,
      impostorNames: [],
      impostor: null,
      eliminated: null,
      champion: null,
    };
  }

  let nextAction = "La ronda esta en curso.";

  if (state.phase === "reveal") {
    nextAction = "Cada jugador debe mirar su rol.";
  } else if (state.phase === "timer") {
    nextAction = "El contador esta corriendo.";
  } else if (state.phase === "clue") {
    nextAction = "Es momento de dar pistas.";
  } else if (state.phase === "vote") {
    nextAction = "Se esta votando al sospechoso.";
  } else if (state.phase === "tie_break" || state.phase === "tiebreak") {
    nextAction = "Hubo empate y ahora se desempata.";
  } else if (state.phase === "impostor_guess" || state.phase === "finalGuess") {
    nextAction = "El impostor tiene una ultima oportunidad.";
  } else if (state.phase === "round_result" || state.phase === "result") {
    nextAction = "El tiempo termino. Podes empezar la siguiente ronda.";
  }

  let winningReason = "La ronda sigue abierta.";

  if (summary.winner === "impostor") {
    winningReason =
      summary.reason === "correct_guess"
        ? "El impostor adivino la palabra."
        : "El impostor sobrevivio a la votacion.";
  } else if (summary.winner === "civilians") {
    winningReason =
      summary.reason === "wrong_guess"
        ? "La mesa atrapo al impostor y su intento fallo."
        : "La mesa descubrio al impostor.";
  }

  return {
    phase: state.phase,
    roundNumber: summary.roundNumber,
    categoryId: summary.categoryId,
    categoryName: summary.categoryName,
    secretWord:
      state.phase === "round_result" || state.phase === "result" ? summary.secretWord : null,
    impostorId: summary.impostorId,
    impostorName:
      state.phase === "round_result" || state.phase === "result"
        ? summary.impostorNames.join(", ")
        : null,
    winner: summary.winner,
    reason: summary.reason,
    winningReason,
    eliminatedPlayerId: summary.eliminatedPlayerId,
    eliminatedPlayerName: summary.eliminatedPlayerName,
    impostorGuess: summary.impostorGuess,
    finalGuess: summary.impostorGuess,
    clueCount: summary.clueCount,
    voteCount: summary.voteCount,
    tieCandidates: summary.tieCandidates,
    currentPlayerId: currentPlayer?.id ?? null,
    currentPlayerName: currentPlayer?.name ?? null,
    nextAction,
    category,
    impostorNames: summary.impostorNames,
    impostor: getPlayerById(state, summary.impostorId),
    eliminated: getPlayerById(state, summary.eliminatedPlayerId),
    champion: null,
  };
}
