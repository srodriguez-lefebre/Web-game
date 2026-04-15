import type { ReactNode } from "react";

export type VoteOption = {
  id: string;
  name: string;
  note?: string;
  selected?: boolean;
  locked?: boolean;
  voteCount?: string;
};

type VotePanelProps = {
  eyebrow?: string;
  title: string;
  description: string;
  voteLabel?: string;
  voteValue?: string;
  sealLabel?: string;
  sealText: string;
  options: VoteOption[];
  tieLabel?: string;
  tieMessage?: string;
  children?: ReactNode;
};

export function VotePanel({
  eyebrow = "Voto secreto",
  title,
  description,
  voteLabel = "Estado",
  voteValue = "Nadie mira",
  sealLabel = "Mesa cerrada",
  sealText,
  options,
  tieLabel = "Desempate",
  tieMessage,
  children,
}: VotePanelProps) {
  return (
    <section className="game-panel game-panel--vote">
      <div className="game-panel__inner">
        <header className="game-panel__header">
          <p className="game-panel__eyebrow">{eyebrow}</p>
          <h2 className="game-panel__title">{title}</h2>
          <p className="game-panel__copy">{description}</p>
        </header>

        <div className="game-panel__status-row">
          <span className="vote-pill vote-pill--ghost">
            <strong>{voteLabel}:</strong> {voteValue}
          </span>
          <span className="vote-pill vote-pill--danger">
            <strong>{sealLabel}:</strong> {sealText}
          </span>
        </div>

        <div className="vote-card__stack">
          <div className="vote-card__seal">
            <strong>Voto tapado</strong>
            <span className="vote-card__hint">
              Cada persona vota en secreto. No se muestran elecciones hasta el final.
            </span>
          </div>

          <div className="vote-grid">
            {options.map((option) => (
              <article
                key={option.id}
                className={[
                  "vote-card",
                  option.selected ? "vote-card--selected" : "",
                  option.locked ? "vote-card--locked" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <p className="vote-card__label">Jugador</p>
                <p className="vote-card__value">{option.name}</p>
                <p className="vote-card__copy">
                  {option.note ?? "Un candidato posible para el voto."}
                </p>
                <div className="game-panel__meta-row">
                  {option.selected ? (
                    <span className="category-pill category-pill--accent">Marcado</span>
                  ) : null}
                  {option.locked ? (
                    <span className="category-pill category-pill--danger">Bloqueado</span>
                  ) : null}
                  {option.voteCount ? (
                    <span className="category-pill">{option.voteCount}</span>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </div>

        {tieMessage ? (
          <div className="tie-card">
            <p className="tie-card__title">{tieLabel}</p>
            <p className="tie-card__copy">{tieMessage}</p>
          </div>
        ) : null}

        {children ? <div className="game-panel__actions">{children}</div> : null}
      </div>
    </section>
  );
}
