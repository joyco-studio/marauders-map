import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeGithub, normalizeAtom } from './normalize'
import { roster } from './roster'
import { recentEvents, safeActivityUrl, WINDOW_MS } from './types'
const now=Date.parse('2026-10-09T12:00:00Z'),person=roster[4]
const github=(type:string,payload:unknown={},id='1')=>({id,type,payload,repo:{name:'joyco-studio/lab'},created_at:'2026-10-08T12:00:00Z'})
const atom=(published='2026-10-08T12:00:00Z',updated='2026-10-09T12:00:00Z')=>`<feed xmlns="http://www.w3.org/2005/Atom" xmlns:yt="http://www.youtube.com/xml/schemas/2015"><entry><yt:videoId>abcdefghijk</yt:videoId><title>Shaders &amp; pixels</title><published>${published}</published><updated>${updated}</updated></entry></feed>`
test('supported GitHub actions map to truthful titles and source URLs',()=>{
  const fixtures=[github('PushEvent',{},'1'),github('PullRequestEvent',{action:'opened',pull_request:{title:'A proposal',html_url:'https://github.com/a/b/pull/3'}},'2'),github('PullRequestEvent',{action:'reopened'},'3'),github('IssueCommentEvent',{action:'created',issue:{title:'An issue'},comment:{html_url:'https://github.com/a/b/issues/3#issuecomment-1'}},'4'),github('PullRequestReviewCommentEvent',{action:'created'},'5'),github('PullRequestReviewEvent',{action:'created'},'6'),github('IssuesEvent',{action:'opened',issue:{title:'Discuss'}},'7'),github('ReleaseEvent',{action:'published',release:{tag_name:'v1'}},'8')]
  const events=normalizeGithub(fixtures,person,now)
  assert.equal(events.length,8)
  assert.deepEqual(events.map(e=>e.kind),['code','pull-request','pull-request','conversation','conversation','conversation','conversation','release'])
  assert.equal(events[0].title,'Fresh code in joyco-studio/lab')
  assert.equal(events[0].url,'https://github.com/joyco-studio/lab')
  assert.equal(events[2].title,'Reopened proposal: joyco-studio/lab')
  assert.equal(events[3].url,'https://github.com/a/b/issues/3#issuecomment-1')
})
test('malformed entries and unsupported actions do not discard good siblings',()=>{
  assert.equal(normalizeGithub([null,github('WatchEvent'),github('PullRequestEvent',{action:'closed'}),github('IssueCommentEvent',{action:'edited'}),{...github('PushEvent'),created_at:'invalid'},github('PushEvent')],person,now).length,1)
  assert.equal(normalizeGithub({},person,now).length,0)
  const event=normalizeGithub([github('IssuesEvent',{action:'opened',issue:{title:'<b>Text</b>',html_url:'https://evil.example'}})],person,now)[0]
  assert.equal(event.title,'Text');assert.equal(event.url,'https://github.com/joyco-studio/lab')
})
test('Atom namespaces and publication IDs survive metadata edits',()=>{
  const first=normalizeAtom(atom(),person,now),edited=normalizeAtom(atom(undefined,'2026-10-09T11:00:00Z'),person,now)
  assert.deepEqual(first,edited);assert.equal(first[0].title,'Shaders & pixels');assert.equal(first[0].id,'youtube:abcdefghijk')
  assert.equal(normalizeAtom(atom('2026-09-01T12:00:00Z'),person,now).length,0)
})
test('Atom rejects DTDs, malformed XML and invalid entries while retaining valid siblings',()=>{
  assert.deepEqual(normalizeAtom('<!DOCTYPE feed [<!ENTITY evil SYSTEM "file:///etc/passwd">]>'+atom(),person,now),[])
  assert.deepEqual(normalizeAtom('<feed>',person,now),[])
  const xml=atom().replace('</feed>','<entry><yt:videoId>bad</yt:videoId><published>invalid</published></entry></feed>')
  assert.equal(normalizeAtom(xml,person,now).length,1)
})
test('recent activity deduplicates, bounds cards, rejects future events and expires at 14 days',()=>{
  const base=normalizeGithub([github('PushEvent')],person,now)[0]
  const fixtures=Array.from({length:12},(_,i)=>({...base,id:String(i),occurredAt:new Date(now-i*1000).toISOString()}))
  assert.equal(recentEvents([...fixtures,...fixtures],now).length,10)
  assert.equal(recentEvents([{...base,occurredAt:new Date(now-WINDOW_MS).toISOString()},{...base,id:'future',occurredAt:new Date(now+1).toISOString()}],now).length,0)
})
test('links allow only HTTPS source hosts without credentials',()=>{
  for(const url of ['http://github.com/a','https://github.com.evil.example/a','javascript:alert(1)','https://user:pass@github.com/a'])assert.equal(safeActivityUrl(url,'github'),undefined)
  assert.equal(safeActivityUrl('https://www.youtube.com/watch?v=abcdefghijk','youtube'),'https://www.youtube.com/watch?v=abcdefghijk')
})

test('new submitted reviews are conversations; edited and dismissed reviews are ignored',()=>{
  const events=normalizeGithub([github('PullRequestReviewEvent',{action:'submitted',review:{html_url:'https://github.com/a/b/pull/1#pullrequestreview-1'}},'submitted'),github('PullRequestReviewEvent',{action:'edited'},'edited'),github('PullRequestReviewEvent',{action:'dismissed'},'dismissed')],person,now)
  assert.equal(events.length,1);assert.equal(events[0].kind,'conversation')
})
test('prefixed Atom namespaces and numeric title entities normalize correctly',()=>{
  const xml='<atom:feed xmlns:atom="http://www.w3.org/2005/Atom" xmlns:yt="http://www.youtube.com/xml/schemas/2015"><atom:entry><yt:videoId>abcdefghijk</yt:videoId><atom:title>Yuri&#39;s &#x1F3A8; lesson</atom:title><atom:published>2026-10-08T12:00:00Z</atom:published></atom:entry></atom:feed>'
  assert.equal(normalizeAtom(xml,person,now)[0].title,"Yuri's 🎨 lesson")
})
