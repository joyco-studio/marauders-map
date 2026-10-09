import type { Point } from '../map/data'

export const ENTRANCE_SECONDS=.7
export const EXIT_SECONDS=.7
export type Appearance={phase:'hidden'|'entering'|'shown'|'exiting';elapsed:number;progress:number;point:Point}
export type PresentationTarget={visible:boolean;point:Point}

/** Exit slots remain occupied until their last frame. Reversals never cut a bloom short. */
export class ActorPresentation {
  actors:Appearance[]
  constructor(points:readonly Point[],private maximum:number) {
    this.actors=points.map(point=>({phase:'hidden',elapsed:0,progress:0,point}))
  }
  update(dt:number,targets:readonly PresentationTarget[]) {
    for(const [index,actor] of this.actors.entries()) {
      const target=targets[index]
      // Walking is continuous; any unexpected relocation must happen between appearances.
      const jumped=Math.hypot(target.point[0]-actor.point[0],target.point[1]-actor.point[1])>26*dt+.01
      if(actor.phase==='shown'&&(!target.visible||jumped)){actor.phase='exiting';actor.elapsed=0}
      if(actor.phase==='entering'||actor.phase==='shown') {
        if(!jumped)actor.point=target.point
      }
      if(actor.phase==='entering') {
        actor.elapsed=Math.min(ENTRANCE_SECONDS,actor.elapsed+dt)
        actor.progress=actor.elapsed/ENTRANCE_SECONDS
        if(actor.elapsed===ENTRANCE_SECONDS){actor.phase='shown';actor.elapsed=0}
      }else if(actor.phase==='exiting') {
        actor.elapsed=Math.min(EXIT_SECONDS,actor.elapsed+dt)
        actor.progress=1-actor.elapsed/EXIT_SECONDS
        if(actor.elapsed===EXIT_SECONDS){actor.phase='hidden';actor.elapsed=0}
      }
    }
    let occupied=this.actors.filter(actor=>actor.phase!=='hidden').length
    for(const [index,actor] of this.actors.entries()) {
      if(occupied>=this.maximum)break
      if(actor.phase==='hidden'&&targets[index].visible){
        actor.point=targets[index].point;actor.phase='entering';actor.elapsed=0;actor.progress=0;occupied++
      }
    }
  }
}
