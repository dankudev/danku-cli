import { PUBLIC_BASE_URL } from "$env/static/public";
import type { RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async () => {
	const robots = `User-agent: *
Allow: /

Sitemap: ${PUBLIC_BASE_URL}/sitemap.xml`;

	return new Response(robots, {
		headers: {
			"Content-Type": "text/plain"
		}
	});
};
