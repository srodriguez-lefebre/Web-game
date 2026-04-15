import type { ReactNode } from "react";

export type SetupCategory = {
  id: string;
  name: string;
  description: string;
  tone?: "accent" | "mint" | "danger";
  selected?: boolean;
  locked?: boolean;
};

type SetupPanelProps = {
  eyebrow?: string;
  title: string;
  description: string;
  playerCountLabel?: string;
  playerCountValue?: string;
  modeLabel?: string;
  modeValue?: string;
  roundsLabel?: string;
  roundsValue?: string;
  categories: SetupCategory[];
  tip?: string;
  children?: ReactNode;
};

export function SetupPanel({
  eyebrow = "Preparar mesa",
  title,
  description,
  playerCountLabel = "Jugadores",
  playerCountValue = "4 a 10",
  modeLabel = "Formato",
  modeValue = "Pass & play",
  roundsLabel = "Ritmo",
  roundsValue = "Rondas cortas",
  categories,
  tip,
  children,
}: SetupPanelProps) {
  return (
    <section className="game-panel game-panel--setup">
      <div className="game-panel__inner">
        <header className="game-panel__header">
          <p className="game-panel__eyebrow">{eyebrow}</p>
          <h2 className="game-panel__title">{title}</h2>
          <p className="game-panel__copy">{description}</p>
        </header>

        <div className="game-panel__status-row">
          <span className="status-pill status-pill--accent">
            <strong>{playerCountLabel}:</strong> {playerCountValue}
          </span>
          <span className="status-pill status-pill--mint">
            <strong>{modeLabel}:</strong> {modeValue}
          </span>
          <span className="status-pill">
            <strong>{roundsLabel}:</strong> {roundsValue}
          </span>
        </div>

        <div className="category-grid">
          {categories.map((category) => (
            <article
              key={category.id}
              className={[
                "category-card",
                category.tone ? `category-card--${category.tone}` : "",
                category.selected ? "category-card--selected" : "",
                category.locked ? "category-card--locked" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <p className="category-card__label">Categoria</p>
              <p className="category-card__value">{category.name}</p>
              <p className="category-card__copy">{category.description}</p>
              <div className="game-panel__meta-row">
                {category.selected ? (
                  <span className="category-pill category-pill--accent">Elegida</span>
                ) : null}
                {category.locked ? (
                  <span className="category-pill category-pill--danger">Bloqueada</span>
                ) : null}
              </div>
            </article>
          ))}
        </div>

        {children ? <div className="game-panel__actions">{children}</div> : null}

        {tip ? <p className="game-panel__copy">{tip}</p> : null}
      </div>
    </section>
  );
}
