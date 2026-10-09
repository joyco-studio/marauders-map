import { clamp, revealProgress, smooth } from "./state"

// Erase the outgoing inscription before the next one blooms from its center.
export function coverBlend(age: number, reduced = false) {
  if (reduced) return { outgoing: 0, incoming: 1, complete: true }
  return {
    outgoing: 1 - smooth(clamp(age / .45)),
    incoming: revealProgress(age, .35, .9),
    complete: age >= 1.25,
  }
}
