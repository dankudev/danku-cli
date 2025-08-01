import { svelteKitHandler } from "better-auth/svelte-kit";
import { error, type Handle, redirect } from "@sveltejs/kit";
import { getOrCreateAuth } from "$lib/server/auth";
import { getOrCreateDb } from "$lib/server/db";
import { building } from "$app/environment";

export const handle: Handle = async ({ event, resolve }) => {
	if (building) {
		return resolve(event);
	}

	if (!event.platform?.env.DB) {
		error(503, "Database is not configured properly");
	}

	const db = getOrCreateDb(event.platform?.env.DB);
	const auth = getOrCreateAuth(db);

	const session = await auth.api.getSession({
		headers: event.request.headers
	});

	if (session) {
		event.locals.user = session.user;
	} else {
		delete event.locals.user; // TODO this doesn't do anything, does it? since event.locals is populated for each request
	}

	if (event.url.pathname.startsWith("/app")) {
		if (!event.locals.user && event.url.pathname !== "/app/sign-in") {
			redirect(302, "/app/sign-in");
		}
		if (event.locals.user && event.url.pathname === "/app/sign-in") {
			redirect(302, "/app/account");
		}
	}

	return svelteKitHandler({ event, resolve, auth, building });
};
