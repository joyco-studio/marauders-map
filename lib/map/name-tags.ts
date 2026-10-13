/** Bounds and name centers in map-scene units; priority is the original draw order. */
export type NameTag = {
  id:string; x:number; y:number; width:number; height:number
  nameX:number; nameY:number; priority:number; visible:boolean; interactive:boolean
}

export const NAME_TAG_OPACITY=.3
export const NAME_TAG_MARGIN=.06

/** Only direct neighbors collide: a distant member of a chain never steals priority. */
export function nameTagOpacities(tags:readonly NameTag[],hovered?:string):number[] {
  return tags.map(tag=> {
    if(!tag.visible||tag.id===hovered)return 1
    const covered=tags.some(other=>other.visible&&other.id!==tag.id&&
      (other.id===hovered||other.priority>tag.priority)&&
      Math.abs(tag.x-other.x)<=(tag.width+other.width)/2+NAME_TAG_MARGIN&&
      Math.abs(tag.y-other.y)<=(tag.height+other.height)/2+NAME_TAG_MARGIN)
    return covered?NAME_TAG_OPACITY:1
  })
}

/** Picking ignores promoted draw order, so promotion cannot steal the next hover. */
export function nameTagAt(tags:readonly NameTag[],point:{x:number;y:number},hovered?:string):string|undefined {
  let best:NameTag|undefined,distance=Infinity
  for(const tag of tags){
    if(!tag.visible||!tag.interactive||Math.abs(point.x-tag.x)>tag.width/2||Math.abs(point.y-tag.y)>Math.max(.18,tag.height/2))continue
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
