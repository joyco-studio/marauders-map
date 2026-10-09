import { clamp, smooth } from "./state"

// Outer leaves stack above their inner leaves first. The inner hinges then
// carry each pair underneath the cover, in separate turns and separate layers.
export function foldPose(fold: number, side: number, depth: number) {
  const start = depth === 2 ? (side < 0 ? 0 : .2) : (side < 0 ? .4 : .7)
  const duration = depth === 2 ? .2 : .3
  const progress = smooth(clamp((fold - start) / duration))
  return {
    angle: side * (depth === 2 ? -1 : 1) * Math.PI * progress,
    z: (depth === 2 ? .18 : side < 0 ? -.18 : -.54) * progress,
  }
}
