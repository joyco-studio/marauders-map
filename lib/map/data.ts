export const SHEET = { width: 14, height: 7, pixels: [1400, 700] as const }
export type Point = readonly [number, number]
export type RevealTiming = { start: number; duration: number; seed: number }
export type MapElement = { id: string; center: Point; size: Point; src: string; timing: RevealTiming }
export type Label = { text: string; center: Point; size: number; heading?: boolean; start?: number; angle?: number }
export type CharacterRoute = { name: string; points: readonly Point[]; speed: number; offset: number }
export type Hotspot = { id: "close" | "open" | "passage"; center: Point; radius: Point }
// The art pack uses 2400×1200 units. Preserve its registered viewBoxes and doors.
const sheet=([x,y]:Point):[number,number]=>[x*7/12,y*7/12]
export const mapPoint=([x,y]:Point):[number,number]=>sheet([1200+(x-1200)*.82,160+y*.82])
export const mapSize=([w,h]:Point):[number,number]=>sheet([w*.82,h*.82])
const point=mapPoint
const room=(id:string,file:string,x:number,y:number,w:number,h:number,start:number,seed:number):MapElement=>({id,src:`artwork/architecture/${file}.svg`,center:point([x+w/2,y+h/2]),size:mapSize([w,h]),timing:{start,duration:1.15,seed}})
export const elements:MapElement[]=[
  {id:"border",src:"artwork/ornaments/frame_2400x1200.svg",center:[700,350],size:[1400,700],timing:{start:0,duration:1.8,seed:1}},
  room("great-hall","gran_salon",180,160,640,350,.2,3),
  room("library","biblioteca",910,100,610,370,.35,4),
  room("courtyard","patio_fuente",910,630,610,440,.1,5),
  room("classrooms","aulas",180,700,640,350,.65,7),
  room("stairs","escaleras",1760,700,460,370,.5,6),
  room("tower","torre_escalera",1790,130,340,340,.45,8),
  room("corridors","pasillos",0,0,2400,1200,.15,2),
  {id:"compass",src:"artwork/ornaments/compass_rose.svg",center:point([2250,240]),size:mapSize([180,180]),timing:{start:1,duration:.8,seed:9}},
]
export const labels:Label[]=[
  {text:"The Makers’ Map",center:sheet([1200,115]),size:24,start:1},
  {text:"The Commons",center:point([500,125]),size:18},
  {text:"The Source Library",center:point([1215,65]),size:18},
  {text:"The Playground",center:point([1215,1100]),size:16},
  {text:"The Shader Atelier",center:point([500,1090]),size:18},
  {text:"The Render Pipeline",center:point([1990,1110]),size:18},
  {text:"The Observatory",center:point([1960,95]),size:17},
  {text:"Every good experiment has a rabbit hole.",center:sheet([1645,1120]),size:12},
]
export const hotspots:Hotspot[]=[
  {id:"passage",center:point([1645,1040]),radius:[32,32]},
]
// Pixel-space map coordinates convert once to the compositing camera's y-up space.
export function sheetPoint([x,y]: Point): [number,number] { return [(x-700)/100,(350-y)/100] }
export function routeAt(route: CharacterRoute, time: number) {
  const points = route.points
  const lengths = points.map((p,i)=> { const q=points[(i+1)%points.length]; return Math.hypot(q[0]-p[0],q[1]-p[1]) })
  const total = lengths.reduce((a,b)=>a+b,0)
  let distance = ((time*route.speed+route.offset)%total+total)%total
  for (let i=0;i<points.length;i++) {
    if (distance<=lengths[i]) {
      const a=points[i],b=points[(i+1)%points.length],t=distance/lengths[i]
      return { point: [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t] as Point, angle:Math.atan2(-(b[1]-a[1]),b[0]-a[0])-Math.PI/2 }
    }
    distance-=lengths[i]
  }
  return {point:points[0],angle:0}
}
