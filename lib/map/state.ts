export type Phase = "loading" | "enchanting" | "opening" | "revealing" | "exploring" | "erasing" | "closing" | "folded" | "error"
export type MapState = { phase: Exclude<Phase, "error">; enteredAt: number; greeting?: Greeting } | { phase: "error"; enteredAt: number; message: string }
export type Greeting = "welcome"
export type Command = "ready" | "close" | "open" | Greeting
export const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v))
export const smooth = (v: number) => { const t = clamp(v); return t * t * (3 - 2 * t) }
export const durations = { enchanting: .9, opening: 4, revealing: 3, erasing: 1, closing: 3 } as const

export function transition(state: MapState, command: Command, now: number): MapState {
  if (command === "ready" && state.phase === "loading")
    return { phase: "folded", enteredAt: now }
  if (command === "welcome" && state.phase === "folded" && !state.greeting)
    return { phase: "enchanting", enteredAt: now, greeting: command }
  if (command === "open" && state.phase === "folded" && state.greeting)
    return { phase: "opening", enteredAt: now, greeting: state.greeting }
  if (command === "close" && state.phase === "exploring")
    return { phase: "erasing", enteredAt: now, greeting: state.greeting }
  return state
}
export function advance(state: MapState, now: number): MapState {
  const next: Partial<Record<Phase, Phase>> = { enchanting: "folded", opening: "revealing", revealing: "exploring", erasing: "closing", closing: "folded" }
  while (state.phase !== "error" && state.phase in durations) {
    const duration = durations[state.phase as keyof typeof durations]
    if (now - state.enteredAt < duration) break
    const phase = next[state.phase] as Exclude<Phase, "error">
    state = { phase, enteredAt: state.enteredAt + duration, ...((phase !== "folded" || state.phase === "enchanting") && state.greeting ? { greeting: state.greeting } : {}) }
  }
  return state
}
export function revealProgress(time: number, start: number, duration: number) {
  return clamp((time - start) / duration)
}
// Endpoint guards are shared by the CPU schedule and the TSL graph.
export function absorptionCoverage(progress: number, distance: number, noise = 0) {
  if (progress <= 0) return 0
  if (progress >= 1) return 1
  const front = progress * 1.18 - .08 - distance + noise
  return smooth((front + .045) / .09)
}
