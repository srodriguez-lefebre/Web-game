import { CATEGORIES, getCategoryById } from "@/data/categories";
import { createSeededRng, deriveSeed, pickOne, shuffle } from "./rng";
import {
  formatValidationIssues,
  normalizeGameText,
  validateCanStartRound,
  validateClueSubmission,
  validateImpostorGuess,
  validateRevealSubmission,
  validateVoteSubmission,
} from "./validation";
import type {
  GameClue,
  GamePlayer,
  GameRound,
  GameRoundOutcome,
  GameRoundSummary,
  GameState,
  GameVote,
} from "./types";

function getActivePlayers(state: GameState): GamePlayer[] {
  return state.players.filter((player) => player.isActive);
}

function buildRoundSummary(round: GameRound): GameRoundSummary {
  return {
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
      Object.keys(round.votesByPlayerId).length + Object.keys(round.tieBreakVotesByPlayerId).length,
    tieCandidates: round.tieCandidates.slice(),
  };
}

function setError(state: GameState, message: string): GameState {
  return {
    ...state,
    lastError: message,
  };
}

function ensureRound(state: GameState): GameRound | null {
  return state.round;
}

function createRoundId(state: GameState, roundNumber: number, categoryId: string): string {
  const seed = deriveSeed(state.sessionSeed, roundNumber, categoryId, "round");
  return `round-${roundNumber}-${Math.floor(createSeededRng(seed)() * 1e9).toString(36)}`;
}

function revealAnswers(state: GameState): GameState {
  if (!state.round) {
    return setError(state, "No hay una ronda activa.");
  }

  const summary = buildRoundSummary(state.round);
  const alreadyTracked = state.history.some((item) => item.roundId === summary.roundId);

  return {
    ...state,
    phase: "round_result",
    round: {
      ...state.round,
      currentTurnPlayerId: null,
      timerEndsAt: state.round.timerEndsAt,
    },
    history: alreadyTracked ? state.history : [...state.history, summary],
    lastError: null,
  };
}

function finalizeRound(state: GameState, outcome: GameRoundOutcome): GameState {
  if (!state.round) {
    return setError(state, "No hay una ronda activa para finalizar.");
  }

  if (state.round.outcome) {
    return state;
  }

  const resolvedRound: GameRound = {
    ...state.round,
    outcome,
    currentTurnIndex: state.round.currentTurnIndex,
    currentTurnPlayerId: null,
    finalGuess: outcome.impostorGuess,
  };

  const nextPlayers = state.players.map((player) => {
    if (outcome.winner === "impostor") {
      if (resolvedRound.impostorIds.includes(player.id)) {
        return {
          ...player,
          score: player.score + 1,
        };
      }

      return player;
    }

    if (!resolvedRound.impostorIds.includes(player.id) && player.isActive) {
      return {
        ...player,
        score: player.score + 1,
      };
    }

    return player;
  });

  const summary = buildRoundSummary(resolvedRound);
  const alreadyTracked = state.history.some((item) => item.roundId === summary.roundId);

  return {
    ...state,
    phase: "round_result",
    round: resolvedRound,
    players: nextPlayers,
    history: alreadyTracked ? state.history : [...state.history, summary],
    lastError: null,
  };
}

function resolveVotes(state: GameState, useTieBreakVotes: boolean): GameState {
  const round = ensureRound(state);

  if (!round) {
    return setError(state, "No hay una ronda activa.");
  }

  const voteMap = useTieBreakVotes ? round.tieBreakVotesByPlayerId : round.votesByPlayerId;
  const candidateIds = useTieBreakVotes
    ? round.tieCandidates.slice()
    : round.voteOrder.slice();

  const counts = new Map<string, number>();
  candidateIds.forEach((candidateId) => counts.set(candidateId, 0));

  Object.values(voteMap).forEach((vote) => {
    if (counts.has(vote.targetId)) {
      counts.set(vote.targetId, (counts.get(vote.targetId) ?? 0) + 1);
    }
  });

  if (counts.size === 0) {
    return setError(state, "No hay candidatos validos para resolver la votacion.");
  }

  const maxVotes = Math.max(...Array.from(counts.values()));
  const topCandidates = Array.from(counts.entries())
    .filter(([, votes]) => votes === maxVotes)
    .map(([candidateId]) => candidateId);

  if (topCandidates.length > 1 && !useTieBreakVotes) {
    const nextRound: GameRound = {
      ...round,
      tieCandidates: topCandidates,
      currentTurnIndex: 0,
      currentTurnPlayerId: round.voteOrder[0] ?? null,
      tieBreakVotesByPlayerId: {},
      voteSubmittedBy: Object.keys(round.votesByPlayerId),
    };

    return {
      ...state,
      phase: "tie_break",
      round: nextRound,
      lastError: null,
    };
  }

  const eliminatedPlayerId =
    topCandidates.length === 1
      ? topCandidates[0]
      : pickOne(topCandidates, createSeededRng(deriveSeed(state.sessionSeed, round.roundNumber, "tie-break")));

  const eliminatedPlayer = state.players.find((player) => player.id === eliminatedPlayerId) ?? null;
  const isImpostorEliminated = round.impostorIds.includes(eliminatedPlayerId);

  if (!eliminatedPlayer) {
    return setError(state, "No se pudo identificar al jugador eliminado.");
  }

  if (isImpostorEliminated) {
    return {
      ...state,
      phase: "impostor_guess",
      round: {
        ...round,
        eliminatedPlayerId,
        currentTurnIndex: 0,
        currentTurnPlayerId: eliminatedPlayerId,
        finalGuess: null,
      },
      lastError: null,
    };
  }

  return finalizeRound(state, {
    winner: "impostor",
    reason: "impostor_survived",
    eliminatedPlayerId,
    eliminatedPlayerName: eliminatedPlayer.name,
    impostorGuess: null,
    secretWord: round.secretWord,
  });
}

