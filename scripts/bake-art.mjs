import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import sharp from 'sharp'
const incremental=process.argv.includes('--new-only')
const source='public/map/artwork', alphaRoot=incremental?'.context/sdf-alpha-new':'.context/sdf-alpha', output='public/map/sdf'
const manifest=incremental?JSON.parse(await readFile(path.join(output,'manifest.json'),'utf8')):{version:1,kind:'sdf',range:8,images:{}}
for(const directory of ['architecture','ornaments','banners','cover']) {
  for(const file of await readdir(path.join(source,directory))) {
    if(!file.endsWith('.svg'))continue
    const relative=path.join(directory,file)
    if(incremental&&manifest.images['artwork/'+relative])continue
    const svg=await readFile(path.join(source,relative))
    const viewBox=svg.toString().match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number)
    const [, , width,height]=viewBox
    const maximum=directory==='architecture'||file==='frame_2400x1200.svg'?4096:directory==='cover'?3072:1024
    const scale=Math.min(maximum/Math.max(width,height),2)
    const w=Math.round(width*scale),h=Math.round(height*scale),padding=16
    const image=relative.replace(/\.svg$/,'.png'), destination=path.join(alphaRoot,image)
    await mkdir(path.dirname(destination),{recursive:true})
    await sharp(svg,{density:144}).resize(w,h).ensureAlpha().extend({top:padding,bottom:padding,left:padding,right:padding,background:{r:0,g:0,b:0,alpha:0}}).png().toFile(destination)
    manifest.images['artwork/'+relative]={texture:'sdf/'+image,size:[w+padding*2,h+padding*2],viewBox,uv:[padding/(w+2*padding),padding/(h+2*padding),w/(w+2*padding),h/(h+2*padding)]}
  }
}
const python=process.env.SDF_PYTHON||'.context/sdf-venv/bin/python'
const baked=spawnSync(python,['scripts/sdf.py',alphaRoot,output],{stdio:'inherit'})
if(baked.error||baked.status!==0)throw baked.error||new Error('SDF bake failed. Install scripts/sdf-requirements.txt into .context/sdf-venv.')
await mkdir(output,{recursive:true})
await writeFile(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n')
console.log(`Prepared ${Object.keys(manifest.images).length} SDF assets with registered viewBoxes.`)
