import { type Point } from '../map/data'
import { MAX_RENDERED_PEOPLE, roster, type Person, type Room } from './roster'
import { WINDOW_MS, recentEvents, safeActivityUrl, type ActivityEvent, type ActivitySnapshot } from './types'
import { rooms, roomObjective, roomRoute, passageRoute, passageMidpoint } from './navigation'
import { ENTRANCE_SECONDS } from './presentation'
export { waypoints, shortestPath, roomObjective } from './navigation'
export const eventDestination = {code:'library','pull-request':'great-hall',conversation:'courtyard',release:'great-hall',video:'classrooms'} as const
export function eligible(person:Person, events:readonly ActivityEvent[],now=Date.now()) {
  return person.group==='ecosystem'||events.some(e=>e.personId===person.id&&e.source==='github'&&Date.parse(e.occurredAt)>now-WINDOW_MS&&Date.parse(e.occurredAt)<=now&&!!safeActivityUrl(e.url,'github'))
}
type Walk = {path:Point[]; segment:number; distance:number}
export type Journey = Walk & {event:ActivityEvent; phase:'outbound'|'arrival'|'return'; pause:number}
export type ActorState = {person:Person; point:Point; angle:number; queue:ActivityEvent[]; journey?:Journey; wander?:Walk; passage?:Walk; base?:Room; rendered:boolean; eligible:boolean; visible:boolean; delay:number; ink:number; retired:boolean}
export class ActivityJourneys {
  actors:ActorState[]=roster.map(person=>({person,point:roomObjective(person,person.home),angle:0,queue:[],eligible:person.group==='ecosystem',visible:person.group==='ecosystem',delay:0,ink:1,retired:false,rendered:false}))
  visitor:ActorState|undefined
  private maxPeople:number
  constructor(maxPeople=MAX_RENDERED_PEOPLE, private random= Math.random) {
    this.maxPeople=Math.max(1,Math.min(roster.length,Number.isFinite(maxPeople)?Math.floor(maxPeople):MAX_RENDERED_PEOPLE))
    this.updateRendered()
  }
  revealPassage(hiddenIds:readonly string[]):ActorState|undefined {
    if(this.visitor)return this.visitor
    const candidates=this.actors.filter(actor=>hiddenIds.includes(actor.person.id))
    if(!candidates.length)return undefined
    const actor=candidates[Math.min(candidates.length-1,Math.floor(this.random()*candidates.length))]
    const destination=rooms[Math.min(rooms.length-1,Math.floor(this.random()*rooms.length))]
    // A fully hidden actor can safely relocate; preserve pending real activity.
    if(actor.journey?.phase==='outbound')actor.queue.unshift(actor.journey.event)
    actor.journey=undefined;actor.wander=undefined;actor.base=destination
    actor.point=passageMidpoint;actor.angle=0;actor.delay=ENTRANCE_SECONDS
    actor.passage={path:passageRoute(actor.person,destination),segment:0,distance:0}
    this.visitor=actor;actor.visible=true
    this.updateRendered()
    return actor
  }
  resetPassage() {
    const actor=this.visitor
    if(!actor)return
    if(actor.journey?.phase==='outbound')actor.queue.unshift(actor.journey.event)
    actor.passage=undefined;actor.journey=undefined;actor.wander=undefined;actor.base=undefined
    actor.point=roomObjective(actor.person,actor.person.home);actor.delay=0
    actor.visible=actor.eligible;this.visitor=undefined
    this.updateRendered()
  }
  private seen=new Set<string>()
  private initialized=new Set<string>()
  private events:ActivityEvent[]=[]
  private latestGithub=new Map<string,number>()
  arrivals: {personId:string;event:ActivityEvent}[]=[]
  setActivity(snapshot:ActivitySnapshot, now=Date.now()) {
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
      if(first){actor.queue=unseen.slice(0,1);if(!actor.passage)actor.delay=index*2}
      else actor.queue=[...actor.queue,...unseen].sort((a,b)=>Date.parse(a.occurredAt)-Date.parse(b.occurredAt)).slice(-3)
      actor.ink=1
    }
    this.updateRendered()
  }
  private updateEligibility(now:number) {
    for(const actor of this.actors) {
      const next=actor.person.group==='ecosystem'||(this.latestGithub.get(actor.person.id)??0)>now-WINDOW_MS
      if(!next){actor.queue=[];actor.retired=true;actor.visible=!!actor.journey||actor===this.visitor}
      else {actor.retired=false;actor.visible=true}
      if(actor.queue.some(event=>Date.parse(event.occurredAt)<=now-WINDOW_MS))actor.queue=actor.queue.filter(event=>Date.parse(event.occurredAt)>now-WINDOW_MS)
      actor.eligible=next
    }
  }
  private updateRendered() {
    // Keep ongoing real journeys visible, then rotate waiting activity into free slots.
    const candidates=this.actors.filter(actor=>actor.visible&&actor!==this.visitor).sort((a,b)=>{
      const priority=(actor:ActorState)=>actor.journey?0:actor.queue.length?1:actor.person.group==='ecosystem'?2:3
      return priority(a)-priority(b)||(a.rendered===b.rendered?0:a.rendered?-1:1)||roster.indexOf(a.person)-roster.indexOf(b.person)
    })
    const selected=new Set(candidates.slice(0,this.maxPeople))
    for(const actor of this.actors)actor.rendered=selected.has(actor)||actor===this.visitor
  }
  private walk(actor:ActorState,walk:Walk,dt:number,speed:number) {
    let remaining=dt*speed
    while(remaining>0&&walk.segment<walk.path.length-1) {
      const a=walk.path[walk.segment],b=walk.path[walk.segment+1]
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
      const waiting=actor.delay>0
      actor.delay=Math.max(0,actor.delay-dt)
      if(!actor.rendered)continue
      const base=actor.base??actor.person.home
      if(actor.passage) {
        if(!waiting&&this.walk(actor,actor.passage,dt,26))actor.passage=undefined
        continue
      }
      if(actor.wander) {
        if(this.walk(actor,actor.wander,dt,26)){actor.wander=undefined;actor.point=roomObjective(actor.person,base)}
        continue
      }
      if(!actor.journey&&actor.eligible&&actor.queue.length&&actor.delay===0) {
        const event=actor.queue.shift()!,destination=eventDestination[event.kind]
        const path=roomRoute(actor.person,base,destination)
        actor.journey={event,path,segment:0,distance:0,phase:'outbound',pause:0}
      }
      const journey=actor.journey
      if(!journey) {
        // Idle roaming is fictional, regardless of token availability; it emits no events.
        if((actor.eligible||actor===this.visitor)&&!actor.queue.length) {
          const choices=rooms.filter(id=>id!==base)
          const destination=choices[Math.min(choices.length-1,Math.floor(this.random()*choices.length))]
          const outbound=roomRoute(actor.person,base,destination)
          actor.wander={path:[...outbound,...outbound.slice(0,-1).reverse()],segment:0,distance:0}
        }
        continue
      }
      if(journey.phase==='arrival') {
        journey.pause+=dt
        if(journey.pause>=6){journey.phase='return';journey.path=journey.path.slice().reverse();journey.segment=0;journey.distance=0}
        continue
      }
      if(this.walk(actor,journey,dt,26)) {
        if(journey.phase==='outbound'){journey.phase='arrival';this.arrivals.push({personId:actor.person.id,event:journey.event})}
        else {actor.journey=undefined;actor.point=roomObjective(actor.person,base);actor.visible=actor.eligible||actor===this.visitor}
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
