import { XMLParser, XMLValidator } from 'fast-xml-parser'
import type { Person } from './roster'
import { recentEvents, safeActivityUrl, type ActivityEvent, type ActivityKind } from './types'
type RecordValue = Record<string, unknown>
const record = (v: unknown): RecordValue => v && typeof v === 'object' && !Array.isArray(v) ? v as RecordValue : {}
const text = (v: unknown) => typeof v === 'string' ? v.replace(/<[^>]*>/g, '').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,500) : ''
const timestamp = (v: unknown) => typeof v === 'string' && /^\d{4}-\d\d-\d\dT/.test(v) && Number.isFinite(Date.parse(v)) ? new Date(v).toISOString() : undefined
export function normalizeGithub(input: unknown, person: Person, now = Date.now()): ActivityEvent[] {
  if (!Array.isArray(input)) return []
  const events: ActivityEvent[] = []
  for (const value of input) {
    const e = record(value), p = record(e.payload), repo = text(record(e.repo).name)
    const date = timestamp(e.created_at), id = typeof e.id === 'string' ? e.id : ''
    if (!date || !id || !/^[\w.-]+\/[\w.-]+$/.test(repo)) continue
    const fallback = `https://github.com/${repo}`
    let kind: ActivityKind, title: string, url: unknown
    switch (e.type) {
      case 'PushEvent': kind='code'; title=`Fresh code in ${repo}`; url=fallback; break
      case 'PullRequestEvent': {
        if (p.action !== 'opened' && p.action !== 'reopened') continue
        const pr = record(p.pull_request)
        kind='pull-request'; title=`${p.action === 'reopened' ? 'Reopened' : 'Opened'} proposal: ${text(pr.title) || repo}`; url=pr.html_url; break
      }
      case 'IssuesEvent':
        if (p.action !== 'opened') continue
        kind='conversation'; title=text(record(p.issue).title) || `Opened an issue in ${repo}`; url=record(p.issue).html_url; break
      case 'IssueCommentEvent': case 'PullRequestReviewCommentEvent':
        if (p.action !== 'created') continue
        kind='conversation'; title=text(record(p.issue).title) || text(record(p.pull_request).title) || `New comment in ${repo}`; url=record(p.comment).html_url; break
      case 'PullRequestReviewEvent':
        if (p.action !== 'created' && p.action !== 'submitted') continue
        kind='conversation'; title=text(record(p.pull_request).title) || `New review in ${repo}`; url=record(p.review).html_url; break
      case 'ReleaseEvent':
        if (p.action !== 'published') continue
        kind='release'; title=text(record(p.release).name) || text(record(p.release).tag_name) || `Published a release in ${repo}`; url=record(p.release).html_url; break
      default: continue
    }
    events.push({id:`github:${id}`,personId:person.id,source:'github',kind,occurredAt:date,title,url:safeActivityUrl(url,'github') ?? fallback,repository:repo})
  }
  return recentEvents(events, now)
}
export function normalizeAtom(xml: string, person: Person, now = Date.now()): ActivityEvent[] {
  // Never resolve DTDs or entities. Only the standard XML character entities are decoded.
  if (/<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true) return []
  const parser = new XMLParser({ ignoreAttributes:false, removeNSPrefix:true, processEntities:false, parseTagValue:false })
  const feed = record(record(parser.parse(xml)).feed)
  const entries = Array.isArray(feed.entry) ? feed.entry : feed.entry ? [feed.entry] : []
  const decode = (v: unknown) => text(v).replace(/&(amp|lt|gt|quot|apos);/g,(_,key:string)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[key]!)).replace(/&#(x[0-9a-f]+|[0-9]+);/gi,(_,value:string)=>{
    const code=Number.parseInt(value.startsWith('x')||value.startsWith('X')?value.slice(1):value,value.startsWith('x')||value.startsWith('X')?16:10)
    return code>0&&code<=0x10ffff&&!(code>=0xd800&&code<=0xdfff)?String.fromCodePoint(code):'�'
  })
  const events: ActivityEvent[] = []
  for (const value of entries) {
    const e = record(value), id = text(e.videoId), date = timestamp(e.published), title = decode(e.title)
    if (!/^[\w-]{11}$/.test(id) || !date || !title) continue
    events.push({ id:`youtube:${id}`,personId:person.id,source:'youtube',kind:'video',occurredAt:date,title,url:`https://www.youtube.com/watch?v=${id}` })
  }
  return recentEvents(events, now)
}
