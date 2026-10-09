import { float, fwidth, smoothstep, texture, uniform, uv } from "three/tsl"
import { Vector4, type Texture, type Node } from "three/webgpu"
import manifest from "../../public/map/sdf/manifest.json"

export type SdfEntry = {texture:string;size:number[];viewBox:number[];uv:number[]}
export const sdfImages:Record<string,SdfEntry> = manifest.images
export function sdfCoverage(map:Texture,entry:SdfEntry,coordinates:Node<"vec2">=uv()) {
  const rect=uniform(new Vector4(...entry.uv as [number,number,number,number]))
  const distance=texture(map,coordinates.mul(rect.zw).add(rect.xy)).r
  const feather=fwidth(distance).mul(.7).max(1/255)
  return smoothstep(float(.5).sub(feather),float(.5).add(feather),distance)
}
