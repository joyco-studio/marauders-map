import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ActivityJourneys, eligible, shortestPath, waypoints, roomObjective, arrivalInscription } from './journeys'
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
  const home=roomObjective(roster[0],roster[0].home)
  assert.notDeepEqual(sim.actors[0].point,home)
  for(let i=0;i<400&&sim.actors[0].journey?.phase!=='arrival';i++)sim.tick(.1,true,now)
  assert.equal(sim.actors[0].journey?.phase,'arrival')
  sim.tick(5.9,true,now);assert.equal(sim.actors[0].journey?.phase,'arrival')
  sim.tick(.1,true,now);assert.equal(sim.actors[0].journey?.phase,'return')
  for(let i=0;i<400&&sim.actors[0].journey;i++)sim.tick(.1,true,now)
  assert.equal(sim.actors[0].journey,undefined);assert.deepEqual(sim.actors[0].point,home)
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
    const before=sim.actors.map(actor=>actor.point)
    sim.tick(.5,true,now)
    for(const [index,actor] of sim.actors.entries())assert.ok(Math.hypot(actor.point[0]-before[index][0],actor.point[1]-before[index][1])<=13.00001)
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
  assert.notDeepEqual(sim.actors[0].point,roomObjective(sim.actors[0].person,sim.actors[0].person.home))
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
  assert.deepEqual(arrivals,['real'])
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

test('each room reserves distinct objectives safely inside its walls for the entire roster',async()=>{
  const { elements }=await import('../map/data')
  const rooms=['great-hall','library','courtyard','classrooms','stairs','tower'] as const
  for(const room of rooms){
    const bounds=elements.find(element=>element.id===room)!
    const targets=roster.map(person=>roomObjective(person,room))
    for(const target of targets){
      assert.ok(Math.abs(target[0]-bounds.center[0])<bounds.size[0]/2-10)
      assert.ok(Math.abs(target[1]-bounds.center[1])<bounds.size[1]/2-10)
      if(room==='tower')assert.ok(Math.hypot(target[0]-bounds.center[0],target[1]-bounds.center[1])<bounds.size[0]*.4)
    }
    for(let i=0;i<targets.length;i++)for(let j=i+1;j<targets.length;j++){
      assert.ok(Math.hypot(targets[i][0]-targets[j][0],targets[i][1]-targets[j][1])>25,`${room}: ${roster[i].id} and ${roster[j].id}`)
    }
  }
})
test('activity enters the room through its doorway and pauses at the reserved interior objective',()=>{
  const sim=new ActivityJourneys(8,()=>.5)
  sim.setActivity(snapshot([event('inside')]),now)
  const visited: (readonly[number,number])[]=[]
  for(let i=0;i<2000;i++){
    sim.tick(.1,true,now)
    const actor=sim.actors[0]
    visited.push(actor.point)
    if(actor.journey?.phase==='arrival')break
  }
  const actor=sim.actors[0],objective=roomObjective(actor.person,'library')
  assert.equal(actor.journey?.phase,'arrival')
  assert.deepEqual(actor.point,objective)
  assert.notDeepEqual(objective,waypoints.library)
  assert.ok(visited.some(point=>Math.hypot(point[0]-waypoints.library[0],point[1]-waypoints.library[1])<3))
  sim.tick(5,true,now);assert.deepEqual(actor.point,objective)
})
test('idle roaming continues in activity mode after replay with no false arrivals or teleports',()=>{
  const sim=new ActivityJourneys(8,()=>.4)
  sim.setActivity(snapshot([event('once')]),now)
  const arrivals:string[]=[],actor=sim.actors[0]
  let replayed=false,completedLoops=0,previousWander=actor.wander
  for(let i=0;i<6000;i++){
    const before=[...actor.point]
    sim.tick(.1,true,now)
    assert.ok(Math.hypot(actor.point[0]-before[0],actor.point[1]-before[1])<=2.60001)
    arrivals.push(...sim.arrivals.filter(arrival=>arrival.personId===actor.person.id).map(arrival=>arrival.event.id))
    if(!actor.journey&&!actor.queue.length&&arrivals.length)replayed=true
    if(replayed&&previousWander&&!actor.wander)completedLoops++
    previousWander=actor.wander
  }
  assert.deepEqual(arrivals,['once'])
  assert.ok(completedLoops>=2)
})
test('eligible JOYCO makers also roam after their queue drains without revealing inactive members',()=>{
  const sim=new ActivityJourneys(8,()=>.4),person=roster[7]
  sim.setActivity(snapshot([event('joyco',person.id)]),now)
  const actor=sim.actors[7]
  let arrived=false,roaming=false
  for(let i=0;i<3000;i++){
    sim.tick(.1,true,now)
    arrived ||= sim.arrivals.some(arrival=>arrival.personId===person.id)
    roaming ||= arrived&&!actor.journey&&!!actor.wander
  }
  assert.ok(roaming)
  assert.ok(sim.actors.slice(8).every(actor=>!actor.rendered&&!actor.eligible))
})
test('new activity during ordinary idle roaming waits for the loop and replays exactly once',()=>{
  const sim=new ActivityJourneys(8,()=>.4),actor=sim.actors[0]
  sim.setActivity(snapshot([]),now)
  sim.tick(.1,true,now);sim.tick(1,true,now)
  const before=[...actor.point],loop=actor.wander
  sim.setActivity(snapshot([event('during-idle')]),now)
  assert.deepEqual(actor.point,before);assert.equal(actor.wander,loop)
  const arrivals:string[]=[]
  for(let i=0;i<4000;i++){
    const previous=[...actor.point]
    sim.tick(.1,true,now)
    assert.ok(Math.hypot(actor.point[0]-previous[0],actor.point[1]-previous[1])<=2.60001)
    arrivals.push(...sim.arrivals.filter(arrival=>arrival.personId===actor.person.id).map(arrival=>arrival.event.id))
  }
  assert.deepEqual(arrivals,['during-idle'])
})
