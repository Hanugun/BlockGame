export interface RandomState {
  seed: number;
}

export function nextRandom(state: RandomState): number {
  let x = state.seed | 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  state.seed = x | 0;
  return (state.seed >>> 0) / 4_294_967_296;
}

export function deriveSeed(base: number, salt: number): number {
  let seed = base ^ (salt * 0x9e3779b9);
  if (seed === 0) {
    seed = 0x6d2b79f5;
  }
  return seed | 0;
}

export function randomItem<T>(items: readonly T[], state: RandomState): T {
  const index = Math.floor(nextRandom(state) * items.length);
  return items[Math.min(index, items.length - 1)]!;
}
