export const SHEET = { width: 14, height: 7, pixels: [1400, 700] as const }
export type Point = readonly [number, number]
export type RevealTiming = { start: number; duration: number; seed: number }
export type MapElement = { id: string; center: Point; size: Point; src: string; timing: RevealTiming }
export type Label = { text: string; center: Point; size: number; heading?: boolean; start?: number; angle?: number }
export type CharacterRoute = { name: string; points: readonly Point[]; speed: number; offset: number }
export type Hotspot = { id: "close" | "open" | "passage"; center: Point; radius: Point }
export const elements: MapElement[] = [
  { id: "border", center: [700,350], size: [1400,700], src:"border.svg", timing: { start:0,duration:1.8,seed:1 } },
  { id: "corridors", center: [700,350], size: [1400,700], src:"corridors.svg", timing: { start:.15,duration:1.9,seed:2 } },
  { id: "great-hall", center: [240,260], size: [260,240], src:"great-hall.svg", timing: { start:.2,duration:1.1,seed:3 } },
  { id: "library", center: [465,390], size: [240,210], src:"library.svg", timing: { start:.35,duration:1.1,seed:4 } },
  { id: "courtyard", center: [700,265], size: [260,260], src:"courtyard.svg", timing: { start:.1,duration:1.2,seed:5 } },
  { id: "stairs", center: [915,380], size: [210,260], src:"stairs.svg", timing: { start:.5,duration:1.1,seed:6 } },
  { id: "classrooms", center: [1160,230], size: [260,205], src:"classrooms.svg", timing: { start:.65,duration:1.1,seed:7 } },
]
export const labels: Label[] = [
  { text:"The Marauder's Map", center:[700,83], size:40, heading:true, start:1 },
  { text:"Hogwarts School of Witchcraft & Wizardry", center:[700,125],size:17,start:1.1 },
  { text:"The Great Hall",heading:true,center:[240,410],size:23 },
  { text:"The Library",heading:true,center:[465,530],size:23 },
  { text:"The Courtyard",heading:true,center:[700,425],size:23 },
  { text:"Moving Staircases",heading:true,center:[915,540],size:22 },
  { text:"Classrooms",heading:true,center:[1160,362],size:23 },
  { text:"North Tower",heading:true,center:[1190,420],size:15,angle:-.15 },
  { text:"The castle never sleeps",center:[320,571],size:15,angle:.08 },
  { text:"Messrs. Moony, Wormtail, Padfoot & Prongs",center:[700,580],size:17 },
  { text:"Purveyors of Aids to Magical Mischief-Makers",center:[700,606],size:13 },
  { text:"Tap the key to find a secret",center:[1110,582],size:15 },
  { text:"Mischief managed",center:[700,646],size:22,heading:true,start:2.1 },
  { text:"N",center:[98,525],size:15,heading:true },
]
export const characters: CharacterRoute[] = [
  { name:"Harry Potter",points:[[220,320],[570,320],[570,172],[1050,172],[1050,315],[795,315],[795,455],[330,455],[330,320]],speed:30,offset:0 },
  { name:"Hermione Granger",points:[[465,455],[575,455],[575,315],[330,315],[330,455],[465,455]],speed:23,offset:110 },
  { name:"Ron Weasley",points:[[690,172],[795,172],[795,315],[1060,315],[1060,455],[575,455],[575,172]],speed:28,offset:200 },
  { name:"Argus Filch",points:[[1190,455],[1060,455],[1060,172],[330,172],[330,315],[1060,315],[1060,455]],speed:19,offset:430 },
]
export const hotspots: Hotspot[] = [
  {id:"close",center:[700,646],radius:[140,24]},
  {id:"passage",center:[1110,545],radius:[32,32]},
  {id:"open",center:[700,490],radius:[120,44]},
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
