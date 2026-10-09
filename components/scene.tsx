"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import type { MapControls, Status } from "@/lib/map/experience"

const initial:Status={phase:"loading",progress:0,discovered:false,backend:""}
const descriptions:Record<Status["phase"],string>={
  loading:"Preparing the parchment",opening:"The parchment is unfolding",revealing:"Ink is finding its way through the parchment",exploring:"The map is open. Drag to pan, scroll or pinch to zoom. Find the key to reveal a secret passage.",erasing:"Mischief managed. The ink is disappearing",closing:"The parchment is folding itself closed",folded:"The map is folded. Choose Reveal your secrets or I solemnly swear that I am up to no good, then pull an edge to unfold.",error:"The interactive map could not open",
}
export function Scene() {
  const container=useRef<HTMLDivElement>(null)
  const controls=useRef<MapControls|null>(null)
  const [status,setStatus]=useState<Status>(initial)
  const [attempt,setAttempt]=useState(0)
  useEffect(()=>{
    if(!container.current)return
    const host=container.current
    const controller=new AbortController()
    let handle:MapControls|undefined
    import("@/lib/map/experience").then(({startMap})=>{
      if(controller.signal.aborted)return
      return startMap(host,setStatus,controller.signal,attempt>0)
    }).then(result=>{
      if(!result)return
      handle=result
      if(controller.signal.aborted)result.dispose()
      else controls.current=result
    }).catch(error=>{
      if(!controller.signal.aborted){
        console.error("[Marauder’s Map]",error)
        setStatus({phase:"error",progress:0,discovered:false,backend:"",error:"The interactive map could not load. The parchment below is still available."})
      }
    })
    return ()=>{controller.abort();handle?.dispose();controls.current=null}
  },[attempt])
  const retry=()=>{setStatus(initial);setAttempt(n=>n+1)}
  const exploring=status.phase==="exploring"
  return (
    <main className="map-experience" data-phase={status.phase} data-backend={status.backend} aria-labelledby="map-title">
      <h1 id="map-title" className="sr-only">The Marauder’s Map</h1>
      <p id="map-description" className="sr-only">An enchanted accordion-fold parchment of Hogwarts. The Great Hall, library, courtyard, moving staircases, and classrooms are drawn in sepia ink. Harry Potter, Hermione Granger, Ron Weasley, and Argus Filch wander the corridors. A key beside the North Tower reveals a passage to Honeydukes.</p>
      <div ref={container} className="map-host" aria-describedby="map-description" />
      {status.phase==="loading"&&(
        <div className="loading-parchment" role="status">
          <span className="loading-ornament" aria-hidden="true">✧</span>
          <p>The parchment remembers.</p>
          <div className="loading-rule"><span style={{transform:`scaleX(${status.progress})`}} /></div>
          <small>{status.progress<.85?"Gathering ink & secrets":"Awakening the map"}</small>
        </div>
      )}
      {status.phase==="error"&&(
        <section className="map-fallback" aria-label="Static map">
          <Image src="/map/fallback.svg" alt="An aged parchment map of Hogwarts showing the Great Hall, library, courtyard, moving staircases, and classrooms." width={1400} height={700} unoptimized priority />
          <div className="fallback-message"><p>{status.error}</p><button onClick={retry}>Retry the enchanted map</button></div>
        </section>
      )}
      <p className="sr-only" role="status" aria-live="polite">{status.phase==="exploring"&&status.greeting==="mockery"?"The map is open. The parchment is completely blank. Drag to pan, scroll or pinch to zoom.":status.phase==="folded"&&status.greeting==="mockery"?"The Marauders mock Professor Snape and ask him to keep his nose out of other people’s business. Pull an edge to unfold.":status.phase==="folded"&&status.greeting==="welcome"?"Messrs. Moony, Wormtail, Padfoot and Prongs are proud to present the Marauder’s Map. Pull an edge to unfold.":descriptions[status.phase]} {status.discovered?"Secret passage discovered: Dissendium opens a passage to Honeydukes.":""}</p>
      <nav className="accessible-controls" aria-label="Map controls">
        <button onFocus={()=>controls.current?.setFocusedTrigger("passage")} onBlur={()=>controls.current?.setFocusedTrigger(null)} disabled={!exploring||status.greeting==="mockery"||status.discovered} onClick={()=>controls.current?.discover()}>Reveal the secret passage</button>
        <button disabled={!exploring} onClick={()=>controls.current?.zoom(.25)}>Zoom in</button>
        <button disabled={!exploring} onClick={()=>controls.current?.zoom(-.25)}>Zoom out</button>
        <button disabled={!exploring} onClick={()=>controls.current?.resetView()}>Reset view</button>
        {status.phase==="folded"&&!status.greeting&&<>
          <button onFocus={()=>controls.current?.setFocusedTrigger("mockery")} onBlur={()=>controls.current?.setFocusedTrigger(null)} onClick={()=>controls.current?.greet("mockery")}>Reveal your secrets</button>
          <button onFocus={()=>controls.current?.setFocusedTrigger("welcome")} onBlur={()=>controls.current?.setFocusedTrigger(null)} onClick={()=>controls.current?.greet("welcome")}>I solemnly swear that I am up to no good</button>
        </>}
        {status.phase==="folded"?<button onFocus={()=>controls.current?.setFocusedTrigger("open")} onBlur={()=>controls.current?.setFocusedTrigger(null)} disabled={!status.greeting} onClick={()=>controls.current?.open()}>Unfold the map</button>:<button onFocus={()=>controls.current?.setFocusedTrigger("close")} onBlur={()=>controls.current?.setFocusedTrigger(null)} disabled={!exploring} onClick={()=>controls.current?.close()}>Mischief managed</button>}
      </nav>
    </main>
  )
}
