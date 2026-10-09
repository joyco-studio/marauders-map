import { test } from "node:test"
import assert from "node:assert/strict"
import { resolveTrigger } from "./triggers"
import { hotspots } from "./data"
import type { MapState } from "./state"
const state=(phase:MapState["phase"],greeting?:"welcome"|"mockery")=>({phase,enteredAt:0,greeting}) as MapState
const point=(id:string)=>{const h=hotspots.find(h=>h.id===id)!;return {x:h.center[0],y:h.center[1]}}
test("choices become edges only after a greeting, preserving boundaries",()=>{
  assert.equal(resolveTrigger({x:700,y:288},state("folded"),false),"mockery")
  assert.equal(resolveTrigger({x:700,y:330},state("folded"),false),"welcome")
  assert.equal(resolveTrigger({x:585,y:288},state("folded"),false),null)
  assert.equal(resolveTrigger({x:586,y:330},state("folded","welcome"),false),"open-left")
  assert.equal(resolveTrigger({x:814,y:330},state("folded","mockery"),false),"open-right")
  assert.equal(resolveTrigger({x:700,y:288},state("folded","welcome"),false),null)
})
test("transitions have no triggers",()=>{
  for(const phase of ["loading","opening","revealing","erasing","closing"] as const)
    for(const p of [{x:700,y:288},point("close"),point("passage")])assert.equal(resolveTrigger(p,state(phase),false),null)
})
test("passage eligibility and close on both maps",()=>{
  assert.equal(resolveTrigger(point("passage"),state("exploring","welcome"),false),"passage")
  assert.equal(resolveTrigger(point("passage"),state("exploring","welcome"),true),null)
  assert.equal(resolveTrigger(point("passage"),state("exploring","mockery"),false),null)
  for(const greeting of ["welcome","mockery"] as const)assert.equal(resolveTrigger(point("close"),state("exploring",greeting),true),"close")
})
