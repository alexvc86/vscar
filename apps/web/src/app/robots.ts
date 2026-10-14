import type { MetadataRoute } from 'next';
import { serverEnv } from '@/server/env';
import { robotsTxt } from '@/server/seo';

/** robots.txt según el canal (Step 7c, ADR-015). */
export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  const { channel, siteUrl } = serverEnv();
  return robotsTxt(channel, siteUrl);
}
