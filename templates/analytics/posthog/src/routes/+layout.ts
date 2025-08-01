import { browser, dev } from '$app/environment';
import { PUBLIC_POSTHOG_API_KEY } from '$env/static/public';
import posthog from 'posthog-js';

import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async () => {
	if (browser && !dev) {
		posthog.init(PUBLIC_POSTHOG_API_KEY, {
			api_host: 'https://us.i.posthog.com',
			capture_pageleave: false,
			capture_pageview: false,
			person_profiles: 'identified_only'
		});
	}
};
