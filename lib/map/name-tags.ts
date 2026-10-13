/** Bounds and name centers in map-scene units; priority is the original draw order. */
export type NameTag = {
  id:string; x:number; y:number; width:number; height:number
  nameX:number; nameY:number; bodyX:number; bodyY:number; bodyWidth:number; bodyHeight:number
  priority:number; visible:boolean; interactive:boolean
}

export const NAME_TAG_OPACITY=.3
export const NAME_TAG_OVERLAP=.2

/** Ignore transparent artwork margins and curls: only the central parchment bodies count. */
function overlaps(a:NameTag,b:NameTag):boolean {
  const width=Math.max(0,Math.min(a.bodyX+a.bodyWidth/2,b.bodyX+b.bodyWidth/2)-Math.max(a.bodyX-a.bodyWidth/2,b.bodyX-b.bodyWidth/2))
  const height=Math.max(0,Math.min(a.bodyY+a.bodyHeight/2,b.bodyY+b.bodyHeight/2)-Math.max(a.bodyY-a.bodyHeight/2,b.bodyY-b.bodyHeight/2))
  const area=Math.min(a.bodyWidth*a.bodyHeight,b.bodyWidth*b.bodyHeight)
  return area>0&&width*height/area+1e-9>=NAME_TAG_OVERLAP
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
