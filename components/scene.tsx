"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ActivityRoster, ActivityCard, ActivityNotice, useActivity } from "./activity"
import Image from "next/image"
import { SpellCaption } from "./spell-caption"
import type { MapControls, Status } from "@/lib/map/experience"

const initial:Status={phase:"loading",progress:0,discovered:false,backend:""}
const descriptions:Record<Status["phase"],string>={
  loading:"Preparing the parchment",enchanting:"The wand is enchanting the parchment",opening:"The parchment is unfolding",revealing:"Ink is finding its way through the parchment",exploring:"The map is open. Drag to pan, scroll or pinch to zoom. Find the key to reveal a secret passage.",erasing:"Enough experimenting. For now. The ink is disappearing",closing:"The parchment is folding itself closed",folded:"The map is folded. Click the parchment to cast the oath, then press it again to unfold.",error:"The interactive map could not open",
}
export function Scene() {
  const container=useRef<HTMLDivElement>(null)
  const controls=useRef<MapControls|null>(null)
  const [status,setStatus]=useState<Status>(initial)
  const [attempt,setAttempt]=useState(0)
  const [ready,setReady]=useState(false)
  const exploring=status.phase==="exploring"
  const activity=useActivity(controls,ready,exploring)
  const {select,arrive,dismiss}=activity
  const onMapStatus=useCallback((next:Status)=>{
    setStatus(next)
    if(next.phase!=="exploring")dismiss()
  },[dismiss])
  useEffect(()=>{
    if(!container.current)return
    const host=container.current
    const controller=new AbortController()
    let handle:MapControls|undefined
    import("@/lib/map/experience").then(({startMap})=>{
      if(controller.signal.aborted)return
      return startMap(host,onMapStatus,controller.signal,attempt>0,select,arrive)
    }).then(result=>{
      if(!result)return
      handle=result
      if(controller.signal.aborted)result.dispose()
      else {controls.current=result;setReady(true)}
    }).catch(error=>{
      if(!controller.signal.aborted){
        console.error("[Makers’ Map]",error)
        setStatus({phase:"error",progress:0,discovered:false,backend:"",error:"The interactive map could not load. The parchment below is still available."})
      }
    })
    return ()=>{controller.abort();handle?.dispose();controls.current=null}
  },[attempt,select,arrive,onMapStatus])
  const retry=()=>{setReady(false);setStatus(initial);setAttempt(n=>n+1)}
  return (
    <main className={`map-experience${ready&&status.phase!=="error"?" wand-cursor":""}`} data-phase={status.phase} data-backend={status.backend} aria-labelledby="map-title">
      <h1 id="map-title" className="sr-only">The Makers’ Map</h1>
      <p id="map-description" className="sr-only">A living atlas of the creative web. Follow the footprints of those building it. The Commons, The Source Library, The Playground, The Render Pipeline, The Shader Atelier, and The Observatory are drawn in sepia ink. mrdoob, sunag, Don McCurdy, drcmda, Akella, Bruno Simon, Lewy Blue, and eligible JOYCO members follow journeys inspired by recent public GitHub activity and YouTube lessons. A key beside The Observatory reveals a passage to The Rabbit Hole.</p>
      {status.phase==="folded"&&!status.greeting&&<div className="map-introduction" aria-hidden="true"><p>A living atlas of the creative web.</p><p>Follow the footprints of those building it.</p></div>}
      <div ref={container} className="map-host" aria-describedby="map-description" />
      {status.phase==="loading"&&(
        <div className="loading-parchment" role="status">
          <span className="loading-ornament" aria-hidden="true">✧</span>
          <p>Every experiment leaves a trace.</p>
          <div className="loading-rule"><span style={{transform:`scaleX(${status.progress})`}} /></div>
          <small>{status.progress<.85?"Gathering ink & secrets":"Awakening the map"}</small>
        </div>
      )}
      {status.phase==="error"&&(
        <section className="map-fallback" aria-label="Static map">
          <Image src="/map/fallback.svg" alt="An aged parchment atlas of the creative web showing The Commons, The Source Library, The Playground, The Render Pipeline, The Shader Atelier, and The Observatory." width={1400} height={700} unoptimized priority />
          <div className="fallback-message"><p>{status.error}</p><button onClick={retry}>Retry the enchanted map</button></div>
        </section>
      )}
      <p className="sr-only" role="status" aria-live="polite">{status.phase==="folded"&&status.greeting==="welcome"?"For those who turn strange ideas into pixels. The Makers’ Map. Press anywhere on the parchment to unfold, or wait three seconds.":descriptions[status.phase]} {status.discovered?"Secret passage discovered: One more thing to try… A passage to The Rabbit Hole.":""}</p>
      <ActivityNotice activity={activity} controls={controls} ready={ready&&exploring} />
      <ActivityCard activity={activity} controls={controls} ready={ready} />
      <nav className="map-spells" aria-label="Parchment spells">
        <SpellCaption visible={status.phase==="folded"&&!status.greeting&&!!status.hovered}>I solemnly swear that I am up to no good</SpellCaption>
        <SpellCaption visible={exploring} onClick={()=>controls.current?.close()}>Enough experimenting. For now.</SpellCaption>
      </nav>
      <nav className="accessible-controls" aria-label="Map controls">
        <button onFocus={()=>controls.current?.setFocusedTrigger("passage")} onBlur={()=>controls.current?.setFocusedTrigger(null)} disabled={!exploring||status.discovered} onClick={()=>controls.current?.discover()}>Reveal the secret passage</button>
        <button disabled={!exploring} onClick={()=>controls.current?.zoom(.25)}>Zoom in</button>
        <button disabled={!exploring} onClick={()=>controls.current?.zoom(-.25)}>Zoom out</button>
        <button disabled={!exploring} onClick={()=>controls.current?.resetView()}>Reset view</button>
        {status.phase==="folded"&&!status.greeting&&<button onFocus={()=>controls.current?.setFocusedTrigger("welcome")} onBlur={()=>controls.current?.setFocusedTrigger(null)} onClick={()=>controls.current?.greet("welcome")}>I solemnly swear that I am up to no good</button>}
        {status.phase==="folded"?<button onFocus={()=>controls.current?.setFocusedTrigger("open")} onBlur={()=>controls.current?.setFocusedTrigger(null)} disabled={!status.greeting} onClick={()=>controls.current?.open()}>Unfold the map</button>:null}
        {exploring&&<ActivityRoster activity={activity} />}
      </nav>
    </main>
  )
}
