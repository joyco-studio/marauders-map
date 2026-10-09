import assert from "node:assert/strict"
import { test } from "node:test"
import { absorptionCoverage, advance, transition, revealProgress, type MapState } from "./state"

test("opening and closing honor the cinematic sequence and replay",()=>{
  let state:MapState={phase:"loading",enteredAt:0}
  state=transition(state,"ready",10)
  assert.equal(state.phase,"folded")
  assert.equal(transition(state,"open",10),state)
  state=advance(transition(state,"welcome",9),10)
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
  state=advance(transition(state,"welcome",24),25)
  state=transition(state,"open",25)
  assert.deepEqual(state,{phase:"opening",enteredAt:25,greeting:"welcome"})
})
test("rapid or out-of-phase commands cannot restart animations",()=>{
  const opening:MapState={phase:"opening",enteredAt:3}
  assert.equal(transition(opening,"close",4),opening)
  assert.equal(transition(opening,"open",4),opening)
  const closing:MapState={phase:"closing",enteredAt:8}
  assert.equal(transition(closing,"close",9),closing)
  assert.equal(transition(closing,"open",9),closing)
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

test("the enchantment must complete before a separate press opens the map",()=>{
  const folded:MapState={phase:"folded",enteredAt:0}
  const casting=transition(folded,"welcome",1)
  assert.equal(casting.phase,"enchanting")
  assert.equal(transition(casting,"open",1.1),casting)
  assert.equal(transition(casting,"welcome",1.2),casting)
  assert.equal(advance(casting,1.89).phase,"enchanting")
  const response=advance(casting,1.91)
  assert.deepEqual(response,{phase:"folded",enteredAt:1.9,greeting:"welcome"})
  assert.deepEqual(advance(response,1000),response)
  assert.equal(transition(response,"welcome",2),response)
  assert.equal(transition(response,"open",1000).phase,"opening")
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


test("closing resets the ritual and the next opening reveals the map again",()=>{
  const response=advance(transition({phase:"folded",enteredAt:0},"welcome",1),2)
  const opened=advance(transition(response,"open",2),9)
  assert.equal(opened.phase,"exploring")
  const closed=advance(transition(opened,"close",10),14)
  assert.deepEqual(closed,{phase:"folded",enteredAt:14})
  assert.equal(transition(closed,"open",15),closed)
  const welcomed=advance(transition(closed,"welcome",15),16)
  const reopening=transition(welcomed,"open",16)
  assert.equal(advance(reopening,20).phase,"revealing")
})

test("cover reset erases the previous inscription before revealing choices",async()=>{
  const { coverBlend }=await import("./cover")
  assert.deepEqual(coverBlend(0),{outgoing:1,incoming:0,complete:false})
  assert.equal(coverBlend(.3).incoming,0)
  assert.equal(coverBlend(.45).outgoing,0)
  assert.ok(coverBlend(.8).incoming>0&&coverBlend(.8).incoming<1)
  assert.deepEqual(coverBlend(1.25),{outgoing:0,incoming:1,complete:true})
})
