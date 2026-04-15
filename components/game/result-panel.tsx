import type { ReactNode } from "react";

type ResultPanelProps = {
  eyebrow?: string;
  title: string;
  summary: string;
  categoryLabel?: string;
  category: string;
  impostorLabel?: string;
  impostorNames: string[];
  children?: ReactNode;
};

export function ResultPanel({
  eyebrow = "Resultado",
  title,
  summary,
  categoryLabel = "Categoria",
  category,
  impostorLabel = "Impostores",
  impostorNames,
  children,
}: ResultPanelProps) {
  const impostorText =
    impostorNames.length > 0 ? impostorNames.join(", ") : "No se pudo determinar";

  return (
    <section className="game-panel game-panel--result">
      <div className="game-panel__inner">
        <header className="game-panel__header">
          <p className="game-panel__eyebrow">{eyebrow}</p>
          <h2 className="game-panel__title">{title}</h2>
          <p className="game-panel__copy">{summary}</p>
        </header>

        <div className="result-card__split">
          <article className="result-card">
            <p className="result-card__label">{categoryLabel}</p>
            <p className="result-card__value">{category}</p>
          </article>

          <article className="result-card">
            <p className="result-card__label">
              {impostorNames.length === 1 ? "Impostor" : impostorLabel}
            </p>
            <p className="result-card__value">{impostorText}</p>
          </article>
        </div>

        {children ? <div className="game-panel__actions">{children}</div> : null}
      </div>
    </section>
  );
}
