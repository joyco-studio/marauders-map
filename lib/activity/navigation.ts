import { elements, mapPoint, type Point } from '../map/data'
import { roster, type Person, type Waypoint, type Room } from './roster'

export const rooms:readonly Room[]=['great-hall','library','courtyard','classrooms','stairs','tower']
export const waypoints:Record<Waypoint,Point> = {
  west:mapPoint([500,570]),center:mapPoint([1215,570]),east:mapPoint([1960,570]),
  'great-hall':mapPoint([500,495]),library:mapPoint([1215,465]),courtyard:mapPoint([1215,640]),
  classrooms:mapPoint([500,710]),stairs:mapPoint([1960,710]),tower:mapPoint([1960,460]),
}
export const edges:readonly (readonly [Waypoint,Waypoint])[] = [
  ['west','center'],['center','east'],['west','great-hall'],['west','classrooms'],
  ['center','library'],['center','courtyard'],['east','stairs'],['east','tower'],
]
export const corridorPaths=edges.map(([a,b])=>[waypoints[a],waypoints[b]])
export function shortestPath(from:Waypoint,to:Waypoint):Waypoint[] {
  const distances=new Map<Waypoint,number>([[from,0]]), paths=new Map<Waypoint,Waypoint[]>([[from,[from]]]), visited=new Set<Waypoint>()
  while(visited.size<Object.keys(waypoints).length) {
    const current=[...distances].filter(([id])=>!visited.has(id)).sort((a,b)=>a[1]-b[1]||a[0].localeCompare(b[0]))[0]?.[0]
    if(!current)break
    if(current===to)return paths.get(to)!
    visited.add(current)
    for(const [a,b] of edges) {
      const next=a===current?b:b===current?a:undefined
      if(!next)continue
      const p=waypoints[current],q=waypoints[next],distance=distances.get(current)!+Math.hypot(q[0]-p[0],q[1]-p[1])
      if(distance<(distances.get(next)??Infinity)){distances.set(next,distance);paths.set(next,[...paths.get(current)!,next])}
    }
  }
  return [from]
}
export function roomObjective(person:Person,room:Room):Point {
  const index=Math.max(0,roster.findIndex(candidate=>candidate.id===person.id))
  if(room==='classrooms') {
    // Clear aisles above/between the left tables and above/below the right tables.
    const right=index>=8,slot=right?index-8:index
    return mapPoint([180+(right?370:80)+(slot%4)*55,700+(Math.floor(slot/4)?(right?300:252):165)])
  }
  const element=elements.find(element=>element.id===room)!
  const column=index%4,row=Math.floor(index/4),inset=room==='tower'?.5:.6
  return [element.center[0]+element.size[0]*(column/3-.5)*inset,
    element.center[1]+element.size[1]*(row/3-.5)*inset]
}
const compact=(points:readonly Point[]):Point[]=>points.filter((point,index)=>index===0||point[0]!==points[index-1][0]||point[1]!==points[index-1][1])
/** Doorway-to-objective geometry, shared by simulation and the debug overlay. */
export function roomAccess(person:Person,room:Room):Point[] {
  const destination=roomObjective(person,room)
  if(room==='classrooms') {
    const right=destination[0]>mapPoint([500,700])[0],doorX=180+(right?412:228)
    const upper=mapPoint([doorX,865]),aisle=mapPoint([180+(right?455:216),865])
    const detour:Point[]=destination[1]>upper[1]?[aisle,[aisle[0],destination[1]]]:[]
    return compact([waypoints[room],mapPoint([500,765]),mapPoint([doorX,765]),
      mapPoint([doorX,800]),upper,...detour,destination])
  }
  return compact([waypoints[room],[waypoints[room][0],destination[1]],destination])
}
export function roomRoute(person:Person,from:Room,to:Room):Point[] {
  let corridor=shortestPath(from,to)
  if(from===to){const neighbor=edges.find(([a,b])=>a===from||b===from)!;corridor=[from,neighbor[0]===from?neighbor[1]:neighbor[0],from]}
  return compact([...roomAccess(person,from).reverse(),...corridor.map(id=>waypoints[id]),...roomAccess(person,to)])
}
// Registered artwork coordinates: left exit is the library's east doorway.
export const passagePath:readonly Point[]=[[1500,240],[1560,240],[1560,210],[1680,210],[1680,300],[1810,300]].map(p=>mapPoint(p as [number,number]))
function midpointPath(points:readonly Point[]):Point[] {
  const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1]))
  let distance=lengths.reduce((a,b)=>a+b,0)/2
  for(const [index,length] of lengths.entries()) {
    if(distance<=length){const a=points[index],b=points[index+1],t=distance/length
      return compact([[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],...points.slice(0,index+1).reverse()])}
    distance-=length
  }
  return [points[0]]
}
export const passageExitPath=midpointPath(passagePath)
export const passageMidpoint=passageExitPath[0]
export function passageRoute(person:Person,destination:Room):Point[] {
  return compact([...passageExitPath,mapPoint([1215,240]),...shortestPath('library',destination).map(id=>waypoints[id]),...roomAccess(person,destination)])
}
export const availablePaths=[...corridorPaths,...rooms.flatMap(room=>roster.map(person=>roomAccess(person,room)))]
