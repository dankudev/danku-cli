import { PUBLIC_POSTHOG_API_KEY } from '$env/static/public';
import { browser, dev } from '$app/environment';
import type { LayoutLoad } from './$types';
import posthog from 'posthog-js';

export const load: LayoutLoad = async () => {
	if (browser && !dev) {
		posthog.init(PUBLIC_POSTHOG_API_KEY, {
			api_host: 'https://us.i.posthog.com',
			person_profiles: 'identified_only',
			capture_pageview: false,
			capture_pageleave: false
		});
	}
};
