import { test } from "node:test"
import assert from "node:assert/strict"
import { resolveTrigger } from "./triggers"
import { hotspots } from "./data"
import type { MapState } from "./state"
const state=(phase:MapState["phase"],greeting?:"welcome"|"mockery")=>({phase,enteredAt:0,greeting}) as MapState
const point=(id:string)=>{const h=hotspots.find(h=>h.id===id)!;return {x:h.center[0],y:h.center[1]}}
test("the whole folded paper opens only after choosing a greeting outside the map",()=>{
  for(const p of [{x:586,y:330},{x:814,y:330},{x:700,y:288},{x:700,y:650}]){
    assert.equal(resolveTrigger(p,state("folded"),false),null)
    for(const greeting of ["welcome","mockery"] as const)
      assert.equal(resolveTrigger(p,state("folded",greeting),false),"open-left")
  }
  assert.equal(resolveTrigger(null,state("folded","welcome"),false),null)
})
test("transitions have no triggers",()=>{
  for(const phase of ["loading","opening","revealing","erasing","closing"] as const)
    for(const p of [{x:700,y:288},{x:700,y:653},point("passage")])assert.equal(resolveTrigger(p,state(phase),false),null)
})
test("passage eligibility and closing spell outside the map",()=>{
  assert.equal(resolveTrigger(point("passage"),state("exploring","welcome"),false),"passage")
  assert.equal(resolveTrigger(point("passage"),state("exploring","welcome"),true),null)
  assert.equal(resolveTrigger(point("passage"),state("exploring","mockery"),false),null)
  for(const greeting of ["welcome","mockery"] as const)assert.equal(resolveTrigger({x:700,y:653},state("exploring",greeting),true),null)
})
