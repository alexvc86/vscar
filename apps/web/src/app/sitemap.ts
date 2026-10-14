import type { MetadataRoute } from 'next';
import { vehicleCatalog } from '@/server/catalog';
import { serverEnv } from '@/server/env';
import { sitemapEntries } from '@/server/seo';

/** Sitemap según el canal (Step 7c, ADR-015). Se genera por petición: depende del catálogo y sus derechos. */
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { channel, siteUrl } = serverEnv();
  return sitemapEntries({ channel, siteUrl, catalog: vehicleCatalog() });
}
