export type Rng = () => number;

export function createGameSeed(prefix = "interruptor"): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

export function deriveSeed(...parts: Array<string | number | boolean | null | undefined>): string {
  return parts
    .map((part) => (part === null || part === undefined ? "" : String(part)))
    .join("|");
}

function hashSeed(seed: string): number {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function createSeededRng(seed: string | number): Rng {
  let state = hashSeed(String(seed)) || 1;

  return function nextRandom() {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomInt(rng: Rng, maxExclusive: number): number {
  if (maxExclusive <= 0) {
    return 0;
  }

  return Math.floor(rng() * maxExclusive);
}

export function pickOne<T>(items: readonly T[], rng: Rng): T {
  if (items.length === 0) {
    throw new Error("No se puede elegir un elemento de una lista vacia.");
  }

  return items[randomInt(rng, items.length)];
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const result = items.slice();

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(rng, index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}