export function startRound(state: GameState, seed?: string): GameState {
  const issues = validateCanStartRound(state);

  if (issues.length > 0) {
    return setError(state, formatValidationIssues(issues));
  }

  const category = getCategoryById(state.config.categoryId) ?? CATEGORIES[0];
  const roundNumber = state.history.length + 1;
  const roundSeed = deriveSeed(state.sessionSeed, roundNumber, category.id, seed ?? "auto");
  const rng = createSeededRng(roundSeed);
  const activePlayers = getActivePlayers(state);
  const impostors = shuffle(activePlayers, rng).slice(0, state.setup.impostorCount);
  const impostorIds = impostors.map((player) => player.id);
  const impostorNames = impostors.map((player) => player.name);
  const leadImpostor = impostors[0];
  const secretWord = pickOne(category.words, rng);
  const revealOrder = shuffle(activePlayers, rng).map((player) => player.id);
  const clueOrder = shuffle(activePlayers, rng).map((player) => player.id);
  const voteOrder = shuffle(activePlayers, rng).map((player) => player.id);

  const round: GameRound = {
    roundId: createRoundId(state, roundNumber, category.id),
    roundNumber,
    categoryId: category.id,
    categoryName: category.name,
    secretWord,
    impostorIds,
    impostorNames,
    impostorId: leadImpostor.id,
    impostorName: leadImpostor.name,
    revealOrder,
    clueOrder,
    voteOrder,
    currentTurnIndex: 0,
    currentTurnPlayerId: revealOrder[0] ?? null,
    timerEndsAt: null,
    revealIndex: 0,
    clueIndex: 0,
    revealedPlayerIds: [],
    clueSubmittedBy: [],
    voteSubmittedBy: [],
    cluesByPlayerId: {},
    votesByPlayerId: {},
    tieBreakVotesByPlayerId: {},
    tieCandidates: [],
    eliminatedPlayerId: null,
    impostorGuess: null,
    finalGuess: null,
    outcome: null,
  };

  return {
    ...state,
    phase: "reveal",
    round,
    lastError: null,
  };
}

export function confirmReveal(state: GameState, playerId: string): GameState {
  const issues = validateRevealSubmission(state, playerId);

  if (issues.length > 0) {
    return setError(state, formatValidationIssues(issues));
  }

  const round = ensureRound(state);

  if (!round) {
    return setError(state, "No hay una ronda activa.");
  }

  const revealedPlayerIds = round.revealedPlayerIds.includes(playerId)
    ? round.revealedPlayerIds
    : [...round.revealedPlayerIds, playerId];
  const nextIndex = round.currentTurnIndex + 1;
  const nextPlayerId = round.revealOrder[nextIndex] ?? null;
  const nextPhase = nextPlayerId ? "reveal" : "timer";
  const currentTurnPlayerId = nextPlayerId ?? null;

  return {
    ...state,
    phase: nextPhase,
    round: {
      ...round,
      revealedPlayerIds,
      currentTurnIndex: nextPlayerId ? nextIndex : 0,
      currentTurnPlayerId,
      timerEndsAt: nextPlayerId
        ? round.timerEndsAt
        : Date.now() + state.config.roundMinutes * 60 * 1000,
      revealIndex: nextPlayerId ? nextIndex : round.revealOrder.length - 1,
    },
    lastError: null,
  };
}

