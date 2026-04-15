import Link from "next/link";
import type { ReactNode } from "react";

type GameShellProps = {
  eyebrow?: string;
  title: string;
  subtitle: string;
  phase?: string;
  status?: string;
  children: ReactNode;
  aside?: ReactNode;
  footer?: ReactNode;
  backHref?: string;
  backLabel?: string;
  onBack?: () => void;
};

export function GameShell({
  eyebrow = "Juego local",
  title,
  subtitle,
  phase,
  status,
  children,
  aside,
  footer,
  backHref,
  backLabel = "Volver",
  onBack,
}: GameShellProps) {
  const layoutClassName = aside
    ? "game-shell__layout"
    : "game-shell__layout game-shell__layout--full";

  return (
    <main className="game-shell">
      <section className="game-shell__surface">
        <header className="game-shell__topbar">
          <div className="game-shell__topline">
            <p className="game-shell__eyebrow">{eyebrow}</p>
            {backHref ? (
              <Link href={backHref} className="game-shell__backlink" onClick={onBack}>
                {backLabel}
              </Link>
            ) : null}
          </div>

          <div>
            <div className="game-shell__title-row">
              <h1 className="game-shell__title">{title}</h1>
            </div>

            <p className="game-shell__subtitle">{subtitle}</p>
          </div>
        </header>

        <div className="game-shell__status">
          {phase ? <span className="game-shell__badge">{phase}</span> : null}
          {status ? <span className="game-shell__badge">{status}</span> : null}
        </div>

        <div className={layoutClassName}>
          <div className="game-shell__stack">{children}</div>

          {aside ? <aside className="game-shell__rail">{aside}</aside> : null}
        </div>

        {footer ? <footer className="game-shell__footer">{footer}</footer> : null}
      </section>
    </main>
  );
}
