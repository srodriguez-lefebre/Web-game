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
}: GameShellProps) {
  const layoutClassName = aside
    ? "game-shell__layout"
    : "game-shell__layout game-shell__layout--full";

  return (
    <main className="game-shell">
      <section className="game-shell__surface">
        <header className="game-shell__topbar">
          <div>
            {backHref ? (
              <Link href={backHref} className="game-shell__backlink">
                {backLabel}
              </Link>
            ) : null}
            <p className="game-shell__eyebrow">{eyebrow}</p>
            <div className="game-shell__title-row">
              <h1 className="game-shell__title">{title}</h1>
            </div>
          </div>

          <p className="game-shell__subtitle">{subtitle}</p>
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
