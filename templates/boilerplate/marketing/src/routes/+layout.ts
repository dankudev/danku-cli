import { PUBLIC_POSTHOG_API_KEY } from "$env/static/public";
import { browser, dev } from "$app/environment";
import posthog from "posthog-js";

import type { LayoutLoad } from "./$types";

export const load: LayoutLoad = async ({ fetch }) => {
    if (browser && PUBLIC_POSTHOG_API_KEY) {
        let apiHost = "https://us.i.posthog.com";

        try {
            await fetch(`${apiHost}/decide`, { method: "HEAD", mode: "no-cors" });
        } catch {
            apiHost = "DANKU";
        }

        posthog.init(PUBLIC_POSTHOG_API_KEY, {
            api_host: apiHost,
            defaults: "2025-05-24",
            person_profiles: "identified_only",
            ui_host: 'https://us.posthog.com'
        });
    }
};

export const prerender = !dev;
