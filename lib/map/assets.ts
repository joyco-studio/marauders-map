import { susano, type GenericLoadFn } from "@joycostudio/susano"
import { Texture, SRGBColorSpace, RepeatWrapping } from "three/webgpu"
import { configureFontTexture, parseFont } from "lettra/three"
import { sdfImages } from "./sdf"
import type { Disposer } from "@joycostudio/xyz"

export async function loadAssets(disposer: Disposer, progress: (n:number)=>void, retry: boolean) {
  const images = ["wand/wand_basecolor.png", "wand/wand_normal_opengl.png", "wand/wand_orm.png", "paper/aged_paper_color_rgba.png", "desk/castle-stone.png", "relief/main_unfolded_displacement_web_8bit.png", "relief/main_unfolded_normal_opengl.png", ...Object.values(sdfImages).filter(entry=>!entry.texture.startsWith("sdf/banners/")).map(entry=>entry.texture), "artwork/living-banner/living_banner_color.png", "artwork/living-banner/motion_weights.png", "fonts/tangerine-700.png", "fonts/cinzel-600.png", "fonts/beth-ellen-400.png"]
  const jsons = ["fonts/tangerine-700.json", "fonts/cinzel-600.json", "fonts/beth-ellen-400.json"]
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
    if (path.startsWith("fonts/") || path.startsWith("sdf/")) configureFontTexture(map)
    else if (path==="paper/aged_paper_color_rgba.png" || path==="desk/castle-stone.png" || path.endsWith("_color.png") || path==="wand/wand_basecolor.png") map.colorSpace=SRGBColorSpace
    if(path.startsWith("sdf/"))map.flipY=true
    if(path==="desk/castle-stone.png"){map.wrapS=map.wrapT=RepeatWrapping;map.anisotropy=4}
    map.needsUpdate=true
    textures.set(path,map)
    disposer.add(map)
  }
  const font = {tangerine:parseFont(values[0]),cinzel:parseFont(values[1]),bethEllen:parseFont(values[2])}
  return { textures, font, sdf:sdfImages }
}
export type Assets = Awaited<ReturnType<typeof loadAssets>>
