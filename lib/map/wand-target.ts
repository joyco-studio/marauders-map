import { Vector3, type Mesh } from "three/webgpu"

/** Adjacent panels share their full edges: an inset here creates a dead strip
 * and snaps the tip when the nearest panel changes. */
export function boundWandTarget(target:Vector3,panels:readonly Mesh[],output:Vector3,scratch:Vector3) {
  let nearest=Infinity
  output.copy(target)
  for(const panel of panels){
    scratch.copy(target);panel.worldToLocal(scratch)
    scratch.x=Math.max(-1.4,Math.min(1.4,scratch.x))
    scratch.y=Math.max(-3.5,Math.min(3.5,scratch.y))
    scratch.z=.06
    panel.localToWorld(scratch)
    const distance=scratch.distanceToSquared(target)
    if(distance<nearest){nearest=distance;output.copy(scratch)}
  }
  return output
}
