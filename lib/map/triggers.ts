import { hotspots } from "./data"
import type { MapState } from "./state"

export type Trigger = "welcome" | "open-left" | "open-right" | "passage" | "close"
export type FocusedTrigger = Trigger | "open"
export function eligibleTrigger(target:FocusedTrigger,state:MapState,discovered:boolean) {
  if(state.phase==="folded")return state.greeting ? target==="open"||target==="open-left"||target==="open-right" : target==="welcome"
  return state.phase==="exploring"&&(target==="close"||target==="passage"&&!discovered)
}
export function resolveTrigger(point:{x:number;y:number}|null,state:MapState,discovered:boolean):Trigger|null {
  if(!point)return null
  const {x,y}=point
  if(state.phase==="folded") {
    return state.greeting ? "open-left" : "welcome"
  }
  return hotspots.find(h=>eligibleTrigger(h.id,state,discovered)&&Math.abs(x-h.center[0])<h.radius[0]&&Math.abs(y-h.center[1])<h.radius[1])?.id as Trigger|undefined ?? null
}
