import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createCollector } from './collector'
import { REFRESH_MS } from './types'
const initial=Date.parse('2026-10-09T12:00:00Z')
const atom='<feed xmlns="http://www.w3.org/2005/Atom" xmlns:yt="http://www.youtube.com/xml/schemas/2015"><entry><yt:videoId>abcdefghijk</yt:videoId><title>Lesson</title><published>2026-10-08T12:00:00Z</published></entry></feed>'
const event={id:'1',type:'PushEvent',repo:{name:'a/b'},created_at:'2026-10-08T12:00:00Z',payload:{}}
test('missing token never performs GitHub requests; independent YouTube is usable',async()=>{
  const urls:string[]=[]
  const collect=createCollector(async url=>{urls.push(url);return new Response(atom)},()=>undefined,()=>initial)
  const snapshot=await collect()
  assert.equal(snapshot.mode,'wandering');assert.equal(urls.length,1);assert.match(urls[0],/youtube/)
  assert.equal(snapshot.sources.filter(s=>s.status==='unavailable').length,14)
  assert.equal(snapshot.events[0].source,'youtube')
})
test('invalid credentials stop the batch without unauthenticated fallback',async()=>{
  let githubRequests=0
  const collect=createCollector(async(url,init)=>{
    if(url.includes('github')){githubRequests++;assert.equal((init.headers as Record<string,string>).Authorization,'Bearer secret');return new Response('',{status:401})}
    return new Response(atom)
  },()=> 'secret',()=>initial)
  const result=await collect();await collect()
  assert.equal(result.mode,'activity');assert.equal(githubRequests,1);assert.equal(result.sources.filter(s=>s.source==='github'&&s.status==='unavailable').length,14)
  assert.equal(result.events[0].source,'youtube')
  assert.ok(!JSON.stringify(result).includes('secret'))
})
test('partial failures retain last good results; expiration and retries respect the cache',async()=>{
  let now=initial, failing=false,requests=0
  const collect=createCollector(async(url,init)=>{
    requests++;assert.equal(init.next.revalidate,1800);assert.equal(init.cache,'force-cache')
    if(url.includes('youtube'))return new Response(atom)
    if(url.includes('/mrdoob/')&&failing)throw new Error('network')
    return Response.json(url.includes('/mrdoob/')?[event]:[])
  },()=> 'secret',()=>now)
  const [first,duplicate]=await Promise.all([collect(),collect()])
  assert.deepEqual(first,duplicate);assert.equal(requests,15)
  await collect();assert.equal(requests,15)
  now+=REFRESH_MS;failing=true
  const stale=await collect()
  assert.equal(stale.sources[0].status,'stale');assert.equal(stale.sources[0].lastSuccessfulAt,first.fetchedAt);assert.ok(stale.events.some(e=>e.id==='github:1'))
  now+=15*86400000
  assert.equal((await collect()).events.length,0)
})
test('token-wide rate limiting stops feeds and honors retry/reset headers',async()=>{
  let now=initial,requests=0
  const retryAt=initial+3*REFRESH_MS
  const collect=createCollector(async url=>{
    if(url.includes('youtube'))return new Response(atom)
    requests++;return new Response('',{status:403,headers:{'x-ratelimit-remaining':'0','x-ratelimit-reset':String(retryAt/1000),'retry-after':'1800'}})
  },()=> 'secret',()=>now)
  const first=await collect()
  assert.equal(requests,1);assert.equal(first.sources.filter(s=>s.status==='rate-limited').length,14)
  now+=REFRESH_MS;await collect();assert.equal(requests,1)
  now=retryAt;await collect();assert.equal(requests,2)
})
test('malformed upstream responses are typed unavailable outcomes',async()=>{
  const collect=createCollector(async url=>url.includes('youtube')?new Response('<feed>'):Response.json({message:'bad'}),()=> 'secret',()=>initial)
  const snapshot=await collect()
  assert.equal(snapshot.events.length,0)
  assert.ok(snapshot.sources.every(s=>s.status==='unavailable'))
})

test('a success exhausting the primary quota stops subsequent feeds immediately',async()=>{
  let requests=0
  const collect=createCollector(async url=>{
    if(url.includes('youtube'))return new Response(atom)
    requests++;return Response.json([event],{headers:{'x-ratelimit-remaining':'0','x-ratelimit-reset':String((initial+REFRESH_MS)/1000)}})
  },()=> 'secret',()=>initial)
  const result=await collect()
  assert.equal(requests,1);assert.equal(result.sources[0].status,'ok')
  assert.equal(result.sources.filter(s=>s.status==='rate-limited').length,13)
  assert.ok(result.events.some(e=>e.source==='github'))
})
test('retry-after on unavailable responses prevents premature provider retries',async()=>{
  let now=initial,requests=0
  const collect=createCollector(async url=>{
    if(url.includes('youtube')){requests++;return new Response('',{status:503,headers:{'retry-after':'7200'}})}
    return Response.json([])
  },()=> 'secret',()=>now)
  await collect();now+=REFRESH_MS;await collect();assert.equal(requests,1)
  now+=3*REFRESH_MS;await collect();assert.equal(requests,2)
})
