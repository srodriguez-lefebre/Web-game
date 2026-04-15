"use client";

import { useEffect, useReducer, useRef, useState } from "react";

import { CluePanel } from "@/components/game/clue-panel";
import { GameShell } from "@/components/game/game-shell";
import { ResultPanel } from "@/components/game/result-panel";
import { RevealPanel } from "@/components/game/reveal-panel";
import { SetupPanel } from "@/components/game/setup-panel";
import { VotePanel } from "@/components/game/vote-panel";
import { CATEGORIES } from "@/data/categories";
import { MAX_PLAYERS, MIN_PLAYERS } from "@/lib/game/constants";
import { createInitialGameState, gameReducer } from "@/lib/game/reducer";
import {
  getCurrentPlayer,
  getRoundSummary,
  getVisibleRoleData,
  getVoteOptions,
} from "@/lib/game/selectors";
import { clearGameState, loadGameState, saveGameState } from "@/lib/storage";
import type {
  GamePlayerInput,
  GameState,
  RoundOutcomeReason,
  RoundWinner,
  VisibleRoleData,
} from "@/lib/game/types";

export function GameClient() {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialGameState);
  const storageReadyRef = useRef(false);
  const skipNextSaveRef = useRef(true);

  const currentPlayer = getCurrentPlayer(state);
  const roundSummary = getRoundSummary(state);
  const visibleRole = currentPlayer ? getVisibleRoleData(state, currentPlayer.id) : null;
  const voteOptions = getVoteOptions(state);

  useEffect(() => {
    const savedState = loadGameState();

    if (savedState) {
      dispatch({
        type: "hydrate_state",
        state: savedState,
      });
    }

    storageReadyRef.current = true;
  }, []);

  useEffect(() => {
    if (!storageReadyRef.current) {
      return;
    }

    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    saveGameState(state);
  }, [state]);

  const setPlayers = (players: GamePlayerInput[]) => {
    dispatch({
      type: "set_players",
      players,
    });
  };

  const handlePlayerCountChange = (delta: number) => {
    const nextCount = Math.max(
      MIN_PLAYERS,
      Math.min(MAX_PLAYERS, state.players.length + delta),
    );

    if (nextCount === state.players.length) {
      return;
    }

    if (nextCount > state.players.length) {
      const nextPlayers = [
        ...state.players,
        ...Array.from({ length: nextCount - state.players.length }, (_, index) => ({
          id: `player-${state.players.length + index + 1}`,
          name: `Jugador ${state.players.length + index + 1}`,
          isActive: true,
        })),
      ];

      setPlayers(nextPlayers);
      return;
    }

    setPlayers(state.players.slice(0, nextCount));
  };

  const resetEverything = () => {
    clearGameState();
    dispatch({
      type: "reset_game",
    });
  };

  const headerSubtitle =
    state.phase === "setup"
      ? "Una sola pantalla por turno. Configura la mesa, reparte el dispositivo y deja que empiece la sospecha."
      : "Todo se juega desde un solo dispositivo. Cada fase esta pensada para mirar, pasar y seguir sin filtrar informacion.";

  return (
    <GameShell
      eyebrow="Pass & play en espanol"
      title="Interruptor"
      subtitle={headerSubtitle}
      phase={getPhaseLabel(state.phase)}
      status={roundSummary.currentPlayerName ?? roundSummary.nextAction}
      aside={
        <AsidePanel
          roundSummary={roundSummary}
          playerNames={state.players.map((player) => player.name)}
          errorMessage={state.lastError}
        />
      }
      footer={
        state.phase !== "setup" ? (
          <div className="game-panel">
            <div className="game-panel__inner">
              <div className="game-panel__actions">
                <button
                  type="button"
                  onClick={resetEverything}
                  className="button button--danger"
                >
                  Reiniciar partida
                </button>
              </div>
            </div>
          </div>
        ) : null
      }
    >
      {state.phase === "setup" ? (
        <SetupStage
          state={state}
          onPlayerCountChange={handlePlayerCountChange}
          onPlayerNameChange={(playerId, name) =>
            dispatch({
              type: "update_player",
              playerId,
              name,
            })
          }
          onCategoryChange={(categoryId) =>
            dispatch({
              type: "select_category",
              categoryId,
            })
          }
          onConfigChange={(config) =>
            dispatch({
              type: "update_config",
              config,
            })
          }
          onImpostorCountChange={(impostorCount) =>
            dispatch({
              type: "setup/setImpostorCount",
              payload: impostorCount,
            })
          }
          onStart={() => dispatch({ type: "start_round" })}
        />
      ) : null}

      {state.phase === "reveal" && currentPlayer && visibleRole ? (
        <RevealStage
          key={`reveal-${currentPlayer.id}-${roundSummary.roundNumber}`}
          currentPlayerName={currentPlayer.name}
          currentIndex={(state.round?.currentTurnIndex ?? 0) + 1}
          totalPlayers={state.players.length}
          visibleRole={visibleRole}
          onConfirm={() =>
            dispatch({
              type: "confirm_reveal",
              playerId: currentPlayer.id,
            })
          }
        />
      ) : null}

      {state.phase === "clue" && currentPlayer && state.round ? (
        <ClueStage
          key={`clue-${currentPlayer.id}-${state.round.currentTurnIndex}`}
          currentPlayerName={currentPlayer.name}
          roundNumber={state.round.roundNumber}
          turnNumber={state.round.currentTurnIndex + 1}
          totalTurns={state.round.clueOrder.length}
          clueSeconds={state.config.clueSeconds}
          onSubmit={(clue) =>
            dispatch({
              type: "submit_clue",
              playerId: currentPlayer.id,
              clue,
            })
          }
        />
      ) : null}

      {(state.phase === "vote" || state.phase === "tie_break") && currentPlayer ? (
        <VoteStage
          key={`vote-${state.phase}-${currentPlayer.id}-${state.round?.currentTurnIndex ?? 0}`}
          currentPlayerName={currentPlayer.name}
          phase={state.phase}
          options={voteOptions}
          voteSeconds={state.config.voteSeconds}
          tieCandidates={roundSummary.tieCandidates}
          onVote={(targetId) =>
            dispatch({
              type: "submit_vote",
              voterId: currentPlayer.id,
              targetId,
            })
          }
        />
      ) : null}

      {state.phase === "impostor_guess" && currentPlayer ? (
        <ImpostorGuessStage
          key={`guess-${currentPlayer.id}-${roundSummary.roundNumber}`}
          currentPlayerName={currentPlayer.name}
          onSubmit={(guess) =>
            dispatch({
              type: "submit_impostor_guess",
              guess,
            })
          }
        />
      ) : null}

      {state.phase === "round_result" ? (
        <ResultStage
          roundSummary={roundSummary}
          onNextRound={() => dispatch({ type: "start_next_round" })}
          onReset={resetEverything}
        />
      ) : null}
    </GameShell>
  );
}

