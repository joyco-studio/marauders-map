import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ActorPresentation, ENTRANCE_SECONDS, EXIT_SECONDS } from './presentation'
import { advance, type MapState } from '../map/state'
const target=(visible=true,point:readonly[number,number]=[0,0])=>({visible,point})
test('opening reveals each person once across the revealing/exploring boundary',()=>{
  const pool=new ActorPresentation([[0,0]],8)
  let state:MapState={phase:'opening',enteredAt:0,greeting:'welcome'},entrances=0
  for(let frame=0;frame<100;frame++){
    state=advance(state,frame*.1)
    const previous=pool.actors[0].phase
    pool.update(.1,[target(state.phase==='revealing'||state.phase==='exploring')])
    if(previous==='hidden'&&pool.actors[0].phase==='entering')entrances++
    if(state.phase==='exploring')assert.equal(pool.actors[0].progress,1)
  }
  assert.equal(entrances,1)
})
test('removal during entrance finishes the bloom then the entire exit',()=>{
  const pool=new ActorPresentation([[0,0]],1)
  pool.update(0,[target()]);pool.update(.2,[target(false)])
  assert.equal(pool.actors[0].phase,'entering')
  pool.update(ENTRANCE_SECONDS-.2,[target(false)])
  assert.equal(pool.actors[0].phase,'shown');assert.equal(pool.actors[0].progress,1)
  pool.update(.2,[target(false)])
  assert.equal(pool.actors[0].phase,'exiting')
  pool.update(EXIT_SECONDS-.2,[target(false)])
  assert.equal(pool.actors[0].phase,'hidden');assert.equal(pool.actors[0].progress,0)
})
test('reappearance cannot reverse or shorten an exit',()=>{
  const pool=new ActorPresentation([[0,0]],1)
  pool.update(0,[target()]);pool.update(ENTRANCE_SECONDS,[target()])
  pool.update(.2,[target(false)])
  pool.update(.2,[target(true,[100,100])])
  assert.equal(pool.actors[0].phase,'exiting');assert.deepEqual(pool.actors[0].point,[0,0])
  pool.update(EXIT_SECONDS-.4,[target(true,[100,100])])
  assert.equal(pool.actors[0].phase,'entering');assert.equal(pool.actors[0].progress,0)
  assert.deepEqual(pool.actors[0].point,[100,100])
})
test('unexpected relocations exit at the old position before entering at the new one',()=>{
  const pool=new ActorPresentation([[0,0]],1)
  pool.update(0,[target()]);pool.update(ENTRANCE_SECONDS,[target()])
  pool.update(.1,[target(true,[100,100])])
  assert.equal(pool.actors[0].phase,'exiting');assert.deepEqual(pool.actors[0].point,[0,0])
  pool.update(EXIT_SECONDS-.1,[target(true,[100,100])])
  assert.equal(pool.actors[0].phase,'entering');assert.equal(pool.actors[0].progress,0)
  assert.deepEqual(pool.actors[0].point,[100,100])
})
test('walking keeps its position continuous through entrance and steady visibility',()=>{
  const pool=new ActorPresentation([[0,0]],1)
  pool.update(0,[target()])
  for(let i=1;i<30;i++){
    pool.update(.1,[target(true,[i*2.6,0])])
    assert.deepEqual(pool.actors[0].point,[i*2.6,0])
    assert.notEqual(pool.actors[0].phase,'exiting')
  }
})
test('exiting people reserve slots so replacements cannot exceed the limit',()=>{
  const pool=new ActorPresentation(Array.from({length:14},()=>[0,0] as const),8)
  const first=Array.from({length:14},(_,i)=>target(i<8))
  pool.update(0,first);pool.update(ENTRANCE_SECONDS,first)
  const second=Array.from({length:14},(_,i)=>target(i>=6))
  pool.update(.1,second)
  assert.equal(pool.actors.filter(a=>a.phase!=='hidden').length,8)
  assert.ok(pool.actors.slice(8).every(a=>a.phase==='hidden'))
  pool.update(EXIT_SECONDS-.1,second)
  assert.equal(pool.actors.filter(a=>a.phase!=='hidden').length,8)
  assert.ok(pool.actors.slice(8).every(a=>a.phase==='entering'&&a.progress===0))
})

test('visitor has one reserved slot while normal exits still enforce the eight-person limit',()=>{
  const pool=new ActorPresentation(Array.from({length:15},()=>[0,0] as const),8)
  const first=Array.from({length:15},(_,i)=>target(i<8))
  pool.update(0,first);pool.update(ENTRANCE_SECONDS,first)
  const revealed=first.map((value,i)=>i===14?target(true,[100,100]):value)
  pool.update(0,revealed,14)
  assert.equal(pool.actors[14].phase,'entering')
  pool.update(ENTRANCE_SECONDS,revealed,14)
  const rotated=Array.from({length:15},(_,i)=>target(i>=6,i===14?[100,100]:[0,0]))
  pool.update(.1,rotated,14)
  assert.equal(pool.actors.filter(a=>a.phase!=='hidden').length,9)
  assert.ok(pool.actors.slice(8,14).every(a=>a.phase==='hidden'))
  pool.update(EXIT_SECONDS-.1,rotated,14)
  assert.equal(pool.actors.filter(a=>a.phase!=='hidden').length,9)
  assert.equal(pool.actors[14].phase,'shown')
  const reset=rotated.map((value,i)=>i===14?target(false,[100,100]):value)
  pool.update(.2,reset,14);assert.equal(pool.actors[14].phase,'exiting')
  pool.update(EXIT_SECONDS-.2,reset,14);assert.equal(pool.actors[14].phase,'hidden')
  assert.equal(pool.actors.filter(a=>a.phase!=='hidden').length,8)
})
