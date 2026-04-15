"use client";

import { useEffect, useReducer, useRef, useState } from "react";

import { GameShell } from "@/components/game/game-shell";
import { ResultPanel } from "@/components/game/result-panel";
import { RevealPanel } from "@/components/game/reveal-panel";
import { SetupPanel } from "@/components/game/setup-panel";
import { CATEGORIES } from "@/data/categories";
import { MAX_PLAYERS, MIN_PLAYERS } from "@/lib/game/constants";
import { createInitialGameState, gameReducer } from "@/lib/game/reducer";
import { getCurrentPlayer, getRoundSummary, getVisibleRoleData } from "@/lib/game/selectors";
import { clearGameState, loadGameState, saveGameState } from "@/lib/storage";
import type { GamePlayerInput, GameState, VisibleRoleData } from "@/lib/game/types";

export function GameClient() {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialGameState);
  const storageReadyRef = useRef(false);
  const skipNextSaveRef = useRef(true);

  const currentPlayer = getCurrentPlayer(state);
  const roundSummary = getRoundSummary(state);
  const visibleRole = currentPlayer ? getVisibleRoleData(state, currentPlayer.id) : null;

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
      ? "Una sola pantalla por turno. Configura la mesa, reparte el dispositivo y prepara una ronda corta de conversacion."
      : "Todo se juega desde un solo dispositivo: revelar, hablar hasta que termine el tiempo y descubrir a los impostores.";

  return (
    <GameShell
      eyebrow="Pass & play en espanol"
      title="Interruptor"
      subtitle={headerSubtitle}
      phase={getPhaseLabel(state.phase)}
      status={roundSummary.currentPlayerName ?? roundSummary.nextAction}
    >
      {state.lastError ? <ErrorStage message={state.lastError} /> : null}

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

      {state.phase === "timer" && state.round ? (
        <TimerStage
          roundNumber={state.round.roundNumber}
          categoryName={state.round.categoryName}
          playerCount={state.players.length}
          impostorCount={state.round.impostorIds.length}
          timerEndsAt={state.round.timerEndsAt}
          onComplete={() => dispatch({ type: "round/finish" })}
        />
      ) : null}

      {state.phase === "round_result" || state.phase === "result" ? (
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
  onConfigChange: (config: { roundMinutes?: number }) => void;
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
              Ajusta la categoria, el tiempo y la cantidad de impostores antes de empezar.
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
              {state.config.roundMinutes} min
            </span>
            <span className="status-pill">Pass & play</span>
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
              <p className="metric-card__label">Tiempo de partida</p>
              <select
                value={state.config.roundMinutes}
                onChange={(event) =>
                  onConfigChange({
                    roundMinutes: Number(event.target.value),
                  })
                }
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
              >
                {[1, 2, 3, 5, 7, 10, 15].map((value) => (
                  <option
                    key={value}
                    value={value}
                    className="bg-white text-slate-950"
                  >
                    {value} minuto{value > 1 ? "s" : ""}
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
          </div>

          <div className="game-panel__actions">
            <button type="button" className="button button--primary" onClick={onStart}>
              Iniciar partida
            </button>
          </div>
        </div>
      </section>

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

      <SetupPanel
        title="Arma la mesa y define el tono"
        description="Elige la categoria de la ronda y el tiempo que tendra la mesa para conversar."
        playerCountValue={`${state.players.length} jugadores`}
        roundsValue={`${state.config.roundMinutes} min`}
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
            <li>
              El resto vera la palabra y tendra que conversar sin decirla literal para no regalar la ronda.
            </li>
            <li>Cuando todos miren su rol, empezara un contador comun para toda la mesa.</li>
            <li>Al terminar el tiempo, se mostraran la categoria y quienes eran los impostores.</li>
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

function TimerStage({
  roundNumber,
  categoryName,
  playerCount,
  impostorCount,
  timerEndsAt,
  onComplete,
}: {
  roundNumber: number;
  categoryName: string;
  playerCount: number;
  impostorCount: number;
  timerEndsAt: number | null;
  onComplete: () => void;
}) {
  const [remainingMs, setRemainingMs] = useState(() => getRemainingMs(timerEndsAt));

  useEffect(() => {
    if (!timerEndsAt) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const nextRemainingMs = getRemainingMs(timerEndsAt);
      setRemainingMs(nextRemainingMs);

      if (nextRemainingMs <= 0) {
        window.clearInterval(intervalId);
        onComplete();
      }
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [timerEndsAt, onComplete]);

  return (
    <section className="game-panel game-panel--result">
      <div className="game-panel__inner">
        <header className="game-panel__header">
          <p className="game-panel__eyebrow">Ronda en curso</p>
          <h2 className="game-panel__title">Empieza la conversacion</h2>
          <p className="game-panel__copy">
            Ya todos vieron su rol. Dejen el telefono a un lado y jueguen hasta que el contador llegue a cero.
          </p>
        </header>

        <div className="result-card__banner">
          <span className="result-pill result-pill--accent">Ronda #{roundNumber}</span>
          <h3>{formatCountdown(remainingMs)}</h3>
          <p>Tiempo restante</p>
        </div>

        <div className="result-card__split">
          <article className="result-card">
            <p className="result-card__label">Categoria</p>
            <p className="result-card__value">{categoryName}</p>
            <p className="result-card__copy">
              El impostor conoce la categoria, pero no la palabra secreta.
            </p>
          </article>

          <article className="result-card">
            <p className="result-card__label">Mesa</p>
            <p className="result-card__value">
              {playerCount} jugadores / {impostorCount} impostor{impostorCount > 1 ? "es" : ""}
            </p>
            <p className="result-card__copy">
              Conversen, sospechen y aguanten hasta que se termine el tiempo.
            </p>
          </article>
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
      title="Se termino el tiempo"
      summary="La ronda se cierra mostrando solo la categoria y quienes eran los impostores."
      category={roundSummary.categoryName ?? "Sin categoria"}
      impostorNames={roundSummary.impostorNames}
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

function ErrorStage({ message }: { message: string }) {
  return (
    <section className="game-panel">
      <div className="game-panel__inner">
        <header className="game-panel__header">
          <p className="game-panel__eyebrow">Atencion</p>
          <h2 className="game-panel__title">Hay algo para corregir</h2>
        </header>
        <p className="game-panel__copy">{message}</p>
      </div>
    </section>
  );
}

function getPhaseLabel(phase: string) {
  switch (phase) {
    case "setup":
      return "Preparacion";
    case "reveal":
      return "Revelado";
    case "timer":
      return "Contador";
    case "round_result":
    case "result":
      return "Resultado";
    default:
      return "Partida";
  }
}

function getRemainingMs(timerEndsAt: number | null) {
  if (!timerEndsAt) {
    return 0;
  }

  return Math.max(0, timerEndsAt - Date.now());
}

function formatCountdown(remainingMs: number) {
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
