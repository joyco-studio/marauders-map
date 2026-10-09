export const WINDOW_MS = 14 * 24 * 60 * 60 * 1000
export const REFRESH_MS = 30 * 60 * 1000
export type Provider = 'github' | 'youtube'
export type ActivityKind = 'code' | 'pull-request' | 'conversation' | 'release' | 'video'
export type ActivityEvent = { id: string; personId: string; source: Provider; kind: ActivityKind; occurredAt: string; title: string; url: string; repository?: string }
export type SourceStatus = { personId: string; source: Provider; status: 'ok' | 'stale' | 'unavailable' | 'rate-limited'; lastSuccessfulAt?: string; retryAt?: string }
export type ActivitySnapshot = { mode: 'activity' | 'wandering'; fetchedAt: string; events: ActivityEvent[]; sources: SourceStatus[] }
export function safeActivityUrl(value: unknown, source: Provider): string | undefined {
  if (typeof value !== 'string') return
  try {
    const url = new URL(value)
    const hosts = source === 'github' ? ['github.com'] : ['www.youtube.com', 'youtube.com', 'youtu.be']
    if (url.protocol === 'https:' && !url.username && !url.password && hosts.includes(url.hostname)) return url.href
  } catch { /* Invalid source links are discarded. */ }
}
export function recentEvents(events: readonly ActivityEvent[], now = Date.now()): ActivityEvent[] {
  const seen = new Set<string>(), counts = new Map<string, number>()
  return [...events].filter(e => {
    const date = Date.parse(e.occurredAt)
    return Number.isFinite(date) && date <= now && date > now - WINDOW_MS && !!safeActivityUrl(e.url, e.source)
  }).sort((a,b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt) || a.id.localeCompare(b.id)).filter(e => {
    if (seen.has(e.id) || (counts.get(e.personId) ?? 0) >= 10) return false
    seen.add(e.id); counts.set(e.personId, (counts.get(e.personId) ?? 0) + 1); return true
  })
}
