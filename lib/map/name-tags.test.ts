import assert from 'node:assert/strict'
import { test } from 'node:test'
import { easeNameTagOpacity, nameTagAt, nameTagOpacities, type NameTag } from './name-tags'

const tag=(id:string,x:number,priority:number,extra:Partial<NameTag>={}):NameTag=>({
  id,x,y:0,width:1,height:.5,nameX:x,nameY:0,priority,visible:true,interactive:true,...extra,
})

test('separated tags stay opaque; proximity checks both axes and includes the .06 margin',()=>{
  const back=tag('back',0,0)
  assert.deepEqual(nameTagOpacities([back,tag('front',1.061,1)]),[1,1])
  assert.deepEqual(nameTagOpacities([back,tag('front',1.06,1)]),[.3,1])
  assert.deepEqual(nameTagOpacities([back,tag('front',0,1,{y:.561})]),[1,1])
  assert.deepEqual(nameTagOpacities([back,tag('front',0,1,{y:.56})]),[.3,1])
})

test('base priority, not input order or vertical position, chooses the covered tag',()=>{
  assert.deepEqual(nameTagOpacities([tag('front',0,2,{y:-.2}),tag('back',.4,1)]),[1,.3])
})

test('hover promotes a covered tag, dims its neighbors, and resets on leave',()=>{
  const tags=[tag('back',0,0),tag('middle',.3,1),tag('front',.6,2),tag('far',3,3)]
  assert.deepEqual(nameTagOpacities(tags),[.3,.3,1,1])
  assert.deepEqual(nameTagOpacities(tags,'back'),[1,.3,.3,1])
  assert.deepEqual(nameTagOpacities(tags),[.3,.3,1,1])
})

test('hover does not propagate through a chain to a nonintersecting tag',()=>{
  const tags=[tag('a',0,0),tag('b',.8,1),tag('c',1.6,2)]
  assert.deepEqual(nameTagOpacities(tags,'a'),[1,.3,1])
  assert.deepEqual(nameTagOpacities(tags,'b'),[.3,1,.3])
})

test('hidden tags never collide, while visible entrance and exit tags still participate',()=>{
  const tags=[tag('back',0,0),tag('front',.2,1,{visible:false,interactive:false})]
  assert.deepEqual(nameTagOpacities(tags,'front'),[1,1])
  tags[1].visible=true
  assert.deepEqual(nameTagOpacities(tags),[.3,1])
  assert.equal(nameTagAt(tags,{x:.2,y:0}),'back')
})

test('picking uses the closest name center even when that name is behind another banner',()=>{
  const tags=[tag('back',0,0),tag('front',.4,1)]
  assert.equal(nameTagAt(tags,{x:.05,y:0}),'back')
  assert.equal(nameTagAt(tags,{x:.35,y:0},'back'),'front')
  assert.equal(nameTagAt(tags,{x:.05,y:0},'front'),'back')
})

test('hover ties stay stable; new ties use original priority regardless of array order',()=>{
  const tags=[tag('back',0,0),tag('front',.4,1)]
  const point={x:.2,y:0}
  assert.equal(nameTagAt(tags,point),'front')
  assert.equal(nameTagAt([...tags].reverse(),point),'front')
  assert.equal(nameTagAt(tags,point,'back'),'back')
  assert.equal(nameTagAt(tags,point,'front'),'front')
  assert.equal(nameTagAt(tags,point,'missing'),'front')
})

test('picking honors banner bounds and eligibility, without extending into the proximity margin',()=>{
  const tags=[tag('shown',0,0),tag('hidden',0,1,{visible:false}),tag('exiting',0,2,{interactive:false})]
  assert.equal(nameTagAt(tags,{x:0,y:0}),'shown')
  assert.equal(nameTagAt(tags,{x:.51,y:0}),undefined)
  assert.equal(nameTagAt(tags,{x:0,y:.26}),undefined)
  assert.equal(nameTagAt([tag('small',0,0,{height:.1})],{x:0,y:.17}),'small')
})

test('name center, rather than the asymmetric banner center, determines pointer distance',()=>{
  const tags=[tag('back',0,0,{nameX:.3}),tag('front',.3,1,{nameX:0})]
  assert.equal(nameTagAt(tags,{x:.3,y:0}),'back')
})

test('fading is frame-rate independent and reduced motion reaches the target immediately',()=>{
  let stepped=1
  for(let i=0;i<9;i++)stepped=easeNameTagOpacity(stepped,.3,1/60,false)
  const single=easeNameTagOpacity(1,.3,.15,false)
  assert.ok(Math.abs(single-stepped)<1e-10)
  assert.ok(single>.3&&single<.336,'at least 95% of the fade completes within 150 ms')
  assert.equal(easeNameTagOpacity(1,.3,0,true),.3)
  assert.equal(easeNameTagOpacity(.3,1,0,true),1)
  assert.equal(easeNameTagOpacity(.3005,.3,0,false),.3)
})
