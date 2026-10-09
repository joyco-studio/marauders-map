import { mapPoint, type Point } from '../map/data'
import { MAX_RENDERED_PEOPLE, roster, type Person, type Waypoint } from './roster'
import { WINDOW_MS, recentEvents, safeActivityUrl, type ActivityEvent, type ActivitySnapshot } from './types'
const point = mapPoint
export const waypoints:Record<Waypoint,Point> = {
  west:point([500,570]),center:point([1215,570]),east:point([1960,570]),
  'great-hall':point([500,495]),library:point([1215,465]),courtyard:point([1215,640]),
  classrooms:point([500,710]),stairs:point([1960,710]),tower:point([1960,460]),
}
const edges:readonly (readonly [Waypoint,Waypoint])[] = [
  ['west','center'],['center','east'],['west','great-hall'],['west','classrooms'],
  ['center','library'],['center','courtyard'],['east','stairs'],['east','tower'],
]
export const eventDestination = {code:'library','pull-request':'great-hall',conversation:'courtyard',release:'great-hall',video:'classrooms'} as const
export function shortestPath(from:Waypoint,to:Waypoint):Waypoint[] {
  const distances=new Map<Waypoint,number>([[from,0]]), paths=new Map<Waypoint,Waypoint[]>([[from,[from]]]), visited=new Set<Waypoint>()
  while(visited.size<Object.keys(waypoints).length) {
    const current=[...distances].filter(([id])=>!visited.has(id)).sort((a,b)=>a[1]-b[1]||a[0].localeCompare(b[0]))[0]?.[0]
    if(!current)break
    if(current===to)return paths.get(to)!
    visited.add(current)
    for(const [a,b] of edges) {
      const next=a===current?b:b===current?a:undefined
      if(!next)continue
      const p=waypoints[current],q=waypoints[next],distance=distances.get(current)!+Math.hypot(q[0]-p[0],q[1]-p[1])
      if(distance<(distances.get(next)??Infinity)){distances.set(next,distance);paths.set(next,[...paths.get(current)!,next])}
    }
  }
  return [from]
}
export function eligible(person:Person, events:readonly ActivityEvent[],now=Date.now()) {
  return person.group==='ecosystem'||events.some(e=>e.personId===person.id&&e.source==='github'&&Date.parse(e.occurredAt)>now-WINDOW_MS&&Date.parse(e.occurredAt)<=now&&!!safeActivityUrl(e.url,'github'))
}
type Walk = {path:Waypoint[]; segment:number; distance:number}
export type Journey = Walk & {event:ActivityEvent; phase:'outbound'|'arrival'|'return'; pause:number}
export type ActorState = {person:Person; point:Point; angle:number; queue:ActivityEvent[]; journey?:Journey; wander?:Walk; rendered:boolean; eligible:boolean; visible:boolean; delay:number; ink:number; retired:boolean}
export class ActivityJourneys {
  actors:ActorState[]=roster.map(person=>({person,point:waypoints[person.home],angle:0,queue:[],eligible:person.group==='ecosystem',visible:person.group==='ecosystem',delay:0,ink:.65,retired:false,rendered:false}))
  private wandering=false
  private maxPeople:number
  constructor(maxPeople=MAX_RENDERED_PEOPLE, private random= Math.random) {
    this.maxPeople=Math.max(1,Math.min(roster.length,Number.isFinite(maxPeople)?Math.floor(maxPeople):MAX_RENDERED_PEOPLE))
    this.updateRendered()
  }
  private seen=new Set<string>()
  private initialized=new Set<string>()
  private events:ActivityEvent[]=[]
  private latestGithub=new Map<string,number>()
  arrivals: {personId:string;event:ActivityEvent}[]=[]
  setActivity(snapshot:ActivitySnapshot, now=Date.now()) {
    this.wandering=snapshot.mode==='wandering'
    this.events=recentEvents(snapshot.events,now)
    this.latestGithub.clear()
    for(const event of this.events)if(event.source==='github')this.latestGithub.set(event.personId,Math.max(this.latestGithub.get(event.personId)??0,Date.parse(event.occurredAt)))
    this.updateEligibility(now)
    for(const [index,actor] of this.actors.entries()) {
      const items=this.events.filter(e=>e.personId===actor.person.id)
      // Cold unavailable responses do not consume a person's first successful fetch.
      if(!snapshot.sources.some(s=>s.personId===actor.person.id&&(s.status==='ok'||s.lastSuccessfulAt)))continue
      const first=!this.initialized.has(actor.person.id)
      const unseen=items.filter(e=>!this.seen.has(e.id))
      for(const e of items)this.seen.add(e.id)
      this.initialized.add(actor.person.id)
      if(!actor.eligible)continue
      if(first){actor.queue=unseen.slice(0,1);actor.delay=index*2}
      else actor.queue=[...actor.queue,...unseen].sort((a,b)=>Date.parse(a.occurredAt)-Date.parse(b.occurredAt)).slice(-3)
      actor.ink=items.length && now-Date.parse(items[0].occurredAt)<86400000 ? 1 : .65
    }
    this.updateRendered()
  }
  private updateEligibility(now:number) {
    for(const actor of this.actors) {
      const next=actor.person.group==='ecosystem'||(this.latestGithub.get(actor.person.id)??0)>now-WINDOW_MS
      if(!next){actor.queue=[];actor.retired=true;actor.visible=!!actor.journey}
      else {actor.retired=false;actor.visible=true}
      if(actor.queue.some(event=>Date.parse(event.occurredAt)<=now-WINDOW_MS))actor.queue=actor.queue.filter(event=>Date.parse(event.occurredAt)>now-WINDOW_MS)
      actor.eligible=next
    }
  }
  private updateRendered() {
    // Keep ongoing real journeys visible, then rotate waiting activity into free slots.
    const candidates=this.actors.filter(actor=>actor.visible).sort((a,b)=>{
      const priority=(actor:ActorState)=>actor.journey?0:actor.queue.length?1:actor.person.group==='ecosystem'?2:3
      return priority(a)-priority(b)||(a.rendered===b.rendered?0:a.rendered?-1:1)||roster.indexOf(a.person)-roster.indexOf(b.person)
    })
    const selected=new Set(candidates.slice(0,this.maxPeople))
    for(const actor of this.actors)actor.rendered=selected.has(actor)
  }
  private walk(actor:ActorState,walk:Walk,dt:number,speed:number) {
    let remaining=dt*speed
    while(remaining>0&&walk.segment<walk.path.length-1) {
      const a=waypoints[walk.path[walk.segment]],b=waypoints[walk.path[walk.segment+1]]
      const length=Math.hypot(b[0]-a[0],b[1]-a[1]),step=Math.min(remaining,length-walk.distance)
      walk.distance+=step;remaining-=step
      const t=walk.distance/length
      actor.point=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]
      actor.angle=Math.atan2(-(b[1]-a[1]),b[0]-a[0])-Math.PI/2
      if(walk.distance>=length){walk.segment++;walk.distance=0}
    }
    return walk.segment>=walk.path.length-1
  }
  tick(dt:number, active:boolean,now=Date.now()) {
    this.arrivals.length=0
    this.updateEligibility(now)
    this.updateRendered()
    if(!active)return
    for(const actor of this.actors) {
      actor.delay=Math.max(0,actor.delay-dt)
      if(!actor.rendered)continue
      if(actor.wander) {
        if(this.walk(actor,actor.wander,dt,26)){actor.wander=undefined;actor.point=waypoints[actor.person.home]}
        continue
      }
      if(!actor.journey&&actor.eligible&&actor.queue.length&&actor.delay===0) {
        const event=actor.queue.shift()!,destination=eventDestination[event.kind]
        let path=shortestPath(actor.person.home,destination)
        if(path.length===1){const neighbor=edges.find(([a,b])=>a===destination||b===destination)!;path=[destination,neighbor[0]===destination?neighbor[1]:neighbor[0],destination]}
        actor.journey={event,path,segment:0,distance:0,phase:'outbound',pause:0}
      }
      const journey=actor.journey
      if(!journey) {
        // No token: explicitly fictional roaming, with no invented events or arrivals.
        if(this.wandering&&actor.person.group==='ecosystem'&&!actor.queue.length) {
          const choices=(Object.keys(waypoints) as Waypoint[]).filter(id=>id!==actor.person.home)
          const destination=choices[Math.min(choices.length-1,Math.floor(this.random()*choices.length))]
          const outbound=shortestPath(actor.person.home,destination)
          actor.wander={path:[...outbound,...outbound.slice(0,-1).reverse()],segment:0,distance:0}
        }
        continue
      }
      if(journey.phase==='arrival') {
        journey.pause+=dt
        if(journey.pause>=6){journey.phase='return';journey.path=shortestPath(eventDestination[journey.event.kind],actor.person.home);journey.segment=0;journey.distance=0}
        continue
      }
      if(this.walk(actor,journey,dt,26)) {
        if(journey.phase==='outbound'){journey.phase='arrival';this.arrivals.push({personId:actor.person.id,event:journey.event})}
        else {actor.journey=undefined;actor.point=waypoints[actor.person.home];actor.visible=actor.eligible}
      }
    }
    this.updateRendered()
  }
}
export function arrivalInscription(name:string,event:ActivityEvent) {
  switch(event.kind) {
    case 'video':return `${name} published a new lesson.`
    case 'pull-request':return `${name} ${event.title.startsWith('Reopened')?'reopened':'opened'} a proposal.`
    case 'code':return `${name} left fresh code in the library.`
    case 'conversation':return `${name} joined the conversation.`
    case 'release':return 'A new release reached the Commons.'
  }
}
