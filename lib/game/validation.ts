import {
  MAX_CLUE_LENGTH,
  MAX_GUESS_LENGTH,
  MAX_PLAYER_NAME_LENGTH,
  MAX_PLAYERS,
  MIN_CLUE_LENGTH,
  MIN_GUESS_LENGTH,
  MIN_PLAYER_NAME_LENGTH,
  MIN_PLAYERS,
} from "./constants";
import { getCategoryById } from "@/data/categories";
import type { GameState, ValidationIssue } from "./types";

export function normalizeGameText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function normalizePlayerName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function validatePlayerName(name: string, field = "name"): ValidationIssue | null {
  const normalizedName = normalizePlayerName(name);

  if (normalizedName.length < MIN_PLAYER_NAME_LENGTH) {
    return {
      code: "player_name_empty",
      field,
      message: "El nombre del jugador no puede quedar vacio.",
    };
  }

  if (normalizedName.length > MAX_PLAYER_NAME_LENGTH) {
    return {
      code: "player_name_too_long",
      field,
      message: `El nombre del jugador no puede superar ${MAX_PLAYER_NAME_LENGTH} caracteres.`,
    };
  }

  return null;
}

export function validatePlayers(players: GameState["players"]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seenNames = new Set<string>();

  if (players.length > MAX_PLAYERS) {
    issues.push({
      code: "too_many_players",
      field: "players",
      message: `La partida no puede superar ${MAX_PLAYERS} jugadores.`,
    });
  }

  players.forEach((player, index) => {
    const normalizedName = normalizePlayerName(player.name);
    const issue = validatePlayerName(player.name, `players.${index}.name`);

    if (issue) {
      issues.push(issue);
      return;
    }

    const loweredName = normalizedName.toLowerCase();

    if (seenNames.has(loweredName)) {
      issues.push({
        code: "duplicate_player_name",
        field: `players.${index}.name`,
        message: "No uses nombres duplicados para evitar confusiones.",
      });
      return;
    }

    seenNames.add(loweredName);
  });

  return issues;
}

export function validateGameConfig(state: GameState): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const category = getCategoryById(state.config.categoryId);

  if (state.phase !== "setup" && state.phase !== "round_result") {
    issues.push({
      code: "setup_locked",
      field: "phase",
      message:
        "Solo se puede cambiar la configuracion antes de empezar la ronda o entre rondas.",
    });
  }

  if (state.config.clueSeconds <= 0 || Number.isNaN(state.config.clueSeconds)) {
    issues.push({
      code: "invalid_clue_seconds",
      field: "config.clueSeconds",
      message: "El tiempo de pistas debe ser mayor a cero.",
    });
  }

  if (state.config.voteSeconds <= 0 || Number.isNaN(state.config.voteSeconds)) {
    issues.push({
      code: "invalid_vote_seconds",
      field: "config.voteSeconds",
      message: "El tiempo de votacion debe ser mayor a cero.",
    });
  }

  if (!category) {
    issues.push({
      code: "invalid_category",
      field: "config.categoryId",
      message: "Selecciona una categoria valida antes de iniciar la ronda.",
    });
  }

  return issues;
}

export function validateCanStartRound(state: GameState): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (state.phase !== "setup" && state.phase !== "round_result") {
    issues.push({
      code: "round_in_progress",
      field: "phase",
      message: "La ronda actual todavia no termino.",
    });
  }

  if (state.players.length < MIN_PLAYERS) {
    issues.push({
      code: "too_few_players",
      field: "players",
      message: `Necesitas al menos ${MIN_PLAYERS} jugadores para empezar.`,
    });
  }

  issues.push(...validatePlayers(state.players));
  issues.push(...validateGameConfig(state));

  return issues;
}

export function validateRevealSubmission(state: GameState, playerId: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (state.phase !== "reveal") {
    issues.push({
      code: "invalid_phase",
      field: "phase",
      message: "Todavia no toca revelar el rol.",
    });
  }

  if (!state.round) {
    issues.push({
      code: "missing_round",
      field: "round",
      message: "No hay una ronda activa.",
    });
    return issues;
  }

  if (state.round.currentTurnPlayerId !== playerId) {
    issues.push({
      code: "not_current_player",
      field: "playerId",
      message: "Ese jugador no es el que debe mirar la pantalla ahora.",
    });
  }

  return issues;
}

export function validateClueSubmission(
  state: GameState,
  playerId: string,
  clue: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const normalizedClue = normalizeGameText(clue);

  if (state.phase !== "clue") {
    issues.push({
      code: "invalid_phase",
      field: "phase",
      message: "Todavia no toca dar pistas.",
    });
  }

  if (!state.round) {
    issues.push({
      code: "missing_round",
      field: "round",
      message: "No hay una ronda activa.",
    });
    return issues;
  }

  if (state.round.currentTurnPlayerId !== playerId) {
    issues.push({
      code: "not_current_player",
      field: "playerId",
      message: "Todavia no es tu turno de dar pista.",
    });
  }

  if (normalizedClue.length < MIN_CLUE_LENGTH) {
    issues.push({
      code: "empty_clue",
      field: "clue",
      message: "La pista no puede quedar vacia.",
    });
  }

  if (normalizedClue.length > MAX_CLUE_LENGTH) {
    issues.push({
      code: "clue_too_long",
      field: "clue",
      message: `La pista no puede superar ${MAX_CLUE_LENGTH} caracteres.`,
    });
  }

  return issues;
}

export function validateVoteSubmission(
  state: GameState,
  voterId: string,
  targetId: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (state.phase !== "vote" && state.phase !== "tie_break") {
    issues.push({
      code: "invalid_phase",
      field: "phase",
      message: "Todavia no toca votar.",
    });
  }

  if (!state.round) {
    issues.push({
      code: "missing_round",
      field: "round",
      message: "No hay una ronda activa.",
    });
    return issues;
  }

  if (state.round.currentTurnPlayerId !== voterId) {
    issues.push({
      code: "not_current_player",
      field: "voterId",
      message: "Todavia no es tu turno de votar.",
    });
  }

  const allowedTargetIds =
    state.phase === "tie_break"
      ? state.round.tieCandidates.filter((candidateId) => candidateId !== voterId)
      : state.players
          .filter((player) => player.isActive && player.id !== voterId)
          .map((player) => player.id);

  if (!allowedTargetIds.includes(targetId)) {
    issues.push({
      code: "invalid_vote_target",
      field: "targetId",
      message: "Ese voto no es valido en esta etapa.",
    });
  }

  return issues;
}

export function validateImpostorGuess(state: GameState, guess: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const normalizedGuess = normalizeGameText(guess);

  if (state.phase !== "impostor_guess") {
    issues.push({
      code: "invalid_phase",
      field: "phase",
      message: "Todavia no toca la ultima oportunidad del impostor.",
    });
  }

  if (!state.round) {
    issues.push({
      code: "missing_round",
      field: "round",
      message: "No hay una ronda activa.",
    });
    return issues;
  }

  if (normalizedGuess.length < MIN_GUESS_LENGTH) {
    issues.push({
      code: "empty_guess",
      field: "guess",
      message: "El intento no puede quedar vacio.",
    });
  }

  if (normalizedGuess.length > MAX_GUESS_LENGTH) {
    issues.push({
      code: "guess_too_long",
      field: "guess",
      message: `El intento no puede superar ${MAX_GUESS_LENGTH} caracteres.`,
    });
  }

  return issues;
}

export function formatValidationIssues(issues: ValidationIssue[]): string {
  return issues.map((issue) => issue.message).join(" ");
}
