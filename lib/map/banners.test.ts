import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BannerAssignments, bannerVariants } from './banners'
import { MAX_RENDERED_PEOPLE } from '../activity/roster'

test('visible and exiting actors reserve distinct randomly assigned banners',()=>{
  const pool=new BannerAssignments(bannerVariants,()=>.3)
  const visible=new Map<string,string>()
  for(let i=0;i<MAX_RENDERED_PEOPLE;i++)visible.set(`person-${i}`,pool.claim(`person-${i}`).id)
  assert.equal(new Set(visible.values()).size,MAX_RENDERED_PEOPLE)
  assert.notDeepEqual([...visible.values()],bannerVariants.slice(0,MAX_RENDERED_PEOPLE).map(v=>v.id))
  for(const [person,id] of visible)assert.equal(pool.claim(person).id,id,'assignment must persist through exit')
  for(let i=0;i<40;i++){
    const leaving=[...visible.keys()][0]
    pool.release(leaving);visible.delete(leaving)
    const person=`replacement-${i}`
    visible.set(person,pool.claim(person).id)
    assert.equal(new Set(visible.values()).size,MAX_RENDERED_PEOPLE)
  }
})

test('the shuffled bag uses every variant before recycling released designs',()=>{
  const pool=new BannerAssignments(bannerVariants,()=>.7)
  const used=new Set<string>()
  for(let i=0;i<bannerVariants.length;i++){
    const person=`person-${i}`
    const variant=pool.claim(person)
    assert.ok(!used.has(variant.id));used.add(variant.id)
    pool.release(person)
  }
  assert.equal(used.size,bannerVariants.length)
  assert.ok(used.has(pool.claim('next-cycle').id))
})

test('the catalog includes all six new designs and enough variants for the visible roster',()=>{
  assert.equal(bannerVariants.filter(v=>v.id.startsWith('v0')).length,6)
  assert.ok(bannerVariants.length>=MAX_RENDERED_PEOPLE)
  for(const variant of bannerVariants){
    assert.ok(variant.safeWidth>0&&variant.safeWidth<1)
    assert.ok(variant.safeHeight>0&&variant.safeHeight<1)
  }
})
