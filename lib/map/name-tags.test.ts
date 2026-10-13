import assert from 'node:assert/strict'
import { test } from 'node:test'
import { easeNameTagOpacity, nameTagAt, nameTagOpacities, type NameTag } from './name-tags'

const tag=(id:string,x:number,priority:number,extra:Partial<NameTag>={}):NameTag=>({
  id,x,y:0,width:1,height:.5,nameX:x,nameY:0,nameWidth:1,nameHeight:.5,priority,visible:true,interactive:true,...extra,
})

test('fading needs 65% name-area coverage, ignoring transparent margins and slight overlaps',()=>{
  const back=tag('back',0,0,{width:4,height:3})
  assert.deepEqual(nameTagOpacities([back,tag('front',1.06,1)]),[1,1])
  assert.deepEqual(nameTagOpacities([back,tag('front',.351,1)]),[1,1])
  assert.deepEqual(nameTagOpacities([back,tag('front',.35,1)]),[.3,1])
  assert.deepEqual(nameTagOpacities([back,tag('front',0,1,{nameY:.176})]),[1,1])
  assert.deepEqual(nameTagOpacities([back,tag('front',0,1,{nameY:.175})]),[.3,1])
  assert.deepEqual(nameTagOpacities([back,tag('front',.2,1,{nameY:.1})]),[1,1],'diagonal coverage is only 64%')
})

test('a smaller name area being covered counts even when banner sizes differ',()=>{
  const back=tag('back',0,0,{nameWidth:.4,nameHeight:.2})
  assert.deepEqual(nameTagOpacities([back,tag('front',.3,1)]),[.3,1])
})

test('base priority, not input order or vertical position, chooses the covered tag',()=>{
  assert.deepEqual(nameTagOpacities([tag('front',0,2,{y:-.05,nameY:-.05}),tag('back',.2,1)]),[1,.3])
})

test('hover promotes a covered tag, dims its neighbors, and resets on leave',()=>{
  const tags=[tag('back',0,0),tag('middle',.1,1),tag('front',.2,2),tag('far',3,3)]
  assert.deepEqual(nameTagOpacities(tags),[.3,.3,1,1])
  assert.deepEqual(nameTagOpacities(tags,'back'),[1,.3,.3,1])
  assert.deepEqual(nameTagOpacities(tags),[.3,.3,1,1])
})

test('hover does not propagate through a chain to a nonintersecting tag',()=>{
  const tags=[tag('a',0,0),tag('b',.3,1),tag('c',.6,2)]
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

test('a pressed tag retains focus through hold and click, even if another center becomes closer',()=>{
  const tags=[tag('back',0,0),tag('front',.3,1)]
  const pressed=nameTagAt(tags,{x:0,y:0})
  for(const point of [{x:.2,y:0},{x:.4,y:0}]){
    const focused=nameTagAt(tags,point,undefined,pressed)
    assert.equal(focused,'back')
    assert.deepEqual(nameTagOpacities(tags,focused),[1,.3])
  }
  assert.equal(nameTagAt(tags,{x:.51,y:0},'back',pressed),'front','leaving the pressed banner releases priority')
  tags[0].interactive=false
  assert.equal(nameTagAt(tags,{x:0,y:0},'back',pressed),'front','ineligible tags cannot retain focus')
})

test('picking honors banner bounds and eligibility independently of collision bounds',()=>{
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
