import type { ReactNode } from "react";

type RevealPanelProps = {
  eyebrow?: string;
  title: string;
  description: string;
  roleLabel: string;
  roleTone?: "accent" | "mint" | "danger";
  categoryLabel?: string;
  category: string;
  secretLabel?: string;
  secretWord: string;
  otherImpostors?: string[];
  instructions: string[];
  warning?: string;
  children?: ReactNode;
};

export function RevealPanel({
  eyebrow = "Revelado privado",
  title,
  description,
  roleLabel,
  roleTone = "accent",
  categoryLabel = "Tema",
  category,
  secretLabel = "Tu palabra",
  secretWord,
  otherImpostors,
  instructions,
  warning,
  children,
}: RevealPanelProps) {
  return (
    <section className="game-panel game-panel--reveal">
      <div className="game-panel__inner">
        <header className="game-panel__header">
          <p className="game-panel__eyebrow">{eyebrow}</p>
          <h2 className="game-panel__title">{title}</h2>
          <p className="game-panel__copy">{description}</p>
        </header>

        <div className="game-panel__status-row">
          <span
            className={[
              "status-pill",
              roleTone === "danger"
                ? "status-pill--danger"
                : roleTone === "mint"
                  ? "status-pill--mint"
                  : "status-pill--accent",
            ].join(" ")}
          >
            {roleLabel}
          </span>
          <span className="status-pill status-pill--ghost">
            <strong>{categoryLabel}:</strong> {category}
          </span>
        </div>

        <div
          className={[
            "reveal-card__word",
            roleTone === "danger"
              ? "reveal-card__word--danger"
              : "reveal-card__word--safe",
          ].join(" ")}
        >
          <span>{secretLabel}</span>
          <strong>{secretWord}</strong>
          <p className="reveal-card__copy">
            Memoriza esta palabra, pasa el telefono y no la digas en voz alta.
          </p>
        </div>

        <div className="game-panel__status-row">
          <span className="status-pill">
            <strong>Tema actual:</strong> {category}
          </span>
        </div>

        {otherImpostors && otherImpostors.length > 0 ? (
          <div className="game-panel__status-row">
            <span className="status-pill status-pill--danger">
              <strong>Tus complices:</strong> {otherImpostors.join(", ")}
            </span>
          </div>
        ) : null}

        {children ? <div className="game-panel__actions">{children}</div> : null}

        <ul className="setup-card__list">
          {instructions.map((instruction) => (
            <li key={instruction}>{instruction}</li>
          ))}
        </ul>

        {warning ? <p className="game-panel__copy">{warning}</p> : null}
      </div>
    </section>
  );
}
