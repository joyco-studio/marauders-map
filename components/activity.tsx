"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { roster, destinations } from '@/lib/activity/roster'
import { eligible, eventDestination, arrivalInscription } from '@/lib/activity/journeys'
import { recentEvents, REFRESH_MS, safeActivityUrl, type ActivityEvent, type ActivitySnapshot } from '@/lib/activity/types'
import type { MapControls } from '@/lib/map/experience'

export function useActivity(controls:React.RefObject<MapControls|null>, ready:boolean, exploring:boolean) {
  const [snapshot,setSnapshot]=useState<ActivitySnapshot|null>(null)
  const [now,setNow]=useState(()=>Date.now())
  const [selected,setSelected]=useState<string|null>(null)
  const [announcement,setAnnouncement]=useState<{personId:string;event:ActivityEvent}|null>(null)
  const [unavailable,setUnavailable]=useState(false)
  const [refreshing,setRefreshing]=useState(false)
  const refreshRef=useRef<()=>void>(()=>{})
  const snapshotRef=useRef<ActivitySnapshot|null>(null)
  const trigger=useRef<HTMLElement|null>(null)
  const selectedRef=useRef<string|null>(null)
  const noticeTimer=useRef<ReturnType<typeof setTimeout>|null>(null)
  const select=useCallback((id:string)=>{
    trigger.current=document.activeElement instanceof HTMLElement ? document.activeElement : null
    selectedRef.current=id
    setSelected(id)
  },[])
  const dismiss=useCallback(()=>{
    selectedRef.current=null;setSelected(null)
    if(trigger.current?.isConnected)trigger.current.focus()
    trigger.current=null
  },[])
  const arrive=useCallback((personId:string,event:ActivityEvent)=>{
    if(noticeTimer.current)clearTimeout(noticeTimer.current)
    setAnnouncement({personId,event})
    noticeTimer.current=setTimeout(()=>setAnnouncement(null),6000)
  },[])
  useEffect(()=>()=>{if(noticeTimer.current)clearTimeout(noticeTimer.current)},[])
  useEffect(()=>{
    if(!ready)return
    if(snapshotRef.current)controls.current?.setActivity(snapshotRef.current)
    const controller=new AbortController()
    let fetching=false, nextDue=0
    const refresh=async()=>{
      if(fetching||document.hidden)return
      fetching=true;setRefreshing(true)
      try {
        const response=await fetch('/api/activity',{signal:controller.signal,cache:'no-store'})
        if(!response.ok)throw new Error('Activity unavailable')
        const value:ActivitySnapshot=await response.json()
        if(!Array.isArray(value.events)||!Array.isArray(value.sources))throw new Error('Activity unavailable')
        if(controller.signal.aborted)return
        snapshotRef.current=value;setSnapshot(value);setNow(Date.now());setUnavailable(false)
        controls.current?.setActivity(value)
        const chosen=roster.find(p=>p.id===selectedRef.current)
        if(chosen&&!eligible(chosen,value.events,Date.now()))dismiss()
      } catch {
        if(!controller.signal.aborted)setUnavailable(true)
      } finally {
        nextDue=Date.now()+REFRESH_MS;fetching=false
        if(!controller.signal.aborted)setRefreshing(false)
      }
    }
    refreshRef.current=()=>{void refresh()}
    const due=()=>{if(!document.hidden&&Date.now()>=nextDue)void refresh()}
    const timer=setInterval(due,10000)
    document.addEventListener('visibilitychange',due)
    void refresh()
    return ()=>{controller.abort();clearInterval(timer);document.removeEventListener('visibilitychange',due);refreshRef.current=()=>{}}
  },[controls,ready,dismiss])
  useEffect(()=>{
    if(!ready)return
    const update=()=>{
      if(document.hidden)return
      const time=Date.now();setNow(time)
      const chosen=roster.find(p=>p.id===selectedRef.current)
      if(chosen&&!eligible(chosen,snapshotRef.current?.events??[],time))dismiss()
    }
    const timer=setInterval(update,1000)
    document.addEventListener('visibilitychange',update)
    return ()=>{clearInterval(timer);document.removeEventListener('visibilitychange',update)}
  },[ready,dismiss])
  return {snapshot,now,selected:exploring?selected:null,select,dismiss,arrive,announcement:exploring?announcement:null,unavailable,refreshing,refresh:()=>refreshRef.current()}
}
export type ActivityState=ReturnType<typeof useActivity>
const providerName=(source:string)=>source==='github'?'GitHub':'YouTube'
const kinds={'code':'Code','pull-request':'Proposal',conversation:'Conversation',release:'Release',video:'Video lesson'}
function age(date:string,now:number) {
  const minutes=Math.max(0,Math.floor((now-Date.parse(date))/60000))
  if(minutes<1)return 'less than a minute ago'
  if(minutes<60)return `${minutes} minute${minutes===1?'':'s'} ago`
  const hours=Math.floor(minutes/60)
  if(hours<24)return `${hours} hour${hours===1?'':'s'} ago`
  const days=Math.floor(hours/24);return `${days} day${days===1?'':'s'} ago`
}
export function ActivityRoster({activity}:{activity:ActivityState}) {
  return <>
    {roster.filter(p=>eligible(p,activity.snapshot?.events??[],activity.now)).map(person=><button key={person.id} onClick={()=>activity.select(person.id)}>{person.name}</button>)}
    <button disabled={activity.refreshing} onClick={activity.refresh}>{activity.refreshing?'Gathering activity…':'Refresh public activity'}</button>
  </>
}
export function ActivityNotice({activity,controls,ready}:{activity:ActivityState;controls:React.RefObject<MapControls|null>;ready:boolean}) {
  const arrival=activity.announcement
  const person=arrival&&roster.find(p=>p.id===arrival.personId)
  const stale=activity.unavailable||activity.snapshot?.sources.some(s=>s.status!=='ok')
  const wandering=activity.snapshot?.mode==='wandering'
  const title=arrival&&person?arrivalInscription(person.shortName,arrival.event):wandering?'Footsteps of imagined journeys':stale?'Some public sources are resting':''
  const detail=arrival?briefTitle(arrival.event.title):wandering?'Idle roaming is fictional. Public activity inspires journeys.':stale?'Last available activity is shown.':''
  useEffect(()=>{
    if(!ready)return
    const map=controls.current
    map?.setNotice(title?{title,lines:[detail],actions:[]}:null)
    return ()=>map?.setNotice(null)
  },[controls,ready,title,detail])
  return title?<aside className="sr-only" role="status" aria-live="polite">{title} {detail}</aside>:null
}
function briefTitle(title:string) { return title.length>110?`${title.slice(0,107).trimEnd()}…`:title }
export function ActivityCard({activity,controls,ready}:{activity:ActivityState;controls:React.RefObject<MapControls|null>;ready:boolean}) {
  const person=roster.find(p=>p.id===activity.selected)
  const dismiss=activity.dismiss
  const {snapshot,now}=activity
  useEffect(()=>{
    if(!ready)return
    if(!person){controls.current?.setInscription(null);return}
    const event=recentEvents(snapshot?.events??[],now).find(e=>e.personId===person.id)
    const url=event&&safeActivityUrl(event.url,event.source)
    const links=url?[{label:`View on ${providerName(event!.source)}`,run:()=>{window.open(url,'_blank','noopener,noreferrer')}}]:[]
    const map=controls.current
    map?.setInscription({
      title:person.name,
      lines:event?[
        briefTitle(event.title),
        `${destinations[eventDestination[event.kind]]} · ${kinds[event.kind]}`,
        age(event.occurredAt,now),
      ]:['An imagined journey through the creative web.','No recent public activity.'],
      actions:[{label:'Close inscription',run:dismiss},...links],
    })
    return ()=>map?.setInscription(null)
  },[person,snapshot,now,dismiss,controls,ready])
  useEffect(()=>{
    if(!person)return
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')dismiss()}
    window.addEventListener('keydown',escape)
    return ()=>window.removeEventListener('keydown',escape)
  },[person,dismiss])
  if(!person)return null
  const event=recentEvents(snapshot?.events??[],now).find(e=>e.personId===person.id)
  const url=event&&safeActivityUrl(event.url,event.source)
  return <section className="activity-accessible sr-only" aria-labelledby="activity-heading">
    <h2 id="activity-heading">{person.name}</h2>
    <p>{event?event.title:'An imagined journey through the creative web. No recent public activity.'}</p>
    <button onClick={dismiss}>Close inscription</button>
    {url&&<a href={url} target="_blank" rel="noopener noreferrer">View on {providerName(event!.source)}</a>}
  </section>
}
