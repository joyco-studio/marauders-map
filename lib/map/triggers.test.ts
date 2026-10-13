import { test } from "node:test"
import assert from "node:assert/strict"
import { resolveTrigger } from "./triggers"
import { hotspots } from "./data"
import type { MapState } from "./state"
const state=(phase:MapState["phase"],greeting?:"welcome")=>({phase,enteredAt:0,greeting}) as MapState
const point=(id:string)=>{const h=hotspots.find(h=>h.id===id)!;return {x:h.center[0],y:h.center[1]}}
test("the whole folded paper casts the oath then opens after the welcome",()=>{
  for(const p of [{x:586,y:330},{x:814,y:330},{x:700,y:288},{x:700,y:650}]){
    assert.equal(resolveTrigger(p,state("folded"),false),"welcome")
    assert.equal(resolveTrigger(p,state("folded","welcome"),false),"open-left")
  }
  assert.equal(resolveTrigger(null,state("folded","welcome"),false),null)
})
test("transitions have no triggers",()=>{
  for(const phase of ["loading","enchanting","opening","revealing","returning","erasing","closing"] as const)
    for(const p of [{x:700,y:288},{x:700,y:653},point("passage")])assert.equal(resolveTrigger(p,state(phase),false),null)
})
test("passage eligibility and closing spell outside the map",()=>{
  assert.equal(resolveTrigger(point("passage"),state("exploring","welcome"),false),"passage")
  assert.equal(resolveTrigger(point("passage"),state("exploring","welcome"),true),null)
  assert.equal(resolveTrigger({x:700,y:653},state("exploring","welcome"),true),null)
})
