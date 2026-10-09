import 'server-only'
import { createCollector } from './collector'
export const collectActivity = createCollector(fetch, () => process.env.GITHUB_TOKEN)
