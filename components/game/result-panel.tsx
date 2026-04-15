import type { ReactNode } from "react";

type ResultPanelProps = {
  eyebrow?: string;
  title: string;
  outcome: string;
  outcomeTone?: "accent" | "mint" | "danger";
  summary: string;
  revealedWordLabel?: string;
  revealedWord: string;
  categoryLabel?: string;
  category: string;
  highlightLabel?: string;
  highlight: string;
  facts: Array<{ label: string; value: string }>;
  children?: ReactNode;
};

export function ResultPanel({
  eyebrow = "Resultado",
  title,
  outcome,
  outcomeTone = "accent",
  summary,
  revealedWordLabel = "Palabra",
  revealedWord,
  categoryLabel = "Categoria",
  category,
  highlightLabel = "Clima de la mesa",
  highlight,
  facts,
  children,
}: ResultPanelProps) {
  return (
    <section className="game-panel game-panel--result">
      <div className="game-panel__inner">
        <header className="game-panel__header">
          <p className="game-panel__eyebrow">{eyebrow}</p>
          <h2 className="game-panel__title">{title}</h2>
          <p className="game-panel__copy">{summary}</p>
        </header>

        <div
          className={[
            "result-card__banner",
            outcomeTone === "danger" ? "result-card__banner--danger" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <span
            className={[
              "result-pill",
              outcomeTone === "danger"
                ? "result-pill--danger"
                : outcomeTone === "mint"
                  ? "result-pill--accent"
                  : "result-pill--accent",
            ].join(" ")}
          >
            {outcome}
          </span>
          <h3>{highlight}</h3>
          <p>{highlightLabel}</p>
        </div>

        <div className="result-card__split">
          <article className="result-card">
            <p className="result-card__label">{revealedWordLabel}</p>
            <p className="result-card__value">{revealedWord}</p>
            <p className="result-card__copy">
              La mesa queda cerrada cuando la palabra y la categoria se muestran juntas.
            </p>
          </article>

          <article className="result-card">
            <p className="result-card__label">{categoryLabel}</p>
            <p className="result-card__value">{category}</p>
            <p className="result-card__copy">
              Repetir la categoria ayuda a que el cierre se sienta claro y contundente.
            </p>
          </article>
        </div>

        <div className="game-panel__grid game-panel__grid--compact">
          {facts.map((fact) => (
            <article key={fact.label} className="metric-card">
              <p className="metric-card__label">{fact.label}</p>
              <p className="metric-card__value">{fact.value}</p>
            </article>
          ))}
        </div>

        {children ? <div className="game-panel__actions">{children}</div> : null}
      </div>
    </section>
  );
}
