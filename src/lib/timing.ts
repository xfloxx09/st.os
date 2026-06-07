export function startTimer(): number {
  return Date.now();
}

export function elapsedMs(start: number): number {
  return Date.now() - start;
}
