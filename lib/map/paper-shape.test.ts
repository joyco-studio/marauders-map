import assert from 'node:assert/strict'
import {test} from 'node:test'
import {paperShape} from './paper-shape'

test('unfolded paper retains original sheet dimensions',()=>{
  const shape=paperShape(0)
  for(const x of [-7,-4.2,-1.4,0,1.4,4.2,7]){
    const p=shape(x,2,.03)
    assert.ok(Math.abs(p[0]-x)<1e-10)
    assert.equal(p[1],2);assert.ok(Math.abs(p[2]-.03)<1e-10)
  }
})
test('all crease boundaries remain continuous throughout folding',()=>{
  for(let f=0;f<=1;f+=.025)for(const x of [-4.2,-1.4,1.4,4.2]){
    const shape=paperShape(f),a=shape(x-1e-6,0,0),b=shape(x+1e-6,0,0)
    assert.ok(Math.hypot(a[0]-b[0],a[2]-b[2])<3e-6)
  }
})
test('closed panels occupy distinct layers connected by rounded bends',()=>{
  const shape=paperShape(1)
  const depths=[-5.6,-2.8,0,2.8,5.6].map(x=>shape(x,0,0)[2]).sort((a,b)=>a-b)
  for(let i=1;i<depths.length;i++)assert.ok(depths[i]-depths[i-1]>.05)
  const crease=shape(1.4,0,0),near=shape(1.25,0,0),far=shape(1.55,0,0)
  assert.ok(Math.abs((near[0]+far[0])/2-crease[0])>.01)
})
