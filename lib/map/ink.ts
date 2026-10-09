import { color, float, length, mix, positionLocal, select, sin, smoothstep, uniform } from "three/tsl"
import { Vector2, type Node, type UniformNode } from "three/webgpu"
import type { TextEffect } from "lettra/three"

/** Coordinates are object-local physical units, never atlas UVs: a whole phrase
 * blooms from one center, while every footprint owns a separate uniform. */
export function createInk(width: number, height: number, seed: number, noiseAmount: UniformNode<"float", number>, center: readonly [number, number] = [.5, .5]) {
  const progress = uniform(0)
  const opacity = uniform(1)
  const bounds = uniform(new Vector2(Math.max(width,.001), Math.max(height,.001)))
  const seedNode = uniform(seed)
  const origin = uniform(new Vector2((center[0]-.5)*width, (.5-center[1])*height))
  const coord = positionLocal.xy.sub(origin).div(bounds)
  const radius = length(coord).div(.7072)
  const coarse = sin(positionLocal.x.mul(23).add(seedNode)).mul(sin(positionLocal.y.mul(31).add(seedNode.mul(2))))
  const fine = sin(positionLocal.x.mul(113).add(seedNode.mul(3))).mul(sin(positionLocal.y.mul(97)))
  const noise = coarse.mul(.055).add(fine.mul(.012)).mul(noiseAmount)
  const front = progress.mul(1.18).sub(.08).sub(radius).add(noise)
  const expanding = smoothstep(-.045,.045,front)
  const coverage = select(progress.lessThanEqual(0),float(0),select(progress.greaterThanEqual(1),float(1),expanding))
  const wet = smoothstep(-.01,.03,front).mul(smoothstep(.04,.12,front).oneMinus()).mul(select(progress.lessThan(1),float(1),float(0)))
  const pigment = mix(color("#69432c"),color("#352218"),wet)
  const effect: TextEffect = {
    uniforms: {progress,opacity},
    stages: {
      opacity: (previous) => previous.mul(coverage).mul(opacity),
      color: () => pigment as Node<"vec3">,
    },
  }
  return {progress,opacity,coverage,pigment,effect}
}
export type Ink = ReturnType<typeof createInk>
