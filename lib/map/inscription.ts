import { CanvasTexture, Mesh, MeshBasicNodeMaterial, PlaneGeometry, SRGBColorSpace } from 'three/webgpu'
import type { Disposer } from '@joycostudio/xyz'
import { sheetPoint } from './data'

export type Inscription = { title:string; lines:string[]; actions:{label:string; run:()=>void}[] }
type Margin = { left:number; top:number; width:number; height:number }
type WrittenLine = { text:string; size:number; y:number; width:number; start:number; duration:number; action?:number; revealed?:number; float?:number }

// Reserved blank paper to the right of the architecture, below the compass.
export const activityMargin:Margin={left:1205,top:270,width:140,height:175}
export const arrivalMargin:Margin={left:1205,top:465,width:140,height:125}
const identity=(value:Inscription|null)=>value?JSON.stringify([value.title,value.lines,value.actions.map(action=>action.label)]):''
const clamp=(value:number)=>Math.max(0,Math.min(1,value))

/** Transparent lettering is written line by line into the paper's map texture. */
export function createInscription(disposer:Disposer,margin:Margin=activityMargin) {
  const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=Math.round(1000*margin.height/margin.width)
  const context=canvas.getContext('2d')!
  const ink=disposer.add(new CanvasTexture(canvas));ink.colorSpace=SRGBColorSpace
  const material=disposer.add(new MeshBasicNodeMaterial({map:ink,transparent:true,depthWrite:false}))
  const mesh=new Mesh(disposer.add(new PlaneGeometry(margin.width/100,margin.height/100)),material)
  const [x,y]=sheetPoint([margin.left+margin.width/2,margin.top+margin.height/2])
  mesh.position.set(x,y,.12);mesh.renderOrder=200;mesh.visible=false
  let current:Inscription|null=null,pending:Inscription|null=null
  let phase:'hidden'|'writing'|'visible'|'erasing'='hidden',elapsed=0,duration=0
  let rows:WrittenLine[]=[]
  let hoveredAction:number|undefined,motionTime=0
  const reducedMotion=matchMedia("(prefers-reduced-motion: reduce)").matches
  const font=(size:number)=>{context.font=`bold ${size}px Tangerine`}
  const wrap=(text:string)=>{
    const result:string[]=[];let line=''
    for(const word of text.split(/\s+/)){
      const next=line?`${line} ${word}`:word
      if(line&&context.measureText(next).width>940){result.push(line);line=word}else line=next
    }
    if(line)result.push(line)
    return result
  }
  const prepare=(value:Inscription)=>{
    current=value;rows=[];hoveredAction=undefined;elapsed=0;duration=0;phase='writing';mesh.visible=true
    let size=100
    const measure=()=>{
      font(size*1.35);const title=wrap(value.title)
      font(size);const lines=value.lines.map(line=>wrap(line))
      return {title,lines,height:title.length*size*1.35+lines.reduce((sum,rows)=>sum+(rows.length+.35)*size,0)+value.actions.length*size+size*.5}
    }
    let measured=measure()
    while(measured.height>canvas.height-60&&size>55){size-=5;measured=measure()}
    let y=size*1.1
    const add=(text:string,lineSize:number,action?:number)=>{
      font(lineSize)
      const lineDuration=Math.max(.16,Math.min(.6,text.length*.018))
      rows.push({text,size:lineSize,y,width:context.measureText(text).width,start:duration,duration:lineDuration,action})
      duration+=lineDuration+.055;y+=lineSize
    }
    for(const line of measured.title)add(line,size*1.35)
    y+=size*.3
    for(const lines of measured.lines){for(const line of lines)add(line,size);y+=size*.35}
    value.actions.forEach((action,index)=>add(action.label,size,index))
  }
  const draw=()=>{
    context.clearRect(0,0,canvas.width,canvas.height)
    context.fillStyle='#593724';context.strokeStyle='#593724';context.lineWidth=2
    for(const row of rows){
      const written=phase==='writing'?clamp((elapsed-row.start)/row.duration):phase==='erasing'?row.revealed??1:1
      // Exit erases the same line sequence from left to right, over a shorter interval.
      const erased=phase==='erasing'?clamp((elapsed*duration/.55-row.start)/row.duration):0
      if(written<=erased)continue
      context.save();context.beginPath()
      context.rect(30+(row.width+24)*erased,0,(row.width+24)*(written-erased),canvas.height);context.clip()
      font(row.size)
      if(row.float){
        let prefix=''
        for(const [index,glyph] of Array.from(row.text).entries()){
          const x=30+context.measureText(prefix).width
          const lift=(1-Math.cos(motionTime*3.5-index*.3))*.12*row.size*row.float
          context.fillText(glyph,x,row.y-lift);prefix+=glyph
        }
      }else context.fillText(row.text,30,row.y)
      if(row.action!==undefined){context.beginPath();context.moveTo(30,row.y+8);context.lineTo(30+row.width,row.y+8);context.stroke()}
      context.restore()
    }
    ink.needsUpdate=true
  }
  return {
    mesh,
    isWritten:()=>phase==='visible',
    isWriting:()=>phase==='writing',
    isHidden:()=>phase==='hidden',
    set(value:Inscription|null){
      if(phase==='erasing'){
        pending=value
        if(identity(value)===identity(current)){current=value;phase='visible';draw()}
        return
      }
      // Clock ticks and callback changes must not restart handwriting.
      if(identity(value)===identity(current)){current=value;return}
      if(current){
        for(const row of rows)row.revealed=phase==='writing'?clamp((elapsed-row.start)/row.duration):1
        pending=value;phase='erasing';elapsed=0
      }
      else if(value){prepare(value);draw()}
    },
    setHovered(point:{x:number;y:number}|null){
      const x=point?(point.x-margin.left)/margin.width*canvas.width:-1
      const y=point?(point.y-margin.top)/margin.height*canvas.height:-1
      hoveredAction=phase==='erasing'?undefined:rows.find(row=>row.action!==undefined&&x>=30&&x<=30+row.width&&y>=row.y-row.size&&y<=row.y+row.size*.2&&(phase==='visible'||elapsed>=row.start+row.duration))?.action
    },
    update(dt:number){
      motionTime+=dt
      let floating=false,settling=false
      for(const row of rows){
        if(row.action===undefined)continue
        settling ||= (row.float??0)>0
        const target=!reducedMotion&&row.action===hoveredAction?1:0
        row.float=(row.float??0)+(target-(row.float??0))*(1-Math.exp(-dt*12))
        if(row.float<.001)row.float=0
        floating ||= row.float>0
      }
      if(phase==='hidden')return
      if(phase==='visible'){if(floating||settling)draw();return}
      elapsed+=dt
      if(phase==='erasing'&&elapsed>=.55){
        const next=pending;pending=null;current=null;rows=[]
        if(next)prepare(next)
        else {phase='hidden';mesh.visible=false}
      }else if(phase==='writing'&&elapsed>=duration)phase='visible'
      draw()
    },
    hit(point:{x:number;y:number}|null,activate=false){
      if(!current||!point||phase==='erasing')return false
      const x=(point.x-margin.left)/margin.width*canvas.width,y=(point.y-margin.top)/margin.height*canvas.height
      const row=rows.find(row=>row.action!==undefined&&x>=30&&x<=30+row.width&&y>=row.y-row.size*.8&&y<=row.y+row.size*.2&&(phase==='visible'||elapsed>=row.start+row.duration))
      if(activate&&row?.action!==undefined)current.actions[row.action]?.run()
      return !!row
    },
  }
}
