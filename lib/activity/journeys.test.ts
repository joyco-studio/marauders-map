import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ActivityJourneys, eligible, shortestPath, waypoints, arrivalInscription } from './journeys'
import { roster } from './roster'
import { WINDOW_MS, type ActivityEvent, type ActivitySnapshot } from './types'
const now=Date.parse('2026-10-09T12:00:00Z')
const event=(id:string,personId='mrdoob',age=1000):ActivityEvent=>({id,personId,source:'github',kind:'code',occurredAt:new Date(now-age).toISOString(),title:'Fresh code',url:'https://github.com/a/b'})
const snapshot=(events:ActivityEvent[]):ActivitySnapshot=>({mode:'activity',fetchedAt:new Date(now).toISOString(),events,sources:roster.map(p=>({personId:p.id,source:'github',status:'ok'}))})
test('deterministic routes follow corridor edges and home destinations',()=>{
  assert.deepEqual(shortestPath('classrooms','library'),['classrooms','west','center','library'])
  assert.deepEqual(shortestPath('stairs','great-hall'),['stairs','east','center','west','great-hall'])
})
test('initial fetch stages newest once; repeated polls and duplicate IDs never replay',()=>{
  const sim=new ActivityJourneys(),first=event('a'),old=event('old','mrdoob',10000)
  sim.setActivity(snapshot([first,old,first]),now)
  assert.deepEqual(sim.actors[0].queue.map(e=>e.id),['a'])
  sim.tick(1,true,now);sim.setActivity(snapshot([first,old]),now)
  assert.equal(sim.actors[0].queue.length,0);assert.equal(sim.actors[0].journey?.event.id,'a')
  for(let i=0;i<100;i++)sim.tick(1,true,now)
  sim.setActivity(snapshot([first]),now);assert.equal(sim.actors[0].journey,undefined);assert.equal(sim.actors[0].queue.length,0)
})
test('new polls retain the newest three in publication order while one journey runs',()=>{
  const sim=new ActivityJourneys();sim.setActivity(snapshot([event('a')]),now);sim.tick(1,true,now)
  sim.setActivity(snapshot([event('b','mrdoob',900),event('c','mrdoob',800),event('d','mrdoob',700),event('e','mrdoob',600)]),now)
  assert.deepEqual(sim.actors[0].queue.map(e=>e.id),['c','d','e'])
  assert.equal(sim.actors[0].journey?.event.id,'a')
})
test('close, hidden tabs, and manual mode can pause and resume without teleporting',()=>{
  const sim=new ActivityJourneys();sim.setActivity(snapshot([event('a')]),now);sim.tick(1,true,now)
  const before=JSON.stringify(sim.actors[0])
  sim.tick(100,false,now);assert.equal(JSON.stringify(sim.actors[0]),before)
  sim.setActivity(snapshot([event('a')]),now);sim.tick(1,true,now)
  assert.notDeepEqual(sim.actors[0].point,JSON.parse(before).point)
  assert.equal(sim.actors[0].journey?.event.id,'a')
})
test('arrivals pause six seconds and return home; home events briefly retrace a corridor',()=>{
  const sim=new ActivityJourneys();sim.setActivity(snapshot([{...event('a'),kind:'release'}]),now);sim.tick(.1,true,now)
  assert.notDeepEqual(sim.actors[0].point,waypoints['great-hall'])
  for(let i=0;i<100&&sim.actors[0].journey?.phase!=='arrival';i++)sim.tick(.1,true,now)
  assert.equal(sim.actors[0].journey?.phase,'arrival')
  sim.tick(5.9,true,now);assert.equal(sim.actors[0].journey?.phase,'arrival')
  sim.tick(.1,true,now);assert.equal(sim.actors[0].journey?.phase,'return')
  sim.tick(.1,true,now);assert.equal(sim.actors[0].journey,undefined);assert.deepEqual(sim.actors[0].point,waypoints['great-hall'])
})
test('JOYCO eligibility excludes cold failures and expires exactly at the boundary',()=>{
  const person=roster[7]
  assert.equal(eligible(person,[],now),false)
  assert.equal(eligible(person,[event('a',person.id,WINDOW_MS-1)],now),true)
  assert.equal(eligible(person,[event('a',person.id,WINDOW_MS)],now),false)
  assert.equal(eligible(person,[{...event('a',person.id),source:'youtube',kind:'video'}],now),false)
  assert.equal(eligible(roster[0],[],now),true)
})
test('stale eligibility expires during a journey, finishes, hides, and re-enters once',()=>{
  const sim=new ActivityJourneys(),id=roster[7].id,old=event('old',id,WINDOW_MS-1000)
  sim.setActivity(snapshot([old]),now)
  sim.tick(15,true,now)
  const actor=sim.actors[7];assert.ok(actor.journey)
  sim.tick(.1,true,now+1000)
  assert.equal(actor.eligible,false);assert.equal(actor.visible,true);assert.equal(actor.queue.length,0)
  for(let i=0;i<200;i++)sim.tick(1,true,now+1000)
  assert.equal(actor.visible,false);assert.equal(actor.journey,undefined)
  const fresh=event('fresh',id)
  sim.setActivity(snapshot([fresh,old]),now+1000);assert.equal(actor.visible,true)
  assert.deepEqual(actor.queue.map(e=>e.id),['fresh'])
  sim.setActivity(snapshot([fresh]),now+1000);assert.equal(actor.queue.length,1)
})
test('unavailable cold snapshots do not consume initial staging or reveal JOYCO',()=>{
  const sim=new ActivityJourneys();sim.setActivity({mode:'activity',fetchedAt:new Date(now).toISOString(),events:[],sources:[]},now)
  assert.equal(sim.actors.filter(a=>a.visible).length,7)
  sim.setActivity(snapshot([event('old'),event('new','mrdoob',1)]),now)
  assert.deepEqual(sim.actors[0].queue.map(e=>e.id),['new'])
})
test('arrival copy distinguishes reopened proposals and video publications',()=>{
  assert.equal(arrivalInscription('Akella',{...event('a'),kind:'video'}),'Akella published a new lesson.')
  assert.equal(arrivalInscription('mrdoob',{...event('a'),kind:'pull-request',title:'Reopened proposal: ink'}),'mrdoob reopened a proposal.')
})

