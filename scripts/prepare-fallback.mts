import { readFile, writeFile } from "node:fs/promises"
import { elements, labels } from "../lib/map/data"
const paper=(await readFile('public/map/parchment.jpg')).toString('base64')
const font=(await readFile('public/map/fonts/tangerine-bold.ttf')).toString('base64')
const parts=[`<defs><style>@font-face { font-family:Tangerine; src:url(data:font/ttf;base64,${font}) format('truetype'); }</style></defs>`,`<image href="data:image/jpeg;base64,${paper}" width="1400" height="700"/>`]
for(const element of elements){
  const [w,h]=element.size,[cx,cy]=element.center
  const svg=await readFile(`public/map/${element.src}`,'utf8')
  parts.push(svg.replace(/width="[^"]+"/,`width="${w}"`).replace(/height="[^"]+"/,`height="${h}"`).replace('<svg ',`<svg x="${cx-w/2}" y="${cy-h/2}" `))
}
for(const label of labels){
  const escaped=label.text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
  parts.push(`<text x="${label.center[0]}" y="${label.center[1]}" text-anchor="middle" dominant-baseline="middle" fill="#593724" font-family="Tangerine" font-size="${label.size*1.65}">${escaped}</text>`)
}
await writeFile('public/map/fallback.svg',`<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="700" viewBox="0 0 1400 700">${parts.join('')}</svg>`)
console.log('Prepared a self-contained fallback from the registered artwork.')
