import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mapPoint, type Point } from '../map/data'
import { roster } from './roster'
import { rooms, roomAccess, roomRoute, roomObjective, passagePath, passageMidpoint, passageRoute } from './navigation'

const local=([x,y]:Point):Point=>[(x*12/7-1200)/.82+1200-180,(y*12/7-160)/.82-700]
// Solid partition spans from the registered classroom artwork; door gaps excluded.
const walls=[
  [18,18,284,35],[356,18,622,35],
  [33,94,204,108],[252,94,388,108],[436,94,607,108],
  [313,106,327,317],
] as const
const furniture=[
  [84,126,174,155],[465,126,567,157],
  ...[62,148,234].flatMap(x=>[197,262].map(y=>[x,y,x+50,y+29] as const)),
  ...[79,165,251].flatMap(x=>[229,294].map(y=>[x,y,x+16,y+14] as const)),
  [363,193,433,283],[487,193,557,283],
] as const
function checkClear(path:readonly Point[]) {
  for(let i=1;i<path.length;i++) {
    const a=local(path[i-1]),b=local(path[i]),steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1]))
    for(let step=0;step<=steps;step++) {
      const t=steps?step/steps:0,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t
      for(const [left,top,right,bottom] of [...walls,...furniture])assert.ok(!(x>=left&&x<=right&&y>=top&&y<=bottom),`blocked floor at ${x}, ${y}`)
    }
  }
}
test('every classroom access stays clear of solid partitions, desks, and tables',()=>{
  for(const person of roster) {
    const access=roomAccess(person,'classrooms')
    checkClear(access);checkClear(access.slice().reverse())
    assert.deepEqual(access.at(-1),roomObjective(person,'classrooms'))
    const doorway=local(access[3])
    assert.ok(doorway[0]>204&&doorway[0]<252||doorway[0]>388&&doorway[0]<436)
    for(const destination of rooms) {
      const outbound=roomRoute(person,'classrooms',destination)
      assert.deepEqual(outbound[0],roomObjective(person,'classrooms'))
      assert.deepEqual(outbound.at(-1),roomObjective(person,destination))
      assert.ok(outbound.every((p,i)=>!i||Math.hypot(p[0]-outbound[i-1][0],p[1]-outbound[i-1][1])>0))
    }
  }
})
test('passage begins halfway along its bends and exits through the library east door',()=>{
  const total=passagePath.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p[0]-passagePath[i][0],p[1]-passagePath[i][1]),0)
  for(const room of rooms) {
    const route=passageRoute(roster[8],room),exit=route.findIndex(p=>p[0]===passagePath[0][0]&&p[1]===passagePath[0][1])
    assert.deepEqual(route[0],passageMidpoint)
    const walked=route.slice(1,exit+1).reduce((sum,p,i)=>sum+Math.hypot(p[0]-route[i][0],p[1]-route[i][1]),0)
    assert.ok(Math.abs(walked-total/2)<1e-8)
    assert.deepEqual(route[exit],mapPoint([1500,240]))
    assert.deepEqual(route.at(-1),roomObjective(roster[8],room))
  }
})
