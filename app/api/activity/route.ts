import { collectActivity } from '@/lib/activity/server'
// Dynamic snapshots retain the explicit 30-minute upstream fetch cache.
export const revalidate = 0
export async function GET() {
  return Response.json(await collectActivity(), { headers:{'Cache-Control':'no-store'} })
}
