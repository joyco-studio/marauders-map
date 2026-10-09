import { CanvasTexture, Mesh, MeshBasicNodeMaterial, PlaneGeometry, SRGBColorSpace } from 'three/webgpu'
import type { Disposer } from '@joycostudio/xyz'
import { sheetPoint } from './data'

export type Inscription = { title:string; lines:string[]; actions:{label:string; run:()=>void}[] }
type Margin = { left:number; top:number; width:number; height:number }

// Reserved blank paper to the right of the architecture, below the compass.
export const activityMargin:Margin={left:1205,top:270,width:140,height:175}
export const arrivalMargin:Margin={left:1205,top:465,width:140,height:125}

/** Transparent lettering becomes part of the paper's map texture. */
export function createInscription(disposer:Disposer,margin:Margin=activityMargin) {
  const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=Math.round(1000*margin.height/margin.width)
  const context=canvas.getContext('2d')!
  const ink=disposer.add(new CanvasTexture(canvas));ink.colorSpace=SRGBColorSpace
  const material=disposer.add(new MeshBasicNodeMaterial({map:ink,transparent:true,depthWrite:false}))
  const mesh=new Mesh(disposer.add(new PlaneGeometry(margin.width/100,margin.height/100)),material)
  const [x,y]=sheetPoint([margin.left+margin.width/2,margin.top+margin.height/2])
  mesh.position.set(x,y,.12);mesh.renderOrder=200;mesh.visible=false
  let current:Inscription|null=null
  let regions:{left:number;right:number;top:number;bottom:number;run:()=>void}[]=[]
  const wrap=(text:string)=>{
    const result:string[]=[];let line=''
    for(const word of text.split(/\s+/)){
      const next=line?`${line} ${word}`:word
      if(line&&context.measureText(next).width>940){result.push(line);line=word}else line=next
    }
    if(line)result.push(line)
    return result
  }
  const font=(size:number)=>{context.font=`bold ${size}px Tangerine`}
  return {
    mesh,
    set(value:Inscription|null){
      current=value;regions=[];mesh.visible=!!value
      if(!value)return
      context.clearRect(0,0,canvas.width,canvas.height)
      context.fillStyle='#593724';context.strokeStyle='#593724';context.lineWidth=2
      let size=100
      // Measure the complete inscription before drawing, keeping every line in its margin.
      const measure=()=>{
        font(size*1.35);const title=wrap(value.title)
        font(size);const lines=value.lines.map(line=>wrap(line))
        return {title,lines,height:title.length*size*1.35+lines.reduce((sum,rows)=>sum+(rows.length+.35)*size,0)+value.actions.length*size+size*.5}
      }
      let measured=measure()
      while(measured.height>canvas.height-60&&size>55){size-=5;measured=measure()}
      let y=size*1.1
      font(size*1.35)
      for(const line of measured.title){context.fillText(line,30,y);y+=size*1.35}
      y+=size*.3;font(size)
      for(const rows of measured.lines){for(const line of rows){context.fillText(line,30,y);y+=size}y+=size*.35}
      for(const action of value.actions){
        const width=context.measureText(action.label).width
        context.fillText(action.label,30,y)
        context.beginPath();context.moveTo(30,y+8);context.lineTo(30+width,y+8);context.stroke()
        regions.push({left:30,right:30+width,top:y-size*.8,bottom:y+size*.2,run:action.run});y+=size
      }
      ink.needsUpdate=true
    },
    hit(point:{x:number;y:number}|null,activate=false){
      if(!current||!point)return false
      const x=(point.x-margin.left)/margin.width*canvas.width,y=(point.y-margin.top)/margin.height*canvas.height
      const region=regions.find(region=>x>=region.left&&x<=region.right&&y>=region.top&&y<=region.bottom)
      if(activate)region?.run()
      return !!region
    },
  }
}
