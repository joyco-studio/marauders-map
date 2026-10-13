/** Bounds and name centers in map-scene units; priority is the original draw order. */
export type NameTag = {
  id:string; x:number; y:number; width:number; height:number
  nameX:number; nameY:number; nameWidth:number; nameHeight:number
  priority:number; visible:boolean; interactive:boolean
}

export const NAME_TAG_OPACITY=.3
export const NAME_TAG_OVERLAP=.65

/** Ignore transparent artwork margins and curls: only substantial name-area coverage counts. */
function overlaps(a:NameTag,b:NameTag):boolean {
  const width=Math.max(0,Math.min(a.nameX+a.nameWidth/2,b.nameX+b.nameWidth/2)-Math.max(a.nameX-a.nameWidth/2,b.nameX-b.nameWidth/2))
  const height=Math.max(0,Math.min(a.nameY+a.nameHeight/2,b.nameY+b.nameHeight/2)-Math.max(a.nameY-a.nameHeight/2,b.nameY-b.nameHeight/2))
  const area=Math.min(a.nameWidth*a.nameHeight,b.nameWidth*b.nameHeight)
  return area>0&&width*height/area>=NAME_TAG_OVERLAP
}

/** Only direct neighbors collide: a distant member of a chain never steals priority. */
export function nameTagOpacities(tags:readonly NameTag[],hovered?:string):number[] {
  return tags.map(tag=> {
    if(!tag.visible||tag.id===hovered)return 1
    const covered=tags.some(other=>other.visible&&other.id!==tag.id&&
      (other.id===hovered||other.priority>tag.priority)&&overlaps(tag,other))
    return covered?NAME_TAG_OPACITY:1
  })
}

/** Picking ignores promoted draw order, so promotion cannot steal the next hover. */
export function nameTagAt(tags:readonly NameTag[],point:{x:number;y:number},hovered?:string,engaged?:string):string|undefined {
  let best:NameTag|undefined,distance=Infinity
  for(const tag of tags){
    if(!tag.visible||!tag.interactive||Math.abs(point.x-tag.x)>tag.width/2||Math.abs(point.y-tag.y)>Math.max(.18,tag.height/2))continue
    // A press owns emphasis through release/click, until the pointer leaves its bounds.
    if(tag.id===engaged)return tag.id
    const next=(point.x-tag.nameX)**2+(point.y-tag.nameY)**2
    const tied=Math.abs(next-distance)<1e-8
    if(next<distance-1e-8||tied&&(!best||tag.id===hovered||best.id!==hovered&&tag.priority>best.priority)){
      best=tag;distance=next
    }
  }
  return best?.id
}

export function easeNameTagOpacity(current:number,target:number,dt:number,reducedMotion:boolean):number {
  // Reach 95% of the target in 150 ms, regardless of frame rate.
  const next=reducedMotion?target:current+(target-current)*(1-Math.exp(-dt*20))
  return Math.abs(next-target)<.001?target:next
}
