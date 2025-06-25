import { PUBLIC_BASE_URL } from '$env/static/public';
import type { RequestHandler } from '@sveltejs/kit';

interface Url {
	loc: string;
	lastmod: string;
}

export const GET: RequestHandler = async () => {
	const urls: Url[] = [];

	const currentDate = new Date().toISOString();
	for (const module in import.meta.glob(
		[
			'/src/routes/**/+page.svelte'
			// Exclude certain paths e.g.
			// '!/src/routes/[[]*[]]/**/+page.svelte'
			// '!/src/routes/app/**/+page.svelte'
		],
		{ eager: true }
	)) {
		urls.push({
			loc: module
				.replace('/src/routes', PUBLIC_BASE_URL)
				.replaceAll(/\([^)]*\)\//g, '')
				.replace('/+page.svelte', ''),
			lastmod: currentDate
		});
	}

	const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
        ${urls
					.map(
						(url) => `
            <url>
                <loc>${url.loc}</loc>
                <lastmod>${url.lastmod}</lastmod>
            </url>
            `
					)
					.join('')}
    </urlset>`;

	return new Response(sitemap, {
		headers: {
			'Content-Type': 'application/xml'
		}
	});
};

export const prerender = true;
