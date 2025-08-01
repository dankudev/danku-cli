import { stripeClient } from "@better-auth/stripe/client";
import { createAuthClient } from "better-auth/svelte";

export const auth = createAuthClient({
	plugins: [
		stripeClient({
			subscription: true
		})
	]
});