import { susano, type GenericLoadFn } from "@joycostudio/susano"
import { Texture, SRGBColorSpace } from "three/webgpu"
import { configureFontTexture, parseFont } from "lettra/three"
import { elements } from "./data"
import type { Disposer } from "@joycostudio/xyz"

export type AtlasManifest = { size: [number,number]; sprites: Record<"left"|"right"|"compass"|"key", {bounds:[number,number,number,number];center:[number,number]}> }
export async function loadAssets(disposer: Disposer, progress: (n:number)=>void, retry: boolean) {
  const images = ["wand/wand_basecolor.png", "wand/wand_normal_opengl.png", "wand/wand_orm.png", "parchment.jpg", "sprites/atlas.png", "cover.svg", "name-banner.svg", ...elements.map(e=>e.src), "passage.svg", "fonts/tangerine-700.png", "fonts/cinzel-400.png"]
  const jsons = ["fonts/tangerine-700.json", "fonts/cinzel-400.json", "sprites/atlas.json"]
  const jsonArgs = (url:string) => ({ loadFn: ({done,error}: Parameters<GenericLoadFn>[0]) => {
    fetch(url).then(r=> { if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json() }).then(done,error)
  } })
  const entries: Parameters<typeof susano.batch>[0] = [
    ...images.map(path=>({url:`/map/${path}`,type:"image" as const,cache:!retry})),
    ...jsons.map(path=>({url:`/map/${path}`,type:"generic" as const,loaderArgs:jsonArgs(`/map/${path}`),cache:!retry})),
  ]
  // Required promises are checked independently of Susano's fail-soft batch.
  const failures: string[] = []
  const batch = susano.batch(entries,{onProgress:({value})=>progress(value*.85),onError:()=>failures.push("Required asset failed")})
  const imageResults = await Promise.all(images.map(async path=> {
    const image = await susano.load(`/map/${path}`, {type:"image",cache:!retry})
    if (!image || !image.naturalWidth) throw new Error(`Could not load ${path}`)
    return [path,image] as const
  }))
  const values = await Promise.all(jsons.map(path=>susano.load(`/map/${path}`,{type:"generic",loaderArgs:jsonArgs(`/map/${path}`),cache:!retry})))
  await batch.promise
  if (failures.length || values.some(v=>!v)) throw new Error("Some map assets could not be loaded. Retry to fetch them again.")
  const textures = new Map<string,Texture>()
  for (const [path,image] of imageResults) {
    const map = new Texture(image)
    if (path.startsWith("fonts/")) configureFontTexture(map)
    else if (path==="parchment.jpg" || path==="name-banner.svg" || path==="wand/wand_basecolor.png") map.colorSpace=SRGBColorSpace
    map.needsUpdate=true
    textures.set(path,map)
    disposer.add(map)
  }
  const font = {tangerine:parseFont(values[0]),cinzel:parseFont(values[1])}
  const atlas = values[2] as AtlasManifest
  if (!Array.isArray(atlas.size) || atlas.size.length!==2 || atlas.size.some(n=>!Number.isFinite(n)||n<=0)) throw new Error("The map sprite manifest is invalid.")
  for(const name of ["left","right","compass","key"] as const){
    const sprite=atlas.sprites?.[name]
    if(!sprite || !Array.isArray(sprite.bounds) || !Array.isArray(sprite.center)) throw new Error(`Missing sprite: ${name}`)
    const [x,y,w,h]=sprite.bounds
    if(sprite.bounds.length!==4 || sprite.bounds.some(n=>!Number.isFinite(n)) || x<0 || y<0 || w<=0 || h<=0 || x+w>atlas.size[0] || y+h>atlas.size[1] || sprite.center.length!==2 || sprite.center.some(n=>!Number.isFinite(n))) throw new Error(`Invalid crop for ${name}`)
  }
  return { textures, font, atlas }
}
export type Assets = Awaited<ReturnType<typeof loadAssets>>