export function submitClue(state: GameState, playerId: string, clue: string): GameState {
  const issues = validateClueSubmission(state, playerId, clue);

  if (issues.length > 0) {
    return setError(state, formatValidationIssues(issues));
  }

  const round = ensureRound(state);

  if (!round) {
    return setError(state, "No hay una ronda activa.");
  }

  const player = state.players.find((entry) => entry.id === playerId) ?? null;

  if (!player) {
    return setError(state, "No se encontro al jugador que dio la pista.");
  }

  const clueEntry: GameClue = {
    playerId,
    playerName: player.name,
    text: normalizeGameText(clue),
  };
  const cluesByPlayerId = {
    ...round.cluesByPlayerId,
    [playerId]: clueEntry,
  };
  const clueSubmittedBy = round.clueSubmittedBy.includes(playerId)
    ? round.clueSubmittedBy
    : [...round.clueSubmittedBy, playerId];
  const nextIndex = round.currentTurnIndex + 1;
  const nextPlayerId = round.clueOrder[nextIndex] ?? null;

  return {
    ...state,
    phase: nextPlayerId ? "clue" : "vote",
    round: {
      ...round,
      cluesByPlayerId,
      clueSubmittedBy,
      currentTurnIndex: nextPlayerId ? nextIndex : 0,
      currentTurnPlayerId: nextPlayerId ?? round.voteOrder[0] ?? null,
      clueIndex: nextPlayerId ? nextIndex : round.clueOrder.length - 1,
    },
    lastError: null,
  };
}

export function submitVote(state: GameState, voterId: string, targetId: string): GameState {
  const issues = validateVoteSubmission(state, voterId, targetId);

  if (issues.length > 0) {
    return setError(state, formatValidationIssues(issues));
  }

  const round = ensureRound(state);

  if (!round) {
    return setError(state, "No hay una ronda activa.");
  }

  const voter = state.players.find((player) => player.id === voterId) ?? null;
  const target = state.players.find((player) => player.id === targetId) ?? null;

  if (!voter || !target) {
    return setError(state, "No se encontro al jugador que voto o al jugador votado.");
  }

  const voteEntry: GameVote = {
    voterId,
    voterName: voter.name,
    targetId,
    targetName: target.name,
  };

  const isTieBreakPhase = state.phase === "tie_break" || state.phase === "tiebreak";
  const voteStore = isTieBreakPhase ? round.tieBreakVotesByPlayerId : round.votesByPlayerId;
  const nextVotes = {
    ...voteStore,
    [voterId]: voteEntry,
  };
  const voteSubmittedBy = round.voteSubmittedBy.includes(voterId)
    ? round.voteSubmittedBy
    : [...round.voteSubmittedBy, voterId];
  const nextIndex = round.currentTurnIndex + 1;
  const nextPlayerId = round.voteOrder[nextIndex] ?? null;
  const nextRound: GameRound = {
    ...round,
    ...(isTieBreakPhase
      ? { tieBreakVotesByPlayerId: nextVotes }
      : { votesByPlayerId: nextVotes }),
    voteSubmittedBy,
    currentTurnIndex: nextPlayerId ? nextIndex : 0,
    currentTurnPlayerId: nextPlayerId,
  };

  if (nextPlayerId) {
    return {
      ...state,
      phase: state.phase,
      round: nextRound,
      lastError: null,
    };
  }

  return resolveVotes(
    {
      ...state,
      round: nextRound,
      lastError: null,
    },
    isTieBreakPhase,
  );
}

export function submitImpostorGuess(state: GameState, guess: string): GameState {
  const issues = validateImpostorGuess(state, guess);

  if (issues.length > 0) {
    return setError(state, formatValidationIssues(issues));
  }

  const round = ensureRound(state);

  if (!round) {
    return setError(state, "No hay una ronda activa.");
  }

  const normalizedGuess = normalizeGameText(guess);
  const isCorrect = normalizedGuess === normalizeGameText(round.secretWord);

  return finalizeRound(state, {
    winner: isCorrect ? "impostor" : "civilians",
    reason: isCorrect ? "correct_guess" : "wrong_guess",
    eliminatedPlayerId: round.eliminatedPlayerId,
    eliminatedPlayerName: round.impostorName,
    impostorGuess: normalizedGuess,
    secretWord: round.secretWord,
  });
}

export function startNextRound(state: GameState, seed?: string): GameState {
  if (state.phase !== "round_result" && state.phase !== "result") {
    return setError(state, "Solo puedes pasar a la siguiente ronda despues del resultado.");
  }

  if (!state.round) {
    return setError(state, "No hay una ronda finalizada para reiniciar.");
  }

  return startRound(
    {
      ...state,
      phase: "setup",
      round: null,
      lastError: null,
    },
    seed,
  );
}

export function summarizeRound(state: GameState): GameRoundSummary | null {
  if (!state.round) {
    return null;
  }

  return buildRoundSummary(state.round);
}

export function finishRound(state: GameState): GameState {
  return revealAnswers(state);
}
