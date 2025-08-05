import { PUBLIC_POSTHOG_API_KEY } from "$env/static/public";
import type { HandleClientError } from "@sveltejs/kit";
import posthog from "posthog-js";

export const handleError: HandleClientError = async ({ error, status, message }) => {
	if (PUBLIC_POSTHOG_API_KEY && status !== 404) {
		posthog.captureException(error);
	}

    return {
        message: `An unhandled client-side error occurred: ${message}`
    };
};