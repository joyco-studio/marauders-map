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
export function ActivityNotice({activity}:{activity:ActivityState}) {
  const arrival=activity.announcement
  const person=arrival&&roster.find(p=>p.id===arrival.personId)
  const stale=activity.unavailable||activity.snapshot?.sources.some(s=>s.status!=='ok')
  const wandering=activity.snapshot?.mode==='wandering'
  if(!arrival&&!stale&&!wandering)return null
  return <aside className="activity-notice" role="status" aria-live="polite">
    {arrival&&person&&<><p>{arrivalInscription(person.shortName,arrival.event)}</p><small>{arrival.event.title}</small></>}
    {wandering&&<small>Wandering without a GitHub token. These roaming footsteps are fictional; published YouTube lessons still create real activity journeys.</small>}
    {stale&&<small>Some public sources are unavailable. {activity.snapshot?.events.length?'Last available activity is shown.':'No recent activity available from those sources.'}</small>}
  </aside>
}
export function ActivityCard({activity}:{activity:ActivityState}) {
  const dialog=useRef<HTMLDialogElement>(null)
  const person=roster.find(p=>p.id===activity.selected)
  const dismiss=activity.dismiss
  useEffect(()=>{
    if(!person)return
    const node=dialog.current
    node?.showModal()
    return ()=>{node?.close()}
  },[person])
  if(!person)return null
  const events=recentEvents(activity.snapshot?.events??[],activity.now).filter(e=>e.personId===person.id).slice(0,5)
  const sources=activity.snapshot?.sources.filter(s=>s.personId===person.id)??[]
  return <dialog ref={dialog} className="activity-card" aria-labelledby="activity-heading" onCancel={e=>{e.preventDefault();dismiss()}} onClick={e=>{if(e.target===e.currentTarget)dismiss()}}>
    <div className="activity-card-content">
      <button className="activity-dismiss" onClick={dismiss} aria-label="Close activity card" autoFocus>Close</button>
      <h2 id="activity-heading">{person.name}</h2>
      <p className="activity-explanation">Public activity inspires journeys; idle roaming is fictional.</p>
      <p className="activity-source">Idle makers wander at random between activity journeys. This movement is fictional and does not represent public activity or online presence. Source events below remain real.</p>
      {!events.length&&<p className="activity-empty">No recent activity available</p>}
      <ol>{events.map(event=>{
        const url=safeActivityUrl(event.url,event.source)
        const destination=destinations[eventDestination[event.kind]]
        const role=event.kind==='video'?'lesson':event.kind==='release'?'announcement':event.kind==='conversation'||event.kind==='pull-request'?'meeting':'workshop'
        return <li key={event.id}>
          <small>{providerName(event.source)} · {kinds[event.kind]} · {destination} {role}</small>
          <h3>{event.title}</h3>
          {event.repository&&<p className="activity-repository">{event.repository}</p>}
          <time dateTime={event.occurredAt}>{new Date(event.occurredAt).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'long'})} · {age(event.occurredAt,activity.now)}</time>
          {url&&<a href={url} target="_blank" rel="noopener noreferrer">View on {providerName(event.source)}</a>}
        </li>
      })}</ol>
      {sources.map(source=><p className="activity-source" key={source.source}>{providerName(source.source)}: {source.status==='ok'?'available':source.status}. {source.lastSuccessfulAt?<>Last fetched <time dateTime={source.lastSuccessfulAt}>{new Date(source.lastSuccessfulAt).toLocaleString()}</time>.</>:'No successful fetch yet.'}</p>)}
      {activity.unavailable&&<p className="activity-source">Refresh unavailable. Last available activity is shown.</p>}
      <p className="activity-source">These bounded public feeds may be delayed and do not indicate online presence or private activity.</p>
      <button disabled={activity.refreshing} onClick={activity.refresh}>Refresh public activity</button>
    </div>
  </dialog>
}
