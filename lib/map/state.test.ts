import assert from "node:assert/strict"
import { test } from "node:test"
import { absorptionCoverage, advance, transition, revealProgress, type MapState } from "./state"

test("opening and closing honor the cinematic sequence and replay",()=>{
  let state:MapState={phase:"loading",enteredAt:0}
  state=transition(state,"ready",10)
  assert.equal(state.phase,"folded")
  assert.equal(transition(state,"open",10),state)
  state=transition(state,"welcome",10)
  assert.equal(advance(state,100).phase,"folded")
  state=transition(state,"open",10)
  assert.equal(state.phase,"opening")
  assert.equal(advance(state,13.99).phase,"opening")
  state=advance(state,14)
  assert.equal(state.phase,"revealing")
  state=advance(state,17)
  assert.equal(state.phase,"exploring")
  state=transition(state,"close",20)
  assert.equal(state.phase,"erasing")
  state=advance(state,21)
  assert.equal(state.phase,"closing")
  state=advance(state,24)
  assert.equal(state.phase,"folded")
  state=transition(state,"mockery",24)
  state=transition(state,"open",25)
  assert.deepEqual(state,{phase:"opening",enteredAt:25,greeting:"mockery"})
})
test("rapid or out-of-phase commands cannot restart animations",()=>{
  const opening:MapState={phase:"opening",enteredAt:3}
  assert.equal(transition(opening,"close",4),opening)
  assert.equal(transition(opening,"open",4),opening)
  const closing:MapState={phase:"closing",enteredAt:8}
  assert.equal(transition(closing,"close",9),closing)
  assert.equal(transition(closing,"open",9),closing)
})
test("reduced motion bypasses cinematic phases on open and close",()=>{
  const ready=transition({phase:"loading",enteredAt:0},"ready",1,true)
  assert.equal(ready.phase,"exploring")
  const closed=transition(ready,"close",2,true)
  assert.equal(closed.phase,"folded")
  assert.equal(transition(transition(closed,"welcome",3,true),"open",3,true).phase,"exploring")
})
test("large clock increments finish phases without losing elapsed time",()=>{
  assert.deepEqual(advance({phase:"opening",enteredAt:10},20),{phase:"exploring",enteredAt:17})
})
test("all reveal fragments are exactly hidden or revealed at endpoints",()=>{
  for(const distance of [0,.2,.7,1,1.5])for(const noise of [-.2,0,.2]){
    assert.equal(absorptionCoverage(0,distance,noise),0)
    assert.equal(absorptionCoverage(1,distance,noise),1)
  }
  assert.equal(revealProgress(-1,0,1),0)
  assert.equal(revealProgress(3,.2,.9),1)
  assert.ok(absorptionCoverage(.3,0)>absorptionCoverage(.3,.8))
})

test("spell responses stay readable until a separate opening command",()=>{
  const folded:MapState={phase:"folded",enteredAt:0}
  for(const greeting of ["mockery","welcome"] as const){
    const response=transition(folded,greeting,1)
    assert.deepEqual(advance(response,1000),response)
    assert.equal(transition(response,greeting,2),response)
    assert.equal(transition(response,"ready",2),response)
    assert.equal(transition(response,"open",1000).phase,"opening")
  }
})

test("closed accordion leaves occupy separate layers below the cover",async()=>{
  const { foldPose }=await import("./folds")
  const depths=[0]
  for(const side of [-1,1]){
    const inner=foldPose(1,side,1),outer=foldPose(1,side,2)
    assert.ok(Math.abs(Math.abs(inner.angle)-Math.PI)<1e-12)
    depths.push(inner.z,inner.z-outer.z)
    assert.equal(Math.abs(foldPose(0,side,1).angle),0)
    assert.equal(Math.abs(foldPose(0,side,1).z),0)
  }
  depths.sort((a,b)=>a-b)
  for(let i=1;i<depths.length;i++)assert.ok(depths[i]-depths[i-1]>.15,"Layers need clearance for curl and thickness")
})


test("mockery unfolds blank and resets the spell choice after closing",()=>{
  for(const reduced of [false,true]){
    const response=transition({phase:"folded",enteredAt:0},"mockery",1,reduced)
    const opened=advance(transition(response,"open",2,reduced),6)
    assert.equal(opened.phase,"exploring")
    assert.equal(opened.greeting,"mockery")
    const closed=advance(transition(opened,"close",7,reduced),11)
    assert.deepEqual(closed,{phase:"folded",enteredAt:reduced?7:11})
    const welcomed=transition(transition(closed,"welcome",12,reduced),"open",13,reduced)
    assert.equal(welcomed.phase!=="error"&&welcomed.greeting,"welcome")
    assert.equal(advance(welcomed,17).phase,reduced?"exploring":"revealing")
  }
})

test("cover reset erases the previous inscription before revealing choices",async()=>{
  const { coverBlend }=await import("./cover")
  assert.deepEqual(coverBlend(0),{outgoing:1,incoming:0,complete:false})
  assert.equal(coverBlend(.3).incoming,0)
  assert.equal(coverBlend(.45).outgoing,0)
  assert.ok(coverBlend(.8).incoming>0&&coverBlend(.8).incoming<1)
  assert.deepEqual(coverBlend(1.25),{outgoing:0,incoming:1,complete:true})
  assert.deepEqual(coverBlend(0,true),{outgoing:0,incoming:1,complete:true})
})
