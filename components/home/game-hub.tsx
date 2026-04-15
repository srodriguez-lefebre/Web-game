import Link from "next/link";

const games = [
  {
    id: "interruptor",
    name: "Interruptor",
    href: "/interruptor",
    description:
      "El juego del impostor en una sola pantalla. Configura la ronda, reparte el telefono y deja correr el reloj.",
    status: "Disponible ahora",
    tags: ["Pass & play", "3 a 12 jugadores", "En espanol"],
  },
  {
    id: "doble-fondo",
    name: "Doble Fondo",
    href: "#",
    description:
      "Faroleo rapido, pistas tramposas y decisiones cortas para jugar en reuniones o previas.",
    status: "Proximamente",
    tags: ["Bluff", "Mesa local", "En preparacion"],
  },
  {
    id: "codigo-rojo",
    name: "Codigo Rojo",
    href: "#",
    description:
      "Caos cooperativo con cuenta regresiva, roles ocultos y tareas simultaneas para el grupo.",
    status: "Proximamente",
    tags: ["Cooperativo", "Tiempo real", "En preparacion"],
  },
] as const;

export function GameHub() {
  const [featuredGame, ...otherGames] = games;

  return (
    <main className="hub-shell">
      <section className="hub-surface">
        <header className="hub-hero">
          <div className="hub-hero__copy">
            <p className="hub-hero__eyebrow">Arcade casero</p>
            <h1 className="hub-hero__title">Elige un jueguito y arranca</h1>
          </div>
        </header>

        <section className="hub-section">
          <div className="hub-section__header">
            <div>
              <p className="hub-section__eyebrow">Juegos</p>
              <h2 className="hub-section__title">Elige uno de los cuadros</h2>
            </div>
          </div>

          <div className="hub-grid">
            <Link href={featuredGame.href} className="hub-card hub-card--featured">
              <div className="hub-card__glow" />

              <div className="hub-card__content">
                <div className="hub-logo" aria-hidden="true">
                  <span className="hub-logo__halo" />
                  <span className="hub-logo__mask" />
                  <span className="hub-logo__eye" />
                  <span className="hub-logo__shine" />
                </div>

                <div className="hub-card__copy">
                  <div className="hub-card__topline">
                    <span className="hub-pill hub-pill--mint">{featuredGame.status}</span>
                    <span className="hub-card__arrow">Entrar</span>
                  </div>

                  <h3 className="hub-card__title">{featuredGame.name}</h3>
                  <p className="hub-card__description">{featuredGame.description}</p>

                  <div className="hub-tag-row">
                    {featuredGame.tags.map((tag) => (
                      <span key={tag} className="hub-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>

            {otherGames.map((game) => (
              <article key={game.id} className="hub-card hub-card--disabled">
                <div className="hub-card__content">
                  <div className="hub-card__mini-logo" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>

                  <div className="hub-card__copy">
                    <div className="hub-card__topline">
                      <span className="hub-pill">{game.status}</span>
                    </div>

                    <h3 className="hub-card__title">{game.name}</h3>
                    <p className="hub-card__description">{game.description}</p>

                    <div className="hub-tag-row">
                      {game.tags.map((tag) => (
                        <span key={tag} className="hub-tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
