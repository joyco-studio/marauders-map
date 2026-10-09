"use client"

import { useEffect, useRef, type CSSProperties } from "react"

/** Keep the caption mounted so its lettering can finish erasing on exit. */
export function SpellCaption({visible,children,onClick}:{visible:boolean;children:string;onClick?:()=>void}) {
  const element=useRef<HTMLElement|null>(null)
  useEffect(()=>{
    const node=element.current
    if(!node)return
    const previous=getComputedStyle(node).clipPath
    const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches
    const animation=node.animate([
      {clipPath:visible?"inset(0 100% 0 0)":previous},
      {clipPath:visible?"inset(0 0 0 0)":"inset(0 0 0 100%)"},
    ],{duration:reduced?0:visible?1000:350,easing:"linear",fill:"forwards"})
    return ()=>{
      // Preserve the current writing front when hover changes during an animation.
      node.style.clipPath=getComputedStyle(node).clipPath
      animation.cancel()
    }
  },[visible])
  const props={ref:(node:HTMLParagraphElement|HTMLButtonElement|null)=>{element.current=node},className:"spell-caption","data-floating":!onClick&&visible?true:undefined,"aria-label":children,"aria-hidden":!visible,style:{pointerEvents:visible&&onClick?"auto" as const:"none" as const}}
  let glyphIndex=0
  const lettering=<span aria-hidden="true">{children.split(/(\s+)/).map((word,index)=>/\s/.test(word)?word:<span className="spell-word" key={index}>{Array.from(word).map(glyph=>{
    const order=glyphIndex++
    return <span className="spell-glyph" key={order} style={{"--glyph-index":order} as CSSProperties}>{glyph}</span>
  })}</span>)}</span>
  return onClick?<button {...props} disabled={!visible} tabIndex={visible?0:-1} onClick={onClick}>{lettering}</button>:<p {...props}>{lettering}</p>
}
