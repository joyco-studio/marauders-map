import { XMLValidator } from 'fast-xml-parser'
import { roster, type Person } from './roster'
import { normalizeAtom, normalizeGithub } from './normalize'
import { REFRESH_MS, recentEvents, type ActivityEvent, type ActivitySnapshot, type Provider, type SourceStatus } from './types'

type Result<T> = { ok:true; data:T } | { ok:false; error:'unavailable' | 'rate-limited'; retryAt?:number }
const success = <T>(data:T): Result<T> => ({ok:true,data})
const failure = (error:'unavailable'|'rate-limited', retryAt?:number): Result<never> => ({ok:false,error,retryAt})
type SourceCache = { events:ActivityEvent[]; lastSuccessfulAt?:string; status:SourceStatus['status']; nextAttempt:number }
type Fetcher = (url:string, init:RequestInit & {next:{revalidate:number}}) => Promise<Response>

// The route imports this behind a server-only boundary; injection keeps fixtures offline.
export function createCollector(fetcher:Fetcher, token:()=>string|undefined, clock=Date.now) {
  const cache = new Map<string,SourceCache>()
  let pending:Promise<ActivitySnapshot>|undefined, githubBlockedUntil=0, credentialBlockedUntil=0
  async function read(person:Person, source:Provider):Promise<Result<ActivityEvent[]>> {
    const now=clock(), credential=token()?.trim()
    if(source==='github' && (!credential || now<credentialBlockedUntil)) return failure('unavailable')
    if(source==='github' && now<githubBlockedUntil) return failure('rate-limited',githubBlockedUntil)
    const url=source==='github' ? `https://api.github.com/users/${person.github}/events/public?per_page=100` : `https://www.youtube.com/feeds/videos.xml?channel_id=${person.youtube}`
    let response:Response
    try {
      response=await fetcher(url,{
        headers:source==='github' ? {Authorization:`Bearer ${credential}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'} : {Accept:'application/atom+xml'},
        next:{revalidate:REFRESH_MS/1000}, cache:'force-cache', signal:AbortSignal.timeout(15000), redirect:'error',
      })
    } catch { return failure('unavailable') }
    const retry=response.headers.get('retry-after'), reset=response.headers.get('x-ratelimit-reset')
    const retryTime=retry ? (/^\d+$/.test(retry) ? now+Number(retry)*1000 : Date.parse(retry)) : 0
    const retryAt=Math.max(now+REFRESH_MS,Number.isFinite(retryTime)?retryTime:0,Number(reset)*1000 || 0)
    if(!response.ok) {
      const limited=response.status===429 || (response.status===403 && (response.headers.get('x-ratelimit-remaining')==='0' || !!retry))
      if(limited) {
        if(source==='github')githubBlockedUntil=retryAt
        return failure('rate-limited',retryAt)
      }
      // Invalid credentials block the whole configured GitHub batch as well.
      if(source==='github' && response.status===401)credentialBlockedUntil=now+REFRESH_MS
      return failure('unavailable',retry?retryAt:undefined)
    }
    if(source==='github'&&response.headers.get('x-ratelimit-remaining')==='0')githubBlockedUntil=retryAt
    try {
      if(source==='github') {
        const body:unknown=await response.json()
        if(!Array.isArray(body))return failure('unavailable')
        return success(normalizeGithub(body,person,now))
      }
      const xml=await response.text()
      if(!/<(?:[\w.-]+:)?feed(?:\s|>)/.test(xml) || /<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml)!==true)return failure('unavailable')
      return success(normalizeAtom(xml,person,now))
    } catch { return failure('unavailable') }
  }
  async function refresh():Promise<ActivitySnapshot> {
    const sources:SourceStatus[]=[], events:ActivityEvent[]=[]
    // Sequential GitHub requests honor a token-wide rate/credential failure immediately.
    for(const person of roster) for(const source of [...(person.github?['github' as const]:[]),...(person.youtube?['youtube' as const]:[])]) {
      const key=`${person.id}:${source}`, now=clock()
      let entry=cache.get(key)
      if(!entry || now>=entry.nextAttempt) {
        const result=await read(person,source)
        entry=result.ok ? {events:result.data,lastSuccessfulAt:new Date(clock()).toISOString(),status:'ok',nextAttempt:clock()+REFRESH_MS} : {
          events:entry?.events ?? [],lastSuccessfulAt:entry?.lastSuccessfulAt,
          status:result.error==='rate-limited' ? 'rate-limited' : entry?.lastSuccessfulAt ? 'stale' : 'unavailable',
          nextAttempt:result.retryAt ?? clock()+REFRESH_MS,
        }
        cache.set(key,entry)
      }
      events.push(...entry.events)
      sources.push({personId:person.id,source,status:entry.status,lastSuccessfulAt:entry.lastSuccessfulAt,...(entry.status==='rate-limited'?{retryAt:new Date(entry.nextAttempt).toISOString()}:{})})
    }
    return {mode:token()?.trim() ? 'activity' : 'wandering',fetchedAt:new Date(clock()).toISOString(),events:recentEvents(events,clock()),sources}
  }
  return () => {
    if(!pending)pending=refresh().finally(()=>{pending=undefined})
    return pending
  }
}