test('the rendering cap keeps journeys visible and rotates every waiting person through',()=>{
  const sim=new ActivityJourneys(3)
  sim.setActivity(snapshot(roster.map((p,i)=>event(`person-${i}`,p.id))),now)
  const arrived=new Set<string>()
  for(let i=0;i<600;i++) {
    sim.tick(.5,true,now)
    assert.ok(sim.actors.filter(actor=>actor.rendered).length<=3)
    for(const actor of sim.actors)if(actor.journey)assert.equal(actor.rendered,true)
    for(const arrival of sim.arrivals)arrived.add(arrival.personId)
  }
  assert.equal(arrived.size,roster.length)
  assert.ok(sim.actors.every(actor=>!actor.journey&&!actor.queue.length))
})
test('no-token wandering is random corridor movement without invented events or JOYCO eligibility',()=>{
  const sim=new ActivityJourneys(4,()=>.75)
  sim.setActivity({...snapshot([]),mode:'wandering'},now)
  sim.tick(.1,true,now);sim.tick(1,true,now)
  assert.equal(sim.actors.filter(actor=>actor.rendered).length,4)
  assert.ok(sim.actors[0].wander)
  assert.notDeepEqual(sim.actors[0].point,waypoints[sim.actors[0].person.home])
  assert.equal(sim.arrivals.length,0)
  assert.ok(sim.actors.every(actor=>!actor.journey&&!actor.queue.length))
  assert.ok(sim.actors.filter(actor=>actor.person.group==='joyco').every(actor=>!actor.eligible&&!actor.rendered))
  const before=JSON.stringify(sim.actors)
  sim.tick(100,false,now);assert.equal(JSON.stringify(sim.actors),before)
})
test('real YouTube lessons remain event-driven in no-token mode',()=>{
  const sim=new ActivityJourneys(8,()=>.5)
  const upload={...event('lesson','akella'),source:'youtube' as const,kind:'video' as const,url:'https://www.youtube.com/watch?v=abcdefghijk'}
  const input={...snapshot([upload]),mode:'wandering' as const,sources:[{personId:'akella',source:'youtube' as const,status:'ok' as const}]}
  sim.setActivity(input,now)
  const arrivals:string[]=[]
  for(let i=0;i<100;i++){sim.tick(.5,true,now);arrivals.push(...sim.arrivals.map(a=>a.event.id))}
  assert.deepEqual(arrivals,['lesson'])
  sim.setActivity(input,now);assert.equal(sim.actors[4].queue.length,0)
})
test('enabling activity while roaming completes the current corridor loop without teleporting',()=>{
  const sim=new ActivityJourneys(8,()=>.5)
  sim.setActivity({...snapshot([]),mode:'wandering'},now);sim.tick(.1,true,now);sim.tick(1,true,now)
  const point=[...sim.actors[0].point]
  sim.setActivity(snapshot([event('real')]),now)
  assert.deepEqual(sim.actors[0].point,point)
  const arrivals:string[]=[]
  for(let i=0;i<200;i++){sim.tick(.5,true,now);arrivals.push(...sim.arrivals.map(a=>a.event.id))}
  assert.deepEqual(arrivals,['real']);assert.equal(sim.actors[0].wander,undefined)
})
test('events that expire while waiting for a rendered slot never start a new journey',()=>{
  const sim=new ActivityJourneys(1)
  sim.setActivity(snapshot([event('first'),event('expires','sunag',WINDOW_MS-1)]),now)
  sim.tick(.1,true,now+1)
  assert.equal(sim.actors[1].queue.length,0)
})
test('makers retain full ink strength regardless of activity age or missing activity',()=>{
  const sim=new ActivityJourneys()
  assert.ok(sim.actors.every(actor=>actor.ink===1))
  sim.setActivity(snapshot([event('older','mrdoob',3*86400000)]),now)
  assert.ok(sim.actors.every(actor=>actor.ink===1))
})
