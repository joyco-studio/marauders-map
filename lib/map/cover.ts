import { clamp, revealProgress, smooth } from "./state"

// Erase the outgoing inscription before the next one blooms from its center.
export function coverBlend(age: number) {
  return {
    outgoing: 1 - smooth(clamp(age / .45)),
    incoming: revealProgress(age, .35, .9),
    complete: age >= 1.25,
  }
}
