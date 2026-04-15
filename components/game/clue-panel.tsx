import type { ReactNode } from "react";

type CluePanelProps = {
  eyebrow?: string;
  title: string;
  description: string;
  roundLabel?: string;
  roundValue: string;
  turnLabel?: string;
  turnValue: string;
  timerLabel?: string;
  timerValue: string;
  timerProgress?: number;
  promptLabel?: string;
  prompt: string;
  rules: string[];
  children?: ReactNode;
};

export function CluePanel({
  eyebrow = "Turno de pistas",
  title,
  description,
  roundLabel = "Ronda",
  roundValue,
  turnLabel = "Turno",
  turnValue,
  timerLabel = "Tiempo",
  timerValue,
  timerProgress = 0,
  promptLabel = "Pista sugerida",
  prompt,
  rules,
  children,
}: CluePanelProps) {
  return (
    <section className="game-panel game-panel--clue">
      <div className="game-panel__inner">
        <header className="game-panel__header">
          <p className="game-panel__eyebrow">{eyebrow}</p>
          <h2 className="game-panel__title">{title}</h2>
          <p className="game-panel__copy">{description}</p>
        </header>

        <div className="clue-card__header">
          <div className="game-panel__status-row">
            <span className="timer-pill">
              <strong>{roundLabel}:</strong> {roundValue}
            </span>
            <span className="timer-pill">
              <strong>{turnLabel}:</strong> {turnValue}
            </span>
            <span className="timer-pill">
              <strong>{timerLabel}:</strong> {timerValue}
            </span>
          </div>
        </div>

        <div className="clue-card">
          <div className="timer-meter" aria-hidden="true">
            <div className="timer-meter__fill" style={{ width: `${timerProgress}%` }} />
          </div>

          <div className="clue-card__prompt">
            <span>{promptLabel}</span>
            <strong>{prompt}</strong>
            <p className="clue-card__copy">
              Habla corto, deja aire para sospechar y no repitas la palabra exacta.
            </p>
          </div>
        </div>

        <ul className="clue-card__list">
          {rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>

        {children ? <div className="game-panel__actions">{children}</div> : null}
      </div>
    </section>
  );
}
