import type { PageLoad } from './$types';

export const load: PageLoad = () => {
	return {
		description: "SEO description",
		title: "SEO title"
	};
};