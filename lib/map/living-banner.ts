import * as THREE from "three/webgpu"
import metadata from "../../public/map/artwork/living-banner/metadata.json"
import { createLivingBanner as create } from "./vendor/living-banner.mjs"

export const bannerMetadata=metadata

/** Read numerical mask bytes once; never apply the artwork's sRGB conversion. */
export function readMotionPixels(texture: THREE.Texture): ImageData {
  const image=texture.image as HTMLImageElement
  const canvas=document.createElement("canvas")
  canvas.width=image.naturalWidth;canvas.height=image.naturalHeight
  const context=canvas.getContext("2d",{willReadFrequently:true})
  if(!context)throw new Error("Could not read banner motion mask")
  context.drawImage(image,0,0)
  return context.getImageData(0,0,canvas.width,canvas.height)
}

/** Adapt the supplied geometry helper to the scene-owned TSL material pipeline. */
export function createLivingBanner(motionPixels:ImageData,width:number,phase:number) {
  const unusedTexture=new THREE.Texture()
  const living=create(THREE,{artworkTexture:unusedTexture,motionPixels,metadata,width,phase,sway:.055,speed:1.8})
  living.mesh.material.dispose();unusedTexture.dispose()
  return {geometry:living.mesh.geometry,update:living.update}
}