function SetupStage({
  state,
  onPlayerCountChange,
  onPlayerNameChange,
  onCategoryChange,
  onConfigChange,
  onImpostorCountChange,
  onStart,
}: {
  state: GameState;
  onPlayerCountChange: (delta: number) => void;
  onPlayerNameChange: (playerId: string, name: string) => void;
  onCategoryChange: (categoryId: string) => void;
  onConfigChange: (config: { clueSeconds?: number; voteSeconds?: number }) => void;
  onImpostorCountChange: (impostorCount: number) => void;
  onStart: () => void;
}) {
  const maxImpostors = Math.max(1, state.players.length - 1);

  return (
    <>
      <section className="game-panel">
        <div className="game-panel__inner">
          <header className="game-panel__header">
            <p className="game-panel__eyebrow">Configuracion</p>
            <h2 className="game-panel__title">Prepara la partida y arranca</h2>
            <p className="game-panel__copy">
              Ajusta el ritmo de la ronda, revisa la mesa y empieza cuando todo
              este listo.
            </p>
          </header>

          <div className="game-panel__status-row">
            <span className="status-pill status-pill--accent">
              {state.players.length} jugadores
            </span>
            <span className="status-pill status-pill--mint">
              {state.setup.impostorCount} impostor{state.setup.impostorCount > 1 ? "es" : ""}
            </span>
            <span className="status-pill status-pill--mint">
              {state.config.clueSeconds}s pistas
            </span>
            <span className="status-pill">{state.config.voteSeconds}s voto</span>
          </div>

          <div className="game-panel__grid game-panel__grid--compact">
            <label className="metric-card">
              <p className="metric-card__label">Tema actual</p>
              <select
                value={state.config.categoryId ?? ""}
                onChange={(event) => onCategoryChange(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
              >
                {CATEGORIES.map((category) => (
                  <option
                    key={category.id}
                    value={category.id}
                    className="bg-white text-slate-950"
                  >
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="metric-card">
              <p className="metric-card__label">Tiempo de pistas</p>
              <select
                value={state.config.clueSeconds}
                onChange={(event) =>
                  onConfigChange({
                    clueSeconds: Number(event.target.value),
                  })
                }
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
              >
                {[30, 45, 60, 75, 90].map((value) => (
                  <option
                    key={value}
                    value={value}
                    className="bg-white text-slate-950"
                  >
                    {value} segundos
                  </option>
                ))}
              </select>
            </label>

            <label className="metric-card">
              <p className="metric-card__label">Cantidad de impostores</p>
              <select
                value={state.setup.impostorCount}
                onChange={(event) => onImpostorCountChange(Number(event.target.value))}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
              >
                {Array.from({ length: maxImpostors }, (_, index) => index + 1).map((value) => (
                  <option
                    key={value}
                    value={value}
                    className="bg-white text-slate-950"
                  >
                    {value} impostor{value > 1 ? "es" : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="metric-card">
              <p className="metric-card__label">Tiempo de voto</p>
              <select
                value={state.config.voteSeconds}
                onChange={(event) =>
                  onConfigChange({
                    voteSeconds: Number(event.target.value),
                  })
                }
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
              >
                {[20, 30, 45, 60].map((value) => (
                  <option
                    key={value}
                    value={value}
                    className="bg-white text-slate-950"
                  >
                    {value} segundos
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="game-panel__actions">
            <button type="button" className="button button--primary" onClick={onStart}>
              Iniciar partida
            </button>
          </div>
        </div>
      </section>

      <SetupPanel
        title="Arma la mesa y define el tono"
        description="Elige la categoria que va a gobernar la ronda y define el tono de las pistas."
        playerCountValue={`${state.players.length} jugadores`}
        roundsValue={`${state.config.clueSeconds}s / ${state.config.voteSeconds}s`}
        categories={CATEGORIES.map((category, index) => ({
          id: category.id,
          name: category.name,
          description: category.description,
          tone: index % 3 === 0 ? "accent" : index % 3 === 1 ? "mint" : "danger",
          selected: state.config.categoryId === category.id,
        }))}
        tip="Tip: con cuatro o cinco personas la experiencia se siente mas tensa y agil para una primera partida."
      />

      <section className="game-panel">
        <div className="game-panel__inner">
          <header className="game-panel__header">
            <p className="game-panel__eyebrow">Jugadores</p>
            <h2 className="game-panel__title">Quien se sienta a la mesa</h2>
            <p className="game-panel__copy">
              Cambia la cantidad de jugadores y personaliza los nombres antes de revelar los roles.
            </p>
          </header>

          <div className="game-panel__status-row">
            <span className="status-pill status-pill--accent">Minimo {MIN_PLAYERS}</span>
            <span className="status-pill status-pill--mint">Maximo {MAX_PLAYERS}</span>
          </div>

          <div className="game-panel__actions">
            <button type="button" onClick={() => onPlayerCountChange(-1)}>
              Quitar jugador
            </button>
            <button type="button" onClick={() => onPlayerCountChange(1)}>
              Agregar jugador
            </button>
          </div>

          <div className="game-panel__grid">
            {state.players.map((player, index) => (
              <label key={player.id} className="metric-card">
                <p className="metric-card__label">Jugador {index + 1}</p>
                <input
                  value={player.name}
                  onChange={(event) => onPlayerNameChange(player.id, event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-[rgba(255,184,77,0.4)]"
                  placeholder={`Jugador ${index + 1}`}
                />
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="game-panel">
        <div className="game-panel__inner">
          <header className="game-panel__header">
            <p className="game-panel__eyebrow">Reglas</p>
            <h2 className="game-panel__title">Como se juega esta ronda</h2>
            <p className="game-panel__copy">
              Estas reglas quedan al final para consultarlas rapido antes de empezar.
            </p>
          </header>

          <ul className="setup-card__list">
            <li>
              Habra entre 1 y {maxImpostors} impostores segun la configuracion, y ellos no
              conoceran la palabra secreta.
            </li>
            <li>El resto vera la palabra y debera dar pistas sin decirla literal.</li>
            <li>Despues de las pistas, todos votan en secreto al sospechoso.</li>
            <li>Si hay empate, solo los empatados pasan a desempate.</li>
            <li>
              Si expulsan a un impostor, ese expulsado tiene una ultima chance para adivinar
              la palabra.
            </li>
          </ul>
        </div>
      </section>
    </>
  );
}

function RevealStage({
  currentPlayerName,
  currentIndex,
  totalPlayers,
  visibleRole,
  onConfirm,
}: {
  currentPlayerName: string;
  currentIndex: number;
  totalPlayers: number;
  visibleRole: VisibleRoleData;
  onConfirm: () => void;
}) {
  const [unlocked, setUnlocked] = useState(false);

  if (!unlocked) {
    return (
      <section className="game-panel">
        <div className="game-panel__inner">
          <header className="game-panel__header">
            <p className="game-panel__eyebrow">Revelado privado</p>
            <h2 className="game-panel__title">{currentPlayerName}, toma el dispositivo</h2>
            <p className="game-panel__copy">
              Mira tu rol a solas y vuelve a bloquear la pantalla cuando termines.
            </p>
          </header>

          <div className="game-panel__status-row">
            <span className="status-pill status-pill--accent">
              Jugador {currentIndex} de {totalPlayers}
            </span>
          </div>

          <div className="game-panel__actions">
            <button
              type="button"
              className="button button--primary"
              onClick={() => setUnlocked(true)}
            >
              Ver mi rol
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <RevealPanel
      title={currentPlayerName}
      description="Mira en silencio, memoriza lo necesario y pasa el telefono a la siguiente persona."
      roleLabel={visibleRole.role === "impostor" ? "Impostor" : "Civil"}
      roleTone={visibleRole.role === "impostor" ? "danger" : "mint"}
      category={visibleRole.categoryName ?? "Sin categoria"}
      secretWord={visibleRole.secretWord ?? "No tienes palabra"}
      secretLabel={visibleRole.role === "impostor" ? "Tu informacion" : "Tu palabra"}
      instructions={visibleRole.instructions}
      warning="Nadie deberia mirar esta pantalla salvo el jugador en turno."
    >
      <button type="button" className="button button--primary" onClick={onConfirm}>
        Pasar el dispositivo
      </button>
    </RevealPanel>
  );
}

function ClueStage({
  currentPlayerName,
  roundNumber,
  turnNumber,
  totalTurns,
  clueSeconds,
  onSubmit,
}: {
  currentPlayerName: string;
  roundNumber: number;
  turnNumber: number;
  totalTurns: number;
  clueSeconds: number;
  onSubmit: (clue: string) => void;
}) {
  const [clue, setClue] = useState("");

  return (
    <CluePanel
      title={`Turno de ${currentPlayerName}`}
      description="Escribe tu pista, dilo en voz alta y confirma cuando estes listo para pasar el telefono."
      roundValue={`#${roundNumber}`}
      turnValue={`${turnNumber} / ${totalTurns}`}
      timerValue={`${clueSeconds}s`}
      timerProgress={100}
      prompt="Piensa en una pista util, corta y no demasiado obvia."
      rules={[
        "No digas la palabra exacta ni una derivacion demasiado literal.",
        "Intenta que tu pista ayude a inocentes pero no regale toda la ronda.",
        "Si eres el impostor, improvisa sin exagerar.",
      ]}
    >
      <label className="metric-card">
        <p className="metric-card__label">Tu pista</p>
        <input
          value={clue}
          onChange={(event) => setClue(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none placeholder:text-slate-500 focus:border-[rgba(82,230,194,0.4)]"
          placeholder="Ej.: crocante, rapido, nocturno..."
        />
      </label>

      <button
        type="button"
        className="button button--primary"
        onClick={() => onSubmit(clue)}
      >
        Guardar pista y seguir
      </button>
    </CluePanel>
  );
}

function VoteStage({
  currentPlayerName,
  phase,
  options,
  voteSeconds,
  tieCandidates,
  onVote,
}: {
  currentPlayerName: string;
  phase: "vote" | "tie_break";
  options: ReturnType<typeof getVoteOptions>;
  voteSeconds: number;
  tieCandidates: string[];
  onVote: (targetId: string) => void;
}) {
  const [unlocked, setUnlocked] = useState(false);

  if (!unlocked) {
    return (
      <section className="game-panel">
        <div className="game-panel__inner">
          <header className="game-panel__header">
            <p className="game-panel__eyebrow">
              {phase === "tie_break" ? "Desempate" : "Votacion secreta"}
            </p>
            <h2 className="game-panel__title">{currentPlayerName}, prepara tu voto</h2>
            <p className="game-panel__copy">
              Cuando nadie mire la pantalla, abre la boleta y elige al sospechoso.
            </p>
          </header>

          <div className="game-panel__actions">
            <button
              type="button"
              className="button button--primary"
              onClick={() => setUnlocked(true)}
            >
              Abrir voto
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <VotePanel
      eyebrow={phase === "tie_break" ? "Desempate" : "Voto secreto"}
      title={`Vota ${currentPlayerName}`}
      description="Tu eleccion se registra al momento y la pantalla vuelve a cerrarse para el siguiente turno."
      voteValue={`${voteSeconds}s sugeridos`}
      sealText="Nadie mira esta pantalla"
      options={options.map((option) => ({
        id: option.playerId,
        name: option.name,
        note: "Toca esta tarjeta para emitir tu voto.",
      }))}
      tieMessage={
        phase === "tie_break" && tieCandidates.length > 0
          ? `Siguen en juego ${tieCandidates.length} sospechosos. Solo ellos pueden recibir votos en este desempate.`
          : undefined
      }
    >
      {options.map((option) => (
        <button
          key={option.playerId}
          type="button"
          onClick={() => onVote(option.playerId)}
          className="button button--primary"
        >
          Votar a {option.name}
        </button>
      ))}
    </VotePanel>
  );
}

function ImpostorGuessStage({
  currentPlayerName,
  onSubmit,
}: {
  currentPlayerName: string;
  onSubmit: (guess: string) => void;
}) {
  const [guess, setGuess] = useState("");

  return (
    <section className="game-panel">
      <div className="game-panel__inner">
        <header className="game-panel__header">
          <p className="game-panel__eyebrow">Ultima oportunidad</p>
          <h2 className="game-panel__title">{currentPlayerName}, roba la ronda si puedes</h2>
          <p className="game-panel__copy">
            La mesa te encontro. Si adivinas la palabra exacta, la victoria vuelve a tus manos.
          </p>
        </header>

        <label className="metric-card">
          <p className="metric-card__label">Tu intento</p>
          <input
            value={guess}
            onChange={(event) => setGuess(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none placeholder:text-slate-500 focus:border-[rgba(255,105,105,0.4)]"
            placeholder="Escribe la palabra secreta"
          />
        </label>

        <div className="game-panel__actions">
          <button
            type="button"
            className="button button--danger"
            onClick={() => onSubmit(guess)}
          >
            Confirmar intento
          </button>
        </div>
      </div>
    </section>
  );
}

function ResultStage({
  roundSummary,
  onNextRound,
  onReset,
}: {
  roundSummary: ReturnType<typeof getRoundSummary>;
  onNextRound: () => void;
  onReset: () => void;
}) {
  return (
    <ResultPanel
      title="Fin de la ronda"
      outcome={getOutcomeLabel(roundSummary.winner)}
      outcomeTone={roundSummary.winner === "impostor" ? "danger" : "mint"}
      summary={getOutcomeSummary(roundSummary.reason)}
      revealedWord={roundSummary.secretWord ?? "Sin palabra"}
      category={roundSummary.categoryName ?? "Sin categoria"}
      highlight={getOutcomeHeadline(roundSummary.reason)}
      facts={[
        {
          label: roundSummary.impostorNames.length > 1 ? "Impostores" : "Impostor",
          value:
            roundSummary.impostorNames.length > 0
              ? roundSummary.impostorNames.join(", ")
              : roundSummary.impostorName ?? "Desconocido",
        },
        {
          label: "Expulsado",
          value: roundSummary.eliminatedPlayerName ?? "Nadie",
        },
        {
          label: "Pistas cargadas",
          value: String(roundSummary.clueCount),
        },
        {
          label: "Votos emitidos",
          value: String(roundSummary.voteCount),
        },
        {
          label: "Ultimo intento",
          value: roundSummary.impostorGuess ?? "No hizo falta",
        },
      ]}
    >
      <button type="button" className="button button--primary" onClick={onNextRound}>
        Jugar otra ronda
      </button>
      <button type="button" onClick={onReset}>
        Volver a empezar
      </button>
    </ResultPanel>
  );
}

function AsidePanel({
  roundSummary,
  playerNames,
  errorMessage,
}: {
  roundSummary: ReturnType<typeof getRoundSummary>;
  playerNames: string[];
  errorMessage: string | null;
}) {
  return (
    <>
      <section className="game-panel">
        <div className="game-panel__inner">
          <header className="game-panel__header">
            <p className="game-panel__eyebrow">Radar de ronda</p>
            <h2 className="game-panel__title">Lo que esta pasando</h2>
            <p className="game-panel__copy">{roundSummary.nextAction}</p>
          </header>

          <div className="game-panel__grid game-panel__grid--compact">
            <article className="metric-card">
              <p className="metric-card__label">Ronda</p>
              <p className="metric-card__value">
                {roundSummary.roundNumber ? `#${roundSummary.roundNumber}` : "Lista"}
              </p>
            </article>
            <article className="metric-card">
              <p className="metric-card__label">Categoria</p>
              <p className="metric-card__value">{roundSummary.categoryName ?? "Sin elegir"}</p>
            </article>
            <article className="metric-card">
              <p className="metric-card__label">Pistas</p>
              <p className="metric-card__value">{roundSummary.clueCount}</p>
            </article>
            <article className="metric-card">
              <p className="metric-card__label">Votos</p>
              <p className="metric-card__value">{roundSummary.voteCount}</p>
            </article>
          </div>

          {roundSummary.tieCandidates.length > 0 ? (
            <div className="tie-card">
              <p className="tie-card__title">Empate activo</p>
              <p className="tie-card__copy">
                Hay {roundSummary.tieCandidates.length} jugadores en desempate.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="game-panel">
        <div className="game-panel__inner">
          <header className="game-panel__header">
            <p className="game-panel__eyebrow">Mesa</p>
            <h2 className="game-panel__title">Quienes juegan</h2>
          </header>

          <ul className="setup-card__list">
            {playerNames.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </div>
      </section>

      {errorMessage ? (
        <section className="game-panel">
          <div className="game-panel__inner">
            <header className="game-panel__header">
              <p className="game-panel__eyebrow">Atencion</p>
              <h2 className="game-panel__title">Hay algo para corregir</h2>
            </header>
            <p className="game-panel__copy">{errorMessage}</p>
          </div>
        </section>
      ) : null}
    </>
  );
}

function getPhaseLabel(phase: string) {
  switch (phase) {
    case "setup":
      return "Preparacion";
    case "reveal":
      return "Revelado";
    case "clue":
      return "Pistas";
    case "vote":
      return "Votacion";
    case "tie_break":
      return "Desempate";
    case "impostor_guess":
      return "Ultima oportunidad";
    case "round_result":
      return "Resultado";
    default:
      return "Partida";
  }
}

function getOutcomeLabel(winner: RoundWinner | null) {
  if (winner === "impostor") {
    return "Gana el impostor";
  }

  if (winner === "civilians") {
    return "Ganan los inocentes";
  }

  return "Ronda cerrada";
}

function getOutcomeHeadline(reason: RoundOutcomeReason | null) {
  switch (reason) {
    case "wrong_vote":
      return "La mesa saco al jugador equivocado";
    case "correct_guess":
      return "El impostor cayo, pero robo el cierre";
    case "wrong_guess":
      return "El impostor no logro nombrar la palabra";
    case "impostor_survived":
      return "La confusion salvo al infiltrado";
    default:
      return "La ronda ya tiene veredicto";
  }
}

function getOutcomeSummary(reason: RoundOutcomeReason | null) {
  switch (reason) {
    case "wrong_vote":
      return "El grupo expulso a una persona inocente y el impostor sobrevivio la ronda.";
    case "correct_guess":
      return "La mesa encontro al impostor, pero su ultimo intento fue correcto y se quedo con la victoria.";
    case "wrong_guess":
      return "El impostor fue descubierto y su ultima palabra no coincidió con la secreta.";
    case "impostor_survived":
      return "La mesa no logro encerrarlo a tiempo y el impostor paso desapercibido.";
    default:
      return "La ronda ya termino y puedes arrancar otra si la mesa quiere seguir.";
  }
}
